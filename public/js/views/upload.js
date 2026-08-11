import { api } from '../api.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';

export async function renderUpload(app) {
  const user = await api.me().catch(() => null);
  if (!user) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to upload a track.</p>';
    return;
  }

  app.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Upload a track</h1>
      <form id="upload-form" class="auth-form" novalidate>
        <label>Title
          <input name="title" type="text" required maxlength="120">
        </label>
        <label>Artist
          <input name="artist" type="text" required maxlength="120" value="${escapeHtml(user.username)}">
        </label>
        <label>Genre
          <input name="genre" type="text" maxlength="40" placeholder="e.g. lo-fi, indie rock, ambient">
        </label>
        <label>Description
          <textarea name="description" rows="3" maxlength="500"></textarea>
        </label>
        <label>Audio file
          <input name="audio" type="file" accept="audio/*" required>
        </label>
        <label>Cover image (optional)
          <input name="cover" type="file" accept="image/*">
        </label>
        <p id="upload-error" class="form-error hidden"></p>
        <button type="submit" id="upload-submit">Upload</button>
      </form>
    </div>
  `;

  const form = document.getElementById('upload-form');
  const errorEl = document.getElementById('upload-error');
  const audioInput = form.querySelector('[name="audio"]');
  let duration = 0;

  // Reading duration happens in the browser so the server doesn't need an
  // audio-parsing library just to find out how long a file runs.
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
    const submitBtn = document.getElementById('upload-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading…';

    const formData = new FormData(form);
    formData.set('duration', duration || 0);

    try {
      await api.uploadTrack(formData);
      navigate(`/profile/${user.username}`);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload';
    }
  });
}
