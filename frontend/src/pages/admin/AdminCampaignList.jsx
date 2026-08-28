import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';

export default function AdminCampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [duplicating, setDuplicating] = useState(null); // { source, slug, name }
  const [duplicateError, setDuplicateError] = useState('');
  const navigate = useNavigate();

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

  function startDuplicate(campaign) {
    setDuplicateError('');
    setDuplicating({ source: campaign, slug: '', name: `${campaign.name} (cópia)` });
  }

  async function confirmDuplicate(e) {
    e.preventDefault();
    setDuplicateError('');
    try {
      const created = await api.post(`/admin/campaigns/${duplicating.source.id}/duplicate`, {
        slug: duplicating.slug,
        name: duplicating.name,
      });
      setDuplicating(null);
      navigate(`/admin/campaigns/${created.id}`);
    } catch (err) {
      setDuplicateError(err.body?.error === 'slug_taken' ? 'Esse identificador (slug) já está em uso.' : 'Erro ao duplicar campanha.');
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

      {duplicating && (
        <div className="admin-card">
          <h3 style={{ marginTop: 0 }}>Duplicar "{duplicating.source.name}"</h3>
          <p style={{ fontSize: 13, color: '#555' }}>
            Copia textos, cores, roleta/prêmios (estoque reiniciado) e cidades atendidas para uma campanha nova em
            rascunho. Participantes não são copiados.
          </p>
          {duplicateError && <div className="error-msg">{duplicateError}</div>}
          <form onSubmit={confirmDuplicate} className="form-row" style={{ alignItems: 'end' }}>
            <div className="field">
              <label>Nome da nova campanha</label>
              <input value={duplicating.name} onChange={(e) => setDuplicating({ ...duplicating, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Identificador (slug)</label>
              <input
                value={duplicating.slug}
                onChange={(e) => setDuplicating({ ...duplicating, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="feira-2027"
                required
              />
            </div>
            <button className="btn" type="submit">Duplicar</button>
            <button className="btn secondary" type="button" onClick={() => setDuplicating(null)}>Cancelar</button>
          </form>
        </div>
      )}

      {campaigns.map((c) => (
        <div className="admin-card" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{c.name}</strong>{' '}
            <span className="pill" style={{ background: c.status === 'active' ? '#dcf5e0' : '#eee', color: c.status === 'active' ? '#1b8a3a' : '#777' }}>
              {c.status}
            </span>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{publicOrigin}/c/{c.slug}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary" onClick={() => startDuplicate(c)}>Duplicar</button>
            <Link className="btn" to={`/admin/campaigns/${c.id}`}>Configurar</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
