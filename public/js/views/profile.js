import { api } from '../api.js';
import { createTrackCard } from '../components.js';
import { escapeHtml } from '../utils.js';
import { authState } from '../state.js';
import { renderViewToggle, getViewMode } from '../viewToggle.js';
import { renderGenreFilterControl } from '../genrePicker.js';

export async function renderProfile(app, params) {
  app.innerHTML = '<p class="loading">Loading profile…</p>';

  let user;
  try {
    user = await api.getUser(params.username);
  } catch (err) {
    app.innerHTML = `<p class="error-state"></p>`;
    app.querySelector('.error-state').textContent = err.message;
    return;
  }

  const isMe = authState.user && authState.user.username === user.username;

  app.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar" style="${user.avatar_path ? `background-image:url(${escapeHtml(user.avatar_path)})` : ''}">
        ${user.avatar_path ? '' : escapeHtml(user.username.charAt(0).toUpperCase())}
      </div>
      <div class="profile-header-info">
        <h1></h1>
        <p class="profile-bio hidden"></p>
        <p class="profile-meta"></p>
        <div class="profile-actions"></div>
      </div>
    </div>
    <div class="browse-header">
      <h2>Playlists</h2>
    </div>
    <div id="playlist-row" class="playlist-grid playlist-grid--compact"></div>
    <div class="browse-header">
      <h2>Tracks</h2>
      <div id="view-toggle" class="view-toggle"></div>
    </div>
    <div id="genre-filter" class="genre-filter-control"></div>
    <div id="track-grid" class="track-grid"></div>
  `;

  app.querySelector('.profile-header h1').textContent = user.username;
  app.querySelector('.profile-meta').textContent =
    `${user.tracks.length} track${user.tracks.length === 1 ? '' : 's'} · ${user.friend_count} friend${user.friend_count === 1 ? '' : 's'}`;
  if (user.bio) {
    const bioEl = app.querySelector('.profile-bio');
    bioEl.textContent = user.bio;
    bioEl.classList.remove('hidden');
  }

  const actionsEl = app.querySelector('.profile-actions');
  if (isMe) {
    actionsEl.innerHTML = '<a href="#/edit-profile" class="pill-btn">Edit profile</a>';
  } else if (authState.user) {
    renderFriendAction(actionsEl, user);
  }

  const playlistRow = document.getElementById('playlist-row');
  if (!user.playlists.length) {
    playlistRow.previousElementSibling.classList.add('hidden');
    playlistRow.classList.add('hidden');
  } else {
    user.playlists.forEach((playlist) => {
      const card = document.createElement('a');
      card.className = 'playlist-card';
      card.href = `#/playlists/${playlist.id}`;
      card.innerHTML = `
        <div class="playlist-card-icon" style="${playlist.cover_path ? `background-image:url(${escapeHtml(playlist.cover_path)})` : ''}">
          ${
            playlist.cover_path
              ? ''
              : '<svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>'
          }
        </div>
        <div class="playlist-card-name"></div>
        <div class="playlist-card-count">${playlist.track_count} track${playlist.track_count === 1 ? '' : 's'}${isMe && !playlist.is_public ? ' · Private' : ''}</div>
      `;
      card.querySelector('.playlist-card-name').textContent = playlist.name;
      playlistRow.appendChild(card);
    });
  }

  const grid = document.getElementById('track-grid');
  function applyViewMode(mode) {
    grid.classList.toggle('track-list', mode === 'list');
  }
  renderViewToggle(document.getElementById('view-toggle'), applyViewMode);
  applyViewMode(getViewMode());

  const selectedGenres = new Set();
  function renderTracks() {
    const filtered = selectedGenres.size
      ? user.tracks.filter((t) => Array.from(selectedGenres).every((g) => t.genres.includes(g)))
      : user.tracks;
    if (!filtered.length) {
      grid.innerHTML = user.tracks.length
        ? '<p class="empty-state">No tracks match that.</p>'
        : '<p class="empty-state">No tracks uploaded yet.</p>';
      return;
    }
    grid.innerHTML = '';
    filtered.forEach((track, i) => grid.appendChild(createTrackCard(track, filtered, i)));
  }
  renderGenreFilterControl(document.getElementById('genre-filter'), selectedGenres, renderTracks);
  renderTracks();
}

function renderFriendAction(container, user) {
  const status = user.friend_status;

  if (status === 'friends') {
    const btn = document.createElement('button');
    btn.className = 'pill-btn pill-btn--danger';
    btn.textContent = 'Remove friend';
    btn.addEventListener('click', async () => {
      if (!confirm(`Remove ${user.username} as a friend?`)) return;
      await api.removeFriend(user.username);
      btn.replaceWith(buildAddButton(user));
    });
    container.appendChild(btn);
    return;
  }

  if (status === 'request_sent') {
    const btn = document.createElement('button');
    btn.className = 'pill-btn';
    btn.textContent = 'Request sent';
    btn.disabled = true;
    container.appendChild(btn);
    return;
  }

  if (status === 'request_received') {
    const btn = document.createElement('button');
    btn.className = 'pill-btn pill-btn--accent';
    btn.textContent = 'Accept friend request';
    btn.addEventListener('click', async () => {
      try {
        await api.acceptFriendRequest(user.username);
        btn.textContent = 'Friends ✓';
        btn.disabled = true;
      } catch (err) {
        alert(err.message);
      }
    });
    container.appendChild(btn);
    return;
  }

  container.appendChild(buildAddButton(user));
}

function buildAddButton(user) {
  const btn = document.createElement('button');
  btn.className = 'pill-btn pill-btn--accent';
  btn.textContent = 'Add friend';
  btn.addEventListener('click', async () => {
    try {
      await api.sendFriendRequest(user.username);
      btn.textContent = 'Request sent';
      btn.disabled = true;
    } catch (err) {
      alert(err.message);
    }
  });
  return btn;
}
