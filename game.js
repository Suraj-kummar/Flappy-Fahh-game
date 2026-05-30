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

function playPowerup() {
  try {
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination); osc.type = "triangle";
      const t = audioCtx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, t); gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch (_) {}
}
function playCoin() {
  try {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(1046, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1318, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.18);
  } catch (_) {}
}

let musicNodes = null, musicGain = null;
function startMusic() {
  try {
    if (musicGain) { musicGain.gain.setValueAtTime(0.06, audioCtx.currentTime); return; }
    musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    musicGain.connect(audioCtx.destination);
    const melody = [261, 329, 392, 523, 392, 329]; let step = 0;
    function tick() {
      const osc = audioCtx.createOscillator();
      osc.connect(musicGain); osc.type = "triangle";
      osc.frequency.setValueAtTime(melody[step % melody.length], audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.13); step++;
    }
    musicNodes = setInterval(tick, 170);
  } catch (_) {}
}
function stopMusic() {
  try {
    if (musicNodes) clearInterval(musicNodes);
    if (musicGain) { musicGain.gain.setValueAtTime(0.001, audioCtx.currentTime); musicGain = null; musicNodes = null; }
  } catch (_) {}
}

// ── Constants ──────────────────────────────────────────────
const GRAVITY_NORMAL      =  0.45;
const GRAVITY_INVERTED    = -0.45;
const FLAP_FORCE_NORMAL   = -8.5;
const FLAP_FORCE_INVERTED =  8.5;
const PIPE_WIDTH          = 58;
const PIPE_GAP            = 162;
const PIPE_SPEED_INIT     = 1.2;
const PIPE_SPEED_MAX      = 2.8;
const PIPE_SPEED_INC      = 0.03;
const PIPE_SPAWN_DIST     = 260;
const BIRD_SIZE           = 30;
const BIRD_X              = 90;
const MAX_LIVES           = 3;
const INVINCIBLE_FRAMES   = 90;
const POWERUP_DURATION    = 240;
const DOUBLE_FLAP_RESET   = 60;

