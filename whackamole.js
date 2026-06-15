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
      scaleY = 1 - sq * 0.25;
    }

    ctx.save();
    ctx.translate(h.x, h.y - MOLE_H / 2 + yOff);
    ctx.scale(scaleX, scaleY);

    // Clip mole to be hidden below hole rim when partially up
    // (we just rely on yOff to push it down, mound drawn on top afterwards)

    const isGolden = mole.golden;

    // ── Body ───────────────────────────────────────────────
    if (isGolden) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur  = 22;
    }

    const bodyColor1 = isGolden ? '#FFE066' : '#A0623A';
    const bodyColor2 = isGolden ? '#D4A017' : '#7B4F2E';
    const bodyGrad   = ctx.createRadialGradient(-8, -10, 4, 0, 0, MOLE_W / 2);
    bodyGrad.addColorStop(0, bodyColor1);
    bodyGrad.addColorStop(1, bodyColor2);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, MOLE_W / 2, MOLE_H / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // ── Face ───────────────────────────────────────────────
    // Snout
    const snoutColor = isGolden ? '#FFC200' : '#C47A45';
    ctx.fillStyle = snoutColor;
    ctx.beginPath();
    ctx.ellipse(0, 8, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = isGolden ? '#A0522D' : '#3A1A00';
    ctx.beginPath();
    ctx.ellipse(0, 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-2, 2.5, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — animate blinking occasionally via mole.upTimer
    const blink = mole.phase === 'up' && (Math.floor(mole.upTimer / 900) % 5 === 0)
                  && ((mole.upTimer % 900) < 120);
    const eyeH  = blink ? 2 : 8;

    [-10, 10].forEach(ex => {
      // Eye white
      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.ellipse(ex, -6, 8, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      if (!blink) {
        ctx.fillStyle = isGolden ? '#1A0A00' : '#1A0A00';
        ctx.beginPath();
        ctx.ellipse(ex + 1.5, -5, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(ex + 3, -7, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Teeth
    if (!mole.whacked) {
      ctx.fillStyle = '#FFFFFF';
      [-5, 2].forEach(tx => {
        ctx.fillRect(tx, 13, 6, 7);
      });
      // Tooth outline
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      [-5, 2].forEach(tx => {
        ctx.strokeRect(tx, 13, 6, 7);
      });
    } else {
      // X eyes when whacked
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      [-10, 10].forEach(ex => {
        ctx.beginPath(); ctx.moveTo(ex - 5, -11); ctx.lineTo(ex + 5, -1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex + 5, -11); ctx.lineTo(ex - 5, -1); ctx.stroke();
      });
      // Stars/dizzy
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, -20);
    }

    // ── Golden glow ring ───────────────────────────────────
    if (isGolden) {
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur  = 20;
      ctx.strokeStyle = 'rgba(255,215,0,0.7)';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, MOLE_W / 2 + 5, MOLE_H / 2 + 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // ─── Main Draw ───────────────────────────────────────────
  function draw(timestamp) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Background ────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bgGrad.addColorStop(0, '#050510');
    bgGrad.addColorStop(1, '#0A1628');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(100,100,200,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Grass strip
    const grassGrad = ctx.createLinearGradient(0, HUD_H - 10, 0, HUD_H + 20);
    grassGrad.addColorStop(0, '#1A4A1A');
    grassGrad.addColorStop(1, '#0D2B0D');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, HUD_H - 10, CANVAS_W, CANVAS_H - HUD_H + 10);

    // Grass highlight
    ctx.fillStyle = 'rgba(80,200,80,0.07)';
    ctx.fillRect(0, HUD_H - 10, CANVAS_W, 6);

    if (state === 'start') {
      drawStartScreen(timestamp);
    } else if (state === 'playing') {
      drawPlayField(timestamp);
    } else if (state === 'gameover') {
      drawGameOverScreen(timestamp);
    }
  }

  function drawPlayField(timestamp) {
    // Draw holes first (back layer)
    HOLES.forEach((h, i) => drawHole(h.x, h.y));

    // Draw moles that are partially or fully up — BELOW hole rim
    for (let i = 0; i < HOLE_COUNT; i++) {
      const m = moles[i];
      if (!m || m.progress <= 0) continue;
      drawMole(i, m);
    }

    // Re-draw hole rims on top so moles appear to emerge from within
    HOLES.forEach((h, i) => {
      // Just the front ellipse rim (dirt lip)
      const dirtGrad = ctx.createLinearGradient(h.x - HOLE_R, h.y, h.x + HOLE_R, h.y + HOLE_RY + 4);
      dirtGrad.addColorStop(0, '#7B4F2E');
      dirtGrad.addColorStop(1, '#4A2E10');
      ctx.fillStyle = dirtGrad;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 4, HOLE_R + 2, HOLE_RY + 3, 0, 0, Math.PI);
      ctx.fill();

      // Rim highlight
      ctx.strokeStyle = 'rgba(180,120,60,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 3, HOLE_R + 2, HOLE_RY + 2, 0, 0, Math.PI);
      ctx.stroke();
    });

    // Draw particles
    drawParticles();

    // HUD
    drawHUD();
  }

  function drawHUD() {
    // Timer bar background
    const barX = 14, barY = 14, barW = CANVAS_W - 28, barH = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 10);
    ctx.fill();

    const frac = timeLeft / GAME_DURATION;
    const barColor = frac > 0.5
      ? `hsl(${120 * (frac - 0.5) * 2}, 80%, 50%)`    // green
      : frac > 0.25
        ? `hsl(${60 * frac * 4}, 80%, 50%)`            // yellow
        : '#FF3030';                                    // red

    // Pulse effect when low
