// 3d/controls.js — input for the adventure. Touch: the left half of the screen is a joystick that appears where the
// thumb lands, the right half turns the camera by swiping; the SPRING button (and the space bar) jumps.
// Desktop: WASD / arrows walk, Shift runs, the mouse drags the camera. No text input, nothing to configure.
// createControls(el, { stick, knob }) → { read(), pressJump(), setEnabled(v), get active }
//   read() returns { x, y, run, jump, lookDx, lookDy, looking, stick } and clears the one-shot values.

const STICK_RADIUS = 62;   // px the knob can travel

export function createControls(el, { stick, knob } = {}) {
  let enabled = false;
  let stickId = null, lookId = null;
  let origin = { x: 0, y: 0 };
  const st = { x: 0, y: 0 };
  let lookDx = 0, lookDy = 0;
  let lastLook = { x: 0, y: 0 };
  let jumpQueued = false;
  const keys = new Set();
  let override = null;   // test hook: { x, y, run }

  function place(x, y) {
    if (!stick) return;
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
  }
  function moveKnob(dx, dy) {
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function hideStick() {
    if (stick) stick.classList.remove('on');
    moveKnob(0, 0);
    st.x = 0; st.y = 0;
  }

  function isTouchStickSide(e) {
    const r = el.getBoundingClientRect();
    return e.clientX < r.left + r.width * 0.5;
  }

  function down(e) {
    if (!enabled) return;
    if (e.target.closest('button, .mentor')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const wantsStick = e.pointerType !== 'mouse' && isTouchStickSide(e);
    if (wantsStick && stickId === null) {
      stickId = e.pointerId;
      const r = el.getBoundingClientRect();
      origin = { x: e.clientX, y: e.clientY };
      place(e.clientX - r.left, e.clientY - r.top);
      if (stick) stick.classList.add('on');
      moveKnob(0, 0);
    } else if (lookId === null) {
      lookId = e.pointerId;
      lastLook = { x: e.clientX, y: e.clientY };
    } else return;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
    e.preventDefault();
  }
  function move(e) {
    if (e.pointerId === stickId) {
      let dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      const d = Math.hypot(dx, dy);
      if (d > STICK_RADIUS) { dx *= STICK_RADIUS / d; dy *= STICK_RADIUS / d; }
      moveKnob(dx, dy);
      st.x = dx / STICK_RADIUS;
      st.y = -dy / STICK_RADIUS;
    } else if (e.pointerId === lookId) {
      lookDx += e.clientX - lastLook.x;
      lookDy += e.clientY - lastLook.y;
      lastLook = { x: e.clientX, y: e.clientY };
    }
  }
  function up(e) {
    if (e.pointerId === stickId) { stickId = null; hideStick(); }
    else if (e.pointerId === lookId) { lookId = null; }
    try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);

  const KEYS = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', shift: 'run' };
  function keydown(e) {
    if (!enabled) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { if (!e.repeat) jumpQueued = true; e.preventDefault(); return; }
    if (KEYS[k]) { keys.add(KEYS[k]); e.preventDefault(); }
  }
  function keyup(e) {
    const k = e.key.toLowerCase();
    if (KEYS[k]) keys.delete(KEYS[k]);
  }
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', () => { keys.clear(); });

  function read() {
    let x = 0, y = 0, run = false;
    if (override) { x = override.x; y = override.y; run = !!override.run; }
    else if (stickId !== null) { x = st.x; y = st.y; }
    else {
      if (keys.has('left')) x -= 1;
      if (keys.has('right')) x += 1;
      if (keys.has('up')) y += 1;
      if (keys.has('down')) y -= 1;
      run = keys.has('run');
    }
    const out = { x, y, run, jump: jumpQueued, lookDx, lookDy, looking: lookId !== null, stick: stickId !== null };
    jumpQueued = false;
    lookDx = 0; lookDy = 0;
    return out;
  }

  return {
    read,
    pressJump() { if (enabled) jumpQueued = true; },
    setEnabled(v) {
      enabled = v;
      if (!v) { stickId = null; lookId = null; hideStick(); keys.clear(); jumpQueued = false; lookDx = 0; lookDy = 0; }
    },
    /** Test hook: force the stick ({ x, y, run }) or pass null to release it. */
    setOverride(o) { override = o; },
    get active() { return stickId !== null || keys.size > 0 || !!override; },
  };
}
