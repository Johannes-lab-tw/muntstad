// 3d/scene-dorp.js — walking through Muntstad (V6.3): the same town as the map (scene-stad's scene graph keeps
// running: buildings, traffic, coins, clouds), seen from behind your own figure with the island's controls. The figure
// and the dog are drawn at a third of their size, so the town feels three times bigger than on the map. At the harbour
// lies the boat: VAAR takes you to the Avontuureiland. Near a building the action button offers KOOP / BETER, at your
// house HUIS.
// createDorpScene(game, engine, controls, cb) → { mount, resize, render(now), reset, setState, doAction, hook }
//   cb = { onAction(action | null), onVaar(), onMaker(id), onHuis(), onSay(lineKey) }
import * as T from '../../vendor/three.module.min.js';
import { avatarModel, lookKey } from './avatar.js';
import { petModel } from './pets.js';
import { createPlayer, createFollower, stepPlayer, stepFollower, turnTowards, createGrid } from './player.js';
import { PLOTS, HOUSE, HARBOR, BANK, ISLAND, obstacles as townObstacles, townWalkable, townGroundAt } from './world.js';
import { isFunActive, makerLevel } from '../economy.js';

export const SCALE = 0.34;   // the figure's size in the town: a third, so the town is three times as big for it
const CAM = { dist: 2.4, pitch: 0.42, minPitch: 0.15, maxPitch: 1.0, lookUp: 0.45, swipe: 0.0075, follow: 1.4 };
const REACH = { plot: 3.0, house: 3.0, boat: 1.9 };
const START = { x: HARBOR.x, z: HARBOR.z - HARBOR.len + 1.0, heading: 0 };   // on the pier, facing the town

