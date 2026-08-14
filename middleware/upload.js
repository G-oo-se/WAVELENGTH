const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const audioDir = path.join(uploadsRoot, 'audio');
const coverDir = path.join(uploadsRoot, 'covers');
const avatarDir = path.join(uploadsRoot, 'avatars');
[audioDir, coverDir, avatarDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function makeFilename(req, file, cb) {
  const ext = path.extname(file.originalname);
  cb(null, `${crypto.randomUUID()}${ext}`);
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

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: makeFilename
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Profile pictures must be an image file.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { trackUpload, avatarUpload };
