/**
 * ============================================================
 *  WhackAMoleGame — Retro Arcade Whack-a-Mole
 *  Canvas ID : mole-canvas   Size : 420 × 500
 *  Exports   : WhackAMoleGame  (global IIFE)
 * ============================================================
 */
const WhackAMoleGame = (() => {

  // ─── Constants ───────────────────────────────────────────
  const CANVAS_W     = 420;
  const CANVAS_H     = 500;
  const GRID_COLS    = 3;
  const GRID_ROWS    = 3;
  const HOLE_COUNT   = GRID_COLS * GRID_ROWS;
  const GAME_DURATION = 60;          // seconds
  const MAX_MOLES_UP  = 3;
  const GOLDEN_CHANCE = 0.12;        // 12 % chance a new mole is golden
  const LS_KEY        = 'whackamole_best';

  // Hole layout — centred in a 420-wide canvas, top area reserved for HUD
  const HUD_H        = 80;
  const HOLE_R       = 42;           // radius of the ellipse (x-axis)
  const HOLE_RY      = 18;           // radius of the ellipse (y-axis)
  const MOLE_W       = 60;
  const MOLE_H       = 56;

  // Compute hole centres
  const COL_SPACING  = CANVAS_W / GRID_COLS;
  const ROW_SPACING  = (CANVAS_H - HUD_H - 20) / GRID_ROWS;
  const HOLES = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      HOLES.push({
        x: COL_SPACING * c + COL_SPACING / 2,
        y: HUD_H + ROW_SPACING * r + ROW_SPACING * 0.72,
      });
    }
  }

  // ─── Module State ────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;

  // Game-flow state
  let state = 'start';   // 'start' | 'playing' | 'gameover'
  let score = 0;
  let bestScore = 0;
  let timeLeft = GAME_DURATION;
  let lastTimestamp = 0;
  let tickAccum = 0;     // accumulates ms for 1-second ticks
  let spawnAccum = 0;    // accumulates ms for mole spawning
  let spawnInterval;     // current ms between spawns (decreases over time)

  // Mole data — one object per hole slot
  let moles = [];        // array[9] of mole objects
  let particles = [];    // sparkle particles

  // Tick sound management
  let lastTickSecond = -1;

  // ─── Mole Object Factory ─────────────────────────────────
  function makeMole(holeIdx, isGolden) {
    return {
      hole   : holeIdx,
      golden : isGolden,
      phase  : 'rising',   // 'rising' | 'up' | 'falling' | 'gone'
      progress: 0,         // 0-1 eased y-offset within hole
      upTimer : 0,         // ms spent fully up
      upDuration: 1200 + Math.random() * 800,  // how long stays up (ms)
      whacked : false,
      whackAnim: 0,        // 0-1 squish animation after whack
    };
  }

  // ─── Audio Helpers ───────────────────────────────────────
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playWhack() {
    try {
      const ac = getAudioCtx();
      const t  = ac.currentTime;
      // Low thud
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);

      // Crack layer
      const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ac.createBufferSource();
      const ng  = ac.createGain();
      src.buffer = buf;
