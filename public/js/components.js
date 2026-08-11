import { playTrack } from './player.js';
import { escapeHtml } from './utils.js';

export function createTrackCard(track) {
  const card = document.createElement('article');
  card.className = 'track-card';
  const initial = escapeHtml(track.title.charAt(0).toUpperCase());
  const title = escapeHtml(track.title);
  const artist = escapeHtml(track.artist);
  const genre = escapeHtml(track.genre);

  card.innerHTML = `
    <div class="track-cover" style="${track.cover_path ? `background-image:url(${escapeHtml(track.cover_path)})` : ''}">
      ${track.cover_path ? '' : initial}
      <button class="track-play-btn" aria-label="Play ${title}">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
    </div>
    <div class="track-info">
      <div class="track-title">${title}</div>
      ${
        track.artist_username
          ? `<a class="track-artist" href="#/profile/${escapeHtml(track.artist_username)}">${artist}</a>`
          : `<div class="track-artist track-artist--static">${artist}</div>`
      }
      <div class="track-meta">
        ${track.genre ? `<span class="track-genre">${genre}</span>` : ''}
        <span class="track-plays">${track.play_count} plays</span>
      </div>
    </div>
  `;

  card.querySelector('.track-play-btn').addEventListener('click', () => playTrack(track));
  return card;
}
