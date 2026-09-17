import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- admin | consultor
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | archived
  default_city_eligible INTEGER NOT NULL DEFAULT 0, -- if typed city not in list, eligible? 0=no
  colors_json TEXT NOT NULL DEFAULT '{}',
  texts_json TEXT NOT NULL DEFAULT '{}',
  form_config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  eligible INTEGER NOT NULL DEFAULT 1,
  UNIQUE(campaign_id, name_normalized)
);

CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'prize', -- prize | no_prize
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#1E88E5',
  quantity_total INTEGER NOT NULL DEFAULT 0,
  quantity_remaining INTEGER NOT NULL DEFAULT 0,
  probability_weight REAL NOT NULL DEFAULT 1,
  city_scope TEXT NOT NULL DEFAULT 'all', -- all | selected
  video_url TEXT NOT NULL DEFAULT '',
  redeem_message TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS prize_cities (
  prize_id INTEGER NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (prize_id, city_id)
);

CREATE TABLE IF NOT EXISTS participations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '',
  cpf_masked TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone_normalized TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  city_eligible INTEGER NOT NULL DEFAULT 0,
  result_type TEXT NOT NULL, -- prize | no_prize
  prize_id INTEGER REFERENCES prizes(id),
  prize_title TEXT NOT NULL DEFAULT '',
  redemption_code TEXT,
  redeemed_at TEXT,
  extra_fields_json TEXT NOT NULL DEFAULT '{}',
  consent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_participations_campaign ON participations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_participations_city ON participations(city);
`);

// Migrations for databases created before these columns existed.
for (const stmt of [
  "ALTER TABLE participations ADD COLUMN extra_fields_json TEXT NOT NULL DEFAULT '{}'",
  'ALTER TABLE participations ADD COLUMN consent_at TEXT',
  "ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'",
  "ALTER TABLE participations ADD COLUMN phone_normalized TEXT NOT NULL DEFAULT ''",
]) {
  try {
    db.exec(stmt);
  } catch {
    // column already exists
  }
}

// Older databases enforced uniqueness on CPF (UNIQUE(campaign_id, cpf)); the
// app now identifies participants by phone instead. SQLite can't drop a
// constraint in place, so rebuild the table when that legacy constraint is
// still present.
const participationsSchema = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'participations'")
  .get();
if (participationsSchema && participationsSchema.sql.includes('UNIQUE(campaign_id, cpf)')) {
  runInTransaction(() => {
    db.exec('ALTER TABLE participations RENAME TO participations_legacy');
    db.exec(`
      CREATE TABLE participations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        cpf TEXT NOT NULL DEFAULT '',
        cpf_masked TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        phone_normalized TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        city_eligible INTEGER NOT NULL DEFAULT 0,
        result_type TEXT NOT NULL,
        prize_id INTEGER REFERENCES prizes(id),
        prize_title TEXT NOT NULL DEFAULT '',
        redemption_code TEXT,
        redeemed_at TEXT,
        extra_fields_json TEXT NOT NULL DEFAULT '{}',
        consent_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, phone_normalized)
      );
    `);
    const legacyRows = db.prepare('SELECT * FROM participations_legacy').all();
    const insertLegacy = db.prepare(`
      INSERT INTO participations
        (id, campaign_id, name, cpf, cpf_masked, phone, phone_normalized, city, city_eligible,
         result_type, prize_id, prize_title, redemption_code, redeemed_at, extra_fields_json, consent_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of legacyRows) {
      const digitsOnly = String(row.phone || '').replace(/\D/g, '');
      // Fall back to a per-row unique placeholder if the phone is blank or
      // collides with another legacy row, so the migration never fails.
      const phoneNormalized = digitsOnly || `legacy-${row.id}`;
      try {
        insertLegacy.run(
          row.id,
          row.campaign_id,
          row.name,
          row.cpf || '',
          row.cpf_masked || '',
          row.phone || '',
          phoneNormalized,
          row.city,
          row.city_eligible,
          row.result_type,
          row.prize_id,
          row.prize_title,
          row.redemption_code,
          row.redeemed_at,
          row.extra_fields_json,
          row.consent_at,
          row.created_at
        );
      } catch {
        insertLegacy.run(
          row.id,
          row.campaign_id,
          row.name,
          row.cpf || '',
          row.cpf_masked || '',
          row.phone || '',
          `legacy-${row.id}`,
          row.city,
          row.city_eligible,
          row.result_type,
          row.prize_id,
          row.prize_title,
          row.redemption_code,
          row.redeemed_at,
          row.extra_fields_json,
          row.consent_at,
          row.created_at
        );
      }
    }
    db.exec('DROP TABLE participations_legacy');
    db.exec('CREATE INDEX IF NOT EXISTS idx_participations_campaign ON participations(campaign_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_participations_city ON participations(city)');
  });
}

export function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export default db;
