// ============================================================
//  ColorFloodGame — Neon Color Flood for Fahh Arcade
//  Canvas: flood-canvas (420 x 460)
//  Global: ColorFloodGame
// ============================================================
const ColorFloodGame = (() => {

  // ── Constants ──────────────────────────────────────────────
  const COLS        = 14;
  const ROWS        = 14;
  const MAX_MOVES   = 25;
  const LS_KEY      = 'best_flood';

  // Layout (canvas 420×460)
  const CANVAS_W    = 420;
  const CANVAS_H    = 460;
  const GRID_PAD    = 10;
  const GRID_TOP    = 44;
  const CELL_GAP    = 2;
  const CELL_SIZE   = Math.floor((CANVAS_W - GRID_PAD * 2 - CELL_GAP * (COLS - 1)) / COLS);
  const GRID_W      = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP;
  const GRID_LEFT   = Math.floor((CANVAS_W - GRID_W) / 2);
  const GRID_H      = ROWS * CELL_SIZE + (ROWS - 1) * CELL_GAP;
  const GRID_BOTTOM = GRID_TOP + GRID_H;

  // Button bar
  const BTN_AREA_TOP = GRID_BOTTOM + 14;
  const BTN_H        = 38;
  const BTN_W        = 54;
  const BTN_GAP      = 8;
  const BTN_TOTAL_W  = 6 * BTN_W + 5 * BTN_GAP;
  const BTN_LEFT     = Math.floor((CANVAS_W - BTN_TOTAL_W) / 2);
  const BTN_RADIUS   = 8;

  // Neon palette (6 colors)
  const COLORS = [
    '#ff6b6b',  // 0 red
    '#4ecdc4',  // 1 teal
    '#f9ca24',  // 2 yellow
    '#a29bfe',  // 3 purple
    '#55efc4',  // 4 mint
    '#fd79a8',  // 5 pink
  ];

  const CLR = {
    bg        : '#0d0d1a',
    text      : '#ffffff',
    dim       : '#4a4a6a',
    hudAccent : '#e84393',
    moveOk    : '#55efc4',
    moveLow   : '#f9ca24',
    moveCrit  : '#ff6b6b',
    winGlow   : '#55efc4',
    loseGlow  : '#ff6b6b',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId, audioCtx;
  let grid;
  let flooded;
  let movesLeft, bestScore;
  let gameState;   // 'start' | 'playing' | 'win' | 'lose'
  let currentColor;
  let boundClick, boundKey, boundTouch;
  let winPulse = 0;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playFlood() {
    try {
      const ac = getAudio();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ac.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.15);
    } catch(e) {}
  }

  function playWin() {
    try {
      const ac = getAudio();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'square';
        const t = ac.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    } catch(e) {}
  }

  function playLose() {
    try {
      const ac = getAudio();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ac.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.5);
    } catch(e) {}
  }

  function playClick() {
    try {
      const ac = getAudio();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ac.currentTime);
      gain.gain.setValueAtTime(0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.06);
    } catch(e) {}
  }

  // ── Grid logic ─────────────────────────────────────────────
  function buildGrid() {
    grid    = [];
    flooded = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r]    = [];
      flooded[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c]    = Math.floor(Math.random() * COLORS.length);
        flooded[r][c] = false;
      }
    }
    currentColor = grid[0][0];
    rebuildFlooded();
  }

  function rebuildFlooded() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        flooded[r][c] = false;

    const queue  = [[0, 0]];
    flooded[0][0] = true;
    const target  = currentColor;

    while (queue.length) {
      const [r, c] = queue.shift();
      const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (flooded[nr][nc]) continue;
        if (grid[nr][nc] === target) {
          flooded[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
  }

  function applyFlood(colorIdx) {
    if (colorIdx === currentColor) return;
    if (gameState !== 'playing') return;

    movesLeft--;
    currentColor = colorIdx;

    // Paint all flooded cells to new color
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (flooded[r][c]) grid[r][c] = colorIdx;

    // BFS expand flood region
    const queue = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (flooded[r][c]) queue.push([r, c]);

    let qi = 0;
    while (qi < queue.length) {
      const [r, c] = queue[qi++];
      const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (flooded[nr][nc]) continue;
        if (grid[nr][nc] === colorIdx) {
          flooded[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    playFlood();
    checkEnd();
  }

  function checkEnd() {
    let all = true;
    outer:
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!flooded[r][c]) { all = false; break outer; }
      }
    }

    if (all) {
      gameState = 'win';
      const movesTaken = MAX_MOVES - movesLeft;
      if (bestScore === 0 || movesTaken < bestScore) {
        bestScore = movesTaken;
        localStorage.setItem(LS_KEY, bestScore);
      }
      winPulse = 0;
      playWin();
      return;
    }

    if (movesLeft <= 0) {
      gameState = 'lose';
      playLose();
    }
  }

  function loadBest() {
    bestScore = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  }

  // ── Drawing ────────────────────────────────────────────────
  function rrect(x, y, w, h, r) {
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

  function shadeHex(hex, amount) {
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16);
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    return `rgb(${r},${g},${b})`;
  }

  function drawBackground() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x     = GRID_LEFT + c * (CELL_SIZE + CELL_GAP);
        const y     = GRID_TOP  + r * (CELL_SIZE + CELL_GAP);
        const color = COLORS[grid[r][c]];
        const isFl  = flooded[r][c];

        ctx.save();
        if (isFl) {
          ctx.shadowBlur  = 8;
          ctx.shadowColor = color;
          ctx.fillStyle   = color;
        } else {
          ctx.fillStyle   = shadeHex(color, -45);
        }
        rrect(x, y, CELL_SIZE, CELL_SIZE, 3);
        ctx.fill();

        if (isFl) {
          ctx.fillStyle = 'rgba(255,255,255,0.13)';
          rrect(x + 1, y + 1, CELL_SIZE - 2, Math.floor(CELL_SIZE / 2.2), 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawHUD() {
    // Game title
    ctx.save();
    ctx.font        = '8px "Press Start 2P", monospace';
    ctx.fillStyle   = CLR.hudAccent;
    ctx.textAlign   = 'left';
    ctx.shadowBlur  = 12;
    ctx.shadowColor = CLR.hudAccent;
    ctx.fillText('COLOR FLOOD', GRID_LEFT, 22);
    ctx.restore();

    // Moves counter
    const mc = movesLeft > 10 ? CLR.moveOk : movesLeft > 5 ? CLR.moveLow : CLR.moveCrit;
    ctx.save();
    ctx.font        = '8px "Press Start 2P", monospace';
    ctx.fillStyle   = mc;
    ctx.textAlign   = 'right';
    ctx.shadowBlur  = 14;
    ctx.shadowColor = mc;
    ctx.fillText('MOVES: ' + movesLeft, GRID_LEFT + GRID_W, 22);
    ctx.restore();

    // Best (below grid, above buttons)
    if (bestScore > 0) {
      ctx.save();
      ctx.font      = '6px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.textAlign = 'center';
      ctx.fillText('BEST: ' + bestScore + ' MOVES', CANVAS_W / 2, GRID_BOTTOM + 10);
      ctx.restore();
    }
  }

  function drawColorButtons() {
    const btnY = BTN_AREA_TOP + (bestScore > 0 ? 14 : 0);
    for (let i = 0; i < COLORS.length; i++) {
      const x     = BTN_LEFT + i * (BTN_W + BTN_GAP);
      const color = COLORS[i];
      const isAct = (i === currentColor);

      ctx.save();

      if (isAct) {
        ctx.shadowBlur  = 24;
        ctx.shadowColor = color;
      }

      ctx.fillStyle = color;
      rrect(x, btnY, BTN_W, BTN_H, BTN_RADIUS);
      ctx.fill();

      // Highlight sheen
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      rrect(x + 3, btnY + 3, BTN_W - 6, Math.floor(BTN_H / 2.5), BTN_RADIUS - 2);
      ctx.fill();

      if (isAct) {
        // White border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2.5;
        rrect(x - 1, btnY - 1, BTN_W + 2, BTN_H + 2, BTN_RADIUS + 1);
        ctx.stroke();
        // Dot indicator above
        ctx.fillStyle   = '#ffffff';
        ctx.shadowBlur  = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(x + BTN_W / 2, btnY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth   = 1;
        rrect(x, btnY, BTN_W, BTN_H, BTN_RADIUS);
        ctx.stroke();
      }

      // Keyboard hint: tiny number label
      ctx.fillStyle   = 'rgba(0,0,0,0.5)';
      ctx.font        = 'bold 9px monospace';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 0;
      ctx.fillText(i + 1, x + BTN_W / 2, btnY + BTN_H - 7);
      ctx.restore();
    }
  }

  // ── Screens ────────────────────────────────────────────────
  function drawStartScreen() {
    ctx.fillStyle = 'rgba(13,13,26,0.86)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 40;
    ctx.shadowColor = CLR.hudAccent;
    ctx.fillStyle   = CLR.hudAccent;
    ctx.font        = '18px "Press Start 2P", monospace';
    ctx.fillText('COLOR', CANVAS_W / 2, CANVAS_H / 2 - 78);
    ctx.fillText('FLOOD', CANVAS_W / 2, CANVAS_H / 2 - 52);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font      = '6px "Press Start 2P", monospace';
    ctx.fillText('Flood the entire grid', CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.fillText('with ONE color!', CANVAS_W / 2, CANVAS_H / 2 - 6);

    ctx.fillStyle = CLR.moveLow;
    ctx.font      = '7px "Press Start 2P", monospace';
    ctx.fillText(MAX_MOVES + ' MOVES OR LESS', CANVAS_W / 2, CANVAS_H / 2 + 18);

    if (bestScore > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.font      = '7px "Press Start 2P", monospace';
      ctx.fillText('BEST: ' + bestScore + ' MOVES', CANVAS_W / 2, CANVAS_H / 2 + 38);
    }

    // Pulsing CTA
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = '8px "Press Start 2P", monospace';
    ctx.fillText('CLICK TO PLAY', CANVAS_W / 2, CANVAS_H / 2 + 70);
    ctx.restore();

    // Color swatch preview
    const sw = 28, sh = 14, sg = 6;
    const stotal = COLORS.length * sw + (COLORS.length - 1) * sg;
    const sx0 = (CANVAS_W - stotal) / 2;
    COLORS.forEach((col, i) => {
      ctx.save();
      ctx.fillStyle   = col;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = col;
      rrect(sx0 + i * (sw + sg), CANVAS_H / 2 + 88, sw, sh, 3);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawWinScreen() {
    winPulse++;
    const t = winPulse / 60;

    ctx.fillStyle = 'rgba(13,13,26,0.82)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';

    const glow = 20 + 14 * Math.sin(t * 3);
    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = CLR.winGlow;
    ctx.fillStyle   = CLR.winGlow;
    ctx.font        = '18px "Press Start 2P", monospace';
    ctx.fillText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.restore();

    const movesTaken = MAX_MOVES - movesLeft;
    ctx.fillStyle = '#ffffff';
    ctx.font      = '9px "Press Start 2P", monospace';
    ctx.fillText('SOLVED IN ' + movesTaken + ' MOVES', CANVAS_W / 2, CANVAS_H / 2 - 22);

    if (bestScore === movesTaken) {
      const p2 = 0.7 + 0.3 * Math.sin(t * 5);
      ctx.save();
      ctx.globalAlpha = p2;
      ctx.fillStyle   = CLR.moveLow;
      ctx.font        = '8px "Press Start 2P", monospace';
      ctx.fillText('NEW BEST!', CANVAS_W / 2, CANVAS_H / 2 + 4);
      ctx.restore();
    } else if (bestScore > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.font      = '7px "Press Start 2P", monospace';
      ctx.fillText('BEST: ' + bestScore + ' MOVES', CANVAS_W / 2, CANVAS_H / 2 + 4);
    }

    const ctaP = 0.55 + 0.45 * Math.sin(t * 2.5);
    ctx.save();
    ctx.globalAlpha = ctaP;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = '8px "Press Start 2P", monospace';
    ctx.fillText('CLICK TO PLAY AGAIN', CANVAS_W / 2, CANVAS_H / 2 + 50);
    ctx.restore();
  }

  function drawLoseScreen() {
    ctx.fillStyle = 'rgba(13,13,26,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = CLR.loseGlow;
    ctx.fillStyle   = CLR.loseGlow;
    ctx.font        = '16px "Press Start 2P", monospace';
    ctx.fillText('OUT OF', CANVAS_W / 2, CANVAS_H / 2 - 62);
    ctx.fillText('MOVES!', CANVAS_W / 2, CANVAS_H / 2 - 38);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font      = '6px "Press Start 2P", monospace';
    ctx.fillText('Grid not fully flooded.', CANVAS_W / 2, CANVAS_H / 2 - 8);
    ctx.fillText(MAX_MOVES + ' moves used.', CANVAS_W / 2, CANVAS_H / 2 + 8);

    if (bestScore > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font      = '7px "Press Start 2P", monospace';
      ctx.fillText('BEST: ' + bestScore + ' MOVES', CANVAS_W / 2, CANVAS_H / 2 + 32);
    }

    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 480);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = '8px "Press Start 2P", monospace';
    ctx.fillText('CLICK TO TRY AGAIN', CANVAS_W / 2, CANVAS_H / 2 + 66);
    ctx.restore();
  }

  // ── Main loop ──────────────────────────────────────────────
  function loop() {
    animId = requestAnimationFrame(loop);
    drawBackground();
    drawGrid();

    if (gameState === 'start') {
      drawStartScreen();
      return;
    }

    drawHUD();
    drawColorButtons();

    if (gameState === 'win')  drawWinScreen();
    if (gameState === 'lose') drawLoseScreen();
  }

  // ── Input ──────────────────────────────────────────────────
  function getButtonIndex(mx, my) {
    const btnY = BTN_AREA_TOP + (bestScore > 0 ? 14 : 0);
    if (my < btnY - 2 || my > btnY + BTN_H + 2) return -1;
    for (let i = 0; i < COLORS.length; i++) {
      const bx = BTN_LEFT + i * (BTN_W + BTN_GAP);
      if (mx >= bx && mx <= bx + BTN_W) return i;
    }
    return -1;
  }

  function getCanvasXY(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  }

  function handlePointer(e) {
    const { x, y } = getCanvasXY(e);

    if (gameState === 'start' || gameState === 'win' || gameState === 'lose') {
      startGame();
      return;
    }

    if (gameState === 'playing') {
      const idx = getButtonIndex(x, y);
      if (idx >= 0) {
        playClick();
        applyFlood(idx);
      }
    }
  }

  function handleKey(e) {
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 6) {
      if (gameState === 'playing') {
        playClick();
        applyFlood(num - 1);
      } else {
        startGame();
      }
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (gameState !== 'playing') startGame();
    }
  }

  function startGame() {
    buildGrid();
    movesLeft = MAX_MOVES;
    gameState = 'playing';
    winPulse  = 0;
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');

    loadBest();
    buildGrid();
    movesLeft = MAX_MOVES;
    gameState = 'start';
    winPulse  = 0;

    boundClick = (e) => { e.preventDefault(); handlePointer(e); };
    boundTouch = (e) => { e.preventDefault(); handlePointer(e); };
    boundKey   = (e) => handleKey(e);

    canvas.addEventListener('click',      boundClick);
    canvas.addEventListener('touchstart', boundTouch, { passive: false });
    window.addEventListener('keydown',    boundKey);

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas) {
      canvas.removeEventListener('click',      boundClick);
      canvas.removeEventListener('touchstart', boundTouch);
    }
    window.removeEventListener('keydown', boundKey);
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    canvas = null;
    ctx    = null;
  }

  return { init, destroy };
})();
