import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api.js';
import ParticipantsTab from '../admin/tabs/ParticipantsTab.jsx';
import QrTab from '../admin/tabs/QrTab.jsx';

const TABS = [
  { id: 'participants', label: 'Participantes' },
  { id: 'qr', label: 'QR Code' },
];

export default function ConsultorCampaignView() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [tab, setTab] = useState('participants');
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get(`/admin/campaigns/${id}`).then(setCampaign).catch(() => {});
  }, [id]);

  const notify = useMemo(
    () => (msg) => {
      setToast(msg);
      setTimeout(() => setToast(''), 2500);
    },
    []
  );

  if (!campaign) return <p>Carregando...</p>;

  return (
    <div>
      <h1>{campaign.name}</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'participants' && <ParticipantsTab campaignId={id} campaign={campaign} notify={notify} />}
      {tab === 'qr' && <QrTab campaign={campaign} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
