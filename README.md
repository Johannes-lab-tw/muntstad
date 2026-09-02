# Muntstad

Live: **https://johannes-lab-tw.github.io/muntstad/** (GitHub Pages, branch `main`, folder `/docs`)

A small iPad web game (PWA) for a 6-year-old that teaches one thing through play: money you put to work makes more money, and that money buys fun things. Dutch only, offline-capable, no accounts, no ads, no network calls at runtime.

- **WERK** — wash cars in a real 3D wash bay for coins (linear, bounded).
- **WINKEL** — buy coin-makers (Limonadekraam → Flatgebouw) that earn while you play or while the iPad is off, and fun things (hats, pets, scooter, car, garden, fireworks…).
- **HUIS** — the yard: pets that wander, toys, the sticker wall.
- **PAPA** — parent screen behind a 3-second hold + a sum: stats, conversation starters, voice/sound/music toggles, Bewaar-code (export/import), reset.

## Stack

Vanilla HTML/CSS/JS (ES modules), no framework, no bundler, no images or web fonts. The one vendored library is Three.js (`docs/vendor/`, r185): the town, the yard and the wash bay are real 3D scenes with a shadow-casting sun, built at runtime from rounded plastic primitives (`docs/js/3d/build.js`), and the same models render the shop cards, popups and HUD icons as thumbnails. One WebGL renderer serves every screen and steps its quality down on slow iPads. DOM for the UI, Web Audio for every sound, `speechSynthesis` with a Dutch voice for the mentor. The only dev dependency is `@playwright/test`.

```
docs/               the deployed site (open with any static server)
  js/config.js      every tunable number (prices, incomes, caps, timings, shop order)
  js/economy.js     pure, deterministic economy shared by the game, the tests and the simulator
  js/save.js        versioned localStorage save, migration, Bewaar-code
  vendor/           Three.js (module + core, minified)
  js/3d/engine.js   the shared WebGL renderer, lights, fitted camera, adaptive quality
  js/3d/build.js    rounded-plastic geometry builder (one merged mesh per object), text planes, materials
  js/3d/world.js    the island: cushion ground, sea, road, park, scenery, clouds, boats, gulls
  js/3d/buildings.js  5 makers × 5 levels, house, sale boards; avatar.js, props.js, pets.js: the characters and items
  js/3d/scene-stad.js the town scene (STAD + START background); thumbs.js renders any item to an image
  js/ui/*.js        screens and popups (werk = wash bay, huis = yard, winkel = shop, start, papa, mentor, fx)
  sw.js             cache-first service worker (bump CACHE_VERSION on deploy)
tests/unit          node:test (economy, save, speech, config, sw, balance simulation)
tests/e2e           Playwright (3 iPad sizes; Chromium by default, WebKit with WEBKIT=1)
scripts/            serve.js (static server), simulate.js (balance simulator), make-icons.js, dev-shot.mjs
screenshots/        e2e screenshot gallery
```

## Commands

```bash
npm test              # unit tests incl. the balance simulation
npm run test:e2e      # Playwright e2e (WEBKIT=1 npm run test:e2e to add WebKit)
npm run serve         # http://127.0.0.1:4173/  (add -- --host 0.0.0.0 for the iPad on the same Wi-Fi)
npm run simulate      # prints the Investor vs Spender table
npm run icons         # renders docs/icons/icon.svg to the PNG icons
node scripts/dev-shot.mjs --seed rich   # screenshots of every screen with a seeded save (server must be running)
BASE_URL=https://johannes-lab-tw.github.io/muntstad/ npm run test:live   # smoke test against the live site
```

Requires Node 20+ (tests use `node --test` with glob patterns).

## Art direction in one paragraph

One light from the upper left, three lit faces per block (top brightest, left lit, right in shadow), a ground shadow under everything, saturated plastic colours, thick ink edges on the UI and outlined game type. Add a building by writing a block function in `docs/js/art/buildings.js`; add a fun item by adding a config entry and a small draw function in `props.js`/`pets.js`/`avatar.js` — the shop card, the sign and the yard pick it up through `sprites.js`.

## The lesson, proven

`npm run simulate` runs a 20-minute session of a child earning ≈ 15 coins/min by working. An Investor (10 minutes of coin-makers, then fun) ends with ≈ 3.7× the coins spent on fun and 2.5× the fun items of a Spender who buys fun whenever affordable, and the Investor's passive income overtakes work income after ≈ 2.8 minutes. The unit tests assert these margins.

## Deploy

GitHub Pages serves `main` + `/docs`. Bump `CACHE_VERSION` in `docs/sw.js`, commit, push. The Dutch report for the parent is in `RAPPORT.md`.
