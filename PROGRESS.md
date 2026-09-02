# PROGRESS — Muntstad

Resume rule: re-read SPEC.md, then this file. Continue at the first unchecked milestone. Update this file after every milestone.

## Milestones
- [x] Phase 0 — bootstrap: CLAUDE.md, PROGRESS.md, git init on main, toolbox check
- [x] Phase 1 — PLAN.md (M1–M7 with acceptance criteria)
- [x] Phase 2 — economy core (config.js, economy.js, save.js), simulator, unit tests incl. balance assertions (43 tests green; 3.68× / 2.5× / 2.8 min)
- [x] Phase 3 — playable game: all screens, canvas town, WERK, WINKEL, HUIS, PAPA gate + screen, popups, mentor, milestones, offline earnings
- [x] Phase 4 — PWA (manifest, sw.js precache verified by a unit test, icons via make-icons), Web Audio synth + music loop, speech wrapper, visual pass (static scenery layer, decorations, yard)
- [x] Phase 5 — verification loop: 51 unit tests green; e2e green on Chromium × 3 iPads (45 tests); screenshots reviewed; kid-tester (12 findings) and economy-review (8 findings) subagents ran, all findings applied
- [x] Phase 6 — deployed: public repo https://github.com/Johannes-lab-tw/muntstad, Pages main:/docs, live https://johannes-lab-tw.github.io/muntstad/ (sw cache v2), live smoke test green (Chromium, iPad gen 7 profile; WebKit blocked on this PC)
- [x] Phase 7 — RAPPORT.md (Dutch), README.md, screenshots committed, final push, console summary printed

## Run 2 (2026-09-02) — beoordeling + vormgeving 10× omhoog
Opdracht van Johannes: beoordeel wat er staat (werking, functionaliteit, wat is overgeslagen) en til de vormgeving van "10 jaar oud" naar het niveau van een moderne blokkerige tycoon-game. Daarna autonoom afmaken.

- [x] R2.1 — multi-agent beoordeling (7 dimensies: spec-gaten, bugs, kind-UX, vormgeving, economie, PWA/iOS, tests; elke bevinding adversarieel getoetst) → uitkomst in RAPPORT.md §Beoordeling en hieronder in het besluitenlog
- [x] R2.2 — art direction + prototype: 2:1 dimetrisch blokkendorp op canvas (`docs/js/iso.js`), drie belichte vlakken per blok, grondschaduwen, klif + branding, iso-weg, NPC-verkeer, wolkschaduwen; UI-kit met omlijnde letters, glossy 3D-knoppen, CSS-munt (`docs/css/style.css`)
- [x] R2.3 — alle art als blok-3D: 5 geldmakers × 5 levels (`art/buildings.js`), huis met verf, avatar met loop/idle/spring/dans/salto + 9 hoeden + 5 skins + scooter/auto (`art/avatar.js`), 12 tuinitems + trampoline (`art/props.js`), 3 huisdieren (`art/pets.js`), sprite-renderer voor winkelkaarten, borden, HUD-iconen en START (`art/sprites.js`)
- [x] R2.4 — schermen omgebouwd: STAD (`scene.js`), WERK als 3D-wasstraat met modderspatten (`ui/werk.js`), WINKEL met sprites en gloeiende KOOP bij genoeg munten (`ui/winkel.js`), HUIS als iso-tuin met rondlopende huisdieren en trampoline (`ui/huis.js`), START met levend dorp op de achtergrond (`ui/start.js`), popups/fx met sprites en CSS-munten, nieuw app-icoon
- [ ] R2.5 — verificatie: unit 51 groen; e2e Chromium × 3 iPads; screenshots opnieuw beoordeeld; kid-tester + design-critic ronde op de nieuwe screenshots; bevindingen verwerkt
- [ ] R2.6 — bevindingen uit R2.1 verwerkt (bugs, spec-gaten, tests)
- [ ] R2.7 — deploy (sw cache v3), RAPPORT.md/README.md bijgewerkt, screenshots-galerij vernieuwd, push

