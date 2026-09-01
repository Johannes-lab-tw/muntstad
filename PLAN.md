# PLAN — Muntstad

Milestones with acceptance criteria drawn from SPEC.md. Order is fixed; M2 starts only when M1's unit tests pass.

## M1 — Economy core (SPEC §3.3, §6, §8 unit)
- `docs/js/config.js`: one frozen object with every tunable number (prices, per-level income tables as integers, upgrade rule, unlock rule, work coins, pet food, offline cap 4 h, popup threshold 60 s, mentor gap 90 s, ≥ 30 LEUK items, milestones).
- `docs/js/economy.js`: pure functions (state + config → new state): createState, advance (timestamp based, capped, offline flag), washCar (work rate = best trailing 60 s window), buyMaker, upgradeMaker, buyFun, equip/toggle, checkMilestones, passivePerMinute, formatCoins (thin space, no abbreviations).
- `docs/js/save.js`: versioned localStorage save, migration chain, corruption → clean reset with a log line, Bewaar-code export/import with checksum.
- `scripts/simulate.js`: Investor vs Spender 20-minute simulation; prints a table.
- Unit tests green: income per tick, upgrade prices 40/80/160/320, unlocks, food auto-pay, never-negative wallet, 4 h cap, migration, corruption, voice selection, balance assertions (≥ 3× fun coins, ≥ 1.5× items, overtake ≤ 4 min, spender never stuck) with margin.

## M2 — Playable skeleton (SPEC §3.2, §6)
- `docs/index.html`, `css/style.css`, `js/main.js`, `js/i18n.js`, `js/ui/*.js`: START (colour + optional name + big skip), STAD with canvas town (road loop, 6–8 plots, house, beach), top bar (coins ≥ 36 px, per minuut), bottom bar WERK · WINKEL · HUIS · PAPA.
- Economy loop from timestamps, autosave every 5 s + pagehide/visibilitychange, coins fly from buildings to the wallet, avatar walks the loop.

## M3 — Mechanics complete (SPEC §2, §3.2–3.4)
- WERK: car with 3–4 dirt spots, tap/swipe, bubbles, +2 per car, KLAAR, tired line after 10 cars once.
- WINKEL: tabs GELDMAKERS / LEUK always visible, paged cards, KOOP, dimmed "nog X 🪙" + progress bar, owned ✓ + AAN/UIT, maker cards with level + income + UPGRADE, lock hint, next-target hint on the tab.
- HUIS: house paint, garden items, pets with idle animation, hat/skin on the avatar, trampoline, fireworks, dance, sticker wall.
- PAPA: hold 3 s + sum gate with keypad, stats (work vs makers, fun vs invested, per minuut, play time), 3 conversation starters, toggles, Bewaar-code, RESET double confirm.
- Popups: offline count-up + TOP!, milestone fanfare + confetti + sticker, not-enough shake + spoken hint.
- Mentor Muntje: bubble + 🔊, tip rate limit 90 s, all lines of SPEC §3.4.

## M4 — PWA, audio, speech, polish (SPEC §5, §6)
- manifest.webmanifest (standalone, landscape, relative URLs, 192 + 512 PNG), apple meta tags, 180 PNG, sw.js cache-first precache with versioned cache, skipWaiting + clients.claim, old caches cleaned; `scripts/make-icons.js`.
- Web Audio synth: blip, chime, ka-ching, fanfare, thud, bubbles, quiet music loop, mute toggle, works muted.
- speech.js: Dutch voice selection (nl-NL > nl > silent), unlock on first gesture, voiceschanged re-query, cancel before speak, rate 0.95.
- Portrait hint, zoom prevention (touch-action + gesture listeners), safe areas, 100dvh, reduced-motion.
- Visual pass with the frontend-design skill against SPEC §5.

## M5 — Verification (SPEC §8)
- Playwright: 3 iPad descriptors × Chromium + WebKit; list + html(open never) reporters; scripts/serve.js on 127.0.0.1.
- Specs: no console errors; full play-through; reload keeps state; simulated absence 1 h and 5 h (cap); real offline via killed server + service worker; manifest/icons reachable; touch-target audit; text-size audit; Dutch-only audit; portrait hint.
- Screenshot gallery in `screenshots/`, reviewed by eye; kid-tester subagent + economy-review subagent; findings fixed; up to 3 loops.

## M6 — Deploy (SPEC §9)
- Public repo `muntstad` via gh, Pages main:/docs via REST, poll live URL to 200, live smoke test in WebKit iPad gen 7, URL in RAPPORT.md + README.md, sw cache version bumped.

## M7 — Report (SPEC §10)
- RAPPORT.md in Dutch (URL + iPad steps, lesson, play per screen, tuning knobs, test results, manual checks, limitations + Volgende versie, how to change things), README.md, final push, console summary starting with the live URL.
