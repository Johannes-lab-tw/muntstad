// huis.js — the child's yard as a blocky 3D scene: the house (paintable), lawn with fence and path, garden props,
// pets that wander and nap, the avatar (hat/skin) with jump/dance/salto, the trampoline, fireworks, sticker wall.
// The scene is canvas; transparent DOM hit areas (.hit) sit over the avatar, pets, trampoline and house so taps
// (and the tests) find them.
import { createIso, shade, rgba } from '../iso.js';
import { house as drawHouse } from '../art/buildings.js';
import { drawAvatar } from '../art/avatar.js';
import { drawProp } from '../art/props.js';
import { drawPet } from '../art/pets.js';
import { isFunActive, setFlag } from '../economy.js';

const INK = '#1b1f3b';
const YARD = { w: 9.5, d: 7 };
const HOUSE_AT = [2.7, 1.5];
const AVATAR_HOME = [5.6, 4.5];
const TRAMPOLINE_AT = [7.6, 5.2];
// garden slots (world), kept clear of the house, the path and the trampoline
const GARDEN_SLOTS = [[1.0, 4.4], [1.4, 6.1], [3.3, 6.3], [7.1, 1.1], [8.6, 6.2], [8.7, 2.3], [5.9, 1.2], [1.0, 2.8], [8.6, 4.1], [2.7, 4.0], [7.0, 3.1], [3.4, 3.2]];
const PET_SLOTS = [[3.4, 5.2], [6.6, 6.2], [2.2, 5.3], [7.8, 2.8], [5.0, 2.6]];

