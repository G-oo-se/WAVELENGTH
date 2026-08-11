import { api } from './api.js';

const audioEl = document.getElementById('audio-el');
const playerBar = document.getElementById('player-bar');
const coverEl = document.getElementById('player-cover');
const titleEl = document.getElementById('player-title');
const artistEl = document.getElementById('player-artist');
const playPauseBtn = document.getElementById('player-playpause');
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
let currentTrack = null;
let rafId = null;
let isSeeking = false;

// createMediaElementSource can only ever be called once per <audio> element,
// and browsers require a user gesture before an AudioContext can run — so we
// build this graph lazily, the first time the person actually presses play.
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

export function playTrack(track) {
  const isNewTrack = !currentTrack || currentTrack.id !== track.id;
  currentTrack = track;

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

  if (isNewTrack) {
    audioEl.src = track.audio_path;
    api.markPlayed(track.id).catch(() => {});
  }
  audioEl.play();
}

export function togglePlayPause() {
  if (!currentTrack) return;
  if (audioEl.paused) {
    ensureAudioGraph();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioEl.play();
  } else {
    audioEl.pause();
  }
}

export function getCurrentTrack() {
  return currentTrack;
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
});

playPauseBtn.addEventListener('click', togglePlayPause);

seekEl.addEventListener('input', () => {
  isSeeking = true;
  if (audioEl.duration) {
    currentTimeEl.textContent = formatTime((seekEl.value / 100) * audioEl.duration);
  }
});
seekEl.addEventListener('change', () => {
  if (audioEl.duration) {
    audioEl.currentTime = (seekEl.value / 100) * audioEl.duration;
  }
  isSeeking = false;
});

volumeEl.addEventListener('input', () => {
  audioEl.volume = volumeEl.value / 100;
});
audioEl.volume = 0.8;
