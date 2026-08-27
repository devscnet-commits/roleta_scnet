import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import './admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) navigate('/admin/login');
  }, [navigate]);

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <h2>Roleta SCNET</h2>
        <Link to="/admin">Campanhas</Link>
        <button onClick={logout}>Sair</button>
      </div>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
