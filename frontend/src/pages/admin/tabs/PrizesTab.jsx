import { useEffect, useState } from 'react';
import { api } from '../../../api.js';

function emptyPrize(orderIndex) {
  return {
    type: 'prize',
    title: '',
    description: '',
    color: '#1E88E5',
    quantityTotal: 10,
    probabilityWeight: 10,
    cityScope: 'all',
    videoUrl: '',
    redeemMessage: '',
    orderIndex,
    active: true,
    cityIds: [],
  };
}

export default function PrizesTab({ campaignId, notify }) {
  const [prizes, setPrizes] = useState([]);
  const [cities, setCities] = useState([]);
  const [draft, setDraft] = useState(null);

  function load() {
    api.get(`/admin/campaigns/${campaignId}/prizes`).then(setPrizes);
    api.get(`/admin/campaigns/${campaignId}/cities`).then(setCities);
  }
  useEffect(load, [campaignId]);

  const totalWeight = prizes.filter((p) => p.active).reduce((s, p) => s + p.probability_weight, 0);

  async function saveDraft() {
    if (draft.id) {
      await api.put(`/admin/campaigns/${campaignId}/prizes/${draft.id}`, draft);
    } else {
      await api.post(`/admin/campaigns/${campaignId}/prizes`, draft);
    }
    setDraft(null);
    load();
    notify('Opção da roleta salva.');
  }

  async function removePrize(id) {
    if (!confirm('Remover esta opção da roleta?')) return;
    await api.del(`/admin/campaigns/${campaignId}/prizes/${id}`);
    load();
  }

  function editPrize(p) {
    setDraft({
      id: p.id,
      type: p.type,
      title: p.title,
      description: p.description,
      color: p.color,
      quantityTotal: p.quantity_total,
      probabilityWeight: p.probability_weight,
      cityScope: p.city_scope,
      videoUrl: p.video_url,
      redeemMessage: p.redeem_message,
      orderIndex: p.order_index,
      active: p.active,
      cityIds: p.cityIds,
    });
  }

  return (
    <div>
      <div className="admin-card">
        <p>
          Total de opções: <strong>{prizes.length}</strong> · Soma de pesos (probabilidade relativa) das opções
          ativas: <strong>{totalWeight}</strong>. O peso é relativo entre si — não precisa somar 100.
        </p>
        <button className="btn" onClick={() => setDraft(emptyPrize(prizes.length))}>
          + Nova opção (prêmio ou "não ganhou")
        </button>
      </div>

      {draft && (
        <div className="admin-card">
          <h3 style={{ marginTop: 0 }}>{draft.id ? 'Editar opção' : 'Nova opção'}</h3>
          <div className="form-row">
            <div className="field">
              <label>Tipo</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="prize">Prêmio (ganha)</option>
                <option value="no_prize">Sem prêmio (não ganha)</option>
              </select>
            </div>
            <div className="field">
              <label>Título exibido na roleta</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex: Caixa de som" />
            </div>
            <div className="field">
              <label>Cor da fatia</label>
              <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Descrição / detalhe interno</label>
              <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Peso / probabilidade relativa</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.probabilityWeight}
                onChange={(e) => setDraft({ ...draft, probabilityWeight: e.target.value })}
              />
            </div>
            {draft.type === 'prize' && (
              <div className="field">
                <label>Quantidade disponível (estoque)</label>
                <input
                  type="number"
                  min="0"
                  value={draft.quantityTotal}
                  onChange={(e) => setDraft({ ...draft, quantityTotal: e.target.value })}
                />
              </div>
            )}
          </div>

          {draft.type === 'prize' && (
            <>
              <div className="form-row">
                <div className="field">
                  <label>Cidades elegíveis para este prêmio</label>
                  <select value={draft.cityScope} onChange={(e) => setDraft({ ...draft, cityScope: e.target.value })}>
                    <option value="all">Todas as cidades cadastradas como atendidas</option>
                    <option value="selected">Somente cidades selecionadas abaixo</option>
                  </select>
                </div>
                <div className="field">
                  <label>Vídeo exibido ao ganhar (URL, opcional)</label>
                  <input value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} placeholder="https://.../mascote.mp4" />
                </div>
              </div>
              {draft.cityScope === 'selected' && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Selecione as cidades</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {cities.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={draft.cityIds.includes(c.id)}
                          onChange={(e) => {
                            const set = new Set(draft.cityIds);
                            if (e.target.checked) set.add(c.id);
                            else set.delete(c.id);
                            setDraft({ ...draft, cityIds: [...set] });
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="field">
                <label>Mensagem de retirada do prêmio</label>
                <input value={draft.redeemMessage} onChange={(e) => setDraft({ ...draft, redeemMessage: e.target.value })} />
              </div>
            </>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0' }}>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Ativa (aparece na roleta)
          </label>

          <button className="btn" onClick={saveDraft}>Salvar</button>{' '}
          <button className="btn secondary" onClick={() => setDraft(null)}>Cancelar</button>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Tipo</th>
            <th>Peso</th>
            <th>Estoque</th>
            <th>Cidades</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {prizes.map((p) => (
            <tr key={p.id}>
              <td>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: p.color, marginRight: 6 }} />
                {p.title}
              </td>
              <td>{p.type === 'prize' ? 'Prêmio' : 'Sem prêmio'}</td>
              <td>{p.probability_weight}</td>
              <td>{p.type === 'prize' ? `${p.quantity_remaining} / ${p.quantity_total}` : '—'}</td>
              <td>{p.type === 'prize' ? (p.city_scope === 'all' ? 'Todas' : `${p.cityIds.length} selecionada(s)`) : '—'}</td>
              <td>
                <span className={`pill ${p.active ? 'yes' : 'no'}`}>{p.active ? 'Ativa' : 'Inativa'}</span>
              </td>
              <td>
                <button className="btn secondary" onClick={() => editPrize(p)}>Editar</button>{' '}
                <button className="btn danger" onClick={() => removePrize(p.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
