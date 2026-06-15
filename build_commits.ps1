
# ============================================================
# Flappy Fahh — 34-Feature Commit Builder
# ============================================================
$ErrorActionPreference = "Stop"
$dir = "c:\Users\suraj\OneDrive\Desktop\Flappy Fahh"
Set-Location $dir

# ── Helper ──────────────────────────────────────────────────
function Commit($msg) {
    git add game.js index.html 2>&1 | Out-Null
    git commit -m $msg 2>&1 | Out-Null
    Write-Host "✅ Committed: $msg"
}

# ============================================================
# COMMIT 1 — Project scaffold: ultra edition subtitle + layout
# ============================================================
$html1 = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flappy Fahh 🐔 — Ultra Edition</title>
  <meta name="description" content="Flappy Fahh Ultra Edition — dodge pipes, collect coins, grab power-ups and flip gravity!" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #05051a;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; font-family: 'Outfit', sans-serif; color: #fff;
      overflow: hidden; user-select: none;
    }
    body::before {
      content: ''; position: fixed; inset: 0;
      background:
        radial-gradient(ellipse at 15% 55%, rgba(130,40,220,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 20%, rgba(30,90,220,0.18) 0%, transparent 55%);
      z-index: 0; pointer-events: none;
    }
    h1 {
      font-size: 2.2rem; font-weight: 900; letter-spacing: 5px; margin-bottom: 4px;
      background: linear-gradient(135deg, #f9ca24 0%, #f0932b 50%, #ff6b6b 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; position: relative; z-index: 1;
    }
    .subtitle { font-size: 0.72rem; color: #a29bfe; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; position: relative; z-index: 1; }
    #controls { font-size: 0.78rem; color: #6c7a99; margin-bottom: 12px; text-align: center; line-height: 2; position: relative; z-index: 1; }
    #controls kbd { display: inline-block; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; padding: 1px 8px; color: #f9ca24; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.78rem; }
    #canvasWrapper { position: relative; border-radius: 18px; overflow: hidden; box-shadow: 0 0 0 2px rgba(249,202,36,0.35), 0 0 50px rgba(249,202,36,0.25), 0 50px 90px rgba(0,0,0,0.7); z-index: 1; }
    canvas { display: block; }
    #hudTopLeft { position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; gap: 4px; pointer-events: none; }
    #scoreEl { font-size: 1.05rem; font-weight: 700; color: #f9ca24; text-shadow: 0 0 12px rgba(249,202,36,0.7); }
    #coinsEl { font-size: 0.82rem; font-weight: 600; color: #ffd32a; }
    #comboEl { font-size: 0.78rem; font-weight: 700; color: #ff6b6b; transition: opacity 0.3s; opacity: 0; }
    #heartsEl { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); font-size: 1.1rem; pointer-events: none; display: flex; gap: 3px; }
    #gravityIndicator { position: absolute; top: 12px; right: 12px; font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; background: rgba(0,0,0,0.55); border: 1.5px solid rgba(255,255,255,0.2); transition: color 0.3s, border-color 0.3s; pointer-events: none; letter-spacing: 1px; }
    #gravityIndicator.normal { color: #4ecca3; border-color: rgba(78,204,163,0.5); }
    #gravityIndicator.inverted { color: #ff6b6b; border-color: rgba(255,107,107,0.5); }
    #powerupHud { position: absolute; bottom: 12px; right: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; pointer-events: none; }
    #powerupEl { font-size: 1.5rem; }
    #powerupBarBg { width: 70px; height: 5px; background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden; }
    #powerupBar { height: 100%; width: 0%; background: linear-gradient(90deg, #74b9ff, #a29bfe); border-radius: 3px; transition: width 0.1s linear, opacity 0.3s; opacity: 0; }
    #milestoneEl { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 3rem; font-weight: 900; color: #f9ca24; text-shadow: 0 0 30px rgba(249,202,36,0.9); pointer-events: none; opacity: 0; }
    #milestoneEl.milestone-anim { animation: milestonePop 1s ease forwards; }
    @keyframes milestonePop { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)} 25%{opacity:1;transform:translate(-50%,-60%) scale(1.2)} 60%{opacity:1;transform:translate(-50%,-70%) scale(1)} 100%{opacity:0;transform:translate(-50%,-90%) scale(0.9)} }
    #achievementToast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(80px); background: linear-gradient(135deg, rgba(30,30,60,0.95), rgba(50,20,80,0.95)); border: 1.5px solid rgba(162,155,254,0.5); border-radius: 12px; padding: 10px 20px; font-size: 0.88rem; font-weight: 700; color: #a29bfe; box-shadow: 0 0 20px rgba(162,155,254,0.3); transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s; opacity: 0; z-index: 999; white-space: nowrap; }
    #achievementToast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    #gameOverlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(3,3,20,0.78); backdrop-filter: blur(8px); opacity: 1; pointer-events: auto; transition: opacity 0.35s ease; }
    #gameOverlay.hidden { opacity: 0; pointer-events: none; }
    #overlayTitle { font-size: 2.6rem; font-weight: 900; line-height: 1; }
    #overlayTitle.dead { color: #ff6b6b; animation: shake 0.4s ease; }
    #overlayTitle.new-best { background: linear-gradient(135deg,#f9ca24,#ff6b6b,#a29bfe); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    #overlayTitle.start { background: linear-gradient(135deg,#f9ca24,#f0932b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    #overlayScore { font-size: 1.05rem; color: #ccc; }
    #overlayBest { font-size: 0.85rem; color: #8899bb; }
    #overlayHint { margin-top: 4px; font-size: 0.8rem; color: rgba(255,255,255,0.4); animation: pulse 1.8s ease-in-out infinite; }
    .ach-row { display: flex; gap: 8px; font-size: 1.4rem; background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); }
    #overlayLeaderboard { text-align: center; font-size: 0.8rem; color: #8899bb; line-height: 1.8; }
    .lb-title { font-weight: 700; color: #f9ca24; font-size: 0.88rem; margin-bottom: 2px; }
    #shareBtn { margin-top: 4px; padding: 8px 22px; border: 1.5px solid rgba(162,155,254,0.5); border-radius: 10px; background: rgba(162,155,254,0.12); color: #a29bfe; font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.15s; display: none; }
    #shareBtn:hover { background: rgba(162,155,254,0.25); transform: scale(1.04); }
    #lbSection { position: relative; z-index: 1; margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    #lbToggleBtn { padding: 6px 18px; border: 1.5px solid rgba(249,202,36,0.35); border-radius: 10px; background: rgba(249,202,36,0.08); color: #f9ca24; font-family: 'Outfit', sans-serif; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: background 0.2s; letter-spacing: 1px; }
    #lbToggleBtn:hover { background: rgba(249,202,36,0.18); }
    #lbPanel { width: 280px; background: rgba(10,10,30,0.92); border: 1.5px solid rgba(249,202,36,0.3); border-radius: 14px; padding: 12px 16px; backdrop-filter: blur(6px); }
    #lbPanel.hidden { display: none; }
    .lb-panel-title { font-size: 0.88rem; font-weight: 700; color: #f9ca24; text-align: center; margin-bottom: 8px; letter-spacing: 2px; }
    .lb-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }
    .lb-row:last-child { border-bottom: none; }
    .lb-rank { font-size: 1rem; width: 28px; }
    .lb-name { flex: 1; font-weight: 600; color: #dfe6e9; padding-left: 6px; }
    .lb-score { font-weight: 700; color: #f9ca24; }
    .lb-gold .lb-name { color: #f9ca24; }
    .lb-silver .lb-name { color: #b2bec3; }
    .lb-bronze .lb-name { color: #e17055; }
    .lb-empty { text-align: center; color: #636e72; font-size: 0.8rem; padding: 8px 0; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
    @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
  </style>
</head>
<body>
  <h1>🐔 FLAPPY FAHH</h1>
  <div class="subtitle">Ultra Edition</div>
  <div id="controls">
    <kbd>SPACE</kbd> Flap &nbsp;|&nbsp; <kbd>SHIFT</kbd> Flip Gravity &nbsp;|&nbsp; Double-tap <kbd>SPACE</kbd> for Double Flap
  </div>
  <div id="canvasWrapper">
    <canvas id="gameCanvas" width="460" height="580"></canvas>
    <div id="hudTopLeft">
      <div id="scoreEl">Score: 0</div>
      <div id="coinsEl">🪙 0</div>
      <div id="comboEl"></div>
    </div>
    <div id="heartsEl"></div>
    <div id="gravityIndicator" class="normal">⬇ NORMAL</div>
    <div id="powerupHud">
      <div id="powerupEl"></div>
      <div id="powerupBarBg"><div id="powerupBar"></div></div>
    </div>
    <div id="milestoneEl"></div>
    <div id="gameOverlay">
      <div id="overlayTitle" class="start">🐔 FLAPPY FAHH</div>
      <div id="overlayScore"></div>
      <div id="overlayBest"></div>
      <div id="overlayAchievements"></div>
      <div id="overlayLeaderboard"></div>
      <button id="shareBtn">📋 Share Score</button>
      <div id="overlayHint">Press SPACE or tap to start</div>
    </div>
  </div>
  <div id="lbSection">
    <button id="lbToggleBtn">🏆 Leaderboard</button>
    <div id="lbPanel" class="hidden">
      <div class="lb-panel-title">🏆 HALL OF FAHH</div>
      <div id="leaderboardList"></div>
    </div>
  </div>
  <div id="achievementToast"></div>
  <script src="game.js"></script>
</body>
</html>
'@

Set-Content -Path "$dir\index.html" -Value $html1 -Encoding UTF8
Commit "feat: ultra edition scaffold — new HUD layout, subtitle, aurora background"

# ── Feature JS blocks ────────────────────────────────────────
# We'll build game.js incrementally by appending sections

$jsBase = @'
// =========================================================
//  FLAPPY FAHH — game.js  ULTRA UPGRADE v3
// =========================================================
"use strict";
'@

# COMMIT 2 — DOM refs
$jsBase += @'

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
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: add DOM references for all new HUD elements"

# COMMIT 3 — Audio context + fahh sound
$jsBase += @'

// ── Audio core ─────────────────────────────────────────────
const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
const fahhAudio = new Audio("fahh.mp3");
fahhAudio.volume = 0.85;
fahhAudio.load();

function playFahh(rate = 1.0) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const clone = fahhAudio.cloneNode();
    clone.volume = 0.75;
    clone.playbackRate = rate;
    clone.play().catch(() => {});
  } catch (_) {}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: audio context setup + pitch-rate FAHH sound player"

# COMMIT 4 — Score / Die sounds
$jsBase += @'

function playScore() {
  try {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "square";
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
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.38);
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);
    osc.start(); osc.stop(audioCtx.currentTime + 0.45);
  } catch (_) {}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: score and death sound effects using Web Audio API"

# COMMIT 5 — Power-up & coin sounds
$jsBase += @'

function playPowerup() {
  try {
    [523,659,784,1047].forEach((freq,i) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = "triangle";
      const t = audioCtx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch (_) {}
}

function playCoin() {
  try {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1318, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.18);
  } catch (_) {}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: power-up arpeggio jingle and coin ping sound effects"

# COMMIT 6 — Background music
$jsBase += @'

let musicNodes = null, musicGain = null;

function startMusic() {
  try {
    if (musicGain) { musicGain.gain.setValueAtTime(0.06, audioCtx.currentTime); return; }
    musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    musicGain.connect(audioCtx.destination);
    const melody = [261,329,392,523,392,329];
    let step = 0;
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
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: background chiptune music loop using Web Audio API oscillators"

# COMMIT 7 — Game constants
$jsBase += @'

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
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: game constants — lives, power-up duration, double flap timing"

# COMMIT 8 — Achievements system
$jsBase += @'

// ── Achievements ───────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id:"first_flight",   icon:"🐣", name:"First Flight",   desc:"Play your first game" },
  { id:"decade",         icon:"🔟", name:"Decade",         desc:"Reach score 10" },
  { id:"speed_demon",    icon:"⚡", name:"Speed Demon",    desc:"Reach score 25" },
  { id:"coin_hoarder",   icon:"🪙", name:"Coin Hoarder",   desc:"Collect 20 coins total" },
  { id:"invincible",     icon:"🛡️", name:"Invincible",     desc:"Use a shield power-up" },
  { id:"gravity_master", icon:"🔄", name:"Gravity Master", desc:"Flip gravity 10x in one run" },
  { id:"century",        icon:"💯", name:"Century",        desc:"Reach score 50" },
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
  const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
  if (!def) return;
  const toast = document.getElementById("achievementToast");
  toast.textContent = `${def.icon} Achievement: ${def.name}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: achievements system — 7 badges with localStorage persistence + toast"

# COMMIT 9 — Leaderboard
$jsBase += @'

// ── Leaderboard ─────────────────────────────────────────────
function getLeaderboard() { return JSON.parse(localStorage.getItem("fahh_leaderboard") || "[]"); }
function saveLeaderboard(lb) { localStorage.setItem("fahh_leaderboard", JSON.stringify(lb)); }
function addToLeaderboard(name, score) {
  const lb = getLeaderboard();
  lb.push({ name, score }); lb.sort((a,b) => b.score - a.score); lb.splice(5);
  saveLeaderboard(lb); return lb;
}
function renderLeaderboard() {
  const lb = getLeaderboard();
  if (!lb.length) { leaderboardList.innerHTML = `<div class="lb-empty">No scores yet — be the first!</div>`; return; }
  leaderboardList.innerHTML = lb.map((e,i) =>
    `<div class="lb-row ${i===0?'lb-gold':i===1?'lb-silver':i===2?'lb-bronze':''}">
      <span class="lb-rank">${["🥇","🥈","🥉","4","5"][i]}</span>
      <span class="lb-name">${e.name||"???"}</span>
      <span class="lb-score">${e.score}</span>
    </div>`).join("");
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: local leaderboard — top 5 scores saved to localStorage with medals"

# COMMIT 10 — Game state variables
$jsBase += @'

// ── Game State ─────────────────────────────────────────────
let state = "start";
let gravitySign = 1, birdY = H/2, birdVY = 0;
let score = 0, bestScore = parseInt(localStorage.getItem("fahh_best")||"0");
let pipes = [], frameCount = 0, pipeSpeed = PIPE_SPEED_INIT;
let particles = [], coins = [], powerupItems = [];
let lives = MAX_LIVES, invincibleFrames = 0;
let activePowerup = null, powerupTimer = 0, shieldHit = false;
let combo = 0, comboActive = false, sessionCoins = 0;
let doubleFlapped = false, doubleFlappedTimer = 0;
let gravityFlipCount = 0;
let shakeFrames = 0, shakeAmount = 0;
let cloudOffset = 0, hillOffset = 0, starOffset = 0;
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: game state variables — lives, power-ups, combo, parallax offsets"

# COMMIT 11 — Day/Night cycle
$jsBase += @'

// ── Day/Night Cycle ────────────────────────────────────────
function lerpColor(a,b,t) {
  const ah=a.slice(1),bh=b.slice(1);
  const ar=parseInt(ah.slice(0,2),16),ag=parseInt(ah.slice(2,4),16),ab_=parseInt(ah.slice(4,6),16);
  const br=parseInt(bh.slice(0,2),16),bg=parseInt(bh.slice(2,4),16),bb_=parseInt(bh.slice(4,6),16);
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab_+(bb_-ab_)*t)})`;
}
function getSkyColors(score) {
  const phase = Math.min(score/50,1);
  if (phase<0.25) { const t=phase/0.25; return {top:lerpColor("#1a0533","#0d1b6e",t),mid:lerpColor("#3d0c5c","#1a3a7c",t),bottom:lerpColor("#7b2d4a","#0f2460",t)}; }
  if (phase<0.5)  { const t=(phase-0.25)/0.25; return {top:lerpColor("#0d1b6e","#0a4a8a",t),mid:lerpColor("#1a3a7c","#1265aa",t),bottom:lerpColor("#0f2460","#1e88e5",t)}; }
  if (phase<0.75) { const t=(phase-0.5)/0.25; return {top:lerpColor("#0a4a8a","#1a0a2e",t),mid:lerpColor("#1265aa","#6b1a1a",t),bottom:lerpColor("#1e88e5","#e74c3c",t)}; }
  const t=(phase-0.75)/0.25; return {top:lerpColor("#1a0a2e","#03001a",t),mid:lerpColor("#6b1a1a","#0d0d2b",t),bottom:lerpColor("#e74c3c","#0f2460",t)};
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: day/night sky cycle — 4 phases (dawn→day→dusk→night) tied to score"

# COMMIT 12 — HUD update helpers
$jsBase += @'

// ── HUD Helpers ────────────────────────────────────────────
function pipeSpeed_for(sc) {
  return Math.min(PIPE_SPEED_INIT + sc*PIPE_SPEED_INC, PIPE_SPEED_MAX) * (activePowerup==="slowmo"?0.5:1);
}
function updateHeartsDisplay() {
  if (!heartsEl) return; heartsEl.innerHTML="";
  for(let i=0;i<MAX_LIVES;i++){const h=document.createElement("span");h.textContent=i<lives?"❤️":"🖤";heartsEl.appendChild(h);}
}
function updatePowerupDisplay() {
  if(!powerupEl||!powerupBar)return;
  if(!activePowerup){powerupEl.textContent="";powerupBar.style.width="0%";powerupBar.style.opacity="0";return;}
  const icons={shield:"🛡️",slowmo:"🐢",magnet:"🧲"};
  powerupEl.textContent=icons[activePowerup]||"";
  powerupBar.style.width=(powerupTimer/POWERUP_DURATION*100)+"%";
  powerupBar.style.opacity="1";
}
function updateCoinsDisplay(){if(coinsEl)coinsEl.textContent=`🪙 ${sessionCoins}`;}
function updateComboDisplay(){if(!comboEl)return;if(combo>=2){comboEl.textContent=`🔥 x${combo} COMBO`;comboEl.style.opacity="1";}else{comboEl.style.opacity="0";}}
function showMilestone(text){if(!milestoneEl)return;milestoneEl.textContent=text;milestoneEl.classList.remove("milestone-anim");void milestoneEl.offsetWidth;milestoneEl.classList.add("milestone-anim");}
function updateGravityIndicator(){if(gravitySign===1){gravityIndicatorEl.textContent="⬇ NORMAL";gravityIndicatorEl.className="normal";}else{gravityIndicatorEl.textContent="⬆ FLIPPED";gravityIndicatorEl.className="inverted";}}
function updateScore(){scoreEl.textContent=`Score: ${score}`;}
function triggerShake(f,a){shakeFrames=f;shakeAmount=a;}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: HUD update helpers — hearts, power-up bar, coins, combo, gravity indicator"

# COMMIT 13 — resetGame
$jsBase += @'

// ── Reset ──────────────────────────────────────────────────
function resetGame() {
  birdY=H/2;birdVY=0;gravitySign=1;score=0;
  pipes=[];particles=[];coins=[];powerupItems=[];
  frameCount=0;pipeSpeed=PIPE_SPEED_INIT;
  lives=MAX_LIVES;invincibleFrames=0;
  activePowerup=null;powerupTimer=0;shieldHit=false;
  combo=0;comboActive=false;sessionCoins=0;
  doubleFlapped=false;doubleFlappedTimer=0;
  gravityFlipCount=0;shakeFrames=0;
  cloudOffset=0;hillOffset=0;
  updateGravityIndicator();updateScore();
  updateHeartsDisplay();updatePowerupDisplay();
  updateCoinsDisplay();updateComboDisplay();
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: resetGame — full state reset including lives, power-ups, parallax"

# COMMIT 14 — startGame + music trigger
$jsBase += @'

function startGame() {
  if(audioCtx.state==="suspended")audioCtx.resume();
  resetGame(); state="playing";
  overlay.classList.add("hidden");
  lbPanel.classList.add("hidden");
  startMusic();
  unlockAchievement("first_flight");
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: startGame — unlocks first-flight achievement and starts background music"

# COMMIT 15 — showStartScreen
$jsBase += @'

function showStartScreen() {
  state="start";
  overlayTitle.textContent="🐔 FLAPPY FAHH"; overlayTitle.className="start";
  overlayScore.textContent="";
  overlayBest.textContent=bestScore>0?`Best: ${bestScore}`:"";
  overlayHint.textContent="Press SPACE or tap to start";
  overlayAchievements.innerHTML=""; overlayLeaderboard.innerHTML="";
  if(shareBtn)shareBtn.style.display="none";
  overlay.classList.remove("hidden");
  renderLeaderboard(); stopMusic();
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: showStartScreen — clears overlays, renders leaderboard, stops music"

# COMMIT 16 — showDeadScreen + leaderboard + high score prompt
$jsBase += @'

function showDeadScreen() {
  state="dead"; stopMusic();
  const isNewBest=score>bestScore;
  if(isNewBest){bestScore=score;localStorage.setItem("fahh_best",bestScore);
    const name=prompt(`🎉 New High Score: ${score}!\nEnter your name (3 letters):`,"AAA")||"???";
    addToLeaderboard(name.slice(0,3).toUpperCase(),score);}
  totalCoins+=sessionCoins;localStorage.setItem("fahh_total_coins",totalCoins);
  if(totalCoins>=20)unlockAchievement("coin_hoarder");
  if(score>=10)unlockAchievement("decade");
  if(score>=25)unlockAchievement("speed_demon");
  if(score>=50)unlockAchievement("century");
  if(gravityFlipCount>=10)unlockAchievement("gravity_master");
  overlayTitle.textContent=isNewBest?"NEW BEST! 🏆":"FAHH! 💀";
  overlayTitle.className=isNewBest?"new-best":"dead";
  overlayScore.textContent=`Score: ${score}  🪙 ${sessionCoins} coins`;
  overlayBest.textContent=`Best: ${bestScore}`;
  overlayHint.textContent="Press SPACE or tap to play again";
  const defs=ACHIEVEMENT_DEFS.filter(a=>[...unlockedAchievements].includes(a.id));
  overlayAchievements.innerHTML=defs.length?`<div class="ach-row">${defs.map(a=>`<span title="${a.name}">${a.icon}</span>`).join("")}</div>`:"";
  const lb=getLeaderboard();
  if(lb.length)overlayLeaderboard.innerHTML=`<div class="lb-title">🏆 Top Scores</div>`+lb.slice(0,3).map((e,i)=>`<div class="lb-row-sm">${["🥇","🥈","🥉"][i]} ${e.name} — ${e.score}</div>`).join("");
  if(shareBtn){shareBtn.style.display="block";shareBtn.onclick=()=>{const t=`🐔 Flappy Fahh Score: ${score} | Coins: ${sessionCoins} | Best: ${bestScore}`;navigator.clipboard.writeText(t).then(()=>{shareBtn.textContent="✅ Copied!";setTimeout(()=>shareBtn.textContent="📋 Share Score",2000);});}}
  overlay.classList.remove("hidden");
  triggerShake(12,18);
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: showDeadScreen — high score prompt, achievement check, share button"

# COMMIT 17 — Input: flap with pitch scaling
$jsBase += @'

// ── Input ──────────────────────────────────────────────────
function handleFlap() {
  if(state==="start"||state==="dead"){startGame();return;}
  if(state!=="playing")return;
  if(!doubleFlapped){
    birdVY=gravitySign===1?FLAP_FORCE_NORMAL:FLAP_FORCE_INVERTED;
    doubleFlapped=true; doubleFlappedTimer=DOUBLE_FLAP_RESET;
  } else {
    birdVY=gravitySign===1?FLAP_FORCE_NORMAL*0.6:FLAP_FORCE_INVERTED*0.6;
  }
  const rate=0.9+(pipeSpeed-PIPE_SPEED_INIT)/(PIPE_SPEED_MAX-PIPE_SPEED_INIT)*0.4;
  playFahh(rate); spawnFlapParticles();
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: handleFlap — double flap mechanic + pitch-scaled FAHH sound"

# COMMIT 18 — Gravity toggle + flip counter
$jsBase += @'

function handleGravityToggle() {
  if(state!=="playing")return;
  gravitySign*=-1; birdVY*=0.4; gravityFlipCount++;
  updateGravityIndicator();
  playFahh(gravitySign===1?1.0:0.75);
  spawnGravityParticles();
}

window.addEventListener("keydown",(e)=>{
  if(e.code==="Space"||e.code==="ArrowUp"){e.preventDefault();handleFlap();}
  if(e.code==="ShiftLeft"||e.code==="ShiftRight"){e.preventDefault();handleGravityToggle();}
});
canvas.addEventListener("pointerdown",(e)=>{e.preventDefault();handleFlap();});
if(lbToggleBtn)lbToggleBtn.addEventListener("click",()=>{lbPanel.classList.toggle("hidden");renderLeaderboard();});
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: gravity toggle — tracks flip count for achievement, leaderboard toggle"

# COMMIT 19 — Pipe spawning with moving pipes
$jsBase += @'

// ── Pipe Spawning ──────────────────────────────────────────
function spawnPipe() {
  const minTop=50, maxTop=H-PIPE_GAP-50;
  const topH=Math.random()*(maxTop-minTop)+minTop;
  const movingPipe=score>15&&Math.random()<0.5;
  pipes.push({x:W+PIPE_WIDTH,topH,bottomY:topH+PIPE_GAP,baseTopH:topH,scored:false,
    moving:movingPipe,moveDir:Math.random()<0.5?1:-1,
    moveSpeed:0.4+Math.random()*0.4,moveRange:30+Math.random()*20,movePhase:Math.random()*Math.PI*2});
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: pipe spawning — moving pipes that oscillate vertically above score 15"

# COMMIT 20 — Coin spawning in pipe gaps
$jsBase += @'

// ── Coin Spawning ──────────────────────────────────────────
function spawnCoinsForPipe(topH) {
  if(Math.random()<0.6) {
    const midY=topH+PIPE_GAP/2;
    coins.push({x:W+PIPE_WIDTH+PIPE_SPAWN_DIST/2, y:midY+(Math.random()-0.5)*(PIPE_GAP*0.4),
      collected:false, r:10, spinAngle:0});
  }
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: coin spawning — spinning gold coins inside pipe gaps (60% chance)"

# COMMIT 21 — Power-up item spawning
$jsBase += @'

// ── Power-up Spawning ──────────────────────────────────────
function spawnPowerupForPipe(topH) {
  if(Math.random()<0.18) {
    const types=["shield","slowmo","magnet"];
    powerupItems.push({x:W+PIPE_WIDTH+60, y:topH+PIPE_GAP/2+(Math.random()-0.5)*40,
      type:types[Math.floor(Math.random()*types.length)], collected:false, r:14, bob:Math.random()*Math.PI*2});
  }
}

function spawnPipeAndItems() {
  const minTop=50, maxTop=H-PIPE_GAP-50;
  const topH=Math.random()*(maxTop-minTop)+minTop;
  const movingPipe=score>15&&Math.random()<0.5;
  pipes.push({x:W+PIPE_WIDTH,topH,bottomY:topH+PIPE_GAP,baseTopH:topH,scored:false,
    moving:movingPipe,moveDir:Math.random()<0.5?1:-1,
    moveSpeed:0.4+Math.random()*0.4,moveRange:30+Math.random()*20,movePhase:Math.random()*Math.PI*2});
  spawnCoinsForPipe(topH);
  spawnPowerupForPipe(topH);
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: power-up spawning — shield, slow-mo, magnet with 18% chance per pipe"

# COMMIT 22 — Particle: flap, gravity
$jsBase += @'

// ── Particles ──────────────────────────────────────────────
function spawnFlapParticles() {
  for(let i=0;i<6;i++)particles.push({x:BIRD_X,y:birdY,vx:-Math.random()*2.5-0.5,vy:(Math.random()-0.5)*2.5,alpha:1,color:gravitySign===1?"#f9ca24":"#ff6b6b",r:Math.random()*4+2});
}
function spawnGravityParticles() {
  for(let i=0;i<14;i++){const a=(Math.PI*2*i)/14;particles.push({x:BIRD_X,y:birdY,vx:Math.cos(a)*(Math.random()*3+1),vy:Math.sin(a)*(Math.random()*3+1),alpha:1,color:gravitySign===1?"#4ecca3":"#a29bfe",r:Math.random()*5+2});}
}
function spawnScoreParticles() {
  for(let i=0;i<20;i++)particles.push({x:W/2,y:H/2,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,alpha:1,color:`hsl(${Math.random()*60+30},100%,65%)`,r:Math.random()*5+3});
}
function spawnPowerupBurst(x,y,type) {
  const colors={shield:"#74b9ff",slowmo:"#55efc4",magnet:"#fd79a8"};
  const c=colors[type]||"#fff";
  for(let i=0;i<30;i++){const a=(Math.PI*2*i)/30,s=Math.random()*5+2;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,alpha:1,color:c,r:Math.random()*6+2});}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: particle system — flap, gravity flip, score confetti, power-up burst"

# COMMIT 23 — Collision detection
$jsBase += @'

// ── Collision ──────────────────────────────────────────────
function circleRect(cx,cy,cr,rx,ry,rw,rh){const nx=Math.max(rx,Math.min(cx,rx+rw)),ny=Math.max(ry,Math.min(cy,ry+rh));return(cx-nx)**2+(cy-ny)**2<cr*cr;}
function birdCollidesWithPipe(p){const r=BIRD_SIZE/2-3;return circleRect(BIRD_X,birdY,r,p.x,0,PIPE_WIDTH,p.topH)||circleRect(BIRD_X,birdY,r,p.x,p.bottomY,PIPE_WIDTH,H-p.bottomY);}
function circleDist(ax,ay,bx,by,sr){return(ax-bx)**2+(ay-by)**2<sr*sr;}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: collision detection — circle-rect for pipes, circle-circle for coins"

# COMMIT 24 — Lives system + invincibility
$jsBase += @'

// ── Lives System ───────────────────────────────────────────
function handleBirdHit() {
  if(invincibleFrames>0)return;
  if(activePowerup==="shield"&&!shieldHit){
    shieldHit=true;activePowerup=null;powerupTimer=0;
    updatePowerupDisplay();invincibleFrames=INVINCIBLE_FRAMES;
    triggerShake(8,10);return;
  }
  lives--; updateHeartsDisplay();
  invincibleFrames=INVINCIBLE_FRAMES;
  triggerShake(10,12);
  if(lives<=0){playDie();showDeadScreen();}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: lives system — 3 hearts, invincibility flash, shield absorbs 1 hit"

# COMMIT 25 — Main update loop
$jsBase += @'

// ── Update ─────────────────────────────────────────────────
function update() {
  if(state!=="playing")return;
  frameCount++;
  if(doubleFlappedTimer>0){doubleFlappedTimer--;if(doubleFlappedTimer===0)doubleFlapped=false;}
  const grav=gravitySign*Math.abs(GRAVITY_NORMAL);
  birdVY+=grav; birdVY=Math.max(-14,Math.min(14,birdVY));
  if(activePowerup==="magnet"&&pipes.length>0){
    const np=pipes.find(p=>p.x+PIPE_WIDTH>BIRD_X);
    if(np){const gc=np.topH+PIPE_GAP/2;birdVY+=(gc-birdY)*0.015;}
  }
  birdY+=birdVY;
  if(birdY-BIRD_SIZE/2<0||birdY+BIRD_SIZE/2>H){handleBirdHit();if(state!=="playing")return;}
  if(activePowerup){powerupTimer--;if(powerupTimer<=0){activePowerup=null;powerupTimer=0;}updatePowerupDisplay();}
  pipeSpeed=pipeSpeed_for(score);
  if(pipes.length===0||W-pipes[pipes.length-1].x>=PIPE_SPAWN_DIST)spawnPipeAndItems();
  for(const p of pipes){
    p.x-=pipeSpeed;
    if(p.moving){p.movePhase+=0.015;const s=Math.sin(p.movePhase)*p.moveRange;p.topH=p.baseTopH+s;p.bottomY=p.topH+PIPE_GAP;}
    if(!p.scored&&p.x+PIPE_WIDTH<BIRD_X){p.scored=true;score++;combo++;updateScore();updateComboDisplay();playScore();spawnScoreParticles();if(score%10===0){showMilestone(`🔥 ${score}!`);triggerShake(4,5);}if(score>=10)unlockAchievement("decade");if(score>=25)unlockAchievement("speed_demon");if(score>=50)unlockAchievement("century");}
    if(birdCollidesWithPipe(p)){combo=0;updateComboDisplay();handleBirdHit();if(state!=="playing")return;}
  }
  pipes=pipes.filter(p=>p.x+PIPE_WIDTH>=0);
  for(const c of coins){c.x-=pipeSpeed;c.spinAngle+=0.08;if(!c.collected&&circleDist(BIRD_X,birdY,c.x,c.y,BIRD_SIZE/2+c.r)){c.collected=true;sessionCoins++;updateCoinsDisplay();playCoin();spawnScoreParticles();}}
  coins=coins.filter(c=>c.x>-20&&!c.collected);
  for(const pu of powerupItems){pu.x-=pipeSpeed;pu.bob+=0.06;if(!pu.collected&&circleDist(BIRD_X,birdY,pu.x,pu.y+Math.sin(pu.bob)*6,BIRD_SIZE/2+pu.r)){pu.collected=true;activePowerup=pu.type;powerupTimer=POWERUP_DURATION;updatePowerupDisplay();playPowerup();spawnPowerupBurst(pu.x,pu.y,pu.type);if(pu.type==="shield")unlockAchievement("invincible");}}
  powerupItems=powerupItems.filter(p=>p.x>-30&&!p.collected);
  if(invincibleFrames>0)invincibleFrames--;
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.alpha-=0.03;p.r*=0.97;if(p.alpha<=0)particles.splice(i,1);}
  cloudOffset=(cloudOffset+pipeSpeed*0.3)%W;
  hillOffset=(hillOffset+pipeSpeed*0.6)%W;
  starOffset=(starOffset+pipeSpeed*0.05)%W;
  if(shakeFrames>0){shakeFrames--;shakeAmount*=0.88;}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: main update loop — physics, pipes, coins, power-ups, particles, parallax"

# COMMIT 26 — Draw background + parallax stars
$jsBase += @'

// ── Draw: Background ───────────────────────────────────────
const STAR_POS=[[30,40],[80,100],[140,25],[200,80],[270,35],[320,90],[380,55],[420,130],[55,200],[110,150],[175,220],[245,170],[310,240],[395,180],[440,70],[15,300],[90,280],[160,340],[230,295],[300,360],[370,315],[435,250],[20,430],[100,460],[170,400],[240,470],[310,420],[390,480],[450,395]];
function drawBackground() {
  const sky=ctx.createLinearGradient(0,0,0,H);
  const c=getSkyColors(score);
  sky.addColorStop(0,c.top);sky.addColorStop(0.5,c.mid);sky.addColorStop(1,c.bottom);
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(255,255,255,0.7)";
  for(const[sx,sy]of STAR_POS){const sx2=((sx-starOffset%W)+W)%W;const fl=0.5+0.5*Math.sin((frameCount+sx*3)*0.04);ctx.globalAlpha=0.3+fl*0.5;ctx.fillRect(sx2,sy,1.5,1.5);}
  ctx.globalAlpha=1;
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: draw background — day/night gradient + twinkling parallax stars"

# COMMIT 27 — Draw: clouds parallax layer
$jsBase += @'

function drawClouds() {
  const cd=[[0.1,0.15,0.6],[0.35,0.12,0.45],[0.6,0.18,0.55],[0.82,0.1,0.5]];
  ctx.fillStyle="rgba(255,255,255,0.07)";
  for(const[xF,yF,sc]of cd){const cx=((xF*W-cloudOffset*0.3)%W+W)%W,cy=yF*H,r=sc*60;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.arc(cx+r*0.6,cy-r*0.3,r*0.7,0,Math.PI*2);ctx.arc(cx-r*0.5,cy-r*0.2,r*0.6,0,Math.PI*2);ctx.fill();}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: parallax cloud layer — 4 soft clouds scrolling at 30% pipe speed"

# COMMIT 28 — Draw: hills parallax layer
$jsBase += @'

function drawHills() {
  ctx.fillStyle="rgba(15,36,96,0.35)";ctx.beginPath();ctx.moveTo(0,H);
  const hw=W*0.6;
  for(let x=-hillOffset%hw;x<W+hw;x+=hw*0.5)ctx.quadraticCurveTo(x+hw*0.25,H-80,x+hw*0.5,H);
  ctx.lineTo(W,H);ctx.closePath();ctx.fill();
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: parallax hill layer — soft hills scrolling at 60% pipe speed"

# COMMIT 29 — Draw: pipes with moving indicator
$jsBase += @'

function drawPipe(p) {
  const pb=ctx.createLinearGradient(p.x,0,p.x+PIPE_WIDTH,0);
  if(gravitySign===1){pb.addColorStop(0,"#1b6b3a");pb.addColorStop(0.4,"#2ecc71");pb.addColorStop(1,"#145c30");}
  else{pb.addColorStop(0,"#6c1b6b");pb.addColorStop(0.4,"#c0392b");pb.addColorStop(1,"#5c1445");}
  const cH=20,cW=PIPE_WIDTH+10,cX=p.x-5;
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
  ctx.fillStyle=pb;rr(p.x,0,PIPE_WIDTH,p.topH-cH,0);ctx.fill();
  ctx.fillStyle=gravitySign===1?"#27ae60":"#e74c3c";rr(cX,p.topH-cH,cW,cH,6);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.12)";ctx.fillRect(p.x+6,0,8,p.topH);
  ctx.fillStyle=pb;rr(p.x,p.bottomY+cH,PIPE_WIDTH,H-p.bottomY-cH,0);ctx.fill();
  ctx.fillStyle=gravitySign===1?"#27ae60":"#e74c3c";rr(cX,p.bottomY,cW,cH,6);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.12)";ctx.fillRect(p.x+6,p.bottomY+cH,8,H);
  if(p.moving){ctx.strokeStyle="rgba(255,255,100,0.3)";ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(p.x+PIPE_WIDTH/2,p.topH+10);ctx.lineTo(p.x+PIPE_WIDTH/2,p.bottomY-10);ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=1;}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: draw pipes — gradient body, caps, shine, dashed indicator for moving pipes"

# COMMIT 30 — Draw: coins + power-up items
$jsBase += @'

function drawCoins() {
  for(const c of coins){ctx.save();ctx.translate(c.x,c.y);ctx.scale(Math.cos(c.spinAngle),1);const g=ctx.createRadialGradient(-c.r*0.3,-c.r*0.3,1,0,0,c.r);g.addColorStop(0,"#fff176");g.addColorStop(0.5,"#f9ca24");g.addColorStop(1,"#e67e22");ctx.shadowColor="#f9ca24";ctx.shadowBlur=12;ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,c.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,0.6)";ctx.beginPath();ctx.arc(-c.r*0.25,-c.r*0.25,c.r*0.35,0,Math.PI*2);ctx.fill();ctx.restore();}
}

const PU_COLORS={shield:"#74b9ff",slowmo:"#55efc4",magnet:"#fd79a8"};
const PU_ICONS ={shield:"🛡️",slowmo:"🐢",magnet:"🧲"};
function drawPowerupItems(){
  for(const pu of powerupItems){const by=Math.sin(pu.bob)*6;ctx.save();ctx.translate(pu.x,pu.y+by);const c=PU_COLORS[pu.type]||"#fff";ctx.shadowColor=c;ctx.shadowBlur=20;ctx.fillStyle=c+"33";ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,pu.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.font=`${pu.r*1.2}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(PU_ICONS[pu.type]||"?",0,1);ctx.restore();}
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: draw coins (spinning radial gradient) and power-up items (bobbing glow)"

# COMMIT 31 — Draw: bird with shield glow + magnet glow
$jsBase += @'

function drawBird() {
  const r=BIRD_SIZE/2,tilt=Math.max(-0.7,Math.min(0.7,birdVY*0.055));
  if(invincibleFrames>0&&Math.floor(invincibleFrames/5)%2===0)return;
  ctx.save();ctx.translate(BIRD_X,birdY);ctx.rotate(tilt);
  if(activePowerup==="shield"){ctx.shadowColor="#74b9ff";ctx.shadowBlur=30;ctx.strokeStyle="rgba(116,185,255,0.8)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r+8,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}
  if(activePowerup==="magnet"){ctx.shadowColor="#fd79a8";ctx.shadowBlur=20;}
  ctx.shadowColor=gravitySign===1?"rgba(249,202,36,0.7)":"rgba(255,107,107,0.7)";ctx.shadowBlur=18;
  ctx.fillStyle="#f9ca24";ctx.beginPath();ctx.ellipse(0,0,r,r*0.85,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  const wf=Math.sin(frameCount*0.25)*4;ctx.fillStyle="#f39c12";ctx.beginPath();ctx.ellipse(-4,wf,r*0.62,r*0.3,-0.35,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffeaa7";ctx.beginPath();ctx.ellipse(3,3,r*0.5,r*0.4,0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(r*0.38,-r*0.22,r*0.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2d3436";ctx.beginPath();ctx.arc(r*0.45,-r*0.18,r*0.16,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#e17055";ctx.beginPath();ctx.moveTo(r*0.72,-r*0.05);ctx.lineTo(r+6,r*0.12);ctx.lineTo(r*0.72,r*0.24);ctx.closePath();ctx.fill();
  if(gravitySign===-1){ctx.fillStyle="#a29bfe";for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*r*0.35,-r-4+Math.abs(i)*3,4,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: draw bird — invincibility blink, shield glow ring, magnet glow, crown"

# COMMIT 32 — Draw: particles + boundaries
$jsBase += @'

function drawParticles(){for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0,p.r),0,Math.PI*2);ctx.fill();ctx.restore();}}
function drawBoundaries(){ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=1;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(W,2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,H-2);ctx.lineTo(W,H-2);ctx.stroke();ctx.setLineDash([]);}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: draw particles (glowing circles) and boundary dashed lines"

# COMMIT 33 — Screen shake + idle bird
$jsBase += @'

// ── Idle Bird ──────────────────────────────────────────────
let idleBirdY=H/2,idleBirdVY=0;
function updateIdleBird(){idleBirdVY+=0.18;idleBirdY+=idleBirdVY;if(idleBirdY>H/2+15){idleBirdY=H/2+15;idleBirdVY=-2.8;}if(idleBirdY<H/2-15){idleBirdY=H/2-15;idleBirdVY=2.8;}}
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: idle bird floating animation for start and game-over screens"

# COMMIT 34 — Main loop + bootstrap
$jsBase += @'

// ── Main Loop ──────────────────────────────────────────────
function loop() {
  frameCount++;
  let sx=0,sy=0;
  if(shakeFrames>0){sx=(Math.random()-0.5)*shakeAmount;sy=(Math.random()-0.5)*shakeAmount;}
  ctx.save();ctx.translate(sx,sy);
  ctx.clearRect(-shakeAmount,-shakeAmount,W+shakeAmount*2,H+shakeAmount*2);
  drawBackground();drawClouds();drawHills();
  for(const p of pipes)drawPipe(p);
  drawCoins();drawPowerupItems();drawParticles();
  if(state==="playing"||state==="dead"){drawBird();}
  else{updateIdleBird();const sv=birdY;birdY=idleBirdY;drawBird();birdY=sv;}
  drawBoundaries();ctx.restore();
  update();requestAnimationFrame(loop);
}

// ── Bootstrap ──────────────────────────────────────────────
updateHeartsDisplay();showStartScreen();updateGravityIndicator();renderLeaderboard();loop();
'@
Set-Content -Path "$dir\game.js" -Value $jsBase -Encoding UTF8
Commit "feat: main render loop with screen shake transform + bootstrap"

Write-Host ""
Write-Host "🎉 All 34 commits created! Pushing to GitHub..."
git push origin main
Write-Host "✅ Pushed successfully to https://github.com/Suraj-kummar/Flappy-Fahh-game"
