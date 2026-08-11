import { api } from '../api.js';
import { navigate } from '../router.js';

export function renderRegister(app) {
  app.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Create an account</h1>
      <form id="register-form" class="auth-form" novalidate>
        <label>Username
          <input name="username" type="text" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_-]+" autocomplete="username">
        </label>
        <label>Email
          <input name="email" type="email" required autocomplete="email">
        </label>
        <label>Password
          <input name="password" type="password" required minlength="8" autocomplete="new-password">
        </label>
        <p id="register-error" class="form-error hidden"></p>
        <button type="submit">Sign up</button>
      </form>
      <p class="auth-switch">Already have an account? <a href="#/login">Log in</a></p>
    </div>
  `;

  const form = document.getElementById('register-form');
  const errorEl = document.getElementById('register-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    const formData = new FormData(form);

    try {
      await api.register({
        username: formData.get('username'),
        email: formData.get('email'),
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
