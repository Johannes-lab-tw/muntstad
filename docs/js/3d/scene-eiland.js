// 3d/scene-eiland.js — the Avontuureiland: terrain, forest, camp, day and night, you walking around it with the
// camera behind you (3d/player.js + 3d/controls.js), and since round 3 the things you can do: chop wood, pick shells
// and berries, fish at the lake, open the campfire. Own Three scene.
// createEilandScene(game, engine, controls, cb) → { mount, resize, render(now), setState, reset, doAction, hook }
// cb = { onCollect(item, n), onKamp(), onAction(action | null), onSay(lineKey) }
import * as T from '../../vendor/three.module.min.js';
import { avatarModel, lookKey } from './avatar.js';
import { petModel } from './pets.js';
import { createPlayer, createFollower, stepPlayer, stepFollower, turnTowards, createGrid } from './player.js';
import { addLights } from './engine.js';
import { createHeightmap, PIER, CAMP, LAKE } from './heightmap.js';
import { createTerrain } from './terrain.js';
import { placeForest, buildForest } from './forest.js';
import { createCamp } from './camp.js';
import { createDayNight } from './daynight.js';
import { Builder } from './build.js';
import { isFunActive } from '../economy.js';
import { chopRule } from '../eiland.js';

const CAM = { dist: 6.2, pitch: 0.42, minPitch: 0.15, maxPitch: 1.0, lookUp: 1.1, swipe: 0.0075, follow: 1.4 };
const START = { x: PIER.x, z: PIER.z - 2.5, heading: Math.PI };   // on the pier, facing the island
const REACH = { tree: 1.3, shell: 1.4, bush: 1.5, camp: 3.4, lake: 2.4 };

