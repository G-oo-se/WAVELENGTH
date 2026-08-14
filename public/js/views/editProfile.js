import { api } from '../api.js';
import { navigate } from '../router.js';

export async function renderEditProfile(app) {
  const user = await api.me().catch(() => null);
  if (!user) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to edit your profile.</p>';
    return;
  }

  app.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Edit profile</h1>
      <form id="edit-profile-form" class="auth-form" novalidate>
        <label>Profile picture
          <input name="avatar" type="file" accept="image/*">
        </label>
        <label>Bio
          <textarea name="bio" rows="4" maxlength="300"></textarea>
        </label>
        <p id="edit-error" class="form-error hidden"></p>
        <button type="submit" id="edit-submit">Save changes</button>
      </form>
    </div>
  `;

  document.querySelector('[name="bio"]').value = user.bio || '';

  const form = document.getElementById('edit-profile-form');
  const errorEl = document.getElementById('edit-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    const submitBtn = document.getElementById('edit-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      await api.updateProfile(new FormData(form));
      navigate(`/profile/${user.username}`);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save changes';
    }
  });
}
