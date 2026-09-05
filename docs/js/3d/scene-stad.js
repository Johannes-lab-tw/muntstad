// 3d/scene-stad.js — the town of Muntstad in real 3D: island, buildings that grow with their level, "for sale"
// boards, the avatar walking (or riding) the road loop, NPC traffic, coins that fly to the wallet, clouds.
// Same contract as the old canvas scene: createScene(container, game, engine) →
// { mount, resize, render(now), hitTest(x, y), spawnCoin, burst(id), setState(s), plotPoint(id), hop }.
import * as T from '../../vendor/three.module.min.js';
import { createWorld, PLOTS, HOUSE, roadPath, along, ISLAND } from './world.js';
import { makerModel, houseModel, signModel, arrowModel, ringModel, makerHeight } from './buildings.js';
import { avatarModel, carModel, lookKey } from './avatar.js';
import { addLights, createCamera } from './engine.js';
import { meshCoin, col } from './build.js';
import { makerLevel, makerIncome, formatCoins } from '../economy.js';

const MAX_PARTICLES = 30;

export function createScene(container, game, engine) {
  const config = game.config;
  const scene = new T.Scene();
  scene.fog = new T.Fog(col('#8fdcff'), 55, 150);
  const world = createWorld(config);
  scene.add(world.group);
  const center = new T.Vector3(ISLAND.w / 2, 0, ISLAND.d / 2);
  const lights = addLights(scene, center, 19, engine.tier);
  engine.onTier((t) => lights.setTier(t));
  const cam = createCamera(
    { min: { x: -0.2, y: -0.4, z: -0.2 }, max: { x: ISLAND.w + 0.2, y: 2.6, z: ISLAND.d + 0.2 } },
    { top: 30, bottom: 112, left: 0, right: 0 },
    { fov: 27, elev: 0.55, az: Math.PI / 4 },
  );
  const camera = cam.camera;

  let state = null;
  let W = 0, H = 0;
  let host = container;
  let activeCamera = camera;   // the camera the coins fly towards (AVONTUUR renders this scene through its own)
  let depthRef = center;
  const path = roadPath();
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  const v3 = new T.Vector3();

  // ---------- buildings, signs, house ----------
  const makers = {};   // id → { level, unlocked, affordable, model | sign, hit }
  const hits = [];
  const hitMat = new T.MeshBasicMaterial({ visible: false });
  for (const m of config.makers) {
    const [px, py] = PLOTS[m.id];
    const hit = new T.Mesh(new T.BoxGeometry(3, 3.2, 3), hitMat);
    hit.position.set(px, 1.6, py);
    hit.userData = { type: 'maker', id: m.id };
    scene.add(hit);
    hits.push(hit);
    makers[m.id] = { level: -1, unlocked: null, affordable: null, model: null, sign: null, hit, arrow: null, ring: null };
  }
  const houseHit = new T.Mesh(new T.BoxGeometry(3.4, 2.6, 3), hitMat);
  houseHit.position.set(HOUSE[0], 1.3, HOUSE[1]);
  houseHit.userData = { type: 'house' };
  scene.add(houseHit);
  hits.push(houseHit);
  const avatarHit = new T.Mesh(new T.BoxGeometry(1.6, 2.0, 1.6), hitMat);
  avatarHit.userData = { type: 'avatar' };
  scene.add(avatarHit);
  hits.push(avatarHit);
  let house = { paint: null, model: null };

  function syncMakers() {
    for (const m of config.makers) {
      const e = makers[m.id];
      const [px, py] = PLOTS[m.id];
      const level = makerLevel(state, m.id);
      const unlocked = game.isUnlocked(m.id);
      const affordable = level === 0 && unlocked && state.wallet >= m.price;
      if (level !== e.level) {
        if (e.model) { scene.remove(e.model.group); e.model = null; }
        if (e.sign) { scene.remove(e.sign); e.sign = null; e.unlocked = null; }
        if (level > 0) {
          e.model = makerModel(m.id, level);
          e.model.group.position.set(px, 0.06, py);
          scene.add(e.model.group);
          e.hit.geometry.dispose();
          e.hit.geometry = new T.BoxGeometry(3, makerHeight(m.id, level), 3);
          e.hit.position.y = makerHeight(m.id, level) / 2;
        }
        e.level = level;
      }
      if (level === 0 && unlocked !== e.unlocked) {
        if (e.sign) scene.remove(e.sign);
        e.sign = signModel(m, unlocked, formatCoins(m.price));
        e.sign.position.set(px, 0.06, py);
        scene.add(e.sign);
        e.unlocked = unlocked;
      }
      if (affordable !== e.affordable) {
        if (e.arrow) { scene.remove(e.arrow, e.ring); e.arrow = null; e.ring = null; }
        if (affordable) {
          e.arrow = arrowModel();
          e.arrow.position.set(px, 2.9, py);
          e.ring = ringModel(1.75);
          e.ring.position.set(px, 0.1, py);
          scene.add(e.arrow, e.ring);
        }
        e.affordable = affordable;
      }
    }
    const paint = state.equipped.paint || 'none';
    if (paint !== house.paint) {
      if (house.model) scene.remove(house.model.group);
      house.model = houseModel(paint);
      house.model.group.position.set(HOUSE[0], 0.05, HOUSE[1]);
      scene.add(house.model.group);
      house.paint = paint;
    }
  }

  // ---------- avatar + traffic ----------
  let avatar = null;
  let avatarKey = '';
  let avatarDist = 0;
  let hopUntil = 0;
  function syncAvatar() {
    const colorHex = (config.colors.find((c) => c.id === state.color) || config.colors[0]).hex;
    const look = { color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin, vehicle: state.equipped.vehicle };
    const key = lookKey(look);
    if (key === avatarKey) return;
    if (avatar) scene.remove(avatar.group);
    avatar = avatarModel(look);
    scene.add(avatar.group);
    avatarKey = key;
  }
  const traffic = [
    { dist: 0.38, speed: 1.9, car: carModel('#ff9f2e') },
    { dist: 0.78, speed: 1.6, car: carModel('#45d65c') },
    { dist: 0.12, speed: 2.2, car: carModel('#b76cff') },
  ];
  for (const t of traffic) scene.add(t.car.group);

  // ---------- coins ----------
  const coins = [];
  const spawnTimers = {};
  let lastCoinSound = 0;
  let walletCache = { at: -1e9, v: new T.Vector3() };
  function walletTarget(now) {
    if (now - walletCache.at > 500) {
      const p = game.walletPoint();
      const r = (engine.container || host).getBoundingClientRect();
      const nx = ((p.x - r.left) / Math.max(1, r.width)) * 2 - 1;
      const ny = -((p.y - r.top) / Math.max(1, r.height)) * 2 + 1;
      v3.copy(depthRef).project(activeCamera);
      walletCache.v.set(nx, ny, v3.z - 0.02).unproject(activeCamera);
      walletCache.at = now;
    }
    return walletCache.v;
  }
  function spawnCoin(id) {
    if (coins.length >= MAX_PARTICLES) return;
    const p = PLOTS[id];
    if (!p) return;
    const now = performance.now();
    const c = meshCoin(0.26);
    c.position.set(p[0] + (Math.random() - 0.5) * 0.8, 2.4, p[1] + (Math.random() - 0.5) * 0.8);
    scene.add(c);
    coins.push({ mesh: c, from: c.position.clone(), to: walletTarget(now).clone(), t0: now, dur: 800 + Math.random() * 200, rot: Math.random() * 6 });
  }
  function scheduleCoins(dt) {
    for (const m of config.makers) {
      const inc = makerIncome(m, makerLevel(state, m.id));
      if (inc <= 0) continue;
      const interval = Math.min(5, Math.max(1.0, 60 / inc));
      spawnTimers[m.id] = (spawnTimers[m.id] ?? interval * Math.random()) - dt;
      if (spawnTimers[m.id] <= 0) { spawnCoin(m.id); spawnTimers[m.id] = interval; }
    }
  }
  function updateCoins(now) {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      const f = Math.min(1, (now - c.t0) / c.dur);
      const ease = f * f * (3 - 2 * f);
      c.mesh.position.lerpVectors(c.from, c.to, ease);
      c.mesh.position.y += Math.sin(f * Math.PI) * 2.2;
      c.mesh.rotation.y = f * 9 + c.rot;
      if (f >= 1) {
        scene.remove(c.mesh);
        coins.splice(i, 1);
        game.bumpWallet();
        if (now - lastCoinSound > 250) { lastCoinSound = now; game.audio.play('coinSoft'); }
      }
    }
  }

  // ---------- pop (bounce) when bought / upgraded ----------
  const popAt = {};
  function popScale(id, now) {
    const at = popAt[id];
    if (!at) return 1;
    const f = (now - at) / 600;
    if (f >= 1) { delete popAt[id]; return 1; }
    return f < 0.5 ? 0.2 + (f / 0.5) * 0.95 : 1.15 - ((f - 0.5) / 0.5) * 0.15;
  }

  // ---------- public ----------
  function mount(el) {
    host = el;
    engine.mount(el);
    resize();
  }
  function resize() {
    if (engine.container !== host) engine.mount(host);
    else engine.resize();
    W = engine.W; H = engine.H;
    cam.fit(W, H);
    walletCache.at = -1e9;
  }
  function setState(s) { state = s; }

  /**
   * One simulation step without drawing: buildings, coins, clouds, traffic and (unless opts.roadAvatar === false) the
   * avatar walking the road loop. AVONTUUR calls this with its own camera and renders the same scene itself.
   */
  function simulate(now, dt, opts = {}) {
    if (!state) return;
    const nextCam = opts.camera || camera;
    if (nextCam !== activeCamera) walletCache.at = -1e9;
    activeCamera = nextCam;
    depthRef = opts.depthRef || center;
    const roadAvatar = opts.roadAvatar !== false;
    syncMakers();
    syncAvatar();
    scheduleCoins(dt);
    const lite = engine.tier >= 2;
    world.update(now, dt, lite);
    for (const m of config.makers) {
      const e = makers[m.id];
      if (e.model) { e.model.update(now); const s = popScale(m.id, now); e.model.group.scale.set(s, s, s); }
      if (e.arrow) { e.arrow.position.y = 2.9 + Math.sin(now / 220) * 0.15; e.arrow.rotation.y = now / 900; }
      if (e.ring) { const p = 1 + Math.sin(now / 260) * 0.06; e.ring.scale.set(p, 1, p); e.ring.material.opacity = 0.55 + Math.sin(now / 260) * 0.3; }
    }
    if (house.model) house.model.update(now);
    // avatar on the road
    avatar.group.visible = roadAvatar;
    avatarHit.visible = roadAvatar;
    const vehicle = state.equipped.vehicle;
    const speed = vehicle === 'auto' ? 5.2 : vehicle === 'scooter' ? 3.1 : 1.55;
    avatarDist = (avatarDist + speed * dt) % path.total;
    const a = along(path, avatarDist);
    const hop = hopUntil > now ? Math.sin(((hopUntil - now) / 380) * Math.PI) * 0.9 : 0;
    avatar.group.position.set(a.x, 0.09, a.y);
    avatar.group.rotation.y = a.angle;
    if (roadAvatar) avatar.update(now, hop ? 'jump' : 'walk', { z: 0.09 + hop, dist: avatarDist });
    avatarHit.position.set(a.x, 1.0 + hop, a.y);
    for (const t of traffic) {
      t.dist = (t.dist + (t.speed * dt) / path.total) % 1;
      const c = along(path, t.dist * path.total);
      t.car.group.position.set(c.x, 0.09, c.y);
      t.car.group.rotation.y = c.angle;
      for (const w of t.car.wheels) w.rotation.x = t.dist * path.total * 6;
    }
    updateCoins(now);
  }

  let lastTime = 0;
  function render(now) {
    if (!state || !W) return;
    const dt = Math.min(0.1, lastTime ? (now - lastTime) / 1000 : 0.016);
    if (lastTime) engine.trackFrame(now - lastTime, now);
    lastTime = now;
    simulate(now, dt);
    engine.render(scene, camera);
  }

  /** 'stad' (default) or 'avontuur': resets the coin target cache when the camera changes hands. */
  function setMode(m) {
    walletCache.at = -1e9;
    if (m === 'stad') { activeCamera = camera; depthRef = center; if (avatar) { avatar.group.visible = true; avatarHit.visible = true; } }
  }

  /** Returns what was tapped: { type: 'maker', id } | { type: 'house' } | { type: 'avatar' } | null */
  function hitTest(x, y) {
    if (!W || !state) return null;
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const found = raycaster.intersectObjects(hits, false);
    if (!found.length) return null;
    // the avatar wins when it overlaps a plot; otherwise the nearest hit
    const av = found.find((f) => f.object.userData.type === 'avatar');
    return (av || found[0]).object.userData;
  }

  function plotPoint(id) {
    const p = PLOTS[id];
    if (!p || !W) return { x: W / 2, y: H / 2 };
    v3.set(p[0], 1.6, p[1]).project(camera);
    return { x: ((v3.x + 1) / 2) * W, y: ((1 - v3.y) / 2) * H };
  }

  function burst(id) {
    popAt[id] = performance.now();
    for (let i = 0; i < 6; i++) setTimeout(() => spawnCoin(id), i * 60);
  }

  function hop() { hopUntil = performance.now() + 380; }

  return { mount, resize, render, simulate, setMode, hitTest, spawnCoin, burst, setState, plotPoint, hop, scene, camera, get particleCount() { return coins.length; } };
}
