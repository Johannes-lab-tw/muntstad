// 3d/scene-eiland.js — the Avontuureiland: terrain, forest, camp, day and night, you walking around it with the
// camera behind you (3d/player.js + 3d/controls.js), the things you can do (chop, pick, fish, campfire; round 3),
// the night (fire that wants wood, ghosts, the Nachtbeer, lantern/torches/fence/tent; round 4) and the other
// players in your room (round 5: the host runs the world, everyone sends their own moves). Own Three scene.
// createEilandScene(game, engine, controls, cb) → { mount, resize, render(now), setState, reset, doAction, emote, hook }
// cb = { onCollect(item, n), onKamp(), onAction(action | null), onSay(lineKey), onBurn(dtMs, darkness), onNight(bear),
//        onDawn(fireBurned), onSteal(), onStoke(), onSleep(), onBearAte(), onFireSync(fire), onRemoteStoke(n) }
import * as T from '../../vendor/three.module.min.js';
import { avatarModel, lookKey } from './avatar.js';
import { petModel } from './pets.js';
import { createPlayer, createFollower, stepPlayer, stepFollower, turnTowards, createGrid } from './player.js';
import { addLights } from './engine.js';
import { createHeightmap, PIER, CAMP, LAKE, CAVE, caveInner } from './heightmap.js';
import { createTerrain } from './terrain.js';
import { placeForest, buildForest } from './forest.js';
import { createCamp } from './camp.js';
import { createDayNight } from './daynight.js';
import { ghostModel, bearModel, tentModel, torchModel, fenceModel, deerModel, dropModel } from './spoken.js';
import { perks, nightRules, hungerSpeedMul } from '../uitdaging.js';
import { Builder, textPlane } from './build.js';
import { isFunActive } from '../economy.js';
import { chopRule } from '../eiland.js';
import { fireRadius, isLit, stepGhost, bearTonight, stepBear, scareBear } from '../nacht.js';
import { ANIMALS } from '../net/relay.js';

const CAM = { dist: 6.2, pitch: 0.42, minPitch: 0.15, maxPitch: 1.0, lookUp: 1.1, swipe: 0.0075, follow: 1.4 };
const START = { x: PIER.x, z: PIER.z - 2.5, heading: Math.PI };   // on the pier, facing the island
const REACH = { tree: 1.3, shell: 1.4, bush: 1.5, camp: 3.4, lake: 2.4, tent: 2.4, bear: 7 };
const TENT_AT = { x: CAMP.x - 4.6, z: CAMP.z - 3.8 };