## Toolbox (checked 2026-09-02)
- node v24.20.0 — was NOT installed; installed as a portable build in C:\Users\jgsno\.local\node (SHA256 verified against nodejs.org) and added to the user PATH. New terminals see it; this session uses the absolute path.
- npm 11.19.0
- git 2.53.0 (global identity present, used as-is)
- gh 2.96.0 — logged in as Johannes-lab-tw (scopes: gist, read:org, repo, workflow)
- Skills: frontend-design available (plugin), webapp-testing available (not needed), Playwright MCP not configured (in-app browser pane exists; Playwright itself is the baseline).
- No superpowers brainstorm workflow active.
- Run 2: `scripts/dev-shot.mjs` maakt screenshots van elk scherm met een geseede save (`--seed rich|mid|new`) tegen een draaiende server; handig bij elke visuele wijziging.

## Decision log
- 2026-09-02 SPEC.md is a verbatim copy of geldspel-SPEC.md (the name the spec refers to). geldspel-handleiding.md is personal and stays out of git.
- 2026-09-02 Node installed portable (no admin rights available; winget MSI would need a UAC click). Documented in RAPPORT.md.
- 2026-09-02 Vuurwerk is bought once and can be played unlimited on HUIS (spec said one-time show; buy-once is simpler for a 6-year-old and keeps the catalogue strategy sane).
- 2026-09-02 Work rate = coins in the trailing 60 s WERK window; sessions shorter than 60 s are extrapolated from at least 15 s (so a first car never yields a silly rate).
- 2026-09-02 A new car never arrives sooner than 4 s after the previous one (config.work.minCycleMs) → hard ceiling of 30 coins/min, as the spec intends.
- 2026-09-02 Investor policy in the simulator = save for the shortest-payback option among unlocked ones (matches the spec reference numbers).
- 2026-09-02 Bash heredocs are truncated at ~8 KB on this Windows setup; large files are written with the Write tool.
- 2026-09-02 WebKit cannot launch on this PC: Windows application-control policy blocks Playwright's unsigned libxslt.dll. Security setting, not changed. Chromium only; WebKit opt-in via WEBKIT=1 on another machine.
- 2026-09-02 Work rate = literally the coins in the trailing 60 s WERK window, capped at the pace ceiling (30/min). No extrapolation any more (economy review: bursts inflated it above the ceiling).
- 2026-09-02 UPGRADE button is labelled BETER (Dutch-only rule beats the spec's literal label); long names shortened: Fabriek, Piraat, Cowboy, Tovenaar.
- 2026-09-02 Thousands separator is U+202F (narrow no-break space) so "2 000" never wraps.
- 2026-09-02 The return popup also shows once (with 0 coins) for a child without any coin-maker, explaining what a coin-maker would have done; after that only when coins were earned.
- 2026-09-02 Simulator has variants (policy affordable/best, burst pacing, petFirst, work rates 10/20); all pass the lesson assertions.

### Run 2
- 2026-09-02 Vormgeving: 2:1 dimetrische projectie ("iso") op canvas 2D gekozen boven SVG/DOM: één lichtrichting (linksboven), drie belichte vlakken per blok, grondschaduwen; alles is eigen art via `iso.js`-primitieven, geen afbeeldingen, geen webfonts. Roblox-merken/modellen worden niet gebruikt; de look is "blokkerig speelgoeddorp".
- 2026-09-02 Emoji blijven alleen als badges (🔒, sticker-beloningen, 🔊, mentor-tekst). Item-art in winkel, borden, HUD en START zijn canvas-sprites uit dezelfde art als het dorp.
- 2026-09-02 De modderspatten in WERK blijven DOM-elementen (`.dirt`), gepositioneerd op de vlakken van de canvas-auto, zodat tik/veeg en de e2e-helper ongewijzigd werken.
- 2026-09-02 HUIS is canvas; onzichtbare `.hit`-vlakken (`.avatar[data-hat]`, `.pet[data-item]`, `.trampoline`, `.house`) liggen over de figuren voor tikken en tests.
- 2026-09-02 De e2e-audit tikt het kavel van de limonadekraam via `window.__muntstad.plotPoint('limonade')` in plaats van vaste percentages (de lay-out is nu isometrisch).
- 2026-09-02 Buttons hebben witte, omlijnde letters (text-shadow in 8 richtingen); het toetsenblok van de ouderpoort houdt donkere cijfers op wit voor leesbaarheid.

## Known issues
- none yet
