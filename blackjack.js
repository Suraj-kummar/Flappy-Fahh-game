
"use strict";
// ── Blackjack ──────────────────────────────────────────────────
const BlackjackGame = (() => {
  const KEY_CHIPS = "blackjack_chips";

  let canvas, ctx;
  let deck, playerHand, dealerHand;
  let chips, bet, phase; // phase: 'bet' | 'player' | 'dealer' | 'result'
  let resultMsg, resultColor;
  let animId;

  const SUITS = ["♠","♥","♦","♣"];
  const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const RED_SUITS = new Set(["♥","♦"]);

  function freshDeck() {
    const d = [];
    for (const s of SUITS)
      for (const v of VALUES)
        d.push({ suit: s, value: v });
    for (let i = d.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [d[i],d[j]] = [d[j],d[i]];
    }
    return d;
  }

  function cardValue(card, aces11=true) {
    if (["J","Q","K"].includes(card.value)) return 10;
    if (card.value === "A") return aces11 ? 11 : 1;
    return parseInt(card.value);
  }

  function handTotal(hand) {
    let total = 0, aces = 0;
    for (const c of hand) { total += cardValue(c); if (c.value==="A") aces++; }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    chips = parseInt(localStorage.getItem(KEY_CHIPS)||"1000");
    bet = 0;
    phase = "bet";
    resultMsg = "";

    canvas.removeEventListener("click", onCanvasClick);
    canvas.addEventListener("click", onCanvasClick);

    deck = freshDeck();
    playerHand = []; dealerHand = [];

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    handleClick(mx, my);
  }

  // Button layout
  const BET_CHIPS = [10, 25, 50, 100, 200];

  function handleClick(mx, my) {
    const W = canvas.width, H = canvas.height;
    if (phase === "bet") {
      // Bet chip buttons: row near bottom
      const btnY = H - 80, btnW = 64, btnH = 38, gap = 14;
      const totalW = BET_CHIPS.length*(btnW+gap) - gap;
      let startX = (W - totalW)/2;
      for (let i=0; i<BET_CHIPS.length; i++) {
        const bx = startX + i*(btnW+gap);
        if (mx>=bx && mx<=bx+btnW && my>=btnY && my<=btnY+btnH) {
          if (chips >= BET_CHIPS[i]) { bet += BET_CHIPS[i]; chips -= BET_CHIPS[i]; }
        }
      }
      // Clear bet button
      const clearX = W/2 - 50, clearY = H-130, clearW=100, clearH=34;
      if (mx>=clearX&&mx<=clearX+clearW&&my>=clearY&&my<=clearY+clearH) {
        chips += bet; bet = 0;
      }
      // Deal button
      const dealX = W/2-55, dealY = H-38, dealW=110, dealH=32;
      if (mx>=dealX&&mx<=dealX+dealW&&my>=dealY&&my<=dealY+dealH && bet>0) {
        startDeal();
      }
    } else if (phase === "player") {
      const bY = H-52;
      // HIT
      if (mx>=W/2-130&&mx<=W/2-20&&my>=bY&&my<=bY+36) doHit();
      // STAND
      if (mx>=W/2+20&&mx<=W/2+130&&my>=bY&&my<=bY+36) doStand();
      // DOUBLE
      if (mx>=W/2-220&&mx<=W/2-140&&my>=bY&&my<=bY+36 && chips>=bet) doDouble();
    } else if (phase === "result") {
      // Click anywhere to restart bet phase
      chips = parseInt(localStorage.getItem(KEY_CHIPS)||chips.toString());
      if (chips <= 0) chips = 1000;
      bet = 0;
      phase = "bet";
      deck = freshDeck();
      playerHand=[]; dealerHand=[];
    }
  }

  function startDeal() {
    if (deck.length < 10) deck = freshDeck();
    playerHand = [deck.pop(), deck.pop()];
    dealerHand = [deck.pop(), deck.pop()];
    phase = "player";
    if (handTotal(playerHand) === 21) { dealerReveal(); }
  }

  function doHit() {
    playerHand.push(deck.pop());
    if (handTotal(playerHand) > 21) endGame("bust");
  }

  function doStand() { dealerReveal(); }

  function doDouble() {
    chips -= bet; bet *= 2;
    playerHand.push(deck.pop());
    if (handTotal(playerHand) > 21) endGame("bust");
    else dealerReveal();
  }

  function dealerReveal() {
    phase = "dealer";
    while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());
    const pt = handTotal(playerHand), dt = handTotal(dealerHand);
    if (pt > 21) endGame("bust");
    else if (dt > 21 || pt > dt) endGame("win");
    else if (pt === dt) endGame("push");
    else endGame("lose");
  }

  function endGame(outcome) {
    phase = "result";
    if (outcome === "win" || outcome === "blackjack") {
      const winMult = outcome === "blackjack" ? 1.5 : 1;
      chips += bet + Math.floor(bet * winMult);
      resultMsg = outcome === "blackjack" ? "🃏 BLACKJACK! +"+Math.floor(bet*winMult) : "🎉 YOU WIN! +"+bet;
      resultColor = "#4ecca3";
    } else if (outcome === "push") {
      chips += bet;
      resultMsg = "🤝 PUSH — bet returned";
      resultColor = "#f9ca24";
    } else if (outcome === "bust") {
      resultMsg = "💥 BUST! -"+bet;
      resultColor = "#ff6b6b";
    } else {
      resultMsg = "😞 DEALER WINS -"+bet;
      resultColor = "#ff6b6b";
    }
    localStorage.setItem(KEY_CHIPS, chips);
    bet = 0;
  }

  function drawCard(card, x, y, hidden=false) {
    const W2=55, H2=80, R=8;
    ctx.save();
    // Shadow
    ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=12;
    // Card body
    ctx.fillStyle = hidden ? "#1a2a4a" : "#fefefe";
    ctx.beginPath();
    ctx.moveTo(x+R,y); ctx.lineTo(x+W2-R,y);
    ctx.quadraticCurveTo(x+W2,y,x+W2,y+R);
    ctx.lineTo(x+W2,y+H2-R);
    ctx.quadraticCurveTo(x+W2,y+H2,x+W2-R,y+H2);
    ctx.lineTo(x+R,y+H2);
    ctx.quadraticCurveTo(x,y+H2,x,y+H2-R);
    ctx.lineTo(x,y+R);
    ctx.quadraticCurveTo(x,y,x+R,y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur=0;
    // Border
    ctx.strokeStyle = hidden ? "#2a3a6a" : "#ddd";
    ctx.lineWidth=1.5; ctx.stroke();
    if (hidden) {
      // Card back pattern
      ctx.fillStyle="#16213e";
      ctx.fillRect(x+8,y+8,W2-16,H2-16);
      ctx.restore();
      return;
    }
    const isRed = RED_SUITS.has(card.suit);
    ctx.fillStyle = isRed ? "#e84393" : "#1a1a2e";
    ctx.font = "bold 11px 'Outfit', sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText(card.value, x+5, y+4);
    ctx.font = "10px serif";
    ctx.fillText(card.suit, x+5, y+16);
    // Center suit
    ctx.font = "22px serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(card.suit, x+W2/2, y+H2/2);
    ctx.restore();
  }

  function drawHand(hand, label, x, y, hideSecond=false) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px 'Outfit', sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    const total = hideSecond ? "?" : handTotal(hand);
    ctx.fillStyle = "#ccc";
    ctx.fillText(`${label}  [${total}]`, x, y-8);
    for (let i=0; i<hand.length; i++) {
      drawCard(hand[i], x + i*62, y, hideSecond && i===1);
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    // Background
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#0a1628");
    bg.addColorStop(1,"#0f2744");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Felt table
    ctx.fillStyle="rgba(0,80,30,0.15)";
    ctx.beginPath();
    ctx.ellipse(W/2, H*0.5, W*0.45, H*0.32, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle="rgba(0,180,60,0.2)"; ctx.lineWidth=3; ctx.stroke();

    // Chips & bet
    ctx.fillStyle="#f9ca24"; ctx.font="bold 18px 'Outfit',sans-serif";
    ctx.textAlign="left"; ctx.fillText(`💰 ${chips}`, 16, 30);
    ctx.fillStyle="#4ecca3"; ctx.textAlign="right";
    ctx.fillText(`🎯 Bet: ${bet}`, W-16, 30);
    ctx.textAlign="left";

    if (phase === "bet") {
      // Instructions
      ctx.fillStyle="#8899bb";
      ctx.font="14px 'Outfit',sans-serif";
      ctx.textAlign="center";
      ctx.fillText("Place your bet, then Deal!", W/2, H/2-60);

      // Bet chip buttons
      const btnY = H-80, btnW=64, btnH=38, gap=14;
      const totalW = BET_CHIPS.length*(btnW+gap)-gap;
      let startX=(W-totalW)/2;
      for (let i=0;i<BET_CHIPS.length;i++) {
        const bx=startX+i*(btnW+gap);
        const enabled = chips>=BET_CHIPS[i];
        const g=ctx.createLinearGradient(bx,btnY,bx,btnY+btnH);
        g.addColorStop(0,enabled?"#f9ca24":"#4a4a4a");
        g.addColorStop(1,enabled?"#e17055":"#333");
        ctx.fillStyle=g;
        roundRect(ctx,bx,btnY,btnW,btnH,8); ctx.fill();
        ctx.fillStyle=enabled?"#1a1a2e":"#666";
        ctx.font="bold 15px 'Outfit',sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("+"+BET_CHIPS[i], bx+btnW/2, btnY+btnH/2);
        ctx.textBaseline="alphabetic";
      }

      // Clear bet
      if (bet>0) {
        const cx2=W/2-50, cy2=H-130, cw2=100, ch2=34;
        ctx.fillStyle="rgba(255,100,100,0.3)";
        roundRect(ctx,cx2,cy2,cw2,ch2,8); ctx.fill();
        ctx.strokeStyle="#ff6b6b"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#ff6b6b"; ctx.font="14px 'Outfit',sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("✖ Clear", cx2+50, cy2+17);
        ctx.textBaseline="alphabetic";
      }

      // Deal button
      if (bet>0) {
        const dx=W/2-55, dy=H-38;
        const dg=ctx.createLinearGradient(dx,dy,dx,dy+32);
        dg.addColorStop(0,"#4ecca3"); dg.addColorStop(1,"#00b894");
        ctx.fillStyle=dg;
        roundRect(ctx,dx,dy,110,32,10); ctx.fill();
        ctx.fillStyle="#0f0f1a"; ctx.font="bold 16px 'Outfit',sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("▶ DEAL", W/2, dy+16);
        ctx.textBaseline="alphabetic";
      }
      ctx.textAlign="left";

    } else if (phase === "player" || phase === "dealer" || phase === "result") {
      const hideDealer = phase === "player";
      drawHand(dealerHand, "DEALER", 40, 70, hideDealer);
      drawHand(playerHand, "YOU", 40, 260);

      if (phase === "player") {
        const bY = H-52;
        // Double button
        if (chips>=bet) {
          drawButton("2x DOUBLE", W/2-220, bY, 78, 36, "#6c5ce7","#a29bfe");
        }
        // Hit button
        drawButton("HIT", W/2-130, bY, 108, 36, "#00b894","#4ecca3");
        // Stand button
        drawButton("STAND", W/2+20, bY, 108, 36, "#e17055","#ff6b6b");
      } else if (phase === "result") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0,H/2-28,W,90);
        ctx.fillStyle = resultColor;
        ctx.font = "bold 26px 'Outfit',sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(resultMsg, W/2, H/2+10);
        ctx.fillStyle = "#8899bb";
        ctx.font = "14px 'Outfit',sans-serif";
        ctx.fillText("Tap anywhere to continue", W/2, H/2+42);
        ctx.textAlign="left"; ctx.textBaseline="alphabetic";
      }
    }
  }

  function drawButton(label, x, y, w, h, c1, c2) {
    const g=ctx.createLinearGradient(x,y,x,y+h);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle=g;
    roundRect(ctx,x,y,w,h,10); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 14px 'Outfit',sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(label, x+w/2, y+h/2);
    ctx.textBaseline="alphabetic"; ctx.textAlign="left";
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    if (canvas) canvas.removeEventListener("click", onCanvasClick);
  }

  return { init, destroy };
})();
