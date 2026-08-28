import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';

export default function ConsultorCampaignList() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    api.get('/admin/campaigns').then(setCampaigns).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Campanhas</h1>
      {campaigns.map((c) => (
        <div className="admin-card" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{c.name}</strong>{' '}
            <span className="pill" style={{ background: c.status === 'active' ? '#dcf5e0' : '#eee', color: c.status === 'active' ? '#1b8a3a' : '#777' }}>
              {c.status}
            </span>
          </div>
          <Link className="btn" to={`/consultor/campaigns/${c.id}`}>Abrir</Link>
        </div>
      ))}
      {campaigns.length === 0 && <p style={{ color: '#666' }}>Nenhuma campanha disponível.</p>}
    </div>
  );
}
