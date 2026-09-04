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
import { createHeightmap, PIER, CAMP, LAKE, CAVE } from './heightmap.js';
import { createTerrain } from './terrain.js';
import { placeForest, buildForest } from './forest.js';
import { createCamp } from './camp.js';
import { createDayNight } from './daynight.js';
import { ghostModel, bearModel, tentModel, torchModel, fenceModel } from './spoken.js';
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
  let phaseOverride = null;
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
    if (tools.hek && !gear.fence) {
      gear.fence = fenceModel(CAMP.x, CAMP.z, N.fenceRadius, map.heightAt);
      scene.add(gear.fence);
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
    const gone = scareBear(bear.b, config);
    cb.onSay && cb.onSay(gone ? 'lines.bearGone' : 'lines.bearScared');
  }
  function updateNight(now, dt) {
    syncGear();
    const dark = daynight.darkness;
    const guest = samen && samen.isGuest;
    if (!guest) cb.onBurn && cb.onBurn(dt * 1000, dark);
    const n = state.nacht;
    camp.setFire(n.fire / 100);
    lantern.position.set(player.x, player.ground + 1.7, player.z);
    lantern.intensity = (0.2 + dark * 2.5) * 4;
    if (gear.torches) for (const t of gear.torches) { t.light.intensity = (0.3 + dark * 2.2) * 3; t.flame.scale.setScalar(1 + Math.sin(now / 80 + t.x) * 0.12); }
    const isDark = dark > 0.5;
    if (isDark && !wasDark) {
      wasDark = true;
      fireWasBurning = n.fire > 0;
      ghostTimer = N.ghostEveryMs * 0.6;   // the first ghost comes soon after dark
      const bearNight = bearTonight(n, config);
      cb.onNight && cb.onNight(bearNight && !guest);
      if (bearNight && !guest) spawnBear();
    }
    if (!isDark && wasDark) {
      wasDark = false;
      cb.onDawn && cb.onDawn(fireWasBurning && n.fire > 0);
      clearNight();
    }
    if (isDark && n.fire <= 0) fireWasBurning = false;
    if (guest) { updateRemoteWorld(now, dt); return; }
    if (isDark) {
      ghostTimer += dt * 1000;
      if (ghosts.length < N.ghostsMax && ghostTimer > N.ghostEveryMs) { ghostTimer = 0; spawnGhost(); }
    }
    const lit = lightsNow();
    const fence = state.eiland.tools.hek ? { x: CAMP.x, z: CAMP.z, r: N.fenceRadius } : null;
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const gh = ghosts[i];
      const dp = Math.hypot(player.x - gh.g.x, player.z - gh.g.z);
      const target = dp < 12 ? { x: player.x, z: player.z } : { x: CAMP.x, z: CAMP.z };
      const res = stepGhost(gh.g, { target, lights: lit, fence, dt }, config);
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
          if (t.wood >= E.treeWood) { t.wood = 0; t.restUntil = now + E.treeRestMs; }
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
          cb.onCollect && cb.onCollect('vis', 1);
          jumpFish(bobber.position, new T.Vector3(player.x, player.ground + 0.9, player.z));
          game.audio.play('splash');
          game.audio.play('buy');
        }
        stopFishing();
        return;
      default: return;
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
    if (map.inCave(player.x, player.z, 0.4)) {
      // inside the tunnel the camera stays close and inside the walls, under the roof
      const d = 2.6;
      camPos.set(player.x - Math.sin(yaw) * d, player.ground + 1.7, player.z - Math.cos(yaw) * d);
      const ax = -Math.sin(CAVE.heading), az = -Math.cos(CAVE.heading), rx = Math.cos(CAVE.heading), rz = -Math.sin(CAVE.heading);
      const relx = camPos.x - CAVE.x, relz = camPos.z - CAVE.z;
      const along = Math.max(-4, Math.min(CAVE.depth - 0.4, relx * ax + relz * az));
      const lat = Math.max(-(CAVE.halfWidth - 0.4), Math.min(CAVE.halfWidth - 0.4, relx * rx + relz * rz));
      camPos.set(CAVE.x + ax * along + rx * lat, camPos.y, CAVE.z + az * along + rz * lat);
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
    updateFish(dt);
    forest.animate(now, dt, daynight.darkness);
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
    emote,
    bite() { if (fishing && !fishing.biteUntil) fishing.until = 0; },
    spawnGhost, spawnBear,
    /** Put a ghost right next to the player (tests): it steals on the next step unless the spot is lit. */
    ghostAt(x, z) { spawnGhost(); const gh = ghosts[ghosts.length - 1]; gh.g.x = x; gh.g.z = z; },
  };

  return { mount, resize, render, setState, reset, doAction, emote, hook, camera, scene, setChestOpen: (o) => camp.chest.setOpen(o) };
}
