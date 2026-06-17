// ============================================================
//  WordleGame — Canvas-based Wordle for Fahh Arcade
//  Canvas: 420 × 520   Global: WordleGame
// ============================================================
const WordleGame = (() => {

  // ── Word List (250+ common 5-letter words) ─────────────────
  const WORDS = [
    'ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN',
    'AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIEN','ALIGN','ALIKE','ALIVE',
    'ALLEY','ALLOW','ALONE','ALONG','ALTER','ANGEL','ANGRY','ANIME','ANKLE','ANNEX',
    'APART','APPLE','APPLY','ARENA','ARGUE','ARISE','ARMOR','AROMA','ARRAY','ARROW',
    'ASIDE','ASKED','ASSET','AVOID','AWARD','AWARE','AWFUL','BASIC','BEACH','BEARD',
    'BEAST','BEGIN','BEING','BELOW','BENCH','BINGO','BLACK','BLADE','BLAME','BLAND',
    'BLANK','BLAST','BLAZE','BLEED','BLEND','BLESS','BLIND','BLOCK','BLOOD','BLOWN',
    'BOARD','BOOST','BOUND','BRAIN','BRAVE','BREAD','BREAK','BREED','BRICK','BRIDE',
    'BRIEF','BRING','BROAD','BROKE','BROOK','BROWN','BRUSH','BUILD','BUILT','BUNCH',
    'BURST','BUYER','CABIN','CACHE','CANDY','CARGO','CARRY','CATCH','CAUSE','CHAIN',
    'CHAIR','CHAOS','CHARM','CHART','CHASE','CHEAP','CHECK','CHEEK','CHESS','CHEST',
    'CHIEF','CHILD','CHIME','CHINA','CHOIR','CIVIC','CIVIL','CLAIM','CLASS','CLEAN',
    'CLEAR','CLERK','CLICK','CLIMB','CLOSE','CLOUD','CLOWN','COACH','COAST','COLOR',
    'COMET','COMIC','CORAL','COUNT','COVER','CRACK','CRAFT','CRANE','CRASH','CRAZY',
    'CREAM','CREEK','CRISP','CROSS','CROWD','CROWN','CRUEL','CRUSH','CURVE','CYCLE',
    'DAILY','DANCE','DATED','DECAY','DEEP','DELAY','DELTA','DEMON','DENSE','DEPOT',
    'DEPTH','DERBY','DEVIL','DIGIT','DISCO','DODGE','DOING','DOUBT','DOUGH','DRAFT',
    'DRAIN','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIFT','DRINK','DRIVE','DROVE',
    'DRYER','DYING','EAGER','EARLY','EARTH','EIGHT','ELECT','EMAIL','EMBER','EMPTY',
    'ENEMY','ENJOY','ENTER','EQUAL','ESSAY','EVADE','EVENT','EXACT','EXCEL','EXIST',
    'EXTRA','FABLE','FAITH','FALSE','FANCY','FATAL','FAULT','FEAST','FENCE','FEVER',
    'FIBER','FIELD','FIFTH','FIFTY','FINAL','FIRST','FIXED','FLAME','FLASH','FLEET',
    'FLESH','FLOAT','FLOOD','FLOOR','FLUID','FOCUS','FORCE','FORGE','FORGE','FORTH',
    'FORUM','FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROZE','FRUIT','FULLY',
    'FUNNY','GAMMA','GHOST','GIANT','GIVEN','GLAND','GLARE','GLASS','GLAZE','GLEAM',
    'GLOBE','GLOOM','GLORY','GLOSS','GLOVE','GOING','GRACE','GRADE','GRAIN','GRAND',
    'GRANT','GRASP','GRASS','GRAZE','GREAT','GREED','GREET','GRIEF','GRILL','GRIND',
    'GROAN','GROSS','GROUP','GROVE','GROWL','GUARD','GUESS','GUIDE','GUILE','GUISE',
    'GULCH','HAPPY','HARSH','HAVEN','HEART','HEAVY','HENCE','HERBS','HINGE','HOBBY',
    'HOMER','HONEY','HONOR','HORSE','HOTEL','HOUSE','HOVER','HUMAN','HUMID','HURRY',
    'IDEAL','IMAGE','IMPLY','INDEX','INDIE','INERT','INNER','INPUT','INTER','INTRO',
    'IONIC','ISSUE','ITEMS','IVORY','JAZZY','JEWEL','JOINT','JOKER','JUDGE','JUICE',
    'JUICY','JUMBO','KABOB','KAYAK','KNIFE','KNOCK','KNOWN','LABEL','LANCE','LARGE',
    'LASER','LATER','LAUGH','LAYER','LEARN','LEASE','LEAST','LEAVE','LEGAL','LEMON',
    'LEVEL','LIGHT','LIMIT','LINER','LIVER','LOCAL','LODGE','LOGIC','LOOSE','LOVER',
    'LOWER','LUCKY','LUNAR','LYING','MAGIC','MAJOR','MAKER','MANOR','MAPLE','MARCH',
    'MATCH','MAYOR','MEDIA','MERCY','MERGE','MERIT','METAL','MIGHT','MINER','MINOR',
    'MINUS','MODEL','MONEY','MONTH','MORAL','MOTEL','MOTOR','MOUNT','MOUSE','MOUTH',
    'MOVED','MOVIE','MUSIC','NAIVE','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH',
    'NOVEL','NURSE','NYMPH','OCCUR','OCEAN','ODDLY','OFFER','ONSET','OPERA','ORDER',
    'ORGAN','OTHER','OUTER','OXIDE','OZONE','PAINT','PANEL','PANIC','PAPER','PARTY',
    'PATCH','PAUSE','PEACE','PEARL','PEDAL','PENNY','PERCH','PHASE','PHONE','PHOTO',
    'PIANO','PILOT','PINCH','PIXEL','PIZZA','PLACE','PLAIN','PLANE','PLANT','PLATE',
    'PLAZA','PLEAD','PLUCK','PLUMB','PLUME','PLUMP','PLUNGE','POINT','POLAR','POPPY',
    'POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROBE','PROOF',
    'PROUD','PROVE','PULSE','PUNCH','PUPIL','QUEEN','QUEST','QUEUE','QUICK','QUIET',
    'QUOTA','QUOTE','RABBI','RADAR','RADIO','RAISE','RALLY','RANCH','RAPID','RATIO',
    'REACH','READY','REALM','REBEL','RECAP','REIGN','RELAX','REPLY','RESET','RIDER',
    'RIDGE','RIGHT','RISKY','RIVAL','RIVER','ROBIN','ROBOT','ROCKY','ROUGH','ROUND',
    'ROUTE','ROYAL','RULER','RURAL','SADLY','SAINT','SAUCE','SAVVY','SCALE','SCENE',
    'SCOPE','SCORE','SCOUT','SEIZE','SENSE','SERVE','SETUP','SEVEN','SHADE','SHAKE',
    'SHALL','SHAME','SHAPE','SHARE','SHARP','SHEER','SHELF','SHELL','SHIFT','SHINY',
    'SHOCK','SHOOT','SHORE','SHORT','SHOUT','SHRUG','SIGHT','SIGMA','SILLY','SINCE',
    'SKILL','SKULL','SLATE','SLAVE','SLEEP','SLICK','SLIDE','SLOPE','SMART','SMELL',
    'SMILE','SMOKE','SNAKE','SOLAR','SOLID','SOLVE','SONIC','SOUND','SOUTH','SPACE',
    'SPARE','SPARK','SPEAK','SPEED','SPEND','SPENT','SPICE','SPILL','SPINE','SPITE',
    'SPLIT','SPOKE','SPORT','SPREE','STACK','STAFF','STAGE','STAIN','STAIR','STALE',
    'STALL','STAND','STARK','START','STATE','STEAD','STEAM','STEEL','STEEP','STEER',
    'STERN','STICK','STILL','STING','STOCK','STONE','STOOD','STORE','STORM','STORY',
    'STOVE','STRAP','STRAY','STRIP','STUCK','STUDY','STYLE','SUGAR','SUITE','SUNNY',
    'SUPER','SURGE','SWAMP','SWEAR','SWEEP','SWEET','SWIFT','SWING','SWORE','SWORD',
    'SWORN','TABLE','TASTE','TEACH','TEETH','THANK','THEME','THICK','THING','THINK',
    'THIRD','THOSE','THREE','THREW','THROW','THUMB','TIDAL','TIGHT','TIMER','TIRED',
    'TITLE','TODAY','TOKEN','TOTAL','TOUCH','TOUGH','TOWER','TOXIC','TRACE','TRACK',
    'TRADE','TRAIL','TRAIN','TRAIT','TRASH','TREAT','TREND','TRIAL','TRICK','TRIED',
    'TROOP','TRUCK','TRULY','TRUMP','TRUNK','TRUST','TRUTH','TWICE','TWIST','TYRANT',
    'ULTRA','UNCLE','UNDER','UNION','UNITE','UNTIL','UPPER','UPSET','URBAN','USAGE',
    'USUAL','UTTER','VALID','VALUE','VALVE','VAULT','VERSE','VIOLA','VIRAL','VISIT',
    'VISOR','VISTA','VIVID','VOCAL','VOICE','VOTER','WAGON','WASTE','WATCH','WATER',
    'WEARY','WEAVE','WEIRD','WHALE','WHEAT','WHEEL','WHERE','WHICH','WHILE','WHIRL',
    'WHITE','WHOLE','WHOSE','WIDER','WINDY','WITCH','WOMAN','WOMEN','WORLD','WORRY',
    'WORSE','WORST','WORTH','WOULD','WRITE','WROTE','YACHT','YIELD','YOUNG','YOURS',
    'YOUTH','ZEBRA','ZILCH','ZIPPY','ZONAL',
  ].filter((w, i, a) => a.indexOf(w) === i); // dedupe

  // Valid guess list (superset – includes word list + extras for input validation)
  const VALID_GUESS = new Set([
    ...WORDS,
    'AAHED','AALII','AARGH','ABACI','ABACK','ABASE','ABBEY','ABBOT','ABHOR','ABLER',
    'ABODE','ABORT','ABUTS','ABYSS','ACHED','ACHES','ACIDS','ACORN','ACRID','ACTED',
    'ACMES','ACRES','ADAGE','ADDED','ADEPT','ADLIB','ADOBE','AEGIS','AEONS','AFOUL',
    'AGILE','AGLOW','AGONY','AGROUND','AGUED','AIDES','AIDED','AIOLI','AIRED','AISLE',
    'ALGAE','ALIBI','ALOFT','AMAZE','AMEND','AMISS','ANGEL','AXIAL','AXIOM','AXING',
    'AZURE','BABBY','BALER','BALMY','BANAL','BARGE','BARMY','BARON','BASAL','BASIL',
    'BASIS','BASTE','BATTY','BAYOU','BEADY','BEGAN','BEGOT','BELLY','BERTH','BEVEL',
    'BIDED','BIKER','BIRCH','BISON','BLOWN','BLUNT','BODED','BOGGY','BOLTS','BOXER',
    'BRINY','BROKE','BROOD','BROWS','BRUNT','BULLY','BULGE','BUMPY','BUNNY','BUGLE',
    'BURLY','BUSHY','BYLAW','CAGEY','CAULK','CEDAR','CELLS','CHAFE','CHALK','CHAMP',
    'CHANT','CHAPS','CHARD','CHIRP','CHOKE','CHORD','CHOSE','CHUMP','CHUNK','CHURN',
    'CIDER','CINCH','CIRCA','CLAMP','CLANG','CLANK','CLEFT','CLOAK','CLUMP','CLUNK',
    'COALY','COBALT','COIL','COLIC','COOKY','CORNY','COVET','COWRY','CRIMP','CROAK',
    'CRONE','CROON','CROUP','CRUEL','CRUMB','CRUST','CUBIC','CUPID','CURLY','CURRY',
    'DANDY','DATUM','DECOY','DECRY','DEFIANT','DELTA','DEPOT','DIRER','DIRTY','DITTY',
    'DIVOT','DIZZY','DOPEY','DOWDY','DOWRY','DRANK','DREGS','DROOL','DROOP','DROSS',
    'DROWN','DRUSY','DRYLY','DUCHY','DUMPY','DUNCE','DUPED','DUSTY','DWEEB','EAGER',
    'EBONY','EDGED','ELFIN','ELITE','ELOPE','ELUDE','EMOTE','ENACT','ERODE','ERODE',
    'EXERT','EXILE','EXPO','EXTOL','EXUDE','FABLE','FACET','FARCE','FIEND','FIFTY',
    'FITLY','FIZZY','FLAIR','FLAKY','FLUNG','FLUNK','FOAMY','FOGGY','FOLLY','FORAY',
    'FORGE','FORTE','FORTY','FUSSY','GAMIN','GAUDY','GAUGE','GAVEL','GAUZE','GAWKY',
    'GIDDY','GIRLY','GIRTH','GLEAN','GLOAT','GLUEY','GOUTY','GRIMY','GRIPE','GROIN',
    'GRUFF','GRUMP','GUSTO','GUTSY','GYRATE','HANDY','HAIRY','HARDY','HAUTE','HEADY',
    'HEFTY','HELOT','HIPPO','HIPPY','HOARY','HOKEY','HOLLY','HORSY','HUSKY','HYENA',
    'HYPER','ICING','IAMB','INANE','INEPT','INFIX','INGOT','IONIC','IRATE','ITCHY',
    'KNEEL','KNELT','KNOBS','KUDOS','LANKY','LARDY','LASSO','LEAKY','LEDGE','LEGGY',
    'LEGIT','LEMUR','LINER','LOAMY','LOOPY','LORRY','LOSSY','LOUSY','LOWLY','LUMPY',
    'LUSTY','MANGY','MANLY','MASHY','MEALY','MEATY','MIMIC','MIRTH','MISTY','MOLDY',
    'MOLTEN','MOODY','MOSSY','MOUSY','MUDDY','MUGGY','MULCH','MUSHY','MUSKY','MUSTY',
    'NASTY','NATTY','NERDY','NEWSY','NIMBLE','NIPPY','NITTY','NUTTY','OAKEN','ODDLY',
    'OFTEN','ONYX','OVOID','OVULE','OWING','OXIDE','PANSY','PASTY','PATTY','PAULY',
    'PEAKY','PERKY','PERKY','PICKY','PINEY','PITHY','PLAID','PLAIT','PLANK','PLAYFUL',
    'PLUMP','PODGY','POKEY','POPPY','PORKY','POTTY','POUTY','PRIVY','PRUDE','PUDGY',
    'PUFFY','PULPY','PUNKY','PURSE','PUTTY','RAINY','RAKISH','RASPY','RATTY','REEDY',
    'REEKY','RELAX','RISKY','RITZY','ROWDY','RUDDY','RUGBY','RUSTY','SADLY','SANDY',
    'SAPPY','SAUCY','SAVVY','SEEDY','SHARD','SHARKY','SHOWY','SHRUB','SHTICK','SILKY',
    'SILTY','SIREN','SISSY','SIXTY','SLIMY','SLUMP','SLUNG','SLUNK','SLYLY','SOGGY',
    'SPLAY','SPOOK','SPOON','SPORE','SPONGE','SPOUT','SPREE','SPRIG','SPROUT','SPUNK',
    'SQUAT','SQUID','STAID','STANK','STOUT','SUAVE','SULKY','SULLEN','SULTRY','SURLY',
    'SWATH','SWIGGED','TACKY','TANGY','TARDY','TAWNY','TEPID','TERSE','THORN','TIPSY',
    'TOFFY','TOLLY','TONAL','TONIC','TOOTHY','TORSO','TOUCHY','TOTEM','TUBBY','TUFFY',
    'TULIP','TUMID','TUNIC','TUSHY','TWIXT','TYING','UDDER','UNFIT','UNWED','UPSET',
    'USURP','VAPID','VASTY','VEINY','VENOM','VERITY','VIGOR','VIRAL','VIXEN','VOGUE',
    'VOILA','VOUCH','VULVA','WACKY','WADED','WIMPY','WINDY','WORDY','WOVEN','WRECK',
    'WRING','WRIST','WRONG','YODEL','YUMMY',
  ]);

  // ── Layout Constants ────────────────────────────────────────
  const W = 420, H = 520;
  const ROWS = 6, COLS = 5;
  const TILE_SIZE = 54, TILE_GAP = 6;
  const GRID_X = (W - (COLS * TILE_SIZE + (COLS - 1) * TILE_GAP)) / 2;
  const GRID_Y = 14;

  // Keyboard rows
  const KB_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];
  const KB_KEY_H = 38, KB_KEY_GAP = 5;
  const KB_Y = GRID_Y + ROWS * (TILE_SIZE + TILE_GAP) + TILE_GAP + 10;

  // ── Colors ──────────────────────────────────────────────────
  const CLR = {
    bg          : '#121213',
    tile        : '#121213',
    tileBorder  : '#3a3a3c',
    tileActive  : '#565758',
    tileText    : '#ffffff',
    correct     : '#538d4e',  // green
    present     : '#b59f3b',  // yellow
    absent      : '#3a3a3c',  // gray
    kbBg        : '#818384',
    kbText      : '#ffffff',
    correct2    : '#538d4e',
    present2    : '#b59f3b',
    absent2     : '#3a3a3c',
    msgBg       : 'rgba(255,255,255,0.95)',
    msgText     : '#121213',
    winBg       : 'rgba(0,0,0,0.72)',
    winText     : '#ffffff',
  };

  // ── State ───────────────────────────────────────────────────
  let canvas, ctx, animId;
  let answer, guesses, currentGuess;
  let gameState;       // 'playing' | 'won' | 'lost'
  let keyStates;       // letter -> 'correct'|'present'|'absent'

  // Tile flip animation
  let flipQueue;       // [{row, col, startTime, duration}]
  let shakeRow, shakeStart;
  let shakeActive;

  // Win confetti
  let particles;
  let winTime;

  // Toast message
  let toastMsg, toastStart, toastDuration;

  // Stats
  let wins, streak;

  // Input
  let boundKeyDown;

  // ── Helpers ─────────────────────────────────────────────────
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  function loadStats() {
    wins   = parseInt(localStorage.getItem('wordle_wins')   || '0', 10);
    streak = parseInt(localStorage.getItem('wordle_streak') || '0', 10);
  }
  function saveStats() {
    localStorage.setItem('wordle_wins',   wins);
    localStorage.setItem('wordle_streak', streak);
  }

  function pickWord() {
    const pool = WORDS.filter(w => w.length === 5);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Toast ───────────────────────────────────────────────────
  function showToast(msg, duration = 1800) {
    toastMsg      = msg;
    toastStart    = performance.now();
    toastDuration = duration;
  }

  // ── Evaluate guess ──────────────────────────────────────────
  function evaluateGuess(guess, ans) {
    // Returns array of 'correct' | 'present' | 'absent' for each letter
    const result = Array(5).fill('absent');
    const ansArr  = ans.split('');
    const guessArr = guess.split('');
    const used   = Array(5).fill(false);

    // First pass: correct positions
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === ansArr[i]) {
        result[i] = 'correct';
        used[i]   = true;
        ansArr[i] = null;
      }
    }
    // Second pass: present
    for (let i = 0; i < 5; i++) {
      if (result[i] === 'correct') continue;
      const idx = ansArr.indexOf(guessArr[i]);
      if (idx !== -1) {
        result[i]    = 'present';
        ansArr[idx]  = null;
      }
    }
    return result;
  }

  // ── Submit guess ────────────────────────────────────────────
  function submitGuess() {
    if (currentGuess.length < 5) { showToast('Not enough letters'); shake(guesses.length); return; }
    const word = currentGuess.join('');
    if (!VALID_GUESS.has(word)) { showToast('Not in word list'); shake(guesses.length); return; }

    const row    = guesses.length;
    const result = evaluateGuess(word, answer);

    // Update key states
    result.forEach((state, i) => {
      const letter = word[i];
      const prev   = keyStates[letter];
      if (!prev || prev === 'absent' || (prev === 'present' && state === 'correct')) {
        keyStates[letter] = state;
      }
    });

    // Push to guesses
    guesses.push({ word, result, revealed: Array(5).fill(false) });

    // Queue flip animations
    for (let c = 0; c < 5; c++) {
      flipQueue.push({ row, col: c, startTime: performance.now() + c * 300, duration: 500 });
    }

    currentGuess = [];

    const won = result.every(r => r === 'correct');
    const exhausted = guesses.length === ROWS;

    // Determine end state after flip finishes
    const revealDelay = 5 * 300 + 500; // last flip end
    setTimeout(() => {
      if (won) {
        wins++;
        streak++;
        saveStats();
        gameState = 'won';
        winTime   = performance.now();
        spawnConfetti();
        const msgs = ['Genius!','Magnificent!','Impressive!','Splendid!','Great!','Phew!'];
        showToast(msgs[Math.min(row, 5)], 3000);
      } else if (exhausted) {
        streak = 0;
        saveStats();
        gameState = 'lost';
        showToast(answer, 4500);
      }
    }, revealDelay);
  }

  // ── Shake ────────────────────────────────────────────────────
  function shake(row) {
    shakeRow    = row;
    shakeStart  = performance.now();
    shakeActive = true;
  }

  // ── Confetti ─────────────────────────────────────────────────
  function spawnConfetti() {
    particles = [];
    const colors = ['#538d4e','#b59f3b','#4ecca3','#e06c75','#61afef','#c678dd','#e5c07b','#ffffff'];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x     : rand(0, W),
        y     : rand(-60, -5),
        vx    : rand(-2, 2),
        vy    : rand(2, 6),
        size  : rand(5, 11),
        color : colors[randInt(0, colors.length - 1)],
        rot   : rand(0, Math.PI * 2),
        rVel  : rand(-0.15, 0.15),
        shape : Math.random() > 0.5 ? 'rect' : 'circle',
        alpha : 1,
      });
    }
  }

  function updateConfetti(dt) {
    if (!particles || !particles.length) return;
    particles.forEach(p => {
      p.x   += p.vx * dt * 0.06;
      p.y   += p.vy * dt * 0.06;
      p.rot += p.rVel;
      p.vy  += 0.05 * dt * 0.06;
      if (p.y > H + 20) { p.y = -20; p.x = rand(0, W); p.vy = rand(2, 6); }
    });
  }

  function drawConfetti() {
    if (!particles) return;
    const elapsed = performance.now() - winTime;
    const fadeStart = 4000;
    particles.forEach(p => {
      const alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / 2000) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ── Draw Tile ────────────────────────────────────────────────
  function getTileX(col) { return GRID_X + col * (TILE_SIZE + TILE_GAP); }
  function getTileY(row) { return GRID_Y + row * (TILE_SIZE + TILE_GAP); }

  function drawTile(row, col, letter, state, flipProgress, shakeOffsetX) {
    const x   = getTileX(col) + (shakeOffsetX || 0);
    const y   = getTileY(row);
    const sz  = TILE_SIZE;

    // Flip scaling: scale Y from 1 → 0 (first half) then 0 → 1 (second half)
    const scaleY = flipProgress !== undefined
      ? Math.abs(Math.cos(flipProgress * Math.PI))
      : 1;

    ctx.save();
    ctx.translate(x + sz / 2, y + sz / 2);
    ctx.scale(1, scaleY);

    // Determine fill color based on flip phase
    let fillColor = CLR.tile;
    let borderColor = letter ? CLR.tileActive : CLR.tileBorder;

    if (state && flipProgress !== undefined) {
      if (flipProgress > 0.5) {
        fillColor   = CLR[state];
        borderColor = CLR[state];
      }
    } else if (state && flipProgress === undefined) {
      fillColor   = CLR[state];
      borderColor = CLR[state];
    }

    // Draw rounded rect
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(-sz/2 + r, -sz/2);
    ctx.lineTo( sz/2 - r, -sz/2);
    ctx.quadraticCurveTo( sz/2, -sz/2,  sz/2, -sz/2 + r);
    ctx.lineTo( sz/2,  sz/2 - r);
    ctx.quadraticCurveTo( sz/2,  sz/2,  sz/2 - r,  sz/2);
    ctx.lineTo(-sz/2 + r,  sz/2);
    ctx.quadraticCurveTo(-sz/2,  sz/2, -sz/2,  sz/2 - r);
    ctx.lineTo(-sz/2, -sz/2 + r);
    ctx.quadraticCurveTo(-sz/2, -sz/2, -sz/2 + r, -sz/2);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Letter text (only show when scaleY > 0.15 to avoid shimmer at flip midpoint)
    if (letter && scaleY > 0.15) {
      ctx.fillStyle    = CLR.tileText;
      ctx.font         = `bold ${Math.round(sz * 0.56)}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      // If flipping and past halfway → use flipped state color letter
      ctx.fillText(letter, 0, 1);
    }

    ctx.restore();
  }

  // ── Draw Grid ────────────────────────────────────────────────
  function drawGrid(now) {
    // Shake offset
    let shakeOffsets = Array(COLS).fill(0);
    if (shakeActive) {
      const elapsed = now - shakeStart;
      const shakeDur = 500;
      if (elapsed < shakeDur) {
        const amp  = 7 * Math.sin((elapsed / shakeDur) * Math.PI);
        const freq = Math.sin(elapsed * 0.07);
        const dx   = amp * freq;
        shakeOffsets = Array(COLS).fill(dx);
      } else {
        shakeActive = false;
      }
    }

    for (let r = 0; r < ROWS; r++) {
      const guess = guesses[r];

      // Is this row currently being flipped?
      const rowFlips = flipQueue.filter(f => f.row === r);

      for (let c = 0; c < COLS; c++) {
        let letter = '';
        let state  = null;
        let flipProg = undefined;

        if (guess) {
          letter = guess.word[c];
          state  = guess.result[c];

          // Check flip animation for this cell
          const flip = rowFlips.find(f => f.col === c);
          if (flip) {
            const elapsed = now - flip.startTime;
            if (elapsed >= 0) {
              flipProg = Math.min(elapsed / flip.duration, 1);
              // once done, mark revealed
              if (flipProg >= 1) {
                flipProg = undefined;
                flipQueue = flipQueue.filter(f => f !== flip);
              }
            } else {
              // Not started yet — show as un-revealed
              state    = null;
              flipProg = undefined;
            }
          } else {
            // Flip done, show final state
          }
        } else if (r === guesses.length) {
          // Active input row
          letter = currentGuess[c] || '';
          // Slight pop animation when letter typed
        }

        const sx = (r === shakeRow && shakeActive) ? shakeOffsets[c] : 0;
        drawTile(r, c, letter, state, flipProg, sx);
      }
    }
  }

  // ── Draw Keyboard ────────────────────────────────────────────
  function drawKeyboard() {
    const totalRows = KB_ROWS.length;
    for (let ri = 0; ri < totalRows; ri++) {
      const row  = KB_ROWS[ri];
      const keys = row.length;

      // Compute total width of row to center it
      let rowW = 0;
      row.forEach(k => {
        const wide = (k === 'ENTER' || k === '⌫');
        rowW += (wide ? 54 : 34) + KB_KEY_GAP;
      });
      rowW -= KB_KEY_GAP;

      let kx = (W - rowW) / 2;
      const ky = KB_Y + ri * (KB_KEY_H + KB_KEY_GAP);

      row.forEach(key => {
        const wide = (key === 'ENTER' || key === '⌫');
        const kw   = wide ? 54 : 34;

        let bg   = CLR.kbBg;
        const st = keyStates[key];
        if      (st === 'correct') bg = CLR.correct2;
        else if (st === 'present') bg = CLR.present2;
        else if (st === 'absent')  bg = CLR.absent2;

        // Rounded rect
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(kx + r, ky);
        ctx.lineTo(kx + kw - r, ky);
        ctx.quadraticCurveTo(kx + kw, ky, kx + kw, ky + r);
        ctx.lineTo(kx + kw, ky + KB_KEY_H - r);
        ctx.quadraticCurveTo(kx + kw, ky + KB_KEY_H, kx + kw - r, ky + KB_KEY_H);
        ctx.lineTo(kx + r, ky + KB_KEY_H);
        ctx.quadraticCurveTo(kx, ky + KB_KEY_H, kx, ky + KB_KEY_H - r);
        ctx.lineTo(kx, ky + r);
        ctx.quadraticCurveTo(kx, ky, kx + r, ky);
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();

        ctx.fillStyle    = CLR.kbText;
        ctx.font         = wide
          ? "bold 11px 'Segoe UI', Arial, sans-serif"
          : "bold 13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key, kx + kw / 2, ky + KB_KEY_H / 2 + 1);

        kx += kw + KB_KEY_GAP;
      });
    }
  }

  // ── Draw Stats bar ───────────────────────────────────────────
  function drawStats() {
    ctx.fillStyle    = '#3a3a3c';
    ctx.font         = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Wins: ${wins}   Streak: ${streak}`, W - 8, 4);
  }

  // ── Draw Toast ───────────────────────────────────────────────
  function drawToast(now) {
    if (!toastMsg) return;
    const elapsed = now - toastStart;
    if (elapsed > toastDuration) { toastMsg = null; return; }

    let alpha = 1;
    const fadeIn  = 150;
    const fadeOut = 300;
    if (elapsed < fadeIn)                           alpha = elapsed / fadeIn;
    if (elapsed > toastDuration - fadeOut)          alpha = (toastDuration - elapsed) / fadeOut;
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font         = "bold 15px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(toastMsg).width + 28;
    const th = 36;
    const tx = W / 2 - tw / 2;
    const ty = GRID_Y + ROWS * (TILE_SIZE + TILE_GAP) / 2 - th / 2 - 30;

    ctx.fillStyle = CLR.msgBg;
    const rr = 8;
    ctx.beginPath();
    ctx.moveTo(tx + rr, ty);
    ctx.lineTo(tx + tw - rr, ty);
    ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + rr);
    ctx.lineTo(tx + tw, ty + th - rr);
    ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - rr, ty + th);
    ctx.lineTo(tx + rr, ty + th);
    ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - rr);
    ctx.lineTo(tx, ty + rr);
    ctx.quadraticCurveTo(tx, ty, tx + rr, ty);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = CLR.msgText;
    ctx.fillText(toastMsg, W / 2, ty + th / 2);
    ctx.restore();
  }

  // ── Draw Win Overlay ─────────────────────────────────────────
  function drawWinOverlay(now) {
    drawConfetti();

    const elapsed  = now - winTime;
    const overlayStart = 2200;
    if (elapsed < overlayStart) return;

    const alpha = Math.min((elapsed - overlayStart) / 600, 1) * 0.88;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = CLR.winBg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (alpha < 0.4) return;

    // Panel
    const pw = 300, ph = 200;
    const px = (W - pw) / 2, py = (H - ph) / 2 - 20;

    ctx.save();
    ctx.globalAlpha = Math.min((elapsed - overlayStart) / 800, 1);

    // Panel background
    ctx.fillStyle = '#1e1e1f';
    ctx.shadowColor   = '#538d4e';
    ctx.shadowBlur    = 30;
    const rr = 16;
    ctx.beginPath();
    ctx.moveTo(px + rr, py);
    ctx.lineTo(px + pw - rr, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + rr);
    ctx.lineTo(px + pw, py + ph - rr);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - rr, py + ph);
    ctx.lineTo(px + rr, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - rr);
    ctx.lineTo(px, py + rr);
    ctx.quadraticCurveTo(px, py, px + rr, py);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Emoji & title
    ctx.font         = '44px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉', W / 2, py + 52);

    ctx.font         = "bold 22px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle    = '#538d4e';
    ctx.fillText('You Won!', W / 2, py + 100);

    ctx.font         = "14px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle    = '#ababab';
    ctx.fillText(`The word was  ${answer}`, W / 2, py + 128);

    ctx.font         = "13px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(`Wins: ${wins}   •   Streak: ${streak} 🔥`, W / 2, py + 155);

    // New game button
    const bw = 140, bh = 36;
    const bx = W / 2 - bw / 2;
    const by = py + ph - bh - 12;
    ctx.fillStyle = '#538d4e';
    const br = 8;
    ctx.beginPath();
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
    ctx.lineTo(bx + br, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
    ctx.lineTo(bx, by + br);
    ctx.quadraticCurveTo(bx, by, bx + br, by);
    ctx.closePath();
    ctx.fill();

    ctx.font         = "bold 14px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('New Game', W / 2, by + bh / 2 + 1);

    ctx.restore();
  }

  // ── Draw Lost Overlay ────────────────────────────────────────
  function drawLostOverlay() {
    // Answer shown via toast; just show a "play again" nudge after toast fades
    if (toastMsg) return;

    const pw = 280, ph = 130;
    const px = (W - pw) / 2, py = (H - ph) / 2;

    ctx.save();
    ctx.fillStyle = '#1e1e1f';
    ctx.shadowColor = '#e06c75';
    ctx.shadowBlur  = 20;
    const rr = 12;
    ctx.beginPath();
    ctx.moveTo(px + rr, py);
    ctx.lineTo(px + pw - rr, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + rr);
    ctx.lineTo(px + pw, py + ph - rr);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - rr, py + ph);
    ctx.lineTo(px + rr, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - rr);
    ctx.lineTo(px, py + rr);
    ctx.quadraticCurveTo(px, py, px + rr, py);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font         = "bold 18px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle    = '#e06c75';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', W / 2, py + 34);

    ctx.font         = "14px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(`Word: ${answer}`, W / 2, py + 62);

    // New game button
    const bw = 130, bh = 34;
    const bx = W / 2 - bw / 2;
    const by = py + ph - bh - 14;
    ctx.fillStyle = '#e06c75';
    const br = 7;
    ctx.beginPath();
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
    ctx.lineTo(bx + br, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
    ctx.lineTo(bx, by + br);
    ctx.quadraticCurveTo(bx, by, bx + br, by);
    ctx.closePath();
    ctx.fill();

    ctx.font      = "bold 13px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.fillText('New Game', W / 2, by + bh / 2 + 1);

    ctx.restore();
  }

  // ── Main Loop ────────────────────────────────────────────────
  function loop(now) {
    animId = requestAnimationFrame(loop);

    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);

    drawStats();
    drawGrid(now);
    drawKeyboard();
    drawToast(now);

    if (gameState === 'won')  {
      updateConfetti(now - (winTime || now));
      drawWinOverlay(now);
    }
    if (gameState === 'lost' && !toastMsg) drawLostOverlay();
  }

  // ── Keyboard on-screen click ─────────────────────────────────
  function getClickedKey(mx, my) {
    const totalRows = KB_ROWS.length;
    for (let ri = 0; ri < totalRows; ri++) {
      const row = KB_ROWS[ri];
      let rowW = 0;
      row.forEach(k => { rowW += (k === 'ENTER' || k === '⌫' ? 54 : 34) + KB_KEY_GAP; });
      rowW -= KB_KEY_GAP;

      let kx = (W - rowW) / 2;
      const ky = KB_Y + ri * (KB_KEY_H + KB_KEY_GAP);

      for (let ki = 0; ki < row.length; ki++) {
        const key = row[ki];
        const kw  = (key === 'ENTER' || key === '⌫') ? 54 : 34;
        if (mx >= kx && mx <= kx + kw && my >= ky && my <= ky + KB_KEY_H) {
          return key;
        }
        kx += kw + KB_KEY_GAP;
      }
    }
    return null;
  }

  function getClickedNewGame(mx, my) {
    // Win overlay button
    if (gameState === 'won') {
      const elapsed = performance.now() - winTime;
      if (elapsed < 2200) return false;
      const pw = 300, ph = 200;
      const px = (W - pw) / 2, py = (H - ph) / 2 - 20;
      const bw = 140, bh = 36;
      const bx = W / 2 - bw / 2;
      const by = py + ph - bh - 12;
      return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
    }
    // Lost overlay button
    if (gameState === 'lost' && !toastMsg) {
      const pw = 280, ph = 130;
      const px = (W - pw) / 2, py = (H - ph) / 2;
      const bw = 130, bh = 34;
      const bx = W / 2 - bw / 2;
      const by = py + ph - bh - 14;
      return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
    }
    return false;
  }

  // ── Input handling ────────────────────────────────────────────
  function handleKey(key) {
    if (gameState !== 'playing') return;
    if (key === 'ENTER') { submitGuess(); return; }
    if (key === '⌫' || key === 'BACKSPACE') {
      if (currentGuess.length > 0) currentGuess.pop();
      return;
    }
    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      currentGuess.push(key);
    }
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key.toUpperCase();
    if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) {
      e.preventDefault();
      handleKey(k);
    }
  }

  function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    if (getClickedNewGame(mx, my)) { resetGame(); return; }

    const key = getClickedKey(mx, my);
    if (key) handleKey(key === '⌫' ? 'BACKSPACE' : key);
  }

  // ── Reset / New game ─────────────────────────────────────────
  function resetGame() {
    answer       = pickWord();
    guesses      = [];
    currentGuess = [];
    keyStates    = {};
    flipQueue    = [];
    shakeActive  = false;
    particles    = null;
    toastMsg     = null;
    gameState    = 'playing';
  }

  // ── Public API ────────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('WordleGame: canvas not found:', canvasId); return; }
    ctx    = canvas.getContext('2d');
    canvas.width  = W;
    canvas.height = H;

    loadStats();
    resetGame();

    boundKeyDown = onKeyDown;
    window.addEventListener('keydown', boundKeyDown);
    canvas.addEventListener('click', onCanvasClick);

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (boundKeyDown) { window.removeEventListener('keydown', boundKeyDown); boundKeyDown = null; }
    if (canvas)       { canvas.removeEventListener('click', onCanvasClick); }
    canvas = null; ctx = null;
  }

  return { init, destroy };
})();

// arcade-hub: keyboard registered

// arcade-hub: share registered
