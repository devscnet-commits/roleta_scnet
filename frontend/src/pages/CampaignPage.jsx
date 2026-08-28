import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import Wheel from '../components/Wheel.jsx';

function formatCpf(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

export default function CampaignPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState('form'); // form | ready | spinning | result
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', city: '' });
  const [extraFields, setExtraFields] = useState({});
  const [consent, setConsent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drawResult, setDrawResult] = useState(null);
  const [spinToken, setSpinToken] = useState(0);

  useEffect(() => {
    api
      .get(`/public/campaigns/${slug}`)
      .then(setCampaign)
      .catch(() => setLoadError('Campanha não encontrada ou inativa.'));
  }, [slug]);

  if (loadError) {
    return (
      <div className="campaign-screen">
        <div className="card">
          <h1>Ops!</h1>
          <p className="subtitle">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="campaign-screen">
        <div className="card">
          <p className="subtitle">Carregando...</p>
        </div>
      </div>
    );
  }

  const themeStyle = {
    '--primary': campaign.colors.primary,
    '--secondary': campaign.colors.secondary,
    '--background': campaign.colors.background,
    '--text': campaign.colors.text,
    '--accent': campaign.colors.accent,
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    if (!consent) {
      setSubmitError('É preciso aceitar o compartilhamento de dados para participar.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/public/campaigns/${slug}/participate`, { ...form, extraFields, consent });
      if (res.status === 'invalid_cpf' || res.status === 'already_participated' || res.status === 'error') {
        setSubmitError(res.message);
        setSubmitting(false);
        return;
      }
      setDrawResult(res);
      setStep('ready');
    } catch (err) {
      setSubmitError(err.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSpinTrigger() {
    if (step !== 'ready') return;
    setStep('spinning');
    setSpinToken((t) => t + 1);
  }

  function handleSpinEnd() {
    setStep('result');
  }

  const greetingTemplate = campaign.texts.spinGreeting || 'Boa Sorte, {name}!';
  const greetingParts = greetingTemplate.split('{name}');
  const participantName = form.name.trim() || 'participante';

  return (
    <div className="campaign-screen" style={themeStyle}>
      {step === 'form' && (
        <div className="card">
          {campaign.texts.badge && (
            <div className="badge-pill-wrap">
              <span className="badge-pill">
                <span className="badge-dot" />
                {campaign.texts.badge}
              </span>
            </div>
          )}
          <h1>{campaign.name}</h1>
          <p className="subtitle">{campaign.texts.welcome}</p>
          {submitError && <div className="error-msg">{submitError}</div>}
          <form onSubmit={handleSubmit}>
            {campaign.formConfig.name?.required !== undefined && (
              <div className="field">
                <label>Nome completo</label>
                <input
                  required={campaign.formConfig.name?.required}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
            )}
            <div className="field">
              <label>CPF</label>
              <input
                required={campaign.formConfig.cpf?.required}
                value={form.cpf}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input
                required={campaign.formConfig.phone?.required}
                value={form.phone}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="field">
              <label>Cidade</label>
              <input
                required={campaign.formConfig.city?.required}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Ex: Rio do Sul, Lages, Blumenau..."
              />
            </div>
            {(campaign.formConfig.customFields || []).map((f) => (
              <div className="field" key={f.id}>
                <label>{f.label}</label>
                <input
                  type={f.type === 'text' ? 'text' : f.type}
                  required={f.required}
                  value={extraFields[f.id] || ''}
                  onChange={(e) => setExtraFields({ ...extraFields, [f.id]: e.target.value })}
                />
              </div>
            ))}

            {campaign.texts.trustBadge && <p className="trust-row">🛡️ {campaign.texts.trustBadge}</p>}
            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
              <span>{campaign.texts.consentText || 'Aceito compartilhar meus dados e participar do sorteio.'}</span>
            </label>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : campaign.texts.submitButton || 'Avançar para a Roleta'}
            </button>
          </form>
        </div>
      )}

      {(step === 'ready' || step === 'spinning') && drawResult && (
        <div className="card">
          <p className="spin-greeting">
            {greetingParts[0]}
            {greetingParts.length > 1 && <span className="accent">{participantName}</span>}
            {greetingParts[1]}
          </p>
          <p className="spin-instruction">{campaign.texts.spinInstruction}</p>
          <Wheel
            segments={campaign.segments}
            spinToId={drawResult.segmentId}
            spinToken={spinToken}
            onSpinEnd={handleSpinEnd}
            onSpinClick={handleSpinTrigger}
            spinLabel={step === 'spinning' ? '...' : 'GIRAR'}
            spinDisabled={step === 'spinning'}
          />
          <button className="spin-cta" onClick={handleSpinTrigger} disabled={step === 'spinning'}>
            {step === 'spinning' ? 'Girando...' : campaign.texts.spinButton || 'Girar a roleta'}
          </button>
        </div>
      )}

      {step === 'result' && drawResult && (
        <div className="card">
          {drawResult.videoUrl && (
            <div className="video-stage">
              <video src={drawResult.videoUrl} autoPlay muted playsInline loop />
            </div>
          )}

          {drawResult.result === 'prize' && (
            <>
              <p className="result-title win">{campaign.texts.winTitle}</p>
              <p className="subtitle" style={{ fontWeight: 700 }}>
                {drawResult.prize.title}
              </p>
              {drawResult.prize.redemptionCode && <div className="result-code">{drawResult.prize.redemptionCode}</div>}
              <div className="result-box">
                <p>{drawResult.prize.redeemMessage}</p>
              </div>
              {campaign.texts.standLocation && <p className="result-location">📍 {campaign.texts.standLocation}</p>}
            </>
          )}

          {drawResult.result === 'no_prize' && (
            <>
              <p className="result-title lose">{campaign.texts.loseTitle}</p>
              <p className="subtitle">{drawResult.resultMessage || campaign.texts.loseSubtitle}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