// ── Achievements ───────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id: "first_flight",   icon: "🐣", name: "First Flight",   desc: "Play your first game" },
  { id: "decade",         icon: "🔟", name: "Decade",         desc: "Reach score 10" },
  { id: "speed_demon",    icon: "⚡", name: "Speed Demon",    desc: "Reach score 25" },
  { id: "coin_hoarder",   icon: "🪙", name: "Coin Hoarder",   desc: "Collect 20 coins total" },
  { id: "invincible",     icon: "🛡️", name: "Invincible",     desc: "Use a shield power-up" },
  { id: "gravity_master", icon: "🔄", name: "Gravity Master", desc: "Flip gravity 10x in one run" },
  { id: "century",        icon: "💯", name: "Century",        desc: "Reach score 50" },
];
let unlockedAchievements = new Set(JSON.parse(localStorage.getItem("fahh_achievements") || "[]"));
let totalCoins = parseInt(localStorage.getItem("fahh_total_coins") || "0");
function unlockAchievement(id) {
  if (unlockedAchievements.has(id)) return;
  unlockedAchievements.add(id);
  localStorage.setItem("fahh_achievements", JSON.stringify([...unlockedAchievements]));
  showAchievementToast(id);
}
function showAchievementToast(id) {
  const def = ACHIEVEMENT_DEFS.find(a => a.id === id); if (!def) return;
  const toast = document.getElementById("achievementToast");
  toast.textContent = def.icon + " Achievement: " + def.name;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── Leaderboard ─────────────────────────────────────────────
function getLeaderboard() { return JSON.parse(localStorage.getItem("fahh_leaderboard") || "[]"); }
function saveLeaderboard(lb) { localStorage.setItem("fahh_leaderboard", JSON.stringify(lb)); }
function addToLeaderboard(name, score) {
  const lb = getLeaderboard();
  lb.push({ name, score }); lb.sort((a, b) => b.score - a.score); lb.splice(5);
  saveLeaderboard(lb); return lb;
}
function renderLeaderboard() {
  const lb = getLeaderboard();
  if (!lb.length) { leaderboardList.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>'; return; }
  leaderboardList.innerHTML = lb.map((e, i) =>
    '<div class="lb-row ' + (i===0?'lb-gold':i===1?'lb-silver':i===2?'lb-bronze':'') + '">' +
    '<span class="lb-rank">' + (["🥇","🥈","🥉","4","5"][i]) + '</span>' +
    '<span class="lb-name">' + (e.name||"???") + '</span>' +
    '<span class="lb-score">' + e.score + '</span></div>'
  ).join("");
}

// ── Game State ─────────────────────────────────────────────
let state = "start";
let gravitySign = 1, birdY = H / 2, birdVY = 0;
let score = 0, bestScore = parseInt(localStorage.getItem("fahh_best") || "0");
let pipes = [], frameCount = 0, pipeSpeed = PIPE_SPEED_INIT;
let particles = [], coins = [], powerupItems = [];
let lives = MAX_LIVES, invincibleFrames = 0;
let activePowerup = null, powerupTimer = 0, shieldHit = false;
let combo = 0, comboActive = false, sessionCoins = 0;
let doubleFlapped = false, doubleFlappedTimer = 0, gravityFlipCount = 0;
let shakeFrames = 0, shakeAmount = 0;
let cloudOffset = 0, hillOffset = 0, starOffset = 0;

// ── Day/Night Cycle ────────────────────────────────────────
function lerpColor(a, b, t) {
  const ah = a.slice(1), bh = b.slice(1);
  const ar=parseInt(ah.slice(0,2),16), ag=parseInt(ah.slice(2,4),16), ab_=parseInt(ah.slice(4,6),16);
  const br=parseInt(bh.slice(0,2),16), bg=parseInt(bh.slice(2,4),16), bb_=parseInt(bh.slice(4,6),16);
  return "rgb("+Math.round(ar+(br-ar)*t)+","+Math.round(ag+(bg-ag)*t)+","+Math.round(ab_+(bb_-ab_)*t)+")";
}
function getSkyColors(score) {
  const phase = Math.min(score / 50, 1);
  if (phase < 0.25) { const t = phase/0.25; return {top:lerpColor("#1a0533","#0d1b6e",t),mid:lerpColor("#3d0c5c","#1a3a7c",t),bottom:lerpColor("#7b2d4a","#0f2460",t)}; }
  if (phase < 0.5)  { const t = (phase-0.25)/0.25; return {top:lerpColor("#0d1b6e","#0a4a8a",t),mid:lerpColor("#1a3a7c","#1265aa",t),bottom:lerpColor("#0f2460","#1e88e5",t)}; }
  if (phase < 0.75) { const t = (phase-0.5)/0.25; return {top:lerpColor("#0a4a8a","#1a0a2e",t),mid:lerpColor("#1265aa","#6b1a1a",t),bottom:lerpColor("#1e88e5","#e74c3c",t)}; }
  const t = (phase-0.75)/0.25; return {top:lerpColor("#1a0a2e","#03001a",t),mid:lerpColor("#6b1a1a","#0d0d2b",t),bottom:lerpColor("#e74c3c","#0f2460",t)};
}

// ── HUD Helpers ────────────────────────────────────────────
function pipeSpeed_for(sc) {
  return Math.min(PIPE_SPEED_INIT + sc * PIPE_SPEED_INC, PIPE_SPEED_MAX) * (activePowerup === "slowmo" ? 0.5 : 1);
}
function updateHeartsDisplay() {
  if (!heartsEl) return; heartsEl.innerHTML = "";
  for (let i = 0; i < MAX_LIVES; i++) { const h = document.createElement("span"); h.textContent = i < lives ? "❤️" : "🖤"; heartsEl.appendChild(h); }
}
function updatePowerupDisplay() {
  if (!powerupEl || !powerupBar) return;
  if (!activePowerup) { powerupEl.textContent = ""; powerupBar.style.width = "0%"; powerupBar.style.opacity = "0"; return; }
  const icons = { shield: "🛡️", slowmo: "🐢", magnet: "🧲" };
  powerupEl.textContent = icons[activePowerup] || "";
  powerupBar.style.width = (powerupTimer / POWERUP_DURATION * 100) + "%";
  powerupBar.style.opacity = "1";
}
function updateCoinsDisplay() { if (coinsEl) coinsEl.textContent = "🪙 " + sessionCoins; }
function updateComboDisplay() {
  if (!comboEl) return;
  if (combo >= 2) { comboEl.textContent = "🔥 x" + combo + " COMBO"; comboEl.style.opacity = "1"; }
  else { comboEl.style.opacity = "0"; }
}
function showMilestone(text) {
  if (!milestoneEl) return;
  milestoneEl.textContent = text; milestoneEl.classList.remove("milestone-anim");
  void milestoneEl.offsetWidth; milestoneEl.classList.add("milestone-anim");
}
function updateGravityIndicator() {
  if (gravitySign === 1) { gravityIndicatorEl.textContent = "⬇ NORMAL"; gravityIndicatorEl.className = "normal"; }
  else { gravityIndicatorEl.textContent = "⬆ FLIPPED"; gravityIndicatorEl.className = "inverted"; }
}
function updateScore() { scoreEl.textContent = "Score: " + score; }
function triggerShake(f, a) { shakeFrames = f; shakeAmount = a; }

// ── Reset ──────────────────────────────────────────────────
function resetGame() {
  birdY = H / 2; birdVY = 0; gravitySign = 1; score = 0;
  pipes = []; particles = []; coins = []; powerupItems = [];
  frameCount = 0; pipeSpeed = PIPE_SPEED_INIT;
  lives = MAX_LIVES; invincibleFrames = 0;
  activePowerup = null; powerupTimer = 0; shieldHit = false;
  combo = 0; comboActive = false; sessionCoins = 0;
  doubleFlapped = false; doubleFlappedTimer = 0; gravityFlipCount = 0;
  shakeFrames = 0; cloudOffset = 0; hillOffset = 0;
  updateGravityIndicator(); updateScore();
  updateHeartsDisplay(); updatePowerupDisplay();
  updateCoinsDisplay(); updateComboDisplay();
}
