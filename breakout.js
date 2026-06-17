// ============================================================
//  BreakoutGame — Classic Neon Breakout/Arkanoid for Fahh Arcade
//  Canvas: breakout-canvas (480 x 520)
//  Global: BreakoutGame
// ============================================================
const BreakoutGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const W = 480, H = 520;
  const PADDLE_W  = 80, PADDLE_H  = 12, PADDLE_Y = H - 40;
  const BALL_R    = 8;
  const BRICK_COLS = 10, BRICK_ROWS = 6;
  const BRICK_W   = 42, BRICK_H = 16;
  const BRICK_PAD = 4;
  const BRICK_OFF_X = (W - (BRICK_COLS * (BRICK_W + BRICK_PAD) - BRICK_PAD)) / 2;
  const BRICK_OFF_Y = 70;

  // Row colours + point values (bottom = lowest pts)
  const ROW_DEFS = [
    { color: '#ff6b6b', glow: '#ff6b6b', pts: 70 },   // row 0 — red
    { color: '#fd79a8', glow: '#fd79a8', pts: 60 },   // row 1 — pink
    { color: '#f9ca24', glow: '#f9ca24', pts: 50 },   // row 2 — gold
    { color: '#4ecca3', glow: '#4ecca3', pts: 40 },   // row 3 — cyan
    { color: '#74b9ff', glow: '#74b9ff', pts: 30 },   // row 4 — blue
    { color: '#a29bfe', glow: '#a29bfe', pts: 20 },   // row 5 — purple
  ];

  const POWERUP_TYPES = ['wide', 'multi', 'slow'];
  const POWERUP_COLORS = { wide: '#f9ca24', multi: '#4ecca3', slow: '#a29bfe' };

  const CLR = {
    bg     : '#0d0d1a',
    paddle  : '#4ecca3',
    paddleG : '#4ecca3',
    ball    : '#ffffff',
    ballG   : '#ffffff',
    text    : '#ffffff',
    dim     : '#555577',
    accent  : '#a29bfe',
    gold    : '#f9ca24',
    red     : '#ff6b6b',
    heart   : '#ff6b6b',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let gameState;   // 'start' | 'playing' | 'dead' | 'win'
  let score, bestScore, lives;
  let paddle;      // { x, w }
  let balls;       // array of { x, y, vx, vy, active }
  let bricks;      // array of { x, y, color, glow, pts, alive, hits }
  let powerups;    // array of { x, y, type, vy, active }
  let activePower; // { type, timer }
  let mouseX;
  let lastTs;
  let boundKeyDown, boundMouseMove, boundClick, boundTouch;
  let paddleNormalW;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playBounce() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sine'; osc.frequency.value = 480;
      g.gain.setValueAtTime(0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      osc.start(); osc.stop(ac.currentTime + 0.06);
    } catch(e) {}
  }

  function playBrick() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(300, ac.currentTime + 0.08);
      g.gain.setValueAtTime(0.2, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
      osc.start(); osc.stop(ac.currentTime + 0.1);
    } catch(e) {}
  }

  function playPowerup() {
    try {
      const ac = getAudio();
      [440, 554, 659, 880].forEach((f, i) => {
        const osc = ac.createOscillator(); const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'triangle'; osc.frequency.value = f;
        const t = ac.currentTime + i * 0.06;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
      });
    } catch(e) {}
  }

  function playDie() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ac.currentTime + 0.5);
      g.gain.setValueAtTime(0.28, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.start(); osc.stop(ac.currentTime + 0.5);
    } catch(e) {}
  }

  // ── Helpers ────────────────────────────────────────────────
  function loadBest() { bestScore = parseInt(localStorage.getItem('breakout_best') || '0', 10); }
  function saveBest()  { if (score > bestScore) { bestScore = score; localStorage.setItem('breakout_best', bestScore); } }

  function makeBricks() {
    const arr = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      const def = ROW_DEFS[r];
      for (let c = 0; c < BRICK_COLS; c++) {
        arr.push({
          x    : BRICK_OFF_X + c * (BRICK_W + BRICK_PAD),
          y    : BRICK_OFF_Y + r * (BRICK_H + BRICK_PAD),
          color: def.color,
          glow : def.glow,
          pts  : def.pts,
          alive: true,
          hits : r < 2 ? 2 : 1,   // top 2 rows need 2 hits
        });
      }
    }
    return arr;
  }

  function spawnBall(fromBall) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const spd = fromBall ? Math.hypot(fromBall.vx, fromBall.vy) : 4.5;
    return {
      x : fromBall ? fromBall.x : W / 2,
      y : fromBall ? fromBall.y : PADDLE_Y - BALL_R - 1,
      vx: spd * Math.cos(ang),
      vy: spd * Math.sin(ang),
      active: true,
    };
  }

  function initGame() {
    paddle       = { x: W / 2 - PADDLE_W / 2, w: PADDLE_W };
    paddleNormalW = PADDLE_W;
    balls        = [spawnBall(null)];
    bricks       = makeBricks();
    powerups     = [];
    activePower  = null;
    score        = 0;
    lives        = 3;
    gameState    = 'playing';
    lastTs       = null;
    mouseX       = W / 2;
  }

  // ── Collision helpers ──────────────────────────────────────
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function rectCircle(bx, by, bw, bh, cx, cy, cr) {
    const nearX = clamp(cx, bx, bx + bw);
    const nearY = clamp(cy, by, by + bh);
    const dx = cx - nearX, dy = cy - nearY;
    return dx * dx + dy * dy <= cr * cr;
  }

  // ── Update ─────────────────────────────────────────────────
  function update(dt) {
    const sec = dt / 1000;

    // Move paddle toward mouse/key
    paddle.x = clamp(mouseX - paddle.w / 2, 0, W - paddle.w);

    // Active power timer
    if (activePower) {
      activePower.timer -= dt;
      if (activePower.timer <= 0) {
        deactivatePower();
      }
    }

    // Update powerups
    for (const p of powerups) {
      if (!p.active) continue;
      p.y += p.vy * sec * 60;
      // Collect?
      if (p.y + 10 >= PADDLE_Y && p.y <= PADDLE_Y + PADDLE_H &&
          p.x + 12 >= paddle.x && p.x <= paddle.x + paddle.w) {
        p.active = false;
        activatePower(p.type);
        playPowerup();
      }
      // Off screen
      if (p.y > H) p.active = false;
    }

    // Update balls
    let anyActive = false;
    for (const b of balls) {
      if (!b.active) continue;
      anyActive = true;
      const spd  = activePower && activePower.type === 'slow' ? 0.55 : 1;
      b.x += b.vx * spd;
      b.y += b.vy * spd;

      // Wall bounces
      if (b.x - BALL_R <= 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); playBounce(); }
      if (b.x + BALL_R >= W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); playBounce(); }
      if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); playBounce(); }

      // Paddle hit
      if (b.vy > 0 &&
          b.x + BALL_R >= paddle.x && b.x - BALL_R <= paddle.x + paddle.w &&
          b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H) {
        const hit  = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const ang  = hit * (Math.PI / 3);
        const spd2 = Math.hypot(b.vx, b.vy);
        b.vy = -Math.abs(spd2 * Math.cos(ang));
        b.vx = spd2 * Math.sin(ang);
        b.y  = PADDLE_Y - BALL_R - 1;
        playBounce();
      }

      // Off bottom — lose ball
      if (b.y - BALL_R > H) {
        b.active = false;
      }

      // Brick collisions
      for (const brick of bricks) {
        if (!brick.alive) continue;
        if (!rectCircle(brick.x, brick.y, BRICK_W, BRICK_H, b.x, b.y, BALL_R)) continue;

        // Which side?
        const fromLeft  = b.x < brick.x;
        const fromRight = b.x > brick.x + BRICK_W;
        const fromTop   = b.y < brick.y;
        const fromBot   = b.y > brick.y + BRICK_H;

        if (fromLeft || fromRight) b.vx = -b.vx;
        else                       b.vy = -b.vy;

        brick.hits--;
        if (brick.hits <= 0) {
          brick.alive = false;
          score += brick.pts;
          // Chance to drop power-up
          if (Math.random() < 0.18) {
            powerups.push({
              x    : brick.x + BRICK_W / 2 - 12,
              y    : brick.y,
              type : POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
              vy   : 2,
              active: true,
            });
          }
          playBrick();
        } else {
          // Darken hit brick
          brick.color = shiftColor(brick.color);
        }
        break;
      }
    }

    // Check win
    if (bricks.every(b => !b.alive)) {
      gameState = 'win';
      saveBest();
      return;
    }

    // All balls gone
    if (!anyActive) {
      lives--;
      if (lives <= 0) {
        gameState = 'dead';
        saveBest();
        playDie();
      } else {
        balls = [spawnBall(null)];
        playDie();
      }
    }
  }

  function shiftColor(hex) {
    // Make a slightly darker version for 2-hit bricks after first hit
    return hex.replace(/^#/, '#55') ; // quick dim trick
  }

  function activatePower(type) {
    deactivatePower();
    activePower = { type, timer: 10000 };
    if (type === 'wide') {
      paddle.w = Math.min(W - 20, paddleNormalW * 1.8);
    } else if (type === 'multi') {
      const existing = balls.filter(b => b.active);
      existing.forEach(b => {
        balls.push(spawnBall(b));
        balls.push(spawnBall(b));
      });
    }
  }

  function deactivatePower() {
    if (!activePower) return;
    if (activePower.type === 'wide') paddle.w = paddleNormalW;
    activePower = null;
  }

  // ── Drawing ────────────────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBricks() {
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = b.glow;
      ctx.fillStyle   = b.hits <= 1 && ROW_DEFS[0].pts > b.pts ? 'rgba(0,0,0,0.3)' : b.color;
      ctx.fillStyle   = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 3);
      ctx.fill();
      // Cracked look for 2-hit bricks after first hit
      ctx.restore();
    }
  }

  function drawPaddle() {
    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = CLR.paddleG;
    ctx.fillStyle   = CLR.paddle;
    ctx.beginPath();
    ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, PADDLE_H, 6);
    ctx.fill();
    ctx.restore();
  }

  function drawBalls() {
    for (const b of balls) {
      if (!b.active) continue;
      ctx.save();
      ctx.shadowBlur  = 16;
      ctx.shadowColor = CLR.ballG;
      ctx.fillStyle   = CLR.ball;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPowerups() {
    for (const p of powerups) {
      if (!p.active) continue;
      const c = POWERUP_COLORS[p.type];
      ctx.save();
      ctx.shadowBlur  = 12;
      ctx.shadowColor = c;
      ctx.fillStyle   = c;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, 24, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#0d0d1a';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.type[0].toUpperCase(), p.x + 12, p.y + 14);
      ctx.restore();
    }
  }

  function drawHUD() {
    // Hearts
    const heartStr = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
    ctx.fillStyle = CLR.heart;
    ctx.font      = '18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(heartStr, 8, 28);

    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCORE: ' + score, W / 2, 28);

    ctx.fillStyle = CLR.gold;
    ctx.font      = '13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BEST: ' + bestScore, W - 8, 28);

    // Active power indicator
    if (activePower) {
      ctx.fillStyle = POWERUP_COLORS[activePower.type];
      ctx.font      = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(activePower.type.toUpperCase() + ' ' + Math.ceil(activePower.timer / 1000) + 's', W / 2, 48);
    }
  }

  function drawOverlay(title, sub, titleColor, titleGlow) {
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = titleGlow;
    ctx.fillStyle   = titleColor;
    ctx.font        = 'bold 42px monospace';
    ctx.fillText(title, W / 2, H / 2 - 70);
    ctx.restore();

    if (sub) {
      ctx.fillStyle = CLR.text;
      ctx.font      = '16px monospace';
      ctx.fillText(sub, W / 2, H / 2 - 30);
    }

    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 18px monospace';
    ctx.fillText('Score: ' + score, W / 2, H / 2 + 10);
    ctx.fillStyle = CLR.gold;
    ctx.font      = 'bold 15px monospace';
    ctx.fillText('Best:  ' + bestScore, W / 2, H / 2 + 38);

    ctx.fillStyle = CLR.accent;
    ctx.font      = 'bold 14px monospace';
    ctx.fillText('SPACE, CLICK or TAP to ' + (title === 'BREAKOUT' ? 'START' : 'RESTART'), W / 2, H / 2 + 78);
  }

  // ── Main Loop ──────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    drawBg();

    if (gameState === 'start') {
      drawOverlay('BREAKOUT', 'Mouse or Arrow Keys', CLR.paddle, CLR.paddle);
      return;
    }

    if (gameState === 'dead') {
      drawBricks(); drawPowerups(); drawPaddle(); drawBalls(); drawHUD();
      drawOverlay('GAME OVER', null, CLR.red, CLR.red);
      return;
    }

    if (gameState === 'win') {
      drawHUD();
      drawOverlay('YOU WIN!', 'All bricks destroyed!', CLR.gold, CLR.gold);
      return;
    }

    // playing
    if (!lastTs) lastTs = ts;
    const dt = Math.min(ts - lastTs, 50);
    lastTs   = ts;
    update(dt);

    drawBricks();
    drawPowerups();
    drawPaddle();
    drawBalls();
    drawHUD();
  }

  // ── Input ──────────────────────────────────────────────────
  let keysDown = {};

  function onKeyDown(e) {
    keysDown[e.key] = true;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleAction(); return;
    }
    if (gameState !== 'playing') return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); mouseX = Math.max(paddle.w / 2, mouseX - 20); }
    if (e.key === 'ArrowRight') { e.preventDefault(); mouseX = Math.min(W - paddle.w / 2, mouseX + 20); }
  }

  function onKeyUp(e) { keysDown[e.key] = false; }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  }

  function handleAction() {
    if (gameState === 'start' || gameState === 'dead' || gameState === 'win') initGame();
  }

  let boundKeyUp;

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    loadBest();
    gameState = 'start';
    score = 0; lives = 3;
    mouseX = W / 2;

    boundKeyDown  = onKeyDown;
    boundKeyUp    = onKeyUp;
    boundMouseMove = onMouseMove;
    boundClick    = () => handleAction();
    boundTouch    = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      if (gameState !== 'playing') handleAction();
    };

    window.addEventListener('keydown', boundKeyDown);
    window.addEventListener('keyup',   boundKeyUp);
    canvas.addEventListener('mousemove', boundMouseMove);
    canvas.addEventListener('click',     boundClick);
    canvas.addEventListener('touchstart', boundTouch, { passive: false });
    canvas.addEventListener('touchmove',  (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
    }, { passive: false });

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('keydown', boundKeyDown);
    window.removeEventListener('keyup',   boundKeyUp);
    if (canvas) {
      canvas.removeEventListener('mousemove', boundMouseMove);
      canvas.removeEventListener('click',     boundClick);
      canvas.removeEventListener('touchstart', boundTouch);
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  }

  return { init, destroy };
})();

// arcade-hub: collision registered

// arcade-hub: power-ups registered
