/**
 * ============================================================
 *  WhackAMoleGame — Retro Arcade Whack-a-Mole
 *  Canvas ID : mole-canvas   Size : 420 × 500
 *  Exports   : WhackAMoleGame  (global IIFE)
 * ============================================================
 */
const WhackAMoleGame = (() => {

  // ─── Constants ───────────────────────────────────────────
  const CANVAS_W     = 420;
  const CANVAS_H     = 500;
  const GRID_COLS    = 3;
  const GRID_ROWS    = 3;
  const HOLE_COUNT   = GRID_COLS * GRID_ROWS;
  const GAME_DURATION = 60;          // seconds
  const MAX_MOLES_UP  = 3;
  const GOLDEN_CHANCE = 0.12;        // 12 % chance a new mole is golden
  const LS_KEY        = 'whackamole_best';

  // Hole layout — centred in a 420-wide canvas, top area reserved for HUD
  const HUD_H        = 80;
  const HOLE_R       = 42;           // radius of the ellipse (x-axis)
  const HOLE_RY      = 18;           // radius of the ellipse (y-axis)
  const MOLE_W       = 60;
  const MOLE_H       = 56;

  // Compute hole centres
  const COL_SPACING  = CANVAS_W / GRID_COLS;
  const ROW_SPACING  = (CANVAS_H - HUD_H - 20) / GRID_ROWS;
  const HOLES = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      HOLES.push({
        x: COL_SPACING * c + COL_SPACING / 2,
        y: HUD_H + ROW_SPACING * r + ROW_SPACING * 0.72,
      });
    }
  }

  // ─── Module State ────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;

  // Game-flow state
  let state = 'start';   // 'start' | 'playing' | 'gameover'
  let score = 0;
  let bestScore = 0;
  let timeLeft = GAME_DURATION;
  let lastTimestamp = 0;
  let tickAccum = 0;     // accumulates ms for 1-second ticks
  let spawnAccum = 0;    // accumulates ms for mole spawning
  let spawnInterval;     // current ms between spawns (decreases over time)

  // Mole data — one object per hole slot
  let moles = [];        // array[9] of mole objects
  let particles = [];    // sparkle particles

  // Tick sound management
  let lastTickSecond = -1;

  // ─── Mole Object Factory ─────────────────────────────────
  function makeMole(holeIdx, isGolden) {
    return {
      hole   : holeIdx,
      golden : isGolden,
      phase  : 'rising',   // 'rising' | 'up' | 'falling' | 'gone'
      progress: 0,         // 0-1 eased y-offset within hole
      upTimer : 0,         // ms spent fully up
      upDuration: 1200 + Math.random() * 800,  // how long stays up (ms)
      whacked : false,
      whackAnim: 0,        // 0-1 squish animation after whack
    };
  }

  // ─── Audio Helpers ───────────────────────────────────────
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playWhack() {
    try {
      const ac = getAudioCtx();
      const t  = ac.currentTime;
      // Low thud
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);

      // Crack layer
      const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ac.createBufferSource();
      const ng  = ac.createGain();
      src.buffer = buf;
      src.connect(ng);
      ng.connect(ac.destination);
      ng.gain.setValueAtTime(0.3, t);
      src.start(t);
    } catch (_) {}
  }

  function playGoldenHit() {
    try {
      const ac = getAudioCtx();
      const t  = ac.currentTime;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t + i * 0.06);
        g.gain.setValueAtTime(0.4, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25);
        o.start(t + i * 0.06);
        o.stop(t + i * 0.06 + 0.3);
      });
    } catch (_) {}
  }

  function playPop() {
    try {
      const ac = getAudioCtx();
      const t  = ac.currentTime;
      const o  = ac.createOscillator();
      const g  = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(400, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.07);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.start(t);
      o.stop(t + 0.15);
    } catch (_) {}
  }

  function playTick() {
    try {
      const ac = getAudioCtx();
      const t  = ac.currentTime;
      const o  = ac.createOscillator();
      const g  = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(880, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.start(t);
      o.stop(t + 0.1);
    } catch (_) {}
  }

  function playGameOver() {
    try {
      const ac = getAudioCtx();
      const t  = ac.currentTime;
      [220, 180, 140, 100].forEach((freq, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, t + i * 0.18);
        g.gain.setValueAtTime(0.35, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.35);
        o.start(t + i * 0.18);
        o.stop(t + i * 0.18 + 0.4);
      });
    } catch (_) {}
  }

  // ─── Easing ──────────────────────────────────────────────
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeInQuad(t) { return t * t; }

  // ─── Particle Spawner ────────────────────────────────────
  function spawnParticles(x, y, golden) {
    const count  = golden ? 18 : 10;
    const colors = golden
      ? ['#FFD700', '#FFF200', '#FFA500', '#FFFACD', '#FFEC00']
      : ['#FF6B6B', '#FFD93D', '#6BCBFF', '#B5FF6B', '#FF9EFF'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * (golden ? 4 : 3);
      particles.push({
        x, y,
        vx  : Math.cos(angle) * speed,
        vy  : Math.sin(angle) * speed - 2,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        r   : 3 + Math.random() * (golden ? 5 : 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        star : golden && Math.random() < 0.5,
      });
    }
  }

  // ─── Reset / Init Logic ──────────────────────────────────
  function resetGame() {
    score       = 0;
    timeLeft    = GAME_DURATION;
    tickAccum   = 0;
    spawnAccum  = 0;
    spawnInterval = 1200;
    lastTickSecond = -1;
    particles   = [];
    moles       = Array.from({ length: HOLE_COUNT }, () => null);
    state       = 'playing';
    lastTimestamp = performance.now();
  }

  // ─── Game Logic Update ───────────────────────────────────
  function update(dt) {
    if (state !== 'playing') return;

    // ── Timer ──────────────────────────────────────────────
    tickAccum += dt;
    if (tickAccum >= 1000) {
      tickAccum -= 1000;
      timeLeft  = Math.max(0, timeLeft - 1);

      // Tick sound in final 10s
      if (timeLeft <= 10 && timeLeft > 0) {
        playTick();
      }

      if (timeLeft === 0) {
        endGame();
        return;
      }
    }

    // ── Difficulty ramp: spawnInterval decreases over time ──
    const elapsed  = GAME_DURATION - timeLeft;
    const progress = Math.min(elapsed / GAME_DURATION, 1);
    spawnInterval  = 1200 - progress * 700;   // 1200 → 500 ms

    // ── Mole Spawning ─────────────────────────────────────
    spawnAccum += dt;
    if (spawnAccum >= spawnInterval) {
      spawnAccum -= spawnInterval;
      trySpawnMole();
    }

    // ── Update each mole ──────────────────────────────────
    for (let i = 0; i < HOLE_COUNT; i++) {
      const m = moles[i];
      if (!m) continue;

      if (m.phase === 'rising') {
        m.progress += dt / 260;
        if (m.progress >= 1) { m.progress = 1; m.phase = 'up'; }
      } else if (m.phase === 'up') {
        m.upTimer += dt;
        if (m.upTimer >= m.upDuration) { m.phase = 'falling'; m.progress = 1; }
      } else if (m.phase === 'falling') {
        m.progress -= dt / 200;
        if (m.progress <= 0) { m.progress = 0; moles[i] = null; }
      }

      // Whack squish animation
      if (m.whacked && m.whackAnim < 1) {
        m.whackAnim = Math.min(1, m.whackAnim + dt / 250);
        if (m.whackAnim >= 1) { m.phase = 'falling'; }
      }
    }

    // ── Particles ─────────────────────────────────────────
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.15;   // gravity
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function trySpawnMole() {
    // Count how many are currently up (not gone)
    const activeCount = moles.filter(m => m && m.phase !== 'gone').length;
    if (activeCount >= MAX_MOLES_UP) return;

    // Find a free hole
    const free = [];
    for (let i = 0; i < HOLE_COUNT; i++) {
      if (!moles[i]) free.push(i);
    }
    if (free.length === 0) return;

    const idx    = free[Math.floor(Math.random() * free.length)];
    const golden = Math.random() < GOLDEN_CHANCE;
    moles[idx]   = makeMole(idx, golden);
    playPop();
  }

  function endGame() {
    state = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem(LS_KEY, bestScore); } catch (_) {}
    }
    // Clear all moles
    moles = Array.from({ length: HOLE_COUNT }, () => null);
    playGameOver();
  }

  // ─── Hit Testing ─────────────────────────────────────────
  function handleHit(cx, cy) {
    // Resume audio context on first interaction
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (state === 'start' || state === 'gameover') {
      resetGame();
      return;
    }
    if (state !== 'playing') return;

    // Test each visible mole (back-to-front, so topmost wins)
    for (let i = HOLE_COUNT - 1; i >= 0; i--) {
      const m = moles[i];
      if (!m || m.whacked || m.phase === 'falling') continue;

      const h   = HOLES[i];
      const riseY  = easeOutBack(Math.min(m.progress, 1));
      const yOff   = (1 - riseY) * (MOLE_H + 10);   // pixels still hidden
      const moleX  = h.x;
      const moleY  = h.y - MOLE_H / 2 + yOff - 6;

      // Generous hit box
      const dx = cx - moleX;
      const dy = cy - moleY;
      if (Math.abs(dx) < MOLE_W / 2 + 8 && Math.abs(dy) < MOLE_H / 2 + 10) {
        // Whack!
        m.whacked = true;
        const pts = m.golden ? 50 : 10;
        score += pts;
        spawnParticles(moleX, moleY, m.golden);
        m.golden ? playGoldenHit() : playWhack();

        // Show floating score text as a particle
        particles.push({
          x    : moleX,
          y    : moleY - 20,
          vx   : 0,
          vy   : -1.5,
          life : 1,
          decay: 0.018,
          r    : 0,
          color: m.golden ? '#FFD700' : '#FFFFFF',
          text : `+${pts}`,
          star : false,
        });
        return; // only one mole per click
      }
    }
  }

  // ─── Drawing Helpers ─────────────────────────────────────

  /** Draw a single hole (dirt mound) */
  function drawHole(x, y) {
    // Mound shadow
    ctx.save();
    const grad = ctx.createRadialGradient(x, y + 4, 4, x, y + 4, HOLE_R + 10);
    grad.addColorStop(0,   'rgba(0,0,0,0.55)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, HOLE_R + 10, HOLE_RY + 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dirt mound
    ctx.save();
    const dirtGrad = ctx.createLinearGradient(x - HOLE_R, y - HOLE_RY, x + HOLE_R, y + HOLE_RY + 4);
    dirtGrad.addColorStop(0, '#7B4F2E');
    dirtGrad.addColorStop(1, '#4A2E10');
    ctx.fillStyle = dirtGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, HOLE_R, HOLE_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark hole interior
    const holeGrad = ctx.createRadialGradient(x, y - 2, 2, x, y, HOLE_R - 8);
    holeGrad.addColorStop(0,   '#1A0A00');
    holeGrad.addColorStop(0.6, '#2E1608');
    holeGrad.addColorStop(1,   '#4A2E10');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, HOLE_R - 8, HOLE_RY - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mound highlight
    ctx.strokeStyle = 'rgba(180,120,60,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y - 3, HOLE_R - 4, HOLE_RY - 3, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Draw a mole at the given hole, with progress 0-1 (1=fully up) */
  function drawMole(holeIdx, mole) {
    const h    = HOLES[holeIdx];
    const ease = easeOutBack(Math.min(mole.progress, 1));
    const yOff = (1 - ease) * (MOLE_H + 10);

    // Squish on whack
    let scaleX = 1, scaleY = 1;
    if (mole.whacked && mole.whackAnim < 1) {
      const sq = Math.sin(mole.whackAnim * Math.PI);
      scaleX = 1 + sq * 0.35;