export function createHuis(game) {
  const scene = document.getElementById('huis-scene');
  const stickerGrid = document.getElementById('sticker-grid');
  const actions = document.getElementById('huis-actions');
  const canvas = document.createElement('canvas');
  canvas.id = 'huis-canvas';
  const hits = document.createElement('div');
  hits.className = 'hits';
  scene.append(canvas, hits);
  const ctx = canvas.getContext('2d');
  const iso = createIso(ctx, { unit: 60 });
  const staticCanvas = document.createElement('canvas');
  const sctx = staticCanvas.getContext('2d');
  const siso = createIso(sctx, { unit: 60 });
  let W = 0, H = 0, dpr = 1;
  let signature = '';
  let visible = false;
  let raf = 0;
  let state = null;
  const avatar = { pose: 'idle', until: 0, z: 0 };
  const pets = new Map(); // id → { x, y, tx, ty, facing, phase, nextMove }
  const hitEls = {};

  document.getElementById('huis-stad').addEventListener('click', () => { game.audio.play('tap'); game.show('stad'); });
  document.getElementById('huis-winkel').addEventListener('click', () => { game.audio.play('tap'); game.show('winkel'); });

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- layout ----------

  function resize() {
    const rect = scene.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(240, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    staticCanvas.width = canvas.width;
    staticCanvas.height = canvas.height;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = Math.floor(Math.min((W - 40) / (YARD.w + YARD.d), (H - 150) / ((YARD.w + YARD.d) / 2 + 1.2)));
    const ox = W / 2 - ((YARD.w - YARD.d) / 2) * unit;
    const oy = Math.max(60, H - 120 - ((YARD.w + YARD.d) / 2 + 0.9) * unit);
    iso.set(unit, ox, oy);
    siso.set(unit, ox, oy);
    drawStatic();
  }

  function yardPath(c, inset = 0) {
    const x = inset, y = inset, w = YARD.w - inset * 2, d = YARD.d - inset * 2, r = 1.2;
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + d - r); c.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    c.lineTo(x + r, y + d); c.quadraticCurveTo(x, y + d, x, y + d - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  function drawStatic() {
    const c = sctx;
    const u = siso.unit;
    c.clearRect(0, 0, W, H);
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5cc9f7');
    sky.addColorStop(0.5, '#b7e9ff');
    sky.addColorStop(0.5, '#1479cf');
    sky.addColorStop(1, '#0f5aa8');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    // sun + clouds
    c.beginPath(); c.arc(W * 0.78, H * 0.12, u * 0.7, 0, Math.PI * 2); c.fillStyle = '#ffe066'; c.fill();
    c.lineWidth = 4; c.strokeStyle = rgba('#e08a00', 0.6); c.stroke();
    for (const [cx, cy, s] of [[W * 0.18, H * 0.16, 0.9], [W * 0.52, H * 0.1, 0.65]]) {
      c.fillStyle = 'rgba(255,255,255,0.95)';
      c.beginPath();
      c.ellipse(cx, cy, 60 * s, 20 * s, 0, 0, Math.PI * 2);
      c.ellipse(cx + 38 * s, cy - 12 * s, 40 * s, 24 * s, 0, 0, Math.PI * 2);
      c.ellipse(cx - 40 * s, cy - 6 * s, 34 * s, 18 * s, 0, 0, Math.PI * 2);
      c.fill();
    }
    // water ripples behind the yard
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = H * 0.55 + i * 60;
      c.beginPath();
      for (let x = -20; x <= W + 20; x += 24) c.lineTo(x, y + Math.sin((x + i * 40) / 34) * 5);
      c.stroke();
    }
    // cliff + grass
    const cliff = Math.round(u * 0.9);
    for (let i = cliff; i >= 1; i--) {
      c.save(); c.translate(0, i);
      siso.ground((cc) => { yardPath(cc); cc.fillStyle = i / cliff > 0.55 ? '#8a5a3a' : '#b97b4b'; cc.fill(); });
      c.restore();
    }
    siso.ground((cc) => { yardPath(cc); cc.fillStyle = '#f4d98a'; cc.fill(); cc.lineWidth = 0.08; cc.strokeStyle = shade('#f4d98a', -0.35); cc.stroke(); });
    siso.ground((cc) => { yardPath(cc, 0.45); cc.fillStyle = '#6fd35b'; cc.fill(); });
    c.fillStyle = '#55b647';
    for (let i = 0; i < 60; i++) {
      const x = 0.8 + ((i * 7.31) % (YARD.w - 1.6)), y = 0.8 + ((i * 4.77) % (YARD.d - 1.6));
      const [X, Y] = siso.P(x, y);
      c.fillRect(X - 3, Y - 1, 6, 2);
    }
    // path from the door to the front edge
    siso.ground((cc) => {
      cc.beginPath();
      cc.moveTo(3.7, 1.1); cc.lineTo(4.7, 1.1); cc.quadraticCurveTo(5.3, 3.4, 6.2, 6.8); cc.lineTo(5.4, 6.8); cc.quadraticCurveTo(4.6, 3.7, 3.7, 1.75);
      cc.closePath();
      cc.fillStyle = '#e9e2cf'; cc.fill(); cc.lineWidth = 0.05; cc.strokeStyle = shade('#e9e2cf', -0.3); cc.stroke();
    });
    // back fences along the far edges
    for (let i = 0; i < 14; i++) { siso.block(0.55 + i * 0.62, 0.35, 0, 0.14, 0.1, 0.5, '#ffffff', { edge: rgba(INK, 0.25) }); }
    siso.block(0.5, 0.37, 0.28, 8.5, 0.05, 0.08, '#ffffff', { edge: rgba(INK, 0.25) });
    for (let i = 0; i < 10; i++) { siso.block(0.35, 0.8 + i * 0.62, 0, 0.1, 0.14, 0.5, '#ffffff', { edge: rgba(INK, 0.25) }); }
    siso.block(0.37, 0.75, 0.28, 0.05, 6.0, 0.08, '#ffffff', { edge: rgba(INK, 0.25) });
    // hedge along the front-left edge
    for (let i = 0; i < 5; i++) siso.bush(1.2 + i * 1.6, YARD.d - 0.5, 0.55, '#3fbf5a');
  }

  // ---------- pets ----------

  function petFor(id, index) {
    let p = pets.get(id);
    if (!p) {
      const [x, y] = PET_SLOTS[index % PET_SLOTS.length];
      p = { x, y, tx: x, ty: y, facing: 'se', phase: index * 1.7, nextMove: 0 };
      pets.set(id, p);
    }
    return p;
  }

  function movePets(now, dt) {
    for (const p of pets.values()) {
      if (state.petHungry) continue;
      if (now > p.nextMove) {
        const [x, y] = PET_SLOTS[Math.floor(Math.random() * PET_SLOTS.length)];
        p.tx = x + (Math.random() - 0.5) * 0.8;
        p.ty = y + (Math.random() - 0.5) * 0.8;
        p.nextMove = now + 4000 + Math.random() * 5000;
      }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const step = Math.min(dist, 0.9 * dt);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'se' : 'sw') : (dy > 0 ? 'sw' : 'se');
      }
    }
  }

  // ---------- render ----------

  let lastTime = 0;
  function render(now) {
    if (!visible || !state) return;
    const dt = Math.min(0.1, lastTime ? (now - lastTime) / 1000 : 0.016);
    lastTime = now;
    movePets(now, dt);
    ctx.drawImage(staticCanvas, 0, 0, W, H);
    const ents = [];
    ents.push({ depth: HOUSE_AT[0] + HOUSE_AT[1], draw: () => drawHouse(iso, ctx, HOUSE_AT[0], HOUSE_AT[1], state.equipped.paint || 'none', now) });
    let slot = 0;
    for (const f of game.config.fun) {
      if (f.kind !== 'garden' || !state.fun[f.id] || !isFunActive(state, game.config, f.id)) continue;
      const [x, y] = GARDEN_SLOTS[slot % GARDEN_SLOTS.length];
      slot++;
      ents.push({ depth: x + y, draw: () => drawProp(iso, ctx, f.id, x, y, now) });
    }
    if (state.fun.trampoline) {
      const bounce = avatar.pose === 'jump' ? Math.max(0, Math.sin(((avatar.until - now) / 800) * Math.PI)) : 0;
      ents.push({ depth: TRAMPOLINE_AT[0] + TRAMPOLINE_AT[1] - 0.6, draw: () => drawProp(iso, ctx, 'trampoline', TRAMPOLINE_AT[0], TRAMPOLINE_AT[1], now, bounce) });
    }
    let pi = 0;
    for (const f of game.config.fun) {
      if (f.kind !== 'pet' || !state.fun[f.id] || !isFunActive(state, game.config, f.id)) continue;
      const p = petFor(f.id, pi++);
      ents.push({ depth: p.x + p.y, draw: () => drawPet(iso, ctx, f.id, p.x, p.y, { t: now, facing: p.facing, sleeping: state.petHungry, phase: p.phase }) });
    }
    // avatar: on the trampoline while jumping (if owned), otherwise at home
    const onTramp = avatar.pose === 'jump' && state.fun.trampoline;
    const ax = onTramp ? TRAMPOLINE_AT[0] : AVATAR_HOME[0], ay = onTramp ? TRAMPOLINE_AT[1] : AVATAR_HOME[1];
    let z = onTramp ? 0.45 : 0;
    if (avatar.pose === 'jump') z += Math.max(0, Math.sin(((avatar.until - now) / 800) * Math.PI)) * 2.2;
    if (now > avatar.until && avatar.pose !== 'idle') avatar.pose = 'idle';
    const colorHex = (game.config.colors.find((c) => c.id === state.color) || game.config.colors[0]).hex;
    ents.push({ depth: ax + ay + 0.01, draw: () => drawAvatar(iso, ctx, ax, ay, { color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin, facing: 'se', pose: avatar.pose, t: now, z }) });
    ents.sort((a, b) => a.depth - b.depth);
    for (const e of ents) e.draw();
    positionHits(ax, ay, z);
    raf = requestAnimationFrame(render);
  }

  function positionHits(ax, ay, z) {
    const u = iso.unit;
    const place = (node, x, y, w, h, zz = 0) => {
      if (!node) return;
      const [X, Y] = iso.P(x, y, zz);
      node.style.left = `${X}px`;
      node.style.top = `${Y + u * 0.15}px`;
      node.style.width = `${w * u}px`;
      node.style.height = `${h * u}px`;
    };
    place(hitEls.avatar, ax, ay, 1.6, 1.7, z);
    place(hitEls.house, HOUSE_AT[0], HOUSE_AT[1], 3.6, 2.8);
    if (hitEls.trampoline) place(hitEls.trampoline, TRAMPOLINE_AT[0], TRAMPOLINE_AT[1], 2.2, 1.2);
    for (const [id, p] of pets) {
      place(hitEls[`pet:${id}`], p.x, p.y, 1.5, 1.2);
      const z = hitEls[`zzz:${id}`];
      if (z) { const [X, Y] = iso.P(p.x + 0.2, p.y - 0.2, 1.1); z.style.left = `${X}px`; z.style.top = `${Y}px`; }
    }
  }

  // ---------- actions ----------

  function jump() {
    if (avatar.pose === 'jump') return;
    game.audio.play('jump');
    avatar.pose = 'jump';
    avatar.until = performance.now() + 800;
    game.mentor.say('lines.trampoline', {}, { kind: 'tip' });
  }

  function fireworks() {
    game.audio.play('firework');
    const rect = scene.getBoundingClientRect();
    const colors = ['#ff5f5f', '#ffc21c', '#45d65c', '#45b6ff', '#b76cff', '#ff6fae', '#ffe94d'];
    for (let burst = 0; burst < 3; burst++) {
      setTimeout(() => {
        const cx = rect.width * (0.25 + Math.random() * 0.5);
        const cy = rect.height * (0.1 + Math.random() * 0.25);
        for (let i = 0; i < 10; i++) {
          const p = el('span', 'firework');
          const a = (i / 10) * Math.PI * 2;
          const r = 90 + Math.random() * 80;
          p.style.left = `${cx}px`;
          p.style.top = `${cy}px`;
          p.style.background = colors[(i + burst) % colors.length];
          p.style.color = colors[(i + burst) % colors.length];
          p.style.setProperty('--dx', `${Math.cos(a) * r}px`);
          p.style.setProperty('--dy', `${Math.sin(a) * r + 40}px`);
          scene.appendChild(p);
          setTimeout(() => p.remove(), 1100);
        }
        if (burst > 0) game.audio.play('firework');
      }, burst * 350);
    }
    game.mentor.say('lines.fireworks', {}, { kind: 'tip' });
  }

  function actionButton(label, cls, fn) {
    const b = el('button', `btn ${cls}`, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function hit(cls, data) {
    const h = el('div', `hit ${cls}`);
    for (const [k, v] of Object.entries(data || {})) h.dataset[k] = v;
    hits.appendChild(h);
    return h;
  }

  function build(s) {
    hits.innerHTML = '';
    actions.innerHTML = '';
    for (const k of Object.keys(hitEls)) delete hitEls[k];
    hitEls.house = hit('house');
    hitEls.house.addEventListener('pointerdown', () => { game.audio.play('pop'); });
    hitEls.avatar = hit('avatar', { hat: s.equipped.hat || '', skin: s.equipped.skin || '' });
    hitEls.avatar.addEventListener('pointerdown', jump);
    if (s.fun.trampoline) {
      hitEls.trampoline = hit('trampoline', { item: 'trampoline' });
      hitEls.trampoline.addEventListener('pointerdown', jump);
    }
    for (const id of [...pets.keys()]) if (!s.fun[id] || !isFunActive(s, game.config, id)) pets.delete(id);
    let pi = 0;
    for (const f of game.config.fun) {
      if (f.kind !== 'pet' || !s.fun[f.id] || !isFunActive(s, game.config, f.id)) continue;
      petFor(f.id, pi++);
      const h = hit('pet', { item: f.id });
      h.addEventListener('pointerdown', () => { game.audio.play('pop'); const p = pets.get(f.id); if (p) p.nextMove = 0; });
      hitEls[`pet:${f.id}`] = h;
      if (s.petHungry) hitEls[`zzz:${f.id}`] = (() => { const z = el('div', 'zzz', '💤'); hits.appendChild(z); return z; })();
    }
    if (s.fun.trampoline) actions.appendChild(actionButton(`${game.t('fun.spring')}`, 'btn-secondary', jump));
    if (s.fun.vuurwerk) actions.appendChild(actionButton(`${game.t('fun.vuurwerk')}`, 'btn-primary', fireworks));
    if (s.fun.dansje) actions.appendChild(actionButton(`${game.t('fun.dansje')}`, 'btn-success', () => { game.audio.play('buy'); avatar.pose = 'dance'; avatar.until = performance.now() + 2500; }));
    if (s.fun.salto) actions.appendChild(actionButton(`${game.t('fun.salto')}`, 'btn-purple', () => { game.audio.play('whoosh'); avatar.pose = 'salto'; avatar.until = performance.now() + 1000; }));
    stickerGrid.innerHTML = '';
    for (const m of game.config.milestones) {
      const got = s.milestones.includes(m.id);
      const st = el('div', 'sticker' + (got ? ' got' : ''), got ? m.sticker : '');
      st.dataset.milestone = m.id;
      st.title = m.title;
      // a tap tells what the sticker means (and celebrates it a little)
      st.addEventListener('pointerdown', () => {
        game.audio.play(got ? 'pop' : 'tap');
        st.classList.remove('bump');
        void st.offsetWidth;
        st.classList.add('bump');
        if (got) {
          const r = st.getBoundingClientRect();
          game.fx.burst(r.left + r.width / 2, r.top + r.height / 2);
          game.mentor.sayText(game.t('popups.stickerGot', { titel: m.title }));
        } else {
          game.mentor.sayText(game.t('popups.stickerNot'));
        }
      });
      stickerGrid.appendChild(st);
    }
  }

  function sig(s) {
    return JSON.stringify([s.color, s.equipped, Object.keys(s.fun), s.hidden, s.petHungry, s.milestones]);
  }

  window.addEventListener('resize', () => { if (visible) resize(); });

  return {
    show() {
      visible = true;
      signature = '';
      state = game.state;
      resize();
      this.render(game.state);
      cancelAnimationFrame(raf);
      lastTime = 0;
      raf = requestAnimationFrame(render);
      if (!game.state.flags.visitedHuis) game.update((x) => setFlag(x, 'visitedHuis', true));
    },
    hide() {
      visible = false;
      cancelAnimationFrame(raf);
      raf = 0;
      for (const p of scene.querySelectorAll('.firework')) p.remove();
    },
    render(s) {
      state = s;
      const k = sig(s);
      if (k === signature) return;
      signature = k;
      build(s);
    },
  };
}
