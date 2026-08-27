import { useEffect, useState } from 'react';
import { api } from '../../../api.js';

export default function DashboardTab({ campaignId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/admin/campaigns/${campaignId}/dashboard`).then(setData);
  }, [campaignId]);

  if (!data) return <p>Carregando...</p>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="value">{data.total}</div>
          <div className="label">Participantes</div>
        </div>
        <div className="stat-box">
          <div className="value">{data.won}</div>
          <div className="label">Prêmios entregues no sorteio</div>
        </div>
        <div className="stat-box">
          <div className="value">{data.eligibleCities}</div>
          <div className="label">De cidades atendidas</div>
        </div>
        <div className="stat-box">
          <div className="value">{data.ineligibleCities}</div>
          <div className="label">De cidades não atendidas (leads)</div>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Participantes por cidade</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Total</th>
              <th>Ganharam</th>
            </tr>
          </thead>
          <tbody>
            {data.byCity.map((c) => (
              <tr key={c.city}>
                <td>{c.city || '(não informada)'}</td>
                <td>{c.total}</td>
                <td>{c.won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Estoque de prêmios</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Prêmio</th>
              <th>Restante</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.prizes.filter((p) => p.type === 'prize').map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.quantity_remaining}</td>
                <td>{p.quantity_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
