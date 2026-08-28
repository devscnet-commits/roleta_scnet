import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, requireAuth, requireRole } from '../auth.js';
import { normalizeCity } from '../cpf.js';
import { uploadVideo } from '../uploads.js';

const router = Router();
const adminOnly = requireRole('admin');

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(String(email || '').trim());
  if (!admin || !bcrypt.compareSync(String(password || ''), admin.password_hash)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  res.json({ token: signToken(admin), email: admin.email, role: admin.role });
});

router.use(requireAuth);

// ---- Users ----
router.get('/users', adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, email, role, created_at FROM admins ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/users', adminOnly, (req, res) => {
  const { email, password, role } = req.body || {};
  if (!String(email || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({ error: 'email_and_password_required' });
  }
  const userRole = role === 'consultor' ? 'consultor' : 'admin';
  try {
    const hash = bcrypt.hashSync(String(password), 10);
    const info = db
      .prepare('INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)')
      .run(String(email).trim(), hash, userRole);
    res.status(201).json({ id: info.lastInsertRowid, email: String(email).trim(), role: userRole });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'email_taken' });
    throw e;
  }
});

router.delete('/users/:id', adminOnly, (req, res) => {
  if (Number(req.params.id) === req.admin.sub) {
    return res.status(400).json({ error: 'cannot_delete_self' });
  }
  db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/uploads/video', adminOnly, (req, res) => {
  uploadVideo.single('file')(req, res, (err) => {
    if (err) {
      const message =
        err.message === 'invalid_file_type'
          ? 'Formato inválido. Envie um vídeo MP4, WebM, OGG ou MOV.'
          : err.code === 'LIMIT_FILE_SIZE'
            ? 'Vídeo muito grande. Limite de 50MB.'
            : 'Falha ao enviar o vídeo.';
      return res.status(400).json({ error: 'upload_failed', message });
    }
    if (!req.file) return res.status(400).json({ error: 'no_file', message: 'Nenhum arquivo enviado.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ---- Campaigns ----
router.get('/campaigns', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  res.json(campaigns.map(serializeCampaign));
});

router.post('/campaigns', adminOnly, (req, res) => {
  const { slug, name } = req.body || {};
  if (!slug || !name) return res.status(400).json({ error: 'slug_and_name_required' });
  try {
    const info = db
      .prepare(
        `INSERT INTO campaigns (slug, name, status, colors_json, texts_json, form_config_json)
         VALUES (?, ?, 'draft', ?, ?, ?)`
      )
      .run(
        String(slug).trim(),
        String(name).trim(),
        JSON.stringify({ primary: '#0057B8', secondary: '#00B5E2', background: '#FFFFFF', text: '#0B1F3A', accent: '#F5A623' }),
        JSON.stringify({
          badge: 'STAND OFICIAL',
          welcome: 'Identifique-se com seus dados rápidos para girar a roleta oficial e concorrer aos prêmios exclusivos!',
          formTitle: 'Preencha seus dados para participar',
          submitButton: 'Avançar para a Roleta',
          consentText: 'Aceito compartilhar meus dados e participar do sorteio.',
          trustBadge: 'Giro individual validado no Stand',
          spinGreeting: 'Boa Sorte, {name}!',
          spinInstruction: 'Toque no botão central GIRAR para acionar a roleta oficial.',
          spinButton: 'Girar a roleta',
          winTitle: 'Parabéns, você ganhou!',
          loseTitle: 'Não foi dessa vez!',
          loseSubtitle: 'Obrigado por participar.',
          redeemInstructions: 'Dirija-se ao estande para retirar seu prêmio.',
          standLocation: 'Stand Principal',
          cpfInvalidMessage: 'CPF inválido. Confira os números e tente novamente.',
          alreadyParticipatedMessage: 'Este CPF já participou desta promoção.',
        }),
        JSON.stringify({
          name: { required: true },
          cpf: { required: true },
          phone: { required: true },
          city: { required: true },
          customFields: [],
        })
      );
    res.status(201).json(serializeCampaign(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(info.lastInsertRowid)));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'slug_taken' });
    throw e;
  }
});

router.get('/campaigns/:id', (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  res.json(serializeCampaign(campaign));
});

router.put('/campaigns/:id', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const { name, status, colors, texts, formConfig, defaultCityEligible } = req.body || {};
  db.prepare(
    `UPDATE campaigns SET name = ?, status = ?, colors_json = ?, texts_json = ?, form_config_json = ?, default_city_eligible = ? WHERE id = ?`
  ).run(
    name ?? campaign.name,
    status ?? campaign.status,
    JSON.stringify(colors ?? JSON.parse(campaign.colors_json)),
    JSON.stringify(texts ?? JSON.parse(campaign.texts_json)),
    JSON.stringify(formConfig ?? JSON.parse(campaign.form_config_json)),
    defaultCityEligible !== undefined ? (defaultCityEligible ? 1 : 0) : campaign.default_city_eligible,
    campaign.id
  );
  res.json(serializeCampaign(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id)));
});

// ---- Cities ----
router.get('/campaigns/:id/cities', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  res.json(db.prepare('SELECT * FROM cities WHERE campaign_id = ? ORDER BY name ASC').all(campaign.id));
});

