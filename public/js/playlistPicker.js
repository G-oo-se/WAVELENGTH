import { api } from './api.js';

let overlayEl = null;

function closePicker() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

export function openPlaylistPicker(trackId) {
  closePicker();

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-box">
      <h2>Add to playlist</h2>
      <div id="playlist-picker-list" class="playlist-picker-list"><p class="loading">Loading playlists…</p></div>
      <form id="new-playlist-form" class="playlist-picker-new">
        <input type="text" id="new-playlist-name" placeholder="New playlist name" maxlength="60" required>
        <button type="submit">Create</button>
      </form>
      <button type="button" class="modal-close">Close</button>
    </div>
  `;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closePicker();
  });
  overlayEl.querySelector('.modal-close').addEventListener('click', closePicker);

  const listEl = overlayEl.querySelector('#playlist-picker-list');

  async function loadPlaylists() {
    try {
      const playlists = await api.getPlaylists();
      if (!playlists.length) {
        listEl.innerHTML = '<p class="empty-state">No playlists yet — create one below.</p>';
        return;
      }
      listEl.innerHTML = '';
      playlists.forEach((playlist) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'playlist-picker-item';
        btn.innerHTML = `<span class="playlist-picker-item-name"></span><span class="playlist-picker-count">${playlist.track_count} track${playlist.track_count === 1 ? '' : 's'}</span>`;
        btn.querySelector('.playlist-picker-item-name').textContent = playlist.name;
        btn.addEventListener('click', async () => {
          try {
            await api.addTrackToPlaylist(playlist.id, trackId);
            btn.classList.add('is-added');
            btn.querySelector('.playlist-picker-item-name').textContent = `${playlist.name} ✓`;
          } catch (err) {
            alert(err.message);
          }
        });
        listEl.appendChild(btn);
      });
    } catch (err) {
      listEl.innerHTML = `<p class="error-state"></p>`;
      listEl.querySelector('.error-state').textContent = err.message;
    }
  }

  overlayEl.querySelector('#new-playlist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = overlayEl.querySelector('#new-playlist-name');
    const name = input.value.trim();
    if (!name) return;
    try {
      const playlist = await api.createPlaylist(name);
      await api.addTrackToPlaylist(playlist.id, trackId);
      input.value = '';
      loadPlaylists();
    } catch (err) {
      alert(err.message);
    }
  });

  loadPlaylists();
}
