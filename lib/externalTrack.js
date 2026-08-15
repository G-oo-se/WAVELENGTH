// Turns a pasted YouTube/SoundCloud URL into embed info. This never
// downloads or stores audio from either platform — it only builds a URL for
// their own embedded player, so playback always streams from YouTube's or
// SoundCloud's servers, the same as embedding a video on any other site.

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com|music\.youtube\.com)\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isSoundCloudUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (host === 'on.soundcloud.com') return segments.length >= 1; // short links: /AbCdE
    if (host === 'soundcloud.com') return segments.length >= 2; // /artist/track
    return false;
  } catch {
    return false;
  }
}

// Returns { sourceType, externalUrl, embedUrl, thumbnailUrl } or null if the
// URL isn't a recognizable YouTube/SoundCloud link. Synchronous and offline
// — no network call needed for the core feature to work.
function resolveExternalTrack(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) {
    return {
      sourceType: 'youtube',
      externalUrl: trimmed,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      // YouTube's thumbnail CDN follows a stable, publicly documented
      // pattern keyed only by video ID — no API call needed.
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    };
  }

  if (isSoundCloudUrl(trimmed)) {
    const params = new URLSearchParams({
      url: trimmed,
      color: '#e8a33d',
      auto_play: 'false',
      show_comments: 'false'
    });
    return {
      sourceType: 'soundcloud',
      externalUrl: trimmed,
      embedUrl: `https://w.soundcloud.com/player/?${params.toString()}`,
      // SoundCloud has no predictable thumbnail URL pattern (unlike
      // YouTube) — getting one requires an oEmbed call, done separately
      // and best-effort so a failure there never blocks saving the track.
      thumbnailUrl: null
    };
  }

  return null;
}

// Best-effort only: used to try to fill in a SoundCloud thumbnail. Never
// throws — returns null on any failure so callers can proceed regardless.
async function tryFetchSoundCloudThumbnail(externalUrl) {
  try {
    const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(externalUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

module.exports = { resolveExternalTrack, tryFetchSoundCloudThumbnail };
