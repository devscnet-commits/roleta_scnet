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
  const [step, setStep] = useState('form'); // form | spinning | result
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', city: '' });
  const [extraFields, setExtraFields] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drawResult, setDrawResult] = useState(null);
  const [spinToken, setSpinToken] = useState(0);
  const [showResult, setShowResult] = useState(false);

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
    setSubmitting(true);
    try {
      const res = await api.post(`/public/campaigns/${slug}/participate`, { ...form, extraFields });
      if (res.status === 'invalid_cpf' || res.status === 'already_participated') {
        setSubmitError(res.message);
        setSubmitting(false);
        return;
      }
      setDrawResult(res);
      setStep('spinning');
      setShowResult(false);
      setTimeout(() => setSpinToken((t) => t + 1), 300);
    } catch (err) {
      setSubmitError(err.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSpinEnd() {
    setStep('result');
    setShowResult(true);
  }

  return (
    <div className="campaign-screen" style={themeStyle}>
      {step === 'form' && (
        <div className="card">
          <h1>{campaign.name}</h1>
          <p className="subtitle">{campaign.texts.welcome}</p>
          {submitError && <div className="error-msg">{submitError}</div>}
          <form onSubmit={handleSubmit}>
            <p className="subtitle" style={{ marginBottom: 12, fontWeight: 700 }}>
              {campaign.texts.formTitle}
            </p>
            {campaign.formConfig.name?.required !== undefined && (
              <div className="field">
                <label>Nome completo</label>
                <input
                  required={campaign.formConfig.name?.required}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome"
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
              <label>Cidade onde reside</label>
              <input
                required={campaign.formConfig.city?.required}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Sua cidade"
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
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : campaign.texts.submitButton}
            </button>
          </form>
        </div>
      )}

      {(step === 'spinning' || step === 'result') && drawResult && (
        <div className="card">
          <h1>{campaign.texts.spinButton}</h1>
          <Wheel segments={campaign.segments} spinToId={drawResult.segmentId} spinToken={spinToken} onSpinEnd={handleSpinEnd} />

          {showResult && drawResult.result === 'prize' && (
            <>
              {drawResult.prize.videoUrl && (
                <video className="result-video" src={drawResult.prize.videoUrl} autoPlay playsInline muted={false} controls />
              )}
              <p className="result-title win">{campaign.texts.winTitle}</p>
              <p className="subtitle" style={{ fontWeight: 700 }}>{drawResult.prize.title}</p>
              {drawResult.prize.redemptionCode && (
                <div className="result-code">{drawResult.prize.redemptionCode}</div>
              )}
              <p className="subtitle">{drawResult.prize.redeemMessage}</p>
            </>
          )}

          {showResult && drawResult.result === 'no_prize' && (
            <>
              <p className="result-title lose">{campaign.texts.loseTitle}</p>
              <p className="subtitle">{campaign.texts.loseSubtitle}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
