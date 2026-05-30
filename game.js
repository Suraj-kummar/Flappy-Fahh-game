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

function startGame() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  resetGame(); state = "playing";
  overlay.classList.add("hidden"); lbPanel.classList.add("hidden");
  startMusic(); unlockAchievement("first_flight");
}

function showStartScreen() {
  state = "start";
  overlayTitle.textContent = "🐔 FLAPPY FAHH"; overlayTitle.className = "start";
  overlayScore.textContent = "";
  overlayBest.textContent = bestScore > 0 ? "Best: " + bestScore : "";
  overlayHint.textContent = "Press SPACE or tap to start";
  overlayAchievements.innerHTML = ""; overlayLeaderboard.innerHTML = "";
  if (shareBtn) shareBtn.style.display = "none";
  overlay.classList.remove("hidden"); renderLeaderboard(); stopMusic();
}

function showDeadScreen() {
  state = "dead"; stopMusic();
  const isNewBest = score > bestScore;
  if (isNewBest) {
    bestScore = score; localStorage.setItem("fahh_best", bestScore);
    const name = prompt("🎉 New High Score: " + score + "!\nEnter your name (3 letters):", "AAA") || "???";
    addToLeaderboard(name.slice(0, 3).toUpperCase(), score);
  }
  totalCoins += sessionCoins; localStorage.setItem("fahh_total_coins", totalCoins);
  if (totalCoins >= 20) unlockAchievement("coin_hoarder");
  if (score >= 10) unlockAchievement("decade");
  if (score >= 25) unlockAchievement("speed_demon");
  if (score >= 50) unlockAchievement("century");
  if (gravityFlipCount >= 10) unlockAchievement("gravity_master");
  overlayTitle.textContent = isNewBest ? "NEW BEST! 🏆" : "FAHH! 💀";
  overlayTitle.className = isNewBest ? "new-best" : "dead";
  overlayScore.textContent = "Score: " + score + "  🪙 " + sessionCoins + " coins";
  overlayBest.textContent = "Best: " + bestScore;
  overlayHint.textContent = "Press SPACE or tap to play again";
  const defs = ACHIEVEMENT_DEFS.filter(a => [...unlockedAchievements].includes(a.id));
  overlayAchievements.innerHTML = defs.length ? '<div class="ach-row">' + defs.map(a => '<span title="' + a.name + '">' + a.icon + '</span>').join("") + '</div>' : "";
  const lb = getLeaderboard();
  if (lb.length) overlayLeaderboard.innerHTML = '<div class="lb-title">🏆 Top Scores</div>' + lb.slice(0,3).map((e,i)=>'<div class="lb-row-sm">'+["🥇","🥈","🥉"][i]+" "+e.name+" — "+e.score+"</div>").join("");
  if (shareBtn) {
    shareBtn.style.display = "block";
    shareBtn.onclick = () => {
      navigator.clipboard.writeText("🐔 Flappy Fahh Score: " + score + " | Coins: " + sessionCoins + " | Best: " + bestScore)
        .then(() => { shareBtn.textContent = "✅ Copied!"; setTimeout(() => shareBtn.textContent = "📋 Share Score", 2000); });
    };
  }
  overlay.classList.remove("hidden"); triggerShake(12, 18);
}

// ── Input ──────────────────────────────────────────────────
function handleFlap() {
  if (state === "start" || state === "dead") { startGame(); return; }
  if (state !== "playing") return;
  if (!doubleFlapped) {
    birdVY = gravitySign === 1 ? FLAP_FORCE_NORMAL : FLAP_FORCE_INVERTED;
    doubleFlapped = true; doubleFlappedTimer = DOUBLE_FLAP_RESET;
  } else {
    birdVY = gravitySign === 1 ? FLAP_FORCE_NORMAL * 0.6 : FLAP_FORCE_INVERTED * 0.6;
  }
  const rate = 0.9 + (pipeSpeed - PIPE_SPEED_INIT) / (PIPE_SPEED_MAX - PIPE_SPEED_INIT) * 0.4;
  playFahh(rate); spawnFlapParticles();
}

function handleGravityToggle() {
  if (state !== "playing") return;
  gravitySign *= -1; birdVY *= 0.4; gravityFlipCount++;
  updateGravityIndicator();
  playFahh(gravitySign === 1 ? 1.0 : 0.75);
  spawnGravityParticles();
}
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); handleFlap(); }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); handleGravityToggle(); }
});
canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); handleFlap(); });
if (lbToggleBtn) lbToggleBtn.addEventListener("click", () => { lbPanel.classList.toggle("hidden"); renderLeaderboard(); });

