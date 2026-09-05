// ui/minimap.js — the little map in the corner of the island (V6.2e): the island's shape from the heightmap (sea,
// beach, grass, swamp, rock, snow, lake, paths) drawn once, then every quarter second the camp, the places, you (a dot
// with a heading) and your friends. Pure canvas 2D; the heights come straight from baseHeight (no tile cache needed).
import { MAP, CAMP, LAKE, MOERAS, HILL, CAVE, RUINE, PIER, VUURTOREN, baseHeight, distToPaths } from '../3d/heightmap.js';

const COL = { sea: '#3f9de0', beach: '#f4d98a', grass: '#63c452', dark: '#4fae45', moeras: '#5f7a3a', rock: '#8d9199', snow: '#f7fbff', lake: '#4fc8f0', path: '#e8d5a2' };

/** The island as an image, sampled every `step` metres. */
export function paintIsland(ctx, size, step = 4) {
  const n = Math.ceil(MAP.size / step);
  const px = size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * step + step / 2, z = j * step + step / 2;
    const y = baseHeight(x, z);
    let c;
    if (y < 0.05) c = COL.sea;
    else if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 0.95 && y < LAKE.level) c = COL.lake;
    else if (Math.hypot(x - MOERAS.x, z - MOERAS.z) < MOERAS.r * 0.9) c = COL.moeras;
    else if (y > HILL.top * 0.8) c = COL.snow;
    else if (y > HILL.top * 0.55) c = COL.rock;
    else if (y < 0.45) c = COL.beach;
    else if (distToPaths(x, z) < 1.6) c = COL.path;
    else c = ((i * 7 + j * 13) % 5 === 0) ? COL.dark : COL.grass;
    ctx.fillStyle = c;
    ctx.fillRect(i * px, j * px, px + 0.5, px + 0.5);
  }
}

/**
 * createMinimap(canvas) → { update(player, remotes, dark, extra) }. The canvas keeps its own island image; update
 * redraws the marks. `player` = { x, z, heading }, `remotes` = [{ x, z }], `extra` = { fireR } (the fire's light at night).
 */
export function createMinimap(canvas) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const island = document.createElement('canvas');
  island.width = size; island.height = size;
  paintIsland(island.getContext('2d'), size);
  const k = size / MAP.size;
  const marks = [
    { x: CAMP.x, z: CAMP.z, t: '🔥' }, { x: LAKE.x, z: LAKE.z, t: '🐟' }, { x: CAVE.x, z: CAVE.z, t: '🕳️' },
    { x: MOERAS.x, z: MOERAS.z, t: '🐸' }, { x: RUINE.x, z: RUINE.z, t: '🏚️' }, { x: HILL.x, z: HILL.z, t: '⛰️' }, { x: PIER.x, z: PIER.z, t: '⛵' }, { x: VUURTOREN.x, z: VUURTOREN.z, t: '🗼' },
  ];
  let last = 0;
  function update(player, remotes = [], dark = 0, extra = {}, now = performance.now()) {
    if (now - last < 250) return;
    last = now;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(island, 0, 0);
    if (dark > 0.5) { ctx.fillStyle = `rgba(10, 14, 50, ${0.45 * dark})`; ctx.fillRect(0, 0, size, size); }
    if (dark > 0.5 && extra.fireR > 0) {
      ctx.beginPath(); ctx.arc(CAMP.x * k, CAMP.z * k, extra.fireR * k, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 180, 60, 0.35)'; ctx.fill();
    }
    ctx.font = `${Math.round(size * 0.09)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const m of marks) ctx.fillText(m.t, m.x * k, m.z * k);
    for (const r of remotes) {
      ctx.beginPath(); ctx.arc(r.x * k, r.z * k, size * 0.028, 0, Math.PI * 2);
      ctx.fillStyle = '#b76cff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    if (player) {
      const x = player.x * k, z = player.z * k, h = player.heading || 0;
      ctx.beginPath(); ctx.arc(x, z, size * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3b3b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      // the heading: +z in the world is "down" on the map; heading 0 looks along +z
      ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x + Math.sin(h) * size * 0.07, z + Math.cos(h) * size * 0.07);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }
  return { update };
}
