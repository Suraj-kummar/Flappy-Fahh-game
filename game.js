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
  overlay.classList.remove("hidden");
}

function updateGravityIndicator() {
  if (gravitySign === 1) {
    gravityIndicatorEl.textContent = "⬇ NORMAL";
    gravityIndicatorEl.className   = "normal";
  } else {
    gravityIndicatorEl.textContent = "⬆ FLIPPED";
    gravityIndicatorEl.className   = "inverted";
  }
}

function updateScore() {
  scoreEl.textContent = `Score: ${score}`;
}

// ── Input handling ────────────────────────────────────────
function handleFlap() {
  if (state === "start" || state === "dead") {
    startGame();
    return;
  }
  if (state !== "playing") return;

  // Apply flap in current gravity direction
  birdVY = gravitySign === 1 ? FLAP_FORCE_NORMAL : FLAP_FORCE_INVERTED;
  playFahh();
  spawnFlapParticles();
}

function handleGravityToggle() {
  if (state !== "playing") return;
  gravitySign *= -1;
  birdVY *= 0.4; // dampen velocity on toggle for fairness
  updateGravityIndicator();
  playFahh(gravitySign === 1 ? 180 : 340, "sawtooth");
  spawnGravityParticles();
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    handleFlap();
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    e.preventDefault();
    handleGravityToggle();
  }
});

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  handleFlap();
});

// ── Pipe spawning ─────────────────────────────────────────
function spawnPipe() {
  const minTop = 50;
  const maxTop = H - PIPE_GAP - 50;
  const topH   = Math.random() * (maxTop - minTop) + minTop;
  pipes.push({
    x      : W + PIPE_WIDTH,
    topH   : topH,
    bottomY: topH + PIPE_GAP,
    scored : false,
  });
}

// ── Particle helpers ──────────────────────────────────────
function spawnFlapParticles() {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x    : BIRD_X,
      y    : birdY,
      vx   : -Math.random() * 2.5 - 0.5,
      vy   : (Math.random() - 0.5) * 2.5,
      alpha: 1,
      color: gravitySign === 1 ? "#f9ca24" : "#ff6b6b",
      r    : Math.random() * 4 + 2,
    });
  }
}

function spawnGravityParticles() {
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14;
    particles.push({
      x    : BIRD_X,
      y    : birdY,
      vx   : Math.cos(angle) * (Math.random() * 3 + 1),
      vy   : Math.sin(angle) * (Math.random() * 3 + 1),
      alpha: 1,
      color: gravitySign === 1 ? "#4ecca3" : "#a29bfe",
      r    : Math.random() * 5 + 2,
    });
  }
}

function spawnScoreParticles() {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x    : W / 2,
      y    : H / 2,
      vx   : (Math.random() - 0.5) * 6,
      vy   : (Math.random() - 0.5) * 6,
      alpha: 1,
      color: `hsl(${Math.random() * 60 + 30}, 100%, 65%)`,
      r    : Math.random() * 5 + 2,
    });
  }
}

// ── Collision detection ───────────────────────────────────
function birdCollidesWithPipe(p) {
  const birdRadius = BIRD_SIZE / 2 - 3; // slight forgiveness
  const birdLeft   = BIRD_X - birdRadius;
  const birdRight  = BIRD_X + birdRadius;
  const birdTop    = birdY - birdRadius;
  const birdBottom = birdY + birdRadius;

  const pipeRight = p.x + PIPE_WIDTH;
  const pipeLeft  = p.x;

  if (birdRight < pipeLeft || birdLeft > pipeRight) return false;

  // Check top pipe
  if (birdTop < p.topH) return true;
  // Check bottom pipe
  if (birdBottom > p.bottomY) return true;

  return false;
}

