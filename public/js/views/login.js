import { api } from '../api.js';
import { navigate } from '../router.js';

export function renderLogin(app) {
  app.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Log in</h1>
      <form id="login-form" class="auth-form" novalidate>
        <label>Username or email
          <input name="identifier" type="text" required autocomplete="username">
        </label>
        <label>Password
          <input name="password" type="password" required autocomplete="current-password">
        </label>
        <p id="login-error" class="form-error hidden"></p>
        <button type="submit">Log in</button>
      </form>
      <p class="auth-switch">New here? <a href="#/register">Create an account</a></p>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    const formData = new FormData(form);

    try {
      await api.login({
        identifier: formData.get('identifier'),
        password: formData.get('password')
      });
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
