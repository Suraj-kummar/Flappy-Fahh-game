// ============================================================
//  AsteroidsGame — Classic Neon Asteroids for Fahh Arcade
//  Canvas: asteroids-canvas (480 × 480)
//  Global: AsteroidsGame
// ============================================================
const AsteroidsGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const W = 480, H = 480;
  const TWO_PI = Math.PI * 2;

  const CLR = {
    bg        : '#0d0d1a',
    ship      : '#4ecca3',
    shipGlow  : '#4ecca3',
    asteroid  : '#81ecec',
    asteroidG : '#81ecec',
    bullet    : '#f9ca24',
    bulletG   : '#f9ca24',
    ufo       : '#ff6b6b',
    ufoGlow   : '#ff6b6b',
    particle  : '#f9ca24',
    text      : '#ffffff',
    dim       : '#445566',
    accent    : '#a29bfe',
  };

  const SHIP_SIZE   = 14;
  const TURN_SPEED  = 3.2;
  const THRUST      = 200;
  const FRICTION    = 0.97;
  const BULLET_SPD  = 480;
  const BULLET_LIFE = 1.1;
  const MAX_BULLETS = 5;

  const ASTEROID_SIZES = { large: 40, medium: 20, small: 10 };
  const ASTEROID_SPEED = { large: 60, medium: 100, small: 150 };
  const ASTEROID_PTS   = { large: 20, medium: 50,  small: 100 };
  const ASTEROID_JAGGEDNESS = 0.4;

  const INVINCIBLE_TIME = 2.0;
  const BLINK_RATE      = 0.12;
  const LIVES_START     = 3;

  const UFO_SPEED        = 100;
  const UFO_SHOOT_INT    = 2.2;
  const UFO_INTERVAL_MIN = 15;
  const UFO_INTERVAL_MAX = 30;
  const UFO_BULLET_SPD   = 220;
  const UFO_PTS          = 200;

  const MAX_PARTICLES  = 120;
  const PARTICLE_LIFE  = 0.9;

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let gameState;
  let score, bestScore, lives, wave;
  let ship;
  let bullets, asteroids, particles, ufo, ufoBullets;
  let keys;
  let lastTs;
  let deadTimer, nextWaveTimer;
  let ufoTimer, ufoSpawnIn;
  let shootCooldown;
  let boundKeyDown, boundKeyUp, boundClick;
  let screenFlash;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, type, dur, vol, freqEnd) {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + dur);
      }
      g.gain.setValueAtTime(vol || 0.3, ac.currentTime);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur);
    } catch (e) {}
  }

  function playShoot()           { playTone(900, 'square',   0.12, 0.18, 300); }
  function playThrust()          { playTone(80,  'sawtooth', 0.08, 0.06); }
  function playExplosion(size)   {
    const f = size === 'large' ? 80 : size === 'medium' ? 130 : 200;
    playTone(f, 'square', 0.35, 0.22, 20);
    setTimeout(() => playTone(f * 0.7, 'sawtooth', 0.2, 0.1, 10), 80);
  }
  function playUfoShoot()        { playTone(500, 'sine',   0.15, 0.15, 250); }
  function playUfoDie()          { playTone(300, 'square', 0.5,  0.25, 30); }
  function playShipDie()         {
    playTone(150, 'sawtooth', 0.5, 0.3, 20);
    setTimeout(() => playTone(100, 'square', 0.6, 0.2, 10), 150);
  }
  function playWave()            {
    playTone(440, 'sine', 0.15, 0.2, 660);
    setTimeout(() => playTone(660, 'sine', 0.15, 0.15, 880), 160);
  }

  // ── Asteroid factory ───────────────────────────────────────
  function makeAsteroid(x, y, size) {
    const r   = ASTEROID_SIZES[size];
    const spd = ASTEROID_SPEED[size] * (0.7 + Math.random() * 0.6);
    const angle = Math.random() * TWO_PI;
    const numV  = 8 + Math.floor(Math.random() * 5);
    const offsets = [];
    for (let i = 0; i < numV; i++) {
      offsets.push(1 - ASTEROID_JAGGEDNESS * Math.random());
    }
    return {
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      r, size,
      rot: Math.random() * TWO_PI,
      rotSpd: (Math.random() - 0.5) * 1.5,
      offsets, numV,
    };
  }

  function safeAsteroid(size) {
    let x, y;
    const minDist = 120;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
    } while (Math.hypot(x - W / 2, y - H / 2) < minDist);
    return makeAsteroid(x, y, size);
  }

  // ── UFO factory ────────────────────────────────────────────
  function spawnUfo() {
    const fromLeft = Math.random() < 0.5;
    ufo = {
      x  : fromLeft ? -30 : W + 30,
      y  : H * 0.2 + Math.random() * H * 0.6,
      vx : fromLeft ? UFO_SPEED : -UFO_SPEED,
      w: 36, h: 18,
      shootTimer: UFO_SHOOT_INT * 0.5,
      alive: true,
    };
  }

  // ── Particles ──────────────────────────────────────────────
  function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * TWO_PI;
      const spd   = 40 + Math.random() * 140;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life   : PARTICLE_LIFE * (0.5 + Math.random() * 0.5),
        maxLife: PARTICLE_LIFE,
        size   : 1.5 + Math.random() * 2.5,
        color,
      });
    }
  }

  // ── Game helpers ───────────────────────────────────────────
  function resetShip() {
    ship = {
      x: W / 2, y: H / 2,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      thrusting: false,
      invincible: INVINCIBLE_TIME,
      blinkTimer: 0,
      visible: true,
      alive: true,
    };
  }

  function startWave() {
    const count = 3 + wave;
    asteroids = [];
    for (let i = 0; i < count; i++) asteroids.push(safeAsteroid('large'));
    bullets    = [];
    ufoBullets = [];
    ufo        = null;
    ufoTimer   = 0;
    ufoSpawnIn = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
    playWave();
  }

  function startGame() {
    score         = 0;
    lives         = LIVES_START;
    wave          = 1;
    particles     = [];
    screenFlash   = null;
    deadTimer     = 0;
    nextWaveTimer = 0;
    shootCooldown = 0;
    resetShip();
    startWave();
    gameState = 'play';
  }

  function killShip() {
    ship.alive   = false;
    ship.visible = false;
    lives--;
    screenFlash = { t: 0.3, maxT: 0.3 };
    deadTimer   = 2.0;
    spawnParticles(ship.x, ship.y, 25, CLR.ship);
    playShipDie();
  }

  // ── Collision ──────────────────────────────────────────────
  function circleHit(ax, ay, ar, bx, by, br) {
    return Math.hypot(ax - bx, ay - by) < ar + br;
  }

  function pointInUfo(px, py) {
    if (!ufo || !ufo.alive) return false;
    return Math.abs(px - ufo.x) < ufo.w / 2 + 4 && Math.abs(py - ufo.y) < ufo.h / 2 + 4;
  }

  // ── Drawing ────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.508 + 50) % W;
      const sy = (i * 97.313  + 20) % H;
      const sr = i % 3 === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TWO_PI);
      ctx.fill();
    }
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.shadowBlur = 12;
    ctx.shadowColor = CLR.asteroidG;
    ctx.strokeStyle = CLR.asteroid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < a.numV; i++) {
      const ang = (i / a.numV) * TWO_PI;
      const r   = a.r * a.offsets[i];
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else         ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawShip() {
    if (!ship || !ship.alive || !ship.visible) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    if (ship.thrusting) {
      ctx.shadowBlur  = 16;
      ctx.shadowColor = '#f9ca24';
      ctx.strokeStyle = '#f9ca24';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE * 0.5,  SHIP_SIZE * 0.45);
      ctx.lineTo(-SHIP_SIZE * 1.0 - Math.random() * 8, 0);
      ctx.lineTo(-SHIP_SIZE * 0.5, -SHIP_SIZE * 0.45);
      ctx.stroke();
    }

    ctx.shadowBlur  = 20;
    ctx.shadowColor = CLR.shipGlow;
    ctx.strokeStyle = CLR.ship;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo( SHIP_SIZE,        0);
    ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.55);
    ctx.lineTo(-SHIP_SIZE * 0.4,  0);
    ctx.lineTo(-SHIP_SIZE * 0.7,  SHIP_SIZE * 0.55);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawBullet(b) {
    ctx.save();
    ctx.shadowBlur  = 12;
    ctx.shadowColor = CLR.bulletG;
    ctx.fillStyle   = CLR.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawUfo() {
    if (!ufo || !ufo.alive) return;
    const { x, y, w, h } = ufo;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur  = 18;
    ctx.shadowColor = CLR.ufoGlow;
    ctx.strokeStyle = CLR.ufo;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TWO_PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15, w * 0.3, h * 0.45, 0, Math.PI, TWO_PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo( w / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawUfoBullet(b) {
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = CLR.ufoGlow;
    ctx.fillStyle   = CLR.ufo;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = p.color;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLives() {
    for (let i = 0; i < lives; i++) {
      const lx = W - 20 - i * 22;
      const ly = 20;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = CLR.ship;
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = CLR.shipGlow;
      const s = 7;
      ctx.beginPath();
      ctx.moveTo( s,  0);
      ctx.lineTo(-s * 0.7, -s * 0.55);
      ctx.lineTo(-s * 0.4,  0);
      ctx.lineTo(-s * 0.7,  s * 0.55);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHUD() {
    ctx.save();
    ctx.textAlign  = 'left';
    ctx.font       = "12px 'Press Start 2P', monospace";
    ctx.fillStyle  = CLR.bullet;
    ctx.shadowBlur = 10;
    ctx.shadowColor = CLR.bullet;
    ctx.fillText(score.toString().padStart(6, '0'), 14, 22);

    ctx.font        = "7px 'Press Start 2P', monospace";
    ctx.fillStyle   = CLR.dim;
    ctx.shadowBlur  = 0;
    ctx.fillText('BEST ' + bestScore.toString().padStart(6, '0'), 14, 36);

    ctx.font        = "9px 'Press Start 2P', monospace";
    ctx.fillStyle   = CLR.accent;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = CLR.accent;
    ctx.textAlign   = 'center';
    ctx.fillText('WAVE ' + wave, W / 2, 20);
    ctx.restore();
    drawLives();
  }

  function drawStartScreen() {
    drawBackground();
    ctx.save();
    // Deco circles
    ctx.strokeStyle = 'rgba(129,236,236,0.12)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(80,  380, 55, 0, TWO_PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(400, 100, 38, 0, TWO_PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(360, 360, 28, 0, TWO_PI); ctx.stroke();

    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 30;
    ctx.shadowColor = CLR.ship;
    ctx.fillStyle   = CLR.ship;
    ctx.font        = "28px 'Press Start 2P', monospace";
    ctx.fillText('ASTEROIDS', W / 2, 155);

    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = "9px 'Press Start 2P', monospace";
    ctx.fillText('FAHH ARCADE', W / 2, 182);

    if (bestScore > 0) {
      ctx.fillStyle   = CLR.bullet;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = CLR.bullet;
      ctx.font        = "9px 'Press Start 2P', monospace";
      ctx.fillText('BEST: ' + bestScore, W / 2, 228);
    }

    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(255,255,255,0.5)';
    ctx.font        = "7px 'Press Start 2P', monospace";
    ctx.fillText('WASD / ARROWS — ROTATE & THRUST', W / 2, 278);
    ctx.fillText('SPACE — SHOOT', W / 2, 298);

    if (Math.floor(Date.now() / 550) % 2 === 0) {
      ctx.fillStyle   = CLR.ship;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = CLR.ship;
      ctx.font        = "10px 'Press Start 2P', monospace";
      ctx.fillText('PRESS SPACE TO START', W / 2, 358);
    }
    ctx.restore();
  }

  function drawGameOverScreen() {
    drawBackground();
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 25;
    ctx.shadowColor = '#ff6b6b';
    ctx.fillStyle   = '#ff6b6b';
    ctx.font        = "26px 'Press Start 2P', monospace";
    ctx.fillText('GAME OVER', W / 2, 168);

    ctx.shadowBlur  = 10;
    ctx.shadowColor = CLR.bullet;
    ctx.fillStyle   = CLR.bullet;
    ctx.font        = "11px 'Press Start 2P', monospace";
    ctx.fillText('SCORE: ' + score, W / 2, 218);

    ctx.fillStyle   = CLR.accent;
    ctx.shadowColor = CLR.accent;
    ctx.font        = "9px 'Press Start 2P', monospace";
    ctx.fillText('BEST:  ' + bestScore, W / 2, 244);

    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(255,255,255,0.5)';
    ctx.font        = "7px 'Press Start 2P', monospace";
    ctx.fillText('WAVE ' + wave + ' REACHED', W / 2, 284);

    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle   = CLR.ship;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = CLR.ship;
      ctx.font        = "9px 'Press Start 2P', monospace";
      ctx.fillText('PRESS SPACE TO RETRY', W / 2, 340);
    }
    ctx.restore();
  }

  function drawScreenFlash() {
    if (!screenFlash) return;
    const alpha = (screenFlash.t / screenFlash.maxT) * 0.55;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Update ─────────────────────────────────────────────────
  function update(dt) {
    if (gameState !== 'play') return;

    if (screenFlash) {
      screenFlash.t -= dt;
      if (screenFlash.t <= 0) screenFlash = null;
    }

    // Ship movement
    if (ship.alive) {
      if (keys['ArrowLeft']  || keys['a'] || keys['A']) ship.angle -= TURN_SPEED * dt;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) ship.angle += TURN_SPEED * dt;

      ship.thrusting = !!(keys['ArrowUp'] || keys['w'] || keys['W']);
      if (ship.thrusting) {
        ship.vx += Math.cos(ship.angle) * THRUST * dt;
        ship.vy += Math.sin(ship.angle) * THRUST * dt;
        if (Math.random() < 0.35) {
          playThrust();
          const ex = ship.x - Math.cos(ship.angle) * SHIP_SIZE;
          const ey = ship.y - Math.sin(ship.angle) * SHIP_SIZE;
          spawnParticles(ex, ey, 2, '#f9ca24');
        }
      }

      const frict = Math.pow(FRICTION, dt * 60);
      ship.vx *= frict;
      ship.vy *= frict;
      ship.x  += ship.vx * dt;
      ship.y  += ship.vy * dt;

      // Wrap
      if (ship.x < -SHIP_SIZE) ship.x = W + SHIP_SIZE;
      if (ship.x > W + SHIP_SIZE) ship.x = -SHIP_SIZE;
      if (ship.y < -SHIP_SIZE) ship.y = H + SHIP_SIZE;
      if (ship.y > H + SHIP_SIZE) ship.y = -SHIP_SIZE;

      // Invincibility blink
      if (ship.invincible > 0) {
        ship.invincible -= dt;
        ship.blinkTimer -= dt;
        if (ship.blinkTimer <= 0) {
          ship.visible    = !ship.visible;
          ship.blinkTimer = BLINK_RATE;
        }
        if (ship.invincible <= 0) {
          ship.invincible = 0;
          ship.visible    = true;
        }
      }

      // Shoot
      shootCooldown -= dt;
      if ((keys[' '] || keys['Space']) && shootCooldown <= 0 && bullets.length < MAX_BULLETS) {
        bullets.push({
          x   : ship.x + Math.cos(ship.angle) * SHIP_SIZE,
          y   : ship.y + Math.sin(ship.angle) * SHIP_SIZE,
          vx  : Math.cos(ship.angle) * BULLET_SPD + ship.vx,
          vy  : Math.sin(ship.angle) * BULLET_SPD + ship.vy,
          life: BULLET_LIFE,
        });
        shootCooldown = 0.25;
        playShoot();
      }
    }

    // Move bullets
    bullets = bullets.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0) b.x = W; if (b.x > W) b.x = 0;
      if (b.y < 0) b.y = H; if (b.y > H) b.y = 0;
      b.life -= dt;
      return b.life > 0;
    });

    // Move asteroids
    for (const a of asteroids) {
      a.x += a.vx * dt; a.y += a.vy * dt;
      a.rot += a.rotSpd * dt;
      if (a.x < -a.r) a.x = W + a.r; if (a.x > W + a.r) a.x = -a.r;
      if (a.y < -a.r) a.y = H + a.r; if (a.y > H + a.r) a.y = -a.r;
    }

    // Bullet ↔ Asteroid
    const newAsteroids    = [];
    const deadAsteroidIdx = new Set();
    const deadBulletIdx   = new Set();

    for (let bi = 0; bi < bullets.length; bi++) {
      if (deadBulletIdx.has(bi)) continue;
      const b = bullets[bi];
      for (let ai = 0; ai < asteroids.length; ai++) {
        if (deadAsteroidIdx.has(ai)) continue;
        const a = asteroids[ai];
        if (circleHit(b.x, b.y, 3, a.x, a.y, a.r)) {
          deadBulletIdx.add(bi);
          deadAsteroidIdx.add(ai);
          score += ASTEROID_PTS[a.size];
          if (score > bestScore) { bestScore = score; localStorage.setItem('best_asteroids', bestScore); }
          spawnParticles(a.x, a.y, a.size === 'large' ? 18 : a.size === 'medium' ? 12 : 7, CLR.asteroidG);
          playExplosion(a.size);
          if (a.size === 'large') {
            newAsteroids.push(makeAsteroid(a.x, a.y, 'medium'));
            newAsteroids.push(makeAsteroid(a.x, a.y, 'medium'));
          } else if (a.size === 'medium') {
            newAsteroids.push(makeAsteroid(a.x, a.y, 'small'));
            newAsteroids.push(makeAsteroid(a.x, a.y, 'small'));
          }
          break;
        }
      }
    }

    // Bullet ↔ UFO
    if (ufo && ufo.alive) {
      for (let bi = 0; bi < bullets.length; bi++) {
        if (deadBulletIdx.has(bi)) continue;
        if (pointInUfo(bullets[bi].x, bullets[bi].y)) {
          deadBulletIdx.add(bi);
          ufo.alive = false;
          score += UFO_PTS;
          if (score > bestScore) { bestScore = score; localStorage.setItem('best_asteroids', bestScore); }
          spawnParticles(ufo.x, ufo.y, 20, CLR.ufoGlow);
          playUfoDie();
          ufo = null;
          ufoTimer   = 0;
          ufoSpawnIn = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
        }
      }
    }

    asteroids = asteroids.filter((_, i) => !deadAsteroidIdx.has(i)).concat(newAsteroids);
    bullets   = bullets.filter((_, i) => !deadBulletIdx.has(i));

    // Ship ↔ Asteroid
    if (ship.alive && ship.invincible <= 0) {
      for (const a of asteroids) {
        if (circleHit(ship.x, ship.y, SHIP_SIZE * 0.65, a.x, a.y, a.r * 0.85)) {
          killShip(); break;
        }
      }
    }

    // Ship ↔ UFO body
    if (ship.alive && ship.invincible <= 0 && ufo && ufo.alive) {
      if (circleHit(ship.x, ship.y, SHIP_SIZE * 0.65, ufo.x, ufo.y, ufo.w / 2)) {
        killShip();
      }
    }

    // UFO bullets
    ufoBullets = ufoBullets.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (ship.alive && ship.invincible <= 0) {
        if (circleHit(b.x, b.y, 4, ship.x, ship.y, SHIP_SIZE * 0.65)) {
          killShip(); return false;
        }
      }
      return b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20;
    });

    // UFO movement & shooting
    if (ufo && ufo.alive) {
      ufo.x += ufo.vx * dt;
      if ((ufo.vx > 0 && ufo.x > W + 50) || (ufo.vx < 0 && ufo.x < -50)) {
        ufo = null;
        ufoTimer   = 0;
        ufoSpawnIn = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
      } else {
        ufo.shootTimer -= dt;
        if (ufo.shootTimer <= 0) {
          ufo.shootTimer = UFO_SHOOT_INT;
          if (ship.alive) {
            const dx = ship.x - ufo.x, dy = ship.y - ufo.y;
            const len = Math.hypot(dx, dy) || 1;
            const spread = 0.35;
            const ax = dx / len + (Math.random() - 0.5) * spread;
            const ay = dy / len + (Math.random() - 0.5) * spread;
            const al = Math.hypot(ax, ay) || 1;
            ufoBullets.push({
              x: ufo.x, y: ufo.y,
              vx: (ax / al) * UFO_BULLET_SPD,
              vy: (ay / al) * UFO_BULLET_SPD,
              life: 2.5,
            });
            playUfoShoot();
          }
        }
      }
    } else if (!ufo) {
      ufoTimer += dt;
      if (ufoTimer >= ufoSpawnIn) { spawnUfo(); ufoTimer = 0; }
    }

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.97; p.vy *= 0.97;
      p.life -= dt;
      return p.life > 0;
    });

    // Wave cleared
    if (asteroids.length === 0 && !nextWaveTimer) nextWaveTimer = 2.0;
    if (nextWaveTimer) {
      nextWaveTimer -= dt;
      if (nextWaveTimer <= 0) { nextWaveTimer = 0; wave++; startWave(); }
    }

    // Respawn / game-over
    if (!ship.alive) {
      deadTimer -= dt;
      if (deadTimer <= 0) {
        if (lives > 0) resetShip();
        else gameState = 'gameover';
      }
    }
  }

  // ── Draw (game state) ──────────────────────────────────────
  function draw() {
    if (gameState === 'start') { drawStartScreen(); return; }
    if (gameState === 'gameover') { drawGameOverScreen(); return; }

    drawBackground();
    for (const a of asteroids) drawAsteroid(a);
    for (const b of bullets)   drawBullet(b);
    for (const b of ufoBullets) drawUfoBullet(b);
    drawUfo();
    drawShip();
    drawParticles();
    drawHUD();
    drawScreenFlash();

    // Next-wave banner
    if (nextWaveTimer > 0) {
      ctx.save();
      ctx.textAlign   = 'center';
      ctx.font        = "14px 'Press Start 2P', monospace";
      ctx.fillStyle   = CLR.accent;
      ctx.shadowBlur  = 16;
      ctx.shadowColor = CLR.accent;
      ctx.fillText('WAVE ' + (wave + 1) + ' INCOMING', W / 2, H / 2);
      ctx.restore();
    }

    // Respawn message
    if (!ship.alive && lives > 0 && deadTimer > 0 && Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.save();
      ctx.textAlign   = 'center';
      ctx.font        = "10px 'Press Start 2P', monospace";
      ctx.fillStyle   = '#ff6b6b';
      ctx.shadowBlur  = 12;
      ctx.shadowColor = '#ff6b6b';
      ctx.fillText('SHIP DESTROYED', W / 2, H / 2 + 30);
      ctx.restore();
    }
  }

  // ── Game loop ──────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min((ts - (lastTs || ts)) / 1000, 0.05);
    lastTs = ts;
    update(dt);
    draw();
  }

  // ── Input handlers ─────────────────────────────────────────
  function onKeyDown(e) {
    keys[e.key] = true;
    if ((e.key === ' ') && !e.repeat) {
      if (gameState === 'start' || gameState === 'gameover') startGame();
    }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e)      { keys[e.key] = false; }
  function onCanvasClick() {
    if (gameState === 'start' || gameState === 'gameover') startGame();
  }

  let _touchSX = 0, _touchSY = 0;
  function onTouchStart(e) {
    const t = e.touches[0];
    _touchSX = t.clientX; _touchSY = t.clientY;
    if (gameState === 'start' || gameState === 'gameover') { startGame(); e.preventDefault(); return; }
    if (gameState === 'play') {
      const rect = canvas.getBoundingClientRect();
      if ((t.clientX - rect.left) > W * 0.6) {
        keys[' '] = true;
        setTimeout(() => { keys[' '] = false; }, 180);
      }
    }
    e.preventDefault();
  }
  function onTouchMove(e) {
    if (gameState !== 'play') return;
    const t  = e.touches[0];
    const dx = t.clientX - _touchSX;
    const dy = t.clientY - _touchSY;
    keys['ArrowLeft']  = dx < -15;
    keys['ArrowRight'] = dx >  15;
    keys['ArrowUp']    = dy < -15;
    e.preventDefault();
  }
  function onTouchEnd(e) {
    keys['ArrowLeft'] = keys['ArrowRight'] = keys['ArrowUp'] = false;
    e.preventDefault();
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('AsteroidsGame: canvas not found:', canvasId); return; }
    ctx = canvas.getContext('2d');

    bestScore     = parseInt(localStorage.getItem('best_asteroids') || '0', 10);
    keys          = {};
    gameState     = 'start';
    score         = 0; lives = LIVES_START; wave = 1;
    bullets       = []; asteroids = []; particles = []; ufoBullets = [];
    ufo           = null; ufoTimer = 0; ufoSpawnIn = UFO_INTERVAL_MAX;
    screenFlash   = null; deadTimer = 0; nextWaveTimer = 0; shootCooldown = 0;
    lastTs        = 0;

    boundKeyDown  = onKeyDown.bind(this);
    boundKeyUp    = onKeyUp.bind(this);
    boundClick    = onCanvasClick.bind(this);
    const bTStart = onTouchStart.bind(this);
    const bTMove  = onTouchMove.bind(this);
    const bTEnd   = onTouchEnd.bind(this);
    canvas._astTS = bTStart;
    canvas._astTM = bTMove;
    canvas._astTE = bTEnd;

    window.addEventListener('keydown', boundKeyDown);
    window.addEventListener('keyup',   boundKeyUp);
    canvas.addEventListener('click',      boundClick);
    canvas.addEventListener('touchstart', bTStart, { passive: false });
    canvas.addEventListener('touchmove',  bTMove,  { passive: false });
    canvas.addEventListener('touchend',   bTEnd,   { passive: false });

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    window.removeEventListener('keydown', boundKeyDown);
    window.removeEventListener('keyup',   boundKeyUp);
    if (canvas) {
      canvas.removeEventListener('click',      boundClick);
      canvas.removeEventListener('touchstart', canvas._astTS);
      canvas.removeEventListener('touchmove',  canvas._astTM);
      canvas.removeEventListener('touchend',   canvas._astTE);
    }
    if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
    canvas = ctx = null;
    keys = {}; bullets = []; asteroids = []; particles = []; ufoBullets = [];
    ufo = null; ship = null; screenFlash = null;
  }

  return { init, destroy };
})();

// arcade-hub: asteroid split registered

// arcade-hub: UFO registered
