// werk.js — "Auto's wassen" in a blocky 3D wash bay. A car drives onto the wet floor in front of the wash hall,
// mud splats (tappable DOM elements) stick to its faces; tap or swipe them away with foam, the car sparkles,
// drives off and pays 2 coins. Work is linear and bounded: a new car never comes sooner than minCycleMs.
import { createIso, shade, rgba } from '../iso.js';
import { startWork, endWork, washCar, setFlag } from '../economy.js';

const INK = '#1b1f3b';
const CAR_COLORS = ['#ff5f5f', '#45b6ff', '#45d65c', '#ffc21c', '#b76cff', '#ff6fae', '#2dd4bf', '#ff9f2e'];
const CAR_TYPES = ['sedan', 'van', 'pickup', 'sedan'];
// dirt slots on the car in face-local coordinates: side = 'y' (long lit side), 'x' (front), 'top' (hood/roof)
const SLOTS = [
  { side: 'y', u: 0.35, v: 0.28 }, { side: 'y', u: 1.4, v: 0.3 }, { side: 'y', u: 2.45, v: 0.26 },
  { side: 'x', u: 0.3, v: 0.3 }, { side: 'x', u: 1.0, v: 0.32 },
  { side: 'top', u: 2.3, v: 0.65 }, { side: 'top', u: 0.4, v: 0.6 },
];
const FOAM_MAX = 22; // SPEC §6: at most 30 live particles, and confetti may join in

/** Big blocky car for the wash bay, long axis along x, centred at (x, y). */
export function drawWashCar(iso, ctx, x, y, color, type = 'sedan', t = 0, bounce = 0) {
  const w = 2.8, d = 1.3;
  const x0 = x - w / 2, y0 = y - d / 2;
  const z = 0.22 + bounce;
  iso.shadow(x0, y0, w, d, 0.9, 0.9);
  const wc = '#1b1f3b', hub = '#c5ccd8';
  for (const dx of [-0.95, 0.75]) for (const dy of [-0.72, 0.5]) {
    iso.block(x + dx, y + dy, 0, 0.5, 0.22, 0.44, wc, { edge: false });
    iso.face(x + dx, y + dy, 0, 0.5, 0.22, 'y', 0.14, 0.1, 0.22, 0.24, hub);
  }
  iso.block(x0, y0, z, w, d, 0.62, color);                                           // body
  iso.block(x0 - 0.08, y0 + 0.05, z + 0.08, 0.1, d - 0.1, 0.22, '#e4e8ef');           // rear bumper
  iso.block(x0 + w - 0.02, y0 + 0.05, z + 0.08, 0.1, d - 0.1, 0.22, '#e4e8ef');       // front bumper
  iso.face(x0, y0, z, w, d, 'x', 0.14, 0.3, 0.26, 0.2, '#ffe94d', { edge: rgba(INK, 0.4) }); // headlights
  iso.face(x0, y0, z, w, d, 'x', d - 0.4, 0.3, 0.26, 0.2, '#ffe94d', { edge: rgba(INK, 0.4) });
  iso.face(x0, y0, z, w, d, 'x', 0.45, 0.12, 0.4, 0.14, '#5b6472', { edge: rgba(INK, 0.4) }); // grille
  iso.face(x0, y0, z, w, d, 'y', 0.2, 0.08, w - 0.4, 0.1, shade(color, -0.2));         // side stripe
  // cabin
  let cx = x0 + 0.7, cw = 1.5;
  if (type === 'van') { cx = x0 + 0.25; cw = 2.2; }
  if (type === 'pickup') { cx = x0 + 1.35; cw = 1.1; }
  const cd = d - 0.2, cy = y0 + 0.1, cz = z + 0.62, ch = type === 'van' ? 0.7 : 0.6;
  iso.block(cx, cy, cz, cw, cd, ch, shade(color, 0.06));
  iso.face(cx, cy, cz, cw, cd, 'y', 0.1, 0.1, cw - 0.2, ch - 0.22, '#bfe6ff', { edge: rgba(INK, 0.45) }); // side window
  iso.face(cx, cy, cz, cw, cd, 'x', 0.1, 0.1, cd - 0.2, ch - 0.22, '#bfe6ff', { edge: rgba(INK, 0.45) }); // windscreen
  if (type === 'pickup') { iso.block(x0 + 0.15, y0 + 0.12, z + 0.62, 1.05, d - 0.24, 0.18, shade(color, -0.35)); }
  if (type === 'van') iso.face(cx, cy, cz, cw, cd, 'y', 0.1, 0.1, 0.9, ch - 0.22, shade(color, 0.06), { edge: rgba(INK, 0.45) });
  // roof rack light on vans, mirror
  iso.block(cx + cw - 0.08, y0 + d - 0.02, cz + 0.2, 0.14, 0.12, 0.14, shade(color, -0.1));
  return { x0, y0, z, w, d, cx, cy, cz, cw, cd, ch };
}

