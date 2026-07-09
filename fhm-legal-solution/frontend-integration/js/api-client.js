// Tiny fetch wrapper shared by homepage-loader.js and advocate-loader.js.
// No auth token is ever used here — these are all public, read-only endpoints.

const FHM = (() => {
  const BASE = window.FHM_API_BASE_URL;

  async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.message || `Request to ${path} failed (${res.status})`);
    }
    return json.data;
  }

  async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.message || `Request to ${path} failed (${res.status})`);
    }
    return json.data;
  }

  return {
    getAdvocates: (params = '') => get(`/advocates${params}`),
    getAdvocateBySlug: (slug) => get(`/advocates/${encodeURIComponent(slug)}`),
    getHomepageContent: () => get('/homepage'),
    getPracticeAreas: () => get('/practice-areas'),
    getTestimonials: () => get('/testimonials'),
    submitConsultation: (payload) => post('/consultations', payload),
  };
})();
