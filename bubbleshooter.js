
"use strict";
const BubbleShooterGame = (() => {
  let canvas, ctx, animId, gameState;
  const W = 420, H = 520;

  // ── Grid config ──────────────────────────────────────────────
  const COLS       = 10;
  const BUBBLE_R   = 19;          // radius
  const ROW_H      = BUBBLE_R * 1.73;  // hex offset height
  const COLORS     = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#e91e63'];
  const MAX_ROWS   = 11;          // grid rows before game-over line

  // ── State ─────────────────────────────────────────────────────
  let grid, shooter, nextColor, score, highScore, level, combo;
  let particles = [];
  let floatingTexts = [];

  // ── Utility ───────────────────────────────────────────────────
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  function colForRow(row) { return COLS; }  // same col count each row

  function bubbleX(col, row) {
    const offset = (row % 2 === 0) ? 0 : BUBBLE_R;
    return offset + BUBBLE_R + col * BUBBLE_R * 2;
  }
  function bubbleY(row) {
    return BUBBLE_R + row * ROW_H;
  }

  // ── Grid ──────────────────────────────────────────────────────
  function makeGrid() {
    grid = [];
    const startRows = 5 + level;
    for (let r = 0; r < startRows && r < MAX_ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = Math.random() < 0.85 ? randColor() : null;
      }
    }
    // Make sure there's at least one bubble in row 0
    if (!grid[0] || grid[0].every(b => b === null)) {
      grid[0] = Array(COLS).fill(null).map(() => randColor());
    }
  }

  function addRow() {
    // Push all rows down
    for (let r = grid.length - 1; r >= 0; r--) {
      grid[r + 1] = grid[r];
    }
    // Add new row at top
    grid[0] = [];
    for (let c = 0; c < COLS; c++) {
      grid[0][c] = Math.random() < 0.9 ? randColor() : null;
    }
    // Check game over: if any bubble reached game-over line
    if (grid.length > MAX_ROWS) {
      const lastRow = grid[MAX_ROWS];
      if (lastRow && lastRow.some(b => b !== null)) {
        gameState = 'over';
        saveScore();
      }
      grid.length = MAX_ROWS;
    }
  }

  // ── Shooter ───────────────────────────────────────────────────
  function initShooter() {
    shooter = {
      x: W / 2,
      y: H - 40,
      angle: -Math.PI / 2,  // pointing up
      color: randColor(),
      bx: W / 2,
      by: H - 40,
      vx: 0,
      vy: 0,
      moving: false,
      speed: 10,
      trail: []
    };
    nextColor = randColor();
  }

  function aim(mx, my) {
    const dx = mx - shooter.x;
    const dy = my - shooter.y;
    // Clamp angle: don't shoot downward
    const angle = Math.atan2(dy, dx);
    const clamped = Math.max(-Math.PI + 0.15, Math.min(-0.15, angle));
    shooter.angle = clamped;
  }

  function fire() {
    if (shooter.moving) return;
    shooter.bx = shooter.x;
    shooter.by = shooter.y;
    shooter.vx = Math.cos(shooter.angle) * shooter.speed;
    shooter.vy = Math.sin(shooter.angle) * shooter.speed;
    shooter.moving = true;
    shooter.trail = [];
  }

  // ── Find closest grid cell to a point ─────────────────────────
  function nearestCell(bx, by) {
    let best = null, bestDist = Infinity;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r] && grid[r][c] !== null) continue; // skip filled
        if (!grid[r]) continue;
        const x = bubbleX(c, r);
        const y = bubbleY(r);
        const d = Math.hypot(bx - x, by - y);
        if (d < bestDist) { bestDist = d; best = { r, c }; }
      }
    }
    // Also check one row below last row
    const newRow = grid.length;
    for (let c = 0; c < COLS; c++) {
      const x = bubbleX(c, newRow);
      const y = bubbleY(newRow);
      const d = Math.hypot(bx - x, by - y);
      if (d < bestDist) { bestDist = d; best = { r: newRow, c }; }
    }
    return best;
  }

  // ── Flood-fill to find connected same-color bubbles ──────────
  function findMatches(row, col, color) {
    const visited = new Set();
    const stack = [[row, col]];
    const matches = [];
    while (stack.length) {
      const [r, c] = stack.pop();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= grid.length || c < 0 || c >= COLS) continue;
      if (!grid[r] || grid[r][c] !== color) continue;
      visited.add(key);
      matches.push([r, c]);
      // Hex neighbors
      const neighbors = getNeighbors(r, c);
      for (const [nr, nc] of neighbors) stack.push([nr, nc]);
    }
    return matches;
  }

  function getNeighbors(r, c) {
    const even = r % 2 === 0;
    return [
      [r - 1, even ? c - 1 : c],
      [r - 1, even ? c     : c + 1],
      [r,     c - 1],
      [r,     c + 1],
      [r + 1, even ? c - 1 : c],
      [r + 1, even ? c     : c + 1],
    ];
  }

  // ── Find bubbles disconnected from ceiling ────────────────────
  function findFloating() {
    const connected = new Set();
    // BFS from row 0
    const queue = [];
    if (grid[0]) {
      for (let c = 0; c < COLS; c++) {
        if (grid[0][c] !== null) {
          queue.push([0, c]);
          connected.add(`0,${c}`);
        }
      }
    }
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [nr, nc] of getNeighbors(r, c)) {
        const key = `${nr},${nc}`;
        if (connected.has(key)) continue;
        if (nr < 0 || nr >= grid.length || nc < 0 || nc >= COLS) continue;
        if (grid[nr] && grid[nr][nc] !== null) {
          connected.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    // Collect all non-null bubbles NOT in connected
    const floating = [];
    for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== null && !connected.has(`${r},${c}`)) {
          floating.push([r, c]);
        }
      }
    }
    return floating;
  }

  // ── Particles ─────────────────────────────────────────────────
  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: rnd(-3, 3), vy: rnd(-4, 1),
        r: rnd(3, 7),
        color,
        life: 1,
        decay: rnd(0.02, 0.05)
      });
    }
  }

  function spawnText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 1.0, vy: -1.5 });
  }

  // ── Update bubble in flight ───────────────────────────────────
  function updateShooter() {
    if (!shooter.moving) return;

    // Trail
    shooter.trail.push({ x: shooter.bx, y: shooter.by });
    if (shooter.trail.length > 8) shooter.trail.shift();

    shooter.bx += shooter.vx;
    shooter.by += shooter.vy;

    // Wall bounce
    if (shooter.bx - BUBBLE_R < 0) { shooter.bx = BUBBLE_R; shooter.vx *= -1; }
    if (shooter.bx + BUBBLE_R > W) { shooter.bx = W - BUBBLE_R; shooter.vx *= -1; }

    // Ceiling collision
    if (shooter.by - BUBBLE_R <= 0) {
      shooter.by = BUBBLE_R;
      placeBubble();
      return;
    }

    // Collision with existing bubbles
    let hit = false;
    outer: for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === null) continue;
        const gx = bubbleX(c, r);
        const gy = bubbleY(r);
        if (Math.hypot(shooter.bx - gx, shooter.by - gy) < BUBBLE_R * 1.9) {
          hit = true;
          break outer;
        }
      }
    }
    if (hit) placeBubble();
  }

  function placeBubble() {
    const cell = nearestCell(shooter.bx, shooter.by);
    if (!cell) { resetShooter(); return; }

    const { r, c } = cell;
    if (!grid[r]) grid[r] = Array(COLS).fill(null);
    grid[r][c] = shooter.color;

    // Check matches
    const matches = findMatches(r, c, shooter.color);
    if (matches.length >= 3) {
      // Pop matched bubbles
      combo++;
      const pts = matches.length * 10 * combo;
      score += pts;
      for (const [mr, mc] of matches) {
        spawnParticles(bubbleX(mc, mr), bubbleY(mr), grid[mr][mc]);
        grid[mr][mc] = null;
      }
      spawnText(bubbleX(c, r), bubbleY(r), `+${pts}`, '#f9ca24');

      // Drop disconnected bubbles
      const floating = findFloating();
      if (floating.length) {
        const bonus = floating.length * 20 * combo;
        score += bonus;
        for (const [fr, fc] of floating) {
          spawnParticles(bubbleX(fc, fr), bubbleY(fr), grid[fr][fc], 6);
          grid[fr][fc] = null;
        }
        if (bonus > 0) spawnText(W / 2, H / 2, `CHAIN! +${bonus}`, '#ff6b9d');
      }

      // Clean trailing empty rows
      while (grid.length && grid[grid.length - 1].every(b => b === null)) {
        grid.pop();
      }

      // Save best score
      saveScore();

      // Every 200 points add a new row
      if (score > 0 && score % 200 < pts) addRow();

    } else {
      combo = 1; // reset combo
    }

    resetShooter();
  }

  function resetShooter() {
    shooter.moving = false;
    shooter.color  = nextColor;
    shooter.trail  = [];
    nextColor = randColor();
    // Check game over: bubbles too close to shooter
    for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && bubbleY(r) + BUBBLE_R >= shooter.y - BUBBLE_R * 2) {
          gameState = 'over'; saveScore(); return;
        }
      }
    }
  }

  function saveScore() {
    const best = parseInt(localStorage.getItem('bubble_best') || '0');
    if (score > best) localStorage.setItem('bubble_best', score);
  }

  // ── Draw ──────────────────────────────────────────────────────
  function drawBubble(x, y, color, r = BUBBLE_R, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    // Gradient fill
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
    grad.addColorStop(0, lighten(color));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.28, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Rim
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function lighten(hex) {
    // Make color lighter for gradient top
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)})`;
  }

  function draw() {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d0d2b');
    bg.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Game-over line
    const gameOverY = bubbleY(MAX_ROWS - 1) + BUBBLE_R * 1.5;
    ctx.strokeStyle = 'rgba(255,80,80,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, gameOverY); ctx.lineTo(W, gameOverY); ctx.stroke();
    ctx.setLineDash([]);

    // Grid bubbles
    for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;
        drawBubble(bubbleX(c, r), bubbleY(r), grid[r][c]);
      }
    }

    // Aim line (dotted)
    if (!shooter.moving && gameState === 'playing') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(shooter.x, shooter.y);
      // Simulate bounces
      let ax = shooter.x, ay = shooter.y;
      let avx = Math.cos(shooter.angle) * 120;
      let avy = Math.sin(shooter.angle) * 120;
      for (let step = 0; step < 5; step++) {
        let nx = ax + avx, ny = ay + avy;
        if (nx - BUBBLE_R < 0) { nx = BUBBLE_R; avx *= -1; }
        if (nx + BUBBLE_R > W) { nx = W - BUBBLE_R; avx *= -1; }
        if (ny < 0) break;
        ctx.lineTo(nx, ny);
        ax = nx; ay = ny;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Trail
    shooter.trail.forEach((t, i) => {
      const a = (i + 1) / shooter.trail.length * 0.5;
      drawBubble(t.x, t.y, shooter.color, BUBBLE_R * 0.5, a);
    });

    // Flying bubble
    if (shooter.moving) {
      drawBubble(shooter.bx, shooter.by, shooter.color);
    }

    // Shooter barrel
    ctx.save();
    ctx.translate(shooter.x, shooter.y);
    ctx.rotate(shooter.angle + Math.PI / 2);
    const barrelGrad = ctx.createLinearGradient(-8, -30, 8, -30);
    barrelGrad.addColorStop(0, '#445');
    barrelGrad.addColorStop(1, '#778');
    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.roundRect(-8, -36, 16, 34, 4);
    ctx.fill();
    ctx.restore();

    // Current bubble on shooter
    drawBubble(shooter.x, shooter.y, shooter.color, BUBBLE_R * 0.9);

    // Next bubble preview
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText('NEXT', 14, H - 56);
    drawBubble(36, H - 36, nextColor, BUBBLE_R * 0.75);

    // Particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Floating texts
    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 18px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = '#f9ca24';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 21);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Best: ${highScore}`, W - 10, 21);
    if (combo > 1) {
      ctx.fillStyle = '#ff6b9d';
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px Outfit';
      ctx.fillText(`x${combo} COMBO`, W / 2, 21);
    }

    // Screens
    if (gameState === 'start') drawScreen('🫧 BUBBLE SHOOTER', '#3498db', 'Aim & shoot to match 3+\nClick to fire!', '#aad4f5');
    if (gameState === 'over')  drawScreen('GAME OVER', '#e74c3c', `Score: ${score}\nBest: ${highScore}`, '#ffaaaa');

    ctx.textAlign = 'left';
  }

  function drawScreen(title, titleColor, body, bodyColor) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = titleColor;
    ctx.font = 'bold 30px Outfit';
    ctx.fillText(title, W / 2, H / 2 - 40);
    ctx.fillStyle = bodyColor;
    ctx.font = '16px Outfit';
    const lines = body.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + i * 26));
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px Outfit';
    ctx.fillText('Click or press SPACE to play', W / 2, H / 2 + lines.length * 26 + 20);
  }

  // ── Main loop ─────────────────────────────────────────────────
  let lastTs = 0;
  function loop(ts = 0) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (gameState === 'playing') {
      updateShooter();

      // Update particles
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= p.decay; });
      particles = particles.filter(p => p.life > 0);

      // Update floating texts
      floatingTexts.forEach(ft => { ft.y += ft.vy; ft.life -= 0.02; });
      floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    }

    draw();
  }

  // ── Input ─────────────────────────────────────────────────────
  function handleMouseMove(e) {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    aim(mx, my);
  }

  function handleClick(e) {
    if (gameState === 'start' || gameState === 'over') { startGame(); return; }
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    aim(mx, my);
    fire();
  }

  function handleKey(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'start' || gameState === 'over') { startGame(); return; }
      if (gameState === 'playing') fire();
    }
    if (e.key === 'ArrowLeft')  { shooter.angle = Math.max(-Math.PI + 0.15, shooter.angle - 0.08); }
    if (e.key === 'ArrowRight') { shooter.angle = Math.min(-0.15, shooter.angle + 0.08); }
  }

  // ── Start / init ──────────────────────────────────────────────
  function startGame() {
    score  = 0;
    level  = 1;
    combo  = 1;
    particles = [];
    floatingTexts = [];
    makeGrid();
    initShooter();
    highScore = parseInt(localStorage.getItem('bubble_best') || '0');
    gameState = 'playing';
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    highScore = parseInt(localStorage.getItem('bubble_best') || '0');
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click',     handleClick);
    document.addEventListener('keydown', handleKey);
    gameState = 'start';
    particles = [];
    floatingTexts = [];
    makeGrid();
    initShooter();
    if (animId) cancelAnimationFrame(animId);
    lastTs = 0;
    loop();
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas) {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click',     handleClick);
      document.removeEventListener('keydown', handleKey);
    }
    saveScore();
  }

  return { init, destroy };
})();

// arcade-hub: pop registered

// arcade-hub: level ramp registered
