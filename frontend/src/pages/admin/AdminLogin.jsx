import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import './admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/admin/login', { email, password });
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_role', res.role || 'admin');
      navigate(res.role === 'consultor' ? '/consultor' : '/admin');
    } catch (err) {
      if (err.status === 401) {
        setError('E-mail ou senha inválidos.');
      } else {
        setError(`Falha ao entrar (${err.status || 'sem conexão'}): ${err.body?.message || err.message}`);
      }
    }
  }

  return (
    <div className="brand-login-screen">
      <div className="brand-login-card">
        <div className="badge-pill-wrap">
          <span className="badge-pill brand-badge">
            <span className="badge-dot" />
            PAINEL ADMINISTRATIVO
          </span>
        </div>
        <h1 className="brand-login-title">
          Roleta <span className="accent">SCNET</span>
        </h1>
        <p className="brand-login-subtitle">Entre para configurar suas campanhas</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn-primary" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
