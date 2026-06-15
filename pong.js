// =========================================================
//  PONG — pong.js   (single-player: you vs AI)
//  Retro neon style, runs inside #pong-canvas
// =========================================================
"use strict";

const PongGame = (() => {

  let canvas, ctx, W, H;
  let animId = null;

  // ── Sizes (set on init) ──────────────────────────────────
  const PADDLE_W  = 10;
  const PADDLE_H  = 70;
  const BALL_R    = 8;
  const WIN_SCORE = 7;

  // ── State ────────────────────────────────────────────────
  let playerY, aiY, ballX, ballY, ballVX, ballVY;
  let playerScore, aiScore;
  let gameState; // "start" | "playing" | "over"
  let winner;
  let frameCount;
  let lastPaddleHit; // cooldown to prevent stuck ball

  // ── AI settings ──────────────────────────────────────────
  const AI_SPEED = 3.2;

  // ── Audio (Web Audio API) ────────────────────────────────
  let audioCtx;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, type = "square", dur = 0.08, vol = 0.15) {
    try {
      const ac   = getAudio();
      if (ac.state === "suspended") ac.resume();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur + 0.01);
    } catch (_) {}
  }

  // ── Trail ────────────────────────────────────────────────
  let trail = [];

  // ── Particles ────────────────────────────────────────────
  let particles = [];

  function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: Math.random() * 3 + 1,
        color,
      });
    }
  }

  // ── Reset helpers ─────────────────────────────────────────
  function resetBall(dir = 1) {
    ballX  = W / 2;
    ballY  = H / 2;
    const angle = (Math.random() * 0.5 - 0.25); // slight angle
    ballVX = dir * (4 + Math.random()) * Math.cos(angle);
    ballVY = (4 + Math.random()) * Math.sin(angle) * (Math.random() < 0.5 ? 1 : -1);
    trail  = [];
  }

  function resetGame() {
    playerY     = H / 2 - PADDLE_H / 2;
    aiY         = H / 2 - PADDLE_H / 2;
    playerScore = 0;
    aiScore     = 0;
    frameCount  = 0;
    lastPaddleHit = -100;
    particles   = [];
    trail       = [];
    resetBall(1);
  }

  // ── Input ─────────────────────────────────────────────────
  let mouseY = null;
  let keyUp   = false;
  let keyDown = false;

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.clientY - rect.top) * scaleY - PADDLE_H / 2;
  }

  function onTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.touches[0].clientY - rect.top) * scaleY - PADDLE_H / 2;
  }

  function onKeyDown(e) {
    if (e.code === "ArrowUp"   || e.code === "KeyW") { keyUp   = true; e.preventDefault(); }
    if (e.code === "ArrowDown" || e.code === "KeyS") { keyDown = true; e.preventDefault(); }
    if ((e.code === "Space" || e.code === "Enter") && gameState !== "playing") {
      e.preventDefault();
      startGame();
    }
  }

  function onKeyUp(e) {
    if (e.code === "ArrowUp"   || e.code === "KeyW") keyUp   = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keyDown = false;
  }

  function onClick() {
    if (gameState !== "playing") startGame();
  }

  // ── Game flow ─────────────────────────────────────────────
  function startGame() {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    else if (!audioCtx) getAudio();
    resetGame();
    gameState = "playing";
  }

  // ── Update ────────────────────────────────────────────────
  function update() {
    if (gameState !== "playing") return;
    frameCount++;

    // Player paddle
    const PLAYER_SPEED = 7;
    if (mouseY !== null) {
      playerY = mouseY;
    } else {
      if (keyUp)   playerY -= PLAYER_SPEED;
      if (keyDown) playerY += PLAYER_SPEED;
    }
    playerY = Math.max(0, Math.min(H - PADDLE_H, playerY));

    // AI paddle (tracks ball with imperfect reaction)
    const aiCenter = aiY + PADDLE_H / 2;
    const diff     = ballY - aiCenter;
    const aiMove   = Math.sign(diff) * Math.min(Math.abs(diff), AI_SPEED);
    aiY += aiMove;
    aiY = Math.max(0, Math.min(H - PADDLE_H, aiY));

    // Trail
    trail.push({ x: ballX, y: ballY });
    if (trail.length > 14) trail.shift();

    // Ball movement
    ballX += ballVX;
    ballY += ballVY;

    // Top / bottom wall bounce
    if (ballY - BALL_R < 0) {
      ballY  = BALL_R;
      ballVY = Math.abs(ballVY);
      beep(400, "square", 0.05);
    }
    if (ballY + BALL_R > H) {
      ballY  = H - BALL_R;
      ballVY = -Math.abs(ballVY);
      beep(400, "square", 0.05);
    }

    // Player paddle hit (left side)
    const pRight = PADDLE_W + 14;
    if (
      frameCount > lastPaddleHit + 5 &&
      ballX - BALL_R < pRight &&
      ballX + BALL_R > 14 &&
      ballY + BALL_R > playerY &&
      ballY - BALL_R < playerY + PADDLE_H
    ) {
      ballX = pRight + BALL_R;
