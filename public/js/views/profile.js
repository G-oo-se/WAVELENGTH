import { api } from '../api.js';
import { createTrackCard } from '../components.js';
import { escapeHtml } from '../utils.js';
import { authState } from '../state.js';
import { renderViewToggle, getViewMode } from '../viewToggle.js';

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
      <h2>Tracks</h2>
      <div id="view-toggle" class="view-toggle"></div>
    </div>
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

  const grid = document.getElementById('track-grid');
  function applyViewMode(mode) {
    grid.classList.toggle('track-list', mode === 'list');
  }
  renderViewToggle(document.getElementById('view-toggle'), applyViewMode);
  applyViewMode(getViewMode());

  if (!user.tracks.length) {
    grid.innerHTML = '<p class="empty-state">No tracks uploaded yet.</p>';
  } else {
    user.tracks.forEach((track, i) => grid.appendChild(createTrackCard(track, user.tracks, i)));
  }
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
