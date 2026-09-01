# Muntstad

Live: **https://johannes-lab-tw.github.io/muntstad/** (GitHub Pages, branch `main`, folder `/docs`)

A small iPad web game (PWA) for a 6-year-old that teaches one thing through play: money you put to work makes more money, and that money buys fun things. Dutch only, offline-capable, no accounts, no ads, no network calls at runtime.

- **WERK** — wash cars for coins (linear, bounded).
- **WINKEL** — buy coin-makers (Limonadekraam → Flatgebouw) that earn while you play or while the iPad is off, and fun things (hats, pets, scooter, car, garden, fireworks…).
- **HUIS** — the yard: pets, toys, the sticker wall.
- **PAPA** — parent screen behind a 3-second hold + a sum: stats, conversation starters, voice/sound/music toggles, Bewaar-code (export/import), reset.

## Stack

Vanilla HTML/CSS/JS (ES modules), no framework, no bundler, no runtime dependencies. Canvas 2D for the town, DOM for the UI, Web Audio for every sound, `speechSynthesis` with a Dutch voice for the mentor. The only dev dependency is `@playwright/test`.

```
docs/            the deployed site (open with any static server)
  js/config.js   every tunable number (prices, incomes, caps, timings)
  js/economy.js  pure, deterministic economy shared by the game, the tests and the simulator
  js/save.js     versioned localStorage save, migration, Bewaar-code
  js/scene.js    the canvas town
  js/ui/*.js     screens and popups
  sw.js          cache-first service worker (bump CACHE_VERSION on deploy)
tests/unit       node:test (economy, save, speech, config, sw, balance simulation)
tests/e2e        Playwright (3 iPad sizes; Chromium by default, WebKit with WEBKIT=1)
scripts/         serve.js (static server), simulate.js (balance simulator), make-icons.js
screenshots/     e2e screenshot gallery
```

## Commands

```bash
npm test              # unit tests incl. the balance simulation
npm run test:e2e      # Playwright e2e (WEBKIT=1 npm run test:e2e to add WebKit)
npm run serve         # http://127.0.0.1:4173/  (add -- --host 0.0.0.0 for the iPad on the same Wi-Fi)
npm run simulate      # prints the Investor vs Spender table
npm run icons         # renders docs/icons/icon.svg to the PNG icons
BASE_URL=https://johannes-lab-tw.github.io/muntstad/ npm run test:live   # smoke test against the live site
```

Requires Node 20+ (tests use `node --test` with glob patterns).

## The lesson, proven

`npm run simulate` runs a 20-minute session of a child earning ≈ 15 coins/min by working. An Investor (10 minutes of coin-makers, then fun) ends with ≈ 3.7× the coins spent on fun and 2.5× the fun items of a Spender who buys fun whenever affordable, and the Investor's passive income overtakes work income after ≈ 2.8 minutes. The unit tests assert these margins.

## Deploy

GitHub Pages serves `main` + `/docs`. Bump `CACHE_VERSION` in `docs/sw.js`, commit, push. The Dutch report for the parent is in `RAPPORT.md`.
