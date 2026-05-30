// =========================================================
//  FLAPPY FAHH — game.js  ULTRA UPGRADE v3
// =========================================================
"use strict";

// ── DOM references ─────────────────────────────────────────
const canvas   = document.getElementById("gameCanvas");
const ctx      = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const gravityIndicatorEl = document.getElementById("gravityIndicator");
const scoreEl            = document.getElementById("scoreEl");
const overlay            = document.getElementById("gameOverlay");
const overlayTitle       = document.getElementById("overlayTitle");
const overlayScore       = document.getElementById("overlayScore");
const overlayBest        = document.getElementById("overlayBest");
const overlayHint        = document.getElementById("overlayHint");
const heartsEl           = document.getElementById("heartsEl");
const powerupEl          = document.getElementById("powerupEl");
const powerupBar         = document.getElementById("powerupBar");
const milestoneEl        = document.getElementById("milestoneEl");
const overlayAchievements= document.getElementById("overlayAchievements");
const overlayLeaderboard = document.getElementById("overlayLeaderboard");
const shareBtn           = document.getElementById("shareBtn");
const leaderboardList    = document.getElementById("leaderboardList");
const lbPanel            = document.getElementById("lbPanel");
const lbToggleBtn        = document.getElementById("lbToggleBtn");
const coinsEl            = document.getElementById("coinsEl");
const comboEl            = document.getElementById("comboEl");

// ── Audio core ─────────────────────────────────────────────
const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
const fahhAudio = new Audio("fahh.mp3");
fahhAudio.volume = 0.85;
fahhAudio.load();

function playFahh(rate = 1.0) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const clone = fahhAudio.cloneNode();
    clone.volume = 0.75; clone.playbackRate = rate;
    clone.play().catch(() => {});
  } catch (_) {}
}

function playScore() {
  try {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); osc.type = "square";
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
  } catch (_) {}
}
function playDie() {
  try {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.38);
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);
    osc.start(); osc.stop(audioCtx.currentTime + 0.45);
  } catch (_) {}
}
