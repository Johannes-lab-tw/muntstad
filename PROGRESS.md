# PROGRESS — Muntstad

Resume rule: re-read SPEC.md, then this file. Continue at the first unchecked milestone. Update this file after every milestone.

## Milestones
- [x] Phase 0 — bootstrap: CLAUDE.md, PROGRESS.md, git init on main, toolbox check
- [ ] Phase 1 — PLAN.md (M1–M7 with acceptance criteria)
- [ ] Phase 2 — economy core (config.js, economy.js, save.js), simulator, unit tests incl. balance assertions
- [ ] Phase 3 — playable game: START, STAD (scene), WERK, WINKEL, HUIS, PAPA, popups, mentor, milestones, offline earnings
- [ ] Phase 4 — PWA (manifest, sw.js, icons), Web Audio, speech, visual polish
- [ ] Phase 5 — verification loop: unit + e2e (6 projects), screenshots reviewed, kid-tester + economy-review subagents
- [ ] Phase 6 — deploy to GitHub Pages, live smoke test
- [ ] Phase 7 — RAPPORT.md, README.md, final push, console summary

## Toolbox (checked 2026-09-02)
- node v24.20.0 — was NOT installed; installed as a portable build in C:\Users\jgsno\.local\node (SHA256 verified against nodejs.org) and added to the user PATH. New terminals see it; this session uses the absolute path.
- npm 11.19.0
- git 2.53.0 (global identity present, used as-is)
- gh 2.96.0 — logged in as Johannes-lab-tw (scopes: gist, read:org, repo, workflow)
- Skills: frontend-design available (plugin), webapp-testing available (not needed), Playwright MCP not configured (in-app browser pane exists; Playwright itself is the baseline).
- No superpowers brainstorm workflow active.

## Decision log
- 2026-09-02 SPEC.md is a verbatim copy of geldspel-SPEC.md (the name the spec refers to). geldspel-handleiding.md is personal and stays out of git.
- 2026-09-02 Node installed portable (no admin rights available; winget MSI would need a UAC click). Documented in RAPPORT.md.

## Known issues
- none yet
