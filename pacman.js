
"use strict";
const PacManGame = (() => {
  let canvas, ctx, animId, gameState;
  const CELL = 20;
  const COLS = 21, ROWS = 21;

  // Maze layout: 1=wall, 0=dot, 2=power, 3=empty
  const BASE_MAZE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,2,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,2,1],
    [1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,3,3,1,3,3,1,1,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,3,3,3,1,1,3,1,0,1,1,1,1],
    [3,3,3,3,0,3,3,1,3,3,3,3,3,1,3,3,0,3,3,3,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,1,1,3,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,1,1,3,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1],
    [1,2,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1,0,2,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  let maze, pacman, ghosts, score, lives, powered, powerTimer, level, dotCount, totalDots;
  let lastTime = 0;
  const GHOST_COLORS = ['#ff0000','#ffb8ff','#00ffff','#ffb852'];
  const GHOST_NAMES = ['Blinky','Pinky','Inky','Clyde'];

  function initMaze() {
    maze = BASE_MAZE.map(r => [...r]);
    dotCount = 0;
    totalDots = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (maze[r][c] === 0 || maze[r][c] === 2) totalDots++;
  }

  function initEntities() {
    pacman = { x: 10, y: 15, dx: 0, dy: 0, nextDx: 0, nextDy: 0, angle: 0, mouthOpen: 0, mouthDir: 1, moveTimer: 0, speed: 0.12 };
    ghosts = GHOST_COLORS.map((color, i) => ({
      x: 9 + (i % 2), y: 9 + Math.floor(i / 2),
      dx: i % 2 === 0 ? 1 : -1, dy: 0,
      color, name: GHOST_NAMES[i],
      moveTimer: 0, speed: 0.09 + i * 0.01,
      frightened: false, eaten: false,
      scatterTimer: Math.random() * 60
    }));
    powered = false;
    powerTimer = 0;
    lives = 3;
    score = 0;
    level = 1;
  }

  function isWall(x, y) {
    const gx = Math.round(x), gy = Math.round(y);
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return true;
    return maze[gy][gx] === 1;
  }

  function canMove(x, y, dx, dy) {
    const nx = x + dx * 0.5, ny = y + dy * 0.5;
    return !isWall(Math.round(nx), Math.round(ny));
  }

  function wrapX(x) {
    if (x < 0) return COLS - 1;
    if (x >= COLS) return 0;
    return x;
  }

  function updatePacman(dt) {
    pacman.moveTimer += dt;
    const step = pacman.speed * level * 0.8;

    // Try queued direction
    if (pacman.nextDx !== pacman.dx || pacman.nextDy !== pacman.dy) {
      if (canMove(pacman.x, pacman.y, pacman.nextDx, pacman.nextDy)) {
        pacman.dx = pacman.nextDx;
        pacman.dy = pacman.nextDy;
      }
    }

    if (pacman.moveTimer > step) {
      pacman.moveTimer = 0;
      if (pacman.dx !== 0 || pacman.dy !== 0) {
        if (canMove(pacman.x, pacman.y, pacman.dx, pacman.dy)) {
          pacman.x = wrapX(pacman.x + pacman.dx);
          pacman.y += pacman.dy;
        }
      }
      // Eat dots
      const cx = Math.round(pacman.x), cy = Math.round(pacman.y);
      if (maze[cy] && maze[cy][cx] === 0) { maze[cy][cx] = 3; score += 10; dotCount++; }
      if (maze[cy] && maze[cy][cx] === 2) {
        maze[cy][cx] = 3; score += 50; dotCount++;
        powered = true; powerTimer = 7;
        ghosts.forEach(g => { g.frightened = true; g.eaten = false; });
      }
    }

    // Mouth animation
    pacman.mouthOpen += dt * 8 * pacman.mouthDir;
    if (pacman.mouthOpen > 1) { pacman.mouthOpen = 1; pacman.mouthDir = -1; }
    if (pacman.mouthOpen < 0) { pacman.mouthOpen = 0; pacman.mouthDir = 1; }
  }

  function updateGhosts(dt) {
    if (powered) {
      powerTimer -= dt;
      if (powerTimer <= 0) {
        powered = false;
        ghosts.forEach(g => { g.frightened = false; g.eaten = false; });
      }
    }

    ghosts.forEach(g => {
      if (g.eaten) return;
      g.moveTimer += dt;
      const speed = g.frightened ? 0.06 : (g.speed * level * 0.7);
      if (g.moveTimer > speed) {
        g.moveTimer = 0;
        // Simple pathfinding: try to move towards pac or random when frightened
        const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        const possible = dirs.filter(d => !isWall(Math.round(g.x + d.dx), Math.round(g.y + d.dy)) && !(d.dx === -g.dx && d.dy === -g.dy));
        if (possible.length === 0) { g.dx = -g.dx; g.dy = -g.dy; return; }

        let chosen;
        if (g.frightened) {
          chosen = possible[Math.floor(Math.random() * possible.length)];
        } else {
          // Chase pac
          const target = { x: pacman.x, y: pacman.y };
          chosen = possible.reduce((best, d) => {
            const dist = Math.hypot(g.x + d.dx - target.x, g.y + d.dy - target.y);
            const bDist = Math.hypot(g.x + best.dx - target.x, g.y + best.dy - target.y);
            return dist < bDist ? d : best;
          });
        }
        g.dx = chosen.dx; g.dy = chosen.dy;
        g.x = wrapX(g.x + g.dx);
        g.y += g.dy;
      }
    });
  }

  function checkCollisions() {
    ghosts.forEach(g => {
      if (g.eaten) return;
      const dist = Math.hypot(g.x - pacman.x, g.y - pacman.y);
      if (dist < 0.8) {
        if (g.frightened) {
          g.eaten = true; score += 200;
          setTimeout(() => { g.eaten = false; g.x = 10; g.y = 9; }, 3000);
        } else {
          lives--;
          if (lives <= 0) { gameState = 'over'; return; }
          pacman.x = 10; pacman.y = 15; pacman.dx = 0; pacman.dy = 0;
          ghosts.forEach(gh => { gh.x = 9; gh.y = 9; gh.frightened = false; });
        }
      }
    });
    if (dotCount >= totalDots) { level++; initMaze(); dotCount = 0; }
  }

  function draw() {
    const W = COLS * CELL, H = ROWS * CELL;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Draw maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL, y = r * CELL;
        if (maze[r][c] === 1) {
          ctx.fillStyle = '#1a1aff';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = '#4444ff';
          ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        } else if (maze[r][c] === 0) {
          ctx.fillStyle = '#ffff99';
          ctx.beginPath();
          ctx.arc(x + CELL/2, y + CELL/2, 2, 0, Math.PI*2);
          ctx.fill();
        } else if (maze[r][c] === 2) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(x + CELL/2, y + CELL/2, 5, 0, Math.PI*2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw ghosts
    ghosts.forEach(g => {
      if (g.eaten) return;
      const gx = g.x * CELL + CELL/2, gy = g.y * CELL + CELL/2;
      const r2 = CELL * 0.45;
      ctx.fillStyle = g.frightened ? (powerTimer < 2 && Math.floor(Date.now()/200)%2===0 ? '#fff' : '#0000ff') : g.color;
      ctx.beginPath();
      ctx.arc(gx, gy - r2*0.1, r2, Math.PI, 0);
      // Wavy bottom
      ctx.lineTo(gx + r2, gy + r2);
      const waves = 3;
      for (let i = 0; i < waves; i++) {
        const wx = gx + r2 - (r2 * 2 / waves) * (i + 0.5);
        ctx.quadraticCurveTo(wx + r2/waves*0.5, gy + r2 * (i%2===0 ? 0.5 : 1), wx - r2/waves*0.5, gy + r2);
      }
      ctx.lineTo(gx - r2, gy + r2);
      ctx.closePath();
      ctx.fill();
      // Eyes
      if (!g.frightened) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(gx - r2*0.3, gy - r2*0.2, r2*0.25, r2*0.3, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(gx + r2*0.3, gy - r2*0.2, r2*0.25, r2*0.3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#00f';
        ctx.beginPath(); ctx.arc(gx - r2*0.3 + g.dx*r2*0.1, gy - r2*0.2 + g.dy*r2*0.1, r2*0.12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx + r2*0.3 + g.dx*r2*0.1, gy - r2*0.2 + g.dy*r2*0.1, r2*0.12, 0, Math.PI*2); ctx.fill();
      }
    });

    // Draw Pac-Man
    const px = pacman.x * CELL + CELL/2, py = pacman.y * CELL + CELL/2;
    const angle = Math.atan2(pacman.dy, pacman.dx);
    const mouth = pacman.mouthOpen * 0.35;
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, CELL * 0.42, angle + mouth, angle + Math.PI*2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Outfit';
    ctx.fillText(`Score: ${score}`, 5, 14);
    ctx.fillText(`Level: ${level}`, COLS*CELL/2 - 30, 14);
    ctx.fillText(`${'❤️'.repeat(lives)}`, COLS*CELL - 70, 14);

    if (powered && powerTimer < 3) {
      ctx.fillStyle = `rgba(255,255,0,${Math.sin(Date.now()*0.01)*0.5+0.5})`;
      ctx.font = 'bold 16px Outfit';
      ctx.fillText('⚡ POWER FADING', COLS*CELL/2 - 60, ROWS*CELL - 5);
    }

    if (gameState === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, COLS*CELL, ROWS*CELL);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 32px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', COLS*CELL/2, ROWS*CELL/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '18px Outfit';
      ctx.fillText(`Score: ${score}`, COLS*CELL/2, ROWS*CELL/2 + 15);
      ctx.fillText('Click to restart', COLS*CELL/2, ROWS*CELL/2 + 45);
      ctx.textAlign = 'left';
    }

    if (gameState === 'start') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, COLS*CELL, ROWS*CELL);
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 28px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('🟡 PAC-MAN', COLS*CELL/2, ROWS*CELL/2 - 30);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Outfit';
      ctx.fillText('Arrow keys / WASD to move', COLS*CELL/2, ROWS*CELL/2 + 10);
      ctx.fillText('Eat power pellets to hunt ghosts!', COLS*CELL/2, ROWS*CELL/2 + 35);
      ctx.fillStyle = '#ffff00';
      ctx.fillText('Click or press any key to start', COLS*CELL/2, ROWS*CELL/2 + 65);
      ctx.textAlign = 'left';
    }
  }

  let lastTs = 0;
  function loop(ts = 0) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (gameState === 'playing') {
      updatePacman(dt);
      updateGhosts(dt);
      checkCollisions();
    }
    draw();
  }

  function handleKey(e) {
    const dirs = {
      ArrowLeft: {dx:-1,dy:0}, ArrowRight:{dx:1,dy:0},
      ArrowUp: {dx:0,dy:-1}, ArrowDown:{dx:0,dy:1},
      a:{dx:-1,dy:0}, d:{dx:1,dy:0}, w:{dx:0,dy:-1}, s:{dx:0,dy:1}
    };
    const d = dirs[e.key];
    if (d) { pacman.nextDx = d.dx; pacman.nextDy = d.dy; e.preventDefault(); }
    if (gameState === 'start' || gameState === 'over') startGame();
  }

  function handleClick() {
    if (gameState === 'start' || gameState === 'over') startGame();
  }

  function startGame() {
    initMaze();
    initEntities();
    gameState = 'playing';
    const best = parseInt(localStorage.getItem('pacman_best') || '0');
    if (score > best) localStorage.setItem('pacman_best', score);
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d');
    gameState = 'start';
    initMaze();
    initEntities();
    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    lastTs = 0;
    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas) {
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    }
    const best = parseInt(localStorage.getItem('pacman_best') || '0');
    if (score > best) localStorage.setItem('pacman_best', score);
  }

  return { init, destroy };
})();

// arcade-hub: ghost AI registered

// arcade-hub: fruit bonus registered
