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
  getLikedTracks: () => request('GET', '/api/tracks/liked'),
  getTrack: (id) => request('GET', `/api/tracks/${id}`),
  uploadTrack: (formData) => request('POST', '/api/tracks', formData, true),
  markPlayed: (id) => request('POST', `/api/tracks/${id}/play`),
  likeTrack: (id) => request('POST', `/api/tracks/${id}/like`),
  unlikeTrack: (id) => request('DELETE', `/api/tracks/${id}/like`),
  deleteTrack: (id) => request('DELETE', `/api/tracks/${id}`),

  getUser: (username) => request('GET', `/api/users/${username}`),
  updateProfile: (formData) => request('POST', '/api/users/me', formData, true),
  getFriends: () => request('GET', '/api/users/me/friends'),
  sendFriendRequest: (username) => request('POST', `/api/users/${username}/friend-request`),
  acceptFriendRequest: (username) => request('POST', `/api/users/${username}/friend-accept`),
  removeFriend: (username) => request('DELETE', `/api/users/${username}/friend`),

  getPlaylists: () => request('GET', '/api/playlists'),
  searchPlaylists: (q) => request('GET', `/api/playlists/search?q=${encodeURIComponent(q)}`),
  createPlaylist: (payload) => request('POST', '/api/playlists', payload),
  getPlaylist: (id) => request('GET', `/api/playlists/${id}`),
  updatePlaylist: (id, payload) => request('PATCH', `/api/playlists/${id}`, payload),
  updatePlaylistCover: (id, formData) => request('POST', `/api/playlists/${id}/cover`, formData, true),
  deletePlaylist: (id) => request('DELETE', `/api/playlists/${id}`),
  addTrackToPlaylist: (playlistId, trackId) => request('POST', `/api/playlists/${playlistId}/tracks`, { track_id: trackId }),
  removeTrackFromPlaylist: (playlistId, trackId) => request('DELETE', `/api/playlists/${playlistId}/tracks/${trackId}`),

  register: (payload) => request('POST', '/api/auth/register', payload),
  login: (payload) => request('POST', '/api/auth/login', payload),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me')
};
