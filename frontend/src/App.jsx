import { Routes, Route, Navigate } from 'react-router-dom';
import CampaignPage from './pages/CampaignPage.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminCampaignList from './pages/admin/AdminCampaignList.jsx';
import AdminCampaignEditor from './pages/admin/AdminCampaignEditor.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import ConsultorLogin from './pages/consultor/ConsultorLogin.jsx';
import ConsultorLayout from './pages/consultor/ConsultorLayout.jsx';
import ConsultorCampaignList from './pages/consultor/ConsultorCampaignList.jsx';
import ConsultorCampaignView from './pages/consultor/ConsultorCampaignView.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/c/:slug" element={<CampaignPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminCampaignList />} />
        <Route path="campaigns/:id" element={<AdminCampaignEditor />} />
        <Route path="usuarios" element={<AdminUsers />} />
      </Route>
      <Route path="/consultor/login" element={<ConsultorLogin />} />
      <Route path="/consultor" element={<ConsultorLayout />}>
        <Route index element={<ConsultorCampaignList />} />
        <Route path="campaigns/:id" element={<ConsultorCampaignView />} />
      </Route>
    </Routes>
  );
}
