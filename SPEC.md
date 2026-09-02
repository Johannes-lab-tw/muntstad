# SPEC — "Muntstad": an iPad web game that teaches a 6-year-old to make money work for him

> You are Claude Code, running **fully autonomously**. This file is the complete brief. Read it top to bottom before doing anything. Then execute it end-to-end: plan, build, test, deploy, report. **Never stop to ask a question.** Every decision you might want to ask about is pre-decided in section 11; if something is still open, choose the simplest option that serves a 6-year-old and log the decision in `PROGRESS.md`.

The child's name is never part of this repository: it is entered (optionally) on the START screen and lives only in the device's localStorage. If no name is entered, the mentor says "kapitein".

---

## 0. Mission

Build **Muntstad** (working title — keep it unless you find a clearly better short Dutch name): a bright, blocky, Roblox-flavoured town game for an iPad, played by a **6-year-old Dutch boy** who **reads short words** and loves **Brookhaven-style roleplay** (house, car, jobs, town) and **tycoon games** (buy things that produce money, expand).

The game exists to teach **one lesson** through play, not through text:

> **Money you put to work makes more money — and that money buys you fun things.**

What the child should *feel* after playing: working with your hands earns coins slowly; a coin-maker (a small business you buy) earns coins **while you play or even while the iPad is off**; the kid who buys coin-makers first ends up with **more** hats, pets and cars than the kid who spends everything at once — and buying fun things is the whole point, not a sin.

What the game must **not** teach: hoarding/saving as a goal in itself, or spending on things that give nothing back as the "smart" move. Investing is the hero; fun is the reward; costs are simply something your coin-makers pay for you.

The product is a **web app (PWA)** hosted on **GitHub Pages**, added to the iPad home screen, fully **offline-capable**, **Dutch only**, **no accounts, no ads, no in-app purchases, no network calls at runtime, no data collection**.

---

## 1. Non-negotiable rules

1. **Autonomy.** No questions, no waiting for input, no "let me know if…", no "shall I continue?". Decide, log, continue. **Do not end your turn until Phase 7 is complete and the final summary is printed** — ending early counts as failure. If a step is impossible (e.g. `gh` not authenticated), finish everything else, write precise manual steps in `RAPPORT.md`, and continue.
2. **Kid safety.** No external links, no chat, no text input except an optional name on START, no timers that pressure, no randomised purchases (no loot boxes, no eggs with random pets), no dark patterns, no real-money anything. Nothing can be lost permanently except by a parent-gated reset. (The PAPA screen is exempt from the no-text-input rule: an on-screen digit keypad for the gate sum and one text field for the Bewaar-code.)
3. **Dutch only in the game.** Every visible string and every spoken line is Dutch, short, and friendly (jij/je, no formal u). Button labels are single short words in capitals where possible (KOOP, WERK, WINKEL, HUIS, STAD, PAPA). Longer sentences are spoken by the mentor and shown as a speech bubble.
4. **Zero runtime dependencies.** Vanilla HTML/CSS/JS (ES modules), no framework, no bundler, no CDN, no web fonts, no image assets you cannot generate yourself (SVG/CSS/emoji/canvas are fine). Dev dependency allowed: `@playwright/test` only.
5. **Original art.** Inspired by tycoon and Brookhaven-style games; never use Roblox trademarks, logos, character models, names or assets.
6. **Everything must work offline** after first load (service worker), on iPad Safari and as a home-screen app, in landscape first (portrait must not break, it may show "Draai je iPad").
7. **Ship a finished v1** over an unfinished v2. If any stretch item threatens completion, cut it and list it under "Volgende versie" in `RAPPORT.md`.

---

## 2. Learning goals → mechanics (this mapping is the heart of the design)

