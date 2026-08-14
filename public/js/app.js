import { registerRoute, navigate, refresh, startRouter } from './router.js';
import { renderBrowse } from './views/browse.js';
import { renderLogin } from './views/login.js';
import { renderRegister } from './views/register.js';
import { renderUpload } from './views/upload.js';
import { renderProfile } from './views/profile.js';
import { renderPlaylists } from './views/playlists.js';
import { renderPlaylist } from './views/playlist.js';
import { renderFriends } from './views/friends.js';
import { renderEditProfile } from './views/editProfile.js';
import { renderLiked } from './views/liked.js';
import { api } from './api.js';
import { searchState, authState } from './state.js';
import { escapeHtml } from './utils.js';
import { initThemePicker } from './theme.js';
import './player.js';

registerRoute('/', renderBrowse);
registerRoute('/login', renderLogin);
registerRoute('/register', renderRegister);
registerRoute('/upload', renderUpload);
registerRoute('/profile/:username', renderProfile);
registerRoute('/playlists', renderPlaylists);
registerRoute('/playlists/:id', renderPlaylist);
registerRoute('/friends', renderFriends);
registerRoute('/edit-profile', renderEditProfile);
registerRoute('/liked', renderLiked);

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
  authState.user = user;

  if (user) {
    const safeName = escapeHtml(user.username);
    const badge = user.is_admin ? ' <span class="admin-badge">admin</span>' : '';
    const avatar = user.avatar_path
      ? `<span class="nav-avatar" style="background-image:url(${escapeHtml(user.avatar_path)})"></span>`
      : `<span class="nav-avatar">${safeName.charAt(0).toUpperCase()}</span>`;

    nav.innerHTML = `
      <a href="#/liked">Liked</a>
      <a href="#/playlists">Playlists</a>
      <a href="#/friends">Friends</a>
      <a href="#/upload">Upload</a>
      <span class="nav-user">
        <a href="#/profile/${safeName}" class="nav-user-link">${avatar}${safeName}</a>${badge}
      </span>
      <button id="logout-btn" class="link-btn">Log out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api.logout();
      authState.user = null;
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

initThemePicker(document.getElementById('theme-picker'));
refreshAuthNav();
startRouter();
