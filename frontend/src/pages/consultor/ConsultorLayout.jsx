import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import '../admin/admin.css';

export default function ConsultorLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/consultor/login');
      return;
    }
    if (localStorage.getItem('admin_role') !== 'consultor') {
      navigate('/admin');
    }
  }, [navigate]);

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    navigate('/consultor/login');
  }

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <h2>Roleta SCNET</h2>
        <span style={{ color: '#8ea2c4', fontSize: 12, marginBottom: 8, display: 'block' }}>Área do consultor</span>
        <button onClick={logout}>Sair</button>
      </div>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
