/**
 * ============================================================
 *  TargetShooterGame — Neon Target Shooter
 *  Canvas ID : target-canvas   Size : 480 × 480
 *  Exports   : TargetShooterGame (global IIFE)
 * ============================================================
 */
const TargetShooterGame = (() => {

  // ─── Constants ───────────────────────────────────────────
  const W             = 480;
  const H             = 480;
  const GAME_DURATION = 30;          // seconds
  const MAX_MISSES    = 10;
  const MIN_TARGETS   = 2;
  const MAX_TARGETS   = 4;
  const LS_KEY        = 'best_target';

  // Target lifecycle phases
  const PHASE_GROW    = 'grow';
  const PHASE_SHRINK  = 'shrink';
  const PHASE_DEAD    = 'dead';

  // Size thresholds (radius in px) for scoring
  const R_MAX         = 52;   // max expanded radius
  const R_TINY        = 10;   // <= this -> 100 pts
  const R_SMALL       = 22;   // <= this -> 50 pts
  const R_MEDIUM      = 36;   // <= this -> 25 pts
  // > R_MEDIUM          -> 10 pts

  // Ring colours (outer -> inner)
  const RING_COLORS   = ['#ff6b6b', '#f9ca24', '#4ecca3', '#ffffff'];

  // ─── Module State ────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let mouseX = W / 2, mouseY = H / 2;

  let state      = 'start';   // 'start' | 'playing' | 'gameover'
  let score      = 0;
  let bestScore  = 0;
  let misses     = 0;
  let streak     = 0;         // consecutive hits without a miss
  let multiplier = 1;
  let timeLeft   = GAME_DURATION;
  let lastTimestamp = 0;
  let timerAccum    = 0;      // ms accumulator for 1-second timer ticks

  let targets    = [];        // active target objects
  let particles  = [];        // explosion / miss particles
  let floatTexts = [];        // score/MISS pop-up labels

  // ─── Bound event handler refs (for clean removal) ────────
  let boundClick, boundMove, boundKey;

  // ─── Target Factory ──────────────────────────────────────
  function makeTarget() {
    const margin = 60;
    const speed  = 0.12 + Math.random() * 0.22;  // radius change per ms
    return {
      x     : margin + Math.random() * (W - margin * 2),
      y     : 70 + Math.random() * (H - 70 - margin),
      r     : 3,
      maxR  : R_MAX - 10 + Math.random() * 20,
      speed,
      phase : PHASE_GROW,
      id    : Math.random(),
    };
  }

  // ─── Audio Helpers ───────────────────────────────────────
  function getAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, gain) {
    try {
      const ac  = getAudio();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      g.gain.setValueAtTime(gain || 0.25, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (duration || 0.12));
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + (duration || 0.12));
    } catch (_) {}
  }

  function playShotSound(points) {
    const freq = 300 + points * 4;
    playTone(freq, 'square', 0.1, 0.3);
    setTimeout(() => playTone(freq * 1.5, 'sine', 0.08, 0.15), 60);
  }

  function playMissSound() {
    playTone(160, 'sawtooth', 0.15, 0.2);
  }

  function playGameOverSound() {
    playTone(220, 'sawtooth', 0.3, 0.3);
    setTimeout(() => playTone(180, 'sawtooth', 0.3, 0.3), 200);
    setTimeout(() => playTone(140, 'sawtooth', 0.4, 0.3), 400);
  }

  function playStreakSound() {
    playTone(880, 'sine', 0.08, 0.3);
    setTimeout(() => playTone(1100, 'sine', 0.08, 0.3), 90);
  }

  // ─── Particle Helpers ────────────────────────────────────
  function spawnExplosion(x, y, color, count) {
    count = count || 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 1.5 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx      : Math.cos(angle) * speed,
        vy      : Math.sin(angle) * speed,
        r       : 3 + Math.random() * 4,
        alpha   : 1,
        color,
        life    : 0,
        maxLife : 500 + Math.random() * 300,
      });
    }
  }

  function spawnMissParticle(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x, y,
        vx      : Math.cos(angle) * (1 + Math.random() * 2),
        vy      : Math.sin(angle) * (1 + Math.random() * 2),
        r       : 2 + Math.random() * 2,
        alpha   : 1,
        color   : '#ff4444',
        life    : 0,
        maxLife : 350,
      });
    }
  }

  function spawnFloatText(x, y, text, color) {
    floatTexts.push({ x, y, text, color, alpha: 1, vy: -1.2, life: 0, maxLife: 900 });
  }

  // ─── Score / Streak ──────────────────────────────────────
  function computePoints(r) {
    if (r <= R_TINY)   return 100;
    if (r <= R_SMALL)  return 50;
    if (r <= R_MEDIUM) return 25;
    return 10;
  }

  function updateMultiplier() {
    if      (streak >= 8) multiplier = 4;
    else if (streak >= 5) multiplier = 3;
    else if (streak >= 3) multiplier = 2;
    else                  multiplier = 1;
  }

  // ─── Game Start / Reset ──────────────────────────────────
  function startGame() {
    score      = 0;
    misses     = 0;
    streak     = 0;
    multiplier = 1;
    timeLeft   = GAME_DURATION;
    timerAccum = 0;
    targets    = [];
    particles  = [];
    floatTexts = [];
    state      = 'playing';
    for (let i = 0; i < MIN_TARGETS + 1; i++) targets.push(makeTarget());
  }

  // ─── Hit Detection ───────────────────────────────────────
  function hitTest(x, y) {
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const dx = x - t.x, dy = y - t.y;
      if (Math.sqrt(dx * dx + dy * dy) <= t.r) return i;
    }
    return -1;
  }

  function onHit(idx) {
    const t      = targets[idx];
    const pts    = computePoints(t.r);
    streak++;
    updateMultiplier();
    const earned = pts * multiplier;
    score       += earned;

    const ringPct = t.r / t.maxR;
    let color = RING_COLORS[0];
    if      (ringPct < 0.25) color = RING_COLORS[3];
    else if (ringPct < 0.5)  color = RING_COLORS[2];
    else if (ringPct < 0.75) color = RING_COLORS[1];

    spawnExplosion(t.x, t.y, color, 18);
    playShotSound(pts);
    if (streak === 3 || streak === 5 || streak === 8) playStreakSound();

    const label = multiplier > 1 ? '+' + earned + ' x' + multiplier : '+' + earned;
    spawnFloatText(t.x, t.y - t.r - 10, label, color);

    targets.splice(idx, 1);
  }

  function onMiss(cx, cy) {
    misses++;
    streak     = 0;
    multiplier = 1;
    score      = Math.max(0, score - 5);
    spawnMissParticle(cx, cy);
    playMissSound();
    spawnFloatText(cx, cy - 18, 'MISS!', '#ff4444');
    if (misses >= MAX_MISSES) endGame();
  }

  function endGame() {
    state = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem(LS_KEY, bestScore); } catch (_) {}
    }
    playGameOverSound();
  }

  // ─── Event Handlers ──────────────────────────────────────
  function handleClick(e) {
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx     = (e.clientX - rect.left) * scaleX;
    const cy     = (e.clientY - rect.top)  * scaleY;

    if (state === 'start' || state === 'gameover') { startGame(); return; }
    if (state !== 'playing') return;

    const idx = hitTest(cx, cy);
    if (idx >= 0) onHit(idx);
    else          onMiss(cx, cy);
  }

  function handleMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top)  * (H / rect.height);
  }

  function handleKey(e) {
    if ((e.code === 'Space' || e.code === 'Enter') && state !== 'playing') {
      startGame();
    }
  }

  // ─── Update ──────────────────────────────────────────────
  function update(dt) {
    if (state !== 'playing') return;

    timerAccum += dt;
    if (timerAccum >= 1000) {
      timerAccum -= 1000;
      timeLeft--;
      if (timeLeft <= 0) { timeLeft = 0; endGame(); return; }
    }

    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      if (t.phase === PHASE_GROW) {
        t.r += t.speed * dt;
        if (t.r >= t.maxR) { t.r = t.maxR; t.phase = PHASE_SHRINK; }
      } else if (t.phase === PHASE_SHRINK) {
        t.r -= t.speed * dt;
        if (t.r <= 2) t.phase = PHASE_DEAD;
      }
      if (t.phase === PHASE_DEAD) targets.splice(i, 1);
    }

    while (targets.length < MIN_TARGETS) targets.push(makeTarget());
    if (targets.length < MAX_TARGETS && Math.random() < 0.004 * dt) targets.push(makeTarget());

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.06;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const f = floatTexts[i];
      f.life += dt;
      f.y    += f.vy;
      f.alpha = 1 - f.life / f.maxLife;
      if (f.life >= f.maxLife) floatTexts.splice(i, 1);
    }
  }

  // ─── Draw Helpers ────────────────────────────────────────
  function glow(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
  function noGlow() {
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawStarField() {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    let s = 42;
    function rng() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc(rng() * W, rng() * H, rng() * 1.2 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTarget(t) {
    const { x, y, r } = t;
    if (r < 1) return;
    const ringCount = 4;
    for (let i = ringCount - 1; i >= 0; i--) {
      const ringR = r * ((i + 1) / ringCount);
      const col   = RING_COLORS[ringCount - 1 - i];
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.fillStyle = col;
      glow(col, 8 + (ringCount - 1 - i) * 4);
      ctx.fill();
      noGlow();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
  }

  function drawParticles() {
    particles.forEach(function(p) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      glow(p.color, 8);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.r * p.alpha), 0, Math.PI * 2);
      ctx.fill();
      noGlow();
    });
    ctx.globalAlpha = 1;
  }

  function drawFloatTexts() {
    floatTexts.forEach(function(f) {
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.fillStyle   = f.color;
      glow(f.color, 12);
      ctx.font      = 'bold 13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      noGlow();
    });
    ctx.globalAlpha = 1;
  }

  function drawCrosshair(x, y, pulse) {
    const size  = 14 + (pulse || 0);
    const gap   = 5;
    const color = '#4ecca3';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    glow(color, 10);
    ctx.beginPath();
    ctx.moveTo(x - size, y); ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap,  y); ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size); ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap);  ctx.lineTo(x, y + size);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(78,204,163,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(x, y, size + 3, 0, Math.PI * 2);
    ctx.stroke();
    noGlow();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, 52);

    // Score
    ctx.textAlign = 'left';
    ctx.font      = '8px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SCORE', 14, 17);
    ctx.font      = '14px "Press Start 2P", monospace';
    glow('#f9ca24', 12);
    ctx.fillStyle = '#f9ca24';
    ctx.fillText(score, 14, 38);
    noGlow();

    // Multiplier
    if (multiplier > 1) {
      ctx.font      = '8px "Press Start 2P", monospace';
      glow('#4ecca3', 10);
      ctx.fillStyle = '#4ecca3';
      ctx.textAlign = 'center';
      ctx.fillText('x' + multiplier + ' STREAK!', W / 2, 32);
      noGlow();
    }

    // Timer
    ctx.textAlign = 'right';
    ctx.font      = '8px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('TIME', W - 14, 17);
    const tc = timeLeft <= 8 ? '#ff6b6b' : '#f9ca24';
    ctx.font      = '14px "Press Start 2P", monospace';
    glow(tc, timeLeft <= 8 ? 18 : 10);
    ctx.fillStyle = tc;
    ctx.fillText(timeLeft, W - 14, 38);
    noGlow();

    // Miss counter
    ctx.font      = '7px "Press Start 2P", monospace';
    const mc = misses >= MAX_MISSES - 3 ? '#ff6b6b' : '#ffaaaa';
    ctx.fillStyle   = mc;
    glow(mc, misses >= MAX_MISSES - 3 ? 10 : 0);
    ctx.fillText('MISS ' + misses + '/' + MAX_MISSES, W - 14, 52);
    noGlow();

    // Best
    ctx.textAlign = 'left';
    ctx.font      = '6px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(136,153,187,0.65)';
    ctx.fillText('BEST: ' + bestScore, 14, H - 8);
  }

  // ─── Screens ─────────────────────────────────────────────
  function drawStartScreen() {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);
    drawStarField();

    const t = Date.now() * 0.001;
    for (let i = 0; i < 3; i++) {
      const px = 100 + Math.sin(t * 0.7 + i * 2.1) * 130 + 130;
      const py = 130 + Math.cos(t * 0.5 + i * 1.8) * 80  + 80;
      ctx.globalAlpha = 0.35;
      drawCrosshair(px, py, Math.sin(t + i) * 2);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'center';
    ctx.font      = '20px "Press Start 2P", monospace';
    glow('#ff6b6b', 24);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('TARGET', W / 2, H / 2 - 82);
    glow('#f9ca24', 20);
    ctx.fillStyle = '#f9ca24';
    ctx.fillText('SHOOTER', W / 2, H / 2 - 52);
    noGlow();

    // Animated target
    const tr = 36 + Math.sin(t * 1.2) * 4;
    for (let i = 3; i >= 0; i--) {
      const cr  = tr * ((i + 1) / 4);
      const col = RING_COLORS[3 - i];
      ctx.beginPath();
      ctx.arc(W / 2, H / 2 + 8, cr, 0, Math.PI * 2);
      ctx.fillStyle = col;
      glow(col, 10);
      ctx.fill();
      noGlow();
    }

    ctx.font      = '7px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('CLICK TARGETS TO SCORE', W / 2, H / 2 + 72);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SMALLER TARGET = MORE POINTS', W / 2, H / 2 + 90);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('10 MISSES = GAME OVER  |  30 SEC TIMER', W / 2, H / 2 + 108);

    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.globalAlpha = pulse;
    ctx.font        = '9px "Press Start 2P", monospace';
    glow('#4ecca3', 16);
    ctx.fillStyle   = '#4ecca3';
    ctx.fillText('CLICK TO START', W / 2, H - 44);
    noGlow();
    ctx.globalAlpha = 1;

    if (bestScore > 0) {
      ctx.font      = '7px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(136,153,187,0.8)';
      ctx.fillText('BEST: ' + bestScore, W / 2, H - 22);
    }

    drawCrosshair(mouseX, mouseY, 0);
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(13,13,26,0.82)';
    ctx.fillRect(0, 0, W, H);

    const t = Date.now() * 0.001;

    ctx.textAlign = 'center';
    ctx.font      = '18px "Press Start 2P", monospace';
    glow('#ff6b6b', 24);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 100);
    noGlow();

    ctx.fillStyle   = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = 'rgba(249,202,36,0.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 130, H / 2 - 78, 260, 115, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font      = '8px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('FINAL SCORE', W / 2, H / 2 - 52);

    ctx.font      = '22px "Press Start 2P", monospace';
    glow('#f9ca24', 18);
    ctx.fillStyle = '#f9ca24';
    ctx.fillText(score, W / 2, H / 2 - 18);
    noGlow();

    if (score >= bestScore && score > 0) {
      ctx.font      = '8px "Press Start 2P", monospace';
      glow('#4ecca3', 14);
      ctx.fillStyle = '#4ecca3';
      ctx.fillText('NEW BEST!', W / 2, H / 2 + 14);
      noGlow();
    } else {
      ctx.font      = '8px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(136,153,187,0.75)';
      ctx.fillText('BEST: ' + bestScore, W / 2, H / 2 + 14);
    }

    ctx.font      = '7px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('MISSES: ' + misses + '    STREAK: ' + streak, W / 2, H / 2 + 44);

    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.globalAlpha = pulse;
    ctx.font        = '9px "Press Start 2P", monospace';
    glow('#4ecca3', 14);
    ctx.fillStyle   = '#4ecca3';
    ctx.fillText('CLICK TO PLAY AGAIN', W / 2, H / 2 + 100);
    noGlow();
    ctx.globalAlpha = 1;

    drawCrosshair(mouseX, mouseY, 0);
  }

  function drawPlayField(ts) {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);
    drawStarField();
    targets.forEach(drawTarget);
    drawParticles();
    drawFloatTexts();
    drawHUD();
    drawCrosshair(mouseX, mouseY, Math.sin(ts * 0.004) * 1.5);
  }

  // ─── Main Loop ───────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min(ts - lastTimestamp, 50);
    lastTimestamp = ts;
    update(dt);

    if      (state === 'start')    drawStartScreen();
    else if (state === 'playing')  drawPlayField(ts);
    else if (state === 'gameover') { drawPlayField(ts); drawGameOverScreen(); }
  }

  // ─── Public API ──────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('TargetShooterGame: canvas not found:', canvasId); return; }
    ctx = canvas.getContext('2d');

    try { bestScore = parseInt(localStorage.getItem(LS_KEY)) || 0; } catch (_) {}

    canvas.style.cursor = 'none';

    boundClick = handleClick;
    boundMove  = handleMove;
    boundKey   = handleKey;

    canvas.addEventListener('click',     boundClick);
    canvas.addEventListener('mousemove', boundMove);
    window.addEventListener('keydown',   boundKey);

    state         = 'start';
    lastTimestamp = performance.now();
    animId        = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas) {
      canvas.removeEventListener('click',     boundClick);
      canvas.removeEventListener('mousemove', boundMove);
      canvas.style.cursor = '';
    }
    window.removeEventListener('keydown', boundKey);
    if (audioCtx) {
      try { audioCtx.close(); } catch (_) {}
      audioCtx = null;
    }
    targets = []; particles = []; floatTexts = [];
    canvas = ctx = null;
  }

  return { init, destroy };

})();
