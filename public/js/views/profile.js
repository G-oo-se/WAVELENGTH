import { api } from '../api.js';
import { createTrackCard } from '../components.js';
import { escapeHtml } from '../utils.js';

export async function renderProfile(app, params) {
  app.innerHTML = '<p class="loading">Loading profile…</p>';

  try {
    const user = await api.getUser(params.username);

    app.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">${escapeHtml(user.username.charAt(0).toUpperCase())}</div>
        <div>
          <h1></h1>
          <p class="profile-bio hidden"></p>
          <p class="profile-meta"></p>
        </div>
      </div>
      <div id="track-grid" class="track-grid"></div>
    `;

    app.querySelector('.profile-header h1').textContent = user.username;
    app.querySelector('.profile-meta').textContent = `${user.tracks.length} track${user.tracks.length === 1 ? '' : 's'}`;
    if (user.bio) {
      const bioEl = app.querySelector('.profile-bio');
      bioEl.textContent = user.bio;
      bioEl.classList.remove('hidden');
    }

    const grid = document.getElementById('track-grid');
    if (!user.tracks.length) {
      grid.innerHTML = '<p class="empty-state">No tracks uploaded yet.</p>';
      return;
    }
    user.tracks.forEach((track) => grid.appendChild(createTrackCard(track)));
  } catch (err) {
    app.innerHTML = `<p class="error-state"></p>`;
    app.querySelector('.error-state').textContent = err.message;
  }
}
