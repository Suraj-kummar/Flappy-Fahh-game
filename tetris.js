// ============================================================
//  TetrisGame — Classic Neon Tetris for Fahh Arcade
//  Canvas: tetris-canvas (280 x 560)
//  Global: TetrisGame
// ============================================================
const TetrisGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const COLS      = 10;
  const ROWS      = 20;
  const CELL      = 28;           // 280 / 10
  const PREVIEW_X = 0;            // preview drawn in HUD area

  // All 7 Tetrominoes: shape matrices
  const PIECES = {
    I: { color: '#74b9ff', glow: '#74b9ff', cells: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    O: { color: '#f9ca24', glow: '#f9ca24', cells: [[1,1],[1,1]] },
    T: { color: '#a29bfe', glow: '#a29bfe', cells: [[0,1,0],[1,1,1],[0,0,0]] },
    S: { color: '#4ecca3', glow: '#4ecca3', cells: [[0,1,1],[1,1,0],[0,0,0]] },
    Z: { color: '#ff6b6b', glow: '#ff6b6b', cells: [[1,1,0],[0,1,1],[0,0,0]] },
    J: { color: '#fd79a8', glow: '#fd79a8', cells: [[1,0,0],[1,1,1],[0,0,0]] },
    L: { color: '#e17055', glow: '#e17055', cells: [[0,0,1],[1,1,1],[0,0,0]] },
  };
  const PIECE_KEYS = Object.keys(PIECES);

  // Scoring
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const CLR = {
    bg     : '#0d0d1a',
    border : '#1e1e3a',
    ghost  : 'rgba(255,255,255,0.12)',
    text   : '#ffffff',
    dim    : '#555577',
    accent : '#a29bfe',
    gold   : '#f9ca24',
    red    : '#ff6b6b',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let board;          // 2D array [ROWS][COLS] of color|null
  let current, next;
  let score, bestScore, lines, level;
  let gameState;      // 'start' | 'playing' | 'dead'
  let dropTimer, dropInterval;
  let lastTs;
  let boundKeyDown, boundClick, boundTouch;
  let lockDelay, lockTimer;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playRotate() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ac.currentTime + 0.06);
      g.gain.setValueAtTime(0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
      osc.start(); osc.stop(ac.currentTime + 0.1);
    } catch(e) {}
  }

  function playLand() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ac.currentTime);
      g.gain.setValueAtTime(0.2, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
      osc.start(); osc.stop(ac.currentTime + 0.08);
    } catch(e) {}
  }

  function playLineClear(n) {
    try {
      const ac = getAudio();
      const freqs = n === 4 ? [523,659,784,1047] : [440,554,659];
      freqs.forEach((f, i) => {
        const osc = ac.createOscillator(); const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'triangle';
        osc.frequency.value = f;
        const t = ac.currentTime + i * 0.07;
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.18);
      });
    } catch(e) {}
  }

  // ── Board helpers ──────────────────────────────────────────
  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function randomPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const def = PIECES[key];
    return {
      key,
      color : def.color,
      glow  : def.glow,
      cells : def.cells.map(r => [...r]),
      x     : Math.floor(COLS / 2) - Math.floor(def.cells[0].length / 2),
      y     : 0,
    };
  }

  function rotate(cells) {
    const N = cells.length;
    return cells[0].map((_, c) => cells.map((row, r) => cells[N - 1 - r][c]));
  }

  function collides(cells, px, py) {
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        if (!cells[r][c]) continue;
        const nx = px + c, ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function lock(piece) {
    piece.cells.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const ny = piece.y + r;
        if (ny < 0) { gameState = 'dead'; saveBest(); return; }
        board[ny][piece.x + c] = piece.color;
      });
    });
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(c => c !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // recheck same row index
      }
    }
    if (cleared) {
      lines += cleared;
      score += LINE_SCORES[cleared] * level;
      level = 1 + Math.floor(lines / 10);
      dropInterval = Math.max(80, 800 - (level - 1) * 70);
      playLineClear(cleared);
    }
  }

  function ghostY() {
    let gy = current.y;
    while (!collides(current.cells, current.x, gy + 1)) gy++;
    return gy;
  }

  // ── Game control ───────────────────────────────────────────
  function loadBest() { bestScore = parseInt(localStorage.getItem('tetris_best') || '0', 10); }
  function saveBest()  { if (score > bestScore) { bestScore = score; localStorage.setItem('tetris_best', bestScore); } }

  function initGame() {
    board        = emptyBoard();
    score        = 0;
    lines        = 0;
    level        = 1;
    dropTimer    = 0;
    dropInterval = 800;
    current      = randomPiece();
    next         = randomPiece();
    gameState    = 'playing';
    lastTs       = null;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    landPiece();
  }

  function landPiece() {
    lock(current);
    if (gameState === 'dead') { playDie(); return; }
    clearLines();
    current = next;
    next    = randomPiece();
    if (collides(current.cells, current.x, current.y)) {
      gameState = 'dead';
      saveBest();
      playDie();
    }
    playLand();
    dropTimer = 0;
  }

  function playDie() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ac.currentTime + 0.5);
      g.gain.setValueAtTime(0.3, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.start(); osc.stop(ac.currentTime + 0.5);
    } catch(e) {}
  }

  // ── Drawing ────────────────────────────────────────────────
  const BOARD_X = 0;
  const BOARD_Y = 60;   // leave top 60px for HUD

  function drawBg() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // board border
    ctx.strokeStyle = CLR.border;
    ctx.lineWidth   = 2;
    ctx.strokeRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
  }

  function drawCell(x, y, color, glow, alpha) {
    const px = BOARD_X + x * CELL;
    const py = BOARD_Y + y * CELL;
    ctx.save();
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = glow || color;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 3);
    ctx.fill();
    // inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(px + 2, py + 2, CELL - 4, 6, 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoard() {
    board.forEach((row, r) => {
      row.forEach((color, c) => {
        if (color) drawCell(c, r, color, color);
      });
    });
  }

  function drawGhost() {
    if (gameState !== 'playing') return;
    const gy = ghostY();
    current.cells.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const px = BOARD_X + (current.x + c) * CELL;
        const py = BOARD_Y + (gy + r) * CELL;
        ctx.fillStyle = CLR.ghost;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 3);
        ctx.fill();
      });
    });
  }

  function drawCurrent() {
    current.cells.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        const cy = current.y + r;
        if (cy < 0) return;
        drawCell(current.x + c, cy, current.color, current.glow);
      });
    });
  }

  function drawHUD() {
    // Background strip
    ctx.fillStyle = '#111128';
    ctx.fillRect(0, 0, canvas.width, 58);

    ctx.textAlign  = 'left';
    ctx.fillStyle  = CLR.dim;
    ctx.font       = '11px monospace';
    ctx.fillText('SCORE', 6, 16);
    ctx.fillStyle  = CLR.text;
    ctx.font       = 'bold 15px monospace';
    ctx.fillText(score, 6, 34);

    ctx.fillStyle  = CLR.dim;
    ctx.font       = '11px monospace';
    ctx.fillText('LINES', 6, 52);

    ctx.textAlign  = 'center';
    ctx.fillStyle  = CLR.dim;
    ctx.font       = '11px monospace';
    ctx.fillText('LVL', canvas.width / 2, 16);
    ctx.fillStyle  = CLR.accent;
    ctx.font       = 'bold 20px monospace';
    ctx.fillText(level, canvas.width / 2, 38);

    ctx.fillStyle  = CLR.dim;
    ctx.font       = '11px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(lines + ' lines', canvas.width / 2, 54);

    // BEST
    ctx.textAlign  = 'right';
    ctx.fillStyle  = CLR.dim;
    ctx.font       = '11px monospace';
    ctx.fillText('BEST', canvas.width - 6, 16);
    ctx.fillStyle  = CLR.gold;
    ctx.font       = 'bold 13px monospace';
    ctx.fillText(bestScore, canvas.width - 6, 34);

    // NEXT label
    ctx.fillStyle  = CLR.dim;
    ctx.font       = '11px monospace';
    ctx.fillText('NEXT', canvas.width - 6, 52);

    // Draw next piece (small, top right area below HUD strip)
    drawNextPiece();
  }

  function drawNextPiece() {
    const def   = next.cells;
    const ox    = canvas.width - (def[0].length * 14) - 4;
    const oy    = 62;
    const small = 13;
    def.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        ctx.save();
        ctx.shadowBlur  = 8;
        ctx.shadowColor = next.glow;
        ctx.fillStyle   = next.color;
        ctx.beginPath();
        ctx.roundRect(ox + c * small, oy + r * small, small - 1, small - 1, 2);
        ctx.fill();
        ctx.restore();
      });
    });
  }

  function drawOverlay(title, titleColor, titleGlow) {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 28;
    ctx.shadowColor = titleGlow;
    ctx.fillStyle   = titleColor;
    ctx.font        = 'bold 36px monospace';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 70);
    ctx.restore();

    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 18px monospace';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = CLR.gold;
    ctx.font      = 'bold 14px monospace';
    ctx.fillText('Best:  ' + bestScore, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillStyle = CLR.dim;
    ctx.font      = '12px monospace';
    ctx.fillText('Lines: ' + lines + '  Level: ' + level, canvas.width / 2, canvas.height / 2 + 35);

    ctx.fillStyle = CLR.accent;
    ctx.font      = 'bold 13px monospace';
    ctx.fillText('SPACE or TAP to ' + (title === 'TETRIS' ? 'START' : 'RESTART'), canvas.width / 2, canvas.height / 2 + 70);
  }

  // ── Main Loop ──────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    drawBg();

    if (gameState === 'start') {
      // Draw empty board outline + overlay
      ctx.strokeStyle = CLR.border;
      ctx.lineWidth   = 2;
      ctx.strokeRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
      drawOverlay('TETRIS', PIECES.T.color, PIECES.T.glow);
      return;
    }

    if (gameState === 'dead') {
      drawBoard();
      drawHUD();
      drawOverlay('GAME OVER', CLR.red, CLR.red);
      return;
    }

    // playing
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    lastTs   = ts;

    dropTimer += dt;
    if (dropTimer >= dropInterval) {
      dropTimer = 0;
      if (!collides(current.cells, current.x, current.y + 1)) {
        current.y++;
      } else {
        landPiece();
      }
    }

    drawBoard();
    drawGhost();
    drawCurrent();
    drawHUD();
  }

  // ── Input ──────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'start' || gameState === 'dead') { initGame(); return; }
      hardDrop();
      return;
    }
    if (gameState !== 'playing') return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (!collides(current.cells, current.x - 1, current.y)) current.x--;
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!collides(current.cells, current.x + 1, current.y)) current.x++;
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!collides(current.cells, current.x, current.y + 1)) { current.y++; score++; dropTimer = 0; }
        break;
      case 'ArrowUp':
      case 'x': case 'X': {
        e.preventDefault();
        const rotated = rotate(current.cells);
        // Wall kick: try center, left, right
        for (const dx of [0, -1, 1, -2, 2]) {
          if (!collides(rotated, current.x + dx, current.y)) {
            current.cells = rotated;
            current.x    += dx;
            playRotate();
            break;
          }
        }
        break;
      }
    }
  }

  function handleAction() {
    if (gameState === 'start' || gameState === 'dead') initGame();
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    loadBest();
    gameState    = 'start';
    score        = 0; lines = 0; level = 1;

    boundKeyDown = onKeyDown;
    boundClick   = () => handleAction();
    boundTouch   = (e) => { e.preventDefault(); handleAction(); };

    window.addEventListener('keydown', boundKeyDown);
    canvas.addEventListener('click',   boundClick);
    canvas.addEventListener('touchstart', boundTouch, { passive: false });

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('keydown', boundKeyDown);
    if (canvas) {
      canvas.removeEventListener('click',      boundClick);
      canvas.removeEventListener('touchstart', boundTouch);
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  }

  return { init, destroy };
})();
