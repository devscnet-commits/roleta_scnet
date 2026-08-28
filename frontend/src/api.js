const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token && path.startsWith('/admin')) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401 && path.startsWith('/admin')) {
    const role = localStorage.getItem('admin_role');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    window.location.href = role === 'consultor' ? '/consultor/login' : '/admin/login';
    throw new Error('unauthorized');
  }
  if (!res.ok && res.status !== 200) {
    let body;
    try {
      body = await res.json();
    } catch {
      body = { error: 'unknown_error' };
    }
    const err = new Error(body.message || body.error || 'request_failed');
    err.body = body;
    err.status = res.status;
    throw err;
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};
