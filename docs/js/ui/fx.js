// fx.js — confetti on the overlay canvas and coins that fly to the wallet (DOM + Web Animations). ≤ 30 live pieces.
export function createFx(game) {
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  const pieces = [];
  let raf = 0;
  let W = 0, H = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = ['#ff5f5f', '#ffc21c', '#45d65c', '#45b6ff', '#b76cff', '#ff6fae', '#ffe94d'];

  function frame() {
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of pieces) {
      if (p.dead) continue;
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vx *= 0.99;
      if (p.y > H + 40) { p.dead = true; continue; }
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.35);
      ctx.restore();
    }
    if (alive > 0) raf = requestAnimationFrame(frame);
    else {
      raf = 0;
      pieces.length = 0;
      ctx.clearRect(0, 0, W, H);
    }
  }

  function confetti(origin = null) {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = reduced ? 12 : origin ? 18 : 30;
    pieces.length = 0;
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: origin ? origin.x + (Math.random() - 0.5) * 40 : W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: origin ? origin.y : H * 0.35,
        vx: (Math.random() - 0.5) * (origin ? 12 : 16),
        vy: -8 - Math.random() * 10,
        vr: (Math.random() - 0.5) * 0.4,
        rot: Math.random() * Math.PI,
        w: 14 + Math.random() * 10,
        h: 10 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
      });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /** Coins fly from a screen point to the wallet. */
  function flyCoins(x, y, n = 3) {
    const app = document.getElementById('app');
    const target = game.walletPoint();
    const count = Math.min(5, Math.max(1, n));
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'coin-fly coin3';
      el.style.left = `${x - 18}px`;
      el.style.top = `${y - 18}px`;
      app.appendChild(el);
      const dx = target.x - x, dy = target.y - y;
      const midX = dx * 0.5 + (Math.random() - 0.5) * 120;
      const midY = dy * 0.5 - 120 - Math.random() * 60;
      const anim = el.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${midX}px, ${midY}px) scale(1.25)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.9 },
      ], { duration: 650 + i * 90, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', delay: i * 60, fill: 'forwards' });
      anim.onfinish = () => {
        el.remove();
        game.bumpWallet();
      };
      setTimeout(() => el.remove(), 1500 + i * 150);
    }
  }

  /** A small confetti burst from a screen point (a fun purchase, a sticker tap). */
  function burst(x, y) {
    confetti({ x, y });
  }

  /** Floating text ("+2", "−5") that rises and fades at a screen point. */
  function floatText(x, y, text, color = null) {
    const app = document.getElementById('app');
    const el = document.createElement('span');
    el.className = 'float-fx';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (color) el.style.color = color;
    app.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  return { confetti, burst, floatText, flyCoins, resize };
}
