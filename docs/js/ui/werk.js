// werk.js — "Auto's wassen": a blocky car rolls in with 3–4 dirt spots; tap or swipe them away; +2 coins per car.
// Work is linear and bounded: a new car never comes sooner than minCycleMs after the previous one.
import { carSVG } from '../art.js';
import { startWork, endWork, washCar, setFlag } from '../economy.js';

const CAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#f472b6', '#14b8a6'];

export function createWerk(game) {
  const stage = document.getElementById('werk-stage');
  const car = document.getElementById('werk-car');
  const countEl = document.getElementById('werk-count');
  const klaar = document.getElementById('btn-klaar');
  let dirtLeft = 0;
  let ready = false;
  let visible = false;
  let carIndex = 0;
  let sessionCars = 0;
  let carShownAt = 0;
  let timers = [];

  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }
  function clearTimers() {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }

  function randomInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function newCar() {
    if (!visible) return;
    clearSpots();
    carIndex++;
    car.innerHTML = carSVG(CAR_COLORS[carIndex % CAR_COLORS.length]);
    const n = randomInt(game.config.work.dirtMin, game.config.work.dirtMax);
    // slots are at least 110 px apart on a 620 px car and stay off the wheels, so spots never merge
    const slots = [[26, 36], [50, 36], [74, 36], [38, 66], [62, 66], [12, 58], [88, 58]];
    // pick n distinct slots
    const chosen = slots.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const [x, y] of chosen) {
      const d = document.createElement('div');
      d.className = 'dirt';
      d.style.left = `${x + (Math.random() - 0.5) * 3}%`;
      d.style.top = `${y + (Math.random() - 0.5) * 3}%`;
      car.appendChild(d);
    }
    dirtLeft = n;
    ready = false;
    car.className = 'werk-car in';
    carShownAt = performance.now();
    later(() => { ready = true; }, game.config.work.carArriveMs);
  }

  function clearSpots() {
    for (const d of car.querySelectorAll('.dirt, .bubble-fx, .sparkle-fx')) d.remove();
  }

  function bubbles(x, y) {
    const rect = car.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const b = document.createElement('span');
      b.className = 'bubble-fx';
      b.style.left = `${x - rect.left - 13}px`;
      b.style.top = `${y - rect.top - 13}px`;
      b.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
      b.style.setProperty('--dy', `${-40 - Math.random() * 90}px`);
      car.appendChild(b);
      later(() => b.remove(), 800);
    }
  }

  function clean(spot, x, y) {
    if (!ready || spot.classList.contains('gone')) return;
    spot.classList.add('gone');
    dirtLeft--;
    game.audio.play('bubble');
    bubbles(x, y);
    later(() => spot.remove(), 300);
    if (dirtLeft <= 0) carDone();
  }

  function carDone() {
    ready = false;
    game.audio.play('sparkle');
    const rect = car.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle-fx';
      s.textContent = '✨';
      s.style.left = `${20 + i * 30}%`;
      s.style.top = `${20 + (i % 2) * 30}%`;
      car.appendChild(s);
      later(() => s.remove(), 700);
    }
    sessionCars++;
    countEl.textContent = `🚗 ${sessionCars}`;
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
    game.update((s) => washCar(s, game.config, game.now()));
    game.audio.play('coin');
    game.fx.flyCoins(rect.left + rect.width * 0.5, rect.top + rect.height * 0.4, 2);
    const st = game.state;
    if (st.carsWashed >= game.config.work.tiredAfterCars && !st.flags.tiredSaid) {
      game.update((s) => setFlag(s, 'tiredSaid', true));
      later(() => game.mentor.say('lines.tired', {}, { kind: 'reaction' }), 400);
    }
    later(() => {
      car.className = 'werk-car out';
      game.audio.play('whoosh');
      const elapsed = performance.now() - carShownAt;
      const wait = Math.max(game.config.work.carLeaveMs, game.config.work.minCycleMs - elapsed);
      later(newCar, wait);
    }, 450);
  }

  function hitAt(x, y) {
    const target = document.elementFromPoint(x, y);
    if (target && target.classList && target.classList.contains('dirt')) clean(target, x, y);
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    hitAt(e.clientX, e.clientY);
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    hitAt(e.clientX, e.clientY);
  });

  klaar.addEventListener('click', () => {
    game.audio.play('tap');
    game.show('stad');
  });

  return {
    show() {
      visible = true;
      sessionCars = 0;
      countEl.textContent = '🚗 0';
      game.update((s) => startWork(s, game.now()));
      newCar();
      if (!game.state.flags.workIntro) {
        game.update((s) => setFlag(s, 'workIntro', true));
        later(() => game.mentor.say('lines.firstWork', {}, { kind: 'reaction' }), 500);
      }
    },
    hide() {
      visible = false;
      clearTimers();
      clearSpots();
      car.className = 'werk-car';
      game.update((s) => endWork(s));
      game.save();
    },
    render() {},
  };
}
