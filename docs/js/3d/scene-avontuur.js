// 3d/scene-avontuur.js — walking around the town yourself: a camera behind and above the avatar, the player from
// 3d/player.js, and the dog trotting along. Renders the *same* Three scene as STAD (scene-stad keeps simulating
// buildings, coins, traffic and clouds) through its own camera. Contract: createAvontuurScene(game, engine, stad, controls)
// → { mount, resize, render(now), setState, hook } where hook is exposed on window.__muntstad for the tests.
import * as T from '../../vendor/three.module.min.js';
import { avatarModel, lookKey } from './avatar.js';
import { petModel } from './pets.js';
import { createPlayer, createFollower, stepPlayer, stepFollower, turnTowards } from './player.js';
import { ISLAND, PARK, obstacles as worldObstacles } from './world.js';
import { isFunActive } from '../economy.js';

const CAM = { dist: 5.4, pitch: 0.46, minPitch: 0.2, maxPitch: 0.95, lookUp: 1.0, swipe: 0.0075, follow: 1.4 };
const START = { x: PARK[0] - 3.4, z: 10.4, heading: Math.PI };   // open grass south-west of the park, facing the town

export function createAvontuurScene(game, engine, stad, controls) {
  const config = game.config;
  const scene = stad.scene;
  const camera = new T.PerspectiveCamera(48, 1, 0.1, 220);
  const camPos = new T.Vector3();
  const camLook = new T.Vector3();
  let W = 0, H = 0;
  let host = null;
  let state = null;
  let yaw = START.heading;
  let pitch = CAM.pitch;
  let firstFrame = true;

  const island = { x: 0, z: 0, w: ISLAND.w, d: ISLAND.d, r: ISLAND.r };
  const obstacles = worldObstacles(config);
  const env = { yaw, obstacles, island, margin: 0.45 };

  const player = createPlayer(START.x, START.z, START.heading);
  const dog = createFollower(START.x + 0.6, START.z + 1.2, START.heading);

  // ---------- models ----------
  let avatar = null, avatarKey = '';
  function syncAvatar() {
    const colorHex = (config.colors.find((c) => c.id === state.color) || config.colors[0]).hex;
    const look = { color: colorHex, hat: state.equipped.hat, skin: state.equipped.skin, vehicle: null }; // always on foot here
    const key = lookKey(look);
    if (key === avatarKey) return;
    if (avatar) scene.remove(avatar.group);
    avatar = avatarModel(look);
    scene.add(avatar.group);
    avatarKey = key;
  }
  let pet = null, petId = null;
  const petPhase = Math.random() * 10;
  function companionId(s) {
    // the dog first; otherwise whichever pet lives at HUIS and is awake
    const owned = ['hond', 'kat', 'dino'].filter((id) => s.fun[id] && isFunActive(s, config, id));
    return owned[0] || null;
  }
  function syncPet() {
    const id = state.petHungry ? null : companionId(state);
    if (id === petId) return;
    if (pet) { scene.remove(pet.group); pet = null; }
    if (id) {
      pet = petModel(id);
      scene.add(pet.group);
      dog.x = player.x - Math.sin(player.heading) * 1.3;
      dog.z = player.z - Math.cos(player.heading) * 1.3;
      dog.heading = player.heading;
    }
    petId = id;
  }

  // ---------- camera ----------
  function placeCamera(dt) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    camPos.set(player.x - Math.sin(yaw) * CAM.dist * cp, player.y * 0.5 + CAM.dist * sp + 0.4, player.z - Math.cos(yaw) * CAM.dist * cp);
    camLook.set(player.x, player.y * 0.5 + CAM.lookUp, player.z);
    if (firstFrame) { camera.position.copy(camPos); firstFrame = false; }
    else camera.position.lerp(camPos, 1 - Math.exp(-9 * dt));
    camera.lookAt(camLook);
  }

  // ---------- public ----------
  function mount(el) {
    host = el;
    engine.mount(el);
    resize();
  }
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
  let lastTime = 0, prevNow = 0, simAcc = 0, jumps = 0;
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
    // fixed substeps: walking covers the same distance per real second on a slow (software-rendered) frame rate
    simAcc += Math.min(0.25, lastTime ? (now - prevNow) / 1000 : 0.016);
    let jumpInput = input.jump;
    while (simAcc >= SUBSTEP) {
      env.yaw = yaw;
      stepPlayer(player, { x: input.x, y: input.y, run: input.run, jump: jumpInput }, SUBSTEP, env);
      jumpInput = false;
      if (player.jumped) { jumps++; game.audio.play('jump'); }
      // the camera drifts in behind the player while walking, unless a thumb is steering it
      if (!input.looking && player.moving && Math.hypot(input.x, input.y) > 0.3) yaw = turnTowards(yaw, player.heading, CAM.follow, SUBSTEP);
      if (pet) stepFollower(dog, player, SUBSTEP, env);
      simAcc -= SUBSTEP;
    }

    avatar.group.position.set(player.x, 0, player.z);
    avatar.group.rotation.y = player.heading;
    const pose = !player.grounded ? 'jump' : player.moving ? 'walk' : 'idle';
    avatar.update(player.running && player.grounded ? now * 1.45 : now, pose, { z: player.y });

    if (pet) {
      pet.group.position.set(dog.x, 0, dog.z);
      pet.group.rotation.y = dog.heading;
      pet.update(now, { walking: dog.moving, phase: petPhase });
    }

    placeCamera(dt);
    stad.simulate(now, dt, { roadAvatar: false, depthRef: avatar.group.position, camera });
    engine.render(scene, camera);
  }

  function reset() {
    Object.assign(player, createPlayer(START.x, START.z, START.heading));
    yaw = START.heading;
    firstFrame = true;
    lastTime = 0;
    simAcc = 0;
  }

  const hook = {
    get player() { return { x: player.x, y: player.y, z: player.z, heading: player.heading, grounded: player.grounded, moving: player.moving }; },
    get dog() { return pet ? { x: dog.x, z: dog.z, moving: dog.moving } : null; },
    get yaw() { return yaw; },
    get jumps() { return jumps; },
    island, obstacles,
    setInput(x, y, run = false) { controls.setOverride(x == null ? null : { x, y, run }); },
    jump() { controls.pressJump(); },
  };

  return { mount, resize, render, setState, reset, hook, camera, get visibleAvatar() { return avatar; } };
}
