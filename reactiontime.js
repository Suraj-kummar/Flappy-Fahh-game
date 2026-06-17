// =========================================================
//  REACTION TIME — reactiontime.js
//  Fahh Arcade — Neon reaction speed test, 5 rounds
// =========================================================
"use strict";

const ReactionTimeGame = (() => {

  // ── Canvas / context ────────────────────────────────────
  let canvas, ctx, W, H, animId;

  // ── Game phases ─────────────────────────────────────────
  // 'start' | 'wait' | 'go' | 'result' | 'tooEarly' | 'summary'
  let phase = 'start';

  // ── Round state ──────────────────────────────────────────
  const TOTAL_ROUNDS  = 5;
  let   currentRound  = 0;       // 0-indexed, 0..4
  let   roundTimes    = [];      // ms for each completed round
  let   goStartTime   = 0;       // timestamp when GO phase began
  let   reactionMs    = 0;       // last measured reaction (ms)
  let   waitTimer     = null;    // setTimeout handle for WAIT->GO transition
  let   tooEarlyTimer = null;    // setTimeout for penalty display

  // ── Circle animation ─────────────────────────────────────
  let   circleColor   = '#1a1a2e';
  let   glowAlpha     = 0;       // 0..1  for neon glow pulse
  let   frameCount    = 0;

  // ── Colors ───────────────────────────────────────────────
  const COL_BG        = '#0d0d1a';
  const COL_WAIT      = '#1a1a2e';   // dim circle
  const COL_WAIT_RIM  = '#2a2a4e';
  const COL_GO        = '#4ecca3';   // neon green
  const COL_GO_DIM    = '#1d7a5f';
  const COL_EARLY     = '#ff6b6b';   // red
  const COL_EARLY_DIM = '#7a1d1d';
  const COL_SUMMARY   = '#f9ca24';   // gold
  const COL_TEXT      = '#e0e0ff';
  const COL_DIM       = '#4a4a7a';

  // ── Audio ─────────────────────────────────────────────────
  let audioCtx;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function beep(freq, type, dur, vol, delay) {
    type  = type  || 'sine';
    dur   = dur   || 0.12;
    vol   = vol   || 0.18;
    delay = delay || 0;
    try {
      const ac = getAudio();
      if (ac.state === 'suspended') ac.resume();
      const t   = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.01);
    } catch (_) {}
  }

  function sfxReady()     { beep(220, 'sine', 0.18, 0.10); }
  function sfxGo() {
    beep(523, 'sine', 0.10, 0.20, 0);
    beep(659, 'sine', 0.10, 0.20, 0.08);
    beep(784, 'sine', 0.12, 0.18, 0.16);
  }
  function sfxClick()     { beep(880, 'sine', 0.08, 0.15); }
  function sfxTooEarly()  { beep(160, 'sawtooth', 0.25, 0.20); }
  function sfxResult(ms) {
    var freq = Math.max(200, Math.min(1400, 2000 - ms * 3));
    beep(freq, 'sine', 0.18, 0.18);
  }
  function sfxSummary() {
    var notes = [523, 659, 784, 1047];
    notes.forEach(function(n, i) { setTimeout(function() { beep(n, 'sine', 0.15, 0.18); }, i * 100); });
  }

  // ── localStorage best ────────────────────────────────────
  function getBest() {
    var v = parseFloat(localStorage.getItem('best_reaction'));
    return isNaN(v) ? null : v;
  }
  function saveBest(avg) {
    var cur = getBest();
    if (cur === null || avg < cur) {
      localStorage.setItem('best_reaction', avg.toFixed(1));
      return true;
    }
    return false;
  }
  var newRecord = false;

  // ── Rating ───────────────────────────────────────────────
  function getRating(ms) {
    if (ms < 150) return { label: 'SUPERHUMAN', color: '#ff00ff' };
    if (ms < 200) return { label: 'ELITE',      color: '#4ecca3' };
    if (ms < 250) return { label: 'PRO',         color: '#00d4ff' };
    if (ms < 350) return { label: 'AVERAGE',     color: '#f9ca24' };
    return               { label: 'SLOW',        color: '#ff6b6b' };
  }

  // ── Bar graph config ──────────────────────────────────────
  const BAR_MAX_MS = 800;

  // ── Smooth color interpolation ────────────────────────────
  function hexToRgb(c) {
    return {
      r: parseInt(c.slice(1,3), 16),
      g: parseInt(c.slice(3,5), 16),
      b: parseInt(c.slice(5,7), 16)
    };
  }
  function lerpColor(c1, c2, t) {
    var a = hexToRgb(c1), b = hexToRgb(c2);
    var clamp = function(v) { return Math.max(0, Math.min(255, Math.round(v))); };
    var ri = clamp(a.r + (b.r - a.r) * t);
    var gi = clamp(a.g + (b.g - a.g) * t);
    var bi = clamp(a.b + (b.b - a.b) * t);
    return '#' + ri.toString(16).padStart(2,'0')
               + gi.toString(16).padStart(2,'0')
               + bi.toString(16).padStart(2,'0');
  }

  // ── Color transition state ────────────────────────────────
  var transT    = 1;
  var transFrom = COL_WAIT;
  var transTo   = COL_WAIT;
  var TRANS_SPEED = 0.07;

  function startColorTransition(toColor) {
    transFrom = circleColor;
    transTo   = toColor;
    transT    = 0;
  }

  // ── Phase management ─────────────────────────────────────
  function goToStart() {
    phase        = 'start';
    currentRound = 0;
    roundTimes   = [];
    newRecord    = false;
    startColorTransition(COL_WAIT);
  }

  function beginWait() {
    phase = 'wait';
    startColorTransition(COL_WAIT);
    sfxReady();
    var delay = 1000 + Math.random() * 4000;
    waitTimer = setTimeout(function() {
      waitTimer = null;
      beginGo();
    }, delay);
  }

  function beginGo() {
    phase       = 'go';
    goStartTime = performance.now();
    startColorTransition(COL_GO);
    sfxGo();
  }

  function beginTooEarly() {
    phase = 'tooEarly';
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }
    startColorTransition(COL_EARLY);
    sfxTooEarly();
    tooEarlyTimer = setTimeout(function() {
      tooEarlyTimer = null;
      beginWait();
    }, 2000);
  }

  function recordResult() {
    var ms = Math.round(performance.now() - goStartTime);
    reactionMs = ms;
    roundTimes.push(ms);
    phase = 'result';
    startColorTransition(COL_WAIT);
    sfxResult(ms);
  }

  function nextRound() {
    currentRound++;
    if (currentRound >= TOTAL_ROUNDS) {
      showSummary();
    } else {
      beginWait();
    }
  }

  function showSummary() {
    phase = 'summary';
    startColorTransition(COL_SUMMARY);
    var sum = 0;
    for (var i = 0; i < roundTimes.length; i++) sum += roundTimes[i];
    var avg = sum / roundTimes.length;
    newRecord = saveBest(avg);
    sfxSummary();
  }

  // ── Click / key handler ───────────────────────────────────
  function handleInteract() {
    if (phase === 'start') {
      currentRound = 0;
      roundTimes   = [];
      newRecord    = false;
      beginWait();
    } else if (phase === 'wait') {
      beginTooEarly();
    } else if (phase === 'go') {
      sfxClick();
      recordResult();
    } else if (phase === 'result') {
      nextRound();
    } else if (phase === 'summary') {
      goToStart();
    }
    // tooEarly: ignore
  }

  // ── Draw helpers ──────────────────────────────────────────
  function drawText(text, x, y, size, color, align) {
    align = align || 'center';
    ctx.font         = size + "px 'Press Start 2P', monospace";
    ctx.fillStyle    = color;
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  // ── Circle ────────────────────────────────────────────────
  var CIRCLE_R = 108;

  function drawCircle() {
    var cx = W / 2;
    var cy = H / 2 - 18;

    // Advance color transition
    if (transT < 1) {
      transT = Math.min(1, transT + TRANS_SPEED);
      circleColor = lerpColor(transFrom, transTo, transT);
    }

    // Glow pulse
    if (phase === 'go') {
      glowAlpha = 0.6 + 0.4 * Math.sin(frameCount * 0.12);
    } else if (phase === 'tooEarly') {
      glowAlpha = 0.5 + 0.5 * Math.abs(Math.sin(frameCount * 0.18));
    } else {
      glowAlpha = Math.max(0, glowAlpha - 0.04);
    }

    ctx.save();

    if (glowAlpha > 0.02) {
      ctx.shadowBlur  = 55 * glowAlpha;
      ctx.shadowColor = circleColor;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
    ctx.fillStyle = circleColor;
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.strokeStyle = lerpColor(circleColor, '#ffffff', 0.22);
    ctx.lineWidth   = 4;
    ctx.stroke();

    // Gloss highlight
    var grad = ctx.createRadialGradient(cx - 28, cy - 32, 8, cx, cy, CIRCLE_R);
    grad.addColorStop(0, 'rgba(255,255,255,0.16)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  // ── Round bar graph ───────────────────────────────────────
  function drawRoundBars() {
    var barH   = 13;
    var barGap = 7;
    var maxW   = W * 0.68;
    var sx     = (W - maxW) / 2;
    var sy     = H - 16 - (TOTAL_ROUNDS * (barH + barGap));

    ctx.save();
    ctx.font         = "7px 'Press Start 2P', monospace";
    ctx.textBaseline = 'middle';

    for (var i = 0; i < TOTAL_ROUNDS; i++) {
      var y  = sy + i * (barH + barGap);
      var ms = roundTimes[i];

      // Track
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(sx, y, maxW, barH, 4);
      ctx.fill();

      if (ms !== undefined) {
        var ratio = Math.min(1, ms / BAR_MAX_MS);
        var barW  = ratio * maxW;
        var rc    = getRating(ms).color;

        ctx.shadowBlur  = 8;
        ctx.shadowColor = rc;
        ctx.fillStyle   = rc;
        ctx.beginPath();
        ctx.roundRect(sx, y, Math.max(barW, 6), barH, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = COL_TEXT;
        ctx.textAlign = 'left';
        ctx.fillText('R' + (i+1) + ': ' + ms + 'ms', sx + Math.max(barW, 6) + 6, y + barH / 2);
      } else {
        ctx.fillStyle = COL_DIM;
        ctx.textAlign = 'left';
        ctx.fillText('R' + (i+1), sx + 6, y + barH / 2);
      }
    }
    ctx.restore();
  }

  // ── Screen renderers ──────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRoundBadge(color) {
    drawText('ROUND ' + (currentRound + 1) + ' / ' + TOTAL_ROUNDS, W/2, 26, 8, color || COL_DIM);
  }

  function drawCTA(text) {
    var pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.07);
    drawText(text, W/2, H - 28, 7, 'rgba(255,255,255,' + (0.4 + 0.6*pulse) + ')');
  }

  function drawStartScreen() {
    drawBg();
    drawCircle();

    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = '#4ecca3';
    drawText('REACTION', W/2, H/2 - 78, 17, '#4ecca3');
    drawText('TIME',     W/2, H/2 - 55, 17, '#4ecca3');
    ctx.restore();

    drawText('Test your reflexes', W/2, H/2 + 82, 7, COL_DIM);
    drawText(TOTAL_ROUNDS + ' rounds per session', W/2, H/2 + 101, 7, COL_DIM);

    var best = getBest();
    if (best !== null) {
      var rc = getRating(Math.round(best)).color;
      drawText('BEST AVG: ' + best + 'ms', W/2, H/2 + 122, 7, rc);
    }

    drawCTA('CLICK OR SPACE TO START');
  }

  function drawWaitScreen() {
    drawBg();
    drawCircle();
    drawRoundBadge();

    var dots = '';
    var d = (Math.floor(frameCount / 18) % 3) + 1;
    for (var i = 0; i < d; i++) dots += '.';

    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = COL_DIM;
    drawText('Get Ready' + dots, W/2, H/2 - 148, 9, COL_DIM);
    ctx.restore();

    drawText('Wait for GREEN', W/2, H/2 + 148, 7, COL_DIM);
    drawRoundBars();
  }

  function drawGoScreen() {
    drawBg();
    drawCircle();
    drawRoundBadge(COL_GO_DIM);

    ctx.save();
    ctx.shadowBlur  = 40;
    ctx.shadowColor = COL_GO;
    drawText('CLICK!', W/2, H/2 - 148, 14, COL_GO);
    ctx.restore();

    var elapsed = Math.round(performance.now() - goStartTime);
    drawText(elapsed + 'ms', W/2, H/2 + 150, 8, 'rgba(78,204,163,0.5)');
    drawRoundBars();
  }

  function drawTooEarlyScreen() {
    drawBg();
    drawCircle();
    drawRoundBadge(COL_EARLY);

    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = COL_EARLY;
    drawText('TOO EARLY!', W/2, H/2 - 148, 11, COL_EARLY);
    ctx.restore();

    drawText('Wait for green...', W/2, H/2 + 148, 7, COL_EARLY);

    var pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.10);
    drawText('Round restarting', W/2, H/2 + 165, 7, 'rgba(255,107,107,' + (0.4 + 0.6*pulse) + ')');

    drawRoundBars();
  }

  function drawResultScreen() {
    drawBg();
    drawCircle();
    drawRoundBadge();

    var rating = getRating(reactionMs);
    var color  = rating.color;
    var label  = rating.label;

    ctx.save();
    ctx.shadowBlur  = 28;
    ctx.shadowColor = color;
    drawText(reactionMs + 'ms', W/2, H/2 - 158, 17, color);
    ctx.restore();

    ctx.save();
    ctx.shadowBlur  = 15;
    ctx.shadowColor = color;
    drawText(label, W/2, H/2 - 133, 9, color);
    ctx.restore();

    var nextLabel = (currentRound + 1 >= TOTAL_ROUNDS) ? 'SEE RESULTS' : 'NEXT ROUND';
    drawCTA('CLICK FOR ' + nextLabel);
    drawRoundBars();
  }

  function drawSummaryScreen() {
    drawBg();
    drawCircle();

    var sum = 0;
    for (var i = 0; i < roundTimes.length; i++) sum += roundTimes[i];
    var avg    = sum / roundTimes.length;
    var rating = getRating(Math.round(avg));
    var color  = rating.color;
    var label  = rating.label;
    var best   = getBest();

    ctx.save();
    ctx.shadowBlur  = 20;
    ctx.shadowColor = COL_SUMMARY;
    drawText('COMPLETE!', W/2, 26, 9, COL_SUMMARY);
    ctx.restore();

    ctx.save();
    ctx.shadowBlur  = 28;
    ctx.shadowColor = color;
    drawText('AVG: ' + avg.toFixed(1) + 'ms', W/2, H/2 - 158, 14, color);
    ctx.restore();

    ctx.save();
    ctx.shadowBlur  = 15;
    ctx.shadowColor = color;
    drawText(label, W/2, H/2 - 134, 9, color);
    ctx.restore();

    if (newRecord) {
      var pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.1);
      ctx.save();
      ctx.shadowBlur  = 22;
      ctx.shadowColor = '#ff00ff';
      drawText('NEW BEST!', W/2, H/2 + 140, 9, 'rgba(255,0,255,' + (0.65 + 0.35*pulse) + ')');
      ctx.restore();
    } else if (best !== null) {
      drawText('BEST AVG: ' + best + 'ms', W/2, H/2 + 140, 7, COL_DIM);
    }

    drawCTA('CLICK TO PLAY AGAIN');
    drawRoundBars();
  }

  // ── Game loop ─────────────────────────────────────────────
  function loop() {
    animId = requestAnimationFrame(loop);
    frameCount++;

    if      (phase === 'start')    drawStartScreen();
    else if (phase === 'wait')     drawWaitScreen();
    else if (phase === 'go')       drawGoScreen();
    else if (phase === 'tooEarly') drawTooEarlyScreen();
    else if (phase === 'result')   drawResultScreen();
    else if (phase === 'summary')  drawSummaryScreen();
  }

  // ── Bound handler refs (for removal) ─────────────────────
  var boundClick;
  var boundKeydown;

  // ── Public API ────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('ReactionTimeGame: canvas #' + canvasId + ' not found');
      return;
    }
    ctx = canvas.getContext('2d');
    W   = canvas.width;
    H   = canvas.height;

    // Reset state
    phase         = 'start';
    currentRound  = 0;
    roundTimes    = [];
    reactionMs    = 0;
    glowAlpha     = 0;
    frameCount    = 0;
    newRecord     = false;
    circleColor   = COL_WAIT;
    transT        = 1;
    transFrom     = COL_WAIT;
    transTo       = COL_WAIT;
    waitTimer     = null;
    tooEarlyTimer = null;

    boundClick   = function(e) {
      // touchstart fires immediately (no 300ms delay unlike click on mobile)
      if (e.type === 'touchstart') e.preventDefault();
      handleInteract();
    };
    boundKeydown = function(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleInteract();
      }
    };

    canvas.addEventListener('click',      boundClick);
    canvas.addEventListener('touchstart', boundClick, { passive: false }); // accurate timing
    window.addEventListener('keydown', boundKeydown);

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function destroy() {
    if (animId)        { cancelAnimationFrame(animId);     animId        = null; }
    if (waitTimer)     { clearTimeout(waitTimer);          waitTimer     = null; }
    if (tooEarlyTimer) { clearTimeout(tooEarlyTimer);      tooEarlyTimer = null; }

    if (canvas && boundClick) {
      canvas.removeEventListener('click',      boundClick);
      canvas.removeEventListener('touchstart', boundClick);
    }
    if (boundKeydown) window.removeEventListener('keydown', boundKeydown);

    if (audioCtx) {
      try { audioCtx.close(); } catch(_) {}
      audioCtx = null;
    }

    canvas       = null;
    ctx          = null;
    boundClick   = null;
    boundKeydown = null;
  }

  return { init: init, destroy: destroy };
})();

// arcade-hub: leaderboard registered