export function createDorpScene(game, engine, controls, cb = {}) {
  const config = game.config;
  const town = game.scene;      // scene-stad: the scene graph and its simulation
  const scene = town.scene;
  const camera = new T.PerspectiveCamera(50, 1, 0.05, 220);
  let state = null;
  let W = 0, H = 0, host = null;
  let yaw = START.heading, pitch = CAM.pitch, firstFrame = true;

  // ---------- the figure and the dog ----------
  const player = createPlayer(START.x, START.z, START.heading);
  const dog = createFollower(START.x + 0.35, START.z - 0.3, START.heading);
  const statics = [...townObstacles(config), ...HARBOR.posts.map(([x, z]) => ({ x, z, r: 0.12 }))];
  const near = createGrid(statics, 3);
  const env = { yaw: START.heading, near, walkable: townWalkable, groundAt: townGroundAt, speedMul: SCALE * 1.15 };
  let avatar = null, avatarKey = '';
  let pet = null, petId = null, petPhase = Math.random() * 10;
  function syncAvatar() {
    const s = state;
    const look = { color: (config.colors.find((c) => c.id === s.color) || config.colors[0]).hex, hat: s.equipped.hat, skin: s.equipped.skin, vehicle: null };
    const key = lookKey(look);
    if (key === avatarKey) return;
    avatarKey = key;
    if (avatar) scene.remove(avatar.group);
    avatar = avatarModel(look);
    avatar.group.scale.setScalar(SCALE);
    scene.add(avatar.group);
  }
  function syncPet() {
    const id = ['hond', 'kat', 'konijn', 'papegaai'].find((p) => isFunActive(state, config, p)) || null;
    if (id === petId) return;
    petId = id;
    if (pet) { scene.remove(pet.group); pet = null; }
    if (id) { pet = petModel(id); pet.group.scale.setScalar(SCALE); scene.add(pet.group); }
  }

  // ---------- what can you do here? ----------
  let action = null, lastActionKey = '';
  function findAction() {
    const px = player.x, pz = player.z;
    const boat = { x: HARBOR.x, z: HARBOR.z - HARBOR.len };
    if (Math.hypot(px - boat.x, pz - boat.z) < REACH.boat) return { type: 'vaar', label: 'VAAR', target: null };
    if (Math.hypot(px - HOUSE[0], pz - HOUSE[1]) < REACH.house) return { type: 'huis', label: 'HUIS', target: null };
    if (Math.hypot(px - BANK[0], pz - BANK[1]) < 2.2) return { type: 'bank', label: 'BANK', target: null };
    let best = null, bd = Infinity;
    for (const m of config.makers) {
      const [x, z] = PLOTS[m.id];
      const d = Math.hypot(px - x, pz - z);
      if (d < REACH.plot && d < bd) { bd = d; best = { type: 'maker', label: makerLevel(state, m.id) > 0 ? 'BETER' : 'KOOP', target: m.id }; }
    }
    return best;
  }
  function doAction() {
    if (!action) return;
    if (action.type === 'vaar') cb.onVaar && cb.onVaar();
    else if (action.type === 'huis') cb.onHuis && cb.onHuis();
    else if (action.type === 'bank') cb.onBank && cb.onBank();
    else if (action.type === 'maker') cb.onMaker && cb.onMaker(action.target);
  }

  // ---------- camera ----------
  const camPos = new T.Vector3(), camLook = new T.Vector3(), focus = new T.Vector3();
  function placeCamera(dt) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const py = player.ground + player.y * SCALE;
    camPos.set(player.x - Math.sin(yaw) * CAM.dist * cp, py + CAM.dist * sp + 0.15, player.z - Math.cos(yaw) * CAM.dist * cp);
    if (camPos.y < 0.25) camPos.y = 0.25;
    camLook.set(player.x, py + CAM.lookUp, player.z);
    if (firstFrame) { camera.position.copy(camPos); firstFrame = false; }
    else camera.position.lerp(camPos, 1 - Math.exp(-9 * dt));
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
  function setState(s) { state = s; town.setState(s); }

  const SUBSTEP = 1 / 60;
  let lastTime = 0, prevNow = 0, simAcc = 0, jumps = 0, pendingJump = false;
  function render(now) {
    if (engine.checkSize()) resize();   // V7.0: the container changed size without a usable resize event (iPad rotation)
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
    const next = findAction();
    const key = next ? `${next.type}:${next.label}:${next.target || ''}` : '';
    if (key !== lastActionKey) { lastActionKey = key; action = next; cb.onAction && cb.onAction(next); }
    else action = next;

    avatar.group.position.set(player.x, 0, player.z);
    avatar.group.rotation.y = player.heading;
    const pose = !player.grounded ? 'jump' : player.moving ? 'walk' : 'idle';
    avatar.update(player.running && player.grounded ? now * 1.45 : now, pose, { z: (player.ground + player.y * SCALE) / SCALE });
    if (pet) {
      pet.group.position.set(dog.x, dog.ground, dog.z);
      pet.group.rotation.y = dog.heading;
      pet.update(now, { walking: dog.moving, phase: petPhase });
    }
    placeCamera(dt);
    focus.set(player.x, player.ground, player.z);
    town.simulate(now, dt, { camera, roadAvatar: false, depthRef: focus });
    engine.render(scene, camera);
  }

  function reset() {
    Object.assign(player, createPlayer(START.x, START.z, START.heading));
    player.ground = townGroundAt(player.x, player.z);
    Object.assign(dog, createFollower(START.x + 0.35, START.z - 0.3, START.heading));
    yaw = START.heading;
    firstFrame = true;
    lastTime = 0;
    simAcc = 0;
    lastActionKey = '';
    action = null;
  }

  const hook = {
    get player() { return { x: player.x, y: player.y, z: player.z, ground: player.ground, heading: player.heading, grounded: player.grounded, moving: player.moving }; },
    get dog() { return { x: dog.x, z: dog.z }; },
    get yaw() { return yaw; },
    get jumps() { return jumps; },
    get action() { return action ? { type: action.type, label: action.label, target: action.target } : null; },
    walkable: townWalkable,
    landmarks: { HARBOR, HOUSE, PLOTS, ISLAND, BANK },
    setInput(x, y, run = false) { controls.setOverride(x == null ? null : { x, y, run }); },
    jump() { controls.pressJump(); },
    teleport(x, z) { player.x = x; player.z = z; player.ground = townGroundAt(x, z); firstFrame = true; },
    act() { doAction(); },
  };
  return { mount, resize, render, reset, setState, doAction, hook };
}
