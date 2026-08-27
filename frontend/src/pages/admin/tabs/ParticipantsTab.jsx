import { useEffect, useState } from 'react';
import { api } from '../../../api.js';

export default function ParticipantsTab({ campaignId, notify }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');

  function load() {
    const params = new URLSearchParams({ sort, order });
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    if (result) params.set('result', result);
    api.get(`/admin/campaigns/${campaignId}/participants?${params.toString()}`).then(setRows);
  }

  useEffect(load, [campaignId, sort, order]);

  function toggleSort(col) {
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSort(col);
      setOrder('asc');
    }
  }

  async function redeem(id) {
    try {
      await api.post(`/admin/campaigns/${campaignId}/participants/${id}/redeem`, {});
      notify('Prêmio marcado como entregue.');
      load();
    } catch {
      notify('Não foi possível marcar como entregue.');
    }
  }

  async function clearAll() {
    if (!confirm('Isso vai apagar TODOS os participantes desta campanha. Deseja continuar?')) return;
    if (!confirm('Confirma novamente: essa ação não pode ser desfeita.')) return;
    const res = await api.del(`/admin/campaigns/${campaignId}/participants?confirm=yes`);
    notify(`${res.deleted} registros removidos.`);
    load();
  }

  function exportCsv() {
    const token = localStorage.getItem('admin_token');
    fetch(`/api/admin/campaigns/${campaignId}/participants/export.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `participantes-${campaignId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div>
      <div className="filters-row">
        <input placeholder="Buscar nome, CPF ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <input placeholder="Filtrar por cidade" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select value={result} onChange={(e) => setResult(e.target.value)}>
          <option value="">Todos os resultados</option>
          <option value="prize">Ganhou</option>
          <option value="no_prize">Não ganhou</option>
        </select>
        <button className="btn secondary" onClick={load}>Filtrar</button>
        <button className="btn" onClick={exportCsv}>Exportar CSV</button>
        <button className="btn danger" onClick={clearAll}>Limpar base</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort('name')}>Nome {sort === 'name' && (order === 'asc' ? '▲' : '▼')}</th>
            <th>CPF</th>
            <th>Telefone</th>
            <th onClick={() => toggleSort('city')}>Cidade {sort === 'city' && (order === 'asc' ? '▲' : '▼')}</th>
            <th onClick={() => toggleSort('result_type')}>Resultado {sort === 'result_type' && (order === 'asc' ? '▲' : '▼')}</th>
            <th>Prêmio</th>
            <th onClick={() => toggleSort('created_at')}>Data {sort === 'created_at' && (order === 'asc' ? '▲' : '▼')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.cpf_masked}</td>
              <td>{r.phone}</td>
              <td>{r.city}</td>
              <td>
                <span className={`pill ${r.result_type === 'prize' ? 'win' : 'lose'}`}>
                  {r.result_type === 'prize' ? 'Ganhou' : 'Não ganhou'}
                </span>
              </td>
              <td>
                {r.prize_title}
                {r.redemption_code && (
                  <div style={{ fontSize: 11, color: '#666' }}>
                    Código: {r.redemption_code} {r.redeemed ? '✅ entregue' : ''}
                  </div>
                )}
              </td>
              <td>{new Date(r.created_at).toLocaleString('pt-BR')}</td>
              <td>
                {r.result_type === 'prize' && !r.redeemed && (
                  <button className="btn secondary" onClick={() => redeem(r.id)}>Marcar entregue</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p style={{ color: '#666' }}>Nenhum participante encontrado.</p>}
    </div>
  );
}
