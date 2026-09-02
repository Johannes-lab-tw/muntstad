// huis.js — the child's yard in real 3D: the house (paintable), a cushion of grass in the sea with a fence and a
// hedge, garden props, pets that wander and nap, the avatar (hat/skin) with jump/dance/salto, the trampoline,
// fireworks (DOM) and the sticker wall. Transparent DOM hit areas (.hit) are projected over the avatar, pets,
// trampoline and house every frame so taps (and the tests) find them.
import * as T from '../../vendor/three.module.min.js';
import { addLights, createCamera } from '../3d/engine.js';
import { Builder, MAT, col } from '../3d/build.js';
import { cushionMesh, createSea, roundedRect, roundedRectPath, flat, WATER_Y } from '../3d/world.js';
import { houseModel } from '../3d/buildings.js';
import { avatarModel, lookKey } from '../3d/avatar.js';
import { propModel } from '../3d/props.js';
import { petModel } from '../3d/pets.js';
import { isFunActive, setFlag } from '../economy.js';

const YARD = { w: 9.5, d: 7 };
const HOUSE_AT = [2.7, 1.5];
const AVATAR_HOME = [5.6, 4.5];
const TRAMPOLINE_AT = [7.6, 5.2];
// garden slots (world), kept clear of the house, the path and the trampoline
const GARDEN_SLOTS = [[1.0, 4.4], [1.4, 6.1], [3.3, 6.3], [7.1, 1.1], [8.6, 6.2], [8.7, 2.3], [5.9, 1.2], [1.0, 2.8], [8.6, 4.1], [2.6, 3.9], [7.0, 3.1], [2.0, 5.3]];
const PET_SLOTS = [[3.4, 5.2], [6.6, 6.2], [4.6, 6.1], [7.8, 2.8], [5.0, 2.6]];

