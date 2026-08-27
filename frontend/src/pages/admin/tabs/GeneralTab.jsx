import { useState } from 'react';
import { api } from '../../../api.js';

const TEXT_FIELDS = [
  ['welcome', 'Mensagem de boas-vindas'],
  ['formTitle', 'Título do formulário'],
  ['submitButton', 'Texto do botão de envio do formulário'],
  ['spinButton', 'Texto do botão / título da roleta'],
  ['winTitle', 'Título ao ganhar'],
  ['loseTitle', 'Título ao não ganhar'],
  ['loseSubtitle', 'Mensagem ao não ganhar'],
  ['redeemInstructions', 'Instrução padrão de retirada do prêmio'],
  ['cpfInvalidMessage', 'Mensagem de CPF inválido'],
  ['alreadyParticipatedMessage', 'Mensagem de CPF já participante'],
];

const COLOR_FIELDS = [
  ['primary', 'Cor primária'],
  ['secondary', 'Cor secundária'],
  ['background', 'Fundo do cartão'],
  ['text', 'Cor do texto'],
  ['accent', 'Cor de destaque (botões)'],
];

export default function GeneralTab({ campaign, onSaved }) {
  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState(campaign.status);
  const [texts, setTexts] = useState(campaign.texts);
  const [colors, setColors] = useState(campaign.colors);
  const [formConfig, setFormConfig] = useState(campaign.formConfig);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.put(`/admin/campaigns/${campaign.id}`, { name, status, texts, colors, formConfig });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Geral</h3>
        <div className="form-row">
          <div className="field">
            <label>Nome da campanha</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Rascunho (não acessível)</option>
              <option value="active">Ativa</option>
              <option value="archived">Arquivada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Campos do formulário</h3>
        <div className="form-row">
          {['name', 'cpf', 'phone', 'city'].map((f) => (
            <label key={f} className="field" style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={!!formConfig[f]?.required}
                onChange={(e) => setFormConfig({ ...formConfig, [f]: { required: e.target.checked } })}
              />
              {f === 'name' ? 'Nome' : f === 'cpf' ? 'CPF (obrigatório sempre p/ segurança)' : f === 'phone' ? 'Telefone' : 'Cidade'} obrigatório
            </label>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Cores</h3>
        <div className="form-row">
          {COLOR_FIELDS.map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input type="color" value={colors[key]} onChange={(e) => setColors({ ...colors, [key]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Textos</h3>
        {TEXT_FIELDS.map(([key, label]) => (
          <div className="field" key={key} style={{ marginBottom: 10 }}>
            <label>{label}</label>
            <input value={texts[key] || ''} onChange={(e) => setTexts({ ...texts, [key]: e.target.value })} />
          </div>
        ))}
      </div>

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}
