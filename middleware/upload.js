const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { uploadsDir } = require('../config');

const audioDir = path.join(uploadsDir, 'audio');
const coverDir = path.join(uploadsDir, 'covers');
const avatarDir = path.join(uploadsDir, 'avatars');
const playlistCoverDir = path.join(uploadsDir, 'playlist-covers');
[audioDir, coverDir, avatarDir, playlistCoverDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function makeFilename(req, file, cb) {
  const ext = path.extname(file.originalname);
  cb(null, `${crypto.randomUUID()}${ext}`);
}

function imageOnlyFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('That file must be an image.'));
}

const trackStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') cb(null, audioDir);
    else if (file.fieldname === 'cover') cb(null, coverDir);
    else cb(new Error('Unexpected field.'), '');
  },
  filename: makeFilename
});

function trackFileFilter(req, file, cb) {
  if (file.fieldname === 'audio') {
    const okTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/flac', 'audio/x-flac'];
    if (okTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Please upload a valid audio file (mp3, wav, ogg, flac, or m4a).'));
  } else if (file.fieldname === 'cover') {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Cover art must be an image file.'));
  } else {
    cb(new Error('Unexpected field.'));
  }
}

const trackUpload = multer({
  storage: trackStorage,
  fileFilter: trackFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const avatarUpload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, avatarDir), filename: makeFilename }),
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const playlistCoverUpload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, playlistCoverDir), filename: makeFilename }),
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { trackUpload, avatarUpload, playlistCoverUpload };
