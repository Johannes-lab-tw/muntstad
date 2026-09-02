// art/props.js — garden items for HUIS (and the trampoline) as blocky 3D props.
// drawProp(iso, ctx, id, x, y, t): (x, y) is the centre of the prop's footprint on the ground.
import { shade, rgba } from '../iso.js';

const INK = '#1b1f3b';
const WOOD = '#b5763f', METAL = '#9aa3b2';

export const PROPS = {
  bloemen(iso, ctx, x, y) {
    iso.groundRect(x - 0.6, y - 0.4, 1.2, 0.8, 0.2, '#8a5a35', shade('#8a5a35', -0.3), 0.05);
    const cols = ['#ff6fae', '#ffe94d', '#7c9bff', '#ff9f2e', '#ff6fae'];
    for (let i = 0; i < 5; i++) iso.flower(x - 0.42 + i * 0.21, y - 0.15 + (i % 2) * 0.3, cols[i]);
  },
  vlag(iso, ctx, x, y, t) {
    iso.block(x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.15, METAL);
    iso.block(x - 0.05, y - 0.05, 0.15, 0.1, 0.1, 1.7, '#e4e8ef');
    const wave = Math.sin(t / 240) * 0.1;
    iso.block(x + 0.05, y - 0.02, 1.4, 0.7 + wave, 0.04, 0.42, '#ff5f5f');
    iso.face(x + 0.05, y - 0.02, 1.4, 0.7 + wave, 0.04, 'y', 0, 0.16, 0.7 + wave, 0.12, '#ffffff');
  },
  zandbak(iso, ctx, x, y) {
    iso.block(x - 0.6, y - 0.6, 0, 1.2, 1.2, 0.18, WOOD);
    iso.slab(x - 0.5, y - 0.5, 0.18, 1.0, 1.0, '#f4d98a');
    iso.block(x - 0.05, y - 0.05, 0.18, 0.26, 0.26, 0.28, '#ff5f5f');
    iso.block(x - 0.35, y + 0.15, 0.18, 0.2, 0.2, 0.12, '#45b6ff');
  },
  bankje(iso, ctx, x, y) {
    iso.block(x - 0.55, y - 0.15, 0, 0.1, 0.3, 0.3, METAL);
    iso.block(x + 0.45, y - 0.15, 0, 0.1, 0.3, 0.3, METAL);
    iso.block(x - 0.6, y - 0.18, 0.3, 1.2, 0.36, 0.08, WOOD);
    iso.block(x - 0.6, y - 0.18, 0.38, 1.2, 0.08, 0.36, WOOD);
  },
  hek(iso, ctx, x, y) {
    for (let i = 0; i < 6; i++) iso.block(x - 0.75 + i * 0.3, y - 0.04, 0, 0.12, 0.08, 0.45, '#ffffff', { edge: rgba(INK, 0.25) });
    iso.block(x - 0.8, y - 0.03, 0.22, 1.6, 0.05, 0.08, '#ffffff', { edge: rgba(INK, 0.25) });
  },
  boom(iso, ctx, x, y) {
    iso.tree(x, y, 0.85);
  },
  lantaarn(iso, ctx, x, y, t) {
    iso.block(x - 0.15, y - 0.15, 0, 0.3, 0.3, 0.12, METAL);
    iso.block(x - 0.05, y - 0.05, 0.12, 0.1, 0.1, 1.3, '#5b6472');
    iso.block(x - 0.16, y - 0.16, 1.42, 0.32, 0.32, 0.28, '#ffe94d');
    iso.block(x - 0.2, y - 0.2, 1.7, 0.4, 0.4, 0.06, '#5b6472');
    const [X, Y] = iso.P(x, y, 1.56);
    ctx.beginPath();
    ctx.arc(X, Y, iso.unit * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,233,77,${0.12 + Math.sin(t / 500) * 0.04})`;
    ctx.fill();
  },
  brievenbus(iso, ctx, x, y) {
    iso.block(x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.7, '#5b6472');
    iso.block(x - 0.22, y - 0.16, 0.7, 0.44, 0.32, 0.36, '#ff5f5f');
    iso.face(x - 0.22, y - 0.16, 0.7, 0.44, 0.32, 'x', 0.06, 0.2, 0.2, 0.05, '#1b1f3b');
    iso.block(x - 0.24, y - 0.18, 1.06, 0.48, 0.36, 0.06, shade('#ff5f5f', -0.25));
  },
  sneeuwpop(iso, ctx, x, y) {
    iso.block(x - 0.32, y - 0.32, 0, 0.64, 0.64, 0.5, '#ffffff');
    iso.block(x - 0.25, y - 0.25, 0.5, 0.5, 0.5, 0.42, '#ffffff');
    iso.block(x - 0.19, y - 0.19, 0.92, 0.38, 0.38, 0.36, '#ffffff');
    iso.face(x - 0.19, y - 0.19, 0.92, 0.38, 0.38, 'x', 0.08, 0.2, 0.06, 0.06, INK);
    iso.face(x - 0.19, y - 0.19, 0.92, 0.38, 0.38, 'x', 0.24, 0.2, 0.06, 0.06, INK);
    iso.block(x + 0.19, y - 0.04, 1.04, 0.16, 0.08, 0.06, '#ff9f2e');
    iso.block(x - 0.2, y - 0.2, 1.28, 0.4, 0.4, 0.04, INK, { edge: false });
    iso.block(x - 0.12, y - 0.12, 1.32, 0.24, 0.24, 0.2, INK, { edge: false });
    iso.block(x - 0.22, y - 0.22, 0.86, 0.44, 0.44, 0.06, '#ff5f5f');
  },
  vijver(iso, ctx, x, y, t) {
    iso.disc(x, y, 0.75, 0.75, shade('#3fc0f5', -0.4));
    iso.disc(x, y, 0.62, 0.62, '#7fdcff');
    const fx = x + Math.sin(t / 900) * 0.25;
    iso.block(fx - 0.12, y - 0.06, 0.02, 0.24, 0.12, 0.1, '#ff9f2e', { edge: false });
    for (let i = 0; i < 3; i++) iso.flower(x - 0.7 + i * 0.1, y + 0.62 - i * 0.28, '#ff6fae');
  },
  tent(iso, ctx, x, y) {
    iso.pyramid(x - 0.65, y - 0.65, 0, 1.3, 1.3, 1.1, '#ff5f5f');
    iso.pyramid(x - 0.65, y - 0.65, 0, 1.3, 0.3, 0.6, '#ffffff', { edge: false });
    iso.block(x - 0.03, y - 0.03, 1.1, 0.06, 0.06, 0.3, METAL);
    iso.block(x + 0.03, y - 0.01, 1.28, 0.28, 0.03, 0.14, '#ffe94d');
  },
  fontein(iso, ctx, x, y, t) {
    iso.disc(x, y, 0.8, 0.8, shade('#dcd7cb', -0.3));
    iso.disc(x, y, 0.7, 0.7, '#7fdcff');
    iso.block(x - 0.12, y - 0.12, 0, 0.24, 0.24, 0.5, '#dcd7cb');
    iso.block(x - 0.3, y - 0.3, 0.5, 0.6, 0.6, 0.08, '#dcd7cb');
    for (let i = 0; i < 6; i++) {
      const f = ((t / 650) + i / 6) % 1;
      const a = (i / 6) * Math.PI * 2;
      const [X, Y] = iso.P(x + Math.cos(a) * 0.35 * f, y + Math.sin(a) * 0.35 * f, 0.6 + Math.sin(f * Math.PI) * 0.8);
      ctx.beginPath();
      ctx.arc(X, Y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  },
  trampoline(iso, ctx, x, y, t, bounce = 0) {
    for (const [dx, dy] of [[-0.7, -0.5], [0.6, -0.5], [-0.7, 0.4], [0.6, 0.4]]) iso.block(x + dx, y + dy, 0, 0.1, 0.1, 0.45, METAL);
    iso.disc(x, y, 0.95, 0.95, '#2f6fd6', shade('#2f6fd6', -0.4), 2);
    const [X, Y] = iso.P(x, y, 0.45 - bounce * 0.12);
    ctx.beginPath();
    ctx.ellipse(X, Y, iso.unit * 0.95, iso.unit * 0.47, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#45b6ff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(INK, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(X, Y, iso.unit * 0.7, iso.unit * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1b3f8f';
    ctx.fill();
  },
};

export function drawProp(iso, ctx, id, x, y, t = 0, extra) {
  const fn = PROPS[id];
  if (fn) fn(iso, ctx, x, y, t, extra);
  else iso.block(x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.6, '#b794f4');
}
