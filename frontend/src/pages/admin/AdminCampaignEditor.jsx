import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api.js';
import GeneralTab from './tabs/GeneralTab.jsx';
import PrizesTab from './tabs/PrizesTab.jsx';
import CitiesTab from './tabs/CitiesTab.jsx';
import ParticipantsTab from './tabs/ParticipantsTab.jsx';
import DashboardTab from './tabs/DashboardTab.jsx';
import QrTab from './tabs/QrTab.jsx';

const TABS = [
  { id: 'dashboard', label: 'Painel' },
  { id: 'general', label: 'Textos & Cores' },
  { id: 'prizes', label: 'Roleta & Prêmios' },
  { id: 'cities', label: 'Cidades' },
  { id: 'participants', label: 'Participantes' },
  { id: 'qr', label: 'QR Code' },
];

export default function AdminCampaignEditor() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');

  function load() {
    api.get(`/admin/campaigns/${id}`).then(setCampaign).catch(() => {});
  }

  useEffect(load, [id]);

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

      {tab === 'dashboard' && <DashboardTab campaignId={id} />}
      {tab === 'general' && <GeneralTab campaign={campaign} onSaved={(c) => { setCampaign(c); notify('Configurações salvas.'); }} />}
      {tab === 'prizes' && <PrizesTab campaignId={id} notify={notify} />}
      {tab === 'cities' && <CitiesTab campaignId={id} campaign={campaign} onCampaignSaved={setCampaign} notify={notify} />}
      {tab === 'participants' && <ParticipantsTab campaignId={id} campaign={campaign} notify={notify} />}
      {tab === 'qr' && <QrTab campaign={campaign} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
