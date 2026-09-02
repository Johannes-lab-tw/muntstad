# PLAN-V3 — Muntstad in echt 3D (Three.js)

Besluit van Johannes, 2 september 2026: route 1, echte 3D met Three.js. Doel: de vormgeving keer tien,
"iets gaafs waar hij van staat te kijken en dat hij aan al zijn vriendjes vertelt". Dit plan is het
stappenplan voor ronde 3. Lees eerst SPEC.md en PROGRESS.md; dit bestand gaat alleen over de tekenlaag.

## 0. Wat de check van 2 september opleverde

**Werking.** v2 is af en live: 51 unit-tests en 60 e2e-tests groen, deploy sw cache v5. Er zijn geen
functionele blokkades; de open functies staan in RAPPORT.md §7 (meer geldmakers, vaste baantjes, avatar
laten lopen, tweede profiel, seizoenen, dag-en-nacht). Die komen ná de tekenlaag.

**Look per scherm** (Claude plus de lokale criticus `qwen3.8:27b`, zie §4):

| Scherm | Waarom het nog prototype oogt |
|---|---|
| STAD | Klein eiland met veel leeg gras; de prijsborden domineren het beeld; platte vlakken in drie tinten, geen echte diepte; alles staat stil zolang er niets gekocht is |
| WERK | Kale grijze tegelvloer; modderklodders zijn een andere stijl dan de blokwereld; geen water, geen borstels die draaien, geen glans op de auto |
| WINKEL | Kaarten zijn plat en grijs; de miniatuurtjes zijn klein en dof; gesloten kaarten zien er "kapot" uit in plaats van "spannend, nog even sparen" |
| HUIS | Leeg: hek, huis, pad, verder niets; geen reden om er te willen zijn |
| UI-kit | Knoppen zijn al goed (glossy, omlijnd); het contrast met de platte wereld maakt de wereld juist ouder |

**Technische regels in de spec die de Three.js-route raken.** Dit zijn Johannes' eigen regels; ze worden
bijgesteld, niet omzeild.

1. `docs/` moet onder 1 MB blijven (`tests/unit/sw.test.js`, SPEC §6). Nu 371 KB. Three.js r185
   minified is 366 KB (`three.module.min.js`) plus 385 KB (`three.core.min.js`) = 751 KB. Samen 1,12 MB.
   **Voorstel: budget naar 1,5 MB.** Over de lijn gaat het gzipt (GitHub Pages), dan is Three.js
   ongeveer 200 KB; "eerste keer laden ≤ 1 s lokaal" blijft haalbaar. Knelt het later, dan een
   tree-shaken build (rollup + terser) die alleen de gebruikte klassen meeneemt (schatting 250-350 KB).
2. Geen CDN, geen externe URL (`sw.test.js`, SPEC §1 regel 2). Three.js wordt **gevendord** in
   `docs/vendor/` en opgenomen in `PRECACHE` van `docs/sw.js`. De test die `docs/` tegen `PRECACHE`
   afstreept blijft dan groen.
3. `devDependencies` moet exact `@playwright/test` zijn. Blijft zo: vendoren is kopiëren, geen bundler.
4. SPEC §6 "zero runtime dependencies": een gevendorde bibliotheek is geen npm-dependency, maar de
   geest van de regel was "geen framework". Tekst wordt: *geen frameworks of bundlers; Three.js is de
   enige gevendorde tekenbibliotheek, als één bestand in `docs/vendor/`*. CLAUDE.md regel 4 idem.

**Wat blijft** (niet aanraken): `config.js`, `economy.js`, `save.js`, `i18n.js`, `audio.js`,
`speech.js`, `main.js` (op de scene-koppeling na), `ui/mentor.js`, `ui/papa.js`, `ui/popups.js`,
`ui/winkel.js` (DOM), `ui/fx.js`, alle unit-tests, de e2e-helpers.

