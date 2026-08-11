import { api } from '../api.js';
import { searchState } from '../state.js';
import { createTrackCard } from '../components.js';

export async function renderBrowse(app) {
  app.innerHTML = `
    <div class="browse-header">
      <h1>Discover tracks</h1>
      <select id="sort-select" aria-label="Sort tracks">
        <option value="newest">Newest</option>
        <option value="popular">Most played</option>
      </select>
    </div>
    <div id="track-grid" class="track-grid"><p class="loading">Loading tracks…</p></div>
  `;

  const grid = document.getElementById('track-grid');
  const sortSelect = document.getElementById('sort-select');

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
      tracks.forEach((track) => grid.appendChild(createTrackCard(track)));
    } catch (err) {
      grid.innerHTML = `<p class="error-state"></p>`;
      grid.querySelector('.error-state').textContent = err.message;
    }
  }

  sortSelect.addEventListener('change', load);
  load();
}
