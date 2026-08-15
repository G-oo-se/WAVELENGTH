import { api } from '../api.js';
import { searchState } from '../state.js';
import { createTrackCard } from '../components.js';
import { renderViewToggle, getViewMode } from '../viewToggle.js';
import { escapeHtml } from '../utils.js';

export async function renderBrowse(app) {
  app.innerHTML = `
    <div id="playlist-results" class="hidden">
      <div class="browse-header"><h2>Playlists</h2></div>
      <div id="playlist-results-grid" class="playlist-grid playlist-grid--compact"></div>
    </div>
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
  const playlistResults = document.getElementById('playlist-results');
  const playlistResultsGrid = document.getElementById('playlist-results-grid');

  function applyViewMode(mode) {
    grid.classList.toggle('track-list', mode === 'list');
  }
  renderViewToggle(document.getElementById('view-toggle'), applyViewMode);
  applyViewMode(getViewMode());

  async function loadPlaylistResults() {
    if (!searchState.query) {
      playlistResults.classList.add('hidden');
      return;
    }
    try {
      const playlists = await api.searchPlaylists(searchState.query);
      if (!playlists.length) {
        playlistResults.classList.add('hidden');
        return;
      }
      playlistResultsGrid.innerHTML = '';
      playlists.forEach((playlist) => {
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
          <div class="playlist-card-count">By <span class="playlist-card-owner"></span> · ${playlist.track_count} track${playlist.track_count === 1 ? '' : 's'}</div>
        `;
        card.querySelector('.playlist-card-name').textContent = playlist.name;
        card.querySelector('.playlist-card-owner').textContent = playlist.owner_username;
        playlistResultsGrid.appendChild(card);
      });
      playlistResults.classList.remove('hidden');
    } catch {
      playlistResults.classList.add('hidden');
    }
  }

  async function load() {
    grid.innerHTML = '<p class="loading">Loading tracks…</p>';
    try {
      const tracks = await api.getTracks({ search: searchState.query, sort: sortSelect.value });
      grid.innerHTML = '';
      if (!tracks.length) {
        grid.innerHTML = searchState.query
          ? '<p class="empty-state">No tracks match that search.</p>'
          : '<p class="empty-state">No tracks yet. Be the first to add one.</p>';
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
  loadPlaylistResults();
}
