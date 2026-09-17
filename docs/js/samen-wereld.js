// samen-wereld.js — the shared world of SAMEN SPELEN (V10.1, PLAN-V10 §A), pure. The host is the game master: its
// enemies, boss, fire, weather and boat go out four times a second as one compact message; every guest mirrors them
// and shoots with its own weapons through a `schiet` message the host checks before it counts. Nothing personal
// travels: numbers, short ids and weapon names only.
import { WAPENS } from './gevecht.js';

export const SOORTEN = ['spook', 'wolf', 'beer', 'piraat'];
export const MAX = Object.freeze({ spook: 8, wolf: 12, beer: 4, piraat: 6 });
export const WEER_SOORTEN = ['zon', 'regen', 'storm'];

const r1 = (v) => Math.round((Number(v) || 0) * 10) / 10;
const fin = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
function pakLijst(list, max) {
  return (list || []).slice(0, max).map((e) => [r1(e.x), r1(e.z), Math.max(0, Math.round(fin(e.hp, 1))), e.state === 'flee' ? 1 : 0]);
}
function leesLijst(list, max) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, max).filter((e) => Array.isArray(e) && Number.isFinite(Number(e[0])) && Number.isFinite(Number(e[1])))
    .map((e) => ({ x: Number(e[0]), z: Number(e[1]), hp: Math.max(0, Math.round(fin(e[2], 1))), flee: Number(e[3]) === 1 }));
}

/** The host's world as one message: { ph, f, wr, bt, g, w, b, p, bs }. */
export function pakWereld({ phase, fire, weer, boot, ghosts, wolves, bears, pirates, baas }) {
  return {
    ph: Math.round(Math.max(0, Math.min(0.9999, fin(phase))) * 10000) / 10000,
    f: r1(fire),
    wr: WEER_SOORTEN.includes(weer) ? weer : 'zon',
    bt: boot ? 1 : 0,
    g: pakLijst(ghosts, MAX.spook),
    w: pakLijst(wolves, MAX.wolf),
    b: pakLijst(bears, MAX.beer),
    p: pakLijst(pirates, MAX.piraat),
    bs: baas && baas.b ? [String(baas.id), r1(baas.b.x), r1(baas.b.z), Math.max(0, Math.round(fin(baas.b.hp))), Math.max(1, Math.round(fin(baas.b.hpMax, 1))), baas.b.state === 'flee' ? 1 : 0] : null,
  };
}

/** The message back into shape, every number checked and every list clamped (a guest never trusts the wire blindly). */
export function leesWereld(d) {
  const o = d && typeof d === 'object' ? d : {};
  const bs = Array.isArray(o.bs) && typeof o.bs[0] === 'string' && Number.isFinite(Number(o.bs[1])) && Number.isFinite(Number(o.bs[2]))
    ? { id: o.bs[0].slice(0, 20), x: Number(o.bs[1]), z: Number(o.bs[2]), hp: Math.max(0, Math.round(fin(o.bs[3]))), max: Math.max(1, Math.round(fin(o.bs[4], 1))), flee: Number(o.bs[5]) === 1 }
    : null;
  return {
    ph: Math.max(0, Math.min(0.9999, fin(o.ph))),
    f: Math.max(0, fin(o.f)),
    wr: WEER_SOORTEN.includes(o.wr) ? o.wr : 'zon',
    bt: Number(o.bt) === 1,
    g: leesLijst(o.g, MAX.spook),
    w: leesLijst(o.w, MAX.wolf),
    b: leesLijst(o.b, MAX.beer),
    p: leesLijst(o.p, MAX.piraat),
    bs,
  };
}

/** A guest's shot { k: kind | 'baas', i: index, w: weapon id } → { kind, i, wapen } or null when anything is off. */
export function keurSchot(d) {
  if (!d || typeof d !== 'object') return null;
  const kind = String(d.k || '');
  if (kind !== 'baas' && !SOORTEN.includes(kind)) return null;
  const i = Number(d.i);
  if (!Number.isInteger(i) || i < 0 || i >= 16) return null;
  const wapen = String(d.w || '');
  if (!WAPENS[wapen]) return null;
  return { kind, i, wapen };
}

/** Does this weapon work on this kind of enemy? (the water pistol only on ghosts, a spear never on a ghost) */
export function wapenMag(wapenId, kind) {
  const w = WAPENS[wapenId];
  if (!w) return false;
  return kind === 'spook' ? !!w.spook : !w.alleenSpook;
}

/** The nearest of the players [{ id, x, z }] to (x, z); the first one when the list is empty is null. */
export function dichtstbij(spelers, x, z) {
  let best = null, bd = Infinity;
  for (const p of spelers || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/** A position from the wire, or null. */
export function keurPlek(d) {
  if (!d || !Number.isFinite(Number(d.x)) || !Number.isFinite(Number(d.z))) return null;
  return { x: Number(d.x), z: Number(d.z) };
}