| Learning goal | Mechanic that carries it | Moment the child notices |
|---|---|---|
| Money comes from work, and hands get tired | **WERK**: a short, fun tap mini-game (washing cars) pays a few coins per car. Linear, bounded, deliberately slow-ish. | First minute. Mentor: "Werken geeft munten. Maar je handen worden moe…" |
| Money can work for you | **GELDMAKERS**: small businesses you buy that produce coins automatically, visibly (coins pop out and fly to the wallet), even when you do nothing. | First purchase. Mentor: "Kijk! Je kraam maakt munten. Ook als jij niks doet!" |
| More coin-makers → more coins → even more coin-makers (compounding) | Upgrades and new, better coin-makers unlock as total earnings grow. "Per minuut" meter always visible. | Milestone: passive income overtakes work income. Definition for the live game: *work rate* = the child's best coins-per-minute over any 60-second WERK window so far (requires at least one WERK session); the milestone fires the first time passive income per minute exceeds it. Big celebration: "Je geld werkt nu harder dan jij!" |
| Money keeps working while you're away | **Offline earnings**: on return, a popup counts up what your coin-makers earned while the iPad was off (capped at 4 hours). | Every return to the game — the strongest "aha". |
| Money covers costs | One gentle recurring cost: your pet needs food. Coin-makers pay it automatically; a small "−5 🍖" ticks by and the mentor occasionally notes "Je wasstraat betaalt het eten van je hond." Running out never punishes: the pet just sleeps until you have coins again. | After the first pet. |
| Fun is what money is *for* | **LEUK** shop: hats, skins, pets (fixed price, always visible — no randomness), scooter, car (also faster travel), house paint, garden, fireworks, dance moves. Instant joy animations. Never blocked, never nagged. | Every fun purchase. Mentor: "Gave hoed! Leuk hè, wat je met munten kunt doen?" |
| Choices have consequences, mistakes are fine | The shop always shows both tabs side by side, so every purchase is a visible trade-off. If the child spends everything on fun, nothing bad happens — WERK is always there, and the coin-maker tab quietly shows the price you're saving towards. No rescue, no lecture. | Whenever the wallet hits zero. |

Balance rule that encodes the lesson (you will prove it with a simulation test, section 8): over a 20-minute simulated session, a player who invests for the first 10 minutes and *then* spends on fun must end up having spent **at least 3×** the coins on fun things, and owning **at least 1.5×** the distinct fun items, of a player who buys fun whenever affordable for all 20 minutes — and the investor's passive income must overtake work income within **4 minutes**. (Reference: with the starting numbers of section 3.3 and a 15 coins/min child, a simple simulation gives ≈ 3.6× coins spent on fun, 2× items, overtake at ≈ 2.8 min — so the assertions are achievable; if yours deviates a lot, check your work-rate model before touching prices.)

---

## 3. Game design

### 3.1 World & theme
A small, sunny, blocky island town ("Muntstad") seen slightly from above: a road loop, 6–8 building plots, the child's house, a beach corner. A blocky avatar (cube head, block body, big friendly eyes) lives here. Buildings appear on plots when bought and get visibly fancier per upgrade level. Coins spawn from working buildings and fly to the wallet in the top bar.

