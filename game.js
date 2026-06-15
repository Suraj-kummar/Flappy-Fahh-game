// =========================================================
//  FLAPPY FAHH — game.js  (self-contained, no external files)
//  v2 — full rewrite, zero bugs
// =========================================================

"use strict";

// ── DOM references ────────────────────────────────────────
const canvas   = document.getElementById("gameCanvas");
const ctx      = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const gravityIndicatorEl = document.getElementById("gravityIndicator");
const scoreEl            = document.getElementById("scoreEl");
const overlay            = document.getElementById("gameOverlay");
const overlayTitle       = document.getElementById("overlayTitle");
const overlayScore       = document.getElementById("overlayScore");
const overlayBest        = document.getElementById("overlayBest");
const overlayHint        = document.getElementById("overlayHint");

// ── Audio ─────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Real "FAHHHHH" sound file
const fahhAudio = new Audio("fahh.mp3");
fahhAudio.volume = 0.85;
// Preload
fahhAudio.load();

function playFahh() {
  try {
    // Resume AudioContext if suspended (browser policy)
    if (audioCtx.state === "suspended") audioCtx.resume();
    // Clone so rapid flaps overlap
    const clone = fahhAudio.cloneNode();
    clone.volume = 0.85;
    clone.playbackRate = 1.0;
    clone.play().catch(() => {});
  } catch (_) {}
}

function playScore() {
  try {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (_) {}
}

function playDie() {
  try {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.38);
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (_) {}
}

// ── Game constants ────────────────────────────────────────
const GRAVITY_NORMAL   =  0.45;   // px / frame²  downward
const GRAVITY_INVERTED = -0.45;   // px / frame²  upward
const FLAP_FORCE_NORMAL   = -8.5; // negative = up
const FLAP_FORCE_INVERTED =  8.5; // positive = down
const PIPE_WIDTH        = 58;
const PIPE_GAP          = 158;    // vertical gap between pipes
const PIPE_SPEED_INIT   = 1.2;
const PIPE_SPEED_MAX    = 2.6;
const PIPE_SPEED_INC    = 0.03;   // extra speed per score point
const PIPE_SPAWN_DIST   = 260;    // horizontal distance between pipes
const BIRD_SIZE         = 30;
const BIRD_X            = 90;

// ── Game state ────────────────────────────────────────────
let state = "start"; // "start" | "playing" | "dead"

let gravitySign   = 1;   // 1 = normal (falling down), -1 = inverted
let birdY         = H / 2;
let birdVY        = 0;
let score         = 0;
let bestScore     = 0;
let pipes         = [];
let frameCount    = 0;
let pipeSpeed     = PIPE_SPEED_INIT;

// Particle system for visual flair
let particles     = [];

// ── Helpers ───────────────────────────────────────────────
function pipeSpeed_for(sc) {
  return Math.min(PIPE_SPEED_INIT + sc * PIPE_SPEED_INC, PIPE_SPEED_MAX);
}

function resetGame() {
  birdY      = H / 2;
  birdVY     = 0;
  gravitySign = 1;
  score      = 0;
  pipes      = [];
  particles  = [];
  frameCount = 0;
  pipeSpeed  = PIPE_SPEED_INIT;
  updateGravityIndicator();
  updateScore();
}

function startGame() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  resetGame();
  state = "playing";
  overlay.classList.add("hidden");
}

function showStartScreen() {
  state = "start";
  overlayTitle.textContent = "🐔 FLAPPY FAHH";
  overlayTitle.className = "start";
  overlayScore.textContent = "";
  overlayBest.textContent = bestScore > 0 ? `Best: ${bestScore}` : "";
  overlayHint.textContent = "Press SPACE or tap to start";
  overlay.classList.remove("hidden");
}

function showDeadScreen() {
  state = "dead";
  if (score > bestScore) bestScore = score;
  overlayTitle.textContent = "FAHH! 💀";
  overlayTitle.className = "dead";
  overlayScore.textContent = `Score: ${score}`;
  overlayBest.textContent  = `Best: ${bestScore}`;
  overlayHint.textContent  = "Press SPACE or tap to play again";
