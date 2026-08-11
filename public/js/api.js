async function request(method, url, body, isFormData = false) {
  const options = { method, credentials: 'same-origin' };

  if (body) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getTracks: (params = {}) => {
    const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const qs = new URLSearchParams(cleaned).toString();
    return request('GET', `/api/tracks${qs ? `?${qs}` : ''}`);
  },
  getTrack: (id) => request('GET', `/api/tracks/${id}`),
  uploadTrack: (formData) => request('POST', '/api/tracks', formData, true),
  markPlayed: (id) => request('POST', `/api/tracks/${id}/play`),
  getUser: (username) => request('GET', `/api/users/${username}`),
  register: (payload) => request('POST', '/api/auth/register', payload),
  login: (payload) => request('POST', '/api/auth/login', payload),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me')
};
