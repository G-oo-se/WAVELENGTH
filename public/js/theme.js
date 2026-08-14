const STORAGE_KEY = 'wavelength-theme';

// Two dark, two light — covers both "dark/light toggle" and "pick a
// different design" in one mechanism. Add more by adding a name here and a
// matching [data-theme="..."] block in style.css.
const THEMES = [
  { id: 'amber-dark', label: 'Amber (Dark)' },
  { id: 'amber-light', label: 'Amber (Light)' },
  { id: 'slate-dark', label: 'Slate (Dark)' },
  { id: 'rose-light', label: 'Rose (Light)' }
];

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'amber-dark';
}

export function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem(STORAGE_KEY, themeId);
}

export function initThemePicker(container) {
  container.innerHTML = THEMES.map(
    (t) => `<button type="button" class="theme-swatch theme-swatch--${t.id}" data-theme-id="${t.id}" aria-label="${t.label}" title="${t.label}"></button>`
  ).join('');

  container.querySelectorAll('.theme-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.themeId);
      markActiveSwatch(container);
    });
  });
  markActiveSwatch(container);
}

function markActiveSwatch(container) {
  const current = getTheme();
  container.querySelectorAll('.theme-swatch').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.themeId === current);
  });
}
