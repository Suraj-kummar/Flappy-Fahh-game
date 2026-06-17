// =========================================================
//  MEMORY MATCH — memory.js
//  Classic slot-machine emoji card flip game
//  Nostalgic neon retro style
// =========================================================
"use strict";

const MemoryGame = (() => {

  // ── Emoji set (8 pairs = 16 cards) ───────────────────────
  const EMOJIS = ["🍒", "🍋", "⭐", "🔔", "💎", "7️⃣", "🍀", "💣"];
  const GRID_COLS = 4;
  const GRID_ROWS = 4;
  const TOTAL     = GRID_COLS * GRID_ROWS; // 16

  // ── Card dimensions (calculated on init) ─────────────────
  let CARD_W, CARD_H, GAP, OFFSET_X, OFFSET_Y;

  // ── State ─────────────────────────────────────────────────
  let cards        = [];  // { emoji, flipped, matched, flipT, col, row }
  let selected     = [];  // indices of face-up unmatched cards (max 2)
  let moves        = 0;
  let matchedPairs = 0;
  let startTime    = null;
  let elapsedSecs  = 0;
  let gameState;           // "idle" | "playing" | "locked" | "won"
  let lockTimer    = null;

  let canvas, ctx, W, H;
  let animId = null;
  let frameCount = 0;

  // ── Audio ─────────────────────────────────────────────────
  let audioCtx;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, type = "sine", dur = 0.12, vol = 0.15) {
    try {
      const ac = getAudio();
      if (ac.state === "suspended") ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur + 0.01);
    } catch (_) {}
  }

  function playFlip()  { beep(440, "sine",     0.08, 0.12); }
  function playMatch() {
    beep(660, "sine", 0.12, 0.18);
    setTimeout(() => beep(880, "sine", 0.12, 0.18), 100);
    setTimeout(() => beep(1100,"sine", 0.12, 0.15), 200);
  }
  function playMiss()  { beep(220, "sawtooth", 0.15, 0.1); }
  function playWin()  {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => beep(n, "sine", 0.2, 0.2), i * 120));
  }

  // ── Particles ─────────────────────────────────────────────
  let particles = [];

  function spawnMatchParticles(col, row) {
    const cx = OFFSET_X + col * (CARD_W + GAP) + CARD_W / 2;
    const cy = OFFSET_Y + row * (CARD_H + GAP) + CARD_H / 2;
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: Math.random() * 5 + 2,
        color: `hsl(${Math.random() * 60 + 30}, 100%, 65%)`,
      });
    }
  }

  // ── Game logic ────────────────────────────────────────────
  function buildCards() {
    const doubled = [...EMOJIS, ...EMOJIS];
    // Fisher-Yates shuffle
    for (let i = doubled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
    }
    cards = doubled.map((emoji, idx) => ({
      emoji,
      flipped : false,
      matched : false,
      flipT   : 0,      // 0 = face-down, 1 = face-up (animation progress)
      col     : idx % GRID_COLS,
      row     : Math.floor(idx / GRID_COLS),
    }));
  }

  function resetGame() {
    buildCards();
    selected     = [];
    moves        = 0;
    matchedPairs = 0;
    startTime    = null;
    elapsedSecs  = 0;
    gameState    = "playing";
    particles    = [];
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  }

  function cardIndexAt(x, y) {
    for (let i = 0; i < cards.length; i++) {
      const c  = cards[i];
      const cx = OFFSET_X + c.col * (CARD_W + GAP);
      const cy = OFFSET_Y + c.row * (CARD_H + GAP);
      if (x >= cx && x <= cx + CARD_W && y >= cy && y <= cy + CARD_H) return i;
    }
    return -1;
  }

  function onClick(e) {
    if (gameState !== "playing") {
      if (gameState === "won") { resetGame(); return; }
      return;
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    const idx = cardIndexAt(mx, my);
    if (idx < 0) return;
    const card = cards[idx];
    if (card.flipped || card.matched || selected.includes(idx)) return;
    if (selected.length >= 2) return;

    // Start timer on first click
    if (!startTime) startTime = Date.now();

    card.flipped = true;
    selected.push(idx);
    playFlip();

    if (selected.length === 2) {
      moves++;
      gameState = "locked";
      const [a, b] = selected;
      if (cards[a].emoji === cards[b].emoji) {
        // Match!
        lockTimer = setTimeout(() => {
          cards[a].matched = true;
          cards[b].matched = true;
          spawnMatchParticles(cards[a].col, cards[a].row);
          spawnMatchParticles(cards[b].col, cards[b].row);
          playMatch();
          matchedPairs++;
          selected = [];
          gameState = matchedPairs === EMOJIS.length ? "won" : "playing";
          if (gameState === "won") {
            elapsedSecs = Math.round((Date.now() - startTime) / 1000);
            playWin();
            // Save best
            const key  = "memory_best";
            const prev = JSON.parse(localStorage.getItem(key) || "null");
            const cur  = { moves, secs: elapsedSecs };
            if (!prev || moves < prev.moves || (moves === prev.moves && elapsedSecs < prev.secs)) {
              localStorage.setItem(key, JSON.stringify(cur));
            }
          }
        }, 500);
      } else {
        // No match — flip back after delay
        lockTimer = setTimeout(() => {
          cards[a].flipped = false;
          cards[b].flipped = false;
          selected = [];
          playMiss();
          gameState = "playing";
        }, 900);
      }
    }
  }

  function onTouch(e) {
    e.preventDefault();
    onClick({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
  }

  // ── Update ────────────────────────────────────────────────
  function update() {
    frameCount++;

    // Animate flip progress
    for (const c of cards) {
      const target = c.flipped ? 1 : 0;
      c.flipT += (target - c.flipT) * 0.22;
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.03; p.vy += 0.12;
      p.r *= 0.97;
      if (p.alpha <= 0) particles.splice(i, 1);
    }

    // Elapsed time
    if (startTime && gameState !== "won") {
      elapsedSecs = Math.round((Date.now() - startTime) / 1000);
    }
  }

  // ── Draw ──────────────────────────────────────────────────
  function drawCard(c) {
    const cx = OFFSET_X + c.col * (CARD_W + GAP);
    const cy = OFFSET_Y + c.row * (CARD_H + GAP);

    const flipT   = c.flipT;
    // Scale x from 1 → 0 → 1 during flip; show back if flipT < 0.5, front if >= 0.5
    const scaleX  = Math.abs(Math.cos(flipT * Math.PI));
    const showFace = flipT >= 0.5;

    ctx.save();
    ctx.translate(cx + CARD_W / 2, cy + CARD_H / 2);
    ctx.scale(Math.max(0.01, scaleX), 1);
    ctx.translate(-CARD_W / 2, -CARD_H / 2);

    if (c.matched) {
      // Matched — faint glowing card
      ctx.shadowColor = "#f9ca24";
      ctx.shadowBlur  = 12;
      const mg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      mg.addColorStop(0, "rgba(249,202,36,0.18)");
      mg.addColorStop(1, "rgba(240,147,43,0.10)");
      ctx.fillStyle = mg;
    } else if (showFace) {
      ctx.shadowColor = "#a29bfe";
      ctx.shadowBlur  = 14;
      const fg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      fg.addColorStop(0, "#1a1040");
      fg.addColorStop(1, "#0d0820");
      ctx.fillStyle = fg;
    } else {
      // Card back
      ctx.shadowColor = "rgba(162,155,254,0.4)";
      ctx.shadowBlur  = 6;
      const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      bg.addColorStop(0, "#12005e");
      bg.addColorStop(1, "#3a0080");
      ctx.fillStyle = bg;
    }

    roundRect(ctx, 0, 0, CARD_W, CARD_H, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = c.matched
      ? "rgba(249,202,36,0.6)"
      : showFace
        ? "rgba(162,155,254,0.8)"
        : "rgba(162,155,254,0.3)";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 10);
    ctx.stroke();

    if (showFace || c.matched) {
      // Emoji
      ctx.font = `${Math.floor(CARD_H * 0.42)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = c.matched ? "rgba(255,255,255,0.5)" : "#fff";
      ctx.fillText(c.emoji, CARD_W / 2, CARD_H / 2);
    } else {
      // Back pattern — question mark
      ctx.font = `bold ${Math.floor(CARD_H * 0.32)}px 'Outfit', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(162,155,254,0.4)";
      ctx.fillText("?", CARD_W / 2, CARD_H / 2);
    }

    ctx.restore();
  }

  function drawHUD() {
    // Moves
    ctx.font = "bold 13px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#a29bfe";
    ctx.shadowColor = "#a29bfe";
    ctx.shadowBlur = 10;
    ctx.fillText(`MOVES: ${moves}`, 14, 28);

    // Timer
    ctx.textAlign = "right";
    ctx.fillStyle = "#fd79a8";
    ctx.shadowColor = "#fd79a8";
    ctx.fillText(`TIME: ${elapsedSecs}s`, W - 14, 28);

    ctx.shadowBlur = 0;
  }

  function draw() {
    // Background
    ctx.fillStyle = "#08050f";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid glow
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let cc = 0; cc < GRID_COLS; cc++) {
        const gx = OFFSET_X + cc * (CARD_W + GAP);
        const gy = OFFSET_Y + r  * (CARD_H + GAP);
        ctx.fillStyle = "rgba(162,155,254,0.04)";
        roundRect(ctx, gx - 2, gy - 2, CARD_W + 4, CARD_H + 4, 12);
        ctx.fill();
      }
    }

    // Cards
    for (const c of cards) drawCard(c);

    // Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawHUD();

    // Win screen
    if (gameState === "won") {
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.fillStyle = "#f9ca24";
      ctx.shadowColor = "#f9ca24";
      ctx.shadowBlur  = 30;
      ctx.fillText("YOU WIN! 🏆", W / 2, H / 2 - 70);

      ctx.font = "11px 'Press Start 2P', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.shadowBlur = 0;
      ctx.fillText(`MOVES: ${moves}   TIME: ${elapsedSecs}s`, W / 2, H / 2 - 25);

      // Best
      const best = JSON.parse(localStorage.getItem("memory_best") || "null");
      if (best) {
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = "rgba(162,155,254,0.7)";
        ctx.fillText(`BEST: ${best.moves} moves / ${best.secs}s`, W / 2, H / 2 + 10);
      }

      // Blink
      if (Math.floor(Date.now() / 600) % 2 === 0) {
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = "#f9ca24";
        ctx.shadowColor = "#f9ca24";
        ctx.shadowBlur = 10;
        ctx.fillText("CLICK TO PLAY AGAIN", W / 2, H / 2 + 60);
        ctx.shadowBlur = 0;
      }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
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

  // ── Main loop ─────────────────────────────────────────────
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // ── Public API ────────────────────────────────────────────
  function init(canvasElOrId) {
    canvas = typeof canvasElOrId === 'string'
      ? document.getElementById(canvasElOrId)
      : canvasElOrId;
    ctx    = canvas.getContext("2d");
    W = canvas.width;
    H = canvas.height;

    // Card layout
    GAP      = 12;
    CARD_W   = Math.floor((W - GAP * (GRID_COLS + 1)) / GRID_COLS);
    CARD_H   = Math.floor((H - 50 - GAP * (GRID_ROWS + 1)) / GRID_ROWS);
    OFFSET_X = GAP;
    OFFSET_Y = 44;

    frameCount = 0;
    particles  = [];

    resetGame();

    canvas.addEventListener("click",     onClick);
    canvas.addEventListener("touchstart", onTouch, { passive: false });

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function destroy() {
    cancelAnimationFrame(animId);
    animId = null;
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    if (!canvas) return;
    canvas.removeEventListener("click",      onClick);
    canvas.removeEventListener("touchstart", onTouch);
  }

  return { init, destroy };
})();

// arcade-hub: difficulty registered
