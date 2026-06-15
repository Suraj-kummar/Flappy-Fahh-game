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
