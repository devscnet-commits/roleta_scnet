import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';

export default function AdminCampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/admin/campaigns').then(setCampaigns).catch(() => {});
  }

  useEffect(load, []);

  async function createCampaign(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/campaigns', { slug, name });
      setSlug('');
      setName('');
      load();
    } catch (err) {
      setError(err.body?.error === 'slug_taken' ? 'Esse identificador (slug) já está em uso.' : 'Erro ao criar campanha.');
    }
  }

  const publicOrigin = window.location.origin;

  return (
    <div>
      <h1>Campanhas</h1>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Nova campanha</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={createCampaign} className="form-row" style={{ alignItems: 'end' }}>
          <div className="field">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Feira 2027" required />
          </div>
          <div className="field">
            <label>Identificador (slug para a URL / QR code)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="feira-2027" required />
          </div>
          <button className="btn" type="submit">Criar</button>
        </form>
      </div>

      {campaigns.map((c) => (
        <div className="admin-card" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{c.name}</strong>{' '}
            <span className="pill" style={{ background: c.status === 'active' ? '#dcf5e0' : '#eee', color: c.status === 'active' ? '#1b8a3a' : '#777' }}>
              {c.status}
            </span>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{publicOrigin}/c/{c.slug}</div>
          </div>
          <Link className="btn" to={`/admin/campaigns/${c.id}`}>Configurar</Link>
        </div>
      ))}
    </div>
  );
}
