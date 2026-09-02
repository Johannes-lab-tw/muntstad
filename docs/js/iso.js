// iso.js — 2:1 dimetric projection and blocky "toy" primitives for canvas 2D.
// World axes: x → screen right-down, y → screen left-down, z → screen up. One world unit = `unit` px along x/y.
// Every solid is drawn with three lit faces (top brightest, +y face lit, +x face in shadow) so the town reads as
// chunky 3D plastic. Painter's order: draw far things (small x + y) first.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

/** amount > 0 mixes toward white, amount < 0 toward deep navy (toy shadows are never plain black). */
export function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const t = clamp(amount, -1, 1);
  const target = t > 0 ? [255, 255, 255] : [22, 20, 58];
  const k = Math.abs(t);
  return rgbToHex([r + (target[0] - r) * k, g + (target[1] - g) * k, b + (target[2] - b) * k]);
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Lighting: sun from the upper left. */
export const LIGHT = { top: 0.22, left: 0.02, right: -0.3, edge: -0.55, edgeAlpha: 0.32 };
/** Ground shadow offset per unit of height (world units): shadows fall to the right-down. */
export const SHADOW = { dx: 0.5, dy: 0.18, color: 'rgba(24, 28, 70, 0.22)' };

export function createIso(ctx, opts = {}) {
  let unit = opts.unit || 32;
  let ox = opts.ox || 0;
  let oy = opts.oy || 0;

  function P(x, y, z = 0) {
    return [ox + (x - y) * unit, oy + (x + y) * unit * 0.5 - z * unit];
  }

  function path(pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [X, Y] = P(pts[i][0], pts[i][1], pts[i][2] || 0);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.closePath();
  }

  function poly(pts, fill, edge = null, lw = 1.25) {
    path(pts);
    ctx.fillStyle = fill;
    ctx.fill();
    if (edge) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = lw;
      ctx.strokeStyle = edge;
      ctx.stroke();
    }
  }

  function edgeOf(color, o) {
    if (o.edge === false) return null;
    if (o.edge) return o.edge;
    return rgba(shade(color, LIGHT.edge), LIGHT.edgeAlpha);
  }

  const iso = {
    get unit() { return unit; },
    get ox() { return ox; },
    get oy() { return oy; },
    set(u, x, y) { unit = u; ox = x; oy = y; },
    P,
    X: (x, y) => ox + (x - y) * unit,
    Y: (x, y, z = 0) => oy + (x + y) * unit * 0.5 - z * unit,
    path,
    poly,

    /** Run `fn(ctx)` with the canvas transformed so that drawing in world x/y units lands on the ground plane. */
    ground(fn) {
      ctx.save();
      ctx.transform(unit, unit * 0.5, -unit, unit * 0.5, ox, oy);
      fn(ctx);
      ctx.restore();
    },

    /** Cuboid with its base at (x, y, z), size w (along x) × d (along y) × h (up). */
    block(x, y, z, w, d, h, color, o = {}) {
      const top = o.top || shade(color, LIGHT.top);
      const left = o.left || shade(color, LIGHT.left);
      const right = o.right || shade(color, LIGHT.right);
      const edge = edgeOf(color, o);
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left, null);
      poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right, null);
      poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top, null);
      if (edge) {
        // one stroke for the whole block: the silhouette hexagon plus the three inner edges that meet at the front corner
        ctx.beginPath();
        const pts = [[x, y + d, z], [x + w, y + d, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h], [x, y + d, z + h]];
        pts.forEach(([px, py, pz], i) => { const [X, Y] = P(px, py, pz); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.closePath();
        const c0 = P(x + w, y + d, z + h), c1 = P(x + w, y + d, z), c2 = P(x + w, y, z + h), c3 = P(x, y + d, z + h);
        ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c0[0], c0[1]); ctx.lineTo(c2[0], c2[1]);
        ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c3[0], c3[1]);
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = edge;
        ctx.stroke();
      }
      if (o.alpha != null) ctx.globalAlpha = 1;
    },

    /** Flat slab on top of a block (a thin block with no visible sides worth shading separately). */
    slab(x, y, z, w, d, color, o = {}) {
      poly([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], o.top || color, edgeOf(color, o));
    },

    /** Gabled roof: eaves at z, ridge at z + h. axis 'x' → ridge runs along x. Overhang extends the base. */
    roof(x, y, z, w, d, h, color, axis = 'x', o = {}) {
      const edge = edgeOf(color, o);
      const lit = shade(color, 0.1), dark = shade(color, -0.3);
      if (axis === 'x') {
        // far slope is hidden; +y slope is lit; +x gable end is in shadow
        poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d / 2, z + h], [x, y + d / 2, z + h]], lit, edge);
        poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d / 2, z + h]], dark, edge);
        poly([[x, y, z], [x + w, y, z], [x + w, y + d / 2, z + h], [x, y + d / 2, z + h]], shade(color, -0.05), edge);
      } else {
        poly([[x, y, z], [x + w, y, z], [x + w / 2, y, z + h]], shade(color, -0.05), edge);
        poly([[x + w, y, z], [x + w, y + d, z], [x + w / 2, y + d, z + h], [x + w / 2, y, z + h]], dark, edge);
        poly([[x, y + d, z], [x + w, y + d, z], [x + w / 2, y + d, z + h]], lit, edge);
      }
    },

    /** Pyramid with apex above the centre of the base. */
    pyramid(x, y, z, w, d, h, color, o = {}) {
      const edge = edgeOf(color, o);
      const apex = [x + w / 2, y + d / 2, z + h];
      poly([[x, y + d, z], [x + w, y + d, z], apex], shade(color, 0.08), edge);
      poly([[x + w, y, z], [x + w, y + d, z], apex], shade(color, -0.3), edge);
    },

    /** Rectangle drawn on the +x face (side 'x') or +y face (side 'y') of a block, in face-local units (u along, v up). */
    face(x, y, z, w, d, side, u0, v0, uw, vh, color, o = {}) {
      const edge = o.edge === undefined ? null : o.edge;
      if (side === 'x') poly([[x + w, y + u0, z + v0], [x + w, y + u0 + uw, z + v0], [x + w, y + u0 + uw, z + v0 + vh], [x + w, y + u0, z + v0 + vh]], color, edge);
      else poly([[x + u0, y + d, z + v0], [x + u0 + uw, y + d, z + v0], [x + u0 + uw, y + d, z + v0 + vh], [x + u0, y + d, z + v0 + vh]], color, edge);
    },

    /** Ground shadow of a block of height h: convex hull of the footprint and its offset copy. */
    shadow(x, y, w, d, h, alpha = 1) {
      const dx = SHADOW.dx * h, dy = SHADOW.dy * h;
      if (alpha !== 1) ctx.globalAlpha = alpha;
      poly([[x, y, 0], [x + w, y, 0], [x + w + dx, y + dy, 0], [x + w + dx, y + d + dy, 0], [x + dx, y + d + dy, 0], [x, y + d, 0]], SHADOW.color);
      if (alpha !== 1) ctx.globalAlpha = 1;
    },

    /** Soft round ground shadow (for characters and round things). */
    blob(x, y, r, alpha = 0.22) {
      const [X, Y] = P(x, y, 0);
      ctx.beginPath();
      ctx.ellipse(X, Y, r * unit, r * unit * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(24,28,70,${alpha})`;
      ctx.fill();
    },

    /** Ellipse on the ground plane (ponds, pavements). */
    disc(x, y, rx, ry, fill, edge = null, lw = 1.5) {
      const [X, Y] = P(x, y, 0);
      ctx.beginPath();
      ctx.ellipse(X, Y, rx * unit, ry * unit * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (edge) { ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke(); }
    },

    /** Rounded rectangle on the ground plane, in world units. */
    groundRect(x, y, w, d, r, fill, edge = null, lw = 0.06) {
      iso.ground((c) => {
        const rr = Math.min(r, w / 2, d / 2);
        c.beginPath();
        c.moveTo(x + rr, y);
        c.lineTo(x + w - rr, y);
        c.quadraticCurveTo(x + w, y, x + w, y + rr);
        c.lineTo(x + w, y + d - rr);
        c.quadraticCurveTo(x + w, y + d, x + w - rr, y + d);
        c.lineTo(x + rr, y + d);
        c.quadraticCurveTo(x, y + d, x, y + d - rr);
        c.lineTo(x, y + rr);
        c.quadraticCurveTo(x, y, x + rr, y);
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        if (edge) { c.lineWidth = lw; c.strokeStyle = edge; c.stroke(); }
      });
    },

    // ---------- compound props ----------

    /** Voxel tree: trunk + two stacked canopy cubes. size scales everything. */
    tree(x, y, size = 1, leaf = '#3fbf5a', trunk = '#8a5a35', z = 0) {
      const s = size;
      if (z === 0) iso.shadow(x - 0.45 * s, y - 0.45 * s, 0.9 * s, 0.9 * s, 1.2 * s, 0.7);
      iso.block(x - 0.16 * s, y - 0.16 * s, z, 0.32 * s, 0.32 * s, 0.7 * s, trunk);
      iso.block(x - 0.5 * s, y - 0.5 * s, z + 0.55 * s, 1 * s, 1 * s, 0.8 * s, leaf);
      iso.block(x - 0.32 * s, y - 0.32 * s, z + 1.35 * s, 0.64 * s, 0.64 * s, 0.55 * s, shade(leaf, 0.12));
    },

    /** Low round-ish bush made of two cubes. */
    bush(x, y, size = 1, leaf = '#46c95f') {
      const s = size;
      iso.shadow(x - 0.35 * s, y - 0.35 * s, 0.7 * s, 0.7 * s, 0.45 * s, 0.6);
      iso.block(x - 0.35 * s, y - 0.35 * s, 0, 0.7 * s, 0.7 * s, 0.4 * s, leaf);
      iso.block(x - 0.18 * s, y - 0.22 * s, 0.38 * s, 0.4 * s, 0.4 * s, 0.22 * s, shade(leaf, 0.1));
    },

    /** Tiny flower: a green stem block with a coloured cube head. */
    flower(x, y, color = '#ff6fae') {
      iso.block(x - 0.05, y - 0.05, 0, 0.1, 0.1, 0.22, '#3aa84f', { edge: false });
      iso.block(x - 0.11, y - 0.11, 0.2, 0.22, 0.22, 0.16, color, { edge: false });
    },

    /** Coin: a fat yellow cylinder standing up, drawn as a stack of rotated slabs (cheap and chunky). */
    coin(X, Y, r = 10, t = 0) {
      const sq = Math.abs(Math.cos(t));
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(Math.max(0.25, sq), 1);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#e59b13';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -1.5, r * 0.88, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd93d';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -1.5, r * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = '#e59b13';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.45, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
      ctx.restore();
    },
  };
  return iso;
}
