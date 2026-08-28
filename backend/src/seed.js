import bcrypt from 'bcryptjs';
import db from './db.js';
import { normalizeCity } from './cpf.js';

const email = process.env.ADMIN_EMAIL || 'admin@scnet.com.br';
const password = process.env.ADMIN_PASSWORD || 'scnet2026';

const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
if (existing) {
  console.log(`Admin already exists: ${email}`);
} else {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(email, hash);
  console.log(`Admin created: ${email} / ${password}`);
}

const campaignCount = db.prepare('SELECT COUNT(*) c FROM campaigns').get().c;
if (campaignCount === 0) {
  const info = db
    .prepare(
      `INSERT INTO campaigns (slug, name, status, default_city_eligible, colors_json, texts_json, form_config_json)
       VALUES (?, ?, 'active', 0, ?, ?, ?)`
    )
    .run(
      'feira-2026',
      'Feira SCNET 2026',
      JSON.stringify({
        primary: '#0057B8',
        secondary: '#00B5E2',
        background: '#FFFFFF',
        text: '#0B1F3A',
        accent: '#F5A623',
      }),
      JSON.stringify({
        welcome: 'Gire a roleta SCNET e concorra a prêmios!',
        formTitle: 'Preencha seus dados para participar',
        submitButton: 'Continuar',
        spinButton: 'Girar a roleta',
        winTitle: 'Parabéns, você ganhou!',
        loseTitle: 'Não foi dessa vez!',
        loseSubtitle: 'Obrigado por participar. Fique de olho nas próximas promoções da SCNET.',
        redeemInstructions: 'Dirija-se ao estande da SCNET e apresente este código para retirar seu prêmio.',
        cpfInvalidMessage: 'CPF inválido. Confira os números e tente novamente.',
        alreadyParticipatedMessage: 'Este CPF já participou desta promoção.',
      }),
      JSON.stringify({
        name: { required: true },
        cpf: { required: true },
        phone: { required: true },
        city: { required: true },
      })
    );
  const campaignId = info.lastInsertRowid;

  const cities = ['Maravilha', 'São Miguel do Oeste', 'Chapecó', 'Pinhalzinho', 'Modelo'];
  const insertCity = db.prepare(
    'INSERT INTO cities (campaign_id, name, name_normalized, eligible) VALUES (?, ?, ?, 1)'
  );
  const cityIds = cities.map((name) => {
    return insertCity.run(campaignId, name, normalizeCity(name)).lastInsertRowid;
  });

  const insertPrize = db.prepare(
    `INSERT INTO prizes (campaign_id, type, title, description, color, quantity_total, quantity_remaining, probability_weight, city_scope, video_url, redeem_message, order_index, active)
     VALUES (@campaign_id, @type, @title, @description, @color, @quantity_total, @quantity_remaining, @probability_weight, @city_scope, @video_url, @redeem_message, @order_index, 1)`
  );

  insertPrize.run({
    campaign_id: campaignId,
    type: 'prize',
    title: 'Caixa de som',
    description: 'Caixa de som Bluetooth SCNET',
    color: '#0057B8',
    quantity_total: 10,
    quantity_remaining: 10,
    probability_weight: 5,
    city_scope: 'all',
    video_url: '',
    redeem_message: 'Retire sua caixa de som no estande SCNET.',
    order_index: 0,
  });
  insertPrize.run({
    campaign_id: campaignId,
    type: 'prize',
    title: 'Internet 710 Mega grátis 1 mês',
    description: 'Um mês grátis do plano 710 Mega',
    color: '#00B5E2',
    quantity_total: 20,
    quantity_remaining: 20,
    probability_weight: 20,
    city_scope: 'all',
    video_url: '',
    redeem_message: 'Fale com nosso consultor para ativar seu mês grátis.',
    order_index: 1,
  });
  ['Tente novamente', 'Não foi dessa vez', 'Hoje não foi sua sorte', 'Quase! Tente na próxima'].forEach(
    (title, idx) => {
      insertPrize.run({
        campaign_id: campaignId,
        type: 'no_prize',
        title,
        description: '',
        color: '#B0BEC5',
        quantity_total: 0,
        quantity_remaining: 0,
        probability_weight: 18.75,
        city_scope: 'all',
        video_url: '',
        redeem_message: '',
        order_index: idx + 2,
      });
    }
  );

  console.log(`Campaign seeded: feira-2026 (id=${campaignId})`);
}
