import { Router } from 'express';
import db from '../db.js';
import { isValidCpf, onlyDigits, maskCpf, normalizeCity } from '../cpf.js';
import { runDrawTx } from '../engine/draw.js';
import { nanoid } from 'nanoid';

const router = Router();

router.get('/campaigns/:slug', (req, res) => {
  const campaign = db
    .prepare("SELECT * FROM campaigns WHERE slug = ? AND status = 'active'")
    .get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

  const prizes = db
    .prepare(
      `SELECT id, type, title, color, order_index FROM prizes
       WHERE campaign_id = ? AND active = 1 ORDER BY order_index ASC`
    )
    .all(campaign.id);

  res.json({
    slug: campaign.slug,
    name: campaign.name,
    colors: JSON.parse(campaign.colors_json),
    texts: JSON.parse(campaign.texts_json),
    formConfig: JSON.parse(campaign.form_config_json),
    segments: prizes.map((p) => ({ id: p.id, title: p.title, color: p.color, type: p.type })),
  });
});

router.post('/campaigns/:slug/participate', (req, res) => {
  const campaign = db
    .prepare("SELECT * FROM campaigns WHERE slug = ? AND status = 'active'")
    .get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

  const texts = JSON.parse(campaign.texts_json);
  const formConfig = JSON.parse(campaign.form_config_json);
  const { name, cpf, phone, city } = req.body || {};

  if (formConfig.name?.required && !String(name || '').trim()) {
    return res.status(400).json({ status: 'error', message: 'Nome é obrigatório.' });
  }
  if (formConfig.phone?.required && !String(phone || '').trim()) {
    return res.status(400).json({ status: 'error', message: 'Telefone é obrigatório.' });
  }
  if (formConfig.city?.required && !String(city || '').trim()) {
    return res.status(400).json({ status: 'error', message: 'Cidade é obrigatória.' });
  }

  const cpfDigits = onlyDigits(cpf);
  if (!isValidCpf(cpfDigits)) {
    return res.status(200).json({ status: 'invalid_cpf', message: texts.cpfInvalidMessage || 'CPF inválido.' });
  }

  const already = db
    .prepare('SELECT id FROM participations WHERE campaign_id = ? AND cpf = ?')
    .get(campaign.id, cpfDigits);
  if (already) {
    return res
      .status(200)
      .json({ status: 'already_participated', message: texts.alreadyParticipatedMessage || 'CPF já participou.' });
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

  const chosen = runDrawTx({
    campaignId: campaign.id,
    cityId: cityRow ? cityRow.id : null,
    cityEligible,
  });

  if (!chosen) {
    return res.status(500).json({ status: 'error', message: 'Nenhum resultado configurado nesta campanha.' });
  }

  const redemptionCode = chosen.type === 'prize' ? nanoid(8).toUpperCase() : null;

  db.prepare(
    `INSERT INTO participations
      (campaign_id, name, cpf, cpf_masked, phone, city, city_eligible, result_type, prize_id, prize_title, redemption_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    campaign.id,
    String(name || '').trim(),
    cpfDigits,
    maskCpf(cpfDigits),
    String(phone || '').trim(),
    cityName,
    cityEligible ? 1 : 0,
    chosen.type,
    chosen.type === 'prize' ? chosen.id : null,
    chosen.type === 'prize' ? chosen.title : '',
    redemptionCode
  );

  res.json({
    status: 'ok',
    result: chosen.type,
    segmentId: chosen.id,
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
    },
  });
});

export default router;
