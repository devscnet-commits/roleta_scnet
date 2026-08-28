import db, { runInTransaction } from '../db.js';

function getEligiblePrizeIds(campaignId, cityId) {
  if (!cityId) return new Set();
  const rows = db
    .prepare('SELECT prize_id FROM prize_cities WHERE city_id = ?')
    .all(cityId);
  return new Set(rows.map((r) => r.prize_id));
}

function weightedPick(items) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Decides and commits the draw result for a participation, inside a transaction
 * so stock decrements never race. Prize eligibility for the city was already
 * resolved before calling this (cityEligible flag).
 */
export function runDraw({ campaignId, cityId, cityEligible }) {
  const allPrizes = db
    .prepare(
      `SELECT * FROM prizes WHERE campaign_id = ? AND active = 1
       AND (type = 'no_prize' OR quantity_remaining > 0)
       ORDER BY order_index ASC`
    )
    .all(campaignId);

  const eligiblePrizeIds = getEligiblePrizeIds(campaignId, cityId);

  const candidates = allPrizes.filter((p) => {
    if (p.type === 'no_prize') return true;
    if (!cityEligible) return false;
    if (p.city_scope === 'all') return true;
    return eligiblePrizeIds.has(p.id);
  });

  if (candidates.length === 0) {
    return null;
  }

  const weighted = candidates.map((p) => ({ prize: p, weight: p.probability_weight }));
  const chosen = weightedPick(weighted).prize;

  if (chosen.type === 'prize') {
    const result = db
      .prepare(
        'UPDATE prizes SET quantity_remaining = quantity_remaining - 1 WHERE id = ? AND quantity_remaining > 0'
      )
      .run(chosen.id);
    if (result.changes === 0) {
      // stock ran out between select and update (race) - retry once
      return runDraw({ campaignId, cityId, cityEligible });
    }
  }

  return chosen;
}

export function runDrawTx(args) {
  return runInTransaction(() => runDraw(args));
}
