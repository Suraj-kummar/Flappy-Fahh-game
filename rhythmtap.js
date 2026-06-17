// ============================================================
//  RhythmTapGame  –  IIFE module
//  Interface: RhythmTapGame.init(canvasId)  /  .destroy()
// ============================================================
const RhythmTapGame = (() => {
  // ── Private state ──────────────────────────────────────────
  let canvas, ctx;
  let raf = null;
  let lastTime = 0;

  // Game state
  let state = 'menu';   // 'menu' | 'playing' | 'gameover'
  let score = 0;
  let bestScore = 0;
  let combo = 0;
  let maxCombo = 0;
  let health = 100;
  let songIndex = 0;
  let songTime = 0;       // ms elapsed in current song
  let nextNoteIndex = 0;
  let notes = [];         // active falling notes
  let particles = [];     // particle bursts
  let floatTexts = [];    // floating score text
  let noteQueue = [];     // pre-generated note schedule [{lane, time}]
  let boundKeyDown, boundClick;

  // ── Constants ──────────────────────────────────────────────
  const W = 480, H = 520;
  const LANE_COUNT = 4;
  const LANE_W = W / LANE_COUNT;   // 120

  const LANE_COLORS = [
    '#ff3b5c',   // red
    '#4af0ff',   // cyan/blue
    '#39ff14',   // green
    '#ffe600',   // yellow
  ];
  const LANE_GLOW = [
    'rgba(255,59,92,0.55)',
    'rgba(74,240,255,0.55)',
    'rgba(57,255,20,0.55)',
    'rgba(255,230,0,0.55)',
  ];
  const LANE_DARK = [
    'rgba(255,59,92,0.08)',
    'rgba(74,240,255,0.08)',
    'rgba(57,255,20,0.08)',
    'rgba(255,230,0,0.08)',
  ];
  const KEY_MAP = ['a', 's', 'd', 'f'];

  const NOTE_H     = 22;
  const NOTE_SPEED = 380;         // px/s – how fast notes fall
  const HIT_ZONE_Y = H - 70;     // centre of hit zone
  const HIT_ZONE_H = 44;
  const PERFECT_MS = 50;
  const GOOD_MS    = 150;

  const SCORE_PERFECT = 300;
  const SCORE_GOOD    = 100;
  const SCORE_MISS    = -50;
  const HEALTH_HIT    = -12;
  const HEALTH_GOOD   = -4;
  const HEALTH_PERF   = 0;
  const MISS_ZONE     = HIT_ZONE_Y + HIT_ZONE_H / 2 + 30; // note that passed here counts as MISS

  // ── Song patterns ──────────────────────────────────────────
  // Each song is generated: a list of {lane:0-3, time:ms}
  const BPM = [128, 140, 110];
  const SONG_NAMES = ['Neon Rush', 'Electric Storm', 'Deep Pulse'];

  function generateSong(bpm, seed) {
    const beat = 60000 / bpm;
    const bar  = beat * 4;
    const bars = 24;          // ~24 bars each
    const result = [];
    let rng = seed;
    const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; };

    // patterns: kick, snare, hi-hat style subdivisions
    const patterns = [
      [0, 1, 2, 3],        // all lanes on beats
      [0, 2],              // alternating
      [1, 3],
      [0, 1, 3],
      [0, 2, 3],
    ];

    for (let b = 0; b < bars * 4; b++) {
      const t = b * beat;
      const pat = patterns[Math.floor(rand() * patterns.length)];

      // 8th note subdivisions
      const subs = [0, 0.5];
      for (const sub of subs) {
        if (sub === 0.5 && rand() < 0.45) continue;
        for (const lane of pat) {
          if (rand() < 0.55) {
            result.push({ lane, time: t + sub * beat });
          }
        }
      }

      // occasional 16th note fill
      if (rand() < 0.15) {
        const fillLane = Math.floor(rand() * 4);
        result.push({ lane: fillLane, time: t + 0.25 * beat });
        result.push({ lane: fillLane, time: t + 0.75 * beat });
      }
    }

    result.sort((a, b) => a.time - b.time);
    // deduplicate: remove notes in same lane < 80ms apart
    const filtered = [];
    const lastLaneTime = [-Infinity, -Infinity, -Infinity, -Infinity];
    for (const n of result) {
      if (n.time - lastLaneTime[n.lane] > 80) {
        filtered.push(n);
        lastLaneTime[n.lane] = n.time;
      }
    }
    return filtered;
  }

  const SONGS = [
    generateSong(128, 42),
    generateSong(140, 137),
    generateSong(110, 999),
  ];

  // ── Visual helpers ─────────────────────────────────────────
  function laneX(lane) { return lane * LANE_W; }
  function laneCX(lane) { return lane * LANE_W + LANE_W / 2; }

  function drawGlow(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
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

  // ── Particle system ────────────────────────────────────────
  function spawnParticles(lane, x, y) {
    const color = LANE_COLORS[lane];
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 1,
        decay: 0.018 + Math.random() * 0.022,
        r: 2 + Math.random() * 4,
        color,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += 280 * dt;   // gravity
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ── Float texts ────────────────────────────────────────────
  function spawnFloat(lane, text, color) {
    floatTexts.push({
      x: laneCX(lane),
      y: HIT_ZONE_Y - 20,
      text, color,
      life: 1,
      decay: 0.022,
    });
  }

  function updateFloatTexts(dt) {
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const f = floatTexts[i];
      f.y -= 55 * dt;
      f.life -= f.decay;
      if (f.life <= 0) floatTexts.splice(i, 1);
    }
  }

  function drawFloatTexts() {
    for (const f of floatTexts) {
      ctx.globalAlpha = f.life;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 14;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ── Lane flash ─────────────────────────────────────────────
  const laneFlash = [0, 0, 0, 0];   // alpha per lane

  function flashLane(lane) { laneFlash[lane] = 1; }

  // ── Note management ────────────────────────────────────────
  function resetNotes() {
    notes = [];
    particles = [];
    floatTexts = [];
    laneFlash.fill(0);
    nextNoteIndex = 0;
    noteQueue = SONGS[songIndex].slice();
    songTime = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    health = 100;
  }

  // Travel time: how many ms does a note take to reach HIT_ZONE from top?
  const TRAVEL_MS = (HIT_ZONE_Y / NOTE_SPEED) * 1000;

  function spawnDueNotes() {
    // Spawn notes early enough that they arrive exactly at songTime + TRAVEL_MS
    while (nextNoteIndex < noteQueue.length) {
      const n = noteQueue[nextNoteIndex];
      if (n.time <= songTime + TRAVEL_MS + 120) {
        notes.push({
          lane: n.lane,
          hitTime: n.time,       // the ideal ms in song when it should be hit
          y: -NOTE_H,
          hit: false,
          missed: false,
        });
        nextNoteIndex++;
      } else {
        break;
      }
    }
  }

  function updateNotes(dt) {
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (!n.hit) {
        n.y += NOTE_SPEED * dt;
        // Auto-miss if note travels past miss zone
        if (!n.missed && n.y > MISS_ZONE) {
          n.missed = true;
          registerMiss(n.lane, true);
        }
      }
      // Remove notes that are off-screen
      if (n.y > H + NOTE_H * 2) notes.splice(i, 1);
    }
  }

  function registerMiss(lane, autoMiss) {
    combo = 0;
    health = Math.max(0, health + HEALTH_HIT);
    if (!autoMiss) {
      score = Math.max(0, score + SCORE_MISS);
      spawnFloat(lane, 'MISS!', '#ff3b5c');
    }
    if (health <= 0) endGame();
  }

  function tryHit(lane) {
    if (state !== 'playing') return;
    flashLane(lane);

    // Find the closest unhit note in this lane within GOOD window
    let best = null, bestDelta = Infinity;
    for (const n of notes) {
      if (n.lane !== lane || n.hit || n.missed) continue;
      const delta = Math.abs(songTime - n.hitTime);
      if (delta < GOOD_MS && delta < bestDelta) {
        best = n;
        bestDelta = delta;
      }
    }

    if (!best) {
      // Miss-tap (no note close by)
      score = Math.max(0, score + SCORE_MISS);
      combo = 0;
      health = Math.max(0, health + HEALTH_HIT);
      spawnFloat(lane, 'MISS!', '#ff3b5c');
      if (health <= 0) endGame();
      return;
    }

    best.hit = true;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    const mult = 1 + Math.floor(combo / 10) * 0.5;

    if (bestDelta <= PERFECT_MS) {
      score += Math.round(SCORE_PERFECT * mult);
      spawnFloat(lane, `✦ PERFECT! ×${mult.toFixed(1)}`, LANE_COLORS[lane]);
      spawnParticles(lane, laneCX(lane), HIT_ZONE_Y);
    } else {
      score += Math.round(SCORE_GOOD * mult);
      spawnFloat(lane, `GOOD  ×${mult.toFixed(1)}`, '#ffffff');
    }
  }

  // ── Input ──────────────────────────────────────────────────
  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (state === 'menu' || state === 'gameover') {
      if (state === 'gameover' && k === 'r') { startGame(songIndex); return; }
      if (k === '1') { startGame(0); return; }
      if (k === '2') { startGame(1); return; }
      if (k === '3') { startGame(2); return; }
      return;
    }
    const lane = KEY_MAP.indexOf(k);
    if (lane !== -1) tryHit(lane);
  }

  function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top)  * (H / rect.height);

    if (state === 'menu') {
      // Detect song button click
      for (let i = 0; i < 3; i++) {
        const bx = W / 2 - 110, by = 270 + i * 60, bw = 220, bh = 44;
        if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) {
          startGame(i); return;
        }
      }
      return;
    }
    if (state === 'gameover') {
      // Retry button
      const bx = W / 2 - 80, by = 350, bw = 160, bh = 44;
      if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) {
        startGame(songIndex); return;
      }
      // Menu button
      const mx = W / 2 - 80, my = 408, mw = 160, mh = 44;
      if (cx >= mx && cx <= mx + mw && cy >= my && cy <= my + mh) {
        state = 'menu'; return;
      }
      return;
    }

    // In-game: tap lane at bottom
    if (cy > H - 120) {
      const lane = Math.floor(cx / LANE_W);
      if (lane >= 0 && lane < LANE_COUNT) tryHit(lane);
    }
  }

  // ── Game flow ──────────────────────────────────────────────
  function startGame(idx) {
    songIndex = idx;
    state = 'playing';
    resetNotes();
  }

  function endGame() {
    state = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('rhythm_best', bestScore); } catch (_) {}
    }
  }

  function checkSongEnd() {
    if (nextNoteIndex >= noteQueue.length && notes.every(n => n.hit || n.missed)) {
      endGame();
    }
  }

  // ── Drawing ────────────────────────────────────────────────
  function drawBackground() {
    // Deep dark gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0010');
    bg.addColorStop(1, '#050008');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawLanes() {
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = laneX(i);

      // Lane background fill
      ctx.fillStyle = LANE_DARK[i];
      ctx.fillRect(x, 0, LANE_W, H);

      // Flash overlay
      if (laneFlash[i] > 0) {
        ctx.globalAlpha = laneFlash[i] * 0.35;
        ctx.fillStyle = LANE_COLORS[i];
        ctx.fillRect(x, 0, LANE_W, H);
        ctx.globalAlpha = 1;
        laneFlash[i] = Math.max(0, laneFlash[i] - 0.08);
      }

      // Lane divider lines
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }
  }

  function drawHitZone() {
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = laneX(i) + 6;
      const y = HIT_ZONE_Y - HIT_ZONE_H / 2;
      const w = LANE_W - 12;
      const h = HIT_ZONE_H;

      // Glow base
      ctx.shadowColor = LANE_COLORS[i];
      ctx.shadowBlur = 18;
      ctx.strokeStyle = LANE_COLORS[i];
      ctx.lineWidth = 2;
      roundRect(x, y, w, h, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner subtle fill
      ctx.fillStyle = `rgba(255,255,255,0.04)`;
      roundRect(x, y, w, h, 8);
      ctx.fill();

      // Key label
      ctx.fillStyle = LANE_COLORS[i];
      ctx.globalAlpha = 0.75;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(KEY_MAP[i].toUpperCase(), laneCX(i), HIT_ZONE_Y + 6);
      ctx.globalAlpha = 1;
    }
  }

  function drawNotes() {
    for (const n of notes) {
      if (n.hit) continue;
      const x = laneX(n.lane) + 8;
      const w = LANE_W - 16;
      const y = n.y;
      const col = LANE_COLORS[n.lane];

      // Note glow
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;

      // Gradient fill
      const grad = ctx.createLinearGradient(x, y, x, y + NOTE_H);
      grad.addColorStop(0, col);
      grad.addColorStop(1, col + 'aa');
      ctx.fillStyle = grad;
      roundRect(x, y, w, NOTE_H, 6);
      ctx.fill();

      // Shine
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      roundRect(x + 4, y + 3, w - 8, 4, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }

  function drawHUD() {
    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 52);

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${score.toLocaleString()}`, 12, 30);

    // Combo
    if (combo >= 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 12;
      ctx.font = `bold ${Math.min(22, 12 + combo * 0.4)}px "Courier New", monospace`;
      ctx.fillText(`✦ ${combo}x COMBO`, W / 2, 30);
      ctx.shadowBlur = 0;
    }

    // Song name
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(SONG_NAMES[songIndex], W - 10, 20);

    // Health bar
    const hbX = W - 130, hbY = 32, hbW = 118, hbH = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(hbX, hbY, hbW, hbH, 5);
    ctx.fill();

    const pct = health / 100;
    const hcol = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ffe600' : '#ff3b5c';
    ctx.fillStyle = hcol;
    ctx.shadowColor = hcol;
    ctx.shadowBlur = 8;
    roundRect(hbX, hbY, hbW * pct, hbH, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Progress bar ───────────────────────────────────────────
  function drawProgress() {
    const total = noteQueue.length > 0
      ? noteQueue[noteQueue.length - 1].time + 2000
      : 1;
    const pct = Math.min(1, songTime / total);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, H - 4, W, 4);
    ctx.fillStyle = LANE_COLORS[songIndex];
    ctx.fillRect(0, H - 4, W * pct, 4);
  }

  // ── Menu screen ────────────────────────────────────────────
  function drawMenu() {
    drawBackground();

    // Title
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px "Courier New", monospace';
    ctx.fillStyle = '#4af0ff';
    ctx.shadowColor = '#4af0ff';
    ctx.shadowBlur = 30;
    ctx.fillText('RHYTHM TAP', W / 2, 100);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Press A S D F  or  Tap Lanes to Hit Notes', W / 2, 140);

    // Best score
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = '#ffe600';
    ctx.fillText(`BEST: ${bestScore.toLocaleString()}`, W / 2, 168);

    // Song buttons
    for (let i = 0; i < 3; i++) {
      const bx = W / 2 - 110, by = 270 + i * 60, bw = 220, bh = 44;
      const col = LANE_COLORS[i];

      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      roundRect(bx, by, bw, bh, 10);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = `rgba(0,0,0,0.5)`;
      roundRect(bx, by, bw, bh, 10);
      ctx.fill();

      ctx.fillStyle = col;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(`[${i + 1}]  ${SONG_NAMES[i]}  ♪ ${BPM[i]} BPM`, W / 2, by + 27);
    }

    // Lane colour preview strips
    for (let i = 0; i < LANE_COUNT; i++) {
      ctx.fillStyle = LANE_DARK[i];
      ctx.fillRect(laneX(i), 190, LANE_W, 65);
      ctx.fillStyle = LANE_COLORS[i];
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.fillText(KEY_MAP[i].toUpperCase(), laneCX(i), 229);
    }
  }

  // ── Game-over screen ───────────────────────────────────────
  function drawGameOver() {
    drawBackground();
    drawLanes();
    drawParticles();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    const titleCol = health <= 0 ? '#ff3b5c' : '#4af0ff';
    const titleTxt = health <= 0 ? 'GAME OVER' : 'CLEARED!';
    ctx.font = 'bold 44px "Courier New", monospace';
    ctx.fillStyle = titleCol;
    ctx.shadowColor = titleCol;
    ctx.shadowBlur = 30;
    ctx.fillText(titleTxt, W / 2, 150);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Score: ${score.toLocaleString()}`, W / 2, 210);

    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = '#ffe600';
    ctx.fillText(`Best: ${bestScore.toLocaleString()}`, W / 2, 242);
    if (score === bestScore && score > 0) {
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 14;
      ctx.fillText('✦ NEW BEST! ✦', W / 2, 270);
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`Max Combo: ${maxCombo}x`, W / 2, 302);

    // Retry button
    const bx = W / 2 - 80, by = 350, bw = 160, bh = 44;
    ctx.shadowColor = '#4af0ff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#4af0ff';
    ctx.lineWidth = 2;
    roundRect(bx, by, bw, bh, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.fillStyle = '#4af0ff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('[R]  RETRY', W / 2, by + 27);

    // Menu button
    const mx = W / 2 - 80, my = 408, mw = 160, mh = 44;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    roundRect(mx, my, mw, mh, 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(mx, my, mw, mh, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MENU', W / 2, my + 27);
  }

  // ── Main loop ──────────────────────────────────────────────
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (state === 'playing') {
      songTime += dt * 1000;
      spawnDueNotes();
      updateNotes(dt);
      updateParticles(dt);
      updateFloatTexts(dt);
      checkSongEnd();

      drawBackground();
      drawLanes();
      drawNotes();
      drawHitZone();
      drawParticles();
      drawFloatTexts();
      drawHUD();
      drawProgress();

    } else if (state === 'menu') {
      drawMenu();
    } else if (state === 'gameover') {
      updateParticles(dt);
      drawGameOver();
    }
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('RhythmTapGame: canvas not found'); return; }

    canvas.width  = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');

    // Load best score
    try { bestScore = parseInt(localStorage.getItem('rhythm_best') || '0', 10) || 0; } catch (_) {}

    state = 'menu';

    boundKeyDown = onKeyDown;
    boundClick   = onCanvasClick;
    window.addEventListener('keydown', boundKeyDown);
    canvas.addEventListener('click', boundClick);

    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function destroy() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (boundKeyDown) window.removeEventListener('keydown', boundKeyDown);
    if (boundClick && canvas) canvas.removeEventListener('click', boundClick);
    canvas = null;
    ctx    = null;
    notes  = [];
    particles = [];
    floatTexts = [];
    noteQueue  = [];
  }

  return { init, destroy };
})();

// arcade-hub: scoring registered
