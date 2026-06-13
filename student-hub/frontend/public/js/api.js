// frontend/js/api.js
// Thin API client. All fetch calls go through here.
// Automatically attaches the JWT token and handles common errors.

const API_BASE = 'http://localhost:4000/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
const getToken  = ()        => localStorage.getItem('unihub_token');
const setToken  = (t)       => localStorage.setItem('unihub_token', t);
const clearToken = ()       => localStorage.removeItem('unihub_token');

const getUser   = ()        => {
  try { return JSON.parse(localStorage.getItem('unihub_user')); } catch { return null; }
};
const setUser   = (u)       => localStorage.setItem('unihub_user', JSON.stringify(u));
const clearUser = ()        => localStorage.removeItem('unihub_user');

// ── Base fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  // Token expired or invalid — force logout
  if (res.status === 401) {
    clearToken();
    clearUser();
    window.location.reload();
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const Auth = {
  register: (name, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: { name, email, password } }),

  login: async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  me: () => apiFetch('/auth/me'),

  logout: () => {
    clearToken();
    clearUser();
  },
};

// ── Resources ─────────────────────────────────────────────────────────────────
const Resources = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return apiFetch(`/resources${qs ? '?' + qs : ''}`);
  },

  getOne: (id) => apiFetch(`/resources/${id}`),

  create: (formData) =>
    apiFetch('/resources', { method: 'POST', body: formData }),

  update: (id, body) =>
    apiFetch(`/resources/${id}`, { method: 'PUT', body }),

  remove: (id) =>
    apiFetch(`/resources/${id}`, { method: 'DELETE' }),

  download: (id) =>
    apiFetch(`/resources/${id}/download`),
};

// ── Users (admin only) ────────────────────────────────────────────────────────
const Users = {
  list: ()     => apiFetch('/users'),
  getOne: (id) => apiFetch(`/users/${id}`),

  changeRole:   (id, role)   => apiFetch(`/users/${id}/role`,   { method: 'PATCH', body: { role } }),
  changeStatus: (id, status) => apiFetch(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id)               => apiFetch(`/users/${id}`,         { method: 'DELETE' }),

  auditLog: () => apiFetch('/users/audit-log'),
};
