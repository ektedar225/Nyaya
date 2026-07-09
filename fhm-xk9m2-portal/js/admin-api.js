// ── EDIT THIS to your deployed Render backend URL ──
// Local testing: 'http://localhost:5000/api'
// Production:    'https://fhm-legal-backend.onrender.com/api'
window.FHM_API_BASE_URL = window.FHM_API_BASE_URL || 'https://fhm-legal-backend.onrender.com/api';

const AdminAPI = (() => {
  const BASE = window.FHM_API_BASE_URL;

  function getToken() {
    return localStorage.getItem('fhm_admin_token');
  }

  function setToken(token) {
    localStorage.setItem('fhm_admin_token', token);
  }

  function clearToken() {
    localStorage.removeItem('fhm_admin_token');
  }

  async function request(path, { method = 'GET', body, isMultipart = false } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!isMultipart) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: isMultipart ? body : body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      clearToken();
      if (!location.pathname.endsWith('login.html')) {
        location.href = 'login.html';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.message || `Request failed (${res.status})`);
    }
    return json.data;
  }

  return {
    getToken, setToken, clearToken,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
    uploadImage: (file, folder = 'advocates') => {
      const form = new FormData();
      form.append('image', file);
      form.append('folder', folder);
      return request('/admin/uploads/image', { method: 'POST', body: form, isMultipart: true });
    },
  };
})();
