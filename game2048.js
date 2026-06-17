// ============================================================
//  Game2048 — Classic 2048 for Fahh Arcade
//  Canvas: g2048-canvas (420 x 420)
//  Global: Game2048
// ============================================================
const Game2048 = (() => {

  // ── Constants ──────────────────────────────────────────────
  const GRID        = 4;
  const PAD         = 10;          // outer padding
  const GAP         = 8;           // gap between tiles
  const HEADER_H    = 80;          // HUD height above board
  const LS_KEY      = 'best_2048';

  // Tile colours (official 2048 palette, adapted for neon)
  const TILE_COLORS = {
       2: { bg: '#eee4da',    fg: '#776e65', glow: 'rgba(238,228,218,0.4)'  },
       4: { bg: '#ede0c8',    fg: '#776e65', glow: 'rgba(237,224,200,0.4)'  },
       8: { bg: '#f2b179',    fg: '#f9f6f2', glow: 'rgba(242,177,121,0.6)'  },
      16: { bg: '#f59563',    fg: '#f9f6f2', glow: 'rgba(245,149,99,0.6)'   },
      32: { bg: '#f67c5f',    fg: '#f9f6f2', glow: 'rgba(246,124,95,0.6)'   },
      64: { bg: '#f65e3b',    fg: '#f9f6f2', glow: 'rgba(246,94,59,0.7)'    },
     128: { bg: '#edcf72',    fg: '#f9f6f2', glow: 'rgba(237,207,114,0.7)'  },
     256: { bg: '#edcc61',    fg: '#f9f6f2', glow: 'rgba(237,204,97,0.7)'   },
     512: { bg: '#edc850',    fg: '#f9f6f2', glow: 'rgba(237,200,80,0.8)'   },
    1024: { bg: '#edc53f',    fg: '#f9f6f2', glow: 'rgba(237,197,63,0.8)'   },
    2048: { bg: '#edc22e',    fg: '#f9f6f2', glow: 'rgba(237,194,46,1.0)'   },
  };
  const TILE_DEFAULT = { bg: '#3c3a5e', fg: '#f9f6f2', glow: 'rgba(150,120,255,0.5)' };

  const CLR = {
    bg        : '#0d0d1a',
    gridBg    : '#1a1a35',
    empty     : '#2a2a4a',
    text      : '#ffffff',
    dim       : '#555577',
    accent    : '#a29bfe',
    gold      : '#f9ca24',
    red       : '#ff6b6b',
    green     : '#4ecca3',
    border    : '#2e2e55',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let board;          // 4x4 array of { value, id, born, merged, scale }
  let score, bestScore;
  let gameState;      // 'start' | 'playing' | 'won' | 'dead'
  let wonAcknowledged;
  let tileIdCounter;
  let lastTs;

  // event listener refs for cleanup
  let boundKeyDown, boundClick, boundTouchStart, boundTouchEnd;
  let touchStartX, touchStartY;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, type, duration, gain) {
    try {
      const ac  = getAudio();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      g.gain.setValueAtTime(gain || 0.18, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.start(); osc.stop(ac.currentTime + duration);
    } catch (e) {}
  }

  function playSlide()  { beep(220, 'sine',    0.06, 0.10); }
  function playMerge(v) {
    const note = Math.min(880, 200 + Math.log2(v) * 55);
    beep(note, 'triangle', 0.12, 0.22);
  }
  function playWin() {
    try {
      const ac = getAudio();
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        const osc = ac.createOscillator(); const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'triangle'; osc.frequency.value = f;
        const t = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.25);
      });
    } catch (e) {}
  }
  function playDie() {
    try {
      const ac  = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(55, ac.currentTime + 0.6);
      g.gain.setValueAtTime(0.3, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
      osc.start(); osc.stop(ac.currentTime + 0.6);
    } catch (e) {}
  }

  // ── Board helpers ──────────────────────────────────────────
  function emptyBoard() {
    return Array.from({ length: GRID }, () =>
      Array.from({ length: GRID }, () => null)
    );
  }

  function makeCell(value) {
    return { value, id: tileIdCounter++, born: true, merged: false, scale: 0 };
  }

  function emptyCells() {
    const cells = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (!board[r][c]) cells.push({ r, c });
    return cells;
  }

  function spawnTile() {
    const cells = emptyCells();
    if (!cells.length) return;
    const { r, c } = cells[Math.floor(Math.random() * cells.length)];
    board[r][c] = makeCell(Math.random() < 0.9 ? 2 : 4);
  }

  // ── Slide logic ────────────────────────────────────────────
  function slideRow(row) {
    let line   = row.filter(x => x !== null);
    let gained = 0;
    let merged = false;

    for (let i = 0; i < line.length - 1; i++) {
      if (line[i].value === line[i + 1].value) {
        const newVal = line[i].value * 2;
        gained += newVal;
        line[i]         = makeCell(newVal);
        line[i].merged  = true;
        line[i].scale   = 1.25; // pop animation start
        line.splice(i + 1, 1);
        merged = true;
      }
    }
    while (line.length < GRID) line.push(null);
    return { line, gained, merged };
  }

  function rotateBoard(b, times) {
    let result = b;
    for (let t = 0; t < times; t++) {
      const next = emptyBoard();
      for (let r = 0; r < GRID; r++)
        for (let c = 0; c < GRID; c++)
          next[c][GRID - 1 - r] = result[r][c];
      result = next;
    }
    return result;
  }

  function move(dir) {
    const rotMap  = { left: 0, down: 1, right: 2, up: 3 };
    const rotBack = { left: 0, down: 3, right: 2, up: 1 };
    let b = rotateBoard(board, rotMap[dir]);

    let moved    = false;
    let gained   = 0;
    let didMerge = false;

    for (let r = 0; r < GRID; r++) {
      const { line, gained: g, merged } = slideRow(b[r]);
      for (let c = 0; c < GRID; c++) {
        const oldVal = b[r][c] ? b[r][c].value : 0;
        const newVal = line[c] ? line[c].value : 0;
        if (oldVal !== newVal) moved = true;
      }
      b[r] = line;
      gained += g;
      if (merged) didMerge = true;
    }

    board = rotateBoard(b, rotBack[dir]);

    if (moved) {
      score += gained;
      saveBest();
      if (didMerge) playMerge(gained || 2);
      else          playSlide();
      spawnTile();
      checkState();
    }
    return moved;
  }

  function hasMovesLeft() {
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        if (!board[r][c]) return true;
        const v = board[r][c].value;
        if (c < GRID - 1 && board[r][c + 1] && board[r][c + 1].value === v) return true;
        if (r < GRID - 1 && board[r + 1] && board[r + 1][c] && board[r + 1][c].value === v) return true;
      }
    return false;
  }

  function hasTile(n) {
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (board[r][c] && board[r][c].value === n) return true;
    return false;
  }

  function checkState() {
    if (!wonAcknowledged && hasTile(2048)) {
      gameState = 'won';
      playWin();
      return;
    }
    if (!hasMovesLeft()) {
      gameState = 'dead';
      saveBest();
      playDie();
    }
  }

  // ── Score helpers ──────────────────────────────────────────
  function loadBest() { bestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10); }
  function saveBest() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(LS_KEY, bestScore);
    }
  }

  // ── Game init ──────────────────────────────────────────────
  function initGame() {
    board           = emptyBoard();
    score           = 0;
    tileIdCounter   = 1;
    wonAcknowledged = false;
    gameState       = 'playing';
    lastTs          = null;
    spawnTile();
    spawnTile();
  }

  // ── Drawing ────────────────────────────────────────────────
  function boardSize() { return canvas.width - PAD * 2; }
  function cellSize()  { return (boardSize() - GAP * (GRID + 1)) / GRID; }
  function cellX(c)    { return PAD + GAP + c * (cellSize() + GAP); }
  function cellY(r)    { return HEADER_H + PAD + GAP + r * (cellSize() + GAP); }

  function roundRect(c, x, y, w, h, r) {
    if (c.roundRect) {
      c.beginPath(); c.roundRect(x, y, w, h, r);
    } else {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }
  }

  function drawBackground() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bSize = boardSize();
    const bY    = HEADER_H + PAD;
    ctx.save();
    ctx.shadowBlur  = 24;
    ctx.shadowColor = 'rgba(100,80,200,0.3)';
    ctx.fillStyle   = CLR.gridBg;
    roundRect(ctx, PAD, bY, bSize, bSize, 12);
    ctx.fill();
    ctx.restore();

    const cs = cellSize();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        ctx.fillStyle = CLR.empty;
        roundRect(ctx, cellX(c), cellY(r), cs, cs, 8);
        ctx.fill();
      }
    }
  }

  function drawHUD() {
    const cx = canvas.width / 2;

    ctx.save();
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.font         = "bold 26px 'Press Start 2P', monospace";
    ctx.shadowBlur   = 18;
    ctx.shadowColor  = '#edc22e';
    ctx.fillStyle    = '#edc22e';
    ctx.fillText('2048', PAD, 12);
    ctx.restore();

    drawScoreBox(cx + 8,  6, 82, 52, 'SCORE', score,     CLR.accent);
    drawScoreBox(cx + 100, 6, 82, 52, 'BEST',  bestScore, CLR.gold);
  }

  function drawScoreBox(x, y, w, h, label, value, color) {
    ctx.save();
    ctx.fillStyle  = CLR.border;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = CLR.dim;
    ctx.font         = "7px 'Press Start 2P', monospace";
    ctx.fillText(label, x + w / 2, y + 8);

    ctx.fillStyle    = color;
    ctx.font         = "bold 12px 'Press Start 2P', monospace";
    ctx.textBaseline = 'middle';
    const dispVal = value >= 100000 ? (value / 1000).toFixed(0) + 'k' : String(value);
    ctx.fillText(dispVal, x + w / 2, y + h * 0.70);
    ctx.restore();
  }

  function getTileColors(value) {
    return TILE_COLORS[value] || TILE_DEFAULT;
  }

  function drawTiles() {
    const cs = cellSize();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const tile = board[r][c];
        if (!tile) continue;

        // Animate scale
        let sc = (tile.scale !== undefined) ? tile.scale : 1;
        if (tile.born) {
          sc = Math.min(1, sc + 0.09);
          tile.scale = sc;
          if (sc >= 1) { tile.born = false; tile.scale = 1; }
        } else if (tile.merged && sc > 1) {
          sc = Math.max(1, sc - 0.05);
          tile.scale = sc;
          if (sc <= 1) { tile.merged = false; tile.scale = 1; }
        }

        const px = cellX(c);
        const py = cellY(r);
        const ox = px + cs / 2;
        const oy = py + cs / 2;

        const { bg, fg, glow } = getTileColors(tile.value);

        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(sc, sc);

        ctx.shadowBlur  = tile.value >= 128 ? 24 : 12;
        ctx.shadowColor = glow;
        ctx.fillStyle   = bg;
        roundRect(ctx, -cs / 2, -cs / 2, cs, cs, 8);
        ctx.fill();

        // Inner highlight shimmer
        ctx.shadowBlur = 0;
        ctx.fillStyle  = 'rgba(255,255,255,0.14)';
        roundRect(ctx, -cs / 2 + 4, -cs / 2 + 4, cs - 8, Math.max(4, cs * 0.18), 4);
        ctx.fill();

        // Number text
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = fg;
        const numStr   = String(tile.value);
        const fontSize = numStr.length <= 2 ? cs * 0.36 :
                         numStr.length === 3 ? cs * 0.28 :
                         numStr.length === 4 ? cs * 0.21 : cs * 0.17;
        ctx.font = `bold ${Math.round(fontSize)}px 'Press Start 2P', monospace`;
        ctx.fillText(numStr, 0, 1);

        ctx.restore();
      }
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    // Title
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 44;
    ctx.shadowColor  = '#edc22e';
    ctx.fillStyle    = '#edc22e';
    ctx.font         = "bold 48px 'Press Start 2P', monospace";
    ctx.fillText('2048', cx, cy - 88);
    ctx.restore();

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = CLR.accent;
    ctx.font         = "9px 'Press Start 2P', monospace";
    ctx.fillText('FAHH ARCADE', cx, cy - 42);
    ctx.restore();

    // Instructions
    [
      { text: 'Merge tiles to reach 2048!', col: '#ccc',    y: cy - 2  },
      { text: 'Arrow Keys / WASD to slide', col: CLR.dim,   y: cy + 22 },
      { text: 'Swipe on mobile',            col: CLR.dim,   y: cy + 42 },
    ].forEach(l => {
      ctx.save();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = l.col;
      ctx.font         = "7px 'Press Start 2P', monospace";
      ctx.fillText(l.text, cx, l.y);
      ctx.restore();
    });

    if (bestScore > 0) {
      ctx.save();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = CLR.gold;
      ctx.font         = "8px 'Press Start 2P', monospace";
      ctx.fillText('BEST: ' + bestScore, cx, cy + 80);
      ctx.restore();
    }

    // Pulsing prompt
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    ctx.save();
    ctx.globalAlpha  = 0.5 + 0.5 * pulse;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 14;
    ctx.shadowColor  = CLR.accent;
    ctx.fillStyle    = CLR.accent;
    ctx.font         = "8px 'Press Start 2P', monospace";
    ctx.fillText('PRESS ANY KEY OR TAP', cx, cy + 115);
    ctx.restore();
  }

  function drawButton(cx, cy, w, h, label, color, bgColor) {
    ctx.save();
    ctx.fillStyle   = bgColor;
    ctx.shadowBlur  = 18;
    ctx.shadowColor = color;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
    ctx.stroke();

    ctx.shadowBlur   = 10;
    ctx.shadowColor  = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = color;
    ctx.font         = "7px 'Press Start 2P', monospace";
    ctx.fillText(label, cx, cy);
    ctx.restore();
  }

  function drawWonOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 44;
    ctx.shadowColor  = '#edc22e';
    ctx.fillStyle    = '#edc22e';
    ctx.font         = "bold 28px 'Press Start 2P', monospace";
    ctx.fillText('YOU WIN!', cx, cy - 80);
    ctx.restore();

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#fff';
    ctx.font         = "9px 'Press Start 2P', monospace";
    ctx.fillText('Score: ' + score, cx, cy - 30);
    ctx.restore();

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = CLR.gold;
    ctx.font         = "8px 'Press Start 2P', monospace";
    ctx.fillText('Best: ' + bestScore, cx, cy - 8);
    ctx.restore();

    drawButton(cx, cy + 42, 170, 40, 'CONTINUE PLAYING', CLR.green,  '#0a2a1c');
    drawButton(cx, cy + 96, 170, 40, 'NEW GAME',          CLR.accent, '#12103a');
  }

  function drawGameOverOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.84)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 38;
    ctx.shadowColor  = CLR.red;
    ctx.fillStyle    = CLR.red;
    ctx.font         = "bold 22px 'Press Start 2P', monospace";
    ctx.fillText('GAME OVER', cx, cy - 80);
    ctx.restore();

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#fff';
    ctx.font         = "9px 'Press Start 2P', monospace";
    ctx.fillText('Score: ' + score, cx, cy - 30);
    ctx.restore();

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = CLR.gold;
    ctx.font         = "8px 'Press Start 2P', monospace";
    ctx.fillText('Best: ' + bestScore, cx, cy - 8);
    ctx.restore();

    drawButton(cx, cy + 55, 160, 40, 'TRY AGAIN', CLR.accent, '#12103a');
  }

  // ── Hit-test helpers ───────────────────────────────────────
  function hitButton(x, y, cx, cy, w, h) {
    return x >= cx - w / 2 && x <= cx + w / 2 &&
           y >= cy - h / 2 && y <= cy + h / 2;
  }

  function handleOverlayClick(x, y) {
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    if (gameState === 'won') {
      if (hitButton(x, y, cx, cy + 42, 170, 40)) {
        wonAcknowledged = true;
        gameState = 'playing';
        return;
      }
      if (hitButton(x, y, cx, cy + 96, 170, 40)) {
        initGame(); return;
      }
    }
    if (gameState === 'dead') {
      if (hitButton(x, y, cx, cy + 55, 160, 40)) {
        initGame(); return;
      }
    }
  }

  // ── Main loop ──────────────────────────────────────────────
  function loop() {
    animId = requestAnimationFrame(loop);

    if (gameState === 'start') {
      drawStartScreen();
      return;
    }

    drawBackground();
    drawHUD();
    drawTiles();

    if (gameState === 'won')  drawWonOverlay();
    if (gameState === 'dead') drawGameOverOverlay();
  }

  // ── Input ──────────────────────────────────────────────────
  function onKeyDown(e) {
    if (gameState === 'start') {
      initGame(); return;
    }
    if (gameState === 'dead') {
      if (['Enter', ' ', 'Space'].includes(e.key) || e.code === 'Space') initGame();
      return;
    }
    if (gameState === 'won') {
      if (['Enter', ' ', 'Space'].includes(e.key) || e.code === 'Space') {
        wonAcknowledged = true;
        gameState = 'playing';
      }
      return;
    }
    switch (e.key) {
      case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); move('left');  break;
      case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move('right'); break;
      case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); move('up');    break;
      case 'ArrowDown':  case 's': case 'S': e.preventDefault(); move('down');  break;
    }
  }

  function onClick(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;

    if (gameState === 'start')                   { initGame(); return; }
    if (gameState === 'won' || gameState === 'dead') { handleOverlayClick(x, y); return; }
  }

  function onTouchStart(e) {
    if (gameState === 'start') { e.preventDefault(); initGame(); return; }
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function onTouchEnd(e) {
    if (gameState === 'won' || gameState === 'dead') {
      const t    = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (t.clientX - rect.left) * scaleX;
      const y = (t.clientY - rect.top)  * scaleY;
      handleOverlayClick(x, y);
      return;
    }
    if (gameState !== 'playing') return;

    const t     = e.changedTouches[0];
    const dx    = t.clientX - touchStartX;
    const dy    = t.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    e.preventDefault();
    move(absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    loadBest();

    score         = 0;
    tileIdCounter = 1;
    gameState     = 'start';
    lastTs        = null;

    boundKeyDown    = onKeyDown.bind(this);
    boundClick      = onClick.bind(this);
    boundTouchStart = onTouchStart.bind(this);
    boundTouchEnd   = onTouchEnd.bind(this);

    window.addEventListener('keydown',   boundKeyDown);
    canvas.addEventListener('click',     boundClick);
    canvas.addEventListener('touchstart', boundTouchStart, { passive: false });
    canvas.addEventListener('touchend',   boundTouchEnd,   { passive: false });

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    window.removeEventListener('keydown', boundKeyDown);
    if (canvas) {
      canvas.removeEventListener('click',      boundClick);
      canvas.removeEventListener('touchstart', boundTouchStart);
      canvas.removeEventListener('touchend',   boundTouchEnd);
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    canvas = null;
    ctx    = null;
  }

  return { init, destroy };
})();

// arcade-hub: input registered