export function createEilandScene(game, engine, controls, cb = {}) {
  const config = game.config;
  const E = config.eiland;
  const scene = new T.Scene();
  const map = createHeightmap();
  const terrain = createTerrain(map);
  scene.add(terrain.group);
  const forest = buildForest(placeForest(map));
  scene.add(forest.group);
  const camp = createCamp(map);
  scene.add(camp.group);
  const lights = addLights(scene, new T.Vector3(CAMP.x, 1, CAMP.z), 20, engine.tier);
  engine.onTier((t) => lights.setTier(t));
  const daynight = createDayNight(scene, lights);
  const near = createGrid([...forest.obstacles, ...camp.obstacles], 4);
  const env = { yaw: START.heading, near, walkable: map.walkable, groundAt: map.groundAt };
  // things to pick up, in their own grids
  const shells = forest.placements.shell.map((s, index) => ({ ...s, index, r: 0.3, taken: false }));
  const bushes = forest.placements.bush2.map((b, index) => ({ ...b, index, r: 0.5, restUntil: 0 }));
  const nearShells = createGrid(shells, 4);
  const nearBushes = createGrid(bushes, 4);
  const trees = new Map();   // obstacle index key → { taps, wood, restUntil }

  const camera = new T.PerspectiveCamera(50, 1, 0.1, 260);
  const camPos = new T.Vector3(), camLook = new T.Vector3();
  let W = 0, H = 0, host = null, state = null;
  let yaw = START.heading, pitch = CAM.pitch, firstFrame = true;

  const player = createPlayer(START.x, START.z, START.heading);
  player.ground = map.groundAt(player.x, player.z);
  const dog = createFollower(START.x + 0.8, START.z + 1.4, START.heading);

  // ---------- models ----------
  let avatar = null, avatarKey = '';
  function syncAvatar() {
    const colorHex = (config.colors.find((c) => c.id === state.color) || config.colors[0]).hex;
    const look = { color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin, vehicle: null };
    const key = lookKey(look);
    if (key === avatarKey) return;
    if (avatar) scene.remove(avatar.group);
    avatar = avatarModel(look);
    scene.add(avatar.group);
    avatarKey = key;
  }
  let pet = null, petId = null;
  const petPhase = Math.random() * 10;
  function syncPet() {
    const owned = ['hond', 'kat', 'dino'].filter((id) => state.fun[id] && isFunActive(state, config, id));
    const id = state.petHungry ? null : owned[0] || null;
    if (id === petId) return;
    if (pet) { scene.remove(pet.group); pet = null; }
    if (id) {
      pet = petModel(id);
      scene.add(pet.group);
      dog.x = player.x + 0.8; dog.z = player.z + 1.4; dog.heading = player.heading;
      dog.ground = map.groundAt(dog.x, dog.z);
    }
    petId = id;
  }
  // the fishing float and the wood chips
  const bobber = (() => { const b = new Builder({ r: 0.02 }); b.sphere(0, 0, 0, 0.14, '#ff5f5f', 8); b.sphere(0, 0, 0.1, 0.1, '#ffffff', 8); const m = b.build({ shadow: false }); m.visible = false; scene.add(m); return m; })();
  const chips = [];
  const chipGeom = new T.BoxGeometry(0.12, 0.06, 0.16);
  const chipMat = new T.MeshStandardMaterial({ color: 0xb5763f, roughness: 0.9 });
  function burstChips(x, y, z) {
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(chipGeom, chipMat);
      m.position.set(x, y + 0.9, z);
      scene.add(m);
      chips.push({ m, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 3, t: 0 });
    }
  }
  function updateChips(dt) {
    for (let i = chips.length - 1; i >= 0; i--) {
      const c = chips[i];
      c.t += dt;
      c.vy -= 9 * dt;
      c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt;
      c.m.rotation.x += 6 * dt; c.m.rotation.z += 4 * dt;
      if (c.t > 0.9) { scene.remove(c.m); chips.splice(i, 1); }
    }
  }

  // ---------- what can you do here? ----------
  let action = null;        // { type: 'kamp'|'schelp'|'bes'|'hak'|'vis'|'trek', label, target }
  let lastActionKey = '';
  let hakUntil = 0;
  let fishing = null;       // { until, biteUntil }
  function findAction(now) {
    const px = player.x, pz = player.z;
    if (fishing) return { type: fishing.biteUntil ? 'trek' : 'vis', label: fishing.biteUntil ? 'TREK' : 'WACHT', target: null };
    if (Math.hypot(px - CAMP.x, pz - CAMP.z) < REACH.camp) return { type: 'kamp', label: 'KAMP', target: null };
    let best = null, bestD = Infinity;
    for (const s of nearShells(px, pz)) {
      if (s.taken) continue;
      const d = Math.hypot(px - s.x, pz - s.z);
      if (d < REACH.shell && d < bestD) { best = { type: 'schelp', label: 'PAK', target: s }; bestD = d; }
    }
    for (const b of nearBushes(px, pz)) {
      if (b.restUntil > now) continue;
      const d = Math.hypot(px - b.x, pz - b.z) - b.r;
      if (d < REACH.bush && d < bestD) { best = { type: 'bes', label: 'PLUK', target: b }; bestD = d; }
    }
    if (best) return best;
    for (const o of near(px, pz)) {
      if (!o.kind || !o.kind.startsWith('tree')) continue;
      const d = Math.hypot(px - o.x, pz - o.z) - o.r;
      if (d < REACH.tree && d < bestD) { best = { type: 'hak', label: 'HAK', target: o }; bestD = d; }
    }
    if (best) return best;
    const dl = Math.hypot(px - LAKE.x, pz - LAKE.z);
    if (dl > LAKE.r * 0.9 && dl < LAKE.r + REACH.lake) return { type: 'vis', label: 'VIS', target: null };
    return null;
  }
  function treeState(o) {
    const key = `${o.kind}:${o.index}`;
    let t = trees.get(key);
    if (!t) { t = { taps: 0, wood: 0, restUntil: 0 }; trees.set(key, t); }
    return t;
  }
  /** The action button was pressed (or the space of a keyboard player). */
  function doAction() {
    const now = performance.now();
    if (!action) return;
    if (action.type === 'kamp') { cb.onKamp && cb.onKamp(); return; }
    if (action.type === 'schelp') {
      action.target.taken = true;
      forest.setScale('shell', action.target.index, 0);
      cb.onCollect && cb.onCollect('schelp', 1);
      game.audio.play('coinSoft');
      return;
    }
    if (action.type === 'bes') {
      action.target.restUntil = now + E.bushRestMs;
      forest.setScale('bush2', action.target.index, 0.8);
      setTimeout(() => forest.setScale('bush2', action.target.index, 1), E.bushRestMs);
      cb.onCollect && cb.onCollect('bes', E.berries);
      game.audio.play('coinSoft');
      return;
    }
    if (action.type === 'hak') {
      const t = treeState(action.target);
      if (t.restUntil > now) { cb.onSay && cb.onSay('lines.treeRest'); return; }
      const rule = chopRule(state.eiland, config);
      hakUntil = now + 380;
      // face the tree
      player.heading = Math.atan2(action.target.x - player.x, action.target.z - player.z);
      game.audio.play('thud');
      t.taps++;
      if (t.taps >= rule.taps) {
        t.taps = 0;
        t.wood += rule.wood;
        burstChips(action.target.x, action.target.y || player.ground, action.target.z);
        cb.onCollect && cb.onCollect('hout', rule.wood);
        if (t.wood >= E.treeWood) { t.wood = 0; t.restUntil = now + E.treeRestMs; }
      }
      return;
    }
    if (action.type === 'vis') {
      fishing = { until: now + E.fish.waitMinMs + Math.random() * (E.fish.waitMaxMs - E.fish.waitMinMs), biteUntil: 0 };
      player.heading = Math.atan2(LAKE.x - player.x, LAKE.z - player.z);
      const d = 1.6;
      bobber.position.set(player.x + Math.sin(player.heading) * d, LAKE.level + 0.05, player.z + Math.cos(player.heading) * d);
      bobber.visible = true;
      cb.onSay && cb.onSay('lines.fishWait');
      return;
    }
    if (action.type === 'trek') {
      if (fishing && fishing.biteUntil && now < fishing.biteUntil) {
        cb.onCollect && cb.onCollect('vis', 1);
        game.audio.play('buy');
      }
      stopFishing();
    }
  }
  function stopFishing() { fishing = null; bobber.visible = false; }
  function updateFishing(now) {
    if (!fishing) return;
    if (player.moving && player.speed > 0.5) { stopFishing(); return; }
    if (!fishing.biteUntil && now >= fishing.until) { fishing.biteUntil = now + E.fish.biteMs; game.audio.play('tap'); }
    if (fishing.biteUntil && now > fishing.biteUntil) { stopFishing(); cb.onSay && cb.onSay('lines.fishMiss'); }
    bobber.position.y = LAKE.level + (fishing.biteUntil ? -0.12 + Math.sin(now / 40) * 0.05 : 0.05 + Math.sin(now / 300) * 0.03);
  }

  // ---------- camera ----------
  function placeCamera(dt) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const py = player.ground + player.y * 0.5;
    camPos.set(player.x - Math.sin(yaw) * CAM.dist * cp, py + CAM.dist * sp + 0.4, player.z - Math.cos(yaw) * CAM.dist * cp);
    const floor = map.heightAt(Math.min(map.size - 1, Math.max(1, camPos.x)), Math.min(map.size - 1, Math.max(1, camPos.z))) + 0.8;
    if (camPos.y < floor) camPos.y = floor;
    camLook.set(player.x, py + CAM.lookUp, player.z);
    if (firstFrame) { camera.position.copy(camPos); firstFrame = false; }
    else camera.position.lerp(camPos, 1 - Math.exp(-9 * dt));
    camera.lookAt(camLook);
  }

  // ---------- public ----------
  function mount(el) { host = el; engine.mount(el); resize(); }
  function resize() {
    if (!host) return;
    if (engine.container !== host) engine.mount(host);
    else engine.resize();
    W = engine.W; H = engine.H;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  function setState(s) { state = s; }

  const SUBSTEP = 1 / 60;
  let lastTime = 0, prevNow = 0, simAcc = 0, jumps = 0, pendingJump = false;
  const focus = new T.Vector3();
  function render(now) {
    if (!state || !W) return;
    const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 0.016);
    if (lastTime) engine.trackFrame(now - lastTime, now);
    prevNow = lastTime || now;
    lastTime = now;
    syncAvatar();
    syncPet();

    const input = controls.read();
    yaw -= input.lookDx * CAM.swipe;
    pitch = Math.min(CAM.maxPitch, Math.max(CAM.minPitch, pitch + input.lookDy * CAM.swipe * 0.6));
    simAcc += Math.min(1.0, (now - prevNow) / 1000);
    if (input.jump) pendingJump = true;
    while (simAcc >= SUBSTEP) {
      env.yaw = yaw;
      stepPlayer(player, { x: input.x, y: input.y, run: input.run, jump: pendingJump }, SUBSTEP, env);
      pendingJump = false;
      if (player.jumped) { jumps++; game.audio.play('jump'); }
      if (!input.looking && player.moving && Math.hypot(input.x, input.y) > 0.3) yaw = turnTowards(yaw, player.heading, CAM.follow, SUBSTEP);
      if (pet) stepFollower(dog, player, SUBSTEP, env);
      simAcc -= SUBSTEP;
    }
    updateFishing(now);
    updateChips(dt);
    const next = findAction(now);
    const key = next ? `${next.type}:${next.label}` : '';
    if (key !== lastActionKey) { lastActionKey = key; action = next; cb.onAction && cb.onAction(next); }
    else action = next;

    avatar.group.position.set(player.x, 0, player.z);
    avatar.group.rotation.y = player.heading;
    const pose = !player.grounded ? 'jump' : hakUntil > now ? 'hak' : fishing ? 'vis' : player.moving ? 'walk' : 'idle';
    avatar.update(player.running && player.grounded ? now * 1.45 : now, pose, { z: player.ground + player.y });
    if (pet) {
      pet.group.position.set(dog.x, dog.ground, dog.z);
      pet.group.rotation.y = dog.heading;
      pet.update(now, { walking: dog.moving, phase: petPhase });
    }

    placeCamera(dt);
    focus.set(player.x, player.ground, player.z);
    daynight.update(now, focus);
    const lite = engine.tier >= 2;
    terrain.update(now, lite);
    camp.update(now, daynight.darkness, lite);
    engine.render(scene, camera);
  }

  function reset() {
    Object.assign(player, createPlayer(START.x, START.z, START.heading));
    player.ground = map.groundAt(player.x, player.z);
    yaw = START.heading;
    firstFrame = true;
    lastTime = 0;
    simAcc = 0;
    stopFishing();
  }

  const hook = {
    get player() { return { x: player.x, y: player.y, z: player.z, ground: player.ground, heading: player.heading, grounded: player.grounded, moving: player.moving }; },
    get dog() { return pet ? { x: dog.x, z: dog.z, moving: dog.moving } : null; },
    get yaw() { return yaw; },
    get jumps() { return jumps; },
    get phase() { return daynight.phase; },
    get darkness() { return daynight.darkness; },
    get action() { return action ? { type: action.type, label: action.label } : null; },
    get fishing() { return fishing ? { biting: !!fishing.biteUntil } : null; },
    onLand(x, z) { return map.walkable(x, z); },
    kindAt(x, z) { return map.kindAt(x, z); },
    landmarks: { CAMP, PIER, LAKE },
    forestCount: Object.values(forest.placements).reduce((n, l) => n + l.length, 0),
    /** Nearest untaken shell / berry bush / tree, for the tests to walk to. */
    nearest(kind) {
      const list = kind === 'schelp' ? shells.filter((s) => !s.taken) : kind === 'bes' ? bushes : forest.obstacles.filter((o) => o.kind && o.kind.startsWith('tree'));
      let best = null, bd = Infinity;
      for (const it of list) { const d = Math.hypot(it.x - player.x, it.z - player.z); if (d < bd && map.walkable(it.x, it.z + 1)) { bd = d; best = it; } }
      return best ? { x: best.x, z: best.z } : null;
    },
    setInput(x, y, run = false) { controls.setOverride(x == null ? null : { x, y, run }); },
    jump() { controls.pressJump(); },
    setPhase(p) { daynight.setOverride(p); },
    teleport(x, z) { player.x = x; player.z = z; player.ground = map.groundAt(x, z); firstFrame = true; },
    act() { doAction(); },
    bite() { if (fishing && !fishing.biteUntil) fishing.until = 0; },
  };

  return { mount, resize, render, setState, reset, doAction, hook, camera, scene };
}
