import { api } from './api.js';

const audioEl = document.getElementById('audio-el');
const playerBar = document.getElementById('player-bar');
const coverEl = document.getElementById('player-cover');
const titleEl = document.getElementById('player-title');
const artistEl = document.getElementById('player-artist');
const playPauseBtn = document.getElementById('player-playpause');
const prevBtn = document.getElementById('player-prev');
const nextBtn = document.getElementById('player-next');
const shuffleBtn = document.getElementById('player-shuffle');
const repeatBtn = document.getElementById('player-repeat');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const seekEl = document.getElementById('player-seek');
const currentTimeEl = document.getElementById('player-time-current');
const totalTimeEl = document.getElementById('player-time-total');
const volumeEl = document.getElementById('player-volume');
const canvas = document.getElementById('player-canvas');
const canvasCtx = canvas.getContext('2d');

let audioCtx = null;
let analyser = null;
let sourceNode = null;
let rafId = null;
let isSeeking = false;

// The queue is whatever list of tracks the person was browsing when they
// hit play (search results, a profile, a playlist) — so next/prev move
// through that same list rather than needing a separate "queue" concept.
let queue = [];
let queueIndex = -1;
let shuffleOrder = [];
let shuffleOn = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'

function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function drawVisualizer() {
  rafId = requestAnimationFrame(drawVisualizer);
  if (!analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const { width, height } = canvas;
  canvasCtx.clearRect(0, 0, width, height);

  const barCount = 40;
  const barWidth = width / barCount;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e8a33d';
  canvasCtx.fillStyle = accent;

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * bufferLength);
    const value = dataArray[dataIndex] / 255;
    const barHeight = Math.max(2, value * height);
    canvasCtx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
  }
}

function shuffledIndices(length, keepFirst) {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // Keep whatever is currently playing at the front, so turning shuffle on
  // mid-track doesn't immediately yank you to a different song.
  if (keepFirst != null) {
    const pos = indices.indexOf(keepFirst);
    if (pos > 0) {
      indices.splice(pos, 1);
      indices.unshift(keepFirst);
    }
  }
  return indices;
}

function playbackOrder() {
  return shuffleOn ? shuffleOrder : queue.map((_, i) => i);
}

function updateNextPrevState() {
  const hasMultiple = queue.length > 1;
  prevBtn.disabled = !hasMultiple;
  nextBtn.disabled = !hasMultiple;
}

function playCurrent() {
  const track = queue[queueIndex];
  if (!track) return;

  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;
  if (track.cover_path) {
    coverEl.style.backgroundImage = `url(${track.cover_path})`;
    coverEl.textContent = '';
  } else {
    coverEl.style.backgroundImage = 'none';
    coverEl.textContent = track.title.charAt(0).toUpperCase();
  }

  playerBar.classList.remove('hidden');
  ensureAudioGraph();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  audioEl.src = track.audio_path;
  audioEl.play();
  api.markPlayed(track.id).catch(() => {});
  updateNextPrevState();
}

// Sets the playback queue and starts at startIndex. Pass the full list a
// track was clicked from so next/prev move through that same list.
export function playQueue(tracks, startIndex = 0) {
  queue = tracks;
  queueIndex = startIndex;
  if (shuffleOn) shuffleOrder = shuffledIndices(queue.length, queueIndex);
  playCurrent();
}

export function playTrack(track) {
  playQueue([track], 0);
}

export function togglePlayPause() {
  if (!queue.length) return;
  if (audioEl.paused) {
    ensureAudioGraph();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioEl.play();
  } else {
    audioEl.pause();
  }
}

function advance(direction) {
  if (!queue.length) return;
  const order = playbackOrder();
  const posInOrder = order.indexOf(queueIndex);
  let nextPos = posInOrder + direction;

  if (nextPos < 0) {
    nextPos = order.length - 1;
  } else if (nextPos >= order.length) {
    if (repeatMode === 'all') {
      nextPos = 0;
      if (shuffleOn) shuffleOrder = shuffledIndices(queue.length, null);
    } else {
      return;
    }
  }
  queueIndex = order[nextPos];
  playCurrent();
}

export function playNext() {
  advance(1);
}

export function playPrevious() {
  // More than a few seconds in, "previous" restarts the current track
  // instead of jumping back — matches how most music players behave.
  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }
  advance(-1);
}

export function toggleShuffle() {
  shuffleOn = !shuffleOn;
  if (shuffleOn) shuffleOrder = shuffledIndices(queue.length, queueIndex);
  shuffleBtn.classList.toggle('is-active', shuffleOn);
}

export function cycleRepeat() {
  repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
  repeatBtn.classList.remove('is-active', 'is-active-one');
  if (repeatMode === 'all') repeatBtn.classList.add('is-active');
  if (repeatMode === 'one') repeatBtn.classList.add('is-active', 'is-active-one');
}

export function getCurrentTrack() {
  return queue[queueIndex] || null;
}

audioEl.addEventListener('play', () => {
  iconPlay.classList.add('hidden');
  iconPause.classList.remove('hidden');
  playPauseBtn.setAttribute('aria-label', 'Pause');
  if (!rafId) drawVisualizer();
});

audioEl.addEventListener('pause', () => {
  iconPlay.classList.remove('hidden');
  iconPause.classList.add('hidden');
  playPauseBtn.setAttribute('aria-label', 'Play');
});

audioEl.addEventListener('timeupdate', () => {
  currentTimeEl.textContent = formatTime(audioEl.currentTime);
  if (!isSeeking && audioEl.duration) {
    seekEl.value = (audioEl.currentTime / audioEl.duration) * 100;
  }
});

audioEl.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audioEl.duration);
});

audioEl.addEventListener('ended', () => {
  seekEl.value = 0;
  if (repeatMode === 'one') {
    audioEl.currentTime = 0;
    audioEl.play();
  } else {
    advance(1);
  }
});

playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', cycleRepeat);

seekEl.addEventListener('input', () => {
  isSeeking = true;
  if (audioEl.duration) currentTimeEl.textContent = formatTime((seekEl.value / 100) * audioEl.duration);
});
seekEl.addEventListener('change', () => {
  if (audioEl.duration) audioEl.currentTime = (seekEl.value / 100) * audioEl.duration;
  isSeeking = false;
});

volumeEl.addEventListener('input', () => {
  audioEl.volume = volumeEl.value / 100;
});
audioEl.volume = 0.8;