router.post('/campaigns/:id/cities', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const { name, eligible } = req.body || {};
  if (!String(name || '').trim()) return res.status(400).json({ error: 'name_required' });
  try {
    const info = db
      .prepare('INSERT INTO cities (campaign_id, name, name_normalized, eligible) VALUES (?, ?, ?, ?)')
      .run(campaign.id, name.trim(), normalizeCity(name), eligible === false ? 0 : 1);
    res.status(201).json(db.prepare('SELECT * FROM cities WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'city_exists' });
    throw e;
  }
});

router.put('/campaigns/:id/cities/:cityId', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const { name, eligible } = req.body || {};
  const city = db.prepare('SELECT * FROM cities WHERE id = ? AND campaign_id = ?').get(req.params.cityId, campaign.id);
  if (!city) return res.status(404).json({ error: 'city_not_found' });
  const newName = name !== undefined ? String(name).trim() : city.name;
  db.prepare('UPDATE cities SET name = ?, name_normalized = ?, eligible = ? WHERE id = ?').run(
    newName,
    normalizeCity(newName),
    eligible !== undefined ? (eligible ? 1 : 0) : city.eligible,
    city.id
  );
  res.json(db.prepare('SELECT * FROM cities WHERE id = ?').get(city.id));
});

router.delete('/campaigns/:id/cities/:cityId', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  db.prepare('DELETE FROM cities WHERE id = ? AND campaign_id = ?').run(req.params.cityId, campaign.id);
  res.status(204).end();
});

// ---- Prizes ----
router.get('/campaigns/:id/prizes', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const prizes = db.prepare('SELECT * FROM prizes WHERE campaign_id = ? ORDER BY order_index ASC').all(campaign.id);
  const cityLinks = db.prepare('SELECT * FROM prize_cities').all();
  res.json(
    prizes.map((p) => ({
      ...p,
      active: !!p.active,
      cityIds: cityLinks.filter((l) => l.prize_id === p.id).map((l) => l.city_id),
    }))
  );
});

