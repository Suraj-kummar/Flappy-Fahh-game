// ============================================================
//  SlidingPuzzleGame — 15-Puzzle (Sliding Puzzle) for Fahh Arcade
//  Canvas: puzzle-canvas (420 × 420)
//  Global: SlidingPuzzleGame
// ============================================================
const SlidingPuzzleGame = (() => {

  // ── Constants ──────────────────────────────────────────────
  const W = 420, H = 420;
  const GRID      = 4;
  const PAD       = 10;                     // outer padding
  const GAP       = 6;                      // gap between tiles
  const BOARD_X   = PAD;
  const BOARD_Y   = PAD + 44;              // leave room for header HUD
  const BOARD_W   = W - PAD * 2;
  const BOARD_H   = H - BOARD_Y - PAD;
  const TILE_W    = (BOARD_W - GAP * (GRID - 1)) / GRID;
  const TILE_H    = (BOARD_H - GAP * (GRID - 1)) / GRID;
  const ANIM_MS   = 150;                    // slide animation duration
  const LS_KEY    = 'best_puzzle';

  // Unique neon hue per tile (1-15), spaced around the colour wheel
  const TILE_HUES = [
    0,    // tile 1  — red
    24,   // tile 2  — orange-red
    40,   // tile 3  — orange
    55,   // tile 4  — yellow
    80,   // tile 5  — yellow-green
    120,  // tile 6  — green
    155,  // tile 7  — teal
    180,  // tile 8  — cyan
    200,  // tile 9  — sky-blue
    220,  // tile 10 — blue
    245,  // tile 11 — indigo
    270,  // tile 12 — violet
    295,  // tile 13 — magenta
    315,  // tile 14 — pink
    340,  // tile 15 — hot-pink
  ];

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let gameState;   // 'start' | 'playing' | 'won'
  let tiles;       // flat array length 16; 0 = blank, 1-15 = tile values
  let blankIdx;    // index in tiles[] of the blank
  let moves;
  let bestScore;
  let animating;   // { fromIdx, toIdx, startTs, tileVal } | null
  let particles;   // victory burst particles

  // Bound event listeners
  let boundKeyDown, boundClick, boundTouch;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    }
    return audioCtx;
  }

  function beep(freq, dur, type, vol) {
    type = type || 'sine';
    vol  = vol  || 0.18;
    const ac = getAudio();
    if (!ac) return;
    try {
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur);
    } catch (_) {}
  }

  function playSlide()   { beep(320, 0.07, 'triangle', 0.14); }
  function playInvalid() { beep(80, 0.08, 'sawtooth', 0.08); }
  function playWin() {
    [523, 659, 784, 1047].forEach(function(f, i) {
      setTimeout(function() { beep(f, 0.25, 'sine', 0.22); }, i * 100);
    });
  }

  // ── Puzzle helpers ─────────────────────────────────────────
  function idxToRC(idx) {
    return [Math.floor(idx / GRID), idx % GRID];
  }

  function rcToIdx(r, c) {
    return r * GRID + c;
  }

  function adjacent(a, b) {
    var ar = Math.floor(a / GRID), ac = a % GRID;
    var br = Math.floor(b / GRID), bc = b % GRID;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  function isSolved() {
    for (var i = 0; i < 15; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[15] === 0;
  }

  function countInversions(arr) {
    var inv = 0;
    for (var i = 0; i < arr.length - 1; i++) {
      for (var j = i + 1; j < arr.length; j++) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
      }
    }
    return inv;
  }

  function solvable(arr) {
    var inv          = countInversions(arr);
    var bIdx         = arr.indexOf(0);
    var rowFromBottom = GRID - Math.floor(bIdx / GRID);
    if (GRID % 2 === 1) {
      return inv % 2 === 0;
    } else {
      if (rowFromBottom % 2 === 1) return inv % 2 === 0;
      else                         return inv % 2 === 1;
    }
  }

  function isArraySolved(arr) {
    for (var i = 0; i < 15; i++) if (arr[i] !== i + 1) return false;
    return arr[15] === 0;
  }

  function shuffleSolvable() {
    var arr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
    do {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
    } while (!solvable(arr) || isArraySolved(arr));
    return arr;
  }

  // ── Tile pixel position helpers ────────────────────────────
  function tilePixel(idx) {
    var r = Math.floor(idx / GRID), c = idx % GRID;
    return {
      x: BOARD_X + c * (TILE_W + GAP),
      y: BOARD_Y + r * (TILE_H + GAP),
    };
  }

  // ── Colour helpers ─────────────────────────────────────────
  function tileColor(val) {
    var hue = TILE_HUES[val - 1];
    return {
      hue:    hue,
      fill:   'hsl(' + hue + ', 100%, 30%)',
      fill2:  'hsl(' + hue + ', 90%, 18%)',
      glow:   'hsl(' + hue + ', 100%, 60%)',
      border: 'hsl(' + hue + ', 100%, 55%)',
      text:   'hsl(' + hue + ', 100%, 88%)',
    };
  }

  // ── Draw helpers ───────────────────────────────────────────
  function clearCanvas() {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);
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

  function drawTile(val, x, y, alpha) {
    if (val === 0) return;
    if (alpha === undefined) alpha = 1;
    var c = tileColor(val);
    var r = 10;

    ctx.save();
    ctx.globalAlpha = alpha;

    var grad = ctx.createLinearGradient(x, y, x + TILE_W, y + TILE_H);
    grad.addColorStop(0, c.fill);
    grad.addColorStop(1, c.fill2);

    ctx.shadowBlur  = 18;
    ctx.shadowColor = c.glow;
    ctx.fillStyle   = grad;
    roundRect(x, y, TILE_W, TILE_H, r);
    ctx.fill();

    ctx.shadowBlur   = 10;
    ctx.shadowColor  = c.border;
    ctx.strokeStyle  = c.border;
    ctx.lineWidth    = 2;
    roundRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2, r - 1);
    ctx.stroke();

    ctx.shadowBlur   = 14;
    ctx.shadowColor  = c.glow;
    ctx.fillStyle    = c.text;
    ctx.font         = 'bold ' + (val >= 10 ? 26 : 30) + "px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), x + TILE_W / 2, y + TILE_H / 2 + 2);

    ctx.restore();
  }

  function drawBlankSlot(x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 6]);
    roundRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2, 9);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── HUD ────────────────────────────────────────────────────
  function drawHUD() {
    ctx.save();
    ctx.shadowBlur   = 12;
    ctx.shadowColor  = '#ffeaa7';
    ctx.fillStyle    = '#ffeaa7';
    ctx.font         = "10px 'Press Start 2P', monospace";
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOVES: ' + moves, PAD + 4, PAD + 22);
    ctx.restore();

    if (bestScore !== null) {
      ctx.save();
      ctx.shadowBlur   = 8;
      ctx.shadowColor  = '#74b9ff';
      ctx.fillStyle    = '#74b9ff';
      ctx.font         = "8px 'Press Start 2P', monospace";
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('BEST: ' + bestScore, W - PAD - 4, PAD + 22);
      ctx.restore();
    }
  }

  // ── Board draw ─────────────────────────────────────────────
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawBoard(now) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.shadowBlur = 0;
    roundRect(BOARD_X - 4, BOARD_Y - 4, BOARD_W + 8, BOARD_H + 8, 14);
    ctx.fill();
    ctx.restore();

    if (!animating) {
      for (var i = 0; i < 16; i++) {
        var p = tilePixel(i);
        if (tiles[i] === 0) drawBlankSlot(p.x, p.y);
        else                drawTile(tiles[i], p.x, p.y);
      }
      return;
    }

    var fromIdx = animating.fromIdx;
    var toIdx   = animating.toIdx;
    var startTs = animating.startTs;
    var tileVal = animating.tileVal;

    var elapsed = now - startTs;
    var t       = Math.min(elapsed / ANIM_MS, 1);
    var ease    = easeOutCubic(t);

    var from = tilePixel(fromIdx);
    var to   = tilePixel(toIdx);
    var ax   = from.x + (to.x - from.x) * ease;
    var ay   = from.y + (to.y - from.y) * ease;

    for (var j = 0; j < 16; j++) {
      if (j === fromIdx || j === toIdx) continue;
      var q = tilePixel(j);
      if (tiles[j] === 0) drawBlankSlot(q.x, q.y);
      else                drawTile(tiles[j], q.x, q.y);
    }

    drawBlankSlot(to.x, to.y);
    drawBlankSlot(from.x, from.y);
    drawTile(tileVal, ax, ay);

    if (t >= 1) {
      tiles[toIdx]   = tileVal;
      tiles[fromIdx] = 0;
      blankIdx       = fromIdx;
      animating      = null;

      if (isSolved()) onWin();
    }
  }

  // ── Particles ──────────────────────────────────────────────
  function spawnParticles() {
    particles = [];
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < 80; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 2 + Math.random() * 5;
      var hue   = Math.random() * 360;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.018,
        size: 3 + Math.random() * 5,
        color: 'hsl(' + hue + ',100%,65%)',
      });
    }
  }

  function updateParticles() {
    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x   += p.vx;
      p.y   += p.vy;
      p.vy  += 0.08;
      p.life -= p.decay;
      if (p.life > 0) alive.push(p);
    }
    particles = alive;
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Screens ────────────────────────────────────────────────
  function drawStartScreen() {
    clearCanvas();

    // Subtle gradient overlay
    ctx.save();
    var grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0,   'rgba(255,234,167,0.04)');
    grd.addColorStop(0.5, 'rgba(255,234,167,0.09)');
    grd.addColorStop(1,   'rgba(255,234,167,0.04)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Title
    ctx.save();
    ctx.shadowBlur   = 30;
    ctx.shadowColor  = '#ffeaa7';
    ctx.fillStyle    = '#ffeaa7';
    ctx.font         = "18px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('15-PUZZLE', W / 2, 72);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.shadowBlur   = 8;
    ctx.shadowColor  = '#a29bfe';
    ctx.fillStyle    = '#a29bfe';
    ctx.font         = "7px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SLIDE TILES INTO ORDER', W / 2, 106);
    ctx.restore();

    // Mini solved-puzzle preview
    var psz = 20, pgap = 3;
    var pw  = GRID * psz + (GRID - 1) * pgap;
    var px  = (W - pw) / 2, py = 130;
    for (var i = 0; i < 16; i++) {
      var pr = Math.floor(i / GRID), pc = i % GRID;
      var tx = px + pc * (psz + pgap);
      var ty = py + pr * (psz + pgap);
      if (i === 15) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(tx, ty, psz, psz);
        ctx.restore();
      } else {
        var h = TILE_HUES[i];
        ctx.save();
        ctx.shadowBlur  = 5;
        ctx.shadowColor = 'hsl(' + h + ',100%,60%)';
        ctx.fillStyle   = 'hsl(' + h + ',100%,28%)';
        ctx.fillRect(tx, ty, psz, psz);
        ctx.fillStyle   = 'hsl(' + h + ',100%,80%)';
        ctx.font        = '6px sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), tx + psz / 2, ty + psz / 2);
        ctx.restore();
      }
    }

    // Control hints
    var hints = [
      '\uD83D\uDDB1 CLICK tile to slide',
      '\u2328 ARROW KEYS = move blank',
    ];
    for (var k = 0; k < hints.length; k++) {
      ctx.save();
      ctx.shadowBlur   = 6;
      ctx.shadowColor  = '#4ecca3';
      ctx.fillStyle    = '#4ecca3';
      ctx.font         = "7px 'Press Start 2P', monospace";
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hints[k], W / 2, 308 + k * 24);
      ctx.restore();
    }

    // Best score
    if (bestScore !== null) {
      ctx.save();
      ctx.shadowBlur   = 8;
      ctx.shadowColor  = '#f9ca24';
      ctx.fillStyle    = '#f9ca24';
      ctx.font         = "8px 'Press Start 2P', monospace";
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83C\uDFC6 BEST: ' + bestScore + ' MOVES', W / 2, 360);
      ctx.restore();
    }

    // Pulsing start prompt
    var pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
    ctx.save();
    ctx.globalAlpha  = pulse;
    ctx.shadowBlur   = 16;
    ctx.shadowColor  = '#ffeaa7';
    ctx.fillStyle    = '#ffeaa7';
    ctx.font         = "10px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CLICK TO START', W / 2, 398);
    ctx.restore();
  }

  function drawWinScreen(now) {
    clearCanvas();
    updateParticles();
    drawParticles();

    // Victory title
    ctx.save();
    ctx.shadowBlur   = 40;
    ctx.shadowColor  = '#ffeaa7';
    ctx.fillStyle    = '#ffeaa7';
    ctx.font         = "16px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOU WIN! \uD83C\uDF89', W / 2, 82);
    ctx.restore();

    // Move count
    ctx.save();
    ctx.shadowBlur   = 14;
    ctx.shadowColor  = '#4ecca3';
    ctx.fillStyle    = '#4ecca3';
    ctx.font         = "10px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SOLVED IN ' + moves + ' MOVES', W / 2, 132);
    ctx.restore();

    // Best badge
    if (bestScore !== null) {
      var isNew = (moves <= bestScore);
      ctx.save();
      ctx.shadowBlur   = 12;
      ctx.shadowColor  = isNew ? '#f9ca24' : '#74b9ff';
      ctx.fillStyle    = isNew ? '#f9ca24' : '#74b9ff';
      ctx.font         = "8px 'Press Start 2P', monospace";
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        isNew ? '\uD83C\uDFC6 NEW BEST: ' + bestScore + ' MOVES!' : '\uD83C\uDFC6 BEST: ' + bestScore + ' MOVES',
        W / 2, 165
      );
      ctx.restore();
    }

    // Solved puzzle mini-preview with gentle wobble
    var psz = 22, pgap = 4;
    var pw  = GRID * psz + (GRID - 1) * pgap;
    var px  = (W - pw) / 2, py = 200;
    for (var i = 0; i < 16; i++) {
      var pr = Math.floor(i / GRID), pc = i % GRID;
      var tx = px + pc * (psz + pgap);
      var jit = Math.sin(now / 500 + i) * 1.5;
      var ty = py + pr * (psz + pgap) + jit;
      if (i === 15) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(tx, ty, psz, psz);
        ctx.restore();
      } else {
        var h = TILE_HUES[i];
        ctx.save();
        ctx.shadowBlur  = 8;
        ctx.shadowColor = 'hsl(' + h + ',100%,60%)';
        ctx.fillStyle   = 'hsl(' + h + ',100%,28%)';
        ctx.fillRect(tx, ty, psz, psz);
        ctx.fillStyle   = 'hsl(' + h + ',100%,80%)';
        ctx.font        = '7px sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), tx + psz / 2, ty + psz / 2);
        ctx.restore();
      }
    }

    // Play-again prompt
    var pulse2 = 0.55 + 0.45 * Math.sin(Date.now() / 450);
    ctx.save();
    ctx.globalAlpha  = pulse2;
    ctx.shadowBlur   = 16;
    ctx.shadowColor  = '#fd79a8';
    ctx.fillStyle    = '#fd79a8';
    ctx.font         = "10px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CLICK TO PLAY AGAIN', W / 2, 398);
    ctx.restore();
  }

  // ── Main game loop ─────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    var now = ts || performance.now();

    if (gameState === 'start') {
      drawStartScreen();
      return;
    }

    if (gameState === 'won') {
      drawWinScreen(now);
      return;
    }

    // playing
    clearCanvas();
    drawHUD();
    drawBoard(now);
  }

  // ── Game flow ──────────────────────────────────────────────
  function startGame() {
    tiles     = shuffleSolvable();
    blankIdx  = tiles.indexOf(0);
    moves     = 0;
    animating = null;
    particles = [];
    gameState = 'playing';
  }

  function onWin() {
    gameState = 'won';
    var prev  = localStorage.getItem(LS_KEY);
    if (prev === null || moves < parseInt(prev)) {
      localStorage.setItem(LS_KEY, moves);
      bestScore = moves;
    }
    spawnParticles();
    playWin();
  }

  // ── Move logic ─────────────────────────────────────────────
  function tryMove(tileIdx) {
    if (animating) return false;
    if (tiles[tileIdx] === 0) return false;
    if (!adjacent(tileIdx, blankIdx)) {
      playInvalid();
      return false;
    }

    var tileVal = tiles[tileIdx];
    animating = {
      fromIdx: tileIdx,
      toIdx:   blankIdx,
      startTs: performance.now(),
      tileVal: tileVal,
    };
    moves++;
    playSlide();
    return true;
  }

  function tryArrowMove(dr, dc) {
    if (animating) return;
    var br = Math.floor(blankIdx / GRID), bc = blankIdx % GRID;
    var tr = br + dr, tc = bc + dc;
    if (tr < 0 || tr >= GRID || tc < 0 || tc >= GRID) return;
    tryMove(rcToIdx(tr, tc));
  }

  // ── Event handlers ─────────────────────────────────────────
  function onKeyDown(e) {
    if (gameState === 'start' || gameState === 'won') {
      if (e.code === 'Space' || e.code === 'Enter') {
        startGame();
        return;
      }
    }
    if (gameState !== 'playing') return;

    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); tryArrowMove(-1,  0); break;
      case 'ArrowDown':  e.preventDefault(); tryArrowMove(+1,  0); break;
      case 'ArrowLeft':  e.preventDefault(); tryArrowMove( 0, -1); break;
      case 'ArrowRight': e.preventDefault(); tryArrowMove( 0, +1); break;
    }
  }

  function onClick(e) {
    if (gameState === 'start' || gameState === 'won') {
      startGame();
      return;
    }
    if (gameState !== 'playing') return;

    var rect = canvas.getBoundingClientRect();
    var mx   = (e.clientX - rect.left) * (W / rect.width);
    var my   = (e.clientY - rect.top)  * (H / rect.height);

    for (var i = 0; i < 16; i++) {
      var p = tilePixel(i);
      if (mx >= p.x && mx <= p.x + TILE_W && my >= p.y && my <= p.y + TILE_H) {
        tryMove(i);
        return;
      }
    }
  }

  function onTouch(e) {
    e.preventDefault();
    if (e.touches.length === 0) return;
    var touch = e.touches[0];
    onClick({ clientX: touch.clientX, clientY: touch.clientY });
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');

    var stored = localStorage.getItem(LS_KEY);
    bestScore  = (stored !== null) ? parseInt(stored) : null;

    gameState = 'start';
    tiles     = [];
    moves     = 0;
    animating = null;
    particles = [];

    boundKeyDown = onKeyDown;
    boundClick   = onClick;
    boundTouch   = onTouch;

    window.addEventListener('keydown', boundKeyDown);
    canvas.addEventListener('click',      boundClick);
    canvas.addEventListener('touchstart', boundTouch, { passive: false });

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas && boundClick)  canvas.removeEventListener('click',      boundClick);
    if (canvas && boundTouch)  canvas.removeEventListener('touchstart', boundTouch);
    if (boundKeyDown)          window.removeEventListener('keydown',    boundKeyDown);

    if (audioCtx) {
      try { audioCtx.close(); } catch (_) {}
      audioCtx = null;
    }

    canvas    = null;
    ctx       = null;
    tiles     = [];
    animating = null;
    particles = [];
  }

  return { init: init, destroy: destroy };

})();
