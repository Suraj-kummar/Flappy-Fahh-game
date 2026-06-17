# 🎮 FAHH ARCADE

> *"A game so simple, your grandma could play it. She won't. But she could."*

---

## what even is this 💀

bro it started as one angry chicken.  
now it's a **whole arcade**.  
**28 games. one vibe. zero chill.**

welcome to **Fahh Arcade** — a retro neon mini-game hub built from scratch with pure HTML, Canvas and Web Audio.  
no frameworks. no libraries. no sanity.

---

## 🕹️ the games

### 🐔 1. Flappy Fahh *(the OG)*
a chicken that goes **FAHH**.  
dodge pipes. flip gravity. collect power-ups.  
achieve greatness. immediately lose it.

| key | what it does |
|-----|-------------|
| `SPACE` | chicken go FAHH 🐔 |
| `SHIFT` | flip gravity (yes really) |
| your dignity | gone after score 3 |

**features:**
- Real FAHH sound — not a beep. an actual FAHH. you're welcome.
- Gravity flip — because one way to die wasn't enough
- Power-ups — shield 🛡️ magnet 🧲 coins 💰 double-flap ⚡
- 3 lives + hearts system
- Particle effects — we put glitter on the trauma
- Day/night sky cycle tied to your score
- Achievements system — 7 badges saved to localStorage
- Local leaderboard — top 5 scores with medals

---

### 🐍 2. Snake
eat, grow, don't bite yourself. classic.

---

### 🧱 3. Tetris
clear lines before the stack reaches the top!

---

### 🏏 4. Breakout
smash all bricks with your paddle and ball!

---

### 👾 5. Space Invaders
shoot the alien fleet before they reach you!

---

### 🏓 6. Pong
you vs AI. neon paddles, glowing ball, dashed centre line.  
first to 7 wins. good luck with that.

| control | action |
|---------|--------|
| `↑ / ↓` or mouse | move your paddle |

**features:**
- AI with difficulty ramp (gets faster as score rises)
- Web Audio beep SFX on every hit
- Neon retro visual style

---

### 🔢 7. 2048
slide tiles, merge numbers, reach 2048!

---

### 💣 8. Minesweeper
clear the field without triggering a mine!

---

### 🔴 9. Simon Says
watch the pattern, repeat it. don't miss!

---

### 🧩 10. 15-Puzzle
slide tiles into order in fewest moves!

---

### ☄️ 11. Asteroids
thrust, rotate, shoot rocks — survive!

---

### ⌨️ 12. Type Rush
type falling words before they hit the ground!

---

### 🌊 13. Color Flood
flood-fill the board in one color to win!

---

### ⚡ 14. Reaction
click the instant it turns green. how fast are you?

---

### 🃏 15. Blackjack
beat the dealer to 21 without going bust!

---

### 🎲 16. Dice Poker
yahtzee-style dice — roll for combos!

---

### 🎯 17. Target Shoot
tap shrinking targets before they vanish!

---

### 🏃 18. Runner
jump and duck through infinite obstacles!

---

### 🃏 19. Memory Match
flip cards. find pairs. try to remember where stuff is.  
emoji slot-machine vibes. classic nostalgia.

**features:**
- 8 emoji pairs (16 cards)
- CSS 3D flip animation
- Combo multiplier — match fast, score big
- Countdown timer + win-screen overlay
- Moves counter + elapsed time tracking

---

### 🔨 20. Whack-a-Mole
moles pop up. you whack them. that's it.  
golden moles give bonus points.  
miss too many and it's over.

**features:**
- 9-hole canvas grid
- Golden moles (12% spawn chance) — bonus points
- Difficulty ramp — spawn speed increases every 10 pts
- 60-second countdown
- Floating score popups on whack
- Lives system + HUD

---

### 🟡 21. Pac-Man
chomp dots, dodge ghosts, eat power pellets!

---

### 🐸 22. Crossy Road
hop across roads and rivers without dying!

---

### 🫧 23. Bubble Shooter
aim and pop 3+ matching colored bubbles!

---

