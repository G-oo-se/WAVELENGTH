// The fixed genre vocabulary for the whole site. Single source of truth —
// the upload form's dropdown and the genre filter bar on every page both
// load this list from GET /api/genres rather than each keeping their own
// copy, so there's exactly one place to edit if this list ever changes.
const GENRES = [
  'BG',
  'Relax',
  'Cool moment',
  'Tension',
  'Funk',
  'Jazz',
  'Electro',
  'Classical',
  'Raprock',
  'Sad',
  'Upbeat',
  'Aggressive',
  'ROFL',
  'Meme',
  'Speechless',
  'Few words',
  'Lots of words',
  'Slow tempo',
  'Medium tempo',
  'Energetic tempo',
  'Other'
];

// The genres subquery below aggregates a track's genres into one
// delimited string per row (cheaper than an extra query per track). This
// turns that back into a clean array and drops the raw field. Shared here
// so tracks.js, users.js, and playlists.js all do it identically.
function attachGenres(row) {
  const { genres_concat, ...rest } = row;
  return { ...rest, genres: genres_concat ? genres_concat.split('||') : [] };
}

// Drop-in addition to any tracks.* SELECT — aliases as genres_concat.
const GENRES_SUBQUERY = `(
  SELECT GROUP_CONCAT(genre, '||') FROM track_genres WHERE track_genres.track_id = tracks.id
) AS genres_concat`;

module.exports = { GENRES, attachGenres, GENRES_SUBQUERY };
