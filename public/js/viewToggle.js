const STORAGE_KEY = 'wavelength-view-mode';

export function getViewMode() {
  return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid';
}

// Renders grid/list buttons into `container` and calls onChange(mode)
// whenever the person switches. Caller is responsible for applying the
// mode to its own track list on first render (call getViewMode() for that).
export function renderViewToggle(container, onChange) {
  const mode = getViewMode();
  container.innerHTML = `
    <button type="button" class="view-toggle-btn ${mode === 'grid' ? 'is-active' : ''}" data-mode="grid" aria-label="Grid view" title="Grid view">
      <svg viewBox="0 0 24 24"><path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/></svg>
    </button>
    <button type="button" class="view-toggle-btn ${mode === 'list' ? 'is-active' : ''}" data-mode="list" aria-label="List view" title="List view">
      <svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5zm0 6h16v2H4v-2zm0 6h16v2H4v-2z"/></svg>
    </button>
  `;

  container.querySelectorAll('.view-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, btn.dataset.mode);
      container.querySelectorAll('.view-toggle-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      onChange(btn.dataset.mode);
    });
  });
}
