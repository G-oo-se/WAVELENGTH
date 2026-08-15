const path = require('path');

// Storage paths are configurable via env vars so it doesn't matter where a
// given host (Dockerfile, buildpack, etc.) puts the app's own code — you
// point DATA_DIR/UPLOADS_DIR at wherever your persistent volume is mounted,
// and the app doesn't need to know or care where it's running from.
module.exports = {
  dataDir: process.env.DATA_DIR || path.join(__dirname, 'data'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')
};
