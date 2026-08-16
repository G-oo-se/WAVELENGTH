import { api } from '../api.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { renderGenrePills } from '../genrePicker.js';

export async function renderUpload(app) {
  const user = await api.me().catch(() => null);
  if (!user) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to upload a track.</p>';
    return;
  }

  app.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Add a track</h1>
      <div class="source-toggle">
        <button type="button" class="source-toggle-btn is-active" data-mode="upload">Upload a file</button>
        <button type="button" class="source-toggle-btn" data-mode="link">Link from YouTube / SoundCloud</button>
      </div>
      <form id="upload-form" class="auth-form" novalidate>
        <label>Title
          <input name="title" type="text" required maxlength="120">
        </label>
        <label>Artist
          <input name="artist" type="text" required maxlength="120" value="${escapeHtml(user.username)}">
        </label>
        <label>Genres <span class="field-hint">(pick any that fit)</span>
          <div id="genre-picker" class="genre-picker"></div>
        </label>
        <label>Description
          <textarea name="description" rows="3" maxlength="500"></textarea>
        </label>
        <label id="audio-field-wrap">Audio file
          <input name="audio" type="file" accept="audio/*" required>
        </label>
        <label id="link-field-wrap" class="hidden">Track link
          <input name="external_url" type="url" placeholder="https://youtube.com/watch?v=... or https://soundcloud.com/...">
        </label>
        <label id="cover-field-wrap">Cover image (optional — auto-filled from the link when possible)
          <input name="cover" type="file" accept="image/*">
        </label>
        <p id="upload-error" class="form-error hidden"></p>
        <button type="submit" id="upload-submit">Add track</button>
      </form>
    </div>
  `;

  const form = document.getElementById('upload-form');
  const errorEl = document.getElementById('upload-error');
  const audioInput = form.querySelector('[name="audio"]');
  const linkInput = form.querySelector('[name="external_url"]');
  const audioWrap = document.getElementById('audio-field-wrap');
  const linkWrap = document.getElementById('link-field-wrap');
  const submitBtn = document.getElementById('upload-submit');
  let mode = 'upload';
  let duration = 0;
  const selectedGenres = new Set();

  renderGenrePills(document.getElementById('genre-picker'), selectedGenres, () => {});

  document.querySelectorAll('.source-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      document.querySelectorAll('.source-toggle-btn').forEach((b) => b.classList.toggle('is-active', b === btn));

      const isLink = mode === 'link';
      audioWrap.classList.toggle('hidden', isLink);
      linkWrap.classList.toggle('hidden', !isLink);
      audioInput.required = !isLink;
      linkInput.required = isLink;
      if (isLink) audioInput.value = '';
      else linkInput.value = '';
    });
  });

  // Reading duration happens in the browser so the server doesn't need an
  // audio-parsing library just to find out how long a file runs. Only
  // applies to real uploads — there's no reliable way to get this for a
  // linked track without extra paid APIs, so linked tracks just omit it.
  audioInput.addEventListener('change', () => {
    const file = audioInput.files[0];
    if (!file) return;
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.addEventListener('loadedmetadata', () => {
      duration = tempAudio.duration;
      URL.revokeObjectURL(tempAudio.src);
    });
    tempAudio.src = URL.createObjectURL(file);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    const formData = new FormData(form);
    selectedGenres.forEach((g) => formData.append('genre', g));
    if (mode === 'upload') {
      formData.set('duration', duration || 0);
      formData.delete('external_url');
    } else {
      formData.delete('audio');
      formData.delete('duration');
    }

    try {
      await api.uploadTrack(formData);
      navigate(`/profile/${user.username}`);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add track';
    }
  });
}
