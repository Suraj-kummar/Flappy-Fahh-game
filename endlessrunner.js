
"use strict";
// ── Endless Runner ─────────────────────────────────────────────
const EndlessRunnerGame = (() => {
  const KEY = "runner_best";

  let canvas, ctx, animId;
  let player, obstacles, particles, clouds;
  let score, speed, frameCount, gameState;
  let groundY;
  let keys;

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    canvas.removeEventListener("keydown", onKey);
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onClick);
    keys = {};
    resetGame();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  function resetGame() {
    groundY = canvas.height - 50;
    score = 0; speed = 4; frameCount = 0;
    gameState = "start"; // 'start' | 'playing' | 'dead'
    player = {
      x: 80, y: groundY - 48,
      vy: 0, w: 36, h: 48,
      onGround: true,
      ducking: false,
      jumpCount: 0,
      animFrame: 0,
      color: "#f9ca24"
    };
    obstacles = [];
    particles = [];
    clouds = [
      {x:200,y:40,w:90,opacity:0.3},
      {x:400,y:25,w:120,opacity:0.2},
      {x:520,y:55,w:70,opacity:0.25}
    ];
  }

  function onKey(e) {
    if (["Space","ArrowUp","ArrowDown"].includes(e.code)) {
      e.preventDefault();
      handleAction(e.code);
    }
  }

  function onClick() {
    if (gameState === "start" || gameState === "dead") {
      resetGame(); gameState = "playing"; return;
    }
    handleAction("Space");
  }

  function handleAction(code) {
    if (gameState === "start" || gameState === "dead") {
      resetGame(); gameState = "playing"; return;
    }
    if (code === "ArrowDown") {
      player.ducking = true;
    } else if (code === "Space" || code === "ArrowUp") {
      player.ducking = false;
      if (player.jumpCount < 2) {
        player.vy = -13;
        player.onGround = false;
        player.jumpCount++;
        spawnJumpParticles();
      }
    }
  }

  window.addEventListener("keyup", e => {
    if (e.code === "ArrowDown") { if (player) player.ducking = false; }
  });

  function spawnJumpParticles() {
    for (let i=0;i<6;i++) {
      particles.push({
        x: player.x + player.w/2,
        y: player.y + player.h,
        vx: (Math.random()-0.5)*4,
        vy: Math.random()*2+1,
        life: 1, color:"#f9ca24", size: Math.random()*4+2
      });
    }
  }

  function spawnDeathParticles() {
    for (let i=0;i<20;i++) {
      particles.push({
        x: player.x + player.w/2,
        y: player.y + player.h/2,
        vx: (Math.random()-0.5)*8,
        vy: (Math.random()-0.5)*8,
        life: 1, color:["#f9ca24","#ff6b6b","#4ecca3"][Math.floor(Math.random()*3)],
        size: Math.random()*6+3
      });
    }
  }

  const OBS_TYPES = [
    { type:"cactus", w:22, h:48, color:"#00b894", color2:"#55efc4" },
    { type:"cactus", w:36, h:60, color:"#00cec9", color2:"#81ecec" },
    { type:"flying", w:44, h:22, color:"#a29bfe", color2:"#6c5ce7", yOff:-90 },
    { type:"flying", w:34, h:20, color:"#fd79a8", color2:"#e84393", yOff:-60 },
    { type:"barrier", w:18, h:70, color:"#e17055", color2:"#ff7675" },
  ];

  function spawnObstacle() {
    const t = OBS_TYPES[Math.floor(Math.random()*OBS_TYPES.length)];
    const yOff = t.yOff || 0;
    obstacles.push({
      x: canvas.width + 20,
      y: groundY - t.h + yOff,
      w: t.w, h: t.h,
      type: t.type, color:t.color, color2:t.color2
    });
  }

  function checkCollision() {
    const ph = player.ducking ? player.h*0.5 : player.h;
    const py = player.ducking ? player.y + player.h*0.5 : player.y;
    for (const obs of obstacles) {
      if (player.x+8 < obs.x+obs.w &&
          player.x+player.w-8 > obs.x &&
          py+8 < obs.y+obs.h &&
          py+ph-4 > obs.y) {
        return true;
      }
    }
    return false;
  }

  function gameLoop() {
    animId = requestAnimationFrame(gameLoop);
    const W=canvas.width, H=canvas.height;

    // Sky gradient
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,"#0a0a1a"); sky.addColorStop(0.7,"#1a1a33"); sky.addColorStop(1,"#2a1a0a");
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

    // Stars (parallax)
    ctx.fillStyle="rgba(255,255,255,0.6)";
    for (let i=0;i<30;i++) {
      const sx=((i*137+frameCount*0.2)%W);
      const sy=(i*71)%( groundY-20);
      ctx.fillRect(sx,sy,1.5,1.5);
    }

    // Clouds
    clouds.forEach(c => {
      c.x -= speed*0.15;
      if (c.x + c.w < 0) c.x = W + Math.random()*100;
      ctx.fillStyle=`rgba(255,255,255,${c.opacity})`;
      drawCloud(c.x,c.y,c.w);
    });

    // Ground
    const gg=ctx.createLinearGradient(0,groundY,0,H);
    gg.addColorStop(0,"#2d3561"); gg.addColorStop(1,"#1a1a2e");
    ctx.fillStyle=gg; ctx.fillRect(0,groundY,W,H-groundY);
    // Ground line
    ctx.strokeStyle="#4ecca3"; ctx.lineWidth=2;
    ctx.setLineDash([8,6]); ctx.beginPath();
    const dashOff=(frameCount*speed)%14;
    ctx.moveTo(0,groundY); ctx.lineTo(W,groundY);
    ctx.lineDashOffset=-dashOff; ctx.stroke(); ctx.setLineDash([]);

    // Update + draw particles
    for (let i=particles.length-1;i>=0;i--) {
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life-=0.04;
      if (p.life<=0){particles.splice(i,1);continue;}
      ctx.globalAlpha=p.life;
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }

    if (gameState==="playing") {
      frameCount++;
      // Speed up
      speed = 4 + frameCount/500;
      score = Math.floor(frameCount/6);

      // Spawn obstacles
      const spawnRate = Math.max(60, 110 - frameCount/50);
      if (frameCount%Math.floor(spawnRate)===0) spawnObstacle();

      // Move obstacles
      obstacles.forEach(o => o.x -= speed);
      obstacles = obstacles.filter(o => o.x + o.w > 0);

      // Player physics
      if (!player.onGround) {
        player.vy += 0.65;
        player.y += player.vy;
        if (player.y >= groundY - player.h) {
          player.y = groundY - player.h;
          player.vy = 0;
          player.onGround = true;
          player.jumpCount = 0;
        }
      }
      player.animFrame = (player.animFrame + 0.25) % 2;

      if (checkCollision()) {
        gameState="dead";
        spawnDeathParticles();
        const best=parseInt(localStorage.getItem(KEY)||"0");
        if (score>best) localStorage.setItem(KEY,score);
      }
    }

    // Draw obstacles
    obstacles.forEach(obs => drawObstacle(obs));

    // Draw player
    if (gameState !== "dead") drawPlayer();

    // HUD
    ctx.fillStyle="#f9ca24"; ctx.font="bold 18px 'Outfit',sans-serif";
    ctx.textAlign="left"; ctx.fillText(`Score: ${score}`, 12, 26);
    const best=localStorage.getItem(KEY);
    ctx.fillStyle="#4ecca3"; ctx.textAlign="right";
    ctx.fillText(`🏆 ${best||0}`, W-12, 26);
    ctx.textAlign="left";

    // State overlays
    if (gameState==="start") {
      ctx.fillStyle="rgba(0,0,0,0.65)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#f9ca24"; ctx.font="bold 30px 'Outfit',sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("🏃 ENDLESS RUNNER", W/2, H/2-30);
      ctx.fillStyle="#4ecca3"; ctx.font="16px 'Outfit',sans-serif";
      ctx.fillText("SPACE / ↑ = Jump  |  ↓ = Duck", W/2, H/2+10);
      ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font="13px 'Outfit',sans-serif";
      ctx.fillText("Click or press any key to start", W/2, H/2+40);
      ctx.textBaseline="alphabetic"; ctx.textAlign="left";
    } else if (gameState==="dead") {
      ctx.fillStyle="rgba(0,0,0,0.7)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#ff6b6b"; ctx.font="bold 28px 'Outfit',sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("💀 GAME OVER", W/2, H/2-30);
      ctx.fillStyle="#f9ca24"; ctx.font="20px 'Outfit',sans-serif";
      ctx.fillText(`Score: ${score}`, W/2, H/2+5);
      const b=localStorage.getItem(KEY);
      ctx.fillStyle=score>=parseInt(b||0)?"#4ecca3":"#aaa";
      ctx.font="15px 'Outfit',sans-serif";
      ctx.fillText(score>=parseInt(b||0)?"🏆 NEW BEST!":"Best: "+b, W/2, H/2+32);
      ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="13px 'Outfit',sans-serif";
      ctx.fillText("Click or press to try again", W/2, H/2+58);
      ctx.textBaseline="alphabetic"; ctx.textAlign="left";
    }
  }

  function drawPlayer() {
    const ph = player.ducking ? player.h*0.5 : player.h;
    const py = player.ducking ? player.y + player.h*0.5 : player.y;
    const bobY = player.onGround ? Math.sin(player.animFrame*Math.PI)*2 : 0;

    ctx.save();
    // Body glow
    ctx.shadowColor="#f9ca24"; ctx.shadowBlur=10;
    ctx.fillStyle="#f9ca24";
    ctx.fillRect(player.x, py+bobY, player.w, ph);
    ctx.shadowBlur=0;
    // Legs animation (running)
    if (player.onGround && !player.ducking) {
      const legOff=Math.sin(player.animFrame*Math.PI*2)*8;
      ctx.fillStyle="#e17055";
      ctx.fillRect(player.x+4,py+ph+bobY,10,8+legOff);
      ctx.fillRect(player.x+player.w-14,py+ph+bobY,10,8-legOff);
    }
    // Eye
    ctx.fillStyle="#0f0f1a";
    ctx.beginPath(); ctx.arc(player.x+player.w-8,py+10+bobY,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#4ecca3";
    ctx.beginPath(); ctx.arc(player.x+player.w-7,py+9+bobY,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawObstacle(obs) {
    ctx.save();
    const g=ctx.createLinearGradient(obs.x,obs.y,obs.x+obs.w,obs.y+obs.h);
    g.addColorStop(0,obs.color); g.addColorStop(1,obs.color2);
    ctx.shadowColor=obs.color; ctx.shadowBlur=8;
    ctx.fillStyle=g;
    if (obs.type==="flying") {
      // Flying obstacle: UFO shape
      ctx.beginPath();
      ctx.ellipse(obs.x+obs.w/2, obs.y+obs.h/2, obs.w/2, obs.h/2, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle="#fff";
      ctx.beginPath();
      ctx.arc(obs.x+obs.w/2,obs.y+obs.h/2,6,0,Math.PI*2); ctx.fill();
    } else {
      // Cactus / barrier
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      if (obs.type==="cactus") {
        ctx.fillRect(obs.x-10, obs.y+10, 10, 8);
        ctx.fillRect(obs.x+obs.w, obs.y+20, 10, 8);
      }
    }
    ctx.restore();
  }

  function drawCloud(x,y,w) {
    ctx.beginPath();
    ctx.arc(x+w*0.3,y,w*0.22,0,Math.PI*2);
    ctx.arc(x+w*0.55,y-w*0.1,w*0.28,0,Math.PI*2);
    ctx.arc(x+w*0.78,y,w*0.2,0,Math.PI*2);
    ctx.fill();
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    if (canvas) canvas.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
  }

  return { init, destroy };
})();

// arcade-hub: duck registered