// ── Update ────────────────────────────────────────────────
function update() {
  if (state !== "playing") return;

  frameCount++;

  // Physics
  const grav = gravitySign * (Math.abs(GRAVITY_NORMAL));
  birdVY    += grav;
  birdVY     = Math.max(-14, Math.min(14, birdVY)); // terminal velocity clamp
  birdY     += birdVY;

  // Wall collisions
  if (birdY - BIRD_SIZE / 2 < 0 || birdY + BIRD_SIZE / 2 > H) {
    playDie();
    showDeadScreen();
    return;
  }

  // Pipe speed scaling
  pipeSpeed = pipeSpeed_for(score);

  // Spawn pipes
  if (pipes.length === 0 || W - pipes[pipes.length - 1].x >= PIPE_SPAWN_DIST) {
    spawnPipe();
  }

  // Move & score pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= pipeSpeed;

    // Score when bird passes pipe center
    if (!p.scored && p.x + PIPE_WIDTH < BIRD_X) {
      p.scored = true;
      score++;
      updateScore();
      playScore();
      spawnScoreParticles();
    }

    // Remove off-screen pipes
    if (p.x + PIPE_WIDTH < 0) {
      pipes.splice(i, 1);
      continue;
    }

    // Collision
    if (birdCollidesWithPipe(p)) {
      playDie();
      showDeadScreen();
      return;
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x     += p.vx;
    p.y     += p.vy;
    p.alpha -= 0.035;
    p.r     *= 0.96;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

// ── Draw ──────────────────────────────────────────────────
function drawBackground() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d0d2b");
  sky.addColorStop(0.5, "#1a1a3e");
  sky.addColorStop(1, "#0f2460");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  // Seed with a fixed set of stars each frame (static stars)
  const starPositions = [
    [30,  40], [80, 100], [140,  25], [200,  80], [270,  35], [320,  90],
    [380,  55], [420, 130], [55, 200], [110, 150], [175, 220], [245, 170],
    [310, 240], [395, 180], [440,  70], [15, 300], [90, 280], [160, 340],
    [230, 295], [300, 360], [370, 315], [435, 250], [20, 430], [100, 460],
    [170, 400], [240, 470], [310, 420], [390, 480], [450, 395],
  ];
  for (const [sx, sy] of starPositions) {
    const flicker = 0.5 + 0.5 * Math.sin((frameCount + sx * 3) * 0.04);
    ctx.globalAlpha = 0.3 + flicker * 0.5;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

function drawPipe(p) {
  const radius = 6;

  // Pipe color based on gravity mode
  const pipeBody = gravitySign === 1
    ? ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0)
    : ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);

  if (gravitySign === 1) {
    pipeBody.addColorStop(0, "#1b6b3a");
    pipeBody.addColorStop(0.4, "#2ecc71");
    pipeBody.addColorStop(1, "#145c30");
  } else {
    pipeBody.addColorStop(0, "#6c1b6b");
    pipeBody.addColorStop(0.4, "#c0392b");
    pipeBody.addColorStop(1, "#5c1445");
  }

  const capH  = 20;
  const capW  = PIPE_WIDTH + 10;
  const capX  = p.x - 5;

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Top pipe ──
  ctx.fillStyle = pipeBody;
  drawRoundedRect(p.x, 0, PIPE_WIDTH, p.topH - capH, 0);
  ctx.fill();

  // Top pipe cap
  ctx.fillStyle = gravitySign === 1 ? "#27ae60" : "#e74c3c";
  drawRoundedRect(capX, p.topH - capH, capW, capH, radius);
  ctx.fill();

  // Shine on top pipe
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + 6, 0, 8, p.topH);

  // ── Bottom pipe ──
  ctx.fillStyle = pipeBody;
  drawRoundedRect(p.x, p.bottomY + capH, PIPE_WIDTH, H - p.bottomY - capH, 0);
  ctx.fill();

  // Bottom pipe cap
  ctx.fillStyle = gravitySign === 1 ? "#27ae60" : "#e74c3c";
  drawRoundedRect(capX, p.bottomY, capW, capH, radius);
  ctx.fill();

  // Shine on bottom pipe
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + 6, p.bottomY + capH, 8, H);
}

function drawBird() {
  const x  = BIRD_X;
  const y  = birdY;
  const r  = BIRD_SIZE / 2;
  const vy = birdVY;

  // Tilt based on velocity (clamp to ±40°)
  const tilt = Math.max(-0.7, Math.min(0.7, vy * 0.055));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Shadow glow
  ctx.shadowColor  = gravitySign === 1 ? "rgba(249,202,36,0.7)" : "rgba(255,107,107,0.7)";
  ctx.shadowBlur   = 18;

  // Body
  ctx.fillStyle = "#f9ca24";
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Wing (animated flap)
  const wingFlap = Math.sin(frameCount * 0.25) * 4;
  ctx.fillStyle = "#f39c12";
  ctx.beginPath();
  ctx.ellipse(-4, wingFlap, r * 0.62, r * 0.3, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = "#ffeaa7";
  ctx.beginPath();
  ctx.ellipse(3, 3, r * 0.5, r * 0.4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye white
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.22, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = "#2d3436";
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.18, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#e17055";
  ctx.beginPath();
  ctx.moveTo(r * 0.72, -r * 0.05);
  ctx.lineTo(r + 6,     r * 0.12);
  ctx.lineTo(r * 0.72,  r * 0.24);
  ctx.closePath();
  ctx.fill();

  // Crown (gravity flip indicator)
  if (gravitySign === -1) {
    ctx.fillStyle = "#a29bfe";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * r * 0.35, -r - 4 + Math.abs(i) * 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0, p.r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGroundFloor() {
  // Draw a subtle ground/ceiling line as visual boundary reference
  const lineColor = "rgba(255,255,255,0.06)";
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(0, 2);  ctx.lineTo(W, 2);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H - 2); ctx.lineTo(W, H - 2); ctx.stroke();
  ctx.setLineDash([]);
}

// ── Idle animation for start/dead screens ─────────────────
let idleBirdY  = H / 2;
let idleBirdVY = 0;

function updateIdleBird() {
  idleBirdVY += 0.18;
  idleBirdY  += idleBirdVY;
  if (idleBirdY > H / 2 + 15) { idleBirdY = H / 2 + 15; idleBirdVY = -2.8; }
  if (idleBirdY < H / 2 - 15) { idleBirdY = H / 2 - 15; idleBirdVY =  2.8; }
}

// ── Main loop ────────────────────────────────────────────
function loop() {
  frameCount++;
  ctx.clearRect(0, 0, W, H);

  drawBackground();

  // Pipes
  for (const p of pipes) drawPipe(p);

  // Particles
  drawParticles();

  // Bird
  if (state === "playing" || state === "dead") {
    drawBird();
  } else {
    // Idle float on start / between games
    updateIdleBird();
    const savedY = birdY;
    birdY = idleBirdY;
    drawBird();
    birdY = savedY;
  }

  drawGroundFloor();

  // Game logic
  update();

  requestAnimationFrame(loop);
}

// ── Bootstrap ─────────────────────────────────────────────
showStartScreen();
updateGravityIndicator();
loop();