### 🔴 24. Connect Four
drop discs, get 4 in a row before the AI!

---

### 🎸 25. Rhythm Tap
hit the falling notes to the beat — A S D F!

---

### 🟩 26. Wordle
guess the 5-letter word in 6 tries!

---

### 🐲 27. Galaga
blast alien formations in classic arcade style!

---

### ⛳ 28. Mini Golf
drag to aim, release to putt — 9 holes!

---

## tech stack (for the nerds in the chat)

```
HTML5  +  Vanilla JS  +  Canvas API  +  Web Audio API  +  Suffering
```

zero dependencies. zero frameworks. zero regrets.  
just raw HTML and a chicken with anger issues.

**files:**
| file | what it is |
|------|-----------|
| `index.html` | arcade hub — nav, game cards, modals, HUD |
| `arcade.css` | shared retro neon styles — starfield, cards, modals |
| `game.js` | Flappy Fahh — full ultra edition |
| `snake.js` | Snake — classic grow-and-don't-die |
| `tetris.js` | Tetris — line-clearing madness |
| `breakout.js` | Breakout — brick smasher |
| `spaceinvaders.js` | Space Invaders — alien blaster |
| `pong.js` | Pong — single-player vs AI |
| `game2048.js` | 2048 — tile merger |
| `minesweeper.js` | Minesweeper — don't hit the mines |
| `simon.js` | Simon Says — memory pattern game |
| `slidingpuzzle.js` | 15-Puzzle — tile slider |
| `asteroids.js` | Asteroids — rock shooter |
| `typingspeed.js` | Type Rush — falling word typer |
| `colorflood.js` | Color Flood — board flood-fill |
| `reactiontime.js` | Reaction Time — click-speed tester |
| `blackjack.js` | Blackjack — beat the dealer |
| `dicepoker.js` | Dice Poker — yahtzee combos |
| `targetshooter.js` | Target Shoot — shrinking target clicker |
| `endlessrunner.js` | Runner — infinite obstacle jumper |
| `memory.js` | Memory Match — emoji card flip |
| `whackamole.js` | Whack-a-Mole — canvas mole smasher |
| `pacman.js` | Pac-Man — dot chomper |
| `crossyroad.js` | Crossy Road — frogger-style hopper |
| `bubbleshooter.js` | Bubble Shooter — pop matching bubbles |
| `connectfour.js` | Connect Four — 4-in-a-row vs AI |
| `rhythmtap.js` | Rhythm Tap — music note hitter |
| `wordle.js` | Wordle — 5-letter word guesser |
| `galaga.js` | Galaga — formation shooter |
| `minigolf.js` | Mini Golf — 9-hole putt-putt |
| `fahh.mp3` | the sacred FAHH sound |

---

## how to run

1. clone the repo  
2. open `index.html` in your browser  
3. pick a game  
4. immediately crash  
5. question your life choices  
6. pick another game  

no server needed. no npm install. no nonsense.

---

## the fahh sound

the sound is from **S0L0MONST3R** on Zedge.  
[FAHHHHH 🔊](https://www.zedge.net/notification-sounds/f218e179-a6b3-45eb-9975-20d84ff54a44)

it goes FAHH.  
it REALLY goes FAHH.  
10/10 would FAHH again.

---

> built with pure HTML + Canvas + Web Audio — no libraries, no frameworks, just vibes and Stack Overflow 😭  
>  
> **~10 000+ lines of JavaScript across 28 games**  
> **1 angry chicken**  
> **0 regrets**  
>  
> #javascript #gamedev #buildinpublic #htmlcanvas #solodev #webdeveloper #codinglife

---

## known bugs

- you will lose  
- you will play again  
- you will lose again  
- this is intentional  

---

## contributing

found a bug? raise an issue.  
want to add a game? make a PR.  
want to fight? my DMs are open.

---

## license

do whatever you want with it bestie 🤷  
just don't remove the FAHH sound. that's sacred.

---

*made with 🐔 + ☕ + questionable decisions*

> *"FAHH" — the chicken, probably*
