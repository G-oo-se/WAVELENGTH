// Promotes an existing account to admin.
// Usage: node scripts/make-admin.js <username>
const db = require('../db/database');

const username = process.argv[2];
if (!username) {
  console.error('Usage: node scripts/make-admin.js <username>');
  process.exit(1);
}

const user = db.prepare('SELECT id, username, is_admin FROM users WHERE username = ?').get(username);
if (!user) {
  console.error(`No user found with username "${username}". Register the account first, then run this.`);
  process.exit(1);
}

if (user.is_admin) {
  console.log(`${username} is already an admin.`);
  process.exit(0);
}

db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
console.log(`Done — ${username} is now an admin.`);
