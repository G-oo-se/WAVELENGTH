// Track titles, artist names, bios, etc. all come from other users. Anywhere
// that text gets inserted via innerHTML, run it through this first so a title
// like `<img src=x onerror=alert(1)>` renders as harmless text, not markup.
export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
