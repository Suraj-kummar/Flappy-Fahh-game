// ============================================================
//  SnakeGame — Classic Neon Snake for Fahh Arcade
//  Canvas: snake-canvas (420 x 420)
//  Global: SnakeGame
// ============================================================
const SnakeGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const CELL       = 20;          // grid cell size in px
  const COLS       = 21;          // 420 / 20
  const ROWS       = 21;
  const BASE_DELAY = 150;         // ms between ticks at level 1
  const MIN_DELAY  = 60;          // fastest possible tick

  // Neon palette
  const CLR = {
    bg        : '#0d0d1a',
    grid      : '#12122a',
    snakeHead : '#4ecca3',
    snakeBody : '#38b589',
    snakeGlow : '#4ecca3',
    food      : '#f9ca24',
    foodGlow  : '#f9ca24',
    text      : '#ffffff',
    accent    : '#a29bfe',
    dim       : '#555577',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let snake, dir, nextDir, food;
  let score, bestScore, level, foodEaten;
  let gameState;   // 'start' | 'playing' | 'dead'
  let lastTick, tickDelay;
  let boundKeyDown, boundClick, boundTouch;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playEat() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ac.currentTime + 0.07);
      gain.gain.setValueAtTime(0.18, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.12);
    } catch(e) {}
  }

  function playDie() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ac.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.4);
    } catch(e) {}
  }

  // ── Helpers ────────────────────────────────────────────────
  function randCell() {
    return {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  }

  function spawnFood() {
    let f;
    do { f = randCell(); }
    while (snake.some(s => s.x === f.x && s.y === f.y));
    food = f;
  }

  function loadBest() {
    bestScore = parseInt(localStorage.getItem('snake_best') || '0', 10);
  }

  function saveBest() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('snake_best', bestScore);
    }
  }

  // ── Game Logic ─────────────────────────────────────────────
  function initGame() {
    const mid = Math.floor(COLS / 2);
    snake = [
      { x: mid,     y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir      = { x: 1, y: 0 };
    nextDir  = { x: 1, y: 0 };
    score    = 0;
    level    = 1;
    foodEaten = 0;
    tickDelay = BASE_DELAY;
    spawnFood();
    lastTick = null;
  }

  function tick() {
    // Apply queued direction
    dir = { ...nextDir };

    const head    = snake[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      die(); return;
    }
    // Self collision
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      die(); return;
    }

    snake.unshift(newHead);

    // Food eaten?
    if (newHead.x === food.x && newHead.y === food.y) {
      score++;
      foodEaten++;
      playEat();
      // Level up every 5 food
      if (foodEaten % 5 === 0) {
        level++;
        tickDelay = Math.max(MIN_DELAY, BASE_DELAY - (level - 1) * 12);
      }
      spawnFood();
    } else {
      snake.pop();
    }
  }

  function die() {
    gameState = 'dead';
    saveBest();
    playDie();
  }

  // ── Drawing ────────────────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // subtle grid lines
    ctx.strokeStyle = CLR.grid;
    ctx.lineWidth   = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(canvas.width, r * CELL);
      ctx.stroke();
    }
  }

  function drawFood() {
    const px = food.x * CELL + CELL / 2;
    const py = food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = CLR.foodGlow;
    ctx.fillStyle   = CLR.food;
    ctx.beginPath();
    ctx.arc(px, py, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnake() {
    snake.forEach((seg, i) => {
      const px = seg.x * CELL + 1;
      const py = seg.y * CELL + 1;
      const sz = CELL - 2;
      ctx.save();
      if (i === 0) {
        ctx.shadowBlur  = 20;
        ctx.shadowColor = CLR.snakeGlow;
        ctx.fillStyle   = CLR.snakeHead;
      } else {
        const alpha = Math.max(0.4, 1 - i * 0.015);
        ctx.shadowBlur  = 8;
        ctx.shadowColor = CLR.snakeGlow;
        ctx.fillStyle   = CLR.snakeBody;
        ctx.globalAlpha = alpha;
      }
      ctx.beginPath();
      ctx.roundRect(px, py, sz, sz, 4);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawHUD() {
    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 8, 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = CLR.accent;
    ctx.fillText('BEST: ' + bestScore, canvas.width - 8, 16);
    ctx.textAlign = 'center';
    ctx.fillStyle = CLR.dim;
    ctx.fillText('LVL ' + level, canvas.width / 2, 16);
  }

  function drawStartScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = CLR.snakeGlow;
    ctx.fillStyle   = CLR.snakeHead;
    ctx.font        = 'bold 48px monospace';
    ctx.fillText('SNAKE', canvas.width / 2, canvas.height / 2 - 60);
    ctx.restore();

    ctx.fillStyle = CLR.food;
    ctx.font      = 'bold 16px monospace';
    ctx.fillText('FAHH ARCADE', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = CLR.text;
    ctx.font      = '14px monospace';
    ctx.fillText('Arrow Keys / WASD to move', canvas.width / 2, canvas.height / 2 + 20);

    ctx.fillStyle = CLR.accent;
    ctx.font      = 'bold 15px monospace';
    ctx.fillText('PRESS SPACE or TAP to START', canvas.width / 2, canvas.height / 2 + 55);

    if (bestScore > 0) {
      ctx.fillStyle = CLR.dim;
      ctx.font      = '13px monospace';
      ctx.fillText('Best: ' + bestScore, canvas.width / 2, canvas.height / 2 + 85);
    }
  }

  function drawDeadScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 25;
    ctx.shadowColor = '#ff6b6b';
    ctx.fillStyle   = '#ff6b6b';
    ctx.font        = 'bold 40px monospace';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);
    ctx.restore();

    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 20px monospace';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 - 15);

    ctx.fillStyle = CLR.food;
    ctx.font      = 'bold 16px monospace';
    ctx.fillText('Best:  ' + bestScore, canvas.width / 2, canvas.height / 2 + 18);

    ctx.fillStyle = CLR.accent;
    ctx.font      = 'bold 15px monospace';
    ctx.fillText('PRESS SPACE or TAP to RESTART', canvas.width / 2, canvas.height / 2 + 58);
  }

  // ── Main Loop ──────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    drawBg();

    if (gameState === 'start') {
      drawStartScreen();
      return;
    }

    if (gameState === 'dead') {
      drawSnake();
      drawFood();
      drawHUD();
      drawDeadScreen();
      return;
    }

    // playing
    if (!lastTick) lastTick = ts;
    if (ts - lastTick >= tickDelay) {
      tick();
      lastTick = ts;
    }

    drawFood();
    drawSnake();
    drawHUD();
  }

  // ── Input ──────────────────────────────────────────────────
  const DIR_MAP = {
    ArrowUp    : { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown  : { x: 0, y:  1 }, s: { x: 0, y:  1 }, S: { x: 0, y:  1 },
    ArrowLeft  : { x:-1, y:  0 }, a: { x:-1, y:  0 }, A: { x:-1, y:  0 },
    ArrowRight : { x: 1, y:  0 }, d: { x: 1, y:  0 }, D: { x: 1, y:  0 },
  };

  function onKeyDown(e) {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleAction();
      return;
    }
    if (gameState !== 'playing') return;
    const d = DIR_MAP[e.key];
    if (!d) return;
    e.preventDefault();
    // Prevent 180-degree reversal
    if (d.x !== 0 && d.x === -dir.x) return;
    if (d.y !== 0 && d.y === -dir.y) return;
    nextDir = d;
  }

  function handleAction() {
    if (gameState === 'start' || gameState === 'dead') {
      initGame();
      gameState = 'playing';
    }
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    loadBest();
    gameState = 'start';

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

// arcade-hub: draw registered

// arcade-hub: input registered
