import { api } from '../api.js';
import { createTrackCard } from '../components.js';
import { playQueue, toggleShuffle, setRepeatMode } from '../player.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { renderViewToggle, getViewMode } from '../viewToggle.js';
import { renderGenreFilterControl } from '../genrePicker.js';
import { enableDragReorder } from '../dragReorder.js';

export async function renderPlaylist(app, params) {
  app.innerHTML = '<p class="loading">Loading playlist…</p>';

  let playlist;
  try {
    playlist = await api.getPlaylist(params.id);
  } catch (err) {
    app.innerHTML = `<p class="error-state"></p>`;
    app.querySelector('.error-state').textContent = err.message;
    return;
  }

  renderShell(app, playlist);
}

function renderShell(app, playlist) {
  app.innerHTML = `
    <div class="playlist-header">
      <div class="playlist-header-icon" id="playlist-cover" style="${playlist.cover_path ? `background-image:url(${escapeHtml(playlist.cover_path)})` : ''}">
        ${
          playlist.cover_path
            ? ''
            : '<svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>'
        }
      </div>
      <div class="playlist-header-info">
        <h1></h1>
        <p class="profile-meta">By <a class="playlist-owner-link"></a> · <span class="playlist-track-count"></span> · <span class="playlist-visibility"></span></p>
        <p class="playlist-description hidden"></p>
      </div>
    </div>
    <div class="playlist-controls">
      <button id="play-all-btn" class="pill-btn pill-btn--accent">Play all</button>
      <button id="shuffle-play-btn" class="pill-btn">Shuffle play</button>
      ${
        playlist.is_owner
          ? `<button id="edit-playlist-btn" class="pill-btn">Edit playlist</button>
             <button id="delete-playlist-btn" class="pill-btn pill-btn--danger">Delete playlist</button>`
          : ''
      }
    </div>
    <div id="edit-panel-slot"></div>
    <div class="browse-header">
      <h2>Tracks</h2>
      <div id="view-toggle" class="view-toggle"></div>
    </div>
    <div id="genre-filter" class="genre-filter-control"></div>
    <p id="reorder-hint" class="reorder-hint hidden">Switch to list view to drag and reorder tracks. (Reordering is only available when no genre filter is active.)</p>
    <div id="track-list" class="track-grid"></div>
  `;

  fillHeader(app, playlist);

  const grid = document.getElementById('track-list');
  const reorderHint = document.getElementById('reorder-hint');
  let viewMode = getViewMode();
  const selectedGenres = new Set();

  function applyViewMode(mode) {
    viewMode = mode;
    grid.classList.toggle('track-list', mode === 'list');
    renderTracks();
  }
  renderViewToggle(document.getElementById('view-toggle'), applyViewMode);
  grid.classList.toggle('track-list', viewMode === 'list');

  function renderTracks() {
    const filtered = selectedGenres.size
      ? playlist.tracks.filter((t) => Array.from(selectedGenres).every((g) => t.genres.includes(g)))
      : playlist.tracks;

    if (!filtered.length) {
      grid.innerHTML = playlist.tracks.length
        ? '<p class="empty-state">No tracks match that.</p>'
        : '<p class="empty-state">No tracks in this playlist yet — add some from the browse page.</p>';
      reorderHint.classList.add('hidden');
      return;
    }

    grid.innerHTML = '';
    const canReorder = playlist.is_owner && viewMode === 'list' && !selectedGenres.size;

    filtered.forEach((track, i) => {
      const card = createTrackCard(track, filtered, i);
      if (playlist.is_owner) {
        if (canReorder) {
          const handle = document.createElement('button');
          handle.type = 'button';
          handle.className = 'track-drag-handle';
          handle.setAttribute('aria-label', 'Drag to reorder');
          handle.innerHTML =
            '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
          card.insertBefore(handle, card.firstChild);
        }
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'playlist-remove-btn';
        removeBtn.textContent = 'Remove from playlist';
        removeBtn.addEventListener('click', async () => {
          try {
            await api.removeTrackFromPlaylist(playlist.id, track.id);
            playlist.tracks = playlist.tracks.filter((t) => t.id !== track.id);
            renderTracks();
          } catch (err) {
            alert(err.message);
          }
        });
        card.querySelector('.track-info').appendChild(removeBtn);
      }
      grid.appendChild(card);
    });

    if (canReorder) enableDragReorder(grid, playlist.id);

    if (playlist.is_owner && !canReorder) {
      reorderHint.textContent =
        viewMode !== 'list'
          ? 'Switch to list view to drag and reorder tracks.'
          : 'Clear the genre filter to drag and reorder tracks.';
      reorderHint.classList.remove('hidden');
    } else {
      reorderHint.classList.add('hidden');
    }
  }

  renderGenreFilterControl(document.getElementById('genre-filter'), selectedGenres, renderTracks);
  renderTracks();

  document.getElementById('play-all-btn').addEventListener('click', () => {
    const source = selectedGenres.size ? playlist.tracks.filter((t) => Array.from(selectedGenres).every((g) => t.genres.includes(g))) : playlist.tracks;
    const playable = source.filter((t) => t.source_type === 'upload' || !t.source_type);
    if (!playable.length) return;
    playQueue(playable, 0);
    // A playlist is meant to keep going once you press play on it — loop
    // back to the start when it ends, rather than just stopping. The
    // repeat button in the player bar can still turn this off manually.
    setRepeatMode('all');
  });
  document.getElementById('shuffle-play-btn').addEventListener('click', () => {
    const source = selectedGenres.size ? playlist.tracks.filter((t) => Array.from(selectedGenres).every((g) => t.genres.includes(g))) : playlist.tracks;
    const playable = source.filter((t) => t.source_type === 'upload' || !t.source_type);
    if (!playable.length) return;
    playQueue(playable, 0);
    setRepeatMode('all');
    toggleShuffle();
  });

  if (playlist.is_owner) {
    document.getElementById('edit-playlist-btn').addEventListener('click', () => {
      renderEditPanel(app, playlist);
    });
    document.getElementById('delete-playlist-btn').addEventListener('click', async () => {
      if (!confirm(`Delete "${playlist.name}"? This can't be undone.`)) return;
      try {
        await api.deletePlaylist(playlist.id);
        navigate('/playlists');
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

function fillHeader(app, playlist) {
  app.querySelector('.playlist-header h1').textContent = playlist.name;
  const ownerLink = app.querySelector('.playlist-owner-link');
  ownerLink.textContent = playlist.owner_username;
  ownerLink.href = `#/profile/${playlist.owner_username}`;
  app.querySelector('.playlist-track-count').textContent = `${playlist.tracks.length} track${playlist.tracks.length === 1 ? '' : 's'}`;
  app.querySelector('.playlist-visibility').textContent = playlist.is_public ? 'Public' : 'Private';

  const descEl = app.querySelector('.playlist-description');
  if (playlist.description) {
    descEl.textContent = playlist.description;
    descEl.classList.remove('hidden');
  } else {
    descEl.classList.add('hidden');
  }
}

function renderEditPanel(app, playlist) {
  const slot = document.getElementById('edit-panel-slot');
  slot.innerHTML = `
    <form id="edit-playlist-form" class="edit-panel">
      <label>Name
        <input name="name" type="text" maxlength="60" required>
      </label>
      <label>Description
        <textarea name="description" rows="2" maxlength="500"></textarea>
      </label>
      <label>Cover image
        <input name="cover" type="file" accept="image/*">
      </label>
      <label class="inline-checkbox">
        <input type="checkbox" name="is_public">
        Public — visible on your profile and in search
      </label>
      <p id="edit-playlist-error" class="form-error hidden"></p>
      <div class="edit-panel-actions">
        <button type="submit">Save changes</button>
        <button type="button" id="cancel-edit-btn" class="pill-btn">Cancel</button>
      </div>
    </form>
  `;
  slot.querySelector('[name="name"]').value = playlist.name;
  slot.querySelector('[name="description"]').value = playlist.description || '';
  slot.querySelector('[name="is_public"]').checked = !!playlist.is_public;

  document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    slot.innerHTML = '';
  });

  document.getElementById('edit-playlist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const errorEl = document.getElementById('edit-playlist-error');
    errorEl.classList.add('hidden');

    const name = form.name.value.trim();
    const description = form.description.value;
    const isPublic = form.is_public.checked;
    const coverFile = form.cover.files[0];

    try {
      const updated = await api.updatePlaylist(playlist.id, { name, description, is_public: isPublic });
      Object.assign(playlist, updated);

      if (coverFile) {
        const coverForm = new FormData();
        coverForm.set('cover', coverFile);
        const coverResult = await api.updatePlaylistCover(playlist.id, coverForm);
        playlist.cover_path = coverResult.cover_path;
      }

      slot.innerHTML = '';
      renderShell(app, playlist);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
