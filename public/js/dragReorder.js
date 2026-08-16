import { api } from './api.js';

// Wires up native HTML5 drag-and-drop on the track cards inside `grid` so
// the owner can reorder a playlist by dragging. Only touches cards that
// have a `.track-drag-handle` element (added by the caller, owner-only).
export function enableDragReorder(grid, playlistId) {
  let draggedCard = null;

  grid.querySelectorAll('.track-card').forEach((card) => {
    const handle = card.querySelector('.track-drag-handle');
    if (!handle) return;

    card.draggable = true;

    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      draggedCard = null;
      persistOrder(grid, playlistId);
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedCard || draggedCard === card) return;
      const rect = card.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      grid.insertBefore(draggedCard, before ? card : card.nextSibling);
    });
  });
}

async function persistOrder(grid, playlistId) {
  const trackIds = Array.from(grid.querySelectorAll('.track-card')).map((c) => Number(c.dataset.trackId));
  try {
    await api.reorderPlaylist(playlistId, trackIds);
  } catch (err) {
    alert(`Couldn't save the new order: ${err.message}`);
  }
}
