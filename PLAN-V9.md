# PLAN-V9 — Muntstad: Nacht (17 september 2026)

Besluit van Johannes, 17 september 2026, na de vijfde iPad-test (v8.4): het is beter geworden, maar het voelt nog als
een spel voor een vierjarige, eentonig, en niet alles loopt lekker. Zijn maat is 99 Nights in the Forest op Roblox:
daar verdedig je jezelf echt, elke nacht is zwaarder, je maakt tools en wapens, je upgradet het kamp, en verliezen mag.
Hij gaf drie regels mee die in dit plan bindend zijn:

1. **Verliezen mag.** Val je, dan moet de ander je redden. Speel je alleen, dan begin je het avontuur opnieuw (het dorp
   en je munten blijven).
2. **Redden kost iets.** Er is iets te maken, te verdienen of te kopen om de ander te redden. Kisten verspreid over het
   eiland met gadgets erin.
3. **Maken en upgraden.** Tools maken, betere verdediging, wapens van speer tot alienpistool, het kamp upgraden.

Grens die blijft (regel 2 uit CLAUDE.md, met Johannes' verruiming): wapens mogen, geen bloed, vijanden vluchten of
poffen weg, geen druk-timers, geen echt geld. Higgsfield (MCP, Ultra, 8 884 credits op 17 september) is de
beeld-, model-, stem- en muziekfabriek; alles wat het maakt wordt als bestand in docs/ gezet, dus offline blijft werken.

## 0. Wat de MELD-code van 17 september zegt (v8.4)

```
iPad 1180x688 dpr2 · Apple GPU · 4 kernen · tier 2 op het eiland
avontuur p50 27 p95 31 hik 3/min tier 2 px 1.00
werk/winkel/huis p50 17 p95 18-19 tier 0 px 1.50 · stad/dorp p50 17 tier 2 (erfenis van het eiland)
```

- De regeling uit V8.1 werkt (WERK, WINKEL en HUIS draaien op tier 0 met pixelratio 1,5), maar het **eiland haalt op de
  kaalste stand nog altijd maar 37 beelden per seconde** (mediaan 27 ms). Minder pixels en geen schaduwen hielpen niet,
  dus de last zit niet in het vullen van het scherm maar in wat er per beeld berekend wordt.
- Vermoedelijke oorzaken, in volgorde: (a) **elf puntlichten** staan permanent in de scène (vuur, lantaarn, hutlamp,
  twee grotkristallen, vuurtoren, bliksemboom, vier fakkels); Three.js rekent elk licht in élke pixel van élk
  materiaal mee, ook als de sterkte 0 is; (b) alles is `MeshStandardMaterial` (PBR), het duurste materiaal, ook het
  gras; (c) 15 soorten bosinstanties × 9 tegels = 135 tekenopdrachten plus 9 terreinen van 14 400 hoekpunten.
- **De tier is één getal voor het hele spel**: na het eiland draaide STAD op tier 2 zonder reden. Wordt per scherm.
- Meten ontbreekt: MELD zegt niets over tekenopdrachten, driehoeken en de verdeling rekenen/tekenen per beeld.

## A. Het eiland op 60 (V9.1, avond 1) — de voorwaarde voor al het andere

1. **Meten in MELD**: per scherm ook `calls` (tekenopdrachten), `tris` (driehoeken), `sim`/`render` ms (rekenen vs
   tekenen op de CPU) en het aantal actieve lichten.
2. **Lichtbudget**: elke halve seconde blijven alleen de vier dichtstbijzijnde puntlichten met sterkte > 0 zichtbaar;
   de rest gaat uit de scène (`visible = false`). Een licht dat niet bestaat kost niets.
3. **Materiaal per tier**: op tier 1 en 2 ruilt het eiland `MeshStandardMaterial` in voor `MeshLambertMaterial`
   (zelfde kleuren, geen PBR-rekenwerk per pixel); terrein op tier ≥ 1 in cellen van 1 m (was alleen tier 2);
   schaduwmap op tier 1 naar 1 024; krabben en vlinders op tier 2 om het andere beeld.
4. **Tier per scherm**: de engine onthoudt de stand per scherm; STAD en het dorp starten weer op tier 0 na het eiland.
5. Meetlat: op Johannes' iPad p50 ≤ 17 ms op het eiland op tier ≤ 1, p95 ≤ 22 ms. Bewijs: MELD.

## B. De spelkern van Nacht (V9.2 t/m V9.5)

### V9.2 Verdedigen doe je zelf (avond 2) — gebouwd 17 september, zie PROGRESS Run 10
- **Wapens** met een tik op het doel: speer (werpen, komt terug), katapult (bessen), waterspuit (spoken), later een
  boemerang en het alienpistool (licht, vijanden poffen). Elk wapen heeft een bereik en een herlaadtijd; de actieknop
  wordt het wapen zodra een vijand in bereik is, zoals BOE nu.
- **Vijanden met levens**: wolf 2, piraat 2, beer 4, spook 1 (alleen licht en water), baas 10. Raak = terugdeinzen en
  flits; op nul = poef en buit. De Nachtberen, wolven en piraten van V6/V8 gaan op dit systeem over.
- **De nacht kondigt zich aan**: bij schemer een banner met wat er komt ("Nacht 9: 🐺🐺🐻"); vanaf nacht 5 elke nacht
  iets zwaarder, elke vijfde nacht een baas.
- Tests: unit voor treffers/levens/herlaad; e2e speer op een wolf, katapult op een piraat.

### V9.3 Maken, kisten en het kamp (avond 3) — gebouwd 17 september, zie PROGRESS Run 10
- **Werkbank** bij het vuur: hout + stenen + schelpen → speer, katapult, netten, muur-stukken, fakkels, verband,
  reddingsdrank. Stenen zijn een nieuwe grondstof (rotsen hakken met een houweel).
- **Kisten** op het eiland met gadgets (zoals 99 Nights): tien vaste plekken, elke dag drie gevuld (zaad per dag),
  inhoud uit een tabel per zone (bos: hout en netten; moeras: reddingsdrank; berg: stenen; grot: zeldzaam).
- **Kamp level 1-5**: muur, wachttoren met lantaarn, betere tent, opslagkist, vlag. Zichtbaar en met effect (muur houdt
  wolven en piraten twintig tellen tegen, toren = licht en overzicht).
- Bewaar-code: nieuwe velden achteraan; oude codes laden.

### V9.4 Verliezen, gered worden, opnieuw (avond 4) — gebouwd 17 september, zie PROGRESS Run 10
- **Neer** (V6.2 WEK bestaat): de ander redt je alleen met een **reddingsdrank** of **verband** uit een kist of van de
  werkbank; zonder = wachten tot de ander er een haalt. Alleen spelen: niemand komt, dus na dertig tellen **begin je het
  avontuur opnieuw** (rugzak, kamp-level, tools en kaartstukken weg; dorp, munten, Bewaar-code en de campagnemunten
  blijven). Muntje legt het één keer uit, geen schrik-effecten.
- **Gadgets die redden**: reddingsdrank (maakt wakker), noodfakkel (houdt alles twintig tellen weg), fluit (roept de
  hond of de ander).
- Samen: twee rollen (stoken en bouwen / schieten) staan in de uitleg; de piraten en beren verdelen zich over de spelers.

### V9.5 Baasnachten en buit (avond 5) — gebouwd 17 september, zie PROGRESS Run 10 (trucs van kapitein en monster nog niet)
- Nacht 5 Nachtbeerkoning, nacht 10 Spookkapitein (piratenboot met spook), nacht 15 Moerasmonster, daarna herhalend
  en sterker. Elke baas heeft één truc (de koning stormt, de kapitein roept spoken, het monster gooit slijm).
- Buit: zeldzame wapens en hoeden alleen van bazen; een buitlijst op PAPA.

## C. De look en het geluid via Higgsfield (V9.6 en V9.7)

### V9.6 Modellen en beeld (avond 6)
- Eerst tien conceptplaatjes (GPT Image via Higgsfield, één stijl: "cozy-scary", rond plastic overdag, mist en gloed
  's nachts) — Johannes kiest in de galerij, of Claude kijkt zelf via het browserpaneel.
- Dan Meshy image-to-3D **met skelet en animatie** (lopen, rennen, springen, zwaaien) voor de held, de piraat, het spook,
  de beer, de wolf (dieren riggen minder goed: dan een statisch model met de bestaande wiebel), en statische modellen
  voor hut, boot, kisten, werkbank, wachttoren. GLB's onder `docs/modellen/`, geladen met Three's GLTFLoader (vendored,
  ~40 KB), low-poly (≤ 8 000 driehoeken), texturen 512 px. Regel 4 blijft: geen CDN. Regel 5: eigen art zonder merken.
- Grens docs/: van 1,75 MB naar **25 MB**; offline blijft werken (precache), de eerste keer laden duurt langer.
- Sfeer: mist en gloed rond vuur en lantaarns (bloom alleen op tier 0), flits bij een treffer, schudden bij een baas.

### V9.7 Stem, muziek en geluid (avond 7)
- Muntje krijgt één vaste Nederlandse stem (Higgsfield text-to-speech) voor alle zinnen als bestanden, met de
  iPad-stem als reserve. Drie muziekstukken (dag, nacht, baas) en een set echte geluiden (treffer, poef, kist, donder).
- Intro-filmpje op START (Higgsfield video, 15 s, mp4 ≤ 4 MB).

## D. Economie en afwerking (V9.8)

De V8.5/V8.6-punten schuiven hierheen en passen bij bouwen: onderhoud en reparatie, uitgaven op PAPA, spaardoel,
voorwaarden per geldmaker (brug, kade, vergunning), langzamer omhoog. RAPPORT §0 negende ronde, README, galerij,
tags, test met zijn zoon.

## Volgorde per bouwavond

| Avond | Stap | Speelbaar aan het eind |
|---|---|---|
| 1 | V9.1 eiland op 60: meten, lichtbudget, materiaal per tier, tier per scherm | MELD bewijst p50 ≤ 17 ms |
| 2 | V9.2 wapens, levens, nachtbanner, oplopende nachten | Je verdedigt jezelf |
| 3 | V9.3 werkbank, stenen, kisten met gadgets, kamp level 1-5 | Je maakt en bouwt |
| 4 | V9.4 neer, redden met gadgets, opnieuw beginnen, rollen | Verliezen mag |
| 5 | V9.5 baasnachten en buit | Elke vijfde nacht een baas |
| 6 | V9.6 Higgsfield-modellen en sfeer | Een echte held en echte vijanden |
| 7 | V9.7 stem, muziek, geluid, intro | Het klinkt als een game |
| 8 | V9.8 economie en afwerking | Rapport, CI groen, tags |

## Meetlat

- V9.1 op de iPad: p50 ≤ 17 ms, p95 ≤ 22 ms op het eiland; tier ≤ 1; STAD op tier 0 na een eilandbezoek.
- V9.2-V9.5: elke nacht vanaf 5 anders dan de vorige; een kind dat niets doet verliest in nacht 6 of 7; een kind dat
  bouwt en schiet haalt nacht 10; redden lukt alleen met een gadget; alleen spelen en vallen = opnieuw, zonder verlies
  van munten. Kind-UX-audit blijft groen; geen knop in het midden.
- V9.6-V9.7: docs/ ≤ 25 MB; eerste laadtijd op de iPad ≤ 20 s op wifi; offline start; alle stemzinnen aanwezig.

## Regels die blijven

CLAUDE.md-regels met de twee bijgestelde getallen (docs/ 25 MB; wapens zonder bloed), PLAN-V7 §C.2 voor de knoppen,
één PR per stap tegen main, unit + geraakte e2e lokaal op gen7, `CACHE_VERSION` en `GAME_VERSION` mee, nieuwe specs in
een groep van tests.yml, Ollama voor teksten, Higgsfield voor beeld, model, stem en muziek, Johannes test op de iPad en
plakt MELD.
