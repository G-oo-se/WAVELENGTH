import { escapeHtml } from './utils.js';

let overlayEl = null;

function closeEmbed() {
  if (overlayEl) {
    // Clearing the iframe src stops playback immediately on close, rather
    // than leaving audio running invisibly in a detached element.
    const iframe = overlayEl.querySelector('iframe');
    if (iframe) iframe.src = '';
    overlayEl.remove();
    overlayEl = null;
  }
}

export function openEmbedModal(track) {
  closeEmbed();

  const label = track.source_type === 'youtube' ? 'YouTube' : 'SoundCloud';

  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.innerHTML = `
    <div class="modal-box modal-box--embed">
      <h2></h2>
      <p class="embed-source-label">Playing via ${label} — not through Wavelength's player.</p>
      <div class="embed-frame-wrap embed-frame-wrap--${track.source_type}">
        <iframe src="${escapeHtml(track.embed_url)}" allow="autoplay" loading="lazy" title="${escapeHtml(track.title)}"></iframe>
      </div>
      <button type="button" class="modal-close">Close</button>
    </div>
  `;
  overlayEl.querySelector('h2').textContent = track.title;
  document.body.appendChild(overlayEl);

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeEmbed();
  });
  overlayEl.querySelector('.modal-close').addEventListener('click', closeEmbed);
}
