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
      // Angle based on where ball hits paddle
      const rel   = (ballY - (playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = rel * 0.9; // max ±~52°
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.07;
      ballVX =  Math.abs(speed * Math.cos(angle));
      ballVY =  speed * Math.sin(angle);
      // Cap speed
      const maxSpeed = 12;
      const s = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
      if (s > maxSpeed) { ballVX *= maxSpeed/s; ballVY *= maxSpeed/s; }
      lastPaddleHit = frameCount;
      beep(600, "square", 0.07, 0.2);
      spawnHitParticles(ballX, ballY, "#4ecca3");
    }

    // AI paddle hit (right side)
    const aiLeft = W - PADDLE_W - 14;
    if (
      frameCount > lastPaddleHit + 5 &&
      ballX + BALL_R > aiLeft &&
      ballX - BALL_R < aiLeft + PADDLE_W &&
      ballY + BALL_R > aiY &&
      ballY - BALL_R < aiY + PADDLE_H
    ) {
      ballX = aiLeft - BALL_R;
      const rel   = (ballY - (aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = rel * 0.9;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.03;
      ballVX = -Math.abs(speed * Math.cos(angle));
      ballVY =  speed * Math.sin(angle);
      const maxSpeed = 12;
      const s = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
      if (s > maxSpeed) { ballVX *= maxSpeed/s; ballVY *= maxSpeed/s; }
      lastPaddleHit = frameCount;
      beep(350, "square", 0.07, 0.15);
      spawnHitParticles(ballX, ballY, "#ff6b6b");
    }

    // Scoring
    if (ballX - BALL_R < 0) {
      aiScore++;
      beep(180, "sawtooth", 0.3, 0.25);
      if (aiScore >= WIN_SCORE) { gameState = "over"; winner = "ai"; return; }
      resetBall(1);
    }
    if (ballX + BALL_R > W) {
      playerScore++;
      beep(880, "sine", 0.2, 0.2);
      if (playerScore >= WIN_SCORE) { gameState = "over"; winner = "player"; return; }
      resetBall(-1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.05; p.r *= 0.94;
      if (p.alpha <= 0) particles.splice(i, 1);
    }
  }

  // ── Draw ──────────────────────────────────────────────────
  function draw() {
    // Background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score display
    ctx.font = "bold 48px 'Press Start 2P', monospace";
    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(78,204,163,0.25)";
    ctx.fillText(playerScore, W / 4, 70);
    ctx.fillStyle = "rgba(255,107,107,0.25)";
    ctx.fillText(aiScore, (W * 3) / 4, 70);

    ctx.fillStyle = "rgba(78,204,163,0.9)";
    ctx.fillText(playerScore, W / 4, 68);
    ctx.fillStyle = "rgba(255,107,107,0.9)";
    ctx.fillText(aiScore, (W * 3) / 4, 68);

    // Labels
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText("YOU", W / 4, 88);
    ctx.fillText("CPU", (W * 3) / 4, 88);

    // Ball trail
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const alpha = (i / trail.length) * 0.4;
      const radius = BALL_R * (i / trail.length) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#4ecca3";
      ctx.shadowColor = "#4ecca3";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0.5, radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Ball
    ctx.save();
    ctx.shadowColor = "#74b9ff";
    ctx.shadowBlur  = 20;
    ctx.fillStyle   = "#fff";
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Player paddle
    ctx.save();
    ctx.shadowColor = "#4ecca3";
    ctx.shadowBlur  = 18;
    const pg = ctx.createLinearGradient(14, playerY, 14 + PADDLE_W, playerY);
    pg.addColorStop(0, "#4ecca3");
    pg.addColorStop(1, "#00b894");
    ctx.fillStyle = pg;
    roundRect(ctx, 14, playerY, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.restore();

    // AI paddle
    ctx.save();
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur  = 18;
    const ag = ctx.createLinearGradient(W - 14 - PADDLE_W, aiY, W - 14, aiY);
    ag.addColorStop(0, "#e74c3c");
    ag.addColorStop(1, "#ff6b6b");
    ctx.fillStyle = ag;
    roundRect(ctx, W - 14 - PADDLE_W, aiY, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.restore();

    // Particles
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

    // Overlay screens
    if (gameState === "start" || gameState === "over") {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.textAlign = "center";
      if (gameState === "start") {
        ctx.font = "bold 20px 'Press Start 2P', monospace";
        ctx.fillStyle = "#4ecca3";
        ctx.shadowColor = "#4ecca3";
        ctx.shadowBlur = 20;
        ctx.fillText("PONG", W / 2, H / 2 - 60);

        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.shadowBlur = 0;
        ctx.fillText("MOUSE / W+S / ARROW KEYS", W / 2, H / 2 - 20);
        ctx.fillText("FIRST TO " + WIN_SCORE + " WINS", W / 2, H / 2 + 5);

        drawBlinkText("CLICK OR PRESS SPACE", W / 2, H / 2 + 55, "#4ecca3");

      } else if (gameState === "over") {
        const isWin = winner === "player";
        const titleText = isWin ? "YOU WIN!" : "GAME OVER";
        const titleColor = isWin ? "#f9ca24" : "#ff6b6b";

        ctx.font = "bold 18px 'Press Start 2P', monospace";
        ctx.fillStyle = titleColor;
        ctx.shadowColor = titleColor;
        ctx.shadowBlur = 24;
        ctx.fillText(titleText, W / 2, H / 2 - 55);

        ctx.shadowBlur = 0;
        ctx.font = "12px 'Press Start 2P', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(playerScore + "  —  " + aiScore, W / 2, H / 2 - 15);

        drawBlinkText("CLICK OR PRESS SPACE", W / 2, H / 2 + 45, titleColor);

        // Update best score in localStorage
        if (isWin) {
          const best = parseInt(localStorage.getItem("pong_best") || "0");
          if (playerScore > best) localStorage.setItem("pong_best", playerScore);
        }
      }
    }
  }

  let _blinkOn = true;
  function drawBlinkText(text, x, y, color) {
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
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

  // ── Main loop ─────────────────────────────────────────────
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // ── Public API ────────────────────────────────────────────
  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext("2d");
    W = canvas.width;
    H = canvas.height;

    gameState   = "start";
    playerScore = 0;
    aiScore     = 0;
    mouseY      = null;
    keyUp = keyDown = false;
    particles   = [];
    trail       = [];
    resetBall(1);
    playerY = H / 2 - PADDLE_H / 2;
    aiY     = H / 2 - PADDLE_H / 2;
    frameCount = 0;
    lastPaddleHit = -100;

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    if (!canvas) return;
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup",   onKeyUp);
  }

  return { init, destroy };
})();
