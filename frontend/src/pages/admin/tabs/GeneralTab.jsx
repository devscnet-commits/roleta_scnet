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

const FIELD_TYPES = [
  ['text', 'Texto'],
  ['email', 'E-mail'],
  ['number', 'Número'],
  ['date', 'Data'],
];

function newCustomField() {
  return { id: `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, label: '', type: 'text', required: false };
}

export default function GeneralTab({ campaign, onSaved }) {
  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState(campaign.status);
  const [texts, setTexts] = useState(campaign.texts);
  const [colors, setColors] = useState(campaign.colors);
  const [formConfig, setFormConfig] = useState({ customFields: [], ...campaign.formConfig });
  const [saving, setSaving] = useState(false);

  function updateCustomField(id, patch) {
    setFormConfig({
      ...formConfig,
      customFields: formConfig.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  function addCustomField() {
    setFormConfig({ ...formConfig, customFields: [...formConfig.customFields, newCustomField()] });
  }

  function removeCustomField(id) {
    setFormConfig({ ...formConfig, customFields: formConfig.customFields.filter((f) => f.id !== id) });
  }

  async function save() {
    setSaving(true);
    try {
      const cleanedFormConfig = {
        ...formConfig,
        customFields: formConfig.customFields.filter((f) => f.label.trim()),
      };
      const updated = await api.put(`/admin/campaigns/${campaign.id}`, { name, status, texts, colors, formConfig: cleanedFormConfig });
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
        <h3 style={{ marginTop: 0 }}>Campos personalizados</h3>
        <p style={{ fontSize: 13, color: '#555' }}>
          Crie campos extras além de nome, CPF, telefone e cidade (ex: e-mail, data de nascimento, uma pergunta específica).
        </p>
        {formConfig.customFields.map((f) => (
          <div className="form-row" key={f.id} style={{ alignItems: 'end', borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div className="field">
              <label>Rótulo exibido no formulário</label>
              <input value={f.label} onChange={(e) => updateCustomField(f.id, { label: e.target.value })} placeholder="Ex: E-mail" />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={f.type} onChange={(e) => updateCustomField(f.id, { type: e.target.value })}>
                {FIELD_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <input type="checkbox" checked={!!f.required} onChange={(e) => updateCustomField(f.id, { required: e.target.checked })} />
              Obrigatório
            </label>
            <button className="btn danger" type="button" onClick={() => removeCustomField(f.id)}>
              Remover
            </button>
          </div>
        ))}
        <button className="btn secondary" type="button" onClick={addCustomField}>
          + Novo campo personalizado
        </button>
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
