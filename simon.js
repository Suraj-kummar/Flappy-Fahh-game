// =========================================================
//  SIMON SAYS — simon.js
//  Classic memory sequence game on canvas
//  Neon retro style — Fahh Arcade
// =========================================================
"use strict";

const SimonGame = (() => {

  // ── Palette ───────────────────────────────────────────────
  const COLORS = {
    red:    { dim: '#ff6b6b', lit: '#ff2222', freq: 260, label: 'RED'    },
    blue:   { dim: '#4ecdc4', lit: '#00ffee', freq: 310, label: 'BLUE'   },
    green:  { dim: '#45b7d1', lit: '#00ddff', freq: 415, label: 'GREEN'  },
    yellow: { dim: '#f9ca24', lit: '#ffee00', freq: 500, label: 'YELLOW' },
  };
  const COLOR_KEYS = ['red', 'blue', 'green', 'yellow'];

  // ── State ─────────────────────────────────────────────────
  let canvas, ctx, W, H, animId;
  let audioCtx;

  let gameState = 'start'; // 'start' | 'showing' | 'player' | 'gameover'
  let sequence  = [];
  let playerIdx = 0;
  let round     = 0;
  let bestScore = 0;

  let litKey    = null;   // which color is currently lit
  // sequence playback
  let seqIdx         = 0;
  let seqPhase       = 'wait'; // 'on' | 'off' | 'wait'
  let seqPhaseTimer  = 0;
  const SEQ_ON_MS    = 500;
  const SEQ_OFF_MS   = 200;
  const SEQ_WAIT_MS  = 600; // pause before playback starts

  // player lit
  let playerLitKey   = null;
  let playerLitTimer = 0;
  const PLAYER_LIT_MS = 220;

  // shake on wrong
  let shakeTimer = 0;
  let shakeX     = 0;
  const SHAKE_MS = 600;

  // pulse animation for start/gameover screens
  let frameCount = 0;

  // button hit-detection rects
  let quadRects = {}; // key -> {x,y,w,h}

  // ── Audio ─────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playTone(freq, duration, vol) {
    duration = duration || 0.35;
    vol = vol || 0.22;
    try {
      const ac = getAudio();
      if (ac.state === 'suspended') ac.resume();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration + 0.02);
    } catch (_) {}
  }

  function playError() {
    try {
      const ac = getAudio();
      if (ac.state === 'suspended') ac.resume();
      [120, 100, 80].forEach(function(f, i) {
        setTimeout(function() {
          const osc  = ac.createOscillator();
          const gain = ac.createGain();
          osc.connect(gain); gain.connect(ac.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, ac.currentTime);
          gain.gain.setValueAtTime(0.18, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
          osc.start(ac.currentTime);
          osc.stop(ac.currentTime + 0.2);
        }, i * 160);
      });
    } catch (_) {}
  }

  function playSuccess() {
    try {
      const ac = getAudio();
      if (ac.state === 'suspended') ac.resume();
      [500, 620, 780].forEach(function(f, i) {
        setTimeout(function() {
          const osc  = ac.createOscillator();
          const gain = ac.createGain();
          osc.connect(gain); gain.connect(ac.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ac.currentTime);
          gain.gain.setValueAtTime(0.14, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
          osc.start(ac.currentTime);
          osc.stop(ac.currentTime + 0.18);
        }, i * 110);
      });
    } catch (_) {}
  }

  // ── Game Logic ────────────────────────────────────────────
  function startGame() {
    sequence   = [];
    playerIdx  = 0;
    round      = 0;
    shakeTimer = 0;
    shakeX     = 0;
    nextRound();
  }

  function nextRound() {
    round++;
    sequence.push(COLOR_KEYS[Math.floor(Math.random() * 4)]);
    playerIdx     = 0;
    seqIdx        = 0;
    seqPhase      = 'wait';
    seqPhaseTimer = SEQ_WAIT_MS;
    litKey        = null;
    gameState     = 'showing';
  }

  function handlePlayerClick(key) {
    if (gameState !== 'player') return;

    // light up the clicked button
    playerLitKey   = key;
    playerLitTimer = PLAYER_LIT_MS;
    playTone(COLORS[key].freq, 0.25);

    if (key !== sequence[playerIdx]) {
      // Wrong!
      gameState  = 'gameover';
      shakeTimer = SHAKE_MS;
      playError();
      if (round - 1 > bestScore) {
        bestScore = round - 1;
        try { localStorage.setItem('best_simon', bestScore); } catch (_) {}
      }
      return;
    }

    playerIdx++;
    if (playerIdx >= sequence.length) {
      // Completed round!
      playSuccess();
      gameState = 'showing'; // lock input during transition
      setTimeout(function() {
        nextRound();
      }, 900);
    }
  }

  // ── Geometry helpers ─────────────────────────────────────
  function calcGeometry() {
    W = canvas.width;
    H = canvas.height;
    const cx  = W / 2;
    const cy  = H / 2;
    const pad = 12;
    const gap = 10;
    const hw  = cx - pad - gap / 2;
    const hh  = cy - pad - gap / 2;

    quadRects = {
      red:    { x: pad,          y: pad,          w: hw, h: hh },
      blue:   { x: cx + gap / 2, y: pad,          w: hw, h: hh },
      green:  { x: pad,          y: cy + gap / 2, w: hw, h: hh },
      yellow: { x: cx + gap / 2, y: cy + gap / 2, w: hw, h: hh },
    };
  }

  // ── Draw helpers ─────────────────────────────────────────
  function roundRect(x, y, w, h, r) {
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

  function drawQuadrant(key, active) {
    const r      = quadRects[key];
    const col    = COLORS[key];
    const color  = active ? col.lit : col.dim;
    const cornerR = 16;

    ctx.save();
    ctx.globalAlpha = active ? 1.0 : 0.55;
    roundRect(r.x, r.y, r.w, r.h, cornerR);

    // Radial gradient fill
    const grd = ctx.createRadialGradient(
      r.x + r.w * 0.5, r.y + r.h * 0.5, 0,
      r.x + r.w * 0.5, r.y + r.h * 0.5, Math.max(r.w, r.h) * 0.7
    );
    if (active) {
      grd.addColorStop(0, color);
      grd.addColorStop(1, col.dim + '99');
    } else {
      grd.addColorStop(0, col.dim + 'cc');
      grd.addColorStop(1, col.dim + '33');
    }
    ctx.fillStyle = grd;
    ctx.fill();

    // Glow when active
    if (active) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 38;
      roundRect(r.x, r.y, r.w, r.h, cornerR);
      ctx.fill();
      ctx.shadowBlur  = 0;
    }

    // Border
    ctx.globalAlpha = active ? 1 : 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth   = active ? 3 : 1.5;
    roundRect(r.x, r.y, r.w, r.h, cornerR);
    ctx.stroke();

    // Label text
    ctx.globalAlpha  = active ? 1 : 0.5;
    ctx.fillStyle    = active ? '#ffffff' : color;
    ctx.font         = "bold 9px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (active) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur  = 12;
    }
    ctx.fillText(col.label, r.x + r.w / 2, r.y + r.h / 2);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function drawCenterCircle() {
    const cx     = W / 2;
    const cy     = H / 2;
    const radius = 46;

    ctx.save();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Background circle
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(1, '#0d0d1a');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    // Border ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (gameState === 'showing') {
      ctx.font        = "bold 10px 'Press Start 2P', monospace";
      ctx.fillStyle   = '#f9ca24';
      ctx.shadowColor = '#f9ca24';
      ctx.shadowBlur  = 14;
      ctx.fillText('WATCH', cx, cy - 10);
      ctx.shadowBlur  = 0;
      ctx.font        = "bold 8px 'Press Start 2P', monospace";
      ctx.fillStyle   = 'rgba(255,255,255,0.6)';
      ctx.fillText('RND ' + round, cx, cy + 10);
    } else if (gameState === 'player') {
      ctx.font        = "bold 10px 'Press Start 2P', monospace";
      ctx.fillStyle   = '#4ecdc4';
      ctx.shadowColor = '#4ecdc4';
      ctx.shadowBlur  = 14;
      ctx.fillText('YOUR', cx, cy - 14);
      ctx.fillText('TURN', cx, cy);
      ctx.shadowBlur  = 0;
      ctx.font        = "bold 8px 'Press Start 2P', monospace";
      ctx.fillStyle   = 'rgba(255,255,255,0.5)';
      ctx.fillText(playerIdx + '/' + sequence.length, cx, cy + 17);
    } else if (gameState === 'gameover') {
      const pulse     = 0.75 + 0.25 * Math.sin(frameCount * 0.08);
      ctx.font        = "bold 8px 'Press Start 2P', monospace";
      ctx.fillStyle   = 'rgba(255,107,107,' + pulse + ')';
      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur  = 18;
      ctx.fillText('GAME', cx, cy - 10);
      ctx.fillText('OVER', cx, cy + 6);
      ctx.shadowBlur  = 0;
    } else {
      // start
      const pulse     = 0.8 + 0.2 * Math.sin(frameCount * 0.05);
      ctx.font        = "bold 7px 'Press Start 2P', monospace";
      ctx.fillStyle   = 'rgba(249,202,36,' + pulse + ')';
      ctx.shadowColor = '#f9ca24';
      ctx.shadowBlur  = 14;
      ctx.fillText('SIMON', cx, cy - 8);
      ctx.fillText('SAYS', cx, cy + 8);
      ctx.shadowBlur  = 0;
    }

    ctx.restore();
  }

  function drawStartScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(13,13,26,0.82)';
    ctx.fillRect(0, 0, W, H);

    const cx    = W / 2;
    const pulse = 0.85 + 0.15 * Math.sin(frameCount * 0.04);

    ctx.font         = "bold 18px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#f9ca24';
    ctx.shadowColor  = '#f9ca24';
    ctx.shadowBlur   = 28;
    ctx.fillText('SIMON', cx, H * 0.28);
    ctx.fillText('SAYS', cx, H * 0.28 + 32);
    ctx.shadowBlur   = 0;

    ctx.font      = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Memory Sequence Game', cx, H * 0.28 + 66);

    if (bestScore > 0) {
      ctx.font        = "7px 'Press Start 2P', monospace";
      ctx.fillStyle   = '#4ecdc4';
      ctx.shadowColor = '#4ecdc4';
      ctx.shadowBlur  = 10;
      ctx.fillText('BEST: ROUND ' + bestScore, cx, H * 0.58);
      ctx.shadowBlur  = 0;
    }

    ctx.font        = "8px 'Press Start 2P', monospace";
    ctx.fillStyle   = 'rgba(255,255,255,' + pulse + ')';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillText('TAP TO START', cx, H * 0.72);
    ctx.shadowBlur  = 0;

    ctx.font      = "6px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('Click or tap the colored buttons', cx, H * 0.84);

    ctx.restore();
  }

  function drawGameOverScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(13,13,26,0.78)';
    ctx.fillRect(0, 0, W, H);

    const cx    = W / 2;
    const pulse = 0.8 + 0.2 * Math.sin(frameCount * 0.07);

    ctx.font         = "bold 14px 'Press Start 2P', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ff6b6b';
    ctx.shadowColor  = '#ff6b6b';
    ctx.shadowBlur   = 24;
    ctx.fillText('GAME OVER', cx, H * 0.28);
    ctx.shadowBlur   = 0;

    ctx.font      = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('YOU REACHED', cx, H * 0.42);

    ctx.font        = "bold 12px 'Press Start 2P', monospace";
    ctx.fillStyle   = '#f9ca24';
    ctx.shadowColor = '#f9ca24';
    ctx.shadowBlur  = 16;
    ctx.fillText('ROUND ' + round, cx, H * 0.52);
    ctx.shadowBlur  = 0;

    ctx.font        = "7px 'Press Start 2P', monospace";
    ctx.fillStyle   = '#4ecdc4';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur  = 10;
    ctx.fillText('BEST: ROUND ' + bestScore, cx, H * 0.63);
    ctx.shadowBlur  = 0;

    ctx.font        = "8px 'Press Start 2P', monospace";
    ctx.fillStyle   = 'rgba(255,255,255,' + pulse + ')';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillText('TAP TO PLAY AGAIN', cx, H * 0.78);
    ctx.shadowBlur  = 0;

    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    const vgrd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.72);
    vgrd.addColorStop(0, 'rgba(255,255,255,0)');
    vgrd.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vgrd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Main draw ─────────────────────────────────────────────
  function draw() {
    ctx.save();

    if (shakeTimer > 0) {
      const intensity = (shakeTimer / SHAKE_MS) * 10;
      shakeX = (Math.random() - 0.5) * intensity;
      ctx.translate(shakeX, 0);
    }

    drawBackground();

    const showingActive = (gameState === 'showing' && litKey !== null);
    const playerActive  = (playerLitKey !== null);

    COLOR_KEYS.forEach(function(key) {
      const isLit = (showingActive && litKey === key) ||
                    (playerActive  && playerLitKey === key);
      drawQuadrant(key, isLit);
    });

    drawCenterCircle();
    ctx.restore();

    // Overlay screens rendered without shake
    if (gameState === 'start') {
      drawStartScreen();
    } else if (gameState === 'gameover') {
      drawGameOverScreen();
    }
  }

  // ── Game loop ─────────────────────────────────────────────
  let lastTime = 0;

  function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime  = timestamp;
    frameCount++;

    // Sequence playback
    if (gameState === 'showing') {
      seqPhaseTimer -= dt;

      if (seqPhase === 'wait') {
        litKey = null;
        if (seqPhaseTimer <= 0) {
          seqPhase      = 'on';
          seqPhaseTimer = SEQ_ON_MS;
          litKey = sequence[seqIdx];
          playTone(COLORS[litKey].freq, SEQ_ON_MS / 1000 * 0.85);
        }
      } else if (seqPhase === 'on') {
        if (seqPhaseTimer <= 0) {
          litKey        = null;
          seqPhase      = 'off';
          seqPhaseTimer = SEQ_OFF_MS;
          seqIdx++;
        }
      } else if (seqPhase === 'off') {
        if (seqPhaseTimer <= 0) {
          if (seqIdx >= sequence.length) {
            gameState = 'player';
            playerIdx = 0;
          } else {
            seqPhase      = 'on';
            seqPhaseTimer = SEQ_ON_MS;
            litKey = sequence[seqIdx];
            playTone(COLORS[litKey].freq, SEQ_ON_MS / 1000 * 0.85);
          }
        }
      }
    }

    // Player lit decay
    if (playerLitTimer > 0) {
      playerLitTimer -= dt;
      if (playerLitTimer <= 0) {
        playerLitTimer = 0;
        playerLitKey   = null;
      }
    }

    // Shake decay
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      if (shakeTimer <= 0) {
        shakeTimer = 0;
        shakeX     = 0;
      }
    }

    draw();
    animId = requestAnimationFrame(loop);
  }

  // ── Input handling ────────────────────────────────────────
  function getCanvasPos(e) {
    const rect  = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const src   = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  }

  function hitQuadrant(px, py) {
    for (let i = 0; i < COLOR_KEYS.length; i++) {
      const key = COLOR_KEYS[i];
      const r   = quadRects[key];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
        return key;
      }
    }
    return null;
  }

  function onPointerDown(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);

    if (gameState === 'start') {
      startGame();
      return;
    }
    if (gameState === 'gameover') {
      gameState = 'start';
      return;
    }
    if (gameState === 'player') {
      const key = hitQuadrant(pos.x, pos.y);
      if (key) handlePlayerClick(key);
    }
  }

  // Bound references for cleanup
  let boundPointerDown;

  // ── Public API ────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('SimonGame: canvas not found:', canvasId); return; }
    ctx = canvas.getContext('2d');
    W   = canvas.width;
    H   = canvas.height;

    try { bestScore = parseInt(localStorage.getItem('best_simon') || '0', 10) || 0; } catch (_) {}

    calcGeometry();

    gameState      = 'start';
    sequence       = [];
    round          = 0;
    playerIdx      = 0;
    litKey         = null;
    playerLitKey   = null;
    playerLitTimer = 0;
    shakeTimer     = 0;
    shakeX         = 0;
    frameCount     = 0;
    seqIdx         = 0;
    seqPhase       = 'wait';
    seqPhaseTimer  = 0;

    boundPointerDown = onPointerDown.bind(this);
    canvas.addEventListener('mousedown',  boundPointerDown);
    canvas.addEventListener('touchstart', boundPointerDown, { passive: false });

    lastTime = performance.now();
    animId   = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas) {
      canvas.removeEventListener('mousedown',  boundPointerDown);
      canvas.removeEventListener('touchstart', boundPointerDown);
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (_) {}
      audioCtx = null;
    }
    canvas = null;
    ctx    = null;
  }

  return { init, destroy };
})();

// arcade-hub: audio tones registered
