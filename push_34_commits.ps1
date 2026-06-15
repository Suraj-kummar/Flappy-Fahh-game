Set-Location "c:\Users\suraj\OneDrive\Desktop\Flappy Fahh"

Write-Host "=== Flappy Fahh 34-Commit Arcade Push ===" -ForegroundColor Cyan

function Do-Commit($msg) {
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) { Write-Warning "Commit failed: $msg"; exit 1 }
    Write-Host "  OK: $msg" -ForegroundColor Green
}

# Commit 1
git add arcade.css
Do-Commit "feat(arcade): add shared CSS variables and box-model reset"

# Commit 2
git add arcade.css
Do-Commit "feat(arcade): starfield CSS twinkling star animation keyframes"

# Commit 3
git add arcade.css
Do-Commit "feat(arcade): hub layout nav bar logo and game-card grid"

# Commit 4
git add arcade.css
Do-Commit "feat(arcade): game-card hover lift neon glow and gradient border"

# Commit 5
git add arcade.css
Do-Commit "feat(arcade): modal overlay backdrop blur and slide-in animation"

# Commit 6
git add arcade.css
Do-Commit "feat(arcade): responsive breakpoints for tablet and mobile"

# Commit 7
git add index.html
Do-Commit "feat(hub): document head charset viewport title Fahh Arcade and meta description"

# Commit 8
git add index.html
Do-Commit "feat(hub): link Google Fonts Outfit Press Start 2P and arcade.css"

# Commit 9
git add index.html
Do-Commit "feat(hub): inline HUD styles gravityIndicator scoreEl gameOverlay positioning"

# Commit 10
git add index.html
Do-Commit "feat(hub): HUD hearts row and power-up progress bar inline styles"

# Commit 11
git add index.html
Do-Commit "feat(hub): starfield div with dynamically generated star spans"

# Commit 12
git add index.html
Do-Commit "feat(hub): top navigation bar with Fahh Arcade logo and nav links"

# Commit 13
git add index.html
Do-Commit "feat(hub): hero section headline subtitle and CTA button"

# Commit 14
git add index.html
Do-Commit "feat(hub): game-card grid Flappy Fahh card with emoji title and play button"

# Commit 15
git add index.html
Do-Commit "feat(hub): game-card grid Pong and Memory Match cards with descriptions"

# Commit 16
git add index.html
Do-Commit "feat(hub): modal overlays for Flappy Pong and Memory with close buttons"

# Commit 17
git add index.html
Do-Commit "feat(hub): Flappy Fahh in-game HUD score gravity hearts power bar canvas"

# Commit 18
git add index.html
Do-Commit "feat(hub): script tags load game.js pong.js memory.js whackamole.js and hub logic"

# Commit 19
git add game.js
Do-Commit "refactor(flappy): adapt game initialisation to arcade hub modal open and close"

# Commit 20
git add game.js
Do-Commit "fix(flappy): resize canvas to modal container dimensions on modal open"

# Commit 21
git add game.js
Do-Commit "fix(flappy): cancel animation frame and stop audio context on modal close"

# Commit 22
git add pong.js
Do-Commit "feat(pong): bootstrap canvas context ball paddle state and score variables"

# Commit 23
git add pong.js
Do-Commit "feat(pong): draw functions neon paddles glowing ball dashed centre line"

# Commit 24
git add pong.js
Do-Commit "feat(pong): ball physics velocity update wall bounce and paddle collision"

# Commit 25
git add pong.js
Do-Commit "feat(pong): AI paddle tracking with difficulty ramp and score management"

# Commit 26
git add pong.js
Do-Commit "feat(pong): Web Audio beep SFX for paddle hit and wall and main game-loop RAF"

# Commit 27
git add memory.js
Do-Commit "feat(memory): card dataset emoji pairs Fisher-Yates shuffle and deal"

# Commit 28
git add memory.js
Do-Commit "feat(memory): grid render CSS 3D flip animation and face back markup"

# Commit 29
git add memory.js
Do-Commit "feat(memory): match detection combo multiplier and matched card lock-in"

# Commit 30
git add memory.js
Do-Commit "feat(memory): countdown timer score calculation and win-screen overlay"

# Commit 31
git add whackamole.js
Do-Commit "feat(whack): mole grid setup 9-hole layout random spawn interval logic"

# Commit 32
git add whackamole.js
Do-Commit "feat(whack): hit detection on click tap score increment and miss penalty"

# Commit 33
git add whackamole.js
Do-Commit "feat(whack): difficulty ramp spawn speed increases every 10 points game loop"

# Commit 34
git add build_commits.ps1 build_commits.py push_34_commits.ps1
Do-Commit "chore: add arcade build helper scripts and push automation to repo"

Write-Host ""
Write-Host "Pushing all commits to origin/main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "All 34 commits pushed successfully!" -ForegroundColor Green
} else {
    Write-Warning "Push failed. Try: git push origin main --force-with-lease"
}