router.post('/campaigns/:id/prizes', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const p = req.body || {};
  const info = db
    .prepare(
      `INSERT INTO prizes (campaign_id, type, title, description, color, quantity_total, quantity_remaining, probability_weight, city_scope, video_url, redeem_message, order_index, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      campaign.id,
      p.type === 'no_prize' ? 'no_prize' : 'prize',
      String(p.title || '').trim() || 'Prêmio',
      p.description || '',
      p.color || '#1E88E5',
      Number(p.quantityTotal) || 0,
      Number(p.quantityTotal) || 0,
      Number(p.probabilityWeight) || 1,
      p.cityScope === 'selected' ? 'selected' : 'all',
      p.videoUrl || '',
      p.redeemMessage || '',
      Number(p.orderIndex) || 0,
      p.active === false ? 0 : 1
    );
  setPrizeCities(info.lastInsertRowid, p.cityIds);
  res.status(201).json(getPrizeWithCities(info.lastInsertRowid));
});

router.put('/campaigns/:id/prizes/:prizeId', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const prize = db.prepare('SELECT * FROM prizes WHERE id = ? AND campaign_id = ?').get(req.params.prizeId, campaign.id);
  if (!prize) return res.status(404).json({ error: 'prize_not_found' });
  const p = req.body || {};
  const quantityTotal = p.quantityTotal !== undefined ? Number(p.quantityTotal) : prize.quantity_total;
  let quantityRemaining = prize.quantity_remaining;
  if (p.quantityTotal !== undefined) {
    const delta = quantityTotal - prize.quantity_total;
    quantityRemaining = Math.max(0, prize.quantity_remaining + delta);
  }
  if (p.quantityRemaining !== undefined) quantityRemaining = Number(p.quantityRemaining);

  db.prepare(
    `UPDATE prizes SET type=?, title=?, description=?, color=?, quantity_total=?, quantity_remaining=?, probability_weight=?, city_scope=?, video_url=?, redeem_message=?, order_index=?, active=? WHERE id=?`
  ).run(
    p.type === 'no_prize' ? 'no_prize' : p.type === 'prize' ? 'prize' : prize.type,
    p.title !== undefined ? String(p.title).trim() : prize.title,
    p.description !== undefined ? p.description : prize.description,
    p.color !== undefined ? p.color : prize.color,
    quantityTotal,
    quantityRemaining,
    p.probabilityWeight !== undefined ? Number(p.probabilityWeight) : prize.probability_weight,
    p.cityScope !== undefined ? (p.cityScope === 'selected' ? 'selected' : 'all') : prize.city_scope,
    p.videoUrl !== undefined ? p.videoUrl : prize.video_url,
    p.redeemMessage !== undefined ? p.redeemMessage : prize.redeem_message,
    p.orderIndex !== undefined ? Number(p.orderIndex) : prize.order_index,
    p.active !== undefined ? (p.active ? 1 : 0) : prize.active,
    prize.id
  );
  if (p.cityIds !== undefined) setPrizeCities(prize.id, p.cityIds);
  res.json(getPrizeWithCities(prize.id));
});

router.delete('/campaigns/:id/prizes/:prizeId', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  db.prepare('DELETE FROM prizes WHERE id = ? AND campaign_id = ?').run(req.params.prizeId, campaign.id);
  res.status(204).end();
});

function setPrizeCities(prizeId, cityIds) {
  db.prepare('DELETE FROM prize_cities WHERE prize_id = ?').run(prizeId);
  if (Array.isArray(cityIds) && cityIds.length) {
    const insert = db.prepare('INSERT OR IGNORE INTO prize_cities (prize_id, city_id) VALUES (?, ?)');
    for (const cityId of cityIds) insert.run(prizeId, cityId);
  }
}

function getPrizeWithCities(prizeId) {
  const prize = db.prepare('SELECT * FROM prizes WHERE id = ?').get(prizeId);
  const cityIds = db.prepare('SELECT city_id FROM prize_cities WHERE prize_id = ?').all(prizeId).map((r) => r.city_id);
  return { ...prize, active: !!prize.active, cityIds };
}

// ---- Participants ----
router.get('/campaigns/:id/participants', (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const { city, result, search, sort = 'created_at', order = 'desc' } = req.query;

  let sql = 'SELECT * FROM participations WHERE campaign_id = ?';
  const params = [campaign.id];

  if (city) {
    sql += ' AND city = ?';
    params.push(city);
  }
  if (result) {
    sql += ' AND result_type = ?';
    params.push(result);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR cpf LIKE ? OR phone LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const allowedSort = new Set(['name', 'city', 'created_at', 'result_type']);
  const sortCol = allowedSort.has(sort) ? sort : 'created_at';
  const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortCol} COLLATE NOCASE ${sortOrder}`;

  const rows = db.prepare(sql).all(...params);
  res.json(
    rows.map((r) => ({
      ...r,
      city_eligible: !!r.city_eligible,
      redeemed: !!r.redeemed_at,
      extra_fields: JSON.parse(r.extra_fields_json || '{}'),
    }))
  );
});

