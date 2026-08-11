import { registerRoute, navigate, refresh, startRouter } from './router.js';
import { renderBrowse } from './views/browse.js';
import { renderLogin } from './views/login.js';
import { renderRegister } from './views/register.js';
import { renderUpload } from './views/upload.js';
import { renderProfile } from './views/profile.js';
import { api } from './api.js';
import { searchState } from './state.js';
import { escapeHtml } from './utils.js';
import './player.js';

registerRoute('/', renderBrowse);
registerRoute('/login', renderLogin);
registerRoute('/register', renderRegister);
registerRoute('/upload', renderUpload);
registerRoute('/profile/:username', renderProfile);

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  searchState.query = searchInput.value.trim();
  if ((window.location.hash.slice(1) || '/') === '/') {
    refresh();
  } else {
    navigate('/');
  }
});

async function refreshAuthNav() {
  const nav = document.getElementById('nav-auth');
  const user = await api.me().catch(() => null);

  if (user) {
    const safeName = escapeHtml(user.username);
    nav.innerHTML = `
      <a href="#/upload">Upload</a>
      <a href="#/profile/${safeName}">${safeName}</a>
      <button id="logout-btn" class="link-btn">Log out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api.logout();
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/');
    });
  } else {
    nav.innerHTML = `
      <a href="#/login">Log in</a>
      <a href="#/register">Sign up</a>
    `;
  }
}

window.addEventListener('auth-changed', refreshAuthNav);

refreshAuthNav();
startRouter();