export function createEilandScene(game, engine, controls, cb = {}) {
  const config = game.config;
  const E = config.eiland;
  const N = config.nacht;
  const samen = game.samen;
  const scene = new T.Scene();
  const map = createHeightmap();
  const terrain = createTerrain(map);
  scene.add(terrain.group);
  const forest = buildForest(placeForest(map));
  scene.add(forest.group);
  const camp = createCamp(map);
  scene.add(camp.group);
  const lights = addLights(scene, new T.Vector3(CAMP.x, 1, CAMP.z), 20, engine.tier);
  engine.onTier((t) => {
    lights.setTier(t);
    // lite tier (slow iPad / software renderer): the two biggest instanced kinds (grass tufts, flowers) are pure decoration
    for (const k of ['grass', 'flower']) if (forest.meshes[k]) forest.meshes[k].visible = t < 2;
    if (scene.fog) scene.fog.far = t >= 2 ? 70 : 95;   // the fog exists once daynight is created
  });
  const daynight = createDayNight(scene, lights);
  let near = createGrid([...forest.obstacles, ...camp.obstacles], 4);
  const env = { yaw: START.heading, near, walkable: map.walkable, groundAt: map.groundAt, speedMul: 1 };
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
  const dog = createFollower(START.x + 0.9, START.z - 0.9, START.heading);   // beside you, not between you and the camera
  const groundOf = (x, z) => map.heightAt(Math.min(map.size - 1, Math.max(1, x)), Math.min(map.size - 1, Math.max(1, z)));

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
      dog.x = player.x + 0.9; dog.z = player.z - 0.9; dog.heading = player.heading;
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
  // a chopped tree wobbles for half a second; a caught fish jumps out of the water towards you
  const wobbles = [];   // { kind, index, t }
  function wobble(o) { wobbles.push({ kind: o.kind, index: o.index, t: 0 }); }
  function updateWobbles(dt) {
    for (let i = wobbles.length - 1; i >= 0; i--) {
      const w = wobbles[i];
      w.t += dt;
      const f = Math.min(1, w.t / 0.55);
      forest.setTilt(w.kind, w.index, Math.sin(f * Math.PI * 3) * 0.09 * (1 - f));
      if (f >= 1) wobbles.splice(i, 1);
    }
  }
  // a felled tree leans over away from you, thuds and sinks; a stump stays; a new tree grows back after the rest
  const falls = [];   // { o, t, yaw, stump, restUntil, thud, gone }
  const stumpPool = [];
  function stumpMesh() { const b = new Builder({ r: 0.03 }); b.cyl(0, 0, 0, 0.3, 0.45, '#7a4f2e', 8); b.cyl(0, 0, 0.45, 0.3, 0.04, '#c9a47a', 8); return b.build(); }
  function fellTree(o, awayFrom, now) {
    const yaw = Math.atan2(o.x - awayFrom.x, o.z - awayFrom.z);
    const stump = stumpPool.pop() || stumpMesh();
    stump.position.set(o.x, groundOf(o.x, o.z) - 0.05, o.z);
    scene.add(stump);
    for (let i = wobbles.length - 1; i >= 0; i--) if (wobbles[i].kind === o.kind && wobbles[i].index === o.index) wobbles.splice(i, 1);
    o.rFull = o.rFull || o.r;
    o.r = 0.3;   // only the stump is in the way now
    falls.push({ o, t: 0, yaw, stump, restUntil: now + E.treeRestMs, thud: false, gone: false });
  }
  function updateFalls(now, dt) {
    for (let i = falls.length - 1; i >= 0; i--) {
      const f = falls[i];
      f.t += dt;
      if (f.t < 1.0) {
        const k = f.t;
        forest.setPose(f.o.kind, f.o.index, 1, Math.min(1.5, k * k * 1.6), f.yaw);
        if (!f.thud && k > 0.85) { f.thud = true; game.audio.play('thud'); }
      } else if (f.t < 2.2) forest.setPose(f.o.kind, f.o.index, Math.max(0.001, 1 - (f.t - 1.0) / 1.2), 1.5, f.yaw);
      else if (now < f.restUntil) { if (!f.gone) { f.gone = true; forest.setPose(f.o.kind, f.o.index, 0.001); } }
      else {
        const g = Math.min(1, (now - f.restUntil) / 2000);
        forest.setPose(f.o.kind, f.o.index, 0.05 + g * 0.95);
        if (g >= 1) { f.o.r = f.o.rFull; scene.remove(f.stump); stumpPool.push(f.stump); falls.splice(i, 1); }
      }
    }
  }
  const fishMesh = (() => { const b = new Builder({ r: 0.03 }); b.add(new T.SphereGeometry(0.16, 8, 6).scale(1.7, 0.7, 0.9), '#7fc4ff'); b.add(new T.ConeGeometry(0.12, 0.22, 4).rotateZ(Math.PI / 2).translate(-0.3, 0, 0), '#5aa9ef'); b.sphere(0.16, 0.07, 0.06, 0.035, '#1b1f3b', 5); const m = b.build({ shadow: false }); m.visible = false; scene.add(m); return m; })();
  let fishJump = null;   // { from, to, t }
  function jumpFish(fromV, toV) { fishJump = { from: fromV.clone(), to: toV.clone(), t: 0 }; fishMesh.visible = true; }
  function updateFish(dt) {
    if (!fishJump) return;
    fishJump.t += dt;
    const f = Math.min(1, fishJump.t / 0.7);
    fishMesh.position.lerpVectors(fishJump.from, fishJump.to, f);
    fishMesh.position.y += Math.sin(f * Math.PI) * 1.6;
    fishMesh.rotation.z = (0.5 - f) * 2.2;
    fishMesh.rotation.y = Math.atan2(fishJump.to.x - fishJump.from.x, fishJump.to.z - fishJump.from.z) + Math.PI / 2;
    if (f >= 1) { fishJump = null; fishMesh.visible = false; }
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

  // ---------- the other players (round 5) ----------
  const remotes = new Map();   // id → { model, tag, x, z, h, y, tx, tz, th, ty, pose, emoteUntil, key }
  function remoteLook(id) {
    const l = samen.lookOf(id) || { animal: 0, color: 0, hat: null, skin: null };
    const colorHex = (config.colors[l.color] || config.colors[0]).hex;
    return { look: { color: colorHex, hat: l.hat, skin: l.skin, vehicle: null }, animal: ANIMALS[l.animal] || ANIMALS[0] };
  }
  function ensureRemote(id) {
    let r = remotes.get(id);
    const { look, animal } = remoteLook(id);
    const key = lookKey(look) + animal;
    if (r && r.key === key) return r;
    if (r) { scene.remove(r.model.group); scene.remove(r.tag); }
    const model = avatarModel(look);
    scene.add(model.group);
    const tag = textPlane(`${animal} ${id}`, { w: 1.6, h: 0.5, font: 0.34, bg: '#ffffff' });
    scene.add(tag);
    const prev = r || { x: PIER.x, z: PIER.z - 2, h: Math.PI, y: 0, pose: 'idle', emoteUntil: 0 };
    r = { ...prev, model, tag, key, tx: prev.x, tz: prev.z, th: prev.h, ty: prev.y };
    remotes.set(id, r);
    return r;
  }
  function dropRemote(id) {
    const r = remotes.get(id);
    if (!r) return;
    scene.remove(r.model.group); scene.remove(r.tag);
    remotes.delete(id);
  }
  if (samen) {
    samen.on('pos', (d, from) => {
      if (!d || typeof d.x !== 'number') return;
      const r = ensureRemote(from);
      r.tx = d.x; r.tz = d.z; r.th = d.h || 0; r.ty = d.y || 0; r.pose = typeof d.p === 'string' ? d.p : 'idle';
    });
    samen.on('look', (id) => { if (remotes.has(id)) ensureRemote(id); });
    samen.on('left', dropRemote);
    samen.on('emote', (d, from) => { const r = remotes.get(from); if (r && (d?.e === 'wave' || d?.e === 'dance')) { r.emote = d.e; r.emoteUntil = performance.now() + 2500; } });
    samen.on('world', (d) => { if (!samen.isGuest || !d) return; applyWorld(d); });
    samen.on('stoke', (d) => { if (samen.isHost && cb.onRemoteStoke) cb.onRemoteStoke(Math.max(0, Math.min(10, Number(d?.n) || 0))); });
    samen.on('boe', () => { if (samen.isHost && bear) doScare(); });
    samen.on('sleep', () => { if (samen.isHost && cb.onSleep) cb.onSleep(); });
    samen.on('change', () => { if (!samen.active) { for (const id of [...remotes.keys()]) dropRemote(id); remoteWorld = null; daynight.setOverride(phaseOverride); } });
  }
  let myEmote = null, myEmoteUntil = 0;
  function emote(e) {
    if (e !== 'wave' && e !== 'dance') return;
    myEmote = e; myEmoteUntil = performance.now() + 2500;
    if (samen && samen.active) samen.send('emote', { e });
  }
  function updateRemotes(now, dt) {
    const k = 1 - Math.exp(-10 * dt);
    for (const r of remotes.values()) {
      r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k; r.y += (r.ty - r.y) * k;
      r.h = turnTowards(r.h, r.th, 12, dt);
      const g = groundOf(r.x, r.z);
      const ground = map.onPier(r.x, r.z) ? PIER.deck : g;
      r.model.group.position.set(r.x, 0, r.z);
      r.model.group.rotation.y = r.h;
      const pose = r.emoteUntil > now ? r.emote : r.pose;
      r.model.update(now, pose, { z: ground + r.y });
      r.tag.position.set(r.x, ground + r.y + 2.05, r.z);
      r.tag.quaternion.copy(camera.quaternion);
    }
  }
  // the host's world, as seen by a guest
  let remoteWorld = null;
  // ?phase=0.3 (tests, screenshots): a fixed time of day from the very first frame, so no wall-clock night sneaks in
  const phaseParam = Number(new URLSearchParams(location.search).get('phase'));
  let phaseOverride = Number.isFinite(phaseParam) && location.search.includes('phase=') ? Math.max(0, Math.min(0.9999, phaseParam)) : null;
  if (phaseOverride != null) daynight.setOverride(phaseOverride);
  const remoteGhosts = [];
  let remoteBear = null;
  function applyWorld(d) {
    remoteWorld = d;
    if (typeof d.ph === 'number') daynight.setOverride(Math.max(0, Math.min(0.9999, d.ph)));
    if (typeof d.f === 'number' && cb.onFireSync) cb.onFireSync(Math.max(0, Math.min(100, d.f)));
    const gs = Array.isArray(d.g) ? d.g.slice(0, N.ghostsMax) : [];
    while (remoteGhosts.length < gs.length) { const m = ghostModel(); const holder = new T.Group(); holder.add(m.group); scene.add(holder); remoteGhosts.push({ m, holder }); }
    while (remoteGhosts.length > gs.length) { const g = remoteGhosts.pop(); scene.remove(g.holder); }
    gs.forEach((g, i) => { const rg = remoteGhosts[i]; rg.tx = g.x; rg.tz = g.z; if (rg.tx0 == null) { rg.holder.position.set(g.x, groundOf(g.x, g.z), g.z); rg.tx0 = 1; } });
    if (d.b && typeof d.b.x === 'number') {
      if (!remoteBear) { const m = bearModel(); const holder = new T.Group(); holder.add(m.group); scene.add(holder); remoteBear = { m, holder, tx: d.b.x, tz: d.b.z }; holder.position.set(d.b.x, groundOf(d.b.x, d.b.z), d.b.z); }
      remoteBear.tx = d.b.x; remoteBear.tz = d.b.z; remoteBear.state = d.b.s;
    } else if (remoteBear) { scene.remove(remoteBear.holder); remoteBear = null; }
  }
  function updateRemoteWorld(now, dt) {
    const k = 1 - Math.exp(-8 * dt);
    const lit = lightsNow();
    for (const rg of remoteGhosts) {
      const p = rg.holder.position;
      p.x += (rg.tx - p.x) * k; p.z += (rg.tz - p.z) * k; p.y = groundOf(p.x, p.z);
      rg.holder.rotation.y = Math.atan2(rg.tx - p.x, rg.tz - p.z);
      rg.m.update(now, { fade: isLit(p.x, p.z, lit) ? 0.35 : 1 });
    }
    if (remoteBear) {
      const p = remoteBear.holder.position;
      p.x += (remoteBear.tx - p.x) * k; p.z += (remoteBear.tz - p.z) * k; p.y = groundOf(p.x, p.z);
      remoteBear.holder.rotation.y = Math.atan2(remoteBear.tx - p.x, remoteBear.tz - p.z);
      remoteBear.m.update(now, { walking: true });
    }
  }
  let lastWorldSent = 0;
  function broadcastWorld(now) {
    if (!samen || !samen.isHost || now - lastWorldSent < config.net.worldMs) return;
    lastWorldSent = now;
    samen.send('world', {
      ph: +daynight.phase.toFixed(4),
      f: +state.nacht.fire.toFixed(1),
      g: ghosts.map((gh) => ({ x: +gh.g.x.toFixed(1), z: +gh.g.z.toFixed(1) })),
      b: bear ? { x: +bear.b.x.toFixed(1), z: +bear.b.z.toFixed(1), s: bear.b.state } : null,
    });
  }

  // ---------- the night: camp gear, lights, ghosts, the bear ----------
  const ghosts = [];   // { g, model, holder }
  let bear = null;     // { b, model, holder }
  let ghostTimer = 0, wasDark = false, fireWasBurning = true;
  const lantern = new T.PointLight(0xffd080, 0, 12, 1.6);
  lantern.visible = false;
  scene.add(lantern);
  const gear = { tent: null, torches: null, fence: null };
  function syncGear() {
    const tools = state.eiland.tools;
    if (tools.tent && !gear.tent) {
      gear.tent = tentModel();
      gear.tent.position.set(TENT_AT.x, map.heightAt(TENT_AT.x, TENT_AT.z), TENT_AT.z);
      gear.tent.rotation.y = 0.6;
      scene.add(gear.tent);
    }
    if (tools.fakkels && !gear.torches) {
      gear.torches = [];
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const x = CAMP.x + Math.cos(a) * 6.2, z = CAMP.z + Math.sin(a) * 6.2;
        const t = torchModel();
        t.mesh.position.set(x, map.heightAt(x, z), z);
        scene.add(t.mesh);
        gear.torches.push({ ...t, x, z });
      }
    }
    const pk = perks(state.eiland, config);
    if ((tools.hek || tools.hoog_hek) && gear.fenceR !== pk.fenceRadius) {
      if (gear.fence) scene.remove(gear.fence);
      gear.fence = fenceModel(CAMP.x, CAMP.z, pk.fenceRadius, map.heightAt);
      gear.fenceR = pk.fenceRadius;
      scene.add(gear.fence);
    }
    if (tools.hut2 && !gear.hut2) {
      gear.hut2 = camp.addHut(CAMP.x - 6.4, CAMP.z - 3.2, 1.6, '#b76cff');
      near = createGrid([...forest.obstacles, ...camp.obstacles, gear.hut2], 4);
      env.near = near;
    }
    lantern.visible = !!tools.lantaarn;
  }
  function lightsNow() {
    const ls = [{ x: CAMP.x, z: CAMP.z, r: fireRadius(state.nacht, config) }];
    if (state.eiland.tools.lantaarn) ls.push({ x: player.x, z: player.z, r: N.lanternRadius });
    if (gear.torches) for (const t of gear.torches) ls.push({ x: t.x, z: t.z, r: N.torchRadius });
    return ls;
  }
  function landSpot(dist) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = CAMP.x + Math.cos(a) * dist, z = CAMP.z + Math.sin(a) * dist;
      if (map.walkable(x, z)) return { x, z, heading: Math.atan2(CAMP.x - x, CAMP.z - z) };
    }
    return { x: CAMP.x, z: CAMP.z + dist * 0.6, heading: Math.PI };
  }
  function spawnGhost() {
    const p = landSpot(22);
    const model = ghostModel();
    const holder = new T.Group();
    holder.add(model.group);
    holder.position.set(p.x, map.heightAt(p.x, p.z), p.z);
    scene.add(holder);
    ghosts.push({ g: { x: p.x, z: p.z, heading: p.heading, state: 'come' }, model, holder });
  }
  function spawnBear() {
    if (bear) return;
    const p = landSpot(30);
    const model = bearModel();
    const holder = new T.Group();
    holder.add(model.group);
    holder.position.set(p.x, map.heightAt(p.x, p.z), p.z);
    scene.add(holder);
    bear = { b: { x: p.x, z: p.z, heading: p.heading, state: 'come', scared: 0, pause: 0 }, model, holder };
  }
  function clearNight() {
    for (const gh of ghosts) scene.remove(gh.holder);
    ghosts.length = 0;
    if (bear) { scene.remove(bear.holder); bear = null; }
  }
  function doScare() {
    if (!bear) return;
    const gone = scareBear(bear.b, config, perks(state.eiland, config).bearScares);
    cb.onSay && cb.onSay(gone ? 'lines.bearGone' : 'lines.bearScared');
  }
  // ---------- the Nachthert and what it shakes out of your bag (V5.3) ----------
  let deer = null;   // { d: { x, z, heading, state, until }, model, holder }
  const drops = [];  // { item, x, z, mesh }
  const DROP_COLORS = { hout: '#b5763f', schelp: '#ffe6d5', bes: '#7c4dff', vis: '#7fc4ff' };
  function spawnDeer() {
    if (deer) return;
    const p = landSpot(28);
    const model = deerModel();
    const holder = new T.Group();
    holder.add(model.group);
    holder.position.set(p.x, groundOf(p.x, p.z), p.z);
    scene.add(holder);
    deer = { d: { x: p.x, z: p.z, heading: p.heading, state: 'wander', until: 0, tx: p.x, tz: p.z }, model, holder };
  }
  function clearDeer() { if (deer) { scene.remove(deer.holder); deer = null; } }
  function clearDrops() { for (const d of drops) scene.remove(d.mesh); drops.length = 0; }
  function scatterDrops(items) {
    for (let i = 0; i < items.length; i++) {
      const a = (i / items.length) * Math.PI * 2 + Math.random();
      let x = player.x + Math.cos(a) * (1.4 + Math.random() * 1.2), z = player.z + Math.sin(a) * (1.4 + Math.random() * 1.2);
      if (!map.walkable(x, z)) { x = player.x; z = player.z; }
      const mesh = dropModel(DROP_COLORS[items[i]] || '#ffffff');
      mesh.position.set(x, groundOf(x, z), z);
      scene.add(mesh);
      drops.push({ item: items[i], x, z, mesh, ph: Math.random() * 6 });
    }
  }
  function updateDeer(now, dt, lit, dark) {
    if (!deer) return;
    const D = config.deer, d = deer.d;
    const pk = perks(state.eiland, config);
    const fenceR = state.eiland.tools.hoog_hek ? pk.fenceRadius : state.eiland.tools.hek ? N.fenceRadius : 0;
    const playerSafe = isLit(player.x, player.z, lit) || (fenceR && Math.hypot(player.x - CAMP.x, player.z - CAMP.z) < fenceR);
    const dist = Math.hypot(player.x - d.x, player.z - d.z);
    if (d.state === 'flee') {
      if (now > d.until) d.state = 'wander';
      d.x += Math.sin(d.heading) * D.speed * dt; d.z += Math.cos(d.heading) * D.speed * dt;
      if (!map.walkable(d.x, d.z)) { d.heading += 2.5; }
    } else if (d.state === 'charge') {
      if (playerSafe || dist > D.sight * 1.5) { d.state = 'flee'; d.heading = Math.atan2(d.x - player.x, d.z - player.z); d.until = now + 2500; }
      else {
        d.heading = Math.atan2(player.x - d.x, player.z - d.z);
        const nx = d.x + Math.sin(d.heading) * D.speed * dt, nz = d.z + Math.cos(d.heading) * D.speed * dt;
        if (map.walkable(nx, nz)) { d.x = nx; d.z = nz; }
        if (dist < D.reach) {
          // the bump: you are shoved, the bag falls open, the deer runs off
          game.audio.play('stumble');
          const px = player.x + Math.sin(d.heading) * D.pushBack, pz = player.z + Math.cos(d.heading) * D.pushBack;
          if (map.walkable(px, pz)) { player.x = px; player.z = pz; player.ground = map.groundAt(px, pz); }
          const items = cb.onDeerBump ? cb.onDeerBump() : [];
          scatterDrops(items || []);
          d.state = 'flee'; d.heading += Math.PI; d.until = now + D.fleeMs;
        }
      }
    } else {
      // wander: amble to a spot, look around; charge when it sees you in the dark
      if (dark > 0.5 && !playerSafe && dist < D.sight) { d.state = 'charge'; cb.onSay && cb.onSay('lines.deerComing'); }
      else {
        const tx = d.tx - d.x, tz = d.tz - d.z, td = Math.hypot(tx, tz);
        if (td < 0.5 || now > d.until) { const p = landSpot(20 + Math.random() * 10); d.tx = p.x; d.tz = p.z; d.until = now + 6000 + Math.random() * 6000; }
        else { d.heading = Math.atan2(tx, tz); const nx = d.x + Math.sin(d.heading) * 1.2 * dt, nz = d.z + Math.cos(d.heading) * 1.2 * dt; if (map.walkable(nx, nz)) { d.x = nx; d.z = nz; } }
      }
    }
    deer.holder.position.set(d.x, groundOf(d.x, d.z), d.z);
    deer.holder.rotation.y = d.heading;
    deer.model.update(now, { running: d.state !== 'wander' });
    for (const dr of drops) dr.mesh.position.y = groundOf(dr.x, dr.z) + Math.sin(now / 300 + dr.ph) * 0.06;
  }
  function updateNight(now, dt) {
    syncGear();
    const dark = daynight.darkness;
    const guest = samen && samen.isGuest;
    env.speedMul = perks(state.eiland, config).speedMul * hungerSpeedMul(state.eiland, config);
    cb.onTick && cb.onTick(dt * 1000, dark);
    if (!guest) cb.onBurn && cb.onBurn(dt * 1000, dark);
    const n = state.nacht;
    const rules = nightRules(n.nights, config);
    camp.setFire(n.fire / 100);
    lantern.position.set(player.x, player.ground + 1.7, player.z);
    lantern.intensity = (0.2 + dark * 2.5) * 4;
    if (gear.torches) for (const t of gear.torches) { t.light.intensity = (0.3 + dark * 2.2) * 3; t.flame.scale.setScalar(1 + Math.sin(now / 80 + t.x) * 0.12); }
    const isDark = dark > 0.5;
    if (isDark && !wasDark) {
      wasDark = true;
      fireWasBurning = n.fire > 0;
      ghostTimer = rules.ghostEveryMs * 0.6;   // the first ghost comes soon after dark
      const bearNight = bearTonight(n, config, rules.bearEvery);
      cb.onNight && cb.onNight(bearNight && !guest, n.nights);
      if (bearNight && !guest) spawnBear();
      if (rules.deer && !guest) spawnDeer();
    }
    if (!isDark && wasDark) {
      wasDark = false;
      cb.onDawn && cb.onDawn(fireWasBurning && n.fire > 0);
      clearNight();
      clearDeer();
      clearDrops();
    }
    if (isDark && n.fire <= 0) fireWasBurning = false;
    if (guest) { updateRemoteWorld(now, dt); return; }
    if (isDark) {
      ghostTimer += dt * 1000;
      if (ghosts.length < rules.ghostsMax && ghostTimer > rules.ghostEveryMs) { ghostTimer = 0; spawnGhost(); }
    }
    const lit = lightsNow();
    const pk = perks(state.eiland, config);
    const fence = state.eiland.tools.hek || state.eiland.tools.hoog_hek ? { x: CAMP.x, z: CAMP.z, r: pk.fenceRadius } : null;
    updateDeer(now, dt, lit, dark);
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const gh = ghosts[i];
      const dp = Math.hypot(player.x - gh.g.x, player.z - gh.g.z);
      const target = dp < 12 ? { x: player.x, z: player.z } : { x: CAMP.x, z: CAMP.z };
      const res = stepGhost(gh.g, { target, lights: lit, fence, dt, speedMul: rules.ghostSpeed / N.ghostSpeed }, config);
      if (res === 'steal') { game.audio.play('thud'); cb.onSteal && cb.onSteal(); }
      if (res === 'gone') { scene.remove(gh.holder); ghosts.splice(i, 1); continue; }
      gh.holder.position.set(gh.g.x, groundOf(gh.g.x, gh.g.z), gh.g.z);
      gh.holder.rotation.y = gh.g.heading;
      gh.model.update(now, { fade: isLit(gh.g.x, gh.g.z, lit) ? 0.35 : 1 });
    }
    if (bear) {
      const res = stepBear(bear.b, { target: { x: CAMP.x, z: CAMP.z }, dt }, config);
      if (res === 'eat') cb.onBearAte && cb.onBearAte();
      if (res === 'gone') { scene.remove(bear.holder); bear = null; }
      else {
        bear.holder.position.set(bear.b.x, groundOf(bear.b.x, bear.b.z), bear.b.z);
        bear.holder.rotation.y = bear.b.heading;
        bear.model.update(now, { walking: bear.b.pause <= 0 });
      }
    }
    broadcastWorld(now);
  }

  // ---------- what can you do here? ----------
  let action = null;        // { type, label, target }
  let lastActionKey = '';
  let hakUntil = 0;
  let fishing = null;       // { until, biteUntil }
  function bearNear() {
    const b = bear ? bear.b : remoteBear && remoteBear.state === 'come' ? remoteBear.holder.position : null;
    return b && Math.hypot(player.x - b.x, player.z - b.z) < REACH.bear && (!bear || bear.b.state === 'come');
  }
  function findAction(now) {
    const px = player.x, pz = player.z;
    if (fishing) return { type: fishing.biteUntil ? 'trek' : 'vis', label: fishing.biteUntil ? 'TREK' : 'WACHT', target: null };
    if (bearNear()) return { type: 'boe', label: 'BOE', target: null };
    if (gear.tent && daynight.darkness > 0.5 && Math.hypot(px - TENT_AT.x, pz - TENT_AT.z) < REACH.tent) return { type: 'slaap', label: 'SLAAP', target: null };
    if (Math.hypot(px - camp.chest.pos.x, pz - camp.chest.pos.z) < 1.9) return { type: 'kist', label: camp.chest.isOpen ? 'LEEG' : 'OPEN', target: null };
    for (const dr of drops) if (Math.hypot(px - dr.x, pz - dr.z) < 1.4) return { type: 'drop', label: 'PAK', target: dr };   // your own things, shaken out by the deer
    if (Math.hypot(px - CAMP.x, pz - CAMP.z) < REACH.camp) {
      if ((state.eiland.bag.hout || 0) > 0 && state.nacht.fire < 100 - N.woodValue) return { type: 'stook', label: 'STOOK', target: null };
      return { type: 'kamp', label: 'KAMP', target: null };
    }
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
      const ts = trees.get(`${o.kind}:${o.index}`);
      if (ts && ts.restUntil > now) continue;   // a stump: nothing to chop
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
  /** The action button was pressed (or E / Enter on a keyboard). */
  function doAction() {
    const now = performance.now();
    if (!action) return;
    switch (action.type) {
      case 'kamp': cb.onKamp && cb.onKamp(); return;
      case 'kist': cb.onChest && cb.onChest(); return;
      case 'drop': {
        const dr = action.target;
        const i = drops.indexOf(dr);
        if (i >= 0) { drops.splice(i, 1); scene.remove(dr.mesh); }
        cb.onCollect && cb.onCollect(dr.item, 1);
        game.audio.play('coinSoft');
        if (!drops.length) cb.onSay && cb.onSay('lines.dropsPicked');
        return;
      }
      case 'stook': cb.onStoke && cb.onStoke(); return;
      case 'slaap':
        if (samen && samen.isGuest) { samen.send('sleep', {}); cb.onSay && cb.onSay('lines.sleep'); }
        else cb.onSleep && cb.onSleep();
        return;
      case 'boe':
        game.audio.play('unlock');
        hakUntil = now + 300;
        if (samen && samen.isGuest) { samen.send('boe', {}); cb.onSay && cb.onSay('lines.bearScared'); }
        else doScare();
        return;
      case 'schelp':
        action.target.taken = true;
        forest.setScale('shell', action.target.index, 0);
        cb.onCollect && cb.onCollect('schelp', 1);
        game.audio.play('coinSoft');
        return;
      case 'bes': {
        const b = action.target;
        b.restUntil = now + E.bushRestMs;
        forest.setScale('bush2', b.index, 0.8);
        setTimeout(() => forest.setScale('bush2', b.index, 1), E.bushRestMs);
        cb.onCollect && cb.onCollect('bes', E.berries);
        game.audio.play('coinSoft');
        return;
      }
      case 'hak': {
        const t = treeState(action.target);
        if (t.restUntil > now) { cb.onSay && cb.onSay('lines.treeRest'); return; }
        const rule = chopRule(state.eiland, config);
        hakUntil = now + 380;
        player.heading = Math.atan2(action.target.x - player.x, action.target.z - player.z);
        game.audio.play('thud');
        wobble(action.target);
        t.taps++;
        if (t.taps >= rule.taps) {
          t.taps = 0;
          t.wood += rule.wood;
          burstChips(action.target.x, player.ground, action.target.z);
          cb.onCollect && cb.onCollect('hout', rule.wood);
          if (t.wood >= E.treeWood) {
            // timber! the tree comes down with a bonus, leaves a stump and grows back after the rest
            t.wood = 0;
            t.restUntil = now + E.treeRestMs + 2500;
            fellTree(action.target, player, now);
            burstChips(action.target.x, player.ground + 0.5, action.target.z);
            cb.onCollect && cb.onCollect('hout', E.treeFallBonus);
            cb.onSay && cb.onSay('lines.treeFell');
          }
        }
        return;
      }
      case 'vis': {
        fishing = { until: now + E.fish.waitMinMs + Math.random() * (E.fish.waitMaxMs - E.fish.waitMinMs), biteUntil: 0 };
        player.heading = Math.atan2(LAKE.x - player.x, LAKE.z - player.z);
        const d = 1.6;
        bobber.position.set(player.x + Math.sin(player.heading) * d, LAKE.level + 0.05, player.z + Math.cos(player.heading) * d);
        bobber.visible = true;
        cb.onSay && cb.onSay('lines.fishWait');
        return;
      }
      case 'trek':
        if (fishing && fishing.biteUntil && now < fishing.biteUntil) {
          cb.onCollect && cb.onCollect('vis', perks(state.eiland, config).fishPer);
          jumpFish(bobber.position, new T.Vector3(player.x, player.ground + 0.9, player.z));
          game.audio.play('splash');
          game.audio.play('buy');
        }
        stopFishing();
        return;
      default: return;
    }
  }
  // a tap on a thing in the world (tree, shell, berry bush) within reach does what the button would do
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  function handleTap(tp) {
    if (!W || !H) return;
    ndc.set((tp.x / W) * 2 - 1, -(tp.y / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const kinds = ['tree1', 'tree2', 'tree3', 'shell', 'bush2'].filter((k) => forest.meshes[k]);
    const hits = raycaster.intersectObjects(kinds.map((k) => forest.meshes[k]), false);
    const now = performance.now();
    for (const h of hits) {
      const kind = kinds.find((k) => forest.meshes[k] === h.object);
      const idx = h.instanceId;
      let picked = null;
      if (kind === 'shell') {
        const s = shells[idx];
        if (s && !s.taken && Math.hypot(s.x - player.x, s.z - player.z) < REACH.shell + 0.8) picked = { type: 'schelp', label: 'PAK', target: s };
      } else if (kind === 'bush2') {
        const b = bushes[idx];
        if (b && b.restUntil <= now && Math.hypot(b.x - player.x, b.z - player.z) - b.r < REACH.bush + 0.8) picked = { type: 'bes', label: 'PLUK', target: b };
      } else {
        const o = forest.obstacles.find((ob) => ob.kind === kind && ob.index === idx);
        const ts = o && trees.get(`${o.kind}:${o.index}`);
        if (o && !(ts && ts.restUntil > now) && Math.hypot(o.x - player.x, o.z - player.z) - o.r < REACH.tree + 1.0) picked = { type: 'hak', label: 'HAK', target: o };
      }
      if (picked) { action = picked; doAction(); return; }
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

  // ---------- the cave (V5.2): keep a point inside the corridor or the chamber; bats; drips; the cave ghost ----------
  const cv = camp.cave;
  /** The nearest point inside the cave to (x, z), `margin` away from the walls. */
  function clampInCave(x, z, margin) {
    let best = null, bd = Infinity;
    for (let i = 0; i < cv.segs.length; i++) {
      const s = cv.segs[i];
      const dx = Math.sin(s.h), dz = Math.cos(s.h), rx = Math.cos(s.h), rz = -Math.sin(s.h);
      const relx = x - s.ax, relz = z - s.az;
      const along = Math.max(i === 0 ? -4 : 0, Math.min(s.len, relx * dx + relz * dz));
      const lat = Math.max(-(CAVE.halfWidth - margin), Math.min(CAVE.halfWidth - margin, relx * rx + relz * rz));
      const px = s.ax + dx * along + rx * lat, pz = s.az + dz * along + rz * lat;
      const d = Math.hypot(px - x, pz - z);
      if (d < bd) { bd = d; best = { x: px, z: pz }; }
    }
    const ch = cv.chamber;
    const dc = Math.hypot(x - ch.x, z - ch.z);
    const rr = Math.min(dc, ch.r - margin);
    const cx = dc > 1e-6 ? ch.x + ((x - ch.x) / dc) * rr : ch.x, cz = dc > 1e-6 ? ch.z + ((z - ch.z) / dc) * rr : ch.z;
    if (Math.hypot(cx - x, cz - z) < bd) best = { x: cx, z: cz };
    return best;
  }
  let batsState = 'hang', batsT = 0, batsReturnAt = 0;
  function updateBats(now, dt) {
    const inChamber = map.inChamber(player.x, player.z, -0.5);
    if (batsState === 'hang' && inChamber) { batsState = 'fly'; batsT = 0; game.audio.play('flutter'); cb.onSay && cb.onSay('lines.batsFly'); }
    if (batsState === 'fly') {
      batsT += dt;
      cv.bats.forEach((b, i) => {
        const t = Math.max(0, batsT - i * 0.12);
        const along = CAVE.depth + 1.5 - t * 5.5;   // from the chamber out through the mouth
        if (along < -6) { b.mesh.visible = false; return; }
        const p = caveInner(Math.max(0, along));
        const out = along < 0 ? { x: p.x + Math.sin(CAVE.heading) * -along, z: p.z + Math.cos(CAVE.heading) * -along } : p;
        b.mesh.position.set(out.x + Math.sin(now / 90 + b.ph) * 0.4, CAVE.floor + 2.2 + Math.sin(now / 140 + b.ph) * 0.4 + (along < 0 ? -along * 0.4 : 0), out.z + Math.cos(now / 110 + b.ph) * 0.4);
        b.mesh.scale.y = 1 + Math.sin(now / 45 + b.ph) * 0.6;
        b.mesh.rotation.y = -CAVE.heading + Math.PI;
      });
      if (batsT > 4) { batsState = 'away'; batsReturnAt = now + 45000; }
    } else if (batsState === 'away' && now > batsReturnAt && !inChamber) {
      batsState = 'hang';
      for (const b of cv.bats) { b.mesh.visible = true; b.mesh.position.copy(b.home); b.mesh.scale.y = 1; }
    } else if (batsState === 'hang') {
      for (const b of cv.bats) b.mesh.rotation.z = Math.sin(now / 700 + b.ph) * 0.15;
    }
  }
  let nextDrip = 0;
  const drop = (() => { const m = new T.Mesh(new T.SphereGeometry(0.07, 6, 5), new T.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x4fc8ff, emissiveIntensity: 0.6 })); m.visible = false; scene.add(m); return m; })();
  let dropT = -1;
  function updateDrips(now, dt) {
    const inside = map.inCave(player.x, player.z);
    if (inside && now > nextDrip) {
      nextDrip = now + 2500 + Math.random() * 4000;
      game.audio.play('drip');
      const a = Math.random() * Math.PI * 2, rr = Math.random() * (cv.chamber.r - 0.8);
      drop.position.set(cv.chamber.x + Math.cos(a) * rr, CAVE.floor + 3.4, cv.chamber.z + Math.sin(a) * rr);
      drop.visible = true; dropT = 0;
    }
    if (dropT >= 0) { dropT += dt; drop.position.y -= 6 * dt * dropT * 2; if (drop.position.y < CAVE.floor + 0.05) { dropT = -1; drop.visible = false; } }
  }
  // the cave ghost: asleep beside the chest; wakes when the chest opens; chases you to the mouth; steals when it catches you
  const caveGhost = { model: ghostModel(), holder: new T.Group(), x: cv.ghostAt.x, z: cv.ghostAt.z, state: 'sleep', pauseUntil: 0, woke: false, said: false };
  caveGhost.model.group.scale.setScalar(1.25);
  caveGhost.holder.add(caveGhost.model.group);
  caveGhost.holder.position.set(caveGhost.x, CAVE.floor, caveGhost.z);
  scene.add(caveGhost.holder);
  function updateCaveGhost(now, dt) {
    const g = caveGhost;
    const CG = E.caveGhost;
    const inside = map.inCave(player.x, player.z, -0.3);
    if (g.state === 'sleep') {
      if (camp.chest.isOpen && !g.woke) { g.woke = true; g.state = 'chase'; g.said = false; game.audio.play('boo'); cb.onSay && cb.onSay('lines.caveGhostWakes'); }
      if (!camp.chest.isOpen) g.woke = false;
      g.model.update(now, { fade: 0.7 });
      g.holder.rotation.y += (Math.atan2(cv.chamber.x - g.x, cv.chamber.z - g.z) - g.holder.rotation.y) * 0.05;
      return;
    }
    if (g.state === 'chase' || g.state === 'pause') {
      if (!inside) { g.state = 'return'; if (!g.said) { g.said = true; cb.onSay && cb.onSay('lines.caveGhostEscaped'); } }
      else if (g.state === 'pause' && now > g.pauseUntil) g.state = 'chase';
      else if (g.state === 'chase') {
        const dx = player.x - g.x, dz = player.z - g.z, d = Math.hypot(dx, dz);
        if (d < CG.reach) { g.state = 'pause'; g.pauseUntil = now + CG.pauseMs; game.audio.play('boo'); cb.onCaveGhostCaught && cb.onCaveGhostCaught(); }
        else {
          const nx = g.x + (dx / d) * CG.speed * dt, nz = g.z + (dz / d) * CG.speed * dt;
          const c = clampInCave(nx, nz, 0.5);
          g.x = c.x; g.z = c.z;
          g.holder.rotation.y = Math.atan2(dx, dz);
        }
      }
    } else if (g.state === 'return') {
      const dx = cv.ghostAt.x - g.x, dz = cv.ghostAt.z - g.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { g.x = cv.ghostAt.x; g.z = cv.ghostAt.z; g.state = 'sleep'; }
      else { g.x += (dx / d) * CG.speed * 0.8 * dt; g.z += (dz / d) * CG.speed * 0.8 * dt; g.holder.rotation.y = Math.atan2(dx, dz); }
    }
    g.holder.position.set(g.x, CAVE.floor, g.z);
    g.model.update(now, { fade: 1 });
  }

  // ---------- camera ----------
  function placeCamera(dt) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const py = player.ground + player.y * 0.5;
    camPos.set(player.x - Math.sin(yaw) * CAM.dist * cp, py + CAM.dist * sp + 0.4, player.z - Math.cos(yaw) * CAM.dist * cp);
    if (map.inCave(player.x, player.z, 0.4)) {
      // inside the cave the camera stays close, inside the walls and under the roof
      const d = 2.6;
      camPos.set(player.x - Math.sin(yaw) * d, player.ground + 1.7, player.z - Math.cos(yaw) * d);
      const c = clampInCave(camPos.x, camPos.z, 0.45);
      camPos.set(c.x, camPos.y, c.z);
    } else {
      const floor = groundOf(camPos.x, camPos.z) + 0.8;
      if (camPos.y < floor) camPos.y = floor;
    }
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
    updateWobbles(dt);
    updateFalls(now, dt);
    updateFish(dt);
    updateBats(now, dt);
    updateDrips(now, dt);
    updateCaveGhost(now, dt);
    forest.animate(now, dt, daynight.darkness);
    if (input.tap) handleTap(input.tap);
    const next = findAction(now);
    const key = next ? `${next.type}:${next.label}` : '';
    if (key !== lastActionKey) { lastActionKey = key; action = next; cb.onAction && cb.onAction(next); }
    else action = next;

    avatar.group.position.set(player.x, 0, player.z);
    avatar.group.rotation.y = player.heading;
    const pose = !player.grounded ? 'jump' : hakUntil > now ? 'hak' : fishing ? 'vis' : myEmoteUntil > now ? myEmote : player.moving ? 'walk' : 'idle';
    avatar.update(player.running && player.grounded ? now * 1.45 : now, pose, { z: player.ground + player.y });
    if (pet) {
      pet.group.position.set(dog.x, dog.ground, dog.z);
      pet.group.rotation.y = dog.heading;
      pet.update(now, { walking: dog.moving, phase: petPhase });
    }
    if (samen && samen.active) samen.sendPos(player.x, player.z, player.heading, pose, player.y, now);
    updateRemotes(now, dt);

    placeCamera(dt);
    focus.set(player.x, player.ground, player.z);
    daynight.update(now, focus, state.nacht.clockOffsetMs);
    const lite = engine.tier >= 2;
    terrain.update(now, lite);
    camp.update(now, daynight.darkness, lite);
    updateNight(now, dt);
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
    get ghosts() { return (samen && samen.isGuest ? remoteGhosts.map((rg) => ({ x: rg.holder.position.x, z: rg.holder.position.z, state: 'remote' })) : ghosts.map((gh) => ({ x: gh.g.x, z: gh.g.z, state: gh.g.state }))); },
    get bear() { return bear ? { x: bear.b.x, z: bear.b.z, state: bear.b.state, scared: bear.b.scared } : null; },
    get lights() { return state ? lightsNow() : []; },
    get remotes() { return [...remotes.entries()].map(([id, r]) => ({ id, x: r.x, z: r.z, pose: r.pose, tag: r.key })); },
    onLand(x, z) { return map.walkable(x, z); },
    kindAt(x, z) { return map.kindAt(x, z); },
    landmarks: { CAMP, PIER, LAKE, TENT: TENT_AT, CHEST: camp.chest.pos, CAVE },
    setChestOpen(open) { camp.chest.setOpen(open); },
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
    setPhase(p) { phaseOverride = p; daynight.setOverride(p); },
    teleport(x, z) { player.x = x; player.z = z; player.ground = map.groundAt(x, z); firstFrame = true; },
    act() { doAction(); },
    tapAt(x, y) { handleTap({ x, y }); },
    get fallen() { return falls.length; },
    get caveGhost() { return { x: caveGhost.x, z: caveGhost.z, state: caveGhost.state }; },
    get deer() { return deer ? { x: deer.d.x, z: deer.d.z, state: deer.d.state } : null; },
    get drops() { return drops.map((d) => ({ item: d.item, x: d.x, z: d.z })); },
    get speedMul() { return env.speedMul; },
    spawnDeer,
    /** Put the deer right behind the player in charge mode (tests). */
    deerAt(x, z) { spawnDeer(); deer.d.x = x; deer.d.z = z; deer.d.state = 'charge'; },
    get bats() { return batsState; },
    inCave(x, z) { return map.inCave(x, z); },
    emote,
    bite() { if (fishing && !fishing.biteUntil) fishing.until = 0; },
    spawnGhost, spawnBear,
    /** Put a ghost right next to the player (tests): it steals on the next step unless the spot is lit. */
    ghostAt(x, z) { spawnGhost(); const gh = ghosts[ghosts.length - 1]; gh.g.x = x; gh.g.z = z; },
  };

  return { mount, resize, render, setState, reset, doAction, emote, hook, camera, scene, setChestOpen: (o) => camp.chest.setOpen(o) };
}
