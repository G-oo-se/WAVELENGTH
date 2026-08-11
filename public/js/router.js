const routes = [];

// Registers a handler for a route pattern like '/' or '/profile/:username'.
export function registerRoute(pattern, handler) {
  routes.push({ pattern, handler });
}

function matchRoute(hash) {
  for (const { pattern, handler } of routes) {
    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);
    const match = hash.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { handler, params };
    }
  }
  return null;
}

export function navigate(hash) {
  window.location.hash = hash;
}

// Re-runs whichever route is currently active. Useful when something like a
// search changes what a view should show without the hash itself changing.
export function refresh() {
  const hash = window.location.hash.slice(1) || '/';
  const app = document.getElementById('app');
  const match = matchRoute(hash);
  if (match) {
    match.handler(app, match.params);
  } else {
    app.innerHTML = '<p class="empty-state">Page not found.</p>';
  }
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener('hashchange', refresh);
  refresh();
}
