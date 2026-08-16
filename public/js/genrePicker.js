import { api } from './api.js';

let cachedGenres = null;
async function getGenres() {
  if (!cachedGenres) cachedGenres = await api.getGenres();
  return cachedGenres;
}

// Renders the raw multi-select pills into `container` — no wrapper chrome.
// `selected` is a Set, mutated in place as the person clicks pills. Calls
// onChange(Array.from(selected)) on every toggle. Used directly by the
// upload page (always visible), and wrapped by renderGenreFilterControl
// below for the collapsible filter bars elsewhere.
export async function renderGenrePills(container, selected, onChange) {
  const genres = await getGenres();
  container.innerHTML = genres
    .map((g) => `<button type="button" class="genre-pill ${selected.has(g) ? 'is-active' : ''}" data-genre="${g}">${g}</button>`)
    .join('');

  container.querySelectorAll('.genre-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const g = pill.dataset.genre;
      if (selected.has(g)) selected.delete(g);
      else selected.add(g);
      pill.classList.toggle('is-active', selected.has(g));
      onChange(Array.from(selected));
    });
  });
}

// Renders a collapsed "Filter by genre" toggle button into `container`,
// which reveals a multi-select pill panel on click and closes again on an
// outside click. `selected` is a Set, mutated in place.
export function renderGenreFilterControl(container, selected, onChange) {
  container.innerHTML = `
    <button type="button" class="filter-toggle-btn">
      <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
      Filter by genre
      <span class="filter-count-badge hidden"></span>
    </button>
    <div class="genre-picker-panel hidden"></div>
  `;

  const btn = container.querySelector('.filter-toggle-btn');
  const panel = container.querySelector('.genre-picker-panel');
  const badge = container.querySelector('.filter-count-badge');

  function updateBadge() {
    if (selected.size) {
      badge.textContent = selected.size;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) panel.classList.add('hidden');
  });

  renderGenrePills(panel, selected, (arr) => {
    updateBadge();
    onChange(arr);
  });
  updateBadge();
}