### 3.2 Screens (keep it to these)
1. **START** — first run only: pick avatar colour + optional name (skip button is big). Returning: "Verder spelen" with the avatar waving. Tapping anything here also unlocks audio/speech (iOS needs a user gesture).
2. **STAD** (home screen) — the town. Top bar: 🪙 coins (big), "+X per minuut" (medium). Bottom bar: WERK · WINKEL · HUIS · PAPA (small, bottom-right, parent gate). Tap a building → its card (level, income per minute, UPGRADE button with price).
3. **WERK** — mini-game "Auto's wassen": a blocky car rolls in with 3–4 dirt spots; tap/swipe them away; soap bubbles; the car drives off shiny; +2 coins per car (tune). Bounded: no combo multipliers that make work outpace coin-makers. A big "KLAAR" button returns to STAD. The mentor's "hands get tired" line triggers after ~10 cars, once.
4. **WINKEL** — two tabs, both always visible: **GELDMAKERS 🏭** (coin-makers + upgrades) and **LEUK 🎉** (cosmetics, pets, vehicles, house items). Large cards: icon, name (one or two short words), price with 🪙, KOOP button. Unaffordable cards stay visible, slightly dimmed, showing "nog 12 🪙" and a tiny progress bar. Owned fun items show a ✓ and can be equipped/toggled.
5. **HUIS** — the child's house and yard: place/equip bought decorations, see the pet, play the trampoline/fireworks/dance you own. Pure joy screen; nothing to learn here except that fun exists.
6. **PAPA** — parent screen behind a gate (hold 3 seconds on the button, then answer a sum a 6-year-old can't do yet, e.g. 37 + 48). Shows: coins earned by WERK vs by GELDMAKERS, spent on LEUK vs invested in GELDMAKERS, current income per minute, play time; three conversation starters in Dutch (e.g. "Wat werkt harder: jij of je wasstraat?"); toggles for voice/sound/music; RESET (double-confirm).
7. **Popups** — offline earnings on return (count-up animation, one big "TOP!" button), milestone celebrations, "not enough coins" shake with a spoken "Nog 12 munten. Je kraam is er bijna!".

### 3.3 Economy (starting values — tune with the simulator in section 8, keep the shape)
Tick every second; display "per minuut". Displayed numbers are integers; no decimals, no "K"/"M" abbreviations ever; group thousands with a thin space. Internally the wallet may accumulate fractions; every price and every per-level income in `config.js` is an integer table (per-level income ≈ base × 1 / 1.5 / 2.25 / 3.4 / 5, rounded — e.g. Limonadekraam 12 / 18 / 27 / 41 / 61 per minute).

Coin-makers (one of each type, upgradeable to level 5; upgrade price doubles per level; next type unlocks when total earned reaches roughly its price):

| Coin-maker | Icon | Price | Income / min at level 1 | Payback |
|---|---|---|---|---|
| Limonadekraam | 🍋 | 20 | 12 | ~1.7 min |
| Wasstraat | 🚿🚗 | 120 | 50 | ~2.4 min |
| Pizzeria | 🍕 | 400 | 150 | ~2.7 min |
| Speelgoedfabriek | 🤖 | 2 000 | 600 | ~3.3 min |
| Flatgebouw (huur) | 🏢 | 10 000 | 2 500 | ~4 min |

Upgrade price for level *n* → *n+1* = base price × 2ⁿ⁻¹ × 2 (so Limonadekraam: 40, 80, 160, 320); unlock of the next type when total coins earned ≥ its price.

Work: ~2 coins per washed car, one car every ~4 s of active play → ≈ 30 coins/min ceiling when playing perfectly; a realistic child manages ~15–20/min. This makes the Limonadekraam affordable after about a minute of work, a level-2 Limonadekraam already out-earns work, and the Wasstraat alone out-earns even perfect work from level 1.

Upgrades are deliberately weaker investments than the next coin-maker (payback grows per level), so the natural path is "new coin-maker when unlocked, upgrades in between". Keep that shape when tuning.

LEUK catalogue: at least 30 distinct items so no strategy runs out of things to buy during the simulation.

Offline earnings: same rates, based on the elapsed wall-clock time since the last save, capped at 4 hours per absence, applied on load and on `visibilitychange` → visible. If elapsed ≥ 60 s, show the popup.

Costs: pet food 5 coins every 2 minutes per pet, auto-paid from the wallet when possible. Never negative balances. No other costs in v1.

LEUK shop (fixed prices, all visible from the start): hats 15–60 · skins 40–80 · scooter 150 · car 500 (also makes the avatar drive around town) · house paint 100 · garden items 30–120 · pet (dog, cat, dino; fixed price 80–200, each has an idle animation) · fireworks 30 (one-time show) · dance move 50 · trampoline 300 (interactive on HUIS).

Milestones (each: fanfare + confetti + a **sticker** for the sticker wall on HUIS — stickers are rewards, not catalogue items, and are excluded from the balance simulation): first coin-maker · passive income > work income · 1 000 coins earned in total · all 5 coin-makers · first level-5 coin-maker · 100 000 coins earned in total.

### 3.4 Mentor
"Muntje", a friendly talking coin with a face. Speaks short Dutch lines (spoken via speech synthesis and shown in a bubble), maximum one unsolicited line per 90 seconds, never lectures, never says "nee". Teachable-moment lines (use these; add a few in the same voice):

- Start: "Hoi {naam}! Ik ben Muntje. Kom, we gaan munten maken!"
- After ~10 cars: "Goed gedaan! Werken geeft munten. Maar je handen worden moe… Wil je iets dat munten maakt terwijl jij speelt?"
- First coin-maker: "Kijk! Je kraam maakt munten. Ook als jij niks doet!"
- Passive > work: "Wauw! Je geldmakers verdienen nu meer dan jij. Je geld werkt voor jou!"
- Return: "Terwijl je weg was, maakten je geldmakers {n} munten!"
- Fun purchase: "Gave hoed! Leuk hè, wat je met munten kunt doen?"
- Not enough: "Nog {n} munten. Bijna!"
- Pet food paid: "Je wasstraat betaalt het eten van je hond. Handig!"
- Wallet at zero after fun spree (once, kindly): "Op is op! Ga je werken, of wacht je op je geldmakers?"

---

## 4. Kid-UX rules (test these, section 8)

- Touch targets ≥ 64×64 CSS px (primary buttons ≥ 80 px tall), ≥ 12 px apart, no overlaps at any supported viewport.
- Visible text ≥ 20 px; button labels ≥ 24 px; coin count ≥ 36 px. High contrast. Rounded, chunky, friendly system font stack (no web fonts).
- Single tap only. No double-tap, no long-press for child actions, no drag-to-scroll lists if avoidable (use paged cards with big arrows). Long-press is reserved for the parent gate.
- Icons + numbers carry meaning; words confirm. Every mentor line has a 🔊 button to hear it again.
- No pinch zoom, no text selection, no long-press callout, no rubber-band overscroll, no 300 ms tap delay. iOS ignores `user-scalable=no`, so: `touch-action: none` on the game root (with `touch-action: manipulation` on UI controls) plus non-passive `gesturestart`/`gesturechange` listeners that call `preventDefault()`.
- Feedback for every tap within 100 ms (scale bounce + sound). Errors are gentle (shake + spoken hint), never modal walls of text.
- Sessions of 5–15 minutes are complete experiences; nothing requires waiting in real time to be fun.
- Motion: bouncy, joyful, ≤ 400 ms; respect `prefers-reduced-motion` by shortening, not removing feedback.

---

## 5. Visual & audio direction

- **Look:** blocky "toy town" — cube-headed avatars, chunky buildings with thick outlines and soft drop shadows, saturated candy palette on a fresh green island with a blue sea edge. Big rounded UI panels with a dark outline and white inner glow. Emoji are fine as icons inside UI cards (iPad renders them well), but the town, avatar and buildings should be your own SVG/CSS/canvas art.
- **Motion:** coins arc from buildings to the wallet with a little pop; buildings bounce when upgraded; confetti on milestones; avatar idles (blink, bob) and walks/drives the road loop.
- **Sound:** all synthesised with the Web Audio API (no audio files): coin blip, buy chime (major arpeggio), upgrade "ka-ching", milestone fanfare, soft "not yet" thud, bubbles for the car wash. A simple, quiet generated music loop with a mute toggle. Everything works when muted.
- **Speech:** `speechSynthesis` with a voice whose `lang` starts with `nl` (prefer `nl-NL`), rate ≈ 0.95. Unlock on the first user gesture (speak an empty utterance in the tap handler — iOS blocks speech that is not initiated by a gesture). Re-query `getVoices()` on `voiceschanged` (voices load asynchronously on iOS). Cancel any running utterance before speaking a new one. If **no Dutch voice** exists, show the bubble text only — never read Dutch with a non-Dutch voice. The game must be 100 % playable with speech and sound off.
- **Use the `frontend-design` skill (if it is installed) for the visual pass** in Phase 4. If it is not installed, do the pass yourself against this section.

---

## 6. Technical specification

**Repository layout** (game lives in `docs/` so GitHub Pages can serve `main` + `/docs`; tests and scripts stay out of the served site):

```
docs/                       ← the deployed site (open with any static server)
  index.html
  manifest.webmanifest
  sw.js                     ← service worker, relative scope "./"
  icons/                    ← icon-180.png, icon-192.png, icon-512.png (+ svg source)
  css/style.css
  js/config.js              ← ALL tunable numbers (prices, incomes, caps, texts timing)
  js/economy.js             ← pure, deterministic, no DOM; exported functions
  js/save.js                ← localStorage, versioned, migration, corruption-safe
  js/audio.js               ← Web Audio synth
  js/speech.js              ← speechSynthesis wrapper (Dutch voice selection, unlock)
  js/i18n.js                ← every Dutch string in one place
  js/scene.js               ← town rendering (canvas 2D or SVG — your call, keep it smooth)
  js/ui/*.js                ← screens and popups
  js/main.js
tests/unit/*.test.js        ← node:test, run with `node --test`
tests/e2e/*.spec.js         ← Playwright
scripts/serve.js            ← zero-dependency static server for docs/ (used by tests)
scripts/simulate.js         ← economy balance simulator (also used by a unit test)
scripts/make-icons.js       ← renders the SVG icon to PNGs with Playwright screenshots
playwright.config.js
package.json                ← devDependency: @playwright/test only; scripts: test, test:e2e, serve, icons, simulate
CLAUDE.md · PROGRESS.md · PLAN.md · RAPPORT.md · README.md · .gitignore
screenshots/                ← e2e screenshot gallery (committed; small PNGs)
```

**PWA / iOS specifics**
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon` (PNG 180 — iOS ignores SVG here), `theme-color`. Zoom prevention is done in CSS/JS as described in section 4, not via the viewport meta.
- Manifest: `display: "standalone"`, `orientation: "landscape"`, `start_url: "./"`, `scope: "./"`, background/theme colours, 192 + 512 PNG icons. **All URLs relative** — the site is served from `https://<user>.github.io/<repo>/`, never assume root.
- Service worker: cache-first app shell with a versioned cache name, precache every file in `docs/`, `skipWaiting` + `clients.claim`, clean old caches on activate. Bump the version string on every deploy.
- Layout with `100dvh`, safe-area insets, `overscroll-behavior: none`, `-webkit-touch-callout: none`, `user-select: none`, `touch-action: manipulation`.
- Home-screen web apps on iOS are exempt from Safari's 7-day script-storage eviction, but Safari-tab play is not: therefore autosave often and also offer "Bewaar-code" export/import on the PAPA screen (a short text code that restores progress) as a safety net.

**Simulation & saving**
- The economy advances from timestamps, never from accumulated `setInterval` ticks: store `lastTick`; each frame/second apply `elapsed = now − lastTick` (iOS suspends timers in the background — this is what makes offline earnings and background returns correct).
- Save to `localStorage` under a versioned key every 5 s and on `pagehide`/`visibilitychange`. Corrupted or older-version saves migrate or reset gracefully with a log line — never a blank screen.
- `config.js` exports one object; `economy.js` takes state + config and returns new state (pure), so tests and the simulator share the exact production logic.

**Performance budget:** 60 fps on an iPad from ~2019 (iPad gen 7 class); ≤ 30 live particles; no growing DOM; total site ≤ 1,5 MB (raised from 1 MB on 2026-09-02 for the vendored Three.js, 751 KB minified; gzipped over the wire it is ~200 KB); first load ≤ 1 s on a local server.

**Rendering (since v3, 2026-09-02):** the town, yard and wash bay are real 3D with Three.js, vendored as `docs/vendor/three.module.min.js` + `three.core.min.js` and precached by the service worker. No CDN, no bundler, no other library. The look is a smooth rounded-plastic toy world (Brookhaven / tycoon style), not voxel cubes.

---

## 7. Process (phases with checkpoints)

**Phase 0 — bootstrap (do this first, before any planning):**
1. Create `CLAUDE.md` (≤ 40 lines): the seven rules of section 1, the commands (`npm test`, `npm run test:e2e`, `npm run serve`, `npm run simulate`), and the instruction "At the start of every session and after any context compaction: re-read SPEC.md and PROGRESS.md before continuing."
2. Create `PROGRESS.md` with a milestone checklist and a decision log. Update it after every milestone (done / next / known issues) so `claude --continue` can resume from it.
3. `git init -b main` (the branch must be `main`; if the repo somehow ends up on another branch, `git branch -M main`), `.gitignore` (`node_modules/`, `test-results/`, `playwright-report/`), first commit. If git reports "Author identity unknown", set a repo-local `user.name`/`user.email` (e.g. "Muntstad builder" / "muntstad@example.com") — never invent the father's identity.
4. Check the toolbox and log the result: `node -v`, `npm -v`, `git --version`, `gh --version`, `gh auth status`. Note which skills/plugins are available (`frontend-design`, `webapp-testing`, Playwright MCP). Never wait for any of them. If a `superpowers` plugin is active, ignore its brainstorming workflow: this spec is final.

**Phase 1 — plan:** write `PLAN.md`: milestones M1–M7 with acceptance criteria drawn from this spec. No brainstorming questions — this spec is the brainstorm output.

**Phase 2 — economy core (TDD):** `config.js`, `economy.js`, `save.js`, `scripts/simulate.js`, unit tests including the balance assertions of section 8. Tune numbers until the assertions pass with margin. Commit.

**Phase 3 — playable game:** screens, town scene, WERK mini-game, WINKEL, HUIS, PAPA, popups, mentor, milestones, offline earnings. Commit per screen.

**Phase 4 — PWA, audio, speech, visual polish:** manifest, service worker, icons (via `scripts/make-icons.js`), Web Audio, speech wrapper, then the visual pass (frontend-design skill if present). Commit.

**Phase 5 — verification loop (section 8):** run everything; look at every screenshot yourself; fix; repeat up to 3 times. Use a **fresh subagent as "kid-tester"** with the kid-UX rules of section 4 and the screenshots, and a second subagent to review the economy against section 2; act on their findings. Commit.

**Phase 6 — deploy (section 9)** and verify the live URL. Commit + push.

**Phase 7 — report (section 10):** `RAPPORT.md` in Dutch, final commit + push, final console summary with the live URL.

Work in this order; do not start Phase 3 before the unit tests of Phase 2 pass. Commit small and often with clear messages.

---

## 8. Verification (all automated, all must pass before Phase 6)

**Unit (`node --test`)**
- Economy math: income per tick, upgrades, unlocks, cost auto-payment, never-negative wallet, offline cap of 4 h, save migration from an older version, corrupted save → clean reset.
- **Balance simulation (the lesson, proven):** simulate a 20-minute session of a realistic child (≈ 15 coins/min from WERK, pet food costs included once a pet is owned) under two strategies — *Investor* (minutes 0–10: whenever affordable, buy the unlocked coin-maker or upgrade with the shortest payback = price ÷ income gain; minutes 10–20: buy the cheapest not-yet-owned LEUK item whenever affordable) and *Spender* (all 20 minutes: buy the cheapest not-yet-owned LEUK item whenever affordable). Assert: Investor's coins spent on LEUK by minute 20 ≥ 3 × Spender's; Investor's distinct fun items ≥ 1.5 × Spender's; Investor's passive income overtakes work income within 4 minutes; Spender is never stuck (WERK always progresses, wallet never negative). Print a small table of both runs (coins earned, passive income, fun items) and include it in `RAPPORT.md`.
- If a `webapp-testing` skill is available you may use it for the browser tests; the Playwright setup below is the baseline and must exist regardless.

**End-to-end (Playwright, `@playwright/test`)**
- Install with `npm i -D @playwright/test` then `npx playwright install chromium webkit` (WebKit ≈ Safari; if WebKit fails to install on this machine, run Chromium only and record that in `RAPPORT.md`).
- Serve `docs/` with `scripts/serve.js` bound to `127.0.0.1`; projects for these built-in device descriptors: `iPad (gen 7) landscape` (1080×810), `iPad Mini landscape` (1024×768), `iPad Pro 11 landscape` (1194×834); run each in Chromium and WebKit. The descriptors default to WebKit, so the Chromium projects must set `browserName: 'chromium'` explicitly.
- `playwright.config.js`: `reporter: [['list'], ['html', { open: 'never' }]]` — the default HTML reporter opens a server that waits for Ctrl+C and would block the run.
- Tests: no console errors or unhandled rejections on any screen · full play-through (start → WERK earns ≥ 20 → buy Limonadekraam → wallet increases without input → buy a hat → HUIS shows it → PAPA gate works) · reload keeps state · simulated absence (set `lastTick` 1 h back in localStorage, reload → offline popup with 1 h of income; then 5 h back → exactly the 4 h cap) · **real offline test**: wait for `navigator.serviceWorker.ready`, then stop the static server (or point the context at a closed port) and reload — the game must still load from the service-worker cache (`context.setOffline(true)` alone does not cut off service-worker fetches in Chromium, so it is only an extra) · manifest and icons reachable · **touch-target audit** (every `button`/`[role=button]` ≥ 64×64 px, none overlapping) · **text-size audit** (all visible text ≥ 20 px) · **Dutch-only audit** (DOM contains no English UI words such as Buy/Shop/Work/Settings/Continue/Back/Play) · portrait viewport shows the rotate hint without crashing.
- Screenshot every screen on every device into `screenshots/`, then **open and inspect each screenshot yourself** (you can read images): fix any overlap, clipping, unreadable text or dull layout. This is the step that catches what tests do not.
- Speech and Web Audio cannot be judged headlessly: unit-test the voice-selection logic (prefers `nl-NL`, falls back to any `nl`, otherwise silent) and list "check voice on the iPad" under manual checks in `RAPPORT.md`.

**Definition of done** — all unit + e2e tests green in Chromium (and WebKit if installed) · screenshot gallery reviewed · balance assertions pass · Lighthouse-style basics: PWA installable (manifest + SW + icons) · live URL responds 200 and passes the smoke test · `RAPPORT.md` written.

---

## 9. Deployment to GitHub Pages

1. `gh auth status` must be OK (if not: skip to step 6 and document).
2. Create a **public** repo named `muntstad` (or the final game name) from this folder: `gh repo create <name> --public --source=. --push`.
3. Enable Pages for branch `main`, folder `/docs`. Use the REST endpoint `POST /repos/{owner}/{repo}/pages` through `gh api` with a JSON body (`{"source":{"branch":"main","path":"/docs"}}`) — verify the exact body against the current GitHub REST docs before calling; if the API call fails, print the exact manual steps (Settings → Pages → Deploy from branch → main → /docs) in `RAPPORT.md` and continue.
4. Read the site URL back (`gh api repos/{owner}/{repo}/pages` → `html_url`), wait for it to serve 200 (poll up to ~5 minutes), then run the Playwright smoke test against the live URL in WebKit with the `iPad (gen 7) landscape` descriptor.
5. Put the URL at the top of `RAPPORT.md` and `README.md`, bump the service-worker cache version, commit, push.
6. Fallback if anything above is blocked: the game must still be playable from the iPad on the same Wi-Fi via `npm run serve -- --host 0.0.0.0` (plain http: online-only Safari play, no home-screen app, no offline — Windows will show a firewall prompt once); document that path honestly as a stopgap, with the manual GitHub Pages steps as the real fix.

---

## 10. Deliverables & final report

`RAPPORT.md` (Dutch, for the father — plain language, short):
1. Live URL + the three steps to put it on the iPad (Safari → Deel-knop → "Zet op beginscherm").
2. What the game teaches and how (one paragraph, the table of section 2 in short).
3. How to play, per screen, in five lines.
4. Tuning knobs: which numbers in `config.js` do what, with safe ranges.
5. Test results: what ran, on which browsers/devices, screenshot gallery links.
6. Manual checks for the iPad (voice, sound with the mute switch, home-screen install, offline).
7. Known limitations and the "Volgende versie" list (everything you cut).
8. How to change things later: open Claude Code in this folder and ask; `claude --continue` resumes the session.

Also: `README.md` (short, English, developer-facing), the committed `screenshots/` gallery, and a final console summary that starts with the live URL.

---

## 11. Pre-decided answers (do not ask — apply)

| If you wonder… | Do this |
|---|---|
| Name of the game | "Muntstad" unless a clearly better short Dutch name appears; never ask. |
| Framework, TypeScript, bundler | None. Vanilla ES modules, JSDoc types if you want them. |
| Canvas vs SVG for the town | Your call; canvas 2D for the scene + particles, DOM for UI is the safe default. |
| `gh` missing or not logged in | Build, test, write manual deploy steps, continue. |
| WebKit will not install | Chromium only; note it in the report. |
| No Dutch voice available in tests | Cannot be tested headlessly; keep the fallback logic unit-tested and list a manual check. |
| A feature is ambiguous | Pick the simplest version a 6-year-old understands; log it in PROGRESS.md. |
| Something takes too long | Cut it, note it under "Volgende versie", ship v1. |
| Numbers get large | Stay integer, thin-space thousands, never abbreviate; the economy is designed to stay under 1 000 000 in normal play. |
| A skill or plugin you expected is missing | Proceed without it. Skills are accelerators, not requirements. |
| Should the child ever lose progress? | Only via the parent-gated RESET, double-confirmed. |
| Should WERK become more lucrative with upgrades? | No. Work stays linear; only coin-makers compound. That asymmetry *is* the lesson. |

Begin with Phase 0 now.
