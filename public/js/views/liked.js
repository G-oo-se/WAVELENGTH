import { api } from '../api.js';
import { createTrackCard } from '../components.js';
import { renderViewToggle, getViewMode } from '../viewToggle.js';
import { renderGenreFilterControl } from '../genrePicker.js';

export async function renderLiked(app) {
  const user = await api.me().catch(() => null);
  if (!user) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to see liked tracks.</p>';
    return;
  }

  app.innerHTML = `
    <div class="browse-header">
      <h1>Liked tracks</h1>
      <div id="view-toggle" class="view-toggle"></div>
    </div>
    <div id="genre-filter" class="genre-filter-control"></div>
    <div id="track-grid" class="track-grid"><p class="loading">Loading…</p></div>
  `;

  const grid = document.getElementById('track-grid');
  let allTracks = [];
  const selectedGenres = new Set();

  function applyViewMode(mode) {
    grid.classList.toggle('track-list', mode === 'list');
  }
  renderViewToggle(document.getElementById('view-toggle'), applyViewMode);
  applyViewMode(getViewMode());

  function renderTracks() {
    const filtered = selectedGenres.size
      ? allTracks.filter((t) => Array.from(selectedGenres).every((g) => t.genres.includes(g)))
      : allTracks;
    grid.innerHTML = '';
    if (!filtered.length) {
      grid.innerHTML = allTracks.length
        ? '<p class="empty-state">No liked tracks match that.</p>'
        : "<p class=\"empty-state\">You haven't liked any tracks yet.</p>";
      return;
    }
    filtered.forEach((track, i) => grid.appendChild(createTrackCard(track, filtered, i)));
  }

  renderGenreFilterControl(document.getElementById('genre-filter'), selectedGenres, renderTracks);

  try {
    allTracks = await api.getLikedTracks();
    renderTracks();
  } catch (err) {
    grid.innerHTML = `<p class="error-state"></p>`;
    grid.querySelector('.error-state').textContent = err.message;
  }
}
