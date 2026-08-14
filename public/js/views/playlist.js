import { api } from '../api.js';
import { createTrackCard } from '../components.js';
import { playQueue, toggleShuffle } from '../player.js';
import { navigate } from '../router.js';

export async function renderPlaylist(app, params) {
  app.innerHTML = '<p class="loading">Loading playlist…</p>';

  let playlist;
  try {
    playlist = await api.getPlaylist(params.id);
  } catch (err) {
    app.innerHTML = `<p class="error-state"></p>`;
    app.querySelector('.error-state').textContent = err.message;
    return;
  }

  app.innerHTML = `
    <div class="playlist-header">
      <div class="playlist-header-icon">
        <svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
      </div>
      <div>
        <h1></h1>
        <p class="profile-meta">By <a class="playlist-owner-link"></a> · <span class="playlist-track-count"></span></p>
      </div>
    </div>
    <div class="playlist-controls">
      <button id="play-all-btn" class="pill-btn pill-btn--accent">Play all</button>
      <button id="shuffle-play-btn" class="pill-btn">Shuffle play</button>
      ${
        playlist.is_owner
          ? `<button id="rename-playlist-btn" class="pill-btn">Rename</button>
             <button id="delete-playlist-btn" class="pill-btn pill-btn--danger">Delete playlist</button>`
          : ''
      }
    </div>
    <div id="track-list" class="track-grid"></div>
  `;

  app.querySelector('.playlist-header h1').textContent = playlist.name;
  const ownerLink = app.querySelector('.playlist-owner-link');
  ownerLink.textContent = playlist.owner_username;
  ownerLink.href = `#/profile/${playlist.owner_username}`;
  app.querySelector('.playlist-track-count').textContent = `${playlist.tracks.length} track${playlist.tracks.length === 1 ? '' : 's'}`;

  const grid = document.getElementById('track-list');
  if (!playlist.tracks.length) {
    grid.innerHTML = '<p class="empty-state">No tracks in this playlist yet — add some from the browse page.</p>';
  } else {
    playlist.tracks.forEach((track, i) => {
      const card = createTrackCard(track, playlist.tracks, i);
      if (playlist.is_owner) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'playlist-remove-btn';
        removeBtn.textContent = 'Remove from playlist';
        removeBtn.addEventListener('click', async () => {
          try {
            await api.removeTrackFromPlaylist(playlist.id, track.id);
            card.remove();
          } catch (err) {
            alert(err.message);
          }
        });
        card.querySelector('.track-info').appendChild(removeBtn);
      }
      grid.appendChild(card);
    });
  }

  document.getElementById('play-all-btn').addEventListener('click', () => {
    if (playlist.tracks.length) playQueue(playlist.tracks, 0);
  });
  document.getElementById('shuffle-play-btn').addEventListener('click', () => {
    if (!playlist.tracks.length) return;
    playQueue(playlist.tracks, 0);
    toggleShuffle();
  });

  if (playlist.is_owner) {
    document.getElementById('rename-playlist-btn').addEventListener('click', async () => {
      const name = prompt('Rename playlist', playlist.name);
      if (!name || !name.trim()) return;
      try {
        await api.renamePlaylist(playlist.id, name.trim());
        app.querySelector('.playlist-header h1').textContent = name.trim();
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('delete-playlist-btn').addEventListener('click', async () => {
      if (!confirm(`Delete "${playlist.name}"? This can't be undone.`)) return;
      try {
        await api.deletePlaylist(playlist.id);
        navigate('/playlists');
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