// ── Spawning ───────────────────────────────────────────────
function spawnPipeAndItems() {
  const minTop = 50, maxTop = H - PIPE_GAP - 50;
  const topH = Math.random() * (maxTop - minTop) + minTop;
  const movingPipe = score > 15 && Math.random() < 0.5;
  pipes.push({
    x: W + PIPE_WIDTH, topH, bottomY: topH + PIPE_GAP, baseTopH: topH, scored: false,
    moving: movingPipe, moveDir: Math.random() < 0.5 ? 1 : -1,
    moveSpeed: 0.4 + Math.random() * 0.4, moveRange: 30 + Math.random() * 20,
    movePhase: Math.random() * Math.PI * 2,
  });
  // Coin in gap
  if (Math.random() < 0.6) {
    coins.push({ x: W + PIPE_WIDTH + PIPE_SPAWN_DIST / 2, y: topH + PIPE_GAP / 2 + (Math.random() - 0.5) * (PIPE_GAP * 0.4), collected: false, r: 10, spinAngle: 0 });
  }
  // Power-up
  if (Math.random() < 0.18) {
    const types = ["shield", "slowmo", "magnet"];
    powerupItems.push({ x: W + PIPE_WIDTH + 60, y: topH + PIPE_GAP / 2 + (Math.random() - 0.5) * 40, type: types[Math.floor(Math.random() * types.length)], collected: false, r: 14, bob: Math.random() * Math.PI * 2 });
  }
}

// ── Particles ──────────────────────────────────────────────
function spawnFlapParticles() {
  for (let i = 0; i < 6; i++) particles.push({ x: BIRD_X, y: birdY, vx: -Math.random()*2.5-0.5, vy: (Math.random()-0.5)*2.5, alpha: 1, color: gravitySign===1?"#f9ca24":"#ff6b6b", r: Math.random()*4+2 });
}
function spawnGravityParticles() {
  for (let i = 0; i < 14; i++) { const a = (Math.PI*2*i)/14; particles.push({ x: BIRD_X, y: birdY, vx: Math.cos(a)*(Math.random()*3+1), vy: Math.sin(a)*(Math.random()*3+1), alpha: 1, color: gravitySign===1?"#4ecca3":"#a29bfe", r: Math.random()*5+2 }); }
}
function spawnScoreParticles() {
  for (let i = 0; i < 20; i++) particles.push({ x: W/2, y: H/2, vx: (Math.random()-0.5)*7, vy: (Math.random()-0.5)*7, alpha: 1, color: "hsl("+(Math.random()*60+30)+",100%,65%)", r: Math.random()*5+3 });
}
function spawnPowerupBurst(x, y, type) {
  const colors = { shield: "#74b9ff", slowmo: "#55efc4", magnet: "#fd79a8" };
  const c = colors[type] || "#fff";
  for (let i = 0; i < 30; i++) { const a = (Math.PI*2*i)/30, s = Math.random()*5+2; particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, alpha: 1, color: c, r: Math.random()*6+2 }); }
}

// ── Collision ──────────────────────────────────────────────
function circleRect(cx,cy,cr,rx,ry,rw,rh){const nx=Math.max(rx,Math.min(cx,rx+rw)),ny=Math.max(ry,Math.min(cy,ry+rh));return(cx-nx)**2+(cy-ny)**2<cr*cr;}
function birdCollidesWithPipe(p){const r=BIRD_SIZE/2-3;return circleRect(BIRD_X,birdY,r,p.x,0,PIPE_WIDTH,p.topH)||circleRect(BIRD_X,birdY,r,p.x,p.bottomY,PIPE_WIDTH,H-p.bottomY);}
function circleDist(ax,ay,bx,by,sr){return(ax-bx)**2+(ay-by)**2<sr*sr;}

// ── Lives System ───────────────────────────────────────────
function handleBirdHit() {
  if (invincibleFrames > 0) return;
  if (activePowerup === "shield" && !shieldHit) {
    shieldHit = true; activePowerup = null; powerupTimer = 0;
    updatePowerupDisplay(); invincibleFrames = INVINCIBLE_FRAMES; triggerShake(8, 10); return;
  }
  lives--; updateHeartsDisplay();
  invincibleFrames = INVINCIBLE_FRAMES; triggerShake(10, 12);
  if (lives <= 0) { playDie(); showDeadScreen(); }
}

// ── Update ─────────────────────────────────────────────────
function update() {
  if (state !== "playing") return;
  frameCount++;
  if (doubleFlappedTimer > 0) { doubleFlappedTimer--; if (doubleFlappedTimer === 0) doubleFlapped = false; }
  const grav = gravitySign * Math.abs(GRAVITY_NORMAL);
  birdVY += grav; birdVY = Math.max(-14, Math.min(14, birdVY));
  if (activePowerup === "magnet" && pipes.length > 0) {
    const np = pipes.find(p => p.x + PIPE_WIDTH > BIRD_X);
    if (np) { const gc = np.topH + PIPE_GAP / 2; birdVY += (gc - birdY) * 0.015; }
  }
  birdY += birdVY;
  if (birdY - BIRD_SIZE/2 < 0 || birdY + BIRD_SIZE/2 > H) { handleBirdHit(); if (state !== "playing") return; }
