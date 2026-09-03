import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import '../admin/admin.css';

export default function ConsultorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/admin/login', { email, password });
      if (res.role !== 'consultor') {
        setError('Este usuário não tem perfil de consultor.');
        return;
      }
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_role', res.role);
      navigate('/consultor');
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
            ÁREA DO CONSULTOR
          </span>
        </div>
        <h1 className="brand-login-title">
          Roleta <span className="accent">SCNET</span>
        </h1>
        <p className="brand-login-subtitle">Entre para conferir participantes e entregar prêmios</p>
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