**Wat vervangen wordt:** `iso.js`, `art/avatar.js`, `art/buildings.js`, `art/pets.js`, `art/props.js`,
`scene.js`, de canvas-delen van `ui/werk.js`, `ui/huis.js`, `ui/start.js`, `ui/stad.js`.
`art/sprites.js` wordt `3d/thumbs.js`: dezelfde functienamen (`makerSprite`, `itemSprite`,
`avatarSprite`, `navSprite`, …) en dezelfde uitvoer (dataURL voor `<img src>`), maar gerenderd met
Three.js in een offscreen doel. Zo hoeven `winkel.js`, `popups.js`, `start.js` en `main.js` alleen hun
import-pad te wijzigen.

**Contracten die de tests nodig hebben** (uit de inventarisatie van 02-09, met regelverwijzingen):

- `createScene(canvas, game)` → `{ resize, render(now), hitTest(x,y), spawnCoin, burst(id), setState(s), plotPoint(id), hop }` (`scene.js:66,624`). `hitTest` geeft `{type:'maker',id}` / `{type:'house'}` / `{type:'avatar'}` / `null`. Blijft identiek; binnenin wordt het een `Raycaster`.
- `window.__muntstad.plotPoint(id)` (`main.js:351`) — gebruikt door `tests/e2e/audits.spec.js:135` en `scripts/dev-shot.mjs:72`. Wordt: projectie van het kavelmidden naar schermcoördinaten.
- Synthetische `pointerdown` op `#town` (`smoke.spec.js:53`, `dev-shot.mjs:74`). `#town` blijft het element dat de tikken ontvangt.
- HUIS: `.hit`-overlays `.avatar[data-hat][data-skin]`, `.pet[data-item]`, `.house`, `.trampoline` (`huis.js:227-346`; tests `persistence.spec.js:51`, `playthrough.spec.js:51`, `audits.spec.js:33`). Blijven DOM, elke frame gepositioneerd via `Vector3.project(camera)`.
- WERK: `.dirt`-elementen en `.dirt.gone` (`werk.js:239-264`; `helpers.js:91`, `live.spec.js:18`). Blijven DOM-hitvlakken, gepositioneerd op geprojecteerde punten van de 3D-auto; de modder zelf wordt 3D.
- Unit-tests importeren nooit de tekenlaag. Veilig.

## 1. Het art-doel

Referentiebeeld: een moderne blokkerige speelgoedwereld zoals de tablet-tycoongames die een 6-jarige
kent, maar dan écht belicht. Concreet, en dit is de meetlat voor elke stap:

- **Licht.** Eén zon (directioneel, schaduwkaart) plus hemellicht (`HemisphereLight`) en een zachte
  omgevingsverduistering in hoeken en onder gebouwen. Schaduwen zacht (`PCFSoftShadowMap`).
- **Materiaal.** Plastic speelgoed: verzadigde kleuren uit het huidige palet (ART-DIRECTION §3),
  lichte glans, geen texturen nodig. Toon-shading (`MeshToonMaterial` met een 3-staps gradient) of
  `MeshStandardMaterial` met lage ruwheid; A/B beoordelen in V3.1.
- **Wereld.** Groter eiland met hoogteverschil (klif, strandje, een heuvel achter het dorp), water dat
  beweegt (vertex-golfjes plus schuim langs de rand), wolken die schaduw werpen, vogels of vlinders.
- **Camera.** De dimetrische kijkhoek blijft (herkenbaar, geen bewegingsziekte), maar de camera zoomt
  zachtjes in bij een tik op een gebouw, en ademt licht op START. Later optioneel: vrij draaien met
  twee vingers.
- **Juice.** Munten die met een boog naar de portemonnee vliegen en gloeien (bloom alleen op munten,
  via een aparte laag), gebouwen die stuiteren en deeltjes spuiten bij BETER, confetti bij mijlpalen,
  de avatar die reageert op elke tik, verkeer dat toetert bij de wasstraat.
