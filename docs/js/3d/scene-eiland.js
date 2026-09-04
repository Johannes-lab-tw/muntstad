// 3d/scene-eiland.js — the Avontuureiland: terrain, forest, camp, day and night, and you walking around it with
// the camera behind you (3d/player.js + 3d/controls.js, as on the village island in round 1). Own Three scene.
// createEilandScene(game, engine, controls) → { mount, resize, render(now), setState, reset, hook }
import * as T from '../../vendor/three.module.min.js';
import { avatarModel, lookKey } from './avatar.js';
import { petModel } from './pets.js';
import { createPlayer, createFollower, stepPlayer, stepFollower, turnTowards, createGrid } from './player.js';
import { addLights } from './engine.js';
import { createHeightmap, PIER, CAMP } from './heightmap.js';
import { createTerrain } from './terrain.js';
import { placeForest, buildForest } from './forest.js';
import { createCamp } from './camp.js';
import { createDayNight } from './daynight.js';
import { isFunActive } from '../economy.js';

const CAM = { dist: 6.2, pitch: 0.42, minPitch: 0.15, maxPitch: 1.0, lookUp: 1.1, swipe: 0.0075, follow: 1.4 };
const START = { x: PIER.x, z: PIER.z - 2.5, heading: Math.PI };   // on the pier, facing the island

export function createEilandScene(game, engine, controls) {
  const config = game.config;
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

  // ---------- camera ----------
  function placeCamera(dt) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const py = player.ground + player.y * 0.5;
    camPos.set(player.x - Math.sin(yaw) * CAM.dist * cp, py + CAM.dist * sp + 0.4, player.z - Math.cos(yaw) * CAM.dist * cp);
    // never below the ground behind the player
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

    avatar.group.position.set(player.x, 0, player.z);
    avatar.group.rotation.y = player.heading;
    const pose = !player.grounded ? 'jump' : player.moving ? 'walk' : 'idle';
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
  }

  const hook = {
    get player() { return { x: player.x, y: player.y, z: player.z, ground: player.ground, heading: player.heading, grounded: player.grounded, moving: player.moving }; },
    get dog() { return pet ? { x: dog.x, z: dog.z, moving: dog.moving } : null; },
    get yaw() { return yaw; },
    get jumps() { return jumps; },
    get phase() { return daynight.phase; },
    get darkness() { return daynight.darkness; },
    onLand(x, z) { return map.walkable(x, z); },
    kindAt(x, z) { return map.kindAt(x, z); },
    landmarks: { CAMP, PIER },
    forestCount: Object.values(placeForest(map)).reduce((n, l) => n + l.length, 0),
    setInput(x, y, run = false) { controls.setOverride(x == null ? null : { x, y, run }); },
    jump() { controls.pressJump(); },
    setPhase(p) { daynight.setOverride(p); },
    teleport(x, z) { player.x = x; player.z = z; player.ground = map.groundAt(x, z); firstFrame = true; },
  };

  return { mount, resize, render, setState, reset, hook, camera, scene };
}
