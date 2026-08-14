const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are all required.' });
  }
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
    return res
      .status(400)
      .json({ error: 'Username must be 3-24 characters: letters, numbers, underscores, or hyphens only.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'That username or email is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
    .run(username, email, passwordHash);

  req.session.userId = info.lastInsertRowid;
  res.status(201).json({ id: info.lastInsertRowid, username });
});

router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Enter your username or email, and your password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username/email or password.' });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  const user = db
    .prepare('SELECT id, username, email, bio, is_admin, created_at FROM users WHERE id = ?')
    .get(req.session.userId);
  res.json(user || null);
});

module.exports = router;