- **Dag-en-nacht** als bonus in V3.7: lampen aan, ramen verlicht, sterren. Stond al op de wenslijst.

De regels uit SPEC §1 blijven: eigen art, geen Roblox-namen, -modellen of -assets; geen afbeeldingen
van buiten; alles procedureel uit geometrie, precies zoals nu, alleen dan echt 3D.

**Aan Johannes:** welke spellen vindt je zoon nu het gaafst? Twee of drie namen zijn genoeg om het
referentiebeeld scherp te stellen vóór V3.1. Zonder antwoord ga ik uit van "blokkerige tycoon op
tablet" zoals in ART-DIRECTION v2.

## 2. Architectuur

```
docs/vendor/three.module.min.js  + three.core.min.js   (r185, gevendord, in PRECACHE)
docs/js/3d/
  engine.js       één WebGLRenderer voor alle schermen, dpr-beheer, resize, RAF-eigenaar,
                  kwaliteitstrap (fps meten → schaduwresolutie, bloom, dpr omlaag)
  materials.js    palet → materialen (één plek, zodat alles één familie blijft)
  world.js        eiland, water, weg, stoep, klif, wolken, lucht
  buildings.js    5 geldmakers × 5 levels + huis + borden, als groepen van BoxGeometry
  avatar.js       figuur, hoeden, skins, voertuigen, poses (loop, spring, dans, salto, zwaai)
  props.js        12 tuinitems + trampoline; pets.js: hond, kat, dino
  fx3d.js         munten-boog, stuiter, rook, druppels, deeltjes (≤ 30 live, SPEC §6)
  pick.js         Raycaster → { type, id }, en project(v3) → schermpunt voor .hit/.dirt/plotPoint
  thumbs.js       offscreen render → dataURL; vervangt art/sprites.js met dezelfde exportnamen
  scene-stad.js / scene-werk.js / scene-huis.js / scene-start.js
```

Eén renderer, niet vier. iOS Safari beperkt het aantal WebGL-contexten en vier contexten kosten
geheugen en batterij. De renderer heeft één `<canvas>`; bij een schermwissel (`main.js:show`) verhuist
dat canvas naar de container van het actieve scherm (`#town`, `#werk-canvas`, `#huis-canvas`,
`#start-canvas` worden containers in plaats van canvassen). Tests die op `#town` tikken blijven werken
omdat de container de events krijgt.

De RAF-lus wordt één lus in `engine.js` die de actieve scène tekent; de per-scherm-lussen in
`stad.js`, `start.js`, `werk.js`, `huis.js` verdwijnen. `fx.js` (confetti op `#fx`) blijft een 2D-laag
erbovenop.

## 3. Stappen

Elke stap eindigt met: unit- en e2e-tests groen, `scripts/dev-shot.mjs` screenshots op drie iPad-maten,
kritiek van de lokale criticus, eigen beoordeling, commit. Pas naar de volgende stap als de meetlat
uit §1 op dat scherm gehaald is.

- **V3.0 Voorbereiding.** Spec-regels bijstellen (budget 1,5 MB, vendor-regel) in SPEC.md, CLAUDE.md en
  `sw.test.js`. Three.js vendoren, `PRECACHE` bijwerken. `engine.js` met een lege scène achter de
  bestaande STAD-UI, 60 fps in Chromium, sw-test groen. Oude canvaslaag draait nog mee tot V3.2.
- **V3.1 STAD-wereld.** Eiland, water, weg, licht, schaduw, wolken, camera. A/B toon versus standard.
  Acceptatie: de criticus noemt "plat" of "prototype" niet meer; fps ≥ 55 headless zonder throttle.
- **V3.2 Gebouwen.** 5 × 5 levels, huis, TE KOOP-borden (kleiner, in de wereld, niet erboven),
  verkeer op de weg. `hitTest` via Raycaster, `plotPoint` via projectie. `audits.spec.js` groen.
  Oude `scene.js`, `iso.js`, `art/buildings.js` weg.
