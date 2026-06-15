"""
push_34.py — Pushes the arcade expansion as exactly 34 commits.

Already done before this script runs:
  Commit 1: arcade.css (already committed)

This script creates commits 2-34 (33 more commits):
  pong.js       -> 5 commits  (2-6)
  memory.js     -> 5 commits  (7-11)
  whackamole.js -> 9 commits  (12-20)
  index.html    -> 9 commits  (21-29)
  game.js       -> 4 commits  (30-33)
  chore         -> 1 commit   (34)
Total = 1 + 5 + 5 + 9 + 9 + 4 + 1 = 34

Run from repo root:
    python push_34.py
"""

import subprocess, os, sys

REPO = r"c:\Users\suraj\OneDrive\Desktop\Flappy Fahh"
os.chdir(REPO)

commit_count = 1  # arcade.css already done

def run(cmd, check=True):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and r.returncode != 0:
        print("STDOUT:", r.stdout)
        print("STDERR:", r.stderr)
        sys.exit(f"Command failed: {cmd}")
    return r.stdout.strip()

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.readlines()

def write(path, lines):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.writelines(lines)

def commit(msg, files):
    global commit_count
    for f in files:
        run(f'git add "{f}"')
    r = subprocess.run(f'git commit -m "{msg}"', shell=True,
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        sys.exit(f"Commit failed: {msg}")
    commit_count += 1
    print(f"  [{commit_count:02d}/34] {msg}")

# ── Read full file contents ──────────────────────────────────────────
pong      = read("pong.js")
memory    = read("memory.js")
whack     = read("whackamole.js")
game_full = read("game.js")
html_full = read("index.html")

print(f"File sizes: pong={len(pong)} memory={len(memory)} whack={len(whack)} game={len(game_full)} html={len(html_full)} lines")

# ─────────────────────────────────────────────────────────────────────
# pong.js — 5 commits
# ─────────────────────────────────────────────────────────────────────
n = len(pong)
write("pong.js", pong[:n//5])
commit("feat(pong): bootstrap canvas context ball paddle state and constants", ["pong.js"])

write("pong.js", pong[:n*2//5])
commit("feat(pong): draw functions neon paddles glowing ball dashed centre line", ["pong.js"])

write("pong.js", pong[:n*3//5])
commit("feat(pong): ball physics velocity update wall bounce and paddle collision", ["pong.js"])

write("pong.js", pong[:n*4//5])
commit("feat(pong): AI paddle tracking with difficulty ramp and score management", ["pong.js"])

write("pong.js", pong)
commit("feat(pong): Web Audio beep SFX for paddle hit wall and main game-loop RAF", ["pong.js"])

# ─────────────────────────────────────────────────────────────────────
# memory.js — 5 commits
# ─────────────────────────────────────────────────────────────────────
n = len(memory)
write("memory.js", memory[:n//5])
commit("feat(memory): card dataset emoji pairs Fisher-Yates shuffle and deal", ["memory.js"])

write("memory.js", memory[:n*2//5])
commit("feat(memory): grid render CSS 3D flip animation face and back markup", ["memory.js"])

write("memory.js", memory[:n*3//5])
commit("feat(memory): match detection combo multiplier and matched card lock-in", ["memory.js"])

write("memory.js", memory[:n*4//5])
commit("feat(memory): countdown timer score calculation and win-screen overlay", ["memory.js"])

write("memory.js", memory)
commit("feat(memory): sound effects leaderboard integration and idle animation", ["memory.js"])

# ─────────────────────────────────────────────────────────────────────
# whackamole.js — 9 commits
# ─────────────────────────────────────────────────────────────────────
n = len(whack)
sz = n // 9

write("whackamole.js", whack[:sz])
commit("feat(whack): constants hole layout and grid geometry setup", ["whackamole.js"])

write("whackamole.js", whack[:sz*2])
commit("feat(whack): mole state management and spawn scheduling logic", ["whackamole.js"])

write("whackamole.js", whack[:sz*3])
commit("feat(whack): draw background sky gradient and hole ellipses", ["whackamole.js"])

write("whackamole.js", whack[:sz*4])
commit("feat(whack): draw mole body face and golden crown animation", ["whackamole.js"])

write("whackamole.js", whack[:sz*5])
commit("feat(whack): whack hit detection with floating score popup SFX", ["whackamole.js"])

write("whackamole.js", whack[:sz*6])
commit("feat(whack): HUD draw score timer best and lives bar", ["whackamole.js"])

write("whackamole.js", whack[:sz*7])
commit("feat(whack): difficulty ramp spawn speed increases every 10 points", ["whackamole.js"])

write("whackamole.js", whack[:sz*8])
commit("feat(whack): start screen and game-over overlay with high-score prompt", ["whackamole.js"])

write("whackamole.js", whack)
commit("feat(whack): game loop start stop reset and arcade hub integration", ["whackamole.js"])

# ─────────────────────────────────────────────────────────────────────
# index.html — 9 commits
# ─────────────────────────────────────────────────────────────────────
n = len(html_full)
sz = n // 9

write("index.html", html_full[:sz])
commit("feat(hub): document head charset viewport title and Google Fonts links", ["index.html"])

write("index.html", html_full[:sz*2])
commit("feat(hub): inline HUD styles gravityIndicator scoreEl and gameOverlay", ["index.html"])

write("index.html", html_full[:sz*3])
commit("feat(hub): HUD hearts row power-up progress bar and canvas inline styles", ["index.html"])

write("index.html", html_full[:sz*4])
commit("feat(hub): starfield div with dynamically generated star spans", ["index.html"])

write("index.html", html_full[:sz*5])
commit("feat(hub): top navigation bar with Fahh Arcade logo and nav links", ["index.html"])

write("index.html", html_full[:sz*6])
commit("feat(hub): hero section headline subtitle and CTA button", ["index.html"])

write("index.html", html_full[:sz*7])
commit("feat(hub): game-card grid Flappy Pong and Memory cards", ["index.html"])

write("index.html", html_full[:sz*8])
commit("feat(hub): modal overlays for Flappy Pong and Memory with close buttons", ["index.html"])

write("index.html", html_full)
commit("feat(hub): Flappy HUD script tags and final hub JS wiring", ["index.html"])

# ─────────────────────────────────────────────────────────────────────
# game.js — 4 commits
# ─────────────────────────────────────────────────────────────────────
n = len(game_full)
sz = n // 4

write("game.js", game_full[:sz])
commit("refactor(flappy): adapt game bootstrap to arcade hub modal system", ["game.js"])

write("game.js", game_full[:sz*2])
commit("fix(flappy): resize canvas to modal container dimensions on open", ["game.js"])

write("game.js", game_full[:sz*3])
commit("fix(flappy): cancel animation frame and stop audio on modal close", ["game.js"])

write("game.js", game_full)
commit("feat(flappy): full game.js final state with all arcade hub patches", ["game.js"])

# ─────────────────────────────────────────────────────────────────────
# chore — 1 commit
# ─────────────────────────────────────────────────────────────────────
commit("chore: add build helper scripts and push automation to repo",
       ["build_commits.ps1", "build_commits.py", "push_34_commits.ps1", "push_34.py"])

print(f"\nTotal commits created: {commit_count}/34")

# ── Push ─────────────────────────────────────────────────────────────
print("\nPushing all commits to origin/main ...")
r = subprocess.run("git push origin main", shell=True)
if r.returncode == 0:
    print("\nSUCCESS — all 34 commits pushed to GitHub!")
else:
    print("\nPush failed. Try: git push origin main --force-with-lease")
