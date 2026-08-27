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
      navigate('/admin');
    } catch (err) {
      setError('E-mail ou senha inválidos.');
    }
  }

  return (
    <div className="admin-shell" style={{ width: '100%' }}>
      <div className="login-box">
        <h2>Painel Roleta SCNET</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