export function createWerk(game) {
  const stage = document.getElementById('werk-stage');
  const car = document.getElementById('werk-car');
  const canvas = document.getElementById('werk-canvas');
  const countEl = document.getElementById('werk-count');
  const klaar = document.getElementById('btn-klaar');
  const ctx = canvas.getContext('2d');
  const iso = createIso(ctx, { unit: 80 });
  const staticCanvas = document.createElement('canvas');
  const sctx = staticCanvas.getContext('2d');
  const siso = createIso(sctx, { unit: 80 });
  let W = 0, H = 0, dpr = 1;
  let dirtLeft = 0;
  let ready = false;
  let visible = false;
  let carIndex = 0;
  let sessionCars = 0;
  let carShownAt = 0;
  let timers = [];
  let raf = 0;
  // car motion: world x offset (0 = parked), phase 'in' | 'wash' | 'out' | 'gone'
  const carState = { phase: 'gone', x: -7, t0: 0, color: CAR_COLORS[0], type: 'sedan' };
  const drops = [];
  const foam = [];

  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }
  function clearTimers() {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }
  function randomInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  // ---------- scene ----------

  function resize() {
    // clientWidth/Height ignore the screen's slide-in transform (getBoundingClientRect would measure it 3.5 % small)
    W = Math.max(320, stage.clientWidth || window.innerWidth);
    H = Math.max(240, stage.clientHeight || window.innerHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    staticCanvas.width = canvas.width;
    staticCanvas.height = canvas.height;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = Math.floor(Math.min(W / 13.5, (H - 120) / 7.2));
    iso.set(unit, W / 2 + unit * 0.4, H * 0.66);
    siso.set(unit, W / 2 + unit * 0.4, H * 0.66);
    drawStatic();
    repositionDirt();
  }

  function drawStatic() {
    const c = sctx;
    const u = siso.unit;
    c.clearRect(0, 0, W, H);
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5cc9f7');
    sky.addColorStop(0.55, '#a8e4ff');
    sky.addColorStop(0.56, '#1479cf');
    sky.addColorStop(1, '#0f5aa8');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    // floor: concrete slab with cliff edge, tiles, drain
    const fx = -4.6, fy = -3.6, fw = 9.2, fd = 6.4;
    for (let i = Math.round(u * 0.5); i >= 1; i--) {
      c.save();
      c.translate(0, i);
      siso.groundRect(fx, fy, fw, fd, 0.5, i > u * 0.25 ? '#7b8494' : '#9aa3b2');
      c.restore();
    }
    siso.groundRect(fx, fy, fw, fd, 0.5, '#cfd6e2', shade('#cfd6e2', -0.35), 0.08);
    siso.ground((cc) => {
      cc.strokeStyle = rgba('#8a93a3', 0.5);
      cc.lineWidth = 0.03;
      for (let gx = fx + 1; gx < fx + fw; gx += 1) { cc.beginPath(); cc.moveTo(gx, fy + 0.2); cc.lineTo(gx, fy + fd - 0.2); cc.stroke(); }
      for (let gy = fy + 1; gy < fy + fd; gy += 1) { cc.beginPath(); cc.moveTo(fx + 0.2, gy); cc.lineTo(fx + fw - 0.2, gy); cc.stroke(); }
    });
    // puddles
    siso.disc(-2.6, 1.6, 0.9, 0.5, rgba('#7dd3fc', 0.75));
    siso.disc(2.4, 1.9, 0.7, 0.4, rgba('#7dd3fc', 0.7));
    // wash hall behind the car
    const hx = -3.2, hy = -3.4, hw = 6.4, hd = 1.9, hh = 2.4;
    siso.shadow(hx, hy, hw, hd, hh);
    siso.block(hx, hy, 0, hw, hd, hh, '#4fb6ff');
    siso.block(hx - 0.1, hy - 0.1, hh, hw + 0.2, hd + 0.2, 0.26, shade('#4fb6ff', -0.32));
    siso.face(hx, hy, 0, hw, hd, 'y', 1.9, 0, 2.6, 1.8, '#1f2a44', { edge: rgba(INK, 0.5) }); // tunnel mouth
    for (let i = 0; i < 3; i++) siso.face(hx, hy, 0, hw, hd, 'y', 1.95 + i * 0.85, 1.55, 0.7, 0.16, '#ff5f5f'); // brush strip
    siso.face(hx, hy, 0, hw, hd, 'y', 0.35, 0.9, 1.1, 0.7, '#cfe9ff', { edge: rgba(INK, 0.4) });
    siso.face(hx, hy, 0, hw, hd, 'y', 4.95, 0.9, 1.1, 0.7, '#cfe9ff', { edge: rgba(INK, 0.4) });
    siso.block(hx + 1.3, hy - 0.15, hh + 0.26, 3.8, 0.16, 0.9, '#ffffff'); // sign
    const [sx, sy] = siso.P(hx + 3.2, hy + 0.02, hh + 0.72);
    c.save();
    c.translate(sx, sy);
    c.transform(1, 0.5, 0, 1, 0, 0);
    c.fillStyle = '#1a7ad6';
    c.font = `bold ${Math.round(u * 0.42)}px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('WASSTRAAT', 0, 0);
    c.restore();
    // brush rollers at the tunnel entrance
    siso.block(hx + 1.6, hy + hd + 0.1, 0, 0.4, 0.4, 1.6, '#ff5f5f');
    siso.block(hx + 4.4, hy + hd + 0.1, 0, 0.4, 0.4, 1.6, '#ff5f5f');
    // bucket with sponge, hose reel, cone
    siso.block(-4.1, 1.1, 0, 0.6, 0.6, 0.55, '#45b6ff');
    siso.slab(-4.05, 1.15, 0.55, 0.5, 0.5, '#ffffff');
    siso.block(-3.95, 1.2, 0.55, 0.3, 0.26, 0.2, '#ffe94d');
    siso.block(3.6, -0.4, 0, 0.7, 0.7, 0.5, '#45d65c');
    siso.block(3.7, -0.3, 0.5, 0.5, 0.5, 0.1, '#1d9a37');
    siso.pyramid(3.5, 1.5, 0, 0.5, 0.5, 0.8, '#ff9f2e');
    siso.block(3.45, 1.45, 0, 0.6, 0.6, 0.06, '#ff9f2e');
    // palm at the right edge for the island feel
    siso.block(4.2, -2.6, 0, 0.18, 0.18, 1.8, '#b5763f');
    for (let i = 0; i < 4; i++) siso.block(3.8 + (i % 2) * 0.55, -2.9 + Math.floor(i / 2) * 0.55, 1.7 + (i % 3) * 0.08, 0.6, 0.6, 0.18, '#3fbf5a');
  }

  function carX(now) {
    const s = carState;
    if (s.phase === 'in') {
      const f = Math.min(1, (now - s.t0) / game.config.work.carArriveMs);
      const e = 1 - Math.pow(1 - f, 3);
      return -7 + 7 * e;
    }
    if (s.phase === 'out') {
      const f = Math.min(1, (now - s.t0) / game.config.work.carLeaveMs);
      return 0 + 8 * f * f;
    }
    if (s.phase === 'wash') return 0;
    return -7;
  }

  function render(now) {
    if (!visible) return;
    ctx.drawImage(staticCanvas, 0, 0, W, H);
    // water spray from the hall (ambient)
    for (let i = 0; i < 6; i++) {
      const f = ((now / 900) + i / 6) % 1;
      const [px, py] = iso.P(-0.6 + i * 0.5, -1.5, 1.7 - f * 1.5);
      ctx.beginPath();
      ctx.arc(px, py, 3 + f * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190,235,255,${0.9 - f * 0.8})`;
      ctx.fill();
    }
    if (carState.phase !== 'gone') {
      const x = carX(now);
      const bounce = carState.phase === 'in' ? Math.abs(Math.sin(now / 90)) * 0.03 : 0;
      drawWashCar(iso, ctx, x, 0, carState.color, carState.type, now, bounce);
      if (carState.phase === 'in' || carState.phase === 'out') {
        // little dust puffs behind the wheels
        for (let i = 0; i < 3; i++) {
          const [px, py] = iso.P(x - 1.5 - i * 0.3, 0.7, 0.1 + i * 0.05);
          ctx.beginPath();
          ctx.arc(px, py, 6 + i * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.35 - i * 0.1})`;
          ctx.fill();
        }
      }
    }
    // foam particles on the canvas
    for (let i = foam.length - 1; i >= 0; i--) {
      const p = foam[i];
      const f = (now - p.t0) / p.dur;
      if (f >= 1) { foam.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x + p.vx * f * 60, p.y + p.vy * f * 60 - f * 40, p.r * (0.6 + f), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.9 - f * 0.9})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(render);
  }

  // ---------- dirt (DOM, tappable) ----------

  function slotPoint(slot, geo) {
    if (slot.side === 'y') return iso.P(geo.x0 + slot.u, geo.y0 + geo.d, geo.z + slot.v);
    if (slot.side === 'x') return iso.P(geo.x0 + geo.w, geo.y0 + slot.u, geo.z + slot.v);
    return iso.P(geo.x0 + slot.u, geo.y0 + slot.v, geo.z + 0.62);
  }

  const CAR_GEO = { x0: -1.4, y0: -0.65, z: 0.22, w: 2.8, d: 1.3 };

  function placeDirt(n) {
    clearSpots();
    const chosen = SLOTS.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const slot of chosen) {
      const [px, py] = slotPoint(slot, CAR_GEO);
      const d = document.createElement('div');
      d.className = 'dirt';
      d.style.left = `${px}px`;
      d.style.top = `${py}px`;
      d.style.setProperty('--rot', `${randomInt(-25, 25)}deg`);
      d.dataset.slot = String(SLOTS.indexOf(slot));
      d.appendChild(document.createElement('i'));
      car.appendChild(d);
    }
  }

  /** After a resize the car is projected anew: move the splats along. */
  function repositionDirt() {
    for (const d of car.querySelectorAll('.dirt')) {
      const slot = SLOTS[Number(d.dataset.slot)];
      if (!slot) continue;
      const [px, py] = slotPoint(slot, CAR_GEO);
      d.style.left = `${px}px`;
      d.style.top = `${py}px`;
    }
  }

  function newCar() {
    if (!visible) return;
    clearSpots();
    carIndex++;
    carState.color = CAR_COLORS[(carIndex - 1) % CAR_COLORS.length];
    carState.type = CAR_TYPES[(carIndex - 1) % CAR_TYPES.length];
    carState.phase = 'in';
    carState.t0 = performance.now();
    const n = randomInt(game.config.work.dirtMin, game.config.work.dirtMax);
    dirtLeft = n;
    ready = false;
    car.className = 'werk-car in';
    carShownAt = performance.now();
    game.audio.play('whoosh');
    later(() => {
      carState.phase = 'wash';
      placeDirt(n);
      ready = true;
    }, game.config.work.carArriveMs);
  }

  function clearSpots() {
    for (const d of car.querySelectorAll('.dirt, .bubble-fx, .sparkle-fx, .float-fx')) d.remove();
  }

  function bubbles(x, y) {
    const rect = car.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const b = document.createElement('span');
      b.className = 'bubble-fx';
      b.style.left = `${x - rect.left - 14}px`;
      b.style.top = `${y - rect.top - 14}px`;
      b.style.setProperty('--dx', `${(Math.random() - 0.5) * 140}px`);
      b.style.setProperty('--dy', `${-40 - Math.random() * 100}px`);
      car.appendChild(b);
      later(() => b.remove(), 800);
    }
    const srect = stage.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      if (foam.length >= FOAM_MAX) break;
      foam.push({ x: x - srect.left, y: y - srect.top, vx: (Math.random() - 0.5) * 2, vy: -Math.random(), r: 5 + Math.random() * 7, t0: performance.now(), dur: 500 + Math.random() * 300 });
    }
  }

  function clean(spot, x, y) {
    if (!ready || spot.classList.contains('gone')) return;
    // the splat stays in the DOM (invisible, no pointer events) until the next car: removing it mid-swipe
    // would end the touch sequence on iOS
    spot.classList.add('gone');
    dirtLeft--;
    game.audio.play('bubble');
    bubbles(x, y);
    if (dirtLeft <= 0) carDone();
  }

  function carDone() {
    ready = false;
    game.audio.play('sparkle');
    const [cx, cy] = iso.P(0, 0, 1.4);
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle-fx';
      s.textContent = '✨';
      s.style.left = `${cx - 120 + i * 100}px`;
      s.style.top = `${cy - 60 + (i % 2) * 70}px`;
      car.appendChild(s);
      later(() => s.remove(), 700);
    }
    const plus = document.createElement('span');
    plus.className = 'float-fx';
    plus.textContent = `+${game.config.work.coinsPerCar}`;
    plus.style.left = `${cx - 20}px`;
    plus.style.top = `${cy - 40}px`;
    car.appendChild(plus);
    later(() => plus.remove(), 900);
    sessionCars++;
    countEl.querySelector('span').textContent = String(sessionCars);
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
    game.update((s) => washCar(s, game.config, game.now()));
    game.audio.play('coin');
    const srect = stage.getBoundingClientRect();
    game.fx.flyCoins(srect.left + cx, srect.top + cy, 2);
    const st = game.state;
    if (st.carsWashed >= game.config.work.tiredAfterCars && !st.flags.tiredSaid) {
      game.update((s) => setFlag(s, 'tiredSaid', true));
      later(() => game.mentor.say('lines.tired', {}, { kind: 'reaction' }), 400);
    }
    later(() => {
      carState.phase = 'out';
      carState.t0 = performance.now();
      car.className = 'werk-car out';
      game.audio.play('whoosh');
      const elapsed = performance.now() - carShownAt;
      const wait = Math.max(game.config.work.carLeaveMs, game.config.work.minCycleMs - elapsed);
      later(() => { carState.phase = 'gone'; }, game.config.work.carLeaveMs);
      later(newCar, wait);
    }, 450);
  }

  function hitAt(x, y) {
    const target = document.elementFromPoint(x, y);
    const spot = target && target.closest ? target.closest('.dirt') : null;
    if (spot) { clean(spot, x, y); return true; }
    return false;
  }

  /** A tap that misses (or comes while the car is still driving in) still answers with a splash. */
  function splash(x, y) {
    const srect = stage.getBoundingClientRect();
    for (let i = 0; i < 4; i++) {
      if (foam.length >= FOAM_MAX) break;
      foam.push({ x: x - srect.left, y: y - srect.top, vx: (Math.random() - 0.5) * 2.5, vy: -Math.random(), r: 4 + Math.random() * 5, t0: performance.now(), dur: 350 + Math.random() * 250 });
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!hitAt(e.clientX, e.clientY)) splash(e.clientX, e.clientY);
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    hitAt(e.clientX, e.clientY);
  });

  klaar.addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });

  window.addEventListener('resize', () => { if (visible) resize(); });

  return {
    show() {
      visible = true;
      sessionCars = 0;
      countEl.querySelector('span').textContent = '0';
      resize();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
      game.update((s) => startWork(s, game.now()));
      carState.phase = 'gone';
      later(newCar, 120);
      if (!game.state.flags.workIntro) {
        game.update((s) => setFlag(s, 'workIntro', true));
        later(() => game.mentor.say('lines.firstWork', {}, { kind: 'reaction' }), 500);
      }
    },
    hide() {
      visible = false;
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimers();
      clearSpots();
      foam.length = 0;
      carState.phase = 'gone';
      car.className = 'werk-car';
      game.update((s) => endWork(s));
      game.save();
    },
    render() {},
  };
}
