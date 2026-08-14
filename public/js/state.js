// Small shared piece of state so the persistent search box in the header
// and the browse view (which mounts/unmounts as you navigate) stay in sync.
export const searchState = { query: '' };

// The logged-in user (or null), refreshed on load/login/logout. Read by
// components.js to decide what to show (delete buttons, like state, etc.)
// without every view having to fetch /api/auth/me itself.
export const authState = { user: null };
