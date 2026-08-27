import { useEffect, useState } from 'react';
import { api } from '../../../api.js';

export default function CitiesTab({ campaignId, campaign, onCampaignSaved, notify }) {
  const [cities, setCities] = useState([]);
  const [name, setName] = useState('');
  const [bulk, setBulk] = useState('');
  const [defaultEligible, setDefaultEligible] = useState(campaign.defaultCityEligible);

  function load() {
    api.get(`/admin/campaigns/${campaignId}/cities`).then(setCities);
  }
  useEffect(load, [campaignId]);

  async function addCity(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post(`/admin/campaigns/${campaignId}/cities`, { name, eligible: true });
    setName('');
    load();
  }

  async function addBulk() {
    const names = bulk.split('\n').map((n) => n.trim()).filter(Boolean);
    for (const n of names) {
      try {
        await api.post(`/admin/campaigns/${campaignId}/cities`, { name: n, eligible: true });
      } catch {
        /* ignore duplicates */
      }
    }
    setBulk('');
    load();
    notify('Cidades importadas.');
  }

  async function toggleEligible(city) {
    await api.put(`/admin/campaigns/${campaignId}/cities/${city.id}`, { eligible: !city.eligible });
    load();
  }

  async function removeCity(id) {
    await api.del(`/admin/campaigns/${campaignId}/cities/${id}`);
    load();
  }

  async function saveDefault() {
    const updated = await api.put(`/admin/campaigns/${campaignId}`, { defaultCityEligible: defaultEligible });
    onCampaignSaved(updated);
    notify('Regra padrão salva.');
  }

  return (
    <div>
      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Cidades atendidas (elegíveis para prêmios)</h3>
        <p style={{ fontSize: 13, color: '#555' }}>
          Cidades marcadas como <strong>elegíveis</strong> podem receber prêmios de verdade. Cidades não elegíveis (ou não
          cadastradas) continuam participando normalmente, mas o sorteio só considera as opções "sem prêmio" — o visitante
          nunca vê essa diferença.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <input type="checkbox" checked={defaultEligible} onChange={(e) => setDefaultEligible(e.target.checked)} />
          Cidades digitadas que não estiverem na lista abaixo contam como elegíveis por padrão
        </label>
        <button className="btn secondary" onClick={saveDefault}>Salvar regra padrão</button>
      </div>

      <div className="admin-card">
        <form onSubmit={addCity} className="form-row" style={{ alignItems: 'end' }}>
          <div className="field">
            <label>Adicionar cidade</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da cidade" />
          </div>
          <button className="btn" type="submit">Adicionar</button>
        </form>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Importar várias (uma por linha)</label>
          <textarea rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Maravilha\nChapecó\nSão Miguel do Oeste'} />
        </div>
        <button className="btn secondary" onClick={addBulk}>Importar lista</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Cidade</th>
            <th>Elegível</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={!!c.eligible} onChange={() => toggleEligible(c)} />
                  <span className={`pill ${c.eligible ? 'yes' : 'no'}`}>{c.eligible ? 'Atendida' : 'Não atendida'}</span>
                </label>
              </td>
              <td>
                <button className="btn danger" onClick={() => removeCity(c.id)}>Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
