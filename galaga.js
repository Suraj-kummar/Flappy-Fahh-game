// ============================================================
//  GalagaGame — Classic Neon Galaga-Style Shooter for Fahh Arcade
//  Canvas: galaga-canvas (480 x 520)
//  Global: GalagaGame
// ============================================================
const GalagaGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const W = 480, H = 520;
  const TWO_PI = Math.PI * 2;

  const CLR = {
    bg         : '#0d0d1a',
    player     : '#4ecca3',
    playerGlow : '#4ecca3',
    bullet     : '#f9ca24',
    bulletGlow : '#f9ca24',
    eBullet    : '#ff6b6b',
    eBulletGl  : '#ff6b6b',
    text       : '#ffffff',
    dim        : '#445566',
    accent     : '#a29bfe',
    gold       : '#f9ca24',
    red        : '#ff6b6b',
    star       : '#ffffff',
    bonusBg    : '#1a1a2e',
    bonusText  : '#f9ca24',
  };

  // Enemy type definitions
  const ENEMY_TYPES = {
    small : { color: '#74b9ff', glow: '#4fc3f7', pts: 100, rows: [2, 3], size: 14 },
    medium: { color: '#fd79a8', glow: '#e91e8c', pts: 200, rows: [1],    size: 17 },
    boss  : { color: '#a29bfe', glow: '#6c5ce7', pts: 500, rows: [0],    size: 20 },
  };

  const COLS = 8, ROWS = 4;
  const FORM_START_X = 56;  // left edge of formation
  const FORM_START_Y = 70;  // top edge of formation
  const CELL_W = 46, CELL_H = 44;

  const PLAYER_W   = 36, PLAYER_H = 22;
  const PLAYER_Y   = H - 54;
  const PLAYER_SPD = 240;   // px/s
  const BULLET_SPD = 480;   // px/s
  const SHOOT_CD   = 0.18;  // seconds between shots

  const ENEMY_BULLET_SPD = 210;
  const ENEMY_SHOOT_BASE = 1.6;  // seconds base interval (decreases with level)

  const SWOOP_SPEED = 200;  // px/s along swoop path
  const MAX_SWOOPING = 2;   // max enemies diving at once

  const STAR_COUNT = 80;
  const STAR_SPEED_MIN = 30, STAR_SPEED_MAX = 120;

  const LIVES_START = 3;
  const INVINCIBLE_TIME = 1.8;
  const BLINK_RATE = 0.1;

  const BEST_KEY = 'galaga_best';

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let gameState;   // 'title' | 'playing' | 'bonus' | 'wave_clear' | 'game_over'
  let score, bestScore, lives, wave;
  let player;
  let bullets;           // player bullets []
  let enemies;           // array of enemy objects
  let enemyBullets;      // []
  let particles;         // explosion particles []
  let stars;             // background stars []
  let keys;              // pressed keys set
  let shootTimer;        // cooldown
  let enemyShootTimer;
  let enemyShootInterval;
  let formDir;           // 1 or -1 (formation side movement)
  let formX, formY;      // formation offset
  let formSpeed;
  let formDropTarget;    // Y to drop to each wave
  let waveClearTimer;
  let bonusTimer;
  let bonusPoints;
  let swoopQueue;        // enemies queued to swoop
  let swoopTimer;        // timer between swoop dispatches
  let invTimer;          // player invincibility timer
  let lastTime;
  let boundKeyDown, boundKeyUp;

  // ── Helpers ────────────────────────────────────────────────
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function rndInt(lo, hi) { return Math.floor(rnd(lo, hi + 1)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ── Audio (Web Audio synth) ────────────────────────────────
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function playTone(freq, type, dur, vol = 0.15, startFreq = null) {
    try {
      ensureAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = type;
      if (startFreq) {
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + dur);
      } else {
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      }
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }
  function sfxShoot()   { playTone(880, 'square', 0.08, 0.12); }
  function sfxHit()     { playTone(200, 'sawtooth', 0.15, 0.18, 600); }
  function sfxDie()     { playTone(80, 'sawtooth', 0.5, 0.22, 300); }
  function sfxBonus()   { playTone(1200, 'sine', 0.3, 0.18); }
  function sfxSwoop()   { playTone(350, 'triangle', 0.25, 0.1, 600); }
  function sfxLevelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sine', 0.18, 0.15), i * 80));
  }

  // ── Stars ──────────────────────────────────────────────────
  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x    : rnd(0, W),
        y    : rnd(0, H),
        spd  : rnd(STAR_SPEED_MIN, STAR_SPEED_MAX),
        size : rnd(0.5, 2.5),
        alpha: rnd(0.3, 1.0),
      });
    }
  }
  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.spd * dt;
      if (s.y > H) { s.y = 0; s.x = rnd(0, W); }
    }
  }
  function drawStars() {
    for (const s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = CLR.star;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Player ────────────────────────────────────────────────
  function initPlayer() {
    player = { x: W / 2, alive: true };
    invTimer = INVINCIBLE_TIME;
    shootTimer = 0;
  }

  function drawPlayer() {
    if (!player.alive) return;
    // Blink during invincibility
    if (invTimer > 0 && Math.floor(invTimer / BLINK_RATE) % 2 === 0) return;

    const x = player.x, y = PLAYER_Y;
    ctx.save();
    ctx.shadowColor = CLR.playerGlow;
    ctx.shadowBlur  = 14;
    ctx.strokeStyle = CLR.player;
    ctx.fillStyle   = CLR.player;
    ctx.lineWidth   = 2;

    // Main hull
    ctx.beginPath();
    ctx.moveTo(x, y - PLAYER_H / 2);
    ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H / 2);
    ctx.lineTo(x + PLAYER_W / 4, y + PLAYER_H / 3);
    ctx.lineTo(x - PLAYER_W / 4, y + PLAYER_H / 3);
    ctx.lineTo(x - PLAYER_W / 2, y + PLAYER_H / 2);
    ctx.closePath();
    ctx.strokeStyle = CLR.player;
    ctx.fillStyle = 'rgba(78,204,163,0.18)';
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 5, 7, 0, 0, TWO_PI);
    ctx.fillStyle = CLR.player;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Engine glow dots
    ctx.fillStyle = CLR.gold;
    ctx.shadowColor = CLR.gold;
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x - 8, y + PLAYER_H / 3 + 2, 2, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8, y + PLAYER_H / 3 + 2, 2, 0, TWO_PI); ctx.fill();

    ctx.restore();
  }

  // ── Enemies ───────────────────────────────────────────────
  function typeForRow(row) {
    if (row === 0) return 'boss';
    if (row === 1) return 'medium';
    return 'small';
  }

  function initEnemies() {
    enemies = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const typeName = typeForRow(row);
        const def = ENEMY_TYPES[typeName];
        enemies.push({
          col, row,
          type    : typeName,
          def,
          alive   : true,
          swooping: false,
          swoopPath: null,
          swoopT   : 0,
          frame    : 0,
          frameTimer: 0,
          // base formation position (relative to formX/formY)
          baseX: FORM_START_X + col * CELL_W + CELL_W / 2,
          baseY: FORM_START_Y + row * CELL_H + CELL_H / 2,
          x: 0, y: 0,   // computed each frame
        });
      }
    }
    swoopQueue = [];
    swoopTimer = 0;
  }

  function aliveCount() { return enemies.filter(e => e.alive && !e.swooping).length; }
  function totalAlive()  { return enemies.filter(e => e.alive).length; }

  function enemyScreenX(e) { return e.baseX + formX; }
  function enemyScreenY(e) { return e.baseY + formY; }

  // Build a cubic bezier swoop path for an enemy
  function buildSwoopPath(e) {
    const sx = enemyScreenX(e), sy = enemyScreenY(e);
    const tx = player.x + rnd(-40, 40);
    const ty = H + 30;
    // Control points that arc toward player then past
    const side = (sx < W / 2) ? 1 : -1;
    const cp1x = sx + side * rnd(80, 140), cp1y = sy + rnd(80, 160);
    const cp2x = tx + side * rnd(-60, 60),  cp2y = ty - rnd(100, 180);
    return { sx, sy, cp1x, cp1y, cp2x, cp2y, tx, ty };
  }

  function cubicBezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  function getSwoopPos(path, t) {
    return {
      x: cubicBezier(t, path.sx, path.cp1x, path.cp2x, path.tx),
      y: cubicBezier(t, path.sy, path.cp1y, path.cp2y, path.ty),
    };
  }

  function dispatchSwoop() {
    const inFormation = enemies.filter(e => e.alive && !e.swooping);
    if (inFormation.length === 0) return;
    const e = inFormation[rndInt(0, inFormation.length - 1)];
    e.swooping = true;
    e.swoopPath = buildSwoopPath(e);
    e.swoopT = 0;
    sfxSwoop();
  }

  function updateEnemies(dt) {
    // Formation movement
    formX += formDir * formSpeed * dt;
    const leftEdge  = FORM_START_X + formX;
    const rightEdge = FORM_START_X + (COLS - 1) * CELL_W + formX + CELL_W;
    if (formDir === 1 && rightEdge > W - 10) { formDir = -1; }
    if (formDir === -1 && leftEdge < 10)     { formDir =  1; }

    // Swoop dispatch
    const currentSwooping = enemies.filter(e => e.alive && e.swooping).length;
    swoopTimer -= dt;
    if (swoopTimer <= 0 && currentSwooping < MAX_SWOOPING && totalAlive() > 1) {
      dispatchSwoop();
      swoopTimer = rnd(2.0, 4.5) - wave * 0.1;
      if (swoopTimer < 0.8) swoopTimer = 0.8;
    }

    for (const e of enemies) {
      if (!e.alive) continue;

      // Animation frame
      e.frameTimer += dt;
      if (e.frameTimer > 0.35) { e.frame ^= 1; e.frameTimer = 0; }

      if (e.swooping) {
        // Advance along bezier path
        const pathLen = 520; // approximate path arc length (px)
        e.swoopT += (SWOOP_SPEED / pathLen) * dt;
        if (e.swoopT >= 1) {
          // Finished swooping — re-enter formation from top
          e.swooping = false;
          e.swoopT = 0;
          e.swoopPath = null;
          // Teleport to above screen and drift back
          e.x = cubicBezier(1, e.swoopPath ? e.swoopPath.sx : e.baseX + formX,
                             0, 0, e.baseX + formX);
          e.y = e.baseY + formY;
        } else {
          const pos = getSwoopPos(e.swoopPath, e.swoopT);
          e.x = pos.x;
          e.y = pos.y;
        }
      } else {
        e.x = enemyScreenX(e);
        e.y = enemyScreenY(e);
      }
    }
  }

  function drawEnemy(e) {
    if (!e.alive) return;
    const { x, y, def, type, frame } = e;
    const s = def.size;

    ctx.save();
    ctx.shadowColor = def.glow;
    ctx.shadowBlur  = 12 + frame * 4;
    ctx.strokeStyle = def.color;
    ctx.lineWidth   = 1.8;

    if (type === 'boss') {
      // Boss: butterfly-like shape
      ctx.fillStyle = 'rgba(162,155,254,0.15)';
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.bezierCurveTo(x + s * 1.4, y - s * 0.6, x + s * 1.6, y + s * 0.4, x, y + s * 0.4);
      ctx.bezierCurveTo(x - s * 1.6, y + s * 0.4, x - s * 1.4, y - s * 0.6, x, y - s);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Inner core
      ctx.beginPath();
      ctx.arc(x, y, s * 0.38, 0, TWO_PI);
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.7 + frame * 0.2;
      ctx.fill();
      // Eyes
      ctx.globalAlpha = 1;
      ctx.fillStyle = CLR.gold;
      ctx.shadowColor = CLR.gold; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(x - s * 0.25, y - s * 0.15, 2.5, 0, TWO_PI); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.25, y - s * 0.15, 2.5, 0, TWO_PI); ctx.fill();
    } else if (type === 'medium') {
      // Medium: rounded beetle
      ctx.fillStyle = 'rgba(253,121,168,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.1, s * 0.75, 0, 0, TWO_PI);
      ctx.fill(); ctx.stroke();
      // Legs
      ctx.strokeStyle = def.color; ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath(); ctx.moveTo(x + i * s * 0.5, y - 3);
        ctx.lineTo(x + i * s * 1.1, y - 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + i * s * 0.5, y + 2);
        ctx.lineTo(x + i * s * 1.1, y + 5); ctx.stroke();
      }
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(x, y - 2, s * 0.28, 0, TWO_PI);
      ctx.globalAlpha = 0.8 + frame * 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Small: angular bee
      ctx.fillStyle = 'rgba(116,185,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.9);
      ctx.lineTo(x + s * 0.8 + frame * 3, y);
      ctx.lineTo(x + s * 0.5, y + s * 0.9);
      ctx.lineTo(x - s * 0.5, y + s * 0.9);
      ctx.lineTo(x - s * 0.8 - frame * 3, y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Stinger
      ctx.strokeStyle = CLR.gold; ctx.shadowColor = CLR.gold; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.lineTo(x, y + s * 1.3); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Bullets ───────────────────────────────────────────────
  function initBullets() {
    bullets = [];
    enemyBullets = [];
  }

  function shootPlayer() {
    if (shootTimer > 0 || !player.alive) return;
    bullets.push({ x: player.x, y: PLAYER_Y - PLAYER_H / 2 - 4, active: true });
    shootTimer = SHOOT_CD;
    sfxShoot();
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      if (!b.active) continue;
      b.y -= BULLET_SPD * dt;
      if (b.y < -10) b.active = false;
    }
    for (const b of enemyBullets) {
      if (!b.active) continue;
      b.y += ENEMY_BULLET_SPD * dt;
      if (b.y > H + 10) b.active = false;
    }
    // Prune inactive
    bullets = bullets.filter(b => b.active);
    enemyBullets = enemyBullets.filter(b => b.active);
  }

  function drawBullets() {
    ctx.save();
    ctx.shadowColor = CLR.bulletGlow; ctx.shadowBlur = 10;
    ctx.fillStyle   = CLR.bullet;
    for (const b of bullets) {
      if (!b.active) continue;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(b.x - 2, b.y, 4, 14, 2)
                    : ctx.rect(b.x - 2, b.y, 4, 14);
      ctx.fill();
    }
    ctx.shadowColor = CLR.eBulletGl; ctx.shadowBlur = 10;
    ctx.fillStyle   = CLR.eBullet;
    for (const b of enemyBullets) {
      if (!b.active) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  function tryEnemyShoot() {
    const alive = enemies.filter(e => e.alive);
    if (alive.length === 0) return;
    const shooter = alive[rndInt(0, alive.length - 1)];
    enemyBullets.push({ x: shooter.x, y: shooter.y + 10, active: true });
  }

  // ── Particles ─────────────────────────────────────────────
  function spawnExplosion(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = rnd(0, TWO_PI);
      const spd   = rnd(40, 180);
      particles.push({
        x, y,
        vx   : Math.cos(angle) * spd,
        vy   : Math.sin(angle) * spd,
        life : rnd(0.4, 0.9),
        maxL : rnd(0.4, 0.9),
        size : rnd(1.5, 4),
        color,
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawParticles() {
    ctx.save();
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxL);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Collision ─────────────────────────────────────────────
  function checkCollisions() {
    // Player bullets vs enemies
    for (const b of bullets) {
      if (!b.active) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = b.x - e.x, dy = (b.y + 7) - e.y;
        if (Math.abs(dx) < e.def.size + 4 && Math.abs(dy) < e.def.size + 4) {
          b.active = false;
          e.alive  = false;
          score   += e.def.pts * (wave > 1 ? Math.ceil(wave / 2) : 1);
          spawnExplosion(e.x, e.y, e.def.color, 18);
          sfxHit();
          break;
        }
      }
    }

    // Enemy bullets vs player
    if (player.alive && invTimer <= 0) {
      for (const b of enemyBullets) {
        if (!b.active) continue;
        const dx = b.x - player.x, dy = b.y - PLAYER_Y;
        if (Math.abs(dx) < PLAYER_W / 2 - 4 && Math.abs(dy) < PLAYER_H / 2) {
          b.active = false;
          killPlayer();
          break;
        }
      }
    }

    // Swooping enemies vs player
    if (player.alive && invTimer <= 0) {
      for (const e of enemies) {
        if (!e.alive || !e.swooping) continue;
        const dx = e.x - player.x, dy = e.y - PLAYER_Y;
        if (Math.abs(dx) < PLAYER_W / 2 + e.def.size - 4
            && Math.abs(dy) < PLAYER_H / 2 + e.def.size - 4) {
          e.alive = false;
          spawnExplosion(e.x, e.y, e.def.color, 14);
          sfxHit();
          killPlayer();
        }
      }
    }
  }

  function killPlayer() {
    lives--;
    spawnExplosion(player.x, PLAYER_Y, CLR.player, 28);
    sfxDie();
    invTimer = INVINCIBLE_TIME;
    if (lives <= 0) {
      player.alive = false;
      setTimeout(() => { gameState = 'game_over'; }, 1200);
    }
  }

  // ── HUD ───────────────────────────────────────────────────
  function drawHUD() {
    ctx.save();
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = CLR.text;
    ctx.shadowColor = CLR.accent; ctx.shadowBlur = 6;

    // Score
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 10, 20);
    ctx.fillStyle = CLR.gold; ctx.shadowColor = CLR.gold;
    ctx.fillText(String(score).padStart(7, '0'), 10, 36);

    // Best
    ctx.fillStyle = CLR.dim;
    ctx.shadowColor = 'transparent';
    ctx.fillText('BEST', 10, 52);
    ctx.fillStyle = CLR.accent; ctx.shadowColor = CLR.accent; ctx.shadowBlur = 4;
    ctx.fillText(String(bestScore).padStart(7, '0'), 10, 67);

    // Wave
    ctx.textAlign = 'center';
    ctx.fillStyle = CLR.text; ctx.shadowColor = CLR.accent; ctx.shadowBlur = 6;
    ctx.fillText(`WAVE ${wave}`, W / 2, 22);

    // Lives
    ctx.textAlign = 'right';
    ctx.fillStyle = CLR.player;
    ctx.shadowColor = CLR.playerGlow; ctx.shadowBlur = 8;
    for (let i = 0; i < lives; i++) {
      drawMiniShip(W - 16 - i * 22, 26);
    }

    ctx.restore();
  }

  function drawMiniShip(x, y) {
    const s = 8;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x - s, y + s);
    ctx.closePath();
    ctx.fillStyle = CLR.player;
    ctx.fill();
  }

  // ── Screens ───────────────────────────────────────────────
  function drawTitle() {
    ctx.save();

    // Glow title
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.shadowColor = '#a29bfe'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#a29bfe';
    ctx.fillText('GALAGA', W / 2, 160);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = CLR.gold; ctx.shadowColor = CLR.gold; ctx.shadowBlur = 10;
    ctx.fillText('FAHH ARCADE', W / 2, 192);

    // Instructions
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = CLR.text; ctx.shadowBlur = 0;
    const lines = [
      '← → / A D  —  MOVE',
      'SPACE       —  SHOOT',
      '',
      'Small Alien   100 pts',
      'Medium Alien  200 pts',
      'Boss Alien    500 pts',
      '',
      `BEST: ${String(bestScore).padStart(7, '0')}`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 244 + i * 22));

    // Blinking press start
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillStyle = CLR.player; ctx.shadowColor = CLR.playerGlow; ctx.shadowBlur = 12;
      ctx.fillText('PRESS SPACE TO START', W / 2, 460);
    }

    ctx.restore();
  }

  function drawGameOver() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px "Courier New", monospace';
    ctx.fillStyle = CLR.red; ctx.shadowColor = CLR.red; ctx.shadowBlur = 24;
    ctx.fillText('GAME OVER', W / 2, 200);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = CLR.gold; ctx.shadowColor = CLR.gold; ctx.shadowBlur = 10;
    ctx.fillText(`SCORE: ${String(score).padStart(7, '0')}`, W / 2, 248);

    ctx.fillStyle = CLR.accent; ctx.shadowColor = CLR.accent;
    ctx.fillText(`BEST:  ${String(bestScore).padStart(7, '0')}`, W / 2, 276);

    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = CLR.text; ctx.shadowBlur = 0;
      ctx.fillText('PRESS SPACE TO PLAY AGAIN', W / 2, 340);
    }
    ctx.restore();
  }

  function drawWaveClear() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = CLR.player; ctx.shadowColor = CLR.playerGlow; ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${wave} CLEAR!`, W / 2, H / 2 - 20);
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = CLR.gold; ctx.shadowColor = CLR.gold; ctx.shadowBlur = 10;
    ctx.fillText('GET READY...', W / 2, H / 2 + 20);
    ctx.restore();
  }

  function drawBonus() {
    // Bonus stage background tint
    ctx.fillStyle = 'rgba(26,26,46,0.5)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = CLR.bonusText; ctx.shadowColor = CLR.bonusText; ctx.shadowBlur = 18;
    ctx.fillText('✦ BONUS STAGE ✦', W / 2, 30);
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = CLR.text; ctx.shadowBlur = 0;
    ctx.fillText('NO ENEMY FIRE — SHOOT THEM ALL!', W / 2, 52);
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = CLR.gold; ctx.shadowColor = CLR.gold; ctx.shadowBlur = 10;
    ctx.fillText(`BONUS: +${bonusPoints}`, W / 2, H - 18);
    ctx.restore();
  }

  // ── Wave logic ────────────────────────────────────────────
  function isBonusWave(w) { return w % 3 === 0; }

  function startWave(w) {
    wave = w;
    formX = 0; formY = 0;
    formDir = 1;
    formSpeed = 20 + wave * 3;

    // Enemy shoot interval decreases with waves
    enemyShootInterval = Math.max(0.6, ENEMY_SHOOT_BASE - wave * 0.06);
    enemyShootTimer = enemyShootInterval;

    initEnemies();
    initBullets();
    particles = particles || [];

    if (isBonusWave(w)) {
      gameState = 'bonus';
      bonusPoints = 0;
      sfxBonus();
    } else {
      gameState = 'playing';
    }
  }

  function nextWave() {
    sfxLevelUp();
    waveClearTimer = 2.2;
    gameState = 'wave_clear';
    // Update best
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem(BEST_KEY, bestScore); } catch (e) {}
    }
  }

  // ── Main loop ─────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min((ts - (lastTime || ts)) / 1000, 0.05);
    lastTime = ts;

    // ── Update ──
    updateStars(dt);
    updateParticles(dt);

    if (gameState === 'playing' || gameState === 'bonus') {
      // Player movement
      if (player.alive) {
        if (keys.has('ArrowLeft') || keys.has('a'))
          player.x -= PLAYER_SPD * dt;
        if (keys.has('ArrowRight') || keys.has('d'))
          player.x += PLAYER_SPD * dt;
        player.x = clamp(player.x, PLAYER_W / 2 + 4, W - PLAYER_W / 2 - 4);
      }

      // Shoot timer
      shootTimer = Math.max(0, shootTimer - dt);
      if (keys.has(' ') && player.alive) shootPlayer();

      // Invincibility
      if (invTimer > 0) invTimer -= dt;

      // Update enemies
      updateEnemies(dt);
      updateBullets(dt);
      checkCollisions();

      // Enemy shooting (disabled in bonus)
      if (gameState === 'playing') {
        enemyShootTimer -= dt;
        if (enemyShootTimer <= 0) {
          tryEnemyShoot();
          enemyShootTimer = enemyShootInterval;
        }
      } else {
        // Bonus: count bonus points for each enemy killed
        bonusPoints = enemies.filter(e => !e.alive).length * 500;
      }

      // Check wave clear
      if (totalAlive() === 0) {
        if (gameState === 'bonus') {
          score += bonusPoints;
          sfxBonus();
        }
        nextWave();
      }
    } else if (gameState === 'wave_clear') {
      waveClearTimer -= dt;
      if (waveClearTimer <= 0) startWave(wave + 1);
    }

    // ── Draw ──
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);

    drawStars();

    if (gameState === 'title') {
      drawTitle();
      return;
    }

    if (gameState === 'game_over') {
      // Still draw particles for the death explosion
      drawParticles();
      drawGameOver();
      drawHUD();
      return;
    }

    if (gameState === 'wave_clear') {
      drawEnemies();
      drawParticles();
      drawPlayer();
      drawHUD();
      drawWaveClear();
      return;
    }

    // Playing / Bonus
    if (gameState === 'bonus') drawBonus();

    drawBullets();
    drawEnemies();
    drawParticles();
    drawPlayer();
    drawHUD();
  }

  function drawEnemies() {
    for (const e of enemies) drawEnemy(e);
  }

  // ── Input ─────────────────────────────────────────────────
  function handleKeyDown(e) {
    keys.add(e.key);
    if (e.key === ' ') e.preventDefault();

    if (e.key === ' ') {
      if (gameState === 'title') {
        startNewGame();
      } else if (gameState === 'game_over') {
        startNewGame();
      }
    }
  }
  function handleKeyUp(e) { keys.delete(e.key); }

  // ── Game init ─────────────────────────────────────────────
  function startNewGame() {
    score = 0;
    lives = LIVES_START;
    particles = [];
    initPlayer();
    startWave(1);
  }

  // ── Public API ────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('GalagaGame: canvas not found:', canvasId); return; }
    ctx = canvas.getContext('2d');
    canvas.width  = W;
    canvas.height = H;

    // Load best score
    try { bestScore = parseInt(localStorage.getItem(BEST_KEY)) || 0; }
    catch (e) { bestScore = 0; }

    keys = new Set();
    initStars();
    particles = [];
    score = 0; lives = LIVES_START; wave = 1;
    gameState = 'title';

    boundKeyDown = handleKeyDown;
    boundKeyUp   = handleKeyUp;
    window.addEventListener('keydown', boundKeyDown);
    window.addEventListener('keyup',   boundKeyUp);

    lastTime = null;
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (boundKeyDown) window.removeEventListener('keydown', boundKeyDown);
    if (boundKeyUp)   window.removeEventListener('keyup',   boundKeyUp);
    if (audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.close(); } catch (e) {}
    }
    boundKeyDown = boundKeyUp = null;
    canvas = ctx = audioCtx = null;
  }

  return { init, destroy };
})();

// arcade-hub: capture beam registered
