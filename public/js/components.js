import { playQueue } from './player.js';
import { openEmbedModal } from './embedModal.js';
import { escapeHtml } from './utils.js';
import { authState } from './state.js';
import { api } from './api.js';
import { openPlaylistPicker } from './playlistPicker.js';

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function sanitizeForFilename(str) {
  return str.replace(/[/\\:*?"<>|]/g, '').trim() || 'track';
}

const SOURCE_LABELS = { youtube: 'YouTube', soundcloud: 'SoundCloud' };

// contextTracks + index let next/prev in the player move through whatever
// list this card is part of (search results, a profile, a playlist).
// Linked (YouTube/SoundCloud) tracks never join that queue — they always
// open in their own embedded player instead.
export function createTrackCard(track, contextTracks, index) {
  const card = document.createElement('article');
  card.className = 'track-card';

  const isLinked = track.source_type === 'youtube' || track.source_type === 'soundcloud';
  const initial = escapeHtml(track.title.charAt(0).toUpperCase());
  const title = escapeHtml(track.title);
  const artist = escapeHtml(track.artist);
  const genre = escapeHtml(track.genre);
  const user = authState.user;
  const canDelete = !!user && (user.is_admin || user.id === track.user_id);

  // The delete button exists twice — once overlaid on the cover (grid
  // view, where there's room) and once inline with the other action
  // buttons (list view, where the cover is too small to host it without
  // overlapping the play button). CSS shows exactly one at a time.
  const deleteBtnCover = canDelete
    ? `<button class="track-delete-btn" aria-label="Delete ${title}" title="Delete track">
         <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
       </button>`
    : '';
  const deleteBtnInline = canDelete
    ? `<button class="track-delete-btn-inline" aria-label="Delete ${title}" title="Delete track">
         <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
       </button>`
    : '';

  const ext = !isLinked && track.audio_path ? track.audio_path.split('.').pop() : '';
  const downloadFilename = `${sanitizeForFilename(track.artist)} - ${sanitizeForFilename(track.title)}.${ext}`;
  const downloadBtn =
    !isLinked && track.audio_path
      ? `<a class="track-download-btn" href="${escapeHtml(track.audio_path)}" download="${escapeHtml(downloadFilename)}" aria-label="Download ${title}" title="Download">
           <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
         </a>`
      : '';

  card.innerHTML = `
    <div class="track-cover" style="${track.cover_path ? `background-image:url(${escapeHtml(track.cover_path)})` : ''}">
      ${track.cover_path ? '' : initial}
      <button class="track-play-btn" aria-label="Play ${title}">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      ${
        isLinked
          ? `<span class="track-source-badge track-source-badge--${track.source_type}">${SOURCE_LABELS[track.source_type]}</span>`
          : ''
      }
      ${deleteBtnCover}
    </div>
    <div class="track-info">
      <div class="track-title-row">
        <div class="track-title">${title}</div>
        <span class="track-duration">${formatDuration(track.duration)}</span>
      </div>
      ${
        track.artist_username
          ? `<a class="track-artist" href="#/profile/${escapeHtml(track.artist_username)}">
               ${track.artist_avatar ? `<img class="track-artist-avatar" src="${escapeHtml(track.artist_avatar)}" alt="">` : ''}
               <span>${artist}</span>
             </a>`
          : `<div class="track-artist track-artist--static"><span>${artist}</span></div>`
      }
      <div class="track-meta">
        <span class="track-genre ${track.genre ? '' : 'track-genre--empty'}">${genre || 'No genre set'}</span>
        <span class="track-plays">${track.play_count} plays</span>
      </div>
      <div class="track-actions">
        <button class="track-like-btn ${track.liked_by_me ? 'is-liked' : ''}" aria-label="Like ${title}">
          <svg viewBox="0 0 24 24"><path d="M12 21s-6.7-4.35-9.33-8.02C1.05 10.83 1.5 7.6 4.1 6.02 6.2 4.75 8.9 5.4 10 7.1c.4.6.7 1.2.9 1.7.2-.5.5-1.1.9-1.7 1.1-1.7 3.8-2.35 5.9-1.08 2.6 1.58 3.05 4.81 1.43 6.96C18.7 16.65 12 21 12 21z"/></svg>
          <span class="track-like-count">${track.like_count || 0}</span>
        </button>
        <button class="track-add-btn" aria-label="Add ${title} to playlist" title="Add to playlist">
          <svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
        </button>
        ${downloadBtn}
        ${deleteBtnInline}
      </div>
    </div>
  `;

  card.querySelector('.track-play-btn').addEventListener('click', () => {
    if (isLinked) {
      openEmbedModal(track);
    } else if (contextTracks) {
      playQueue(contextTracks, index);
    } else {
      playQueue([track], 0);
    }
  });

  const likeBtn = card.querySelector('.track-like-btn');
  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!authState.user) {
      alert('Log in to like tracks.');
      return;
    }
    try {
      const isLiked = likeBtn.classList.contains('is-liked');
      const result = isLiked ? await api.unlikeTrack(track.id) : await api.likeTrack(track.id);
      likeBtn.classList.toggle('is-liked', result.liked_by_me);
      likeBtn.querySelector('.track-like-count').textContent = result.like_count;
      track.liked_by_me = result.liked_by_me;
      track.like_count = result.like_count;
    } catch (err) {
      alert(err.message);
    }
  });

  card.querySelector('.track-add-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!authState.user) {
      alert('Log in to add tracks to a playlist.');
      return;
    }
    openPlaylistPicker(track.id);
  });

  const downloadEl = card.querySelector('.track-download-btn');
  if (downloadEl) {
    downloadEl.addEventListener('click', (e) => e.stopPropagation());
  }

  if (canDelete) {
    const handleDelete = async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${track.title}"? This can't be undone.`)) return;
      try {
        await api.deleteTrack(track.id);
        const grid = card.parentElement;
        card.remove();
        if (grid && !grid.children.length) {
          grid.innerHTML = '<p class="empty-state">Nothing here yet.</p>';
        }
      } catch (err) {
        alert(err.message);
      }
    };
    card.querySelector('.track-delete-btn').addEventListener('click', handleDelete);
    card.querySelector('.track-delete-btn-inline').addEventListener('click', handleDelete);
  }

  return card;
}
