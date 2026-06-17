// ============================================================
//  TypingSpeedGame — Type Rush for Fahh Arcade
//  Canvas: typing-canvas (560 x 400)
//  Global: TypingSpeedGame
// ============================================================
const TypingSpeedGame = (() => {

  // ── Word List (100 common English words) ───────────────────
  const WORDS = [
    'the','be','to','of','and','a','in','that','have','it',
    'for','not','on','with','he','as','you','do','at','this',
    'but','his','by','from','they','we','say','her','she','or',
    'an','will','my','one','all','would','there','their','what',
    'so','up','out','if','about','who','get','which','go','me',
    'when','make','can','like','time','no','just','him','know',
    'take','people','into','year','your','good','some','could',
    'them','see','other','than','then','now','look','only','come',
    'its','over','think','also','back','after','use','two','how',
    'our','work','first','well','way','even','new','want','because',
    'any','these','give','day','most','us','great','between','need',
    'large','often','hand','high','place','hold','real','life','few',
  ];

  // ── Dimensions ─────────────────────────────────────────────
  const W = 560, H = 400;
  const GAME_DURATION = 60; // seconds

  // ── Neon Palette ───────────────────────────────────────────
  const CLR = {
    bg         : '#0d0d1a',
    bgPanel    : 'rgba(255,255,255,0.04)',
    border     : 'rgba(78,204,163,0.25)',
    text       : '#ffffff',
    accent     : '#4ecca3',      // neon green — correct chars
    wrong      : '#ff6b6b',      // red — wrong chars
    dim        : '#44445a',
    gold       : '#f9ca24',
    purple     : '#a29bfe',
    wordGlow   : '#4ecca3',
    timerWarn  : '#ff6b6b',
    cursor     : '#4ecca3',
    inputBg    : 'rgba(78,204,163,0.07)',
    hintText   : '#888899',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;

  // Game state machine: 'start' | 'playing' | 'results'
  let gameState = 'start';

  // Playing state
  let currentWord = '';
  let typedInput  = '';
  let score       = 0;          // words correctly completed
  let wrongAttempts = 0;        // wrong-completion attempts
  let totalAttempts = 0;        // total word completion attempts
  let timeLeft    = GAME_DURATION;
  let startTime   = 0;          // performance.now() at game start
  let lastTs      = 0;
  let flashRed    = 0;          // countdown ms for red-flash overlay
  let wordPool    = [];         // shuffled copy of WORDS
  let wordIndex   = 0;
  let cursorOn    = true;
  let cursorTimer = 0;

  // Results state
  let finalWPM    = 0;
  let finalWords  = 0;
  let finalAcc    = 0;

  // Best score
  let bestWPM     = 0;

  // Bound event handlers (for clean removal)
  let boundKeyDown, boundClick, boundTouch;

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playSuccess() {
    try {
      const ac = getAudio();
      [523, 659, 784].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = ac.currentTime + i * 0.055;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t); osc.stop(t + 0.11);
      });
    } catch (e) {}
  }

  function playError() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ac.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
      osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.2);
    } catch (e) {}
  }

  function playEndGame() {
    try {
      const ac = getAudio();
      [330, 262, 220].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        const t = ac.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.2);
      });
    } catch (e) {}
  }

  // ── Word Pool ──────────────────────────────────────────────
  function buildPool() {
    // Fisher-Yates shuffle
    wordPool = [...WORDS];
    for (let i = wordPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordPool[i], wordPool[j]] = [wordPool[j], wordPool[i]];
    }
    wordIndex = 0;
  }

  function nextWord() {
    if (wordIndex >= wordPool.length) buildPool(); // re-shuffle when exhausted
    currentWord = wordPool[wordIndex++];
  }

  // ── localStorage ───────────────────────────────────────────
  function loadBest() {
    bestWPM = parseFloat(localStorage.getItem('best_typing') || '0');
  }

  function saveBest() {
    if (finalWPM > bestWPM) {
      bestWPM = finalWPM;
      localStorage.setItem('best_typing', bestWPM.toFixed(1));
    }
  }

  // ── Game Lifecycle ─────────────────────────────────────────
  function startGame() {
    score         = 0;
    wrongAttempts = 0;
    totalAttempts = 0;
    typedInput    = '';
    timeLeft      = GAME_DURATION;
    flashRed      = 0;
    startTime     = performance.now();
    lastTs        = startTime;
    cursorOn      = true;
    cursorTimer   = 0;
    buildPool();
    nextWord();
    gameState = 'playing';
  }

  function endGame() {
    const elapsed = Math.max(1, GAME_DURATION - timeLeft);
    finalWPM   = parseFloat((score / (elapsed / 60)).toFixed(1));
    finalWords = score;
    totalAttempts = score + wrongAttempts;
    finalAcc   = totalAttempts > 0
      ? Math.round((score / totalAttempts) * 100)
      : 100;
    saveBest();
    playEndGame();
    gameState = 'results';
  }

  // ── WPM Calculation (live) ─────────────────────────────────
  function liveWPM() {
    const elapsed = (performance.now() - startTime) / 1000 / 60; // minutes
    if (elapsed < 0.001 || score === 0) return 0;
    return parseFloat((score / elapsed).toFixed(1));
  }

  // ── Key Handling ───────────────────────────────────────────
  function onKeyDown(e) {
    // Start / restart on start or results screens
    if (gameState === 'start' || gameState === 'results') {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (gameState !== 'playing') return;

    // Ignore modifier-only keys and function keys
    if (e.key.startsWith('F') && e.key.length > 1) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    e.preventDefault(); // prevent page scroll on space, etc.

    if (e.key === 'Backspace') {
      if (typedInput.length > 0) {
        typedInput = typedInput.slice(0, -1);
      }
      return;
    }

    // Accept printable single characters
    if (e.key.length !== 1) return;

    typedInput += e.key;

    // Check completion: typed as many chars as the word
    if (typedInput.length >= currentWord.length) {
      totalAttempts++;
      if (typedInput === currentWord) {
        // Correct!
        score++;
        typedInput = '';
        playSuccess();
        nextWord();
      } else {
        // Wrong
        wrongAttempts++;
        flashRed = 350; // ms
        typedInput = '';
        playError();
        // same word remains
      }
    }
  }

  // ── Drawing Helpers ────────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);
  }

  function glowText(text, x, y, color, blur, font, align) {
    ctx.save();
    ctx.font        = font;
    ctx.textAlign   = align || 'center';
    ctx.shadowBlur  = blur;
    ctx.shadowColor = color;
    ctx.fillStyle   = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawRoundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    // Cross-browser rounded rect (Safari < 15.4 / older Chrome don't have ctx.roundRect)
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
      ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
      ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
      ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
      ctx.closePath();
    }
    if (fill)   { ctx.fillStyle   = fill;   ctx.fill();   }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  // ── Start Screen ───────────────────────────────────────────
  function drawStartScreen() {
    drawBg();

    // Decorative grid lines
    ctx.strokeStyle = 'rgba(78,204,163,0.06)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Title
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = "bold 38px 'Press Start 2P', monospace";
    ctx.shadowBlur  = 40;
    ctx.shadowColor = CLR.accent;
    ctx.fillStyle   = CLR.accent;
    ctx.fillText('TYPE RUSH', W / 2, 120);
    ctx.restore();

    // Subtitle
    glowText('FAHH ARCADE', W / 2, 158, CLR.gold, 18, "bold 11px 'Press Start 2P', monospace");

    // Panel
    drawRoundRect(80, 185, W - 160, 120, 10, CLR.bgPanel, CLR.border);

    // Best WPM
    ctx.textAlign = 'center';
    if (bestWPM > 0) {
      ctx.fillStyle = CLR.dim;
      ctx.font      = "10px 'Press Start 2P', monospace";
      ctx.fillText('BEST', W / 2, 218);
      glowText(bestWPM.toFixed(1) + ' WPM', W / 2, 248, CLR.gold, 20, "bold 22px 'Press Start 2P', monospace");
    } else {
      ctx.fillStyle = CLR.dim;
      ctx.font      = "10px 'Press Start 2P', monospace";
      ctx.fillText('NO RECORD YET', W / 2, 240);
    }

    ctx.fillStyle = CLR.hintText;
    ctx.font      = "9px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('TYPE the word shown — 60 seconds', W / 2, 278);

    // Blinking prompt
    if (cursorOn) {
      glowText('PRESS ENTER TO START', W / 2, 340, CLR.accent, 22, "bold 10px 'Press Start 2P', monospace");
    }
  }

  // ── Playing Screen ─────────────────────────────────────────
  function drawPlayingScreen() {
    drawBg();

    const cx = W / 2;

    // ── HUD bar ──────────────────────────────────────────────
    // Timer
    const timerColor = timeLeft <= 10 ? CLR.wrong : CLR.accent;
    glowText(timeLeft + 's', 48, 36, timerColor, timeLeft <= 10 ? 24 : 10,
      "bold 18px 'Press Start 2P', monospace", 'center');

    // Live WPM
    const wpm = liveWPM();
    ctx.fillStyle = CLR.purple;
    ctx.font      = "9px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('WPM', cx, 24);
    glowText(wpm.toFixed(0), cx, 46, CLR.purple, 16,
      "bold 22px 'Press Start 2P', monospace");

    // Score (words done)
    ctx.fillStyle = CLR.hintText;
    ctx.font      = "9px 'Press Start 2P', monospace";
    ctx.textAlign = 'right';
    ctx.fillText('WORDS', W - 20, 24);
    ctx.fillStyle = CLR.text;
    ctx.font      = "bold 18px 'Press Start 2P', monospace";
    ctx.fillText(score, W - 20, 46);

    // Divider line
    ctx.strokeStyle = CLR.border;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(20, 60); ctx.lineTo(W - 20, 60); ctx.stroke();

    // Timer progress bar
    const barW   = W - 40;
    const barPct = timeLeft / GAME_DURATION;
    drawRoundRect(20, 64, barW, 6, 3, 'rgba(255,255,255,0.07)');
    const barColor = timeLeft <= 10 ? CLR.wrong : CLR.accent;
    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = barColor;
    ctx.fillStyle   = barColor;
    ctx.beginPath();
    ctx.roundRect(20, 64, barW * barPct, 6, 3);
    ctx.fill();
    ctx.restore();

    // ── Word display area ─────────────────────────────────────
    const wordY   = 170;
    const wordSz  = currentWord.length > 10 ? 26 : currentWord.length > 7 ? 30 : 36;
    const wordFont = `bold ${wordSz}px 'Press Start 2P', monospace`;

    // Subtle panel behind word
    drawRoundRect(40, wordY - 52, W - 80, 80, 12, CLR.bgPanel, CLR.border);

    // Draw word letter by letter
    ctx.save();
    ctx.font      = wordFont;
    ctx.textAlign = 'left';

    // Measure total width to center manually
    const letterWidths = [];
    let totalWordW = 0;
    for (let i = 0; i < currentWord.length; i++) {
      const lw = ctx.measureText(currentWord[i]).width;
      letterWidths.push(lw);
      totalWordW += lw;
    }
    const letterSpacing = currentWord.length > 1 ? 6 : 0;
    totalWordW += letterSpacing * (currentWord.length - 1);
    let lx = cx - totalWordW / 2;

    for (let i = 0; i < currentWord.length; i++) {
      const ch    = currentWord[i];
      const typed = typedInput[i];
      let color, blur;

      if (typed === undefined) {
        // Not yet typed — dim white
        color = 'rgba(255,255,255,0.45)';
        blur  = 0;
      } else if (typed === ch) {
        // Correct
        color = CLR.accent;
        blur  = 14;
      } else {
        // Wrong character at this position
        color = CLR.wrong;
        blur  = 14;
      }

      ctx.shadowBlur  = blur;
      ctx.shadowColor = color;
      ctx.fillStyle   = color;
      ctx.fillText(ch, lx, wordY);
      lx += letterWidths[i] + letterSpacing;
    }
    ctx.restore();

    // ── Input display area ────────────────────────────────────
    const inputY  = 265;
    const inputH  = 54;
    const inputX  = 40;
    const inputW  = W - 80;

    // Input panel
    const inputBorderColor = flashRed > 0
      ? `rgba(255,107,107,${Math.min(1, flashRed / 150)})`
      : CLR.border;
    drawRoundRect(inputX, inputY - 36, inputW, inputH, 10, CLR.inputBg, inputBorderColor);

    // Typed characters with correct/wrong coloring
    if (typedInput.length > 0 || cursorOn) {
      ctx.save();
      const inputFont = "bold 22px 'Press Start 2P', monospace";
      ctx.font = inputFont;
      ctx.textAlign = 'left';

      // Measure typed string to center it
      const typedLetterW = [];
      let totalTypedW = 0;
      for (let i = 0; i < typedInput.length; i++) {
        const lw = ctx.measureText(typedInput[i]).width;
        typedLetterW.push(lw);
        totalTypedW += lw;
      }
      const tSpacing = 5;
      totalTypedW += tSpacing * Math.max(0, typedInput.length - 1);

      // Cursor width
      const cursorW = 3;
      const fullW   = totalTypedW + (cursorOn ? cursorW + 4 : 0);
      let tx = cx - fullW / 2;

      for (let i = 0; i < typedInput.length; i++) {
        const ch    = typedInput[i];
        const match = ch === currentWord[i];
        const color = match ? CLR.accent : CLR.wrong;
        ctx.shadowBlur  = match ? 12 : 8;
        ctx.shadowColor = color;
        ctx.fillStyle   = color;
        ctx.fillText(ch, tx, inputY);
        tx += typedLetterW[i] + tSpacing;
      }

      // Blinking cursor
      if (cursorOn) {
        ctx.fillStyle   = CLR.cursor;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = CLR.cursor;
        ctx.fillRect(tx + 2, inputY - 20, cursorW, 24);
      }
      ctx.restore();
    } else {
      // Placeholder hint
      ctx.fillStyle = CLR.dim;
      ctx.font      = "10px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('start typing...', cx, inputY - 8);
    }

    // ── Flash red overlay ─────────────────────────────────────
    if (flashRed > 0) {
      const alpha = Math.min(0.18, (flashRed / 350) * 0.18);
      ctx.fillStyle = `rgba(255,107,107,${alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Hint line ─────────────────────────────────────────────
    ctx.fillStyle = CLR.hintText;
    ctx.font      = "8px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('BACKSPACE to correct  -  type the word above', cx, 340);
  }

  // ── Results Screen ─────────────────────────────────────────
  function drawResultsScreen() {
    drawBg();

    // Background shimmer lines
    ctx.strokeStyle = 'rgba(78,204,163,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Title
    const isNewBest = finalWPM >= bestWPM && finalWPM > 0;
    const titleColor = isNewBest ? CLR.gold : CLR.accent;

    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 35;
    ctx.shadowColor = titleColor;
    ctx.fillStyle   = titleColor;
    ctx.font        = "bold 22px 'Press Start 2P', monospace";
    ctx.fillText(isNewBest ? '* NEW BEST! *' : "TIME'S UP!", W / 2, 72);
    ctx.restore();

    // Stats panel
    drawRoundRect(50, 96, W - 100, 200, 14, CLR.bgPanel, CLR.border);

    const statRows = [
      { label: 'WPM',      value: finalWPM.toFixed(1),   color: CLR.accent,  glow: 18 },
      { label: 'WORDS',    value: finalWords,              color: CLR.text,    glow: 0  },
      { label: 'ACCURACY', value: finalAcc + '%',          color: CLR.purple,  glow: 14 },
      { label: 'BEST WPM', value: bestWPM.toFixed(1),     color: CLR.gold,    glow: 14 },
    ];

    const rowH  = 44;
    const startY = 130;

    statRows.forEach((row, i) => {
      const y = startY + i * rowH;
      // Label
      ctx.fillStyle = CLR.dim;
      ctx.font      = "8px 'Press Start 2P', monospace";
      ctx.textAlign = 'left';
      ctx.fillText(row.label, 80, y);
      // Value
      ctx.save();
      ctx.shadowBlur  = row.glow;
      ctx.shadowColor = row.color;
      ctx.fillStyle   = row.color;
      ctx.font        = "bold 16px 'Press Start 2P', monospace";
      ctx.textAlign   = 'right';
      ctx.fillText(row.value, W - 80, y);
      ctx.restore();

      // Divider (not after last)
      if (i < statRows.length - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(70, y + 16); ctx.lineTo(W - 70, y + 16);
        ctx.stroke();
      }
    });

    // Prompt
    if (cursorOn) {
      glowText('PRESS ENTER TO PLAY AGAIN', W / 2, 348, CLR.accent, 18,
        "bold 9px 'Press Start 2P', monospace");
    }
  }

  // ── Main Loop ──────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);

    const dt = Math.min(ts - lastTs, 100);
    lastTs   = ts;

    // Cursor blink
    cursorTimer += dt;
    if (cursorTimer >= 530) {
      cursorOn    = !cursorOn;
      cursorTimer = 0;
    }

    if (gameState === 'start') {
      drawStartScreen();
      return;
    }

    if (gameState === 'results') {
      drawResultsScreen();
      return;
    }

    // ── Playing ───────────────────────────────────────────────
    // Update timer
    timeLeft = Math.max(0, GAME_DURATION - Math.floor((performance.now() - startTime) / 1000));

    // Red flash countdown
    if (flashRed > 0) flashRed -= dt;

    if (timeLeft <= 0) {
      endGame();
      return;
    }

    drawPlayingScreen();
  }

  // ── Public API ─────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');

    loadBest();
    gameState   = 'start';
    lastTs      = performance.now();
    cursorOn    = true;
    cursorTimer = 0;

    boundKeyDown = onKeyDown;
    boundClick   = () => {
      if (gameState === 'start' || gameState === 'results') startGame();
    };
    boundTouch   = (e) => {
      e.preventDefault();
      if (gameState === 'start' || gameState === 'results') startGame();
    };

    window.addEventListener('keydown', boundKeyDown);
    canvas.addEventListener('click', boundClick);
    canvas.addEventListener('touchstart', boundTouch, { passive: false });

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    window.removeEventListener('keydown', boundKeyDown);
    if (canvas) {
      canvas.removeEventListener('click', boundClick);
      canvas.removeEventListener('touchstart', boundTouch);
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    canvas = null;
    ctx    = null;
  }

  return { init, destroy };
})();
