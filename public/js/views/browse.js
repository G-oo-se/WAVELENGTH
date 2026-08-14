import { api } from '../api.js';
import { searchState } from '../state.js';
import { createTrackCard } from '../components.js';
import { renderViewToggle, getViewMode } from '../viewToggle.js';

export async function renderBrowse(app) {
  app.innerHTML = `
    <div class="browse-header">
      <h1>Discover tracks</h1>
      <div class="browse-header-controls">
        <div id="view-toggle" class="view-toggle"></div>
        <select id="sort-select" aria-label="Sort tracks">
          <option value="newest">Newest</option>
          <option value="popular">Most played</option>
        </select>
      </div>
    </div>
    <div id="track-grid" class="track-grid"><p class="loading">Loading tracks…</p></div>
  `;

  const grid = document.getElementById('track-grid');
  const sortSelect = document.getElementById('sort-select');

  function applyViewMode(mode) {
    grid.classList.toggle('track-list', mode === 'list');
  }
  renderViewToggle(document.getElementById('view-toggle'), applyViewMode);
  applyViewMode(getViewMode());

  async function load() {
    grid.innerHTML = '<p class="loading">Loading tracks…</p>';
    try {
      const tracks = await api.getTracks({ search: searchState.query, sort: sortSelect.value });
      grid.innerHTML = '';
      if (!tracks.length) {
        grid.innerHTML = searchState.query
          ? '<p class="empty-state">No tracks match that search.</p>'
          : '<p class="empty-state">No tracks yet. Be the first to upload one.</p>';
        return;
      }
      tracks.forEach((track, i) => grid.appendChild(createTrackCard(track, tracks, i)));
    } catch (err) {
      grid.innerHTML = `<p class="error-state"></p>`;
      grid.querySelector('.error-state').textContent = err.message;
    }
  }

  sortSelect.addEventListener('change', load);
  load();
}
