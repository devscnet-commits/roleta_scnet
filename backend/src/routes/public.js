import { Router } from 'express';
import db from '../db.js';
import { normalizeCity } from '../text.js';
import { isValidPhone, normalizePhone } from '../phone.js';
import { runDrawTx } from '../engine/draw.js';
import { nanoid } from 'nanoid';

const router = Router();

router.get('/campaigns/:slug', (req, res) => {
  const campaign = db
    .prepare("SELECT * FROM campaigns WHERE slug = ? AND status = 'active'")
    .get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

  res.json({
    slug: campaign.slug,
    name: campaign.name,
    colors: JSON.parse(campaign.colors_json),
    texts: JSON.parse(campaign.texts_json),
    formConfig: JSON.parse(campaign.form_config_json),
    segments: getWheelSegments(campaign.id),
  });
});

// Only wedges the draw could actually land on: active, and (for prizes)
// still in stock. Matches the candidate pool in engine/draw.js exactly, so
// the wheel never shows a slice it can no longer choose.
function getWheelSegments(campaignId) {
  const prizes = db
    .prepare(
      `SELECT id, type, title, color, order_index FROM prizes
       WHERE campaign_id = ? AND active = 1 AND (type = 'no_prize' OR quantity_remaining > 0)
       ORDER BY order_index ASC`
    )
    .all(campaignId);
  return prizes.map((p) => ({ id: p.id, title: p.title, color: p.color, type: p.type }));
}

router.post('/campaigns/:slug/participate', (req, res) => {
  const campaign = db
    .prepare("SELECT * FROM campaigns WHERE slug = ? AND status = 'active'")
    .get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

  const texts = JSON.parse(campaign.texts_json);
  const formConfig = JSON.parse(campaign.form_config_json);
  const { name, phone, city, extraFields, consent } = req.body || {};

  if (formConfig.name?.required && !String(name || '').trim()) {
    return res.status(400).json({ status: 'error', message: 'Nome é obrigatório.' });
  }
  if (formConfig.city?.required && !String(city || '').trim()) {
    return res.status(400).json({ status: 'error', message: 'Cidade é obrigatória.' });
  }
  if (!consent) {
    return res.status(400).json({ status: 'error', message: 'É preciso aceitar o compartilhamento de dados para participar.' });
  }

  const customFields = Array.isArray(formConfig.customFields) ? formConfig.customFields : [];
  const extraFieldsValues = {};
  for (const field of customFields) {
    const value = String((extraFields || {})[field.id] || '').trim();
    if (field.required && !value) {
      return res.status(400).json({ status: 'error', message: `${field.label} é obrigatório.` });
    }
    extraFieldsValues[field.id] = value;
  }

  if (!isValidPhone(phone)) {
    return res.status(200).json({ status: 'invalid_phone', message: texts.phoneInvalidMessage || 'Telefone inválido.' });
  }
  const phoneNormalized = normalizePhone(phone);

  const already = db
    .prepare('SELECT id FROM participations WHERE campaign_id = ? AND phone_normalized = ?')
    .get(campaign.id, phoneNormalized);
  if (already) {
    return res
      .status(200)
      .json({ status: 'already_participated', message: texts.alreadyParticipatedMessage || 'Este telefone já participou.' });
  }

  const cityName = String(city || '').trim();
  const cityNormalized = normalizeCity(cityName);
  let cityRow = null;
  if (cityNormalized) {
    cityRow = db
      .prepare('SELECT * FROM cities WHERE campaign_id = ? AND name_normalized = ?')
      .get(campaign.id, cityNormalized);
  }
  const cityEligible = cityRow ? !!cityRow.eligible : !!campaign.default_city_eligible;

  // Snapshot the wheel exactly as it stood the instant before the draw, so
  // the segment the participant sees spin to is guaranteed to be the same
  // list the draw itself picked from (not whatever the wheel happened to
  // load earlier in the session, which the admin may have changed since).
  const wheelSegments = getWheelSegments(campaign.id);

  const chosen = runDrawTx({
    campaignId: campaign.id,
    cityId: cityRow ? cityRow.id : null,
    cityEligible,
  });

  if (!chosen) {
    return res.status(500).json({ status: 'error', message: 'Nenhum resultado configurado nesta campanha.' });
  }

  const redemptionCode = chosen.type === 'prize' ? nanoid(8).toUpperCase() : null;

  try {
    db.prepare(
      `INSERT INTO participations
        (campaign_id, name, phone, phone_normalized, city, city_eligible, result_type, prize_id, prize_title, redemption_code, extra_fields_json, consent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      campaign.id,
      String(name || '').trim(),
      String(phone || '').trim(),
      phoneNormalized,
      cityName,
      cityEligible ? 1 : 0,
      chosen.type,
      chosen.type === 'prize' ? chosen.id : null,
      chosen.type === 'prize' ? chosen.title : '',
      redemptionCode,
      JSON.stringify(extraFieldsValues)
    );
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res
        .status(200)
        .json({ status: 'already_participated', message: texts.alreadyParticipatedMessage || 'Este telefone já participou.' });
    }
    throw err;
  }

  res.json({
    status: 'ok',
    result: chosen.type,
    segmentId: chosen.id,
    segments: wheelSegments,
    videoUrl: chosen.video_url || null,
    resultMessage: chosen.type === 'prize' ? '' : chosen.description || texts.loseSubtitle || '',
    prize:
      chosen.type === 'prize'
        ? {
            title: chosen.title,
            description: chosen.description,
            videoUrl: chosen.video_url || null,
            redeemMessage: chosen.redeem_message || texts.redeemInstructions || '',
            redemptionCode,
          }
        : null,
    texts: {
      winTitle: texts.winTitle,
      loseTitle: texts.loseTitle,
      loseSubtitle: texts.loseSubtitle,
      standLocation: texts.standLocation,
    },
  });
});

export default router;