router.get('/campaigns/:id/participants/export.csv', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const rows = db
    .prepare('SELECT * FROM participations WHERE campaign_id = ? ORDER BY city COLLATE NOCASE ASC, name COLLATE NOCASE ASC')
    .all(campaign.id);
  const customFields = JSON.parse(campaign.form_config_json).customFields || [];
  const header = [
    'Nome',
    'CPF',
    'Telefone',
    'Cidade',
    'Cidade Atendida',
    ...customFields.map((f) => f.label),
    'Resultado',
    'Prêmio',
    'Código',
    'Retirado',
    'Data',
  ];
  const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(csvEscape).join(';')];
  for (const r of rows) {
    const extraValues = JSON.parse(r.extra_fields_json || '{}');
    lines.push(
      [
        r.name,
        r.cpf,
        r.phone,
        r.city,
        r.city_eligible ? 'Sim' : 'Não',
        ...customFields.map((f) => extraValues[f.id] || ''),
        r.result_type === 'prize' ? 'Ganhou' : 'Não ganhou',
        r.prize_title,
        r.redemption_code || '',
        r.redeemed_at ? 'Sim' : 'Não',
        r.created_at,
      ]
        .map(csvEscape)
        .join(';')
    );
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="participantes-${campaign.slug}.csv"`);
  res.send('﻿' + lines.join('\n'));
});

router.post('/campaigns/:id/participants/:pid/redeem', (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const p = db.prepare('SELECT * FROM participations WHERE id = ? AND campaign_id = ?').get(req.params.pid, campaign.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  if (p.result_type !== 'prize') return res.status(400).json({ error: 'no_prize_won' });
  if (p.redeemed_at) return res.status(409).json({ error: 'already_redeemed' });
  db.prepare("UPDATE participations SET redeemed_at = datetime('now') WHERE id = ?").run(p.id);
  res.json({ ok: true });
});

router.delete('/campaigns/:id/participants', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ error: 'confirmation_required', message: 'Envie ?confirm=yes para limpar a base.' });
  }
  const info = db.prepare('DELETE FROM participations WHERE campaign_id = ?').run(campaign.id);
  res.json({ deleted: info.changes });
});

router.get('/campaigns/:id/dashboard', adminOnly, (req, res) => {
  const campaign = getCampaignOr404(req, res);
  if (!campaign) return;
  const total = db.prepare('SELECT COUNT(*) c FROM participations WHERE campaign_id = ?').get(campaign.id).c;
  const won = db.prepare("SELECT COUNT(*) c FROM participations WHERE campaign_id = ? AND result_type = 'prize'").get(campaign.id).c;
  const eligibleCities = db.prepare('SELECT COUNT(*) c FROM participations WHERE campaign_id = ? AND city_eligible = 1').get(campaign.id).c;
  const byCity = db
    .prepare(
      `SELECT city, COUNT(*) total, SUM(CASE WHEN result_type = 'prize' THEN 1 ELSE 0 END) won
       FROM participations WHERE campaign_id = ? GROUP BY city ORDER BY total DESC`
    )
    .all(campaign.id);
  const prizes = db.prepare('SELECT id, title, type, quantity_total, quantity_remaining FROM prizes WHERE campaign_id = ?').all(campaign.id);
  res.json({ total, won, eligibleCities, ineligibleCities: total - eligibleCities, byCity, prizes });
});

function getCampaignOr404(req, res) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) {
    res.status(404).json({ error: 'campaign_not_found' });
    return null;
  }
  return campaign;
}

function serializeCampaign(c) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    status: c.status,
    defaultCityEligible: !!c.default_city_eligible,
    colors: JSON.parse(c.colors_json),
    texts: JSON.parse(c.texts_json),
    formConfig: JSON.parse(c.form_config_json),
    createdAt: c.created_at,
  };
}

export default router;