export function createHuis(game) {
  const sceneEl = document.getElementById('huis-scene');
  const stickerGrid = document.getElementById('sticker-grid');
  const actions = document.getElementById('huis-actions');
  const hits = document.createElement('div');
  hits.className = 'hits';
  sceneEl.appendChild(hits);
  const engine = game.engine;
  let W = 0, H = 0;
  let signature = '';
  let visible = false;
  let raf = 0;
  let state = null;
  const avatar = { pose: 'idle', until: 0, since: 0, z: 0 };
  const pets = new Map(); // id → { x, y, tx, ty, angle, phase, nextMove, model }
  const hitEls = {};

  document.getElementById('huis-stad').addEventListener('click', () => { game.audio.play('tap'); game.show('stad'); });
  document.getElementById('huis-winkel').addEventListener('click', () => { game.audio.play('tap'); game.show('winkel'); });

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- the 3D yard ----------
  const scene = new T.Scene();
  scene.fog = new T.Fog(col('#8fdcff'), 40, 120);
  const center = new T.Vector3(YARD.w / 2, 0, YARD.d / 2);
  const lights = addLights(scene, center, 9, engine ? engine.tier : 0);
  if (engine) engine.onTier((t) => lights.setTier(t));
  const cam = createCamera(
    { min: { x: -0.2, y: -0.4, z: -0.2 }, max: { x: YARD.w + 0.2, y: 2.4, z: YARD.d + 0.2 } },
    { top: 96, bottom: 116, left: 10, right: 292 },
    { fov: 27, elev: 0.55, az: Math.PI / 4 },
  );
  const camera = cam.camera;
  scene.add(cushionMesh(0, 0, YARD.w, YARD.d, 1.2, { depth: 1.2, bt: 0.36, bs: 0.42 }));
  const sea = createSea(YARD.w / 2, YARD.d / 2, 220);
  scene.add(sea.mesh);
  const foamShape = roundedRect(-0.55, -0.55, YARD.w + 1.1, YARD.d + 1.1, 1.7);
  foamShape.holes.push(roundedRectPath(-0.3, -0.3, YARD.w + 0.6, YARD.d + 0.6, 1.5));
  const foam = flat(foamShape, WATER_Y + 0.025, '#ffffff', { opacity: 0.55, order: 1, segments: 10 });
  scene.add(foam);
  const yard = new Builder({ r: 0.04 });
  // fences along the far edges, a hedge along the front-left edge, the path from the door to the front
  for (let i = 0; i < 14; i++) yard.box(0.55 + i * 0.62, 0.3, 0, 0.14, 0.1, 0.55, '#ffffff', { r: 0.03 });
  yard.box(0.5, 0.32, 0.32, 8.5, 0.06, 0.08, '#ffffff', { r: 0.02 });
  yard.box(0.5, 0.32, 0.14, 8.5, 0.06, 0.08, '#ffffff', { r: 0.02 });
  for (let i = 0; i < 10; i++) yard.box(0.3, 0.8 + i * 0.62, 0, 0.1, 0.14, 0.55, '#ffffff', { r: 0.03 });
  yard.box(0.32, 0.75, 0.32, 0.06, 6.0, 0.08, '#ffffff', { r: 0.02 });
  yard.box(0.32, 0.75, 0.14, 0.06, 6.0, 0.08, '#ffffff', { r: 0.02 });
  for (let i = 0; i < 6; i++) yard.bush(1.0 + i * 1.5, YARD.d - 0.45, 0.6, '#3fbf5a');
  for (let i = 0; i < 4; i++) yard.bush(YARD.w - 0.45, 1.2 + i * 1.5, 0.55, '#45d65c');
  for (let i = 0; i < 10; i++) { const f = i / 9; yard.box(3.7 + f * 1.9 - 0.45, 1.1 + f * 5.6, 0, 0.9, 0.62, 0.045, '#e9e2cf', { r: 0.12 }); }
  yard.disc(1.2, 1.3, 0, 0.35, '#8a5a35', 0.06, 14);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; yard.flower(1.2 + Math.cos(a) * 0.2, 1.3 + Math.sin(a) * 0.2, ['#ff6fae', '#ffe94d', '#7c9bff', '#ff9f2e', '#b76cff'][i], 0.06); }
  scene.add(yard.build());
  let house = { paint: null, model: null };
  const props = new Map();  // id → { model, slot }
  let tramp = null;
  let av = null, avKey = '';

  function syncScene(s) {
    const paint = s.equipped.paint || 'none';
    if (paint !== house.paint) {
      if (house.model) scene.remove(house.model.group);
      house.model = houseModel(paint, { fence: false });
      house.model.group.position.set(HOUSE_AT[0], 0.01, HOUSE_AT[1]);
      scene.add(house.model.group);
      house.paint = paint;
    }
    // garden props in slots (order = catalogue order)
    let slot = 0;
    const wanted = new Set();
    for (const f of game.config.fun) {
      if (f.kind !== 'garden' || !s.fun[f.id] || !isFunActive(s, game.config, f.id)) continue;
      const [x, y] = GARDEN_SLOTS[slot % GARDEN_SLOTS.length];
      slot++;
      wanted.add(f.id);
      let p = props.get(f.id);
      if (!p) { p = { model: propModel(f.id) }; props.set(f.id, p); scene.add(p.model.group); }
      p.model.group.position.set(x, 0.01, y);
    }
    for (const [id, p] of props) if (!wanted.has(id)) { scene.remove(p.model.group); props.delete(id); }
    if (s.fun.trampoline && !tramp) { tramp = propModel('trampoline'); tramp.group.position.set(TRAMPOLINE_AT[0], 0.01, TRAMPOLINE_AT[1]); scene.add(tramp.group); }
    if (!s.fun.trampoline && tramp) { scene.remove(tramp.group); tramp = null; }
    // pets
    let pi = 0;
    const petsWanted = new Set();
    for (const f of game.config.fun) {
      if (f.kind !== 'pet' || !s.fun[f.id] || !isFunActive(s, game.config, f.id)) continue;
      petsWanted.add(f.id);
      const p = petFor(f.id, pi++);
      if (!p.model) { p.model = petModel(f.id); scene.add(p.model.group); }
    }
    for (const [id, p] of pets) if (!petsWanted.has(id)) { if (p.model) scene.remove(p.model.group); pets.delete(id); }
    // avatar
    const colorHex = (game.config.colors.find((c) => c.id === s.color) || game.config.colors[0]).hex;
    const look = { color: colorHex, hat: s.equipped.hat, skin: s.equipped.skin, vehicle: null };
    const k = lookKey(look);
    if (k !== avKey) { if (av) scene.remove(av.group); av = avatarModel(look); av.group.rotation.y = Math.PI / 4; scene.add(av.group); avKey = k; }
  }

  // ---------- layout ----------
  function resize() {
    if (!engine) return;
    if (engine.container !== sceneEl) engine.mount(sceneEl);
    else engine.resize();
    W = engine.W; H = engine.H;
    cam.fit(W, H);
    if (hits.parentNode === sceneEl) sceneEl.appendChild(hits); // keep the hit layer above the canvas
  }

  const v3 = new T.Vector3();
  function project(x, y, z) {
    v3.set(x, z, y).project(camera);
    return [((v3.x + 1) / 2) * W, ((1 - v3.y) / 2) * H];
  }

  // ---------- pets ----------
  function petFor(id, index) {
    let p = pets.get(id);
    if (!p) {
      const [x, y] = PET_SLOTS[index % PET_SLOTS.length];
      p = { x, y, tx: x, ty: y, angle: Math.PI / 4, phase: index * 1.7, nextMove: 0, model: null, walking: false };
      pets.set(id, p);
    }
    return p;
  }

  function movePets(now, dt) {
    for (const p of pets.values()) {
      p.walking = false;
      if (state.petHungry) continue;
      if (now > p.nextMove) {
        let target = null;
        for (let tries = 0; tries < 6 && !target; tries++) {
          const [x, y] = PET_SLOTS[Math.floor(Math.random() * PET_SLOTS.length)];
          const tx = x + (Math.random() - 0.5) * 0.8, ty = y + (Math.random() - 0.5) * 0.8;
          const dx = tx - p.x, dy = ty - p.y, len2 = dx * dx + dy * dy || 1;
          const f = Math.max(0, Math.min(1, ((AVATAR_HOME[0] - p.x) * dx + (AVATAR_HOME[1] - p.y) * dy) / len2));
          const cx = p.x + dx * f, cy = p.y + dy * f;
          if (Math.hypot(cx - AVATAR_HOME[0], cy - AVATAR_HOME[1]) >= 1.0) target = [tx, ty];
        }
        if (target) { p.tx = target[0]; p.ty = target[1]; }
        p.nextMove = now + 4000 + Math.random() * 5000;
      }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const step = Math.min(dist, 0.9 * dt);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.angle = Math.atan2(dx, dy);
        p.walking = true;
      }
    }
  }

  // ---------- render ----------
  let lastTime = 0;
  function render(now) {
    if (!visible || !state || !engine) return;
    const dt = Math.min(0.1, lastTime ? (now - lastTime) / 1000 : 0.016);
    if (lastTime) engine.trackFrame(now - lastTime, now);
    lastTime = now;
    movePets(now, dt);
    sea.update(now, engine.tier >= 2);
    foam.material.opacity = 0.45 + Math.sin(now / 900) * 0.15;
    if (house.model) house.model.update(now);
    const bounce = avatar.pose === 'jump' ? Math.max(0, Math.sin(((avatar.until - now) / 800) * Math.PI)) : 0;
    for (const p of props.values()) p.model.update(now);
    if (tramp) tramp.update(now, { bounce });
    for (const p of pets.values()) {
      if (!p.model) continue;
      p.model.group.position.set(p.x, 0.01, p.y);
      p.model.group.rotation.y = p.angle;
      p.model.update(now, { sleeping: state.petHungry, phase: p.phase, walking: p.walking });
    }
    // avatar: on the trampoline while jumping (if owned), otherwise at home
    const onTramp = avatar.pose === 'jump' && state.fun.trampoline;
    const ax = onTramp ? TRAMPOLINE_AT[0] : AVATAR_HOME[0], ay = onTramp ? TRAMPOLINE_AT[1] : AVATAR_HOME[1];
    let z = onTramp ? 0.45 : 0;
    if (avatar.pose === 'jump') z += bounce * 2.2;
    if (now > avatar.until && avatar.pose !== 'idle') avatar.pose = 'idle';
    if (av) {
      av.group.position.set(ax, 0.01, ay);
      av.update(now, avatar.pose, { z: 0.01 + z, since: avatar.since });
    }
    positionHits(ax, ay, z);
    engine.render(scene, camera);
    raf = requestAnimationFrame(render);
  }

  function positionHits(ax, ay, z) {
    const [, y0] = project(5, 3.5, 0), [, y1] = project(5, 3.5, 1);
    const u = Math.max(20, Math.abs(y0 - y1)); // px per world unit (vertical)
    const place = (node, x, y, w, h, zz = 0) => {
      if (!node) return;
      const [X, Y] = project(x, y, zz);
      node.style.left = `${X}px`;
      node.style.top = `${Y + u * 0.1}px`;
      node.style.width = `${w * u}px`;
      node.style.height = `${h * u}px`;
    };
    place(hitEls.avatar, ax, ay, 1.5, 1.6, z);
    place(hitEls.house, HOUSE_AT[0], HOUSE_AT[1], 3.4, 2.6);
    if (hitEls.trampoline) place(hitEls.trampoline, TRAMPOLINE_AT[0], TRAMPOLINE_AT[1], 2.2, 1.0);
    for (const [id, p] of pets) {
      place(hitEls[`pet:${id}`], p.x, p.y, 1.3, 1.1);
      const zz = hitEls[`zzz:${id}`];
      if (zz) { const [X, Y] = project(p.x + 0.2, p.y - 0.2, 1.0); zz.style.left = `${X}px`; zz.style.top = `${Y}px`; }
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
    const rect = sceneEl.getBoundingClientRect();
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
          sceneEl.appendChild(p);
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
    if (s.fun.salto) actions.appendChild(actionButton(`${game.t('fun.salto')}`, 'btn-purple', () => { game.audio.play('whoosh'); avatar.pose = 'salto'; avatar.since = performance.now(); avatar.until = performance.now() + 1000; }));
    stickerGrid.innerHTML = '';
    for (const m of game.config.milestones) {
      const got = s.milestones.includes(m.id);
      const st = el('div', 'sticker' + (got ? ' got' : ''), got ? m.sticker : '');
      st.dataset.milestone = m.id;
      st.title = m.title;
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
    syncScene(s);
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
      for (const p of sceneEl.querySelectorAll('.firework')) p.remove();
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
