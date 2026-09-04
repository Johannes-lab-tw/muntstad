// 3d/daynight.js — day and night on the island: the sun (with shadows) circles, sky, fog and light colours run
// through the palette of 3d/daycycle.js, stars come out at night. The sun's shadow camera follows the player so
// shadows are only drawn nearby (cheap on an iPad).
// createDayNight(scene, lights) → { update(now, focus), get phase, get darkness, setOverride(phase | null) }
import * as T from '../../vendor/three.module.min.js';
import { col, Builder } from './build.js';
import { phaseAt, paletteAt } from './daycycle.js';

export function createDayNight(scene, lights, { fogNear = 42, fogFar = 95 } = {}) {
  const { sun, sky, fill } = lights;
  let override = null;
  let phase = 0, darkness = 0;
  scene.fog = new T.Fog(col('#bfe9ff'), fogNear, fogFar);
  scene.background = new T.Color('#8fdcff');
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.05;

  // stars: points on a dome that travels with the player
  const N = 420;
  const spos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.asin(Math.random() * 0.9 + 0.08), r = 150;
    spos[i * 3] = Math.cos(e) * Math.cos(a) * r; spos[i * 3 + 1] = Math.sin(e) * r; spos[i * 3 + 2] = Math.cos(e) * Math.sin(a) * r;
  }
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.Float32BufferAttribute(spos, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false;
  scene.add(stars);
  const moon = new T.Mesh(new T.SphereGeometry(9, 14, 12), new T.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
  scene.add(moon);
  // puffy clouds high over the island, drifting with the wind, wrapping round the player
  const clouds = [];
  const cloudMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.2, transparent: true, opacity: 0.95, fog: false });
  for (let i = 0; i < 9; i++) {
    const b = new Builder();
    const s = 2.2 + Math.random() * 2.4;
    b.puff(0, 0, 0, 1.0 * s, '#ffffff', 1);
    b.puff(1.1 * s, 0.1 * s, -0.2 * s, 0.75 * s, '#ffffff', 1);
    b.puff(-1.0 * s, -0.1 * s, -0.1 * s, 0.65 * s, '#ffffff', 1);
    b.puff(0.3 * s, 0.7 * s, -0.25 * s, 0.6 * s, '#ffffff', 1);
    const m = b.build({ material: cloudMat, shadow: false, receive: false });
    m.position.set((Math.random() - 0.5) * 240, 34 + Math.random() * 14, (Math.random() - 0.5) * 240);
    scene.add(m);
    clouds.push({ m, speed: 0.6 + s * 0.15 });
  }
  let lastCloudT = 0;

  const dir = new T.Vector3();
  function update(now, focus, offsetMs = 0) {
    // the wall clock (not the frame timer) so every device agrees; SLAAP in the tent shifts it with offsetMs
    phase = override != null ? override : phaseAt(Date.now(), offsetMs);
    const pal = paletteAt(phase);
    darkness = pal.darkness;
    scene.background.set(pal.sky);
    scene.fog.color.set(pal.fog);
    sun.color.set(pal.sun);
    sun.intensity = pal.sunI;
    sky.color.set(pal.hemiSky);
    sky.groundColor.set(pal.hemiGround);
    sky.intensity = pal.hemiI;
    fill.intensity = 0.45 * (1 - darkness * 0.8);
    // by day the sun, by night a moon high in the sky (weak, bluish) so shapes stay readable
    const night = pal.sunElev < 0.05;
    const elev = night ? 0.9 : pal.sunElev;
    const az = night ? 2.4 : pal.sunAz;
    dir.set(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)).normalize();
    sun.position.copy(focus).addScaledVector(dir, 40);
    sun.target.position.copy(focus);
    sun.target.updateMatrixWorld();
    stars.position.copy(focus);
    stars.material.opacity = darkness * 0.9;
    moon.position.copy(focus).addScaledVector(dir, 140);
    moon.visible = night;
    // clouds drift east and wrap round the player; they dim with the night
    const dt = lastCloudT ? Math.min(0.1, (now - lastCloudT) / 1000) : 0;
    lastCloudT = now;
    cloudMat.emissiveIntensity = 0.2 * (1 - darkness);
    cloudMat.color.setScalar(1 - darkness * 0.75);
    for (const c of clouds) {
      c.m.position.x += c.speed * dt;
      if (c.m.position.x - focus.x > 130) c.m.position.x -= 260;
      if (c.m.position.x - focus.x < -130) c.m.position.x += 260;
      if (c.m.position.z - focus.z > 130) c.m.position.z -= 260;
      if (c.m.position.z - focus.z < -130) c.m.position.z += 260;
    }
  }
  return {
    update,
    get phase() { return phase; },
    get darkness() { return darkness; },
    setOverride(p) { override = p; },
  };
}
