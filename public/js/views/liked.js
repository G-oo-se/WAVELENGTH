import { api } from '../api.js';
import { createTrackCard } from '../components.js';

export async function renderLiked(app) {
  const user = await api.me().catch(() => null);
  if (!user) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to see liked tracks.</p>';
    return;
  }

  app.innerHTML = `
    <div class="browse-header"><h1>Liked tracks</h1></div>
    <div id="track-grid" class="track-grid"><p class="loading">Loading…</p></div>
  `;

  const grid = document.getElementById('track-grid');
  try {
    const tracks = await api.getLikedTracks();
    if (!tracks.length) {
      grid.innerHTML = "<p class=\"empty-state\">You haven't liked any tracks yet.</p>";
      return;
    }
    grid.innerHTML = '';
    tracks.forEach((track, i) => grid.appendChild(createTrackCard(track, tracks, i)));
  } catch (err) {
    grid.innerHTML = `<p class="error-state"></p>`;
    grid.querySelector('.error-state').textContent = err.message;
  }
}
