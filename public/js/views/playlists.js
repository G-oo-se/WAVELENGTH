import { api } from '../api.js';
import { navigate } from '../router.js';

export async function renderPlaylists(app) {
  const user = await api.me().catch(() => null);
  if (!user) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to see your playlists.</p>';
    return;
  }

  app.innerHTML = `
    <div class="browse-header"><h1>Your playlists</h1></div>
    <form id="create-playlist-form" class="inline-form">
      <input type="text" id="new-playlist-name" placeholder="New playlist name" maxlength="60" required>
      <button type="submit">Create playlist</button>
    </form>
    <div id="playlist-grid" class="playlist-grid"><p class="loading">Loading playlists…</p></div>
  `;

  const grid = document.getElementById('playlist-grid');

  async function load() {
    try {
      const playlists = await api.getPlaylists();
      if (!playlists.length) {
        grid.innerHTML = '<p class="empty-state">No playlists yet. Create your first one above.</p>';
        return;
      }
      grid.innerHTML = '';
      playlists.forEach((playlist) => {
        const card = document.createElement('a');
        card.className = 'playlist-card';
        card.href = `#/playlists/${playlist.id}`;
        card.innerHTML = `
          <div class="playlist-card-icon">
            <svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
          </div>
          <div class="playlist-card-name"></div>
          <div class="playlist-card-count">${playlist.track_count} track${playlist.track_count === 1 ? '' : 's'}</div>
        `;
        card.querySelector('.playlist-card-name').textContent = playlist.name;
        grid.appendChild(card);
      });
    } catch (err) {
      grid.innerHTML = `<p class="error-state"></p>`;
      grid.querySelector('.error-state').textContent = err.message;
    }
  }

  document.getElementById('create-playlist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-playlist-name');
    const name = input.value.trim();
    if (!name) return;
    try {
      const playlist = await api.createPlaylist(name);
      navigate(`/playlists/${playlist.id}`);
    } catch (err) {
      alert(err.message);
    }
  });

  load();
}
