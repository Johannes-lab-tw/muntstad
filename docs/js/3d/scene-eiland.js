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
import { createPlayer, createFollower, stepPlayer, stepFollower, turnTowards } from './player.js';
import { addLights } from './engine.js';
import { createHeightmap, PIER, CAMP, LAKE, CAVE, HILL, VUURTOREN, HUT, RUINE, caveInner } from './heightmap.js';
import { createWater } from './terrain.js';
import { createTiles } from './tiles.js';
import { createCamp } from './camp.js';
import { createVuurtoren } from './vuurtoren.js';
import { createDayNight } from './daynight.js';
import { ghostModel, bearModel, tentModel, torchModel, fenceModel, deerModel, dropModel, wolfModel, piraatModel, bootModel } from './spoken.js';
import { perks, nightRules, hungerSpeedMul, coldSpeedMul, isCold } from '../uitdaging.js';
import { Builder, textPlane, MAT } from './build.js';
import { isFunActive } from '../economy.js';
import { chopRule } from '../eiland.js';
import { fireRadius, fireLevel, isLit, stepGhost, bearTonight, stepBear, scareBear, stepWolf, scareWolf } from '../nacht.js';
import { plekAt } from '../ketens.js';
import { weerVoorDag, burnMul as weerBurnMul, seedOf, WEER } from '../weer.js';
import { KAARTSTUKKEN, X_PLEKKEN, kaartStukken, kaartCompleet, schatPlek, weekKey } from '../schat.js';
import { piratenNacht, stepPiraat, scarePiraat, buit } from '../piraten.js';
import { wapenVoor, levens, tref, roedel, nachtPlan } from '../gevecht.js';
import { KISTEN, kistenVandaag, kistOpen, dagKey } from '../werkbank.js';
import { baasVoorNacht, baasById, maakBaas, stepBaas } from '../bazen.js';
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
  const water = createWater(map);
  scene.add(water.group);
  const camp = createCamp(map);
  scene.add(camp.group);
  const vuurtoren = createVuurtoren(map);   // V6.5: the lighthouse and the hut on the north coast
  scene.add(vuurtoren.group);
  // V6.2: the island in tiles round the player; the camp's things are the static obstacles every tile shares
  // V8.3: the ruin gets walls, an old well and a signpost (and they block the way)
  function createRuine() {
    const g = new T.Group();
    const b = new Builder({ r: 0.04 });
    const obstacles = [];
    for (const [dx, dz, w, d, h] of [[-7, -6, 6, 0.8, 2.2], [-7, -6, 0.8, 5, 1.6], [5, -5, 0.8, 7, 2.6], [3, 6, 7, 0.8, 1.4], [-5, 5, 4, 0.8, 1.0]]) {
      b.box(dx, dz, 0, w, d, h, '#b9b1a3', { r: 0.03 });
      b.box(dx + 0.1, dz + 0.1, h, w - 0.2, d - 0.2, 0.25, '#8f877a', { r: 0.02 });
      obstacles.push({ x: RUINE.x + dx + w / 2, z: RUINE.z + dz + d / 2, r: Math.max(w, d) / 2, kind: 'muur' });
    }
    b.cyl(0, 0, 0, 1.2, 0.9, '#a39b8d', 16);
    b.cyl(0, 0, 0.9, 1.05, 0.05, '#2b2f45', 16);
    for (const dx of [-1.0, 1.0]) b.cyl(dx, 0, 0.9, 0.08, 1.6, '#8a5a35', 8);
    b.box(-1.3, -0.7, 2.4, 2.6, 1.4, 0.16, '#c96b3a', { r: 0.03 });
    obstacles.push({ x: RUINE.x, z: RUINE.z, r: 1.3, kind: 'put' });
    b.cyl(3.2, -1.5, 0, 0.07, 1.8, '#8a5a35', 8);
    g.add(b.build());
    const sign = textPlane('?', { w: 0.9, h: 0.9, font: 0.7, color: '#ffffff', bg: '#c96b3a' });
    sign.position.set(3.2, 1.9, -1.5);
    g.add(sign);
    g.position.set(RUINE.x, map.heightAt(RUINE.x, RUINE.z), RUINE.z);
    scene.add(g);
    return { group: g, obstacles };
  }
  const ruine = createRuine();
  // V9.3: the ten chests (three filled a day) and the camp's levels
  function kistModel() {
    const g = new T.Group();
    const b = new Builder({ r: 0.04 });
    b.box(-0.45, -0.3, 0, 0.9, 0.6, 0.5, '#8a5a35', { r: 0.06 });
    b.box(-0.47, -0.32, 0.18, 0.94, 0.64, 0.08, '#ffc21c', { r: 0.02 });
    g.add(b.build());
    const lb = new Builder({ r: 0.04 });
    lb.box(-0.45, 0, 0, 0.9, 0.6, 0.16, '#a06a35', { r: 0.06 });
    const lid = lb.build();
    lid.position.set(0, 0.5, -0.3);
    g.add(lid);
    const glow = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), new T.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.85 }));
    glow.position.set(0, 0.95, 0);
    g.add(glow);
    return { group: g, lid, glow };
  }
  const kisten = KISTEN.map((k, i) => {
    let x = k.x, z = k.z;
    for (let r = 1; r < 8 && !map.walkable(x, z); r++) for (let a = 0; a < 8 && !map.walkable(x, z); a++) { x = k.x + Math.cos(a) * r; z = k.z + Math.sin(a) * r; }
    const m = kistModel();
    m.group.position.set(x, map.heightAt(x, z), z);
    m.group.visible = false;
    scene.add(m.group);
    return { i, x, z, zone: k.zone, ...m, open: false };
  });
  let lastKistSync = 0;
  function syncKisten(now) {
    if (!state || now - lastKistSync < 1000) return;
    lastKistSync = now;
    const day = dagKey(game.now());
    const filled = kistenVandaag(day, seedOf(state));
    const today = state.eiland.kistenDag === day ? state.eiland : { kistenOpen: 0 };
    for (const k of kisten) {
      k.group.visible = filled.includes(k.i);
      k.open = kistOpen(today, k.i);
      k.lid.rotation.x = k.open ? -1.3 : 0;
      k.glow.visible = !k.open;
    }
  }
  const kampGear = { level: 0, toren: null, torenLight: null, opslag: null, vlag: null };
  function syncKamp() {
    const lvl = (state && state.eiland.kamp) || 0;
    if (lvl === kampGear.level) return;
    kampGear.level = lvl;
    const tx = CAMP.x + 7.5, tz = CAMP.z + 7.5, ty = map.heightAt(tx, tz);
    if (lvl >= 2 && !kampGear.toren) {
      const b = new Builder({ r: 0.04 });
      for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) b.cyl(dx, dz, 0, 0.1, 4.2, '#8a5a35', 8);
      b.box(-1.2, -1.2, 4.1, 2.4, 2.4, 0.16, '#a06a35', { r: 0.03 });
      for (const [dx, dz, w, d] of [[-1.2, -1.2, 2.4, 0.1], [-1.2, 1.1, 2.4, 0.1], [-1.2, -1.2, 0.1, 2.4], [1.1, -1.2, 0.1, 2.4]]) b.box(dx, dz, 4.26, w, d, 0.7, '#8a5a35', { r: 0.02 });
      b.cyl(0, 0, 4.26, 0.06, 1.2, '#dcd7cb', 6);
      b.sphere(0, 0, 5.5, 0.22, '#ffe28a', 8);
      const m = b.build();
      m.position.set(tx, ty, tz);
      scene.add(m);
      kampGear.toren = m;
      kampGear.torenLight = new T.PointLight(0xffd080, 0, 16, 1.6);
      kampGear.torenLight.position.set(tx, ty + 5.5, tz);
      scene.add(kampGear.torenLight);
    }
    if (lvl >= 3 && gear.tent) gear.tent.scale.setScalar(1.3);
    if (lvl >= 4 && !kampGear.opslag) {
      const b = new Builder({ r: 0.05 });
      b.box(-0.8, -0.5, 0, 1.6, 1.0, 0.9, '#8a5a35', { r: 0.08 });
      b.box(-0.82, -0.52, 0.4, 1.64, 1.04, 0.1, '#ffc21c', { r: 0.02 });
      const m = b.build();
      m.position.set(CAMP.x - 3.4, map.heightAt(CAMP.x - 3.4, CAMP.z + 3.2), CAMP.z + 3.2);
      scene.add(m);
      kampGear.opslag = m;
    }
    if (lvl >= 5 && !kampGear.vlag) {
      const pole = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.2, 6), new T.MeshStandardMaterial({ color: col('#dcd7cb') }));
      pole.position.set(tx + 0.9, ty + 5.3, tz + 0.9);
      const cloth = new T.Mesh(new T.PlaneGeometry(1.1, 0.7).translate(0.55, 0, 0), new T.MeshStandardMaterial({ color: col('#ff3b3b'), side: T.DoubleSide }));
      cloth.position.set(tx + 0.9, ty + 6.1, tz + 0.9);
      scene.add(pole, cloth);
      kampGear.vlag = cloth;
    }
  }
  const tiles = createTiles(map, { statics: [...camp.obstacles, ...vuurtoren.obstacles, ...ruine.obstacles], isLite: () => engine.tier >= 2, tierOf: () => engine.tier });
  // V8.3: the mounds of earth: one per map piece (gone once dug) and the X of the week (a red cross on top)
  function moundModel(withX) {
    const b = new Builder({ r: 0.03 });
    b.puff(0, 0, 0.1, 0.8, '#7a5a3a', 1);
    b.puff(0.4, 0.2, 0.05, 0.5, '#8a6a45', 1);
    b.puff(-0.35, -0.2, 0.05, 0.45, '#6b4e33', 1);
    b.sphere(0.1, 0, 0.95, 0.16, '#1b1f3b', 8);   // the crow
    b.sphere(0.26, 0, 1.06, 0.1, '#1b1f3b', 8);
    b.box(0.32, -0.03, 1.03, 0.14, 0.06, 0.05, '#ff9f2e', { r: 0.01 });
    if (withX) for (const a of [Math.PI / 4, -Math.PI / 4]) { const g = new T.BoxGeometry(1.5, 0.06, 0.2); g.rotateY(a); g.translate(0, 0.9, 0); b.add(g, '#ff3b3b'); }
    return b.build({ receive: false });
  }
  const mounds = KAARTSTUKKEN.map((k) => { const mesh = moundModel(false); mesh.position.set(k.x, map.heightAt(k.x, k.z), k.z); mesh.visible = false; scene.add(mesh); return { ...k, mesh }; });
  const xMound = { mesh: moundModel(true), x: 0, z: 0, on: false };
  xMound.mesh.visible = false;
  scene.add(xMound.mesh);
  let lastSchatSync = 0;
  function syncSchat(now) {
    if (!state || now - lastSchatSync < 1000) return;
    lastSchatSync = now;
    const have = kaartStukken(state.eiland);
    for (const m of mounds) m.mesh.visible = !have.includes(m.id);
    const week = weekKey(game.now());
    const on = kaartCompleet(state.eiland) && state.eiland.schatWeek !== week;
    if (on) {
      let p = schatPlek(week, seedOf(state));
      for (let i = 1; i < X_PLEKKEN.length && !map.walkable(p.x, p.z); i++) p = schatPlek(week, seedOf(state), i);
      if (p.x !== xMound.x || p.z !== xMound.z) { xMound.x = p.x; xMound.z = p.z; xMound.mesh.position.set(p.x, map.heightAt(p.x, p.z), p.z); }
    }
    xMound.on = on;
    xMound.mesh.visible = on;
  }
  scene.add(tiles.group);
  const lights = addLights(scene, new T.Vector3(CAMP.x, 1, CAMP.z), 20, engine.tier);
  // V9.1: on tier 1 and 2 every plastic surface swaps to the Lambert twin (same colours, no PBR per pixel), and back
  let liteMat = false;
  function swapMaterials(lite) {
    if (lite === liteMat) return;
    liteMat = lite;
    scene.traverse((o) => {
      if (!o.material) return;
      if (lite) { if (o.material === MAT.plastic) o.material = MAT.plasticLite; else if (o.material === MAT.plasticFlat) o.material = MAT.plasticFlatLite; }
      else { if (o.material === MAT.plasticLite) o.material = MAT.plastic; else if (o.material === MAT.plasticFlatLite) o.material = MAT.plasticFlat; }
    });
  }
  engine.onTier((t) => {
    lights.setTier(t);
    // lite tier (slow iPad / software renderer): the two biggest instanced kinds (grass tufts, flowers) are pure decoration
    tiles.setLite(t >= 2);
    if (scene.fog) scene.fog.far = t >= 2 ? 70 : 95;   // the fog exists once daynight is created
    swapMaterials(t >= 1);
  });
  // V9.1: the light budget. Three.js evaluates every point light in the scene in every pixel, even at intensity 0;
  // eleven of them (fire, lantern, hut, cave, lighthouse, torches, lightning tree) cost an iPad a third of its frame.
  // Twice a second only the four nearest lights that actually shine stay in the scene.
  let pointLights = [], lightsScanned = 0, lightsBudgeted = 0;
  const LIGHT_BUDGET = 4;
  function budgetLights(now) {
    if (now - lightsScanned > 5000) { pointLights = []; scene.traverse((o) => { if (o.isPointLight) pointLights.push(o); }); lightsScanned = now; }
    if (now - lightsBudgeted < 500) return;
    lightsBudgeted = now;
    const wp = new T.Vector3();
    const on = [];
    for (const l of pointLights) {
      if (l.intensity <= 0.05) { l.visible = false; continue; }
      l.getWorldPosition(wp);
      on.push({ l, d: Math.hypot(wp.x - player.x, wp.z - player.z) });
    }
    on.sort((a, b) => a.d - b.d);
    on.forEach((e, i) => { e.l.visible = i < LIGHT_BUDGET; });
  }
  let liteFrame = 0;
  const daynight = createDayNight(scene, lights);
  // with the climbing shoes (V6.6) the snow is walkable: the top of the mountain is chapter 4
  const walkable = (x, z) => map.walkable(x, z) || (!!(state && state.eiland.tools.klimschoenen) && x > 1 && z > 1 && x < map.size - 1 && z < map.size - 1 && map.kindAt(x, z) === 'snow');
  const env = { yaw: START.heading, near: (x, z) => tiles.near(x, z), walkable, groundAt: map.groundAt, speedMul: 1 };
  const trees = new Map();   // tile:kind:index → { taps, wood, restUntil }
  const treeKey = (o) => `${o.tile}:${o.kind}:${o.index}`;

  const camera = new T.PerspectiveCamera(50, 1, 0.1, 260);
  const camPos = new T.Vector3(), camLook = new T.Vector3();
  let W = 0, H = 0, host = null, state = null;
  let yaw = START.heading, pitch = CAM.pitch, firstFrame = true;

  tiles.warm(START.x, START.z);
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
  const wobbles = [];   // { o, t }
  function wobble(o) { wobbles.push({ o, t: 0 }); }
  function updateWobbles(dt) {
    for (let i = wobbles.length - 1; i >= 0; i--) {
      const w = wobbles[i];
      w.t += dt;
      const f = Math.min(1, w.t / 0.55);
      tiles.setPose(w.o, 1, Math.sin(f * Math.PI * 3) * 0.09 * (1 - f));
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
    for (let i = wobbles.length - 1; i >= 0; i--) if (wobbles[i].o === o) wobbles.splice(i, 1);
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
        tiles.setPose(f.o, 1, Math.min(1.5, k * k * 1.6), f.yaw);
        if (!f.thud && k > 0.85) { f.thud = true; game.audio.play('thud'); }
      } else if (f.t < 2.2) tiles.setPose(f.o, Math.max(0.001, 1 - (f.t - 1.0) / 1.2), 1.5, f.yaw);
      else if (now < f.restUntil) { if (!f.gone) { f.gone = true; tiles.setPose(f.o, 0.001); } }
      else {
        const g = Math.min(1, (now - f.restUntil) / 2000);
        tiles.setPose(f.o, 0.05 + g * 0.95);
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
    samen.on('boe', () => { if (samen.isHost && bears.length) doScare(); });
    samen.on('sleep', () => { if (samen.isHost && cb.onSleep) cb.onSleep(); });
    samen.on('down', (d, from) => { const r = ensureRemote(from); r.down = true; });
    samen.on('up', (d, from) => { const r = remotes.get(from); if (r) r.down = false; });
    samen.on('change', () => { if (!samen.active) { for (const id of [...remotes.keys()]) dropRemote(id); remoteWorld = null; daynight.setOverride(phaseOverride); } });
  }
  let myEmote = null, myEmoteUntil = 0, down = false;   // down: fainted with friends around, waiting for a WEK (V6.2)
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
      const lying = r.down || r.pose === 'down';
      const pose = lying ? 'idle' : r.emoteUntil > now ? r.emote : r.pose;
      r.model.group.rotation.z = lying ? Math.PI / 2 : 0;   // on its side
      r.model.update(now, pose, { z: ground + r.y + (lying ? 0.35 : 0) });
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
    if (typeof d.f === 'number' && cb.onFireSync) cb.onFireSync(Math.max(0, Math.min(N.fireMax, d.f)));   // V7.1: was capped at 100, a bonfire (200+) showed as level 4 to a guest
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
      b: bears.length ? { x: +bears[0].b.x.toFixed(1), z: +bears[0].b.z.toFixed(1), s: bears[0].b.state } : null,
    });
  }

  // ---------- the night: camp gear, lights, ghosts, the bear ----------
  const ghosts = [];   // { g, model, holder }
  const bears = [];    // { b, model, holder }; one on a bear night, three in the last chapter (V6.7)
  let berenNacht = null;   // { gone, ate } during the final chapter's night
  let ghostTimer = 0, wasDark = false, fireWasBurning = true, shiver = 0;
  const lantern = new T.PointLight(0xffd080, 0, 12, 1.6);
  lantern.visible = false;
  scene.add(lantern);
  const gear = { tent: null, torches: null, fence: null, afdak: null };
  // ---------- V8.2: the weather: rain streaks, the lightning tree, thunder ----------
  let weerOverride = null, weerDag = -1, weerVandaag = 'zon', nextThunder = 0, strikeAt = 0;
  function weerNu() {
    if (weerOverride) return weerOverride;
    const day = (state && state.nacht.nights) || 0;
    if (day !== weerDag) { weerDag = day; weerVandaag = weerVoorDag(day, seedOf(state), config.weer); }
    return weerVandaag;
  }
  const RAIN_N = 260, RAIN_AXIS = new T.Vector3(0, 0, 1);
  const rain = new T.InstancedMesh(new T.BoxGeometry(0.02, 0.55, 0.02), new T.MeshBasicMaterial({ color: 0xd9ecff, transparent: true, opacity: 0.55, fog: false }), RAIN_N);
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);
  const rainDrops = Array.from({ length: RAIN_N }, () => ({ x: (Math.random() - 0.5) * 24, y: Math.random() * 12, z: (Math.random() - 0.5) * 24 }));
  const rainM = new T.Matrix4(), rainQ = new T.Quaternion(), rainS = new T.Vector3(1, 1, 1), rainP = new T.Vector3();
  function updateRain(dt, focus, kind, lite) {
    const w = WEER[kind] || WEER.zon;
    rain.visible = w.rain > 0;
    if (!rain.visible) return;
    const n = lite ? RAIN_N / 2 : RAIN_N;
    rain.count = n;
    const slant = w.wind * 0.35;
    rainQ.setFromAxisAngle(RAIN_AXIS, slant);
    for (let i = 0; i < n; i++) {
      const d = rainDrops[i];
      d.y -= dt * (9 + w.rain * 4);
      d.x += dt * slant * 6;
      if (d.y < 0) { d.y += 12; d.x = (Math.random() - 0.5) * 24; d.z = (Math.random() - 0.5) * 24; }
      if (d.x > 12) d.x -= 24;
      rainP.set(focus.x + d.x, focus.y + d.y, focus.z + d.z);
      rainM.compose(rainP, rainQ, rainS);
      rain.setMatrixAt(i, rainM);
    }
    rain.instanceMatrix.needsUpdate = true;
  }
  // the tree the lightning strikes: a real tree beside the camp that burns until dawn and leaves wood
  const BLIKSEM_AT = { x: CAMP.x + 9.5, z: CAMP.z - 6.5 };
  const bliksem = { burning: false, group: new T.Group(), flames: [], light: new T.PointLight(0xff9a3c, 0, 14, 2) };
  {
    const b = new Builder({ r: 0.05 });
    b.tree(0, 0, 1.7, '#3fbf5a', '#6b4a2c');
    bliksem.group.add(b.build());
    for (let i = 0; i < 4; i++) {
      const f = new T.Mesh(new T.ConeGeometry(0.35 - i * 0.05, 1.1 + i * 0.2, 7), new T.MeshBasicMaterial({ color: i % 2 ? 0xffd23f : 0xff7a1c, transparent: true, opacity: 0.9 }));
      f.position.set((i - 1.5) * 0.35, 1.9 + i * 0.35, (i % 2) * 0.3 - 0.15);
      f.visible = false;
      bliksem.group.add(f);
      bliksem.flames.push(f);
    }
    bliksem.light.position.set(0, 2.6, 0);
    bliksem.group.add(bliksem.light);
    bliksem.group.position.set(BLIKSEM_AT.x, map.heightAt(BLIKSEM_AT.x, BLIKSEM_AT.z), BLIKSEM_AT.z);
    scene.add(bliksem.group);
  }
  function setBurning(on) {
    bliksem.burning = on;
    for (const f of bliksem.flames) f.visible = on;
    bliksem.light.intensity = on ? 30 : 0;
  }
  function strike(now) {
    if (bliksem.burning) return;
    setBurning(true);
    daynight.flash(now, 220);
    cb.onSound && cb.onSound('thunder');
    cb.onSay && cb.onSay('lines.bliksem');
  }
  function afdakModel() {
    const b = new Builder({ r: 0.04 });
    for (const [dx, dz] of [[-2.0, -2.0], [2.0, -2.0], [-2.0, 2.0], [2.0, 2.0]]) b.cyl(dx, dz, 0, 0.09, 3.6, '#8a5a35', 8);
    b.box(-2.4, -2.4, 3.55, 4.8, 4.8, 0.14, '#c96b3a', { r: 0.04 });
    b.box(-2.5, -2.5, 3.66, 5.0, 0.2, 0.1, '#a9552b', { r: 0.02 });
    b.box(-2.5, 2.3, 3.66, 5.0, 0.2, 0.1, '#a9552b', { r: 0.02 });
    return b.build();
  }
  function syncGear() {
    const tools = state.eiland.tools;
    if ((tools.tent || (state.eiland.kamp || 0) >= 3) && !gear.tent) {
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
    syncKamp();   // V9.3
    if (tools.afdak && !gear.afdak) {   // V8.2: a roof over the fire
      gear.afdak = afdakModel();
      gear.afdak.position.set(CAMP.x, map.heightAt(CAMP.x, CAMP.z), CAMP.z);
      scene.add(gear.afdak);
    }
    const pk = perks(state.eiland, config);
    if ((tools.hek || tools.hoog_hek || (state.eiland.kamp || 0) >= 1) && gear.fenceR !== pk.fenceRadius) {
      if (gear.fence) scene.remove(gear.fence);
      gear.fence = fenceModel(CAMP.x, CAMP.z, pk.fenceRadius, map.heightAt);
      gear.fenceR = pk.fenceRadius;
      scene.add(gear.fence);
    }
    if (tools.hut2 && !gear.hut2) {
      gear.hut2 = camp.addHut(CAMP.x - 6.4, CAMP.z - 3.2, 1.6, '#b76cff');
      tiles.setStatics([...camp.obstacles, ...vuurtoren.obstacles, gear.hut2]);
    }
    lantern.visible = !!tools.lantaarn;
  }
  function lightsNow() {
    const ls = [{ x: CAMP.x, z: CAMP.z, r: fireRadius(state.nacht, config) }];
    if (state.eiland.tools.lantaarn) ls.push({ x: player.x, z: player.z, r: N.lanternRadius });
    if (gear.torches) for (const t of gear.torches) ls.push({ x: t.x, z: t.z, r: N.torchRadius });
    if (bliksem.burning) ls.push({ x: BLIKSEM_AT.x, z: BLIKSEM_AT.z, r: 6 });   // V8.2: the burning tree keeps ghosts away on that side
    if (performance.now() < noodfakkelUntil) ls.push({ x: player.x, z: player.z, r: config.redden.noodfakkelR });   // V9.4: the emergency flare
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
    ghosts.push({ g: { x: p.x, z: p.z, heading: p.heading, state: 'come', hp: levens('spook', config.gevecht) }, model, holder });
  }
  function spawnBear(dist = 30) {
    const p = landSpot(dist);
    const model = bearModel();
    const holder = new T.Group();
    holder.add(model.group);
    holder.position.set(p.x, map.heightAt(p.x, p.z), p.z);
    scene.add(holder);
    bears.push({ b: { x: p.x, z: p.z, heading: p.heading, state: 'come', scared: 0, pause: 0, hp: levens('beer', config.gevecht) }, model, holder });
  }
  /** The last chapter (V6.7): three bears at once; the night is won when all three ran, lost when they all ate or the fire died. */
  function spawnBears(n) {
    if (bears.length) return;   // once a night (the test may call it before the game's own timer)
    for (let i = 0; i < n; i++) spawnBear(28 + i * 4);
    berenNacht = { gone: 0, ate: 0 };
    game.audio.play('growl');
    cb.onSay && cb.onSay('lines.berenKomen');
  }
  function clearBears() { for (const b of bears) scene.remove(b.holder); bears.length = 0; }
  function clearNight() {
    for (const gh of ghosts) scene.remove(gh.holder);
    ghosts.length = 0;
    clearBears();
    berenNacht = null;
  }
  function nearestBear() {
    let best = null, bd = Infinity;
    for (const b of bears) { if (b.b.state !== 'come') continue; const d = Math.hypot(player.x - b.b.x, player.z - b.b.z); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  function doScare() {
    const pr = nearestPirate();   // V8.4: pirates are cowards: one BOE and the nearest runs back to the boat
    if (pr && Math.hypot(player.x - pr.p.x, player.z - pr.p.z) < REACH.bear) { scarePiraat(pr.p, { x: player.x, z: player.z }); game.audio.play('yarr'); piraatWeg(); return; }
    const wolvesRan = scareWolves();
    const b = nearestBear();
    if (!b) { if (!wolvesRan) cb.onSay && cb.onSay('lines.bearScared'); return; }
    const gone = scareBear(b.b, config, perks(state.eiland, config).bearScares);
    if (gone && berenNacht) { berenNacht.gone++; if (berenNacht.gone >= config.campagne.beren) { berenNacht = null; cb.onBerenGewonnen && cb.onBerenGewonnen(); clearBears(); return; } }
    cb.onSay && cb.onSay(gone ? 'lines.bearGone' : 'lines.bearScared');
  }
  function berenLose() {
    berenNacht = null;
    clearBears();
    cb.onBerenVerloren && cb.onBerenVerloren();
  }
  // ---------- V8.4: the pirates: a boat off the south beach, three pirates walking to the fire ----------
  const pirates = [];   // { p: { x, z, heading, state, pause, life }, model, holder }
  let piratenInfo = null;   // { weg, geplunderd } during a pirate night
  const BOOT_AT = { x: PIER.x + 20, z: PIER.z + 8 };
  const boot = bootModel();
  boot.position.set(BOOT_AT.x, -0.1, BOOT_AT.z);
  boot.rotation.y = Math.PI * 0.5;
  boot.visible = false;
  scene.add(boot);
  function spawnPirates() {
    const P = config.piraten;
    for (let i = 0; i < P.aantal; i++) {
      const x = PIER.x + 8 + i * 3, z = PIER.z - 14;
      const model = piraatModel();
      const holder = new T.Group();
      holder.add(model.group);
      holder.position.set(x, map.heightAt(x, z), z);
      scene.add(holder);
      pirates.push({ p: { x, z, heading: Math.PI, state: 'come', pause: i * 1.5, hp: levens('piraat', config.gevecht) }, model, holder });
    }
    cb.onSound && cb.onSound('yarr');
    cb.onSay && cb.onSay('lines.piratenKomen');
  }
  function clearPirates() { for (const pr of pirates) scene.remove(pr.holder); pirates.length = 0; boot.visible = false; piratenInfo = null; }
  function nearestPirate() {
    let best = null, bd = Infinity;
    for (const pr of pirates) { if (pr.p.state !== 'come') continue; const d = Math.hypot(player.x - pr.p.x, player.z - pr.p.z); if (d < bd) { bd = d; best = pr; } }
    return best;
  }
  function pirateNear() { const pr = nearestPirate(); return !!pr && Math.hypot(player.x - pr.p.x, player.z - pr.p.z) < REACH.bear; }
  /** A pirate ran (BOE or the dog): count it; all of them gone before the plunder = they drop their gold. */
  function piraatWeg(say = true) {
    if (!piratenInfo) return;
    piratenInfo.weg++;
    const left = config.piraten.aantal - piratenInfo.weg;
    if (left <= 0 && !piratenInfo.geplunderd) {
      piratenInfo = null;
      cb.onPiratenGewonnen && cb.onPiratenGewonnen(buit(config.piraten));
      setTimeout(() => { boot.visible = false; }, 6000);
      return;
    }
    if (say) cb.onSay && cb.onSay(left > 0 ? 'lines.piraatWeg' : 'lines.bearGone');
  }
  function startPiratenNacht(now) {
    piratenInfo = { weg: 0, geplunderd: false };
    boot.visible = true;
    setTimeout(() => { if (wasDark) cb.onSay && cb.onSay('lines.piratenBoot'); }, 9000);
    setTimeout(() => { if (wasDark && piratenInfo && !pirates.length) spawnPirates(); }, config.piraten.naDonkerMs);
  }
  // ---------- the shadow wolves (V6.2): a pack from night 5 that circles you in the dark and shakes your bag ----------
  const wolves = [];   // { w: { x, z, heading, state, ang, wait }, model, holder }
  let wolfLunge = 0, wolfHowl = 0, wolvesCame = false;   // the pack comes once a night
  function spawnWolves() {
    if (wolves.length) return;
    wolvesCame = true;
    const W = config.wolven;
    const pack = Math.max(1, roedel(state ? state.nacht.nights : 0, config));   // V9.2: the pack grows with the nights
    for (let i = 0; i < pack; i++) {
      const p = landSpot(30 + i * 3);
      const model = wolfModel();
      const holder = new T.Group();
      holder.add(model.group);
      holder.position.set(p.x, groundOf(p.x, p.z), p.z);
      scene.add(holder);
      wolves.push({ w: { x: p.x, z: p.z, heading: p.heading, state: 'circle', ang: (i / pack) * Math.PI * 2, wait: 0, dir: i % 2 ? -1 : 1, hp: levens('wolf', config.gevecht) }, model, holder });
    }
    game.audio.play('growl');   // V8.2: the howl and Muntje's warning came at dark, 15 s before the pack
  }
  function clearWolves() { for (const v of wolves) scene.remove(v.holder); wolves.length = 0; }
  function wolfNear() { return wolves.some((v) => v.w.state !== 'flee' && Math.hypot(player.x - v.w.x, player.z - v.w.z) < REACH.bear + 2); }
  function scareWolves() {
    // the pack runs together: BOE near any wolf sends them all off
    const near = wolves.some((v) => Math.hypot(player.x - v.w.x, player.z - v.w.z) < REACH.bear + 6);   // any wolf close by, fleeing or not (a bite a frame ago still counts)
    if (!near) return false;
    for (const v of wolves) if (v.w.state !== 'flee') scareWolf(v.w, config);
    cb.onSay && cb.onSay('lines.wolvesFled');
    return true;
  }
  function updateWolves(now, dt, lit, dark) {
    if (!wolves.length) return;
    const W = config.wolven;
    const pk = perks(state.eiland, config);
    const fenceR = hasWall() ? pk.fenceRadius : 0;   // V9.3: the camp's wall counts like the fence
    const safe = isLit(player.x, player.z, lit) || (fenceR && Math.hypot(player.x - CAMP.x, player.z - CAMP.z) < fenceR) || dark < 0.5;
    wolfLunge += dt * 1000;
    if (wolfLunge > W.lungeEveryMs) {
      wolfLunge = 0;
      if (!safe) { const c = wolves.filter((v) => v.w.state === 'circle'); if (c.length) c[Math.floor(Math.random() * c.length)].w.state = 'lunge'; }
    }
    wolfHowl += dt * 1000;
    if (wolfHowl > W.howlEveryMs) { wolfHowl = 0; game.audio.play('growl'); }
    for (let i = wolves.length - 1; i >= 0; i--) {
      const v = wolves[i];
      const res = stepWolf(v.w, { target: { x: player.x, z: player.z }, safe, dt: Math.min(dt, 0.1) }, config);
      if (res === 'bite') {
        game.audio.play('stumble');
        const items = cb.onWolfBump ? cb.onWolfBump() : [];
        scatterDrops(items || []);
      } else if (res === 'gone') { scene.remove(v.holder); wolves.splice(i, 1); continue; }
      v.holder.position.set(v.w.x, groundOf(v.w.x, v.w.z), v.w.z);
      v.holder.rotation.y = v.w.heading;
      v.model.update(now, { running: true });
    }
  }
  // discovering places (V6.2 chains): once a second, tell the UI which place you are at
  let ontdekAcc = 0, lastPlek = null, wasOnTop = false;
  function updateOntdek(dt) {
    ontdekAcc += dt;
    if (ontdekAcc < 1) return;
    ontdekAcc = 0;
    const p = plekAt(player.x, player.z);
    if (p && p !== lastPlek) { lastPlek = p; cb.onOntdek && cb.onOntdek(p); }
    if (!p) lastPlek = null;
    const onTop = player.ground > HILL.top * 0.8 && Math.hypot(player.x - HILL.x, player.z - HILL.z) < HILL.r * 0.3;
    if (onTop && !wasOnTop) cb.onTop && cb.onTop();
    wasOnTop = onTop;
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
    const fenceR = hasWall() ? pk.fenceRadius : 0;   // V9.3: the camp's wall counts like the fence
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
        const step = Math.min(D.speed * dt, Math.max(0, dist - D.reach * 0.5));   // never overshoot the player on a long frame
        const nx = d.x + Math.sin(d.heading) * step, nz = d.z + Math.cos(d.heading) * step;
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
      if (dark > 0.5 && !playerSafe && dist < D.sight) { d.state = 'charge'; cb.onSay && cb.onSay('lines.deerComing'); cb.onSound && cb.onSound('stumble'); }
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
    env.speedMul = perks(state.eiland, config).speedMul * hungerSpeedMul(state.eiland, config) * coldSpeedMul(state.nacht, config);
    shiver = isCold(state.nacht, config) ? 1 : 0;
    const n = state.nacht;
    // the cold (V6.2): in the fire's light you warm up; a lantern or a torch next to you halves the loss
    const atFire = n.fire > 0 && Math.hypot(player.x - CAMP.x, player.z - CAMP.z) < fireRadius(n, config);
    const hasLight = !!state.eiland.tools.lantaarn || (gear.torches ? gear.torches.some((t) => Math.hypot(player.x - t.x, player.z - t.z) < N.torchRadius) : false);
    cb.onTick && cb.onTick(dt * 1000, dark, { atFire, lit: hasLight });
    if (!guest) cb.onBurn && cb.onBurn(dt * 1000, dark);
    const rules = nightRules(n.nights, config);
    camp.setFire(fireLevel(n.fire, config), n.fire / N.fireMax);
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
      const finale = !guest && state.campagne && state.campagne.hoofdstuk === 6;   // chapter 7: the bears come a bit into the night
      if (bearNight && !guest && !finale) spawnBear();
      if (finale) setTimeout(() => { if (wasDark && !berenNacht && !bears.length) spawnBears(config.campagne.beren); }, config.campagne.berenVanaf);
      if (rules.deer && !guest) spawnDeer();
      wolvesCame = false;
      if (rules.wolves && !guest) {
        cb.onSound && cb.onSound('howl');   // V8.2: you hear the pack before you see it
        cb.onSay && cb.onSay('lines.wolvesComing');
        setTimeout(() => { if (wasDark && !guest && !wolvesCame) spawnWolves(); }, 15000);   // the pack comes a bit into the night, once
      }
      strikeAt = weerNu() === 'storm' && !guest ? now + config.weer.bliksemNaMs : 0;   // V8.2: a storm night has one lightning strike
      if (!guest && piratenNacht(n.nights, config.piraten)) startPiratenNacht(now);   // V8.4
      // V9.2: the banner says what tonight brings
      const baasDef = !guest && !finale ? baasVoorNacht(n.nights, config.bazen) : null;   // V9.5: the boss of the night (not in the campaign's last night)
      if (baasDef) setTimeout(() => { if (wasDark && !baas) spawnBaas(baasDef); }, config.bazen.naDonkerMs);
      const plan = nachtPlan({ nights: n.nights, wolves: rules.wolves && !guest, bear: (bearNight || finale) && !guest, beren: finale ? config.campagne.beren : 1, pirates: !guest && piratenNacht(n.nights, config.piraten), ghosts: true, baas: baasDef ? baasDef.icon : null }, config);
      cb.onNachtPlan && cb.onNachtPlan(plan, !!wapenVoor(state.eiland.tools, 'wolf'));
    }
    if (strikeAt && isDark && now >= strikeAt) { strikeAt = 0; strike(now); }
    if (weerNu() === 'storm' && now > nextThunder) {
      const [a, b] = config.weer.donderElkeMs;
      nextThunder = now + a + Math.random() * (b - a);
      daynight.flash(now);
      cb.onSound && cb.onSound('thunder');
    }
    if (bliksem.burning) { const f = 1 + Math.sin(now / 70) * 0.15; for (const fl of bliksem.flames) fl.scale.set(f, 1 + Math.sin(now / 90 + fl.position.x) * 0.2, f); bliksem.light.intensity = 26 + Math.sin(now / 60) * 6; }
    if (!isDark && wasDark) {
      wasDark = false;
      cb.onDawn && cb.onDawn(fireWasBurning && n.fire > 0);
      if (bliksem.burning) { setBurning(false); strikeAt = 0; cb.onBliksemHout && cb.onBliksemHout(config.weer.bliksemHout); }   // V8.2
      clearPirates();   // V8.4: dawn sends the boat away
      if (baas) { const def = baas.def; clearBaas(); cb.onBaasWeg && cb.onBaasWeg(def); }   // V9.5: dawn sends the boss away
      clearNight();
      clearDeer();
      clearWolves();
      clearDrops();
    }
    if (isDark && n.fire <= 0) fireWasBurning = false;
    if (guest) { updateRemoteWorld(now, dt); return; }
    if (isDark) {
      ghostTimer += dt * 1000;
      if (!ghostsOff && ghosts.length < rules.ghostsMax && ghostTimer > rules.ghostEveryMs) { ghostTimer = 0; spawnGhost(); }
    }
    const lit = lightsNow();
    const pk = perks(state.eiland, config);
    const fence = hasWall() ? { x: CAMP.x, z: CAMP.z, r: pk.fenceRadius } : null;
    updateDeer(now, dt, lit, dark);
    updateWolves(now, dt, lit, dark);
    updateOntdek(dt);
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
    for (let i = bears.length - 1; i >= 0; i--) {
      const bear = bears[i];
      const res = stepBear(bear.b, { target: { x: CAMP.x, z: CAMP.z }, dt }, config);
      if (res === 'eat') { cb.onBearAte && cb.onBearAte(); if (berenNacht) { berenNacht.ate++; if (berenNacht.ate >= config.campagne.beren || state.nacht.fire <= 0) { berenLose(); break; } } }
      if (res === 'gone') { scene.remove(bear.holder); bears.splice(i, 1); }
      else {
        bear.holder.position.set(bear.b.x, groundOf(bear.b.x, bear.b.z), bear.b.z);
        bear.holder.rotation.y = bear.b.heading;
        bear.model.update(now, { walking: bear.b.pause <= 0 });
      }
    }
    if (berenNacht && isDark && state.nacht.fire <= 0) berenLose();
    // V8.4: the pirates walk to the fire; the dog chases one that comes close to it
    for (let i = pirates.length - 1; i >= 0; i--) {
      const pr = pirates[i];
      if (pr.p.state === 'come' && pet && Math.hypot(dog.x - pr.p.x, dog.z - pr.p.z) < config.piraten.hondAfstand) { scarePiraat(pr.p, { x: dog.x, z: dog.z }); cb.onSay && cb.onSay('lines.hondJaagt'); piraatWeg(false); }
      if (pr.p.state === 'come' && !pr.p.muurWacht && hasWall() && Math.hypot(pr.p.x - CAMP.x, pr.p.z - CAMP.z) < perks(state.eiland, config).fenceRadius + 0.6) { pr.p.muurWacht = true; pr.p.pause = 20; }   // V9.3: the wall holds them twenty seconds
      const res = stepPiraat(pr.p, { target: { x: CAMP.x, z: CAMP.z }, dt }, config.piraten);
      if (res === 'plunder' && piratenInfo && !piratenInfo.geplunderd) {
        piratenInfo.geplunderd = true;
        cb.onPlunder && cb.onPlunder();
        for (const o of pirates) if (o.p.state === 'come') { o.p.state = 'flee'; o.p.heading = Math.atan2(BOOT_AT.x - o.p.x, BOOT_AT.z - o.p.z); o.p.life = 30; }
        setTimeout(() => { boot.visible = false; piratenInfo = null; }, 12000);
      } else if (res === 'plunder') { pr.p.state = 'flee'; pr.p.heading = Math.atan2(BOOT_AT.x - pr.p.x, BOOT_AT.z - pr.p.z); pr.p.life = 30; }
      if (res === 'gone') { scene.remove(pr.holder); pirates.splice(i, 1); continue; }
      pr.holder.position.set(pr.p.x, groundOf(pr.p.x, pr.p.z), pr.p.z);
      pr.holder.rotation.y = pr.p.heading;
      pr.model.update(now, { walking: pr.p.pause <= 0 });
    }
    if (boot.visible) { boot.position.y = -0.1 + Math.sin(now / 900) * 0.12; boot.rotation.z = Math.sin(now / 1300) * 0.03; }
    if (baas) {   // V9.5: the boss walks to the fire, eats, backs off, comes again
      const res = stepBaas(baas.b, { target: { x: CAMP.x, z: CAMP.z }, dt }, baas.def);
      if (res === 'eat') { cb.onBaasEet && cb.onBaasEet(baas.def); const items = cb.onWolfBump ? cb.onWolfBump() : []; scatterDrops(items || []); }
      if (res === 'gone') clearBaas();
      else { baas.holder.position.set(baas.b.x, groundOf(baas.b.x, baas.b.z), baas.b.z); baas.holder.rotation.y = baas.b.heading; baas.model.update(now); }
    }
    broadcastWorld(now);
  }

  // ---------- what can you do here? ----------
  let action = null;        // { type, label, target }
  let lastActionKey = '';
  let hakUntil = 0;
  // V9.3: rocks give stones (three taps, then a minute's rest), tracked per rock
  const rocks = new Map();
  const rockKey = (o) => `${o.tile}:${o.kind}:${o.index}`;
  function hasWall() { return !!(state && (state.eiland.tools.hek || state.eiland.tools.hoog_hek || (state.eiland.kamp || 0) >= 1)); }
  let fishing = null;       // { until, biteUntil }
  let forceGoldFish = false;   // tests: the next catch is the golden fish
  // ---------- V9.2: defending yourself: the nearest enemy, the weapon that works on it, shots in flight ----------
  const shots = [];
  let poefs = 0;   // V9.2 tests: how many enemies poofed   // { mesh, from, to, t0, dur, target: { kind, rec, holder }, weapon }
  let ghostsOff = false;   // tests: setSpoken(false)
  const poofs = [];   // { mesh, t0 }
  let lastShotAt = 0;
  function nearestEnemy() {
    let best = null, bd = Infinity;
    const consider = (kind, rec, holder, x, z) => { const d = Math.hypot(player.x - x, player.z - z); if (d < bd) { bd = d; best = { kind, rec, holder, x, z, d }; } };
    for (const v of wolves) if (v.w.state !== 'flee') consider('wolf', v.w, v.holder, v.w.x, v.w.z);
    for (const b of bears) if (b.b.state === 'come') consider('beer', b.b, b.holder, b.b.x, b.b.z);
    for (const pr of pirates) if (pr.p.state === 'come') consider('piraat', pr.p, pr.holder, pr.p.x, pr.p.z);
    for (const gh of ghosts) if (gh.g.state !== 'gone') consider('spook', gh.g, gh.holder, gh.g.x, gh.g.z);
    if (baas && baas.b.state !== 'flee') { consider(baas.def.geest ? 'spook' : 'beer', baas.b, baas.holder, baas.b.x, baas.b.z); if (best && best.rec === baas.b) best.baas = true; }   // V9.5
    return best;
  }
  /** The shoot action when an enemy is in range of a weapon you own (the host only; a guest keeps BOE). */
  function shootAction() {
    if (samen && samen.isGuest) return null;
    const e = nearestEnemy();
    if (!e) return null;
    const w = wapenVoor(state.eiland.tools, e.kind);
    if (!w || e.d > w.bereik) return null;
    return { type: 'schiet', label: w.naam, target: e, weapon: w };
  }
  function poofAt(x, y, z) {
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(new T.SphereGeometry(0.22 + Math.random() * 0.12, 6, 5), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }));
      m.position.set(x + (Math.random() - 0.5) * 0.8, y + 0.6 + Math.random() * 0.8, z + (Math.random() - 0.5) * 0.8);
      scene.add(m);
      poofs.push({ mesh: m, t0: performance.now(), vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 2 });
    }
  }
  function enemyBeaten(t) {
    const G = config.gevecht;
    poofAt(t.rec.x, groundOf(t.rec.x, t.rec.z), t.rec.z);
    game.audio.play('pop');
    poefs++;
    if (t.baas && baas) {   // V9.5: the boss goes down: a bigger poof and the loot
      poofAt(t.rec.x + 0.8, groundOf(t.rec.x, t.rec.z) + 0.8, t.rec.z); poofAt(t.rec.x - 0.8, groundOf(t.rec.x, t.rec.z) + 1.4, t.rec.z);
      const def = baas.def;
      clearBaas();
      cb.onBaasVerslagen && cb.onBaasVerslagen(def);
      return;
    }
    if (t.kind === 'wolf') { const i = wolves.findIndex((v) => v.w === t.rec); if (i >= 0) { scene.remove(wolves[i].holder); wolves.splice(i, 1); } }
    else if (t.kind === 'spook') { const i = ghosts.findIndex((gh) => gh.g === t.rec); if (i >= 0) { scene.remove(ghosts[i].holder); ghosts.splice(i, 1); } }
    else if (t.kind === 'piraat') { scarePiraat(t.rec, { x: player.x, z: player.z }); piraatWeg(false); }
    else if (t.kind === 'beer') {
      t.rec.state = 'flee'; t.rec.heading += Math.PI; t.rec.life = 0.4;
      if (berenNacht) { berenNacht.gone++; if (berenNacht.gone >= config.campagne.beren) { berenNacht = null; cb.onBerenGewonnen && cb.onBerenGewonnen(); clearBears(); } }
    }
    cb.onBuit && cb.onBuit(t.kind, G.buit[t.kind] || 1);
  }
  function applyHit(t, weapon) {
    const res = tref(t.rec, weapon.schade);
    // the knock-back: away from the player, and a flash of the model
    const dx = t.rec.x - player.x, dz = t.rec.z - player.z, d = Math.hypot(dx, dz) || 1;
    t.rec.x += (dx / d) * config.gevecht.terugdeins;
    t.rec.z += (dz / d) * config.gevecht.terugdeins;
    if (t.rec.pause != null) t.rec.pause = Math.max(t.rec.pause || 0, 0.6);
    t.holder.scale.setScalar(1.3);
    setTimeout(() => t.holder.scale.setScalar(1), 120);
    game.audio.play(res === 'poef' ? 'pop' : 'thud');
    if (t.baas && baas && res !== 'poef') { baas.b.pause = Math.max(baas.b.pause || 0, 0.4); cb.onBaasHp && cb.onBaasHp(baas.def, baas.b.hp, baas.b.hpMax); }   // V9.5
    if (res === 'poef') enemyBeaten(t);
  }
  function shoot(action, now) {
    const w = action.weapon;
    if (now - lastShotAt < w.herlaadMs) { game.audio.play('tap'); return; }
    lastShotAt = now;
    hakUntil = now + 260;
    game.audio.play('whoosh');
    const from = new T.Vector3(player.x, player.ground + 1.2, player.z);
    const t = action.target;
    const to = new T.Vector3(t.rec.x, groundOf(t.rec.x, t.rec.z) + 0.9, t.rec.z);
    const mesh = new T.Mesh(new T.SphereGeometry(w.id === 'alien' ? 0.16 : 0.12, 8, 6), new T.MeshBasicMaterial({ color: new T.Color(w.kleur) }));
    mesh.position.copy(from);
    scene.add(mesh);
    shots.push({ mesh, from, to, t0: now, dur: 180 + t.d * 12, target: t, weapon: w });
  }
  function updateShots(now) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const f = Math.min(1, (now - s.t0) / s.dur);
      s.mesh.position.lerpVectors(s.from, s.to, f);
      s.mesh.position.y += Math.sin(f * Math.PI) * 0.8;
      if (f >= 1) { scene.remove(s.mesh); shots.splice(i, 1); applyHit(s.target, s.weapon); }
    }
    for (let i = poofs.length - 1; i >= 0; i--) {
      const p = poofs[i];
      const f = (now - p.t0) / 450;
      if (f >= 1) { scene.remove(p.mesh); poofs.splice(i, 1); continue; }
      p.mesh.position.x += p.vx * 0.016; p.mesh.position.y += p.vy * 0.016; p.mesh.position.z += p.vz * 0.016;
      p.mesh.scale.setScalar(1 + f * 1.5);
      p.mesh.material.opacity = 0.95 * (1 - f);
    }
  }
  // ---------- V9.5: the boss of the night ----------
  let baas = null;   // { def, b, model, holder }
  function baasModel(def) {
    const g = new T.Group();
    let update = () => {};
    if (def.id === 'koning') {
      const bear = bearModel();
      bear.group.scale.setScalar(1.8);
      g.add(bear.group);
      const c = new Builder({ r: 0.03 });
      c.cyl(0, 0, 0, 0.45, 0.3, '#ffc21c', 10);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.box(Math.cos(a) * 0.38 - 0.08, Math.sin(a) * 0.38 - 0.08, 0.28, 0.16, 0.16, 0.3, '#ffe58a', { r: 0.02 }); }
      const crown = c.build();
      crown.position.set(0, 1.25 * 1.8 + 0.7, 0.75 * 1.8);
      g.add(crown);
      update = (t) => bear.update(t, { walking: true });
    } else if (def.id === 'kapitein') {
      const gh = ghostModel();
      gh.group.scale.setScalar(1.7);
      g.add(gh.group);
      const h = new Builder({ r: 0.03 });
      h.cyl(0, 0, 0, 0.7, 0.08, '#1b1f3b', 16);
      h.cyl(0, 0, 0.08, 0.45, 0.8, '#252a48', 14);
      h.sphere(0, 0.45, 0.45, 0.1, '#ffffff', 8);
      const hat = h.build();
      hat.position.set(0, 1.55 * 1.7, 0);
      g.add(hat);
      update = (t) => gh.update(t, { fade: 1 });
    } else {
      const m = new Builder({ r: 0.06 });
      m.puff(0, 0, 0.9, 1.2, '#5fd35f', 1);
      m.puff(0.7, 0.3, 0.6, 0.7, '#4cc24c', 1);
      m.puff(-0.7, -0.2, 0.6, 0.75, '#4cc24c', 1);
      m.puff(0.2, -0.6, 1.5, 0.6, '#6fe06f', 1);
      m.sphere(-0.3, 1.05, 1.3, 0.16, '#ffffff', 8); m.sphere(0.3, 1.05, 1.3, 0.16, '#ffffff', 8);
      m.sphere(-0.3, 1.18, 1.3, 0.08, '#1b1f3b', 6); m.sphere(0.3, 1.18, 1.3, 0.08, '#1b1f3b', 6);
      const blob = m.build();
      g.add(blob);
      update = (t) => { blob.scale.set(1 + Math.sin(t / 240) * 0.08, 1 - Math.sin(t / 240) * 0.08, 1 + Math.sin(t / 240) * 0.08); };
    }
    return { group: g, update };
  }
  function spawnBaas(def, at = null) {
    if (baas) return;
    const p = at || landSpot(34);
    const model = baasModel(def);
    const holder = new T.Group();
    holder.add(model.group);
    holder.position.set(p.x, groundOf(p.x, p.z), p.z);
    scene.add(holder);
    baas = { def, b: maakBaas(def, p.x, p.z), model, holder };
    cb.onSound && cb.onSound('thunder');
    cb.onBaas && cb.onBaas(def, baas.b.hp, baas.b.hpMax);
  }
  function clearBaas() { if (baas) { scene.remove(baas.holder); baas = null; } }
  // ---------- V9.4: the gadgets and the restart ----------
  let noodfakkelUntil = 0;
  function gebruikNet() {
    const e = nearestEnemy();
    if (!e || e.d > 10) return false;
    if (e.kind === 'wolf') { scareWolf(e.rec, config); }
    else if (e.kind === 'spook') { const i = ghosts.findIndex((gh) => gh.g === e.rec); if (i >= 0) { scene.remove(ghosts[i].holder); ghosts.splice(i, 1); } }
    else e.rec.pause = Math.max(e.rec.pause || 0, config.redden.netS);
    e.holder.scale.setScalar(0.85);
    setTimeout(() => e.holder.scale.setScalar(1), config.redden.netS * 1000);
    return true;
  }
  function noodfakkel(now) {
    noodfakkelUntil = now + config.redden.noodfakkelMs;
    for (const b of bears) if (b.b.state === 'come') b.b.pause = Math.max(b.b.pause || 0, config.redden.noodfakkelMs / 1000);
    for (const pr of pirates) if (pr.p.state === 'come') pr.p.pause = Math.max(pr.p.pause || 0, config.redden.noodfakkelMs / 1000);
    for (const v of wolves) if (v.w.state !== 'flee') scareWolf(v.w, config);
    daynight.flash(now, 300);
  }
  function roepHond() { if (!pet) return false; dog.x = player.x + 1.2; dog.z = player.z + 0.8; dog.moving = false; return true; }
  /** The adventure starts over (V9.4): every piece of gear and camp goes, the enemies too; the state was already reset. */
  function herstart() {
    for (const k of ['tent', 'afdak', 'fence']) if (gear[k]) { scene.remove(gear[k]); gear[k] = null; }
    if (gear.torches) { for (const t of gear.torches) scene.remove(t.mesh); gear.torches = null; }
    gear.fenceR = 0;
    for (const k of ['toren', 'torenLight', 'opslag', 'vlag']) if (kampGear[k]) { scene.remove(kampGear[k]); kampGear[k] = null; }
    kampGear.level = 0;
    clearNight(); clearDeer(); clearWolves(); clearDrops(); clearBears(); clearPirates(); clearBaas();
    rocks.clear();
    lastSchatSync = 0; lastKistSync = 0;
    reset();
  }
  function bearNear() {
    const nb = nearestBear();
    const b = nb ? nb.b : remoteBear && remoteBear.state === 'come' ? remoteBear.holder.position : null;
    return !!b && Math.hypot(player.x - b.x, player.z - b.z) < REACH.bear;
  }
  function findAction(now) {
    const px = player.x, pz = player.z;
    if (fishing) return { type: fishing.biteUntil ? 'trek' : 'vis', label: fishing.biteUntil ? 'TREK' : 'WACHT', target: null };
    for (const [id, r] of remotes) if ((r.down || r.pose === 'down') && Math.hypot(px - r.x, pz - r.z) < 2.6) return { type: 'wek', label: 'WEK', target: id };   // a fainted friend (V6.2)
    const sa = shootAction();   // V9.2: a weapon in range beats BOE
    if (sa) return sa;
    if (bearNear() || wolfNear() || pirateNear()) return { type: 'boe', label: 'BOE', target: null };
    if (gear.tent && daynight.darkness > 0.5 && Math.hypot(px - TENT_AT.x, pz - TENT_AT.z) < REACH.tent) return { type: 'slaap', label: 'SLAAP', target: null };
    for (const m of mounds) if (m.mesh.visible && Math.hypot(px - m.x, pz - m.z) < 2.0) return { type: 'graaf', label: 'GRAAF', target: m.id };   // V8.3
    if (xMound.on && Math.hypot(px - xMound.x, pz - xMound.z) < 2.0) return { type: 'graaf', label: 'GRAAF', target: 'schat' };
    if (Math.hypot(px - camp.chest.pos.x, pz - camp.chest.pos.z) < 1.9) return { type: 'kist', label: camp.chest.isOpen ? 'LEEG' : 'OPEN', target: 'grot' };
    if (Math.hypot(px - vuurtoren.chest.pos.x, pz - vuurtoren.chest.pos.z) < 1.9) return { type: 'kist', label: vuurtoren.chest.isOpen ? 'LEEG' : 'OPEN', target: 'hut' };   // V6.5
    for (const dr of drops) if (Math.hypot(px - dr.x, pz - dr.z) < 1.4) return { type: 'drop', label: 'PAK', target: dr };   // your own things, shaken out by the deer
    if (Math.hypot(px - CAMP.x, pz - CAMP.z) < REACH.camp) {
      // V6.2: STOOK is its own button at the fire (ui/avontuur.js); the action is KOOK on a big fire with fish in the bag, else KAMP
      if ((state.eiland.bag.vis || 0) > 0 && fireLevel(state.nacht.fire, config) >= N.cookLevel) return { type: 'kook', label: 'KOOK', target: null, atCamp: true };
      return { type: 'kamp', label: 'KAMP', target: null, atCamp: true };
    }
    let best = null, bestD = Infinity;
    for (const s of tiles.nearShells(px, pz)) {
      if (s.taken) continue;
      const d = Math.hypot(px - s.x, pz - s.z);
      if (d < REACH.shell && d < bestD) { best = { type: 'schelp', label: 'PAK', target: s }; bestD = d; }
    }
    for (const b of tiles.nearBushes(px, pz)) {
      if (b.restUntil > now) continue;
      const d = Math.hypot(px - b.x, pz - b.z) - b.r;
      if (d < REACH.bush && d < bestD) { best = { type: 'bes', label: 'PLUK', target: b }; bestD = d; }
    }
    if (best) return best;
    for (const o of tiles.near(px, pz)) {
      if (!o.kind || !o.kind.startsWith('tree')) continue;
      const ts = trees.get(treeKey(o));
      if (ts && ts.restUntil > now) continue;   // a stump: nothing to chop
      const d = Math.hypot(px - o.x, pz - o.z) - o.r;
      if (d < REACH.tree && d < bestD) { best = { type: 'hak', label: 'HAK', target: o }; bestD = d; }
    }
    for (const o of tiles.near(px, pz)) {   // V9.3: rocks give stones
      if (!o.kind || !o.kind.startsWith('rock')) continue;
      const rs = rocks.get(rockKey(o));
      if (rs && rs.restUntil > now) continue;
      const d = Math.hypot(px - o.x, pz - o.z) - o.r;
      if (d < REACH.tree + 0.3 && d < bestD) { best = { type: 'steen', label: 'HAK', target: o }; bestD = d; }
    }
    for (const k of kisten) {   // V9.3: a filled chest that is still closed
      if (!k.group.visible || k.open) continue;
      const d = Math.hypot(px - k.x, pz - k.z);
      if (d < 1.9 && d < bestD) { best = { type: 'gadgetkist', label: 'OPEN', target: k.i }; bestD = d; }
    }
    if (best) return best;
    const dl = Math.hypot(px - LAKE.x, pz - LAKE.z);
    if (dl > LAKE.r * 0.9 && dl < LAKE.r + REACH.lake) return { type: 'vis', label: 'VIS', target: null };
    return null;
  }
  function treeState(o) {
    const key = treeKey(o);
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
      case 'schiet': shoot(action, now); return;   // V9.2
      case 'gadgetkist': cb.onGadgetKist && cb.onGadgetKist(action.target); lastKistSync = 0; return;   // V9.3
      case 'steen': {   // V9.3: three taps on a rock give a stone; the rock rests a minute
        const k = rockKey(action.target);
        const rs = rocks.get(k) || { taps: 0, restUntil: 0 };
        rocks.set(k, rs);
        hakUntil = now + 380;
        player.heading = Math.atan2(action.target.x - player.x, action.target.z - player.z);
        game.audio.play('thud');
        rs.taps++;
        if (rs.taps >= config.werkbank.steenTaps) {
          rs.taps = 0;
          rs.restUntil = now + config.werkbank.steenRestMs;
          burstChips(action.target.x, player.ground, action.target.z);
          cb.onCollect && cb.onCollect('steen', 1);
        }
        return;
      }
      case 'graaf': {   // V8.3: dig at a mound (needs the schep); the answer comes from avontuur.js after the swing
        if (!state.eiland.tools.schep) { cb.onSay && cb.onSay('lines.schepNodig'); return; }
        hakUntil = now + 420;
        game.audio.play('thud');
        const id = action.target;
        setTimeout(() => { if (cb.onGraaf && cb.onGraaf(id)) { lastSchatSync = 0; syncSchat(performance.now()); } }, 450);
        return;
      }
      case 'kist': cb.onChest && cb.onChest(action.target || 'grot'); return;
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
      case 'wek':
        if (cb.onWek && !cb.onWek(action.target)) return;   // V9.4: waking a friend takes a reddingsdrank
        if (samen && samen.active) samen.send('wake', {}, action.target);
        game.audio.play('unlock');
        cb.onSay && cb.onSay('lines.wekt');
        return;
      case 'kook': cb.onCook && cb.onCook(); return;
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
        tiles.setScale(action.target, 0);
        cb.onCollect && cb.onCollect('schelp', 1);
        game.audio.play('coinSoft');
        return;
      case 'bes': {
        const b = action.target;
        b.restUntil = now + E.bushRestMs;
        tiles.setScale(b, 0.8);
        setTimeout(() => tiles.setScale(b, 1), E.bushRestMs);
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
          if (state.eiland.tools.hengel && (forceGoldFish || Math.random() < config.campagne.goudvisKans)) { forceGoldFish = false; cb.onGoldFish && cb.onGoldFish(); }
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
    const meshes = ['tree1', 'tree2', 'tree3', 'shell', 'bush2'].flatMap((k) => tiles.meshesOf(k));
    const hits = raycaster.intersectObjects(meshes, false);
    const now = performance.now();
    for (const h of hits) {
      const { tile, kind } = h.object.userData;
      const idx = h.instanceId;
      let picked = null;
      if (kind === 'shell') {
        const s = tiles.find(tile, 'shell', idx);
        if (s && !s.taken && Math.hypot(s.x - player.x, s.z - player.z) < REACH.shell + 0.8) picked = { type: 'schelp', label: 'PAK', target: s };
      } else if (kind === 'bush2') {
        const b = tiles.find(tile, 'bush2', idx);
        if (b && b.restUntil <= now && Math.hypot(b.x - player.x, b.z - player.z) - b.r < REACH.bush + 0.8) picked = { type: 'bes', label: 'PLUK', target: b };
      } else {
        const o = tiles.find(tile, kind, idx);
        const ts = o && trees.get(treeKey(o));
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
  let wasInCave = false;
  function updateDrips(now, dt) {
    const inside = map.inCave(player.x, player.z);
    if (wasInCave && !inside) cb.onCaveExit && cb.onCaveExit();
    wasInCave = inside;
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
      const c = clampInCave(camPos.x, camPos.z, 0.95);   // well clear of the wall crystals
      camPos.set(c.x, camPos.y, c.z);
    } else {
      const floor = groundOf(camPos.x, camPos.z) + 0.8;
      if (camPos.y < floor) camPos.y = floor;
    }
    camLook.set(player.x, py + CAM.lookUp, player.z);
    if (firstFrame) { camera.position.copy(camPos); firstFrame = false; }
    else camera.position.lerp(camPos, 1 - Math.exp(-9 * dt));
    if (shiver) { const t = performance.now(); camera.position.y += Math.sin(t / 19) * 0.025; camLook.x += Math.sin(t / 23) * 0.03; }   // the cold: you shiver
    camera.lookAt(camLook);
  }

  // ---------- public ----------
  function mount(el) { host = el; engine.mount(el); resize(); }
  function resize() {
    if (!host) return;
    if (engine.container !== host) return;   // V7.0: another screen owns the canvas; never pull it over (rotating the iPad on the island left it blue)
    engine.resize();
    W = engine.W; H = engine.H;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  function setState(s) { state = s; }

  const SUBSTEP = 1 / 60;
  let lastTime = 0, prevNow = 0, simAcc = 0, jumps = 0, pendingJump = false, walkDist = 0;
  const focus = new T.Vector3();
  function render(now) {
    const frameStart = performance.now();   // V9.1
    if (engine.checkSize()) resize();   // V7.0: the container changed size without a usable resize event (iPad rotation)
    if (!state || !W) return;
    const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 0.016);
    if (lastTime) engine.trackFrame(now - lastTime, now);
    prevNow = lastTime || now;
    lastTime = now;
    syncAvatar();
    syncPet();

    tiles.update(player.x, player.z);   // the ground round the player exists before the physics step
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
    if (!(engine.tier >= 2 && (++liteFrame & 1))) tiles.animate(now, dt, daynight.darkness);   // V9.1: crabs and butterflies every other frame on tier 2
    if (input.tap) handleTap(input.tap);
    const next = findAction(now);
    const key = next ? `${next.type}:${next.label}` : '';
    if (key !== lastActionKey) { lastActionKey = key; action = next; cb.onAction && cb.onAction(next); }
    else action = next;

    avatar.group.position.set(player.x, 0, player.z);
    avatar.group.rotation.y = player.heading;
    const pose = down ? 'down' : !player.grounded ? 'jump' : hakUntil > now ? 'hak' : fishing ? 'vis' : myEmoteUntil > now ? myEmote : player.moving ? 'walk' : 'idle';
    avatar.group.rotation.z = down ? Math.PI / 2 : 0;   // fainted: on your side
    if (player.grounded) walkDist += player.speed * dt;   // V8.1: the legs swing with the metres, not with the clock
    avatar.update(now, down ? 'idle' : pose, { z: player.ground + player.y + (down ? 0.35 : 0), stride: walkDist * 4.2 });
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
    water.update(now, lite);
    daynight.setGloom((WEER[weerNu()] || WEER.zon).gloom);   // V8.2
    syncSchat(now);   // V8.3
    budgetLights(now);   // V9.1
    syncKisten(now);   // V9.3
    if (kampGear.torenLight) kampGear.torenLight.intensity = daynight.darkness * 7;
    lantern.intensity = Math.max(lantern.intensity, now < noodfakkelUntil ? 40 : 0);   // V9.4: the flare glows from the player's lantern light
    if (kampGear.vlag) kampGear.vlag.rotation.y = Math.sin(now / 300) * 0.35;
    updateRain(dt, focus, weerNu(), lite);
    camp.update(now, daynight.darkness, lite, camera);
    vuurtoren.update(now, daynight.darkness);
    // the night bookkeeping (fire, hunger, ghosts, bear, deer) runs on real elapsed time, up to a second per frame,
    // so a slow frame rate (CI, an old iPad) does not slow the world down
    updateNight(now, Math.min(1.0, (now - prevNow) / 1000));
    updateShots(now);   // V9.2
    engine.noteSim(performance.now() - frameStart);   // V9.1: how much of the frame was ours before the draw
    engine.render(scene, camera);
  }

  function reset() {
    Object.assign(player, createPlayer(START.x, START.z, START.heading));
    player.ground = map.groundAt(player.x, player.z);
    tiles.warm(player.x, player.z);
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
    /** V7.4: where the fire's flames are on the screen (px), for "+3 🪵" to pop out of the fire itself. */
    firePoint() {
      const v = camp.firePos.clone(); v.y += 1.8; v.project(camera);
      const r = (engine.container || document.getElementById('avontuur')).getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 };
    },
    get fishing() { return fishing ? { biting: !!fishing.biteUntil } : null; },
    get ghosts() { return (samen && samen.isGuest ? remoteGhosts.map((rg) => ({ x: rg.holder.position.x, z: rg.holder.position.z, state: 'remote' })) : ghosts.map((gh) => ({ x: gh.g.x, z: gh.g.z, state: gh.g.state }))); },
    get bear() { return bears.length ? { x: bears[0].b.x, z: bears[0].b.z, state: bears[0].b.state, scared: bears[0].b.scared } : null; },
    get bears() { return bears.map((b) => ({ x: b.b.x, z: b.b.z, state: b.b.state, scared: b.b.scared })); },
    spawnBears(n = config.campagne.beren) { spawnBears(n); },
    /** Put every bear right next to the player (tests). */
    bearsAt(x, z) { bears.forEach((b, i) => { b.b.x = x + i * 0.8; b.b.z = z; }); },
    get berenNacht() { return berenNacht ? { ...berenNacht } : null; },
    get lights() { return state ? lightsNow() : []; },
    // V8.2: the weather of today ({ kind, icon, mul }: how much faster the fire burns, 1 with the afdak), and the test hooks
    get weer() { const k = weerNu(); return { kind: k, icon: (WEER[k] || WEER.zon).icon, mul: weerBurnMul(k, !!(state && state.eiland.tools.afdak), config.weer) }; },
    setWeer(k) { weerOverride = k || null; if (k === 'storm' && daynight.darkness > 0.5 && !strikeAt && !bliksem.burning) strikeAt = performance.now() + config.weer.bliksemNaMs; },
    strikeNow() { strike(performance.now()); },
    get bliksem() { return bliksem.burning; },
    // V8.3: the treasure map: pieces found, whether the X is out and where; the mounds for the tests
    get kaart() { const have = state ? kaartStukken(state.eiland) : []; return { n: have.length, total: KAARTSTUKKEN.length, compleet: !!state && kaartCompleet(state.eiland), x: xMound.on ? { x: xMound.x, z: xMound.z } : null }; },
    graafplekken: Object.fromEntries(KAARTSTUKKEN.map((k) => [k.id, { x: k.x, z: k.z }])),
    // V8.4: the pirates for the tests: start a pirate night now (they land at once), move them, read them
    piratenNu() { if (!piratenInfo) { piratenInfo = { weg: 0, geplunderd: false }; boot.visible = true; } if (!pirates.length) spawnPirates(); },
    piratenAt(x, z) { pirates.forEach((pr, i) => { pr.p.x = x + i * 1.2; pr.p.z = z; pr.p.pause = 0; }); },
    get piraten() { return pirates.map((pr) => ({ x: pr.p.x, z: pr.p.z, state: pr.p.state })); },
    get piratenNacht() { return piratenInfo ? { ...piratenInfo, boot: boot.visible } : null; },
    // V9.2: the fight for the tests: the enemies' lives and shots in flight
    get levens() { return { wolven: wolves.map((v) => v.w.hp), spoken: ghosts.map((g) => g.g.hp), beren: bears.map((b) => b.b.hp), piraten: pirates.map((p) => p.p.hp) }; },
    get schoten() { return shots.length; },
    get poefs() { return poefs; },   // enemies beaten this visit (tests: a poof, not a wolf that ran off and was removed)
    /** Tests: no ghosts drifting in (on the slow runner one arrives mid-test and takes the weapon slot from the wolf). */
    setSpoken(on) { ghostsOff = !on; if (!on) { for (const gh of ghosts) scene.remove(gh.holder); ghosts.length = 0; } },
    /** Tests: fire at the nearest enemy in range right now (the label), or null; the CI runner renders a frame every few
     * seconds, so waiting for the button to show the weapon and tapping it in time is a lottery there. */
    schiet() { const a = shootAction(); if (!a) return null; action = a; shoot(a, performance.now()); return a.label; },
    // V9.3: the chests of today and the camp for the tests
    get kisten() { return kisten.filter((k) => k.group.visible).map((k) => ({ i: k.i, x: k.x, z: k.z, zone: k.zone, open: k.open })); },
    get kampLevel() { return kampGear.level; },
    // V9.4: the gadgets and the restart
    gebruikNet, noodfakkel: () => noodfakkel(performance.now()), roepHond, herstart,
    get noodfakkel_actief() { return performance.now() < noodfakkelUntil; },
    // V9.5: the boss for the tests
    baasNu(id) { const def = baasById(id); if (def && !baas) spawnBaas({ ...def, ronde: 0 }); },
    baasAt(x, z) { if (baas) { baas.b.x = x; baas.b.z = z; baas.b.pause = 0; baas.b.state = 'come'; } },
    get baas() { return baas ? { id: baas.def.id, hp: baas.b.hp, hpMax: baas.b.hpMax, x: baas.b.x, z: baas.b.z, state: baas.b.state } : null; },
    get remotes() { return [...remotes.entries()].map(([id, r]) => ({ id, x: r.x, z: r.z, pose: r.pose, down: !!(r.down || r.pose === 'down'), tag: r.key })); },
    setDown(v) { down = !!v; },
    get down() { return down; },
    onLand(x, z) { return walkable(x, z); },   // with the climbing shoes the snow counts as land
    kindAt(x, z) { return map.kindAt(x, z); },
    landmarks: { CAMP, PIER, LAKE, TENT: TENT_AT, CHEST: camp.chest.pos, CAVE, VUURTOREN, HUT, HUTCHEST: vuurtoren.chest.pos },
    setChestOpen(open, which = 'grot') { (which === 'hut' ? vuurtoren.chest : camp.chest).setOpen(open); },
    get forestCount() { return tiles.count; },
    get tilesLoaded() { return tiles.loaded; },
    /** Nearest untaken shell / berry bush / tree, for the tests to walk to. */
    nearest(kind) {
      const list = kind === 'schelp' ? tiles.allShells().filter((s) => !s.taken) : kind === 'bes' ? tiles.allBushes() : kind === 'steen' ? tiles.allObstacles().filter((o) => o.kind && o.kind.startsWith('rock')) : tiles.allObstacles().filter((o) => o.kind && o.kind.startsWith('tree'));
      let best = null, bd = Infinity;
      const clear = (it) => (kind === 'schelp' || kind === 'bes') || (kind === 'steen' ? (!tiles.near(it.x, it.z + 1.4).some((o) => o.kind && (o.kind.startsWith('tree') || o.kind.startsWith('rock')) && o !== it && Math.hypot(o.x - it.x, o.z - it.z - 1.4) < REACH.tree + o.r + 0.8) && !tiles.nearShells(it.x, it.z + 1.4).some((sh) => !sh.taken && Math.hypot(sh.x - it.x, sh.z - it.z - 1.4) < REACH.shell + 0.8) && !tiles.nearBushes(it.x, it.z + 1.4).some((b) => Math.hypot(b.x - it.x, b.z - it.z - 1.4) - b.r < REACH.bush + 0.8)) : !tiles.nearShells(it.x, it.z + 1).some((s) => !s.taken && Math.hypot(s.x - it.x, s.z - it.z - 1) < REACH.shell + 0.6));   // V9.3: a rock with a tree in front would offer the tree's HAK   // a tree with a shell at its foot would offer PAK
      for (const it of list) { const d = Math.hypot(it.x - player.x, it.z - player.z); if (d < bd && map.walkable(it.x, it.z + 1) && clear(it)) { bd = d; best = it; } }
      return best ? { x: best.x, z: best.z } : null;
    },
    setInput(x, y, run = false) { controls.setOverride(x == null ? null : { x, y, run }); },
    jump() { controls.pressJump(); },
    setPhase(p) { phaseOverride = p; daynight.setOverride(p); },
    teleport(x, z) { player.x = x; player.z = z; player.ground = map.groundAt(x, z); firstFrame = true; tiles.warm(x, z); },
    get camera() { return { x: camera.position.x, y: camera.position.y, z: camera.position.z, ground: player.ground, h: map.heightAt(camera.position.x, camera.position.z) }; },
    get debug() { return { scene, camera }; },
    act() { doAction(); },
    tapAt(x, y) { handleTap({ x, y }); },
    get fallen() { return falls.length; },
    get caveGhost() { return { x: caveGhost.x, z: caveGhost.z, state: caveGhost.state }; },
    get deer() { return deer ? { x: deer.d.x, z: deer.d.z, state: deer.d.state } : null; },
    get drops() { return drops.map((d) => ({ item: d.item, x: d.x, z: d.z })); },
    get speedMul() { return env.speedMul; },
    get fireLevel() { return camp.fireLevel; },
    get atCamp() { return Math.hypot(player.x - CAMP.x, player.z - CAMP.z) < REACH.camp; },
    stoke() { cb.onStoke && cb.onStoke(); },
    cook() { cb.onCook && cb.onCook(); },
    spawnDeer,
    removeDeer: clearDeer,
    spawnWolves,
    scareWolves,   // V9.2 tests
    removeWolves: clearWolves,
    get wolves() { return wolves.map((v) => ({ x: v.w.x, z: v.w.z, state: v.w.state })); },
    /** Put one wolf right behind the player, lunging (tests). */
    wolfAt(x, z) { spawnWolves(); const v = wolves[0]; v.w.x = x; v.w.z = z; v.w.state = 'lunge'; },
    /** Put the whole pack round the player (tests on a slow runner: they would take long to arrive). */
    wolvesAt(x, z) { wolves.forEach((v, i) => { v.w.x = x + Math.cos(i * 2.1) * 3; v.w.z = z + Math.sin(i * 2.1) * 3; }); },
    /** Put the deer right behind the player in charge mode (tests). */
    deerAt(x, z) { spawnDeer(); deer.d.x = x; deer.d.z = z; deer.d.state = 'charge'; },
    get bats() { return batsState; },
    inCave(x, z) { return map.inCave(x, z); },
    emote,
    bite() { if (fishing && !fishing.biteUntil) fishing.until = 0; },
    goldNext() { forceGoldFish = true; },
    spawnGhost, spawnBear: () => spawnBear(),
    /** Put a ghost right next to the player (tests): it steals on the next step unless the spot is lit. */
    ghostAt(x, z) { spawnGhost(); const gh = ghosts[ghosts.length - 1]; gh.g.x = x; gh.g.z = z; },
  };

  return { mount, resize, render, setState, reset, doAction, emote, hook, camera, scene, setChestOpen: (o, which = 'grot') => (which === 'hut' ? vuurtoren.chest : camp.chest).setOpen(o) };
}
