const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const trackRoutes = require('./routes/tracks');
const userRoutes = require('./routes/users');
const playlistRoutes = require('./routes/playlists');
const genreRoutes = require('./routes/genres');
const { uploadsDir } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    // Change this secret before deploying anywhere real — see README.
    secret: process.env.SESSION_SECRET || 'wavelength-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
  })
);

// express.static serves Range requests automatically, which is what lets
// the browser's <audio> element seek around inside a track.
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/users', userRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/genres', genreRoutes);

// Anything that isn't an API call or an uploaded file falls through to the
// SPA shell, so client-side routes like #/profile/alex survive a refresh.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Wavelength running at http://localhost:${PORT}`);
});
