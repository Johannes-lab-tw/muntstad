# Muntstad — CLAUDE.md

At the start of every session and after any context compaction: re-read SPEC.md and PROGRESS.md before continuing.

## The seven rules (SPEC.md §1)
1. Autonomy: no questions, no waiting for input. Decide, log the decision in PROGRESS.md, continue. Do not stop before Phase 7 is complete.
2. Kid safety: no external links, no chat, no text input (only the optional name on START and the PAPA screen), no pressure timers, no random purchases, no dark patterns, no real money. Progress is lost only via the parent-gated, double-confirmed RESET.
3. Dutch only in the game: every visible and spoken string is Dutch, short, jij-vorm. Button labels are single capitalised words (KOOP, WERK, WINKEL, HUIS, STAD, PAPA).
4. Zero runtime dependencies: vanilla HTML/CSS/JS ES modules. No framework, bundler, CDN, web fonts or external images. Dev dependency: @playwright/test only.
5. Original art: inspired by tycoon and Brookhaven-style games; never Roblox trademarks, names, models or assets.
6. Everything works offline after the first load (service worker), on iPad Safari and as a home-screen app; landscape first, portrait shows "Draai je iPad".
7. Ship a finished v1 over an unfinished v2. Cut stretch items and list them under "Volgende versie" in RAPPORT.md.

## Commands
- `npm test`          unit tests with node:test (economy, save, speech, balance simulation)
- `npm run test:e2e`  Playwright, Chromium + WebKit, three iPad sizes, against scripts/serve.js
- `npm run serve`     static server for docs/ on http://127.0.0.1:4173 (`npm run serve -- --host 0.0.0.0` for the iPad on the same Wi-Fi)
- `npm run simulate`  economy balance simulator, prints the Investor vs Spender table
- `npm run icons`     renders docs/icons/icon.svg to the PNG icons with Playwright

## Layout
- docs/ is the deployed site (GitHub Pages: branch main, folder /docs). Every URL is relative.
- docs/js/config.js holds every tunable number. docs/js/economy.js is pure (no DOM) and shared by game, tests and simulator.
- tests/unit (node:test), tests/e2e (Playwright), scripts/ (serve, simulate, make-icons), screenshots/ (committed gallery).

## Conventions
- Commit small and often on main. Bump CACHE_VERSION in docs/sw.js on every deploy.
- Node is a portable install in %USERPROFILE%\.local\node (on the user PATH). In Git Bash: `export PATH="$HOME/.local/node:$PATH"`.
- Displayed numbers are integers with a thin space as thousands separator; never abbreviate.

## Ronde 3: Three.js en de lokale criticus (sinds 2026-09-02)
- PLAN-V3.md is het stappenplan voor de 3D-tekenlaag; lees het na SPEC.md en PROGRESS.md.
- Rule 4 wordt in V3.0 aangepast: Three.js is de enige gevendorde tekenbibliotheek (docs/vendor/, in PRECACHE); geen CDN, geen bundler, devDependency blijft alleen @playwright/test.
- Na elke visuele wijziging: screenshots met `node scripts/dev-shot.mjs --seed rich` en dan de lokale criticus (nul tokens, ~30 s per plaatje):
  `python C:\TW1\lokaal-zoeken\lokaal.py "Je bent art director van een moderne 3D-tycoongame voor kinderen. Noem de 5 grootste redenen waarom dit scherm nog niet als een moderne game oogt, concreet en kort, in het Nederlands." screenshots\chromium-ipad-gen7-stad.png`
  Claude leest de punten en beslist; het lokale model ontwerpt niet.
- Bulkwerk (varianten van gebouwen/props/hoeden op basis van één voorbeeld, testboilerplate) mag ook via lokaal.py met bestanden als invoer; Claude keurt.