- **V3.3 Avatar en dieren.** Figuur met poses, 9 hoeden, 5 skins, scooter en auto; dieren met
  gedrag. `art/avatar.js`, `art/pets.js` weg.
- **V3.4 WERK.** Wasstraat als 3D-hal: draaiende borstels, water, schuim, glans op de auto; modder
  als 3D-klodders met `.dirt`-hitvlakken erop geprojecteerd; auto rijdt echt de hal in en uit.
- **V3.5 HUIS.** Tuin met props, dieren die rondlopen, trampoline; `.hit`-overlays via projectie;
  meer leven (vlinders, wapperende vlag, fontein die spuit). `art/props.js` weg.
- **V3.6 START en thumbnails.** Levend dorp achter START; `thumbs.js` rendert winkelkaarten,
  popups en HUD-iconen; winkelkaarten opnieuw vormgegeven (3D-miniatuur op een podium, glow bij
  "kan kopen", "nog even sparen"-balk in plaats van grijs). `art/sprites.js` weg.
- **V3.7 Juice en dag-en-nacht.** Munten-boog met gloed, stuiter bij BETER, deeltjes, toeteren;
  dag-en-nachtcyclus met lampen. Kwaliteitstrap afronden en op alle schermen laten werken.
- **V3.8 Verificatie en deploy.** Unit + e2e groen, perf-probe, screenshots-galerij vernieuwd,
  RAPPORT.md §0 ronde 3, README, ART-DIRECTION v3, sw cache v6, deploy, live rooktest, iPad-test
  door Johannes (WebKit draait hier niet, RAPPORT §6).

Daarna de functielijst uit RAPPORT §7.

## 4. Werkverdeling: Claude denkt, het lokale model sjouwt

- **Claude Code** doet ontwerp, engine, elke stap hierboven en de beoordeling van alles wat het
  lokale model oplevert. Reviews: geen Opus-agents (afspraak van ronde 2); waar agents nodig zijn
  Sonnet-finders, geen synthese-agent.
- **`qwen3.8:27b` via Ollama** is de goedkope criticus en de sjouwer. Script:
  `C:\TW1\lokaal-zoeken\lokaal.py` (opdracht + bestanden of plaatjes → antwoord, 30 s per screenshot,
  nul tokens). Vaste inzet:
  - Na elke stap: `python C:\TW1\lokaal-zoeken\lokaal.py "<criticus-opdracht>" screenshots\...\02-stad.png`
    voor elk gewijzigd scherm. Claude leest de vijf punten en beslist.
  - Varianten uitschrijven op basis van één door Claude gemaakt voorbeeld: gebouw-levels 2-5,
    tuinitems, hoeden, skins. Claude keurt en corrigeert.
  - Testboilerplate en repetitieve e2e-gevallen.
- Wat het lokale model niet doet: architectuur, engine, alles waar overzicht over meerdere bestanden
  nodig is.

## 5. Risico's en afspraken

- **iOS-geheugen en warmte.** Schaduwkaart 1024, één renderer, RAF stopt zodra de app verborgen is
  (`visibilitychange`), dpr maximaal 2 en omlaag onder 42 fps.
- **Headless Chromium meet niet wat de iPad doet** (software-rendering). Perf-oordeel uiteindelijk op
  de iPad zelf; de kwaliteitstrap vangt het verschil op.
- **Bestandsgrootte.** Bij 1,5 MB stoppen; daarboven eerst tree-shaken, niet het budget nog eens
  oprekken.
- **Heredocs boven 8 KB worden afgekapt** op deze pc: grote bestanden met de Write-tool.
- **Dit is de grootste ronde tot nu toe.** Werken in kleine commits op `main` (CLAUDE.md-conventie);
  elke stap moet los deploybaar zijn zodat een halve ronde nooit een kapotte site oplevert.
