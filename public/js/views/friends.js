import { api } from '../api.js';
import { escapeHtml } from '../utils.js';

export async function renderFriends(app) {
  const me = await api.me().catch(() => null);
  if (!me) {
    app.innerHTML = '<p class="empty-state">You need to <a href="#/login">log in</a> to see your friends.</p>';
    return;
  }

  app.innerHTML = `
    <div class="browse-header"><h1>Friends</h1></div>
    <div id="friends-content"><p class="loading">Loading…</p></div>
  `;

  const content = document.getElementById('friends-content');

  function personRow(person, actions) {
    const row = document.createElement('div');
    row.className = 'person-row';
    row.innerHTML = `
      <a class="person-link" href="#/profile/${escapeHtml(person.username)}">
        <div class="person-avatar" style="${person.avatar_path ? `background-image:url(${escapeHtml(person.avatar_path)})` : ''}">
          ${person.avatar_path ? '' : escapeHtml(person.username.charAt(0).toUpperCase())}
        </div>
        <span></span>
      </a>
      <div class="person-actions"></div>
    `;
    row.querySelector('.person-link span').textContent = person.username;
    const actionsEl = row.querySelector('.person-actions');
    actions.forEach(({ label, handler, danger }) => {
      const btn = document.createElement('button');
      btn.className = `pill-btn pill-btn--small${danger ? ' pill-btn--danger' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', handler);
      actionsEl.appendChild(btn);
    });
    return row;
  }

  async function load() {
    try {
      const { friends, incoming, outgoing } = await api.getFriends();
      content.innerHTML = '';

      if (incoming.length) {
        const section = document.createElement('section');
        section.innerHTML = '<h2>Friend requests</h2>';
        incoming.forEach((person) => {
          section.appendChild(
            personRow(person, [
              {
                label: 'Accept',
                handler: async () => {
                  await api.acceptFriendRequest(person.username);
                  load();
                }
              },
              {
                label: 'Decline',
                danger: true,
                handler: async () => {
                  await api.removeFriend(person.username);
                  load();
                }
              }
            ])
          );
        });
        content.appendChild(section);
      }

      if (outgoing.length) {
        const section = document.createElement('section');
        section.innerHTML = '<h2>Pending requests you sent</h2>';
        outgoing.forEach((person) => {
          section.appendChild(
            personRow(person, [
              {
                label: 'Cancel',
                danger: true,
                handler: async () => {
                  await api.removeFriend(person.username);
                  load();
                }
              }
            ])
          );
        });
        content.appendChild(section);
      }

      const friendsSection = document.createElement('section');
      friendsSection.innerHTML = '<h2>Your friends</h2>';
      if (!friends.length) {
        friendsSection.innerHTML += '<p class="empty-state">No friends yet — visit someone\'s profile to send a request.</p>';
      } else {
        friends.forEach((person) => {
          friendsSection.appendChild(
            personRow(person, [
              {
                label: 'Remove',
                danger: true,
                handler: async () => {
                  if (!confirm(`Remove ${person.username} as a friend?`)) return;
                  await api.removeFriend(person.username);
                  load();
                }
              }
            ])
          );
        });
      }
      content.appendChild(friendsSection);
    } catch (err) {
      content.innerHTML = `<p class="error-state"></p>`;
      content.querySelector('.error-state').textContent = err.message;
    }
  }

  load();
}
