import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('consultor');
  const [error, setError] = useState('');

  function load() {
    api.get('/admin/users').then(setUsers).catch(() => {});
  }

  useEffect(load, []);

  async function createUser(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/users', { email, password, role });
      setEmail('');
      setPassword('');
      setRole('consultor');
      load();
    } catch (err) {
      setError(err.body?.error === 'email_taken' ? 'Esse e-mail já está cadastrado.' : 'Erro ao criar usuário.');
    }
  }

  async function removeUser(id) {
    if (!confirm('Remover este usuário?')) return;
    try {
      await api.del(`/admin/users/${id}`);
      load();
    } catch {
      alert('Não foi possível remover (talvez seja o seu próprio usuário).');
    }
  }

  return (
    <div>
      <h1>Usuários</h1>
      <p style={{ color: '#666', marginTop: -8 }}>
        Administradores têm acesso completo ao painel. Consultores só acessam a lista de participantes (para marcar
        prêmios como entregues) e o QR Code de cada campanha, em <code>/consultor</code>.
      </p>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Novo usuário</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={createUser} className="form-row" style={{ alignItems: 'end' }}>
          <div className="field">
            <label>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>Perfil</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="consultor">Consultor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button className="btn" type="submit">Criar</button>
        </form>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Perfil</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <span className={`pill ${u.role === 'admin' ? 'win' : 'yes'}`}>{u.role === 'admin' ? 'Administrador' : 'Consultor'}</span>
              </td>
              <td>
                <button className="btn danger" onClick={() => removeUser(u.id)}>Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
