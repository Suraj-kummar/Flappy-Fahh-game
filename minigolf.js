// ============================================================
//  MiniGolfGame — 9-Hole Mini Golf for Fahh Arcade
//  Canvas: minigolf-canvas (480 × 520)
//  Global: MiniGolfGame
// ============================================================
const MiniGolfGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const W = 480, H = 520;
  const BALL_R = 7;
  const HOLE_R = 11;
  const FRICTION = 0.982;
  const WALL_BOUNCE = 0.62;
  const MIN_SPEED = 0.18;
  const MAX_POWER = 420;
  const POWER_SCALE = 0.22;
  const HOLE_CAPTURE_DIST = 9;
  const WATER_RESPAWN_DELAY = 900;
  const STROKE_PENALTY = 2;

  const CLR = {
    bg          : '#0d1f0d',
    fairway     : '#1a6b1a',
    fairwayDark : '#165214',
    rough       : '#0d3d0d',
    wall        : '#5a3e1b',
    wallStroke  : '#8a6030',
    water       : '#0a3a6b',
    waterShine  : '#1a5fb4',
    sand        : '#c2a558',
    hole        : '#000000',
    holeShadow  : '#111',
    ball        : '#f0f0f0',
    ballShine   : '#ffffff',
    ballShadow  : '#aaaaaa',
    flag        : '#ff4444',
    flagPole    : '#cccccc',
    powerLow    : '#4ecca3',
    powerMid    : '#f9ca24',
    powerHigh   : '#ff6b6b',
    ui          : '#ffffff',
    uiDim       : '#8899bb',
    uiAccent    : '#4ecca3',
    par         : '#f9ca24',
    birdie      : '#4ecca3',
    eagle       : '#a29bfe',
    bogey       : '#ff6b6b',
    doubleBogey : '#ff2222',
    scorecard   : 'rgba(10,20,10,0.97)',
    bumper      : '#e17055',
    bumperGlow  : '#ff9f7f',
    windmill    : '#d4a017',
  };

  // ── Hole Definitions ──────────────────────────────────────
  // Each hole: { par, tee:{x,y}, hole:{x,y}, walls:[], bumpers:[], waters:[], sand:[], movers:[], label }
  // walls: [{x,y,w,h}] rects
  // bumpers: [{x,y,r}] circles
  // waters: [{x,y,w,h}]
  // sand: [{x,y,w,h}]
  // movers: [{type:'blade'|'block', x,y, ...}]

  const HOLES = [
    // ── Hole 1 — Straight shot, par 2 ──
    {
      par: 2,
      label: 'Straight Shot',
      tee:  { x: 240, y: 460 },
      hole: { x: 240, y: 80 },
      fairway: [{ x: 160, y: 50, w: 160, h: 430 }],
      walls: [
        { x: 155, y: 45, w: 8, h: 435 },
        { x: 317, y: 45, w: 8, h: 435 },
        { x: 155, y: 45, w: 170, h: 8 },
        { x: 155, y: 472, w: 170, h: 8 },
      ],
      bumpers: [],
      waters: [],
      sand: [],
      movers: [],
    },
    // ── Hole 2 — Dogleg right, par 3 ──
    {
      par: 3,
      label: 'Dogleg Right',
      tee:  { x: 120, y: 450 },
      hole: { x: 360, y: 100 },
      fairway: [
        { x: 60,  y: 380, w: 150, h: 120 },
        { x: 60,  y: 60,  w: 400, h: 130 },
        { x: 185, y: 60,  w: 275, h: 360 },
      ],
      walls: [
        // outer boundary
        { x: 55,  y: 375, w: 8,   h: 130 },
        { x: 55,  y: 375, w: 155, h: 8   },
        { x: 55,  y: 497, w: 155, h: 8   },
        { x: 202, y: 497, w: 8,   h: 100 },
        // inner corner
        { x: 202, y: 375, w: 8,   h: 130 },
        { x: 202, y: 183, w: 8,   h: 200 },
        // top box
        { x: 55,  y: 55,  w: 410, h: 8   },
        { x: 55,  y: 183, w: 410, h: 8   },
        { x: 457, y: 55,  w: 8,   h: 136 },
        // right side
        { x: 457, y: 183, w: 8,   h: 320 },
        { x: 202, y: 497, w: 263, h: 8   },
      ],
      bumpers: [{ x: 290, y: 310, r: 14 }],
      waters: [],
      sand: [{ x: 230, y: 270, w: 80, h: 60 }],
      movers: [],
    },
    // ── Hole 3 — Island Green (water surround), par 3 ──
    {
      par: 3,
      label: 'Island Green',
      tee:  { x: 240, y: 460 },
      hole: { x: 240, y: 110 },
      fairway: [
        { x: 155, y: 60,  w: 170, h: 100 },
        { x: 175, y: 155, w: 130, h: 30  },
        { x: 115, y: 180, w: 250, h: 30  },
        { x: 175, y: 205, w: 130, h: 30  },
        { x: 155, y: 230, w: 170, h: 80  },
        { x: 155, y: 380, w: 170, h: 100 },
      ],
      walls: [
        { x: 150, y: 55,  w: 180, h: 8  },
        { x: 150, y: 155, w: 8,   h: 10 },
        { x: 322, y: 155, w: 8,   h: 10 },
        { x: 150, y: 158, w: 8,   h: 160 },
        { x: 322, y: 158, w: 8,   h: 160 },
        { x: 150, y: 310, w: 180, h: 8  },
        { x: 150, y: 375, w: 8,   h: 110 },
        { x: 322, y: 375, w: 8,   h: 110 },
        { x: 150, y: 477, w: 180, h: 8  },
        { x: 150, y: 55,  w: 8,   h: 108 },
        { x: 322, y: 55,  w: 8,   h: 108 },
      ],
      bumpers: [],
      waters: [
        { x: 107, y: 175, w: 50,  h: 145 },
        { x: 323, y: 175, w: 50,  h: 145 },
        { x: 155, y: 313, w: 60,  h: 62  },
        { x: 265, y: 313, w: 60,  h: 62  },
      ],
      sand: [],
      movers: [],
    },
    // ── Hole 4 — The Windmill, par 3 ──
    {
      par: 3,
      label: 'The Windmill',
      tee:  { x: 240, y: 460 },
      hole: { x: 240, y: 80 },
      fairway: [{ x: 140, y: 50, w: 200, h: 440 }],
      walls: [
        { x: 135, y: 45, w: 8,   h: 445 },
        { x: 337, y: 45, w: 8,   h: 445 },
        { x: 135, y: 45, w: 210, h: 8   },
        { x: 135, y: 482, w: 210, h: 8  },
      ],
      bumpers: [
        { x: 175, y: 200, r: 10 },
        { x: 305, y: 200, r: 10 },
        { x: 175, y: 350, r: 10 },
        { x: 305, y: 350, r: 10 },
      ],
      waters: [],
      sand: [],
      movers: [
        { type: 'windmill', x: 240, y: 260, r: 55, bladeLen: 50, speed: 1.2 },
      ],
    },
    // ── Hole 5 — S-Curve, par 3 ──
    {
      par: 3,
      label: 'S-Curve',
      tee:  { x: 120, y: 460 },
      hole: { x: 360, y: 80 },
      fairway: [
        { x: 50,  y: 390, w: 200, h: 100 },
        { x: 50,  y: 270, w: 200, h: 130 },
        { x: 230, y: 270, w: 200, h: 130 },
        { x: 230, y: 50,  w: 200, h: 130 },
        { x: 50,  y: 150, w: 200, h: 130 },
      ],
      walls: [
        // bottom seg
        { x: 45,  y: 385, w: 210, h: 8 },
        { x: 45,  y: 483, w: 210, h: 8 },
        { x: 45,  y: 385, w: 8, h: 106 },
        { x: 247, y: 385, w: 8, h: 106 },
        // mid-left seg
        { x: 45,  y: 260, w: 8, h: 133 },
        { x: 247, y: 260, w: 8, h: 133 },
        { x: 45,  y: 260, w: 210, h: 8 },
        // junction
        { x: 247, y: 260, w: 8, h: 148 },
        { x: 430, y: 260, w: 8, h: 148 },
        { x: 247, y: 260, w: 191, h: 8 },
        { x: 247, y: 400, w: 191, h: 8 },
        // mid-right seg
        { x: 247, y: 145, w: 191, h: 8 },
        { x: 247, y: 145, w: 8, h: 115 },
        { x: 430, y: 145, w: 8, h: 115 },
        // top
        { x: 45,  y: 145, w: 210, h: 8 },
        { x: 45,  y: 50,  w: 210, h: 8 },
        { x: 45,  y: 50,  w: 8, h: 103 },
        { x: 247, y: 50,  w: 8, h: 103 },
        { x: 247, y: 50,  w: 191, h: 8 },
        { x: 430, y: 50,  w: 8, h: 103 },
      ],
      bumpers: [],
      waters: [{ x: 48,  y: 395, w: 60, h: 80 }],
      sand: [{ x: 340, y: 160, w: 70, h: 70 }],
      movers: [],
    },
    // ── Hole 6 — Moving Bumpers, par 4 ──
    {
      par: 4,
      label: 'Obstacle Course',
      tee:  { x: 240, y: 465 },
      hole: { x: 240, y: 75 },
      fairway: [{ x: 100, y: 45, w: 280, h: 445 }],
      walls: [
        { x: 95,  y: 40,  w: 8,   h: 450 },
        { x: 377, y: 40,  w: 8,   h: 450 },
        { x: 95,  y: 40,  w: 290, h: 8   },
        { x: 95,  y: 482, w: 290, h: 8   },
        // internal walls (slots for movers)
        { x: 95,  y: 190, w: 80,  h: 12  },
        { x: 305, y: 190, w: 80,  h: 12  },
        { x: 95,  y: 330, w: 80,  h: 12  },
        { x: 305, y: 330, w: 80,  h: 12  },
      ],
      bumpers: [],
      waters: [
        { x: 130, y: 400, w: 220, h: 60 },
      ],
      sand: [],
      movers: [
        { type: 'block', x: 185, y: 196, w: 110, h: 14, dx: 0, dy: 2.2, minY: 100, maxY: 460, axis: 'y' },
        { type: 'block', x: 185, y: 336, w: 110, h: 14, dx: 0, dy: -2.2, minY: 100, maxY: 460, axis: 'y' },
      ],
    },
    // ── Hole 7 — Bumper Forest, par 3 ──
    {
      par: 3,
      label: 'Bumper Forest',
      tee:  { x: 240, y: 460 },
      hole: { x: 240, y: 80 },
      fairway: [{ x: 100, y: 50, w: 280, h: 445 }],
      walls: [
        { x: 95,  y: 45,  w: 8,   h: 450 },
        { x: 377, y: 45,  w: 8,   h: 450 },
        { x: 95,  y: 45,  w: 290, h: 8   },
        { x: 95,  y: 487, w: 290, h: 8   },
      ],
      bumpers: [
        { x: 165, y: 170, r: 13 },
        { x: 240, y: 150, r: 13 },
        { x: 315, y: 170, r: 13 },
        { x: 190, y: 250, r: 13 },
        { x: 290, y: 250, r: 13 },
        { x: 240, y: 310, r: 13 },
        { x: 155, y: 340, r: 13 },
        { x: 325, y: 340, r: 13 },
      ],
      waters: [],
      sand: [{ x: 160, y: 380, w: 160, h: 60 }],
      movers: [],
    },
    // ── Hole 8 — The Gauntlet, par 4 ──
    {
      par: 4,
      label: 'The Gauntlet',
      tee:  { x: 240, y: 470 },
      hole: { x: 240, y: 75 },
      fairway: [
        { x: 140, y: 45, w: 200, h: 445 },
      ],
      walls: [
        { x: 135, y: 40,  w: 8,   h: 450 },
        { x: 337, y: 40,  w: 8,   h: 450 },
        { x: 135, y: 40,  w: 210, h: 8   },
        { x: 135, y: 482, w: 210, h: 8   },
        // barriers
        { x: 135, y: 140, w: 145, h: 12 },
        { x: 192, y: 230, w: 145, h: 12 },
        { x: 135, y: 320, w: 145, h: 12 },
        { x: 192, y: 410, w: 145, h: 12 },
      ],
      bumpers: [],
      waters: [
        { x: 143, y: 155, w: 90, h: 70 },
        { x: 200, y: 245, w: 90, h: 70 },
        { x: 143, y: 335, w: 90, h: 70 },
        { x: 200, y: 425, w: 90, h: 48 },
      ],
      sand: [],
      movers: [
        { type: 'block', x: 240, y: 150, w: 90, h: 12, dx: 2.5, dy: 0, minX: 143, maxX: 275, axis: 'x' },
        { type: 'block', x: 240, y: 240, w: 90, h: 12, dx: -2.5, dy: 0, minX: 200, maxX: 330, axis: 'x' },
        { type: 'block', x: 240, y: 330, w: 90, h: 12, dx: 2.5, dy: 0, minX: 143, maxX: 275, axis: 'x' },
        { type: 'block', x: 240, y: 420, w: 90, h: 12, dx: -2.5, dy: 0, minX: 200, maxX: 330, axis: 'x' },
      ],
    },
    // ── Hole 9 — Grand Finale, par 4 ──
    {
      par: 4,
      label: 'Grand Finale',
      tee:  { x: 80, y: 460 },
      hole: { x: 400, y: 80 },
      fairway: [
        { x: 40,  y: 390, w: 180, h: 100 },
        { x: 40,  y: 50,  w: 180, h: 360 },
        { x: 40,  y: 50,  w: 420, h: 100 },
        { x: 260, y: 50,  w: 180, h: 420 },
        { x: 150, y: 210, w: 210, h: 80  },
      ],
      walls: [
        { x: 35,  y: 385, w: 8,   h: 110 },
        { x: 35,  y: 485, w: 185, h: 8   },
        { x: 212, y: 385, w: 8,   h: 108 },
        { x: 212, y: 45,  w: 8,   h: 348 },
        { x: 35,  y: 45,  w: 8,   h: 348 },
        { x: 35,  y: 45,  w: 430, h: 8   },
        { x: 457, y: 45,  w: 8,   h: 450 },
        { x: 257, y: 485, w: 208, h: 8   },
        { x: 257, y: 385, w: 8,   h: 108 },
        { x: 257, y: 145, w: 8,   h: 248 },
        // inner T
        { x: 212, y: 205, w: 53,  h: 8   },
        { x: 257, y: 205, w: 53,  h: 8   },
        { x: 212, y: 285, w: 53,  h: 8   },
        { x: 257, y: 285, w: 53,  h: 8   },
      ],
      bumpers: [
        { x: 120, y: 320, r: 14 },
        { x: 120, y: 160, r: 14 },
        { x: 360, y: 300, r: 14 },
        { x: 360, y: 180, r: 14 },
      ],
      waters: [
        { x: 43,  y: 390, w: 80, h: 88 },
        { x: 265, y: 155, w: 80, h: 80 },
        { x: 265, y: 295, w: 80, h: 80 },
      ],
      sand: [{ x: 300, y: 390, w: 140, h: 88 }],
      movers: [
        { type: 'windmill', x: 120, y: 240, r: 45, bladeLen: 40, speed: 1.6 },
        { type: 'block', x: 360, y: 380, w: 80, h: 12, dx: 2.0, dy: 0, minX: 265, maxX: 449, axis: 'x' },
      ],
    },
  ];

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let holeIndex, totalStrokes, holeStrokes;
  let scores; // per-hole stroke counts
  let ball, ballVx, ballVy;
  let lastSafeX, lastSafeY;
  let dragging, dragStartX, dragStartY;
  let gamePhase; // 'playing' | 'scorecard' | 'final'
  let holeSinkAnim; // null or { t, cx, cy }
  let waterAnim;    // null or { timer }
  let windmillAngles; // per-mover angle state
  let moverStates;    // copies of mover x/y for animation
  let particles;
  let flagWave;
  let bestScore;
  let holeTransition; // null or { t, fromHole, message }

  // ── Utility ───────────────────────────────────────────────
  const PI2 = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lerp = (a, b, t) => a + (b - a) * t;

  function lsGet(k, def) {
    try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); }
    catch { return def; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  // ── Init ──────────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');

    bestScore = lsGet('golf_best', null);

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

    startGame();
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    if (!canvas) return;
    canvas.removeEventListener('mousedown',  onMouseDown);
    canvas.removeEventListener('mousemove',  onMouseMove);
    canvas.removeEventListener('mouseup',    onMouseUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove',  onTouchMove);
    canvas.removeEventListener('touchend',   onTouchEnd);
    canvas = null; ctx = null;
  }

  // ── Game flow ─────────────────────────────────────────────
  function startGame() {
    holeIndex    = 0;
    totalStrokes = 0;
    scores       = [];
    gamePhase    = 'playing';
    loadHole(0);
  }

  function loadHole(idx) {
    holeIndex    = idx;
    holeStrokes  = 0;
    holeSinkAnim = null;
    waterAnim    = null;
    dragging     = false;
    particles    = [];
    flagWave     = 0;
    holeTransition = null;

    const h = HOLES[idx];
    ball   = { x: h.tee.x, y: h.tee.y };
    ballVx = 0; ballVy = 0;
    lastSafeX = ball.x;
    lastSafeY = ball.y;

    // init mover states (deep copy positions)
    moverStates = h.movers.map(m => ({
      ...m,
      cx: m.x, cy: m.y,
      angle: 0,
    }));
    windmillAngles = h.movers
      .filter(m => m.type === 'windmill')
      .map(() => 0);
  }

  // ── Main loop ─────────────────────────────────────────────
  let lastTime = 0;
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    flagWave = (flagWave + dt * 3) % PI2;

    if (gamePhase === 'playing') {
      updateMovers(dt);
      if (!holeSinkAnim && !waterAnim) {
        updateBall(dt);
        checkHazards();
        checkHole();
      }
      if (holeSinkAnim) updateSinkAnim(dt);
      if (waterAnim) updateWaterAnim(dt);
      updateParticles(dt);
    }

    draw();
  }

  // ── Movers ────────────────────────────────────────────────
  function updateMovers(dt) {
    const h = HOLES[holeIndex];
    let wi = 0;
    h.movers.forEach((m, i) => {
      const s = moverStates[i];
      if (m.type === 'windmill') {
        s.angle = (s.angle + m.speed * dt) % PI2;
        wi++;
      } else if (m.type === 'block') {
        if (m.axis === 'x') {
          s.cx += s.dx;
          if (s.cx < m.minX || s.cx > m.maxX) { s.dx = -s.dx; s.cx = clamp(s.cx, m.minX, m.maxX); }
        } else {
          s.cy += s.dy;
          if (s.cy < m.minY || s.cy > m.maxY) { s.dy = -s.dy; s.cy = clamp(s.cy, m.minY, m.maxY); }
        }
      }
    });
  }

  // ── Physics ───────────────────────────────────────────────
  function updateBall(dt) {
    if (ballVx === 0 && ballVy === 0) return;

    // integrate
    ball.x += ballVx * dt;
    ball.y += ballVy * dt;

    // friction
    ballVx *= Math.pow(FRICTION, dt * 60);
    ballVy *= Math.pow(FRICTION, dt * 60);

    // sand friction
    if (inSand(ball.x, ball.y)) {
      ballVx *= Math.pow(0.94, dt * 60);
      ballVy *= Math.pow(0.94, dt * 60);
    }

    // stop
    const spd = Math.hypot(ballVx, ballVy);
    if (spd < MIN_SPEED) { ballVx = 0; ballVy = 0; }

    // wall collision
    const h = HOLES[holeIndex];
    h.walls.forEach(w => wallCollide(w));

    // bumper collision
    h.bumpers.forEach(b => bumperCollide(b.x, b.y, b.r));

    // mover collisions
    const md = HOLES[holeIndex];
    md.movers.forEach((m, i) => {
      const s = moverStates[i];
      if (m.type === 'windmill') {
        // collide with blades
        for (let blade = 0; blade < 4; blade++) {
          const ang = s.angle + blade * Math.PI / 2;
          const bx1 = s.x, by1 = s.y;
          const bx2 = s.x + Math.cos(ang) * m.bladeLen;
          const by2 = s.y + Math.sin(ang) * m.bladeLen;
          segBallCollide(bx1, by1, bx2, by2, 8);
        }
      } else if (m.type === 'block') {
        wallCollide({ x: s.cx, y: s.cy, w: m.w, h: m.h });
      }
    });

    // update safe position
    if (!inWater(ball.x, ball.y)) {
      lastSafeX = ball.x; lastSafeY = ball.y;
    }
  }

  function wallCollide(w) {
    const left   = w.x;
    const right  = w.x + w.w;
    const top    = w.y;
    const bottom = w.y + w.h;

    const bLeft   = ball.x - BALL_R;
    const bRight  = ball.x + BALL_R;
    const bTop    = ball.y - BALL_R;
    const bBottom = ball.y + BALL_R;

    if (bRight < left || bLeft > right || bBottom < top || bTop > bottom) return;

    // find overlap on each axis
    const overlapL = bRight - left;
    const overlapR = right - bLeft;
    const overlapT = bBottom - top;
    const overlapB = bottom - bTop;

    const minO = Math.min(overlapL, overlapR, overlapT, overlapB);

    if (minO === overlapL) { ball.x -= overlapL; ballVx = -Math.abs(ballVx) * WALL_BOUNCE; }
    else if (minO === overlapR) { ball.x += overlapR; ballVx = Math.abs(ballVx) * WALL_BOUNCE; }
    else if (minO === overlapT) { ball.y -= overlapT; ballVy = -Math.abs(ballVy) * WALL_BOUNCE; }
    else { ball.y += overlapB; ballVy = Math.abs(ballVy) * WALL_BOUNCE; }
  }

  function bumperCollide(bx, by, br) {
    const dx = ball.x - bx;
    const dy = ball.y - by;
    const d  = Math.hypot(dx, dy);
    const minD = br + BALL_R;
    if (d >= minD) return;
    const nx = dx / d, ny = dy / d;
    ball.x = bx + nx * minD;
    ball.y = by + ny * minD;
    const dot = ballVx * nx + ballVy * ny;
    ballVx = (ballVx - 2 * dot * nx) * 0.85;
    ballVy = (ballVy - 2 * dot * ny) * 0.85;
    spawnParticles(ball.x, ball.y, CLR.bumperGlow, 6);
  }

  function segBallCollide(x1, y1, x2, y2, segR) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;
    let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
    t = clamp(t, 0, 1);
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    bumperCollide(cx, cy, segR);
  }

  // ── Hazard checks ─────────────────────────────────────────
  function inWater(x, y) {
    return HOLES[holeIndex].waters.some(w =>
      x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h
    );
  }
  function inSand(x, y) {
    return HOLES[holeIndex].sand.some(s =>
      x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h
    );
  }

  function checkHazards() {
    if (inWater(ball.x, ball.y)) {
      ballVx = 0; ballVy = 0;
      holeStrokes += STROKE_PENALTY;
      waterAnim = { timer: WATER_RESPAWN_DELAY };
      spawnParticles(ball.x, ball.y, '#4fc3f7', 14);
    }
  }

  function checkHole() {
    const h = HOLES[holeIndex].hole;
    const d = dist(ball.x, ball.y, h.x, h.y);
    if (d < HOLE_CAPTURE_DIST && Math.hypot(ballVx, ballVy) < 220) {
      ballVx = 0; ballVy = 0;
      holeSinkAnim = { t: 0, cx: h.x, cy: h.y };
      spawnParticles(h.x, h.y, CLR.uiAccent, 20);
    }
  }

  // ── Sink animation ────────────────────────────────────────
  function updateSinkAnim(dt) {
    holeSinkAnim.t += dt * 1.8;
    ball.x = lerp(ball.x, holeSinkAnim.cx, holeSinkAnim.t * 0.4);
    ball.y = lerp(ball.y, holeSinkAnim.cy, holeSinkAnim.t * 0.4);
    if (holeSinkAnim.t >= 1) {
      finishHole();
    }
  }

  function updateWaterAnim(dt) {
    waterAnim.timer -= dt * 1000;
    if (waterAnim.timer <= 0) {
      ball.x = lastSafeX; ball.y = lastSafeY;
      waterAnim = null;
    }
  }

  function finishHole() {
    scores.push(holeStrokes);
    totalStrokes += holeStrokes;

    // check best score at end
    if (holeIndex === HOLES.length - 1) {
      if (bestScore === null || totalStrokes < bestScore) {
        bestScore = totalStrokes;
        lsSet('golf_best', bestScore);
      }
      gamePhase = 'final';
    } else {
      gamePhase = 'scorecard';
    }
    holeSinkAnim = null;
  }

  // ── Particles ─────────────────────────────────────────────
  function spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const ang = rnd(0, PI2);
      const spd = rnd(30, 130);
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1.0,
        r: rnd(2, 5),
        color,
      });
    }
  }

  function updateParticles(dt) {
    particles = particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 80 * dt;
      p.life -= dt * 1.8;
      return p.life > 0;
    });
  }

  // ── Input handling ────────────────────────────────────────
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const scaleX = W / r.width;
    const scaleY = H / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }
  function getTouchPos(e) {
    return getPos(e.touches[0] || e.changedTouches[0]);
  }

  function onMouseDown(e) { handleDown(getPos(e)); }
  function onMouseMove(e) { handleMove(getPos(e)); }
  function onMouseUp(e)   { handleUp(getPos(e)); }
  function onTouchStart(e) { e.preventDefault(); handleDown(getTouchPos(e)); }
  function onTouchMove(e)  { e.preventDefault(); handleMove(getTouchPos(e)); }
  function onTouchEnd(e)   { e.preventDefault(); handleUp(getTouchPos(e)); }

  function handleDown(p) {
    if (gamePhase === 'scorecard') { nextHole(); return; }
    if (gamePhase === 'final')     { startGame(); return; }
    if (gamePhase !== 'playing') return;
    if (holeSinkAnim || waterAnim) return;
    if (ballVx !== 0 || ballVy !== 0) return; // ball still moving

    // start drag if near ball
    if (dist(p.x, p.y, ball.x, ball.y) < 40) {
      dragging = true;
      dragStartX = p.x;
      dragStartY = p.y;
    }
  }

  function handleMove(p) {
    if (!dragging) return;
    dragStartX = p.x;
    dragStartY = p.y;
  }

  function handleUp(p) {
    if (!dragging) return;
    dragging = false;

    // vector from drag point to ball = shoot direction
    const dx = ball.x - dragStartX;
    const dy = ball.y - dragStartY;
    const power = clamp(Math.hypot(dx, dy), 0, MAX_POWER);
    if (power < 5) return;

    ballVx = dx * POWER_SCALE;
    ballVy = dy * POWER_SCALE;
    holeStrokes++;
  }

  function nextHole() {
    if (holeIndex < HOLES.length - 1) {
      loadHole(holeIndex + 1);
      gamePhase = 'playing';
    }
  }

  // ── Drawing ───────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    if (gamePhase === 'scorecard') { drawScorecard(false); return; }
    if (gamePhase === 'final')     { drawScorecard(true);  return; }

    drawHole();
    drawParticles();
    drawBall();
    drawHUD();
    if (dragging) drawAimLine();
    if (waterAnim) drawWaterOverlay();
  }

  function drawBackground() {
    ctx.fillStyle = CLR.rough;
    ctx.fillRect(0, 0, W, H);
    // subtle grid
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function drawHole() {
    const h = HOLES[holeIndex];

    // fairway
    h.fairway.forEach(f => {
      ctx.fillStyle = CLR.fairway;
      ctx.beginPath();
      ctx.roundRect(f.x, f.y, f.w, f.h, 4);
      ctx.fill();
      // stripes
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = CLR.fairwayDark;
      ctx.lineWidth = 18;
      for (let i = -H; i < W + H; i += 36) {
        ctx.beginPath(); ctx.moveTo(f.x + i, f.y); ctx.lineTo(f.x + i - f.h, f.y + f.h); ctx.stroke();
      }
      ctx.restore();
    });

    // water
    h.waters.forEach(w => {
      const wg = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
      wg.addColorStop(0, CLR.water);
      wg.addColorStop(1, CLR.waterShine);
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, w.w, w.h, 3);
      ctx.fill();
      // ripples
      ctx.save();
      ctx.clip();
      const t = Date.now() / 600;
      for (let rx = w.x + 12; rx < w.x + w.w - 12; rx += 20) {
        const ry = w.y + w.h / 2 + Math.sin(t + rx * 0.1) * 4;
        ctx.beginPath();
        ctx.moveTo(rx - 8, ry);
        ctx.bezierCurveTo(rx - 4, ry - 4, rx + 4, ry - 4, rx + 8, ry);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
      // WATER label
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('WATER', w.x + w.w / 2, w.y + w.h / 2 + 4);
    });

    // sand
    h.sand.forEach(s => {
      ctx.fillStyle = CLR.sand;
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.w, s.h, 3);
      ctx.fill();
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('SAND', s.x + s.w / 2, s.y + s.h / 2 + 4);
    });

    // walls
    h.walls.forEach(w => {
      ctx.fillStyle = CLR.wall;
      ctx.strokeStyle = CLR.wallStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, w.w, w.h, 2);
      ctx.fill();
      ctx.stroke();
    });

    // bumpers
    h.bumpers.forEach(b => {
      const bg = ctx.createRadialGradient(b.x - 2, b.y - 2, 2, b.x, b.y, b.r);
      bg.addColorStop(0, CLR.bumperGlow);
      bg.addColorStop(1, CLR.bumper);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = '#ff7043';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // moving obstacles
    h.movers.forEach((m, i) => {
      const s = moverStates[i];
      if (m.type === 'windmill') {
        drawWindmill(s.x, s.y, s.angle, m.bladeLen, m.r);
      } else if (m.type === 'block') {
        ctx.fillStyle = '#d4a017';
        ctx.strokeStyle = '#f9ca24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(s.cx, s.cy, m.w, m.h, 3);
        ctx.fill();
        ctx.stroke();
        // arrow
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.axis === 'x' ? '↔' : '↕', s.cx + m.w / 2, s.cy + m.h / 2 + 4);
      }
    });

    // hole cup
    const hx = h.hole.x, hy = h.hole.y;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(hx + 2, hy + 3, HOLE_R, HOLE_R * 0.6, 0, 0, PI2); ctx.fill();
    // cup
    ctx.fillStyle = CLR.hole;
    ctx.beginPath(); ctx.arc(hx, hy, HOLE_R, 0, PI2); ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // rim highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hx, hy - 2, HOLE_R - 2, Math.PI, 0); ctx.stroke();

    // flag
    const poleH = 28;
    ctx.strokeStyle = CLR.flagPole;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy - HOLE_R + 2);
    ctx.lineTo(hx, hy - HOLE_R + 2 - poleH);
    ctx.stroke();
    // waving flag
    const fw = 14;
    ctx.fillStyle = CLR.flag;
    ctx.beginPath();
    const fy = hy - HOLE_R + 2 - poleH;
    ctx.moveTo(hx, fy);
    ctx.quadraticCurveTo(hx + fw * 0.5 + Math.sin(flagWave) * 4, fy + 5, hx + fw, fy + 4);
    ctx.quadraticCurveTo(hx + fw * 0.5 + Math.sin(flagWave) * 4, fy + 9, hx, fy + 9);
    ctx.closePath();
    ctx.fill();

    // tee marker
    const tx = h.tee.x, ty = h.tee.y;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(tx, ty + 4, 8, 4, 0, 0, PI2);
    ctx.fill();
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('TEE', tx, ty + 16);
  }

  function drawWindmill(x, y, angle, bladeLen, pivotR) {
    // base
    ctx.fillStyle = '#5a3e1b';
    ctx.beginPath(); ctx.arc(x, y, pivotR * 0.2, 0, PI2); ctx.fill();

    for (let i = 0; i < 4; i++) {
      const ang = angle + i * Math.PI / 2;
      const ex  = x + Math.cos(ang) * bladeLen;
      const ey  = y + Math.sin(ang) * bladeLen;
      ctx.strokeStyle = CLR.windmill;
      ctx.lineWidth   = 10;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = '#f9ca24';
      ctx.lineWidth   = 3;
      ctx.stroke();
    }
    // center hub
    const hubG = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
    hubG.addColorStop(0, '#fff');
    hubG.addColorStop(1, '#888');
    ctx.fillStyle = hubG;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, PI2); ctx.fill();
  }

  function drawBall() {
    if (holeSinkAnim && holeSinkAnim.t > 0.7) {
      const scale = 1 - (holeSinkAnim.t - 0.7) / 0.3;
      ctx.save();
      ctx.globalAlpha = scale;
      ctx.translate(ball.x, ball.y);
      ctx.scale(scale, scale);
      ctx.translate(-ball.x, -ball.y);
      _drawBallShape();
      ctx.restore();
      return;
    }
    _drawBallShape();
  }

  function _drawBallShape() {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(ball.x + 3, ball.y + 4, BALL_R, BALL_R * 0.55, 0, 0, PI2);
    ctx.fill();
    // ball
    const ballG = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
    ballG.addColorStop(0, CLR.ballShine);
    ballG.addColorStop(0.4, CLR.ball);
    ballG.addColorStop(1, CLR.ballShadow);
    ctx.fillStyle = ballG;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, PI2);
    ctx.fill();
    // dimple
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.arc(ball.x + 2, ball.y + 2, 2.5, 0, PI2); ctx.fill();
    ctx.beginPath(); ctx.arc(ball.x - 2, ball.y + 1, 1.8, 0, PI2); ctx.fill();
  }

  function drawAimLine() {
    const dx = ball.x - dragStartX;
    const dy = ball.y - dragStartY;
    const power = clamp(Math.hypot(dx, dy), 0, MAX_POWER);
    const pct   = power / MAX_POWER;

    // guide dots
    const steps = 12;
    const vx = dx * POWER_SCALE * 0.06;
    const vy = dy * POWER_SCALE * 0.06;
    let px = ball.x, py = ball.y;
    for (let i = 1; i <= steps; i++) {
      px += vx; py += vy;
      const a = 1 - i / steps;
      ctx.fillStyle = `rgba(255,255,255,${a * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.5 - i * 0.12, 0, PI2);
      ctx.fill();
    }

    // power bar (right side of screen)
    const bx = W - 22, by = 60, bh = H - 120;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.roundRect(bx - 6, by - 4, 18, bh + 8, 4);
    ctx.fill();

    const fillH = bh * pct;
    const powerColor = pct < 0.4 ? CLR.powerLow : pct < 0.75 ? CLR.powerMid : CLR.powerHigh;
    ctx.fillStyle = powerColor;
    ctx.shadowColor = powerColor;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.roundRect(bx - 5, by + bh - fillH, 16, fillH, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // pull-back dot at drag point
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(dragStartX, dragStartY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = powerColor;
    ctx.shadowColor = powerColor; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(dragStartX, dragStartY, 5, 0, PI2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, PI2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawWaterOverlay() {
    const alpha = 0.3 + Math.sin(Date.now() / 120) * 0.15;
    ctx.fillStyle = `rgba(10,60,140,${alpha})`;
    ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 20;
    ctx.fillText('💧 WATER HAZARD', W / 2, H / 2 - 16);
    ctx.shadowBlur = 0;
    ctx.font = '16px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`+${STROKE_PENALTY} Penalty Strokes`, W / 2, H / 2 + 18);
  }

  function drawHUD() {
    const h = HOLES[holeIndex];
    // top bar backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, 42, [0, 0, 10, 10]); ctx.fill();

    // hole number
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = CLR.uiAccent;
    ctx.textAlign = 'left';
    ctx.fillText(`HOLE ${holeIndex + 1}/9`, 12, 17);
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillStyle = CLR.uiDim;
    ctx.fillText(h.label, 12, 32);

    // par
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = CLR.par;
    ctx.fillText(`PAR ${h.par}`, W / 2, 17);

    // strokes
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(`STROKES: ${holeStrokes}`, W - 12, 17);
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillStyle = CLR.uiDim;
    ctx.fillText(`TOTAL: ${totalStrokes + holeStrokes}`, W - 12, 32);

    // instruction
    const ballMoving = ballVx !== 0 || ballVy !== 0;
    if (!ballMoving && !holeSinkAnim && !waterAnim && !dragging) {
      ctx.font = '11px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('Drag from ball to aim & shoot', W / 2, H - 10);
    }
  }

  // ── Scorecard ─────────────────────────────────────────────
  function drawScorecard(isFinal) {
    // backdrop
    ctx.fillStyle = CLR.scorecard;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(78,204,163,0.06)';
    for (let y = 0; y < H; y += 40) {
      ctx.fillRect(0, y, W, 20);
    }

    // Title
    ctx.textAlign = 'center';
    if (isFinal) {
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.fillStyle = CLR.uiAccent;
      ctx.shadowColor = CLR.uiAccent; ctx.shadowBlur = 16;
      ctx.fillText('🏆 ROUND COMPLETE', W / 2, 46);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillStyle = '#fff';
      const prevHole = holeIndex;
      ctx.fillText(`HOLE ${prevHole + 1} COMPLETE`, W / 2, 44);
      // score label
      const sc = scores[scores.length - 1];
      const par = HOLES[prevHole].par;
      const diff = sc - par;
      let label = '', color = '#fff';
      if (diff <= -2) { label = 'EAGLE 🦅'; color = CLR.eagle; }
      else if (diff === -1) { label = 'BIRDIE 🐦'; color = CLR.birdie; }
      else if (diff === 0)  { label = 'PAR ✓';   color = CLR.par; }
      else if (diff === 1)  { label = 'BOGEY';   color = CLR.bogey; }
      else                  { label = 'DOUBLE+ BOGEY'; color = CLR.doubleBogey; }
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.fillText(label, W / 2, 70);
      ctx.shadowBlur = 0;
    }

    // scorecard table
    const startY = isFinal ? 70 : 100;
    const colW = [46, 46, 46, 46, 46];
    const colX = [20, 100, 185, 275, 360];
    const headers = ['HOLE', 'PAR', 'SCORE', '+/-', 'RESULT'];

    // header row
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillStyle = CLR.uiDim;
    headers.forEach((h, i) => {
      ctx.textAlign = i === 0 ? 'left' : 'center';
      ctx.fillText(h, colX[i], startY);
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, startY + 5); ctx.lineTo(W - 14, startY + 5); ctx.stroke();

    // rows
    scores.forEach((sc, idx) => {
      const ry = startY + 20 + idx * 22;
      const par = HOLES[idx].par;
      const diff = sc - par;
      let resultTxt = '', resultColor;
      if (diff <= -2) { resultTxt = '🦅'; resultColor = CLR.eagle; }
      else if (diff === -1) { resultTxt = '🐦'; resultColor = CLR.birdie; }
      else if (diff === 0)  { resultTxt = '●';  resultColor = CLR.par; }
      else if (diff === 1)  { resultTxt = '+1'; resultColor = CLR.bogey; }
      else                  { resultTxt = `+${diff}`; resultColor = CLR.doubleBogey; }

      const diffStr = diff === 0 ? 'E' : (diff > 0 ? '+' + diff : diff.toString());
      ctx.fillStyle = (idx % 2 === 0) ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)';
      ctx.fillRect(12, ry - 13, W - 24, 20);

      ctx.font = '12px Outfit, sans-serif';
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'left';
      ctx.fillText(idx + 1, colX[0], ry);
      ctx.textAlign = 'center';
      ctx.fillStyle = CLR.par;
      ctx.fillText(par, colX[1], ry);
      ctx.fillStyle = diff > 0 ? CLR.bogey : diff < 0 ? CLR.birdie : '#fff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText(sc, colX[2], ry);
      ctx.fillStyle = resultColor;
      ctx.fillText(diffStr, colX[3], ry);
      ctx.fillText(resultTxt, colX[4], ry);
    });

    // separator
    const sepY = startY + 20 + scores.length * 22 + 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(14, sepY); ctx.lineTo(W - 14, sepY); ctx.stroke();

    if (isFinal) {
      // totals
      const totalPar = HOLES.reduce((s, h) => s + h.par, 0);
      const totalDiff = totalStrokes - totalPar;
      const diffStr = totalDiff === 0 ? 'EVEN' : (totalDiff > 0 ? '+' + totalDiff : totalDiff.toString());
      const diffColor = totalDiff < 0 ? CLR.birdie : totalDiff === 0 ? CLR.par : CLR.bogey;

      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL', colX[0], sepY + 18);
      ctx.fillStyle = CLR.par;
      ctx.textAlign = 'center';
      ctx.fillText(totalPar, colX[1], sepY + 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(totalStrokes, colX[2], sepY + 18);
      ctx.fillStyle = diffColor;
      ctx.fillText(diffStr, colX[3], sepY + 18);

      // best score
      const bsY = sepY + 46;
      ctx.font = '12px Outfit, sans-serif';
      ctx.fillStyle = CLR.uiDim;
      ctx.textAlign = 'center';
      if (bestScore !== null) {
        const isNew = totalStrokes <= bestScore;
        ctx.fillStyle = isNew ? CLR.par : CLR.uiDim;
        ctx.fillText(isNew ? `🏆 NEW BEST! ${bestScore} strokes` : `Best: ${bestScore} strokes`, W / 2, bsY);
      }

      // rating
      const ratingY = bsY + 28;
      const rating = getRating(totalStrokes, totalPar);
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.fillStyle = rating.color;
      ctx.shadowColor = rating.color; ctx.shadowBlur = 14;
      ctx.fillText(rating.text, W / 2, ratingY);
      ctx.shadowBlur = 0;

      // play again button
      drawButton('⛳ PLAY AGAIN', W / 2, H - 50, 200, 38, CLR.uiAccent, '#0d1f0d');
    } else {
      // next hole button
      drawButton(`⛳ HOLE ${holeIndex + 2} →`, W / 2, H - 50, 200, 38, CLR.uiAccent, '#0d1f0d');
      ctx.font = '11px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('Click anywhere to continue', W / 2, H - 18);
    }
  }

  function drawButton(txt, cx, cy, w, h, bg, fg) {
    const x = cx - w / 2, y = cy - h / 2;
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, bg);
    g.addColorStop(1, shadeColor(bg, -20));
    ctx.fillStyle = g;
    ctx.shadowColor = bg; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = bg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.fillText(txt, cx, cy + 5);
  }

  function shadeColor(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp(((n >> 16) & 0xff) + pct, 0, 255);
    const g = clamp(((n >> 8)  & 0xff) + pct, 0, 255);
    const b = clamp((n & 0xff) + pct, 0, 255);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function getRating(total, par) {
    const diff = total - par;
    if (diff <= -6) return { text: '🌟 LEGENDARY!',    color: '#a29bfe' };
    if (diff <= -3) return { text: '🦅 AMAZING!',      color: CLR.birdie };
    if (diff <= 0)  return { text: '🐦 GREAT ROUND!',  color: CLR.par };
    if (diff <= 4)  return { text: '👍 DECENT ROUND',  color: '#fff' };
    if (diff <= 9)  return { text: '⛳ KEEP PRACTICING', color: CLR.bogey };
    return               { text: '😅 ROUGH ROUND!',  color: CLR.doubleBogey };
  }

  // ── Public API ────────────────────────────────────────────
  return { init, destroy };
})();
