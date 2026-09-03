# PLAN-V4 — Muntstad Avontuur: zelf rondlopen, een groot eiland, nachten, en samen spelen

Besluit van Johannes, 3 september 2026: doorbouwen in de eigen app, richting 99 Nights in the Forest
(Roblox): camera achter je poppetje, zelf lopen, een grote wereld van simpele herhaalde objecten met een paar
gedetailleerde plekken, een kampvuur als middelpunt voor upgrades, nachten met spanning, en **samen spelen met
zijn drieën thuis** (zoon, mama, papa). Randvoorwaarden: zijn pc mag niet meer vastlopen tijdens het bouwen, en
het tokenverbruik moet omlaag.

Wat blijft: de economie en de les (geld dat voor je werkt), de winkel, de ouderpoort, Muntje, de 3D-motor en alle
modellen uit v3. Het bestaande dorp blijft bestaan als veilige thuisbasis; het avontuur komt erbij.

## 0. Hoe we werken (eerst dit, anders herhaalt gisteren zich)

**De pc van Johannes blijft vrij.**
- De e2e-tests draaien vanaf nu op **GitHub Actions** (`.github/workflows/tests.yml`), niet op de desktop. Bij
  elke push naar `main` draait GitHub de unit-tests en de 60 e2e-tests in de cloud en zet een groen of rood
  vinkje bij de commit. Op de desktop draai ik alleen nog `npm test` (unit, 0,1 s) en `dev-shot.mjs`
  (één headless Chrome, een halve minuut, alleen als ik iets moet zien).
- Nooit twee testruns tegelijk; `playwright.config.js` staat op één worker en dat blijft zo.
- De game zelf draait in het browservenster op de GPU, dat is nooit het probleem geweest.

**Tokens.**
- Eén plan (dit bestand) en één voortgangslog (PROGRESS.md), zodat een nieuwe sessie niets hoeft te
  her-ontdekken. Elke stap eindigt met een commit; een afgebroken sessie gaat verder bij het volgende vinkje.
- Kleine bestanden per onderwerp (`3d/terrain.js`, `3d/forest.js`, `3d/player.js`, `net/relay.js`, ...), zodat
  ik alleen lees wat ik aanraak. Nooit hele mappen inlezen.
- Screenshots beoordeelt eerst de lokale criticus (`qwen3.8:27b` via `lokaal.py`); ik kijk alleen naar het
  screenshot als de criticus iets meldt of bij een mijlpaal.
- Geen Opus-reviewagents; geen synthese-agents. Zoekwerk in de code via `graphify query` of een Sonnet-zoeker.
- Bouwen in rondes van één avond met een vaste opdracht; geen tussentijdse "kijk eens even"-rondjes, die kosten
  het meest.

**Wat Ollama wél kan doen (nul tokens):**
- Screenshots beoordelen per stap (doet het al).
- Inhoud in bulk: namen van plekken, zinnen van Muntje, dagopdrachten ("verzamel 10 schelpen"), beschrijvingen
  van tools en vondsten. Ik geef het formaat en drie voorbeelden, Ollama schrijft de rest, ik keur.
- Varianten van modellen op basis van één voorbeeld: boom 2 uit boom 1, rots 3 uit rots 1, drie hutjes uit één
  hut. Ik controleer of het in de bouwstenen past.
- Een eerste blik op een diff ("zie je iets raars?") vóór ik hem zelf lees, en logbestanden samenvatten.
- Testgevallen uitschrijven op basis van een bestaand testbestand.

**Wat Ollama niet kan:** de architectuur, de netwerkcode, de besturing, en alles waar overzicht over meerdere
bestanden nodig is. Dat blijft Claude-werk, en dat is ook waar de tokens voor bedoeld zijn.

## 1. Het spel in één alinea

Vanuit het dorp stap je op de boot naar het **Avontuureiland**: een groot eiland met bos, strand, een meer, een
grot en heuvels. In het midden ligt het **kamp met het kampvuur**: daar koop je upgrades, daar lever je in,
daar ben je veilig. Overdag verzamel je hout, schelpen, bessen en vis en verkoop je die of gebruik je ze voor je
kamp. 's Nachts moet het vuur blijven branden: **nachtspoken** sluipen rond en jatten hout en munten als het
donker is bij je kamp; met een lantaarn en fakkels jaag je ze weg, en één keer per paar nachten komt de
**Nachtbeer**, die je alleen samen wegjaagt. Elke dag word je sterker: betere bijl, grotere lantaarn, hek, tent,
boot naar het volgende eiland. De les blijft dezelfde: wat je koopt om sneller te verzamelen, verdient zich terug,
en de geldmakers in het dorp werken door terwijl je op avontuur bent.

Geen geweld: niemand gaat dood, niemand slaat iemand. Spoken schrikken van licht, de beer schrikt van lawaai
(bellen, trommels) en van drie lantaarns tegelijk. Verliezen betekent: hout of munten kwijt, morgen opnieuw.

## 2. Techniek

**Besturing en camera (`3d/player.js`, `3d/controls.js`).** Camera achter en boven het poppetje, draait mee.
Linkerduim: joystick (verschijnt waar je duim landt). Rechterduim: vegen draait de camera, tikken op een ding =
actie. Knoppen: SPRING en een contextknop (HAK, PAK, PRAAT, LEG). Op de pc: WASD + muis, zodat ik kan testen.
Poppetje: loop-, ren-, spring- en hak-animatie op de bestaande scharnieren.

**Terrein (`3d/terrain.js`).** Een hoogtekaart (bijv. 256 × 256 stappen, 4 stappen per meter) uit ruis plus
handgetekende vormen: strand rondom, bos, een meer, een heuvelrug met een grot. Eén mesh met vertexkleuren:
zand, gras, donker gras, rots, sneeuw op de top. Paden als lichtere strepen. Lopen = hoogte uit de kaart
aflezen; botsen tegen bomen en rotsen = cirkels in een raster.

**Bos en rotsen (`3d/forest.js`).** Precies wat Johannes zegt: twee boomsoorten, twee struiken, drie rotsen,
één graspol, één bloem, en die duizenden keren met `InstancedMesh` (één tekenopdracht per soort). Willekeurige
draai en 10 % schaalverschil zijn genoeg om het levend te laten ogen. Detail alleen op de plekken waar iets
gebeurt: het kamp, de hutjes, de grot, de steiger, de vuurtoren.

**Dag en nacht (`3d/daynight.js`).** Een cyclus van bijv. 6 minuten dag en 3 minuten nacht. Zon draait, kleur
en mist verlopen, sterren, het kampvuur en lantaarns geven echt licht (puntlichten met bereik), spoken alleen in
het donker. Dit is het "wauw"-moment en het hart van de spanning.

**Prestaties.** Doel 60 fps op iPad gen 7. Middelen: instancing, mist die ver weg afsnijdt, schaduw alleen
dichtbij (schaduwcamera volgt de speler), simpele materialen, geen post-effecten. Meten met de bestaande
kwaliteitstrap; tier 2 zet schaduwen uit.

**Samen spelen (`net/relay.js`, `server/relay/`).** Drie spelers thuis, ieder op een eigen iPad of telefoon,
via een **relais met kamercode**: een klein serverprogramma dat alleen berichten doorgeeft (positie, actie,
stand van het vuur), geen tekst, geen chat. Eén speler is de **gastheer** (de eerste die de kamer opent); zijn
apparaat bepaalt de wereld (nacht, spoken, beer, wat er op de grond ligt); de anderen zien wat hij ziet en
sturen hun eigen bewegingen. Bij drie spelers is dat ruim voldoende en het is het simpelste dat werkt.
- Kamer openen achter de ouderpoort ("SAMEN SPELEN" op het PAPA-scherm): geeft een code van vier plaatjes
  (bijv. 🍋 🐶 ⭐ 🚗). Meedoen: op START op "SAMEN" tikken en de vier plaatjes aantikken. Geen toetsenbord,
  geen vreemden (alleen wie de plaatjes kent), en de spec-regel "geen tekstinvoer" blijft overeind.
- Hosting: het relais is ~150 regels; ik stel **Cloudflare Workers** voor (gratis, geen server om te
  onderhouden, wereldwijd bereikbaar, dus het werkt ook bij oma). Een account aanmaken moet Johannes zelf doen;
  alternatief is een klein proces op het bestaande Emergent-platform. Beslissing hoort bij ronde 5.
- Zonder verbinding werkt alles gewoon alleen; de spec-regel "geen netwerk" wordt: alleen naar ons eigen relais,
  alleen spelstand, nooit persoonsgegevens (namen blijven lokaal; anderen zien "Speler 2" of een gekozen dier).

**Opslag.** Het avontuur (tools, kamp, dag) hoort bij dezelfde save en dezelfde Bewaar-code als het dorp.

## 3. Rondes (elk één avond, elk deploybaar, elk eindigt met een spelletje door zijn zoon)

- **R1 Fundament.** Camera achter het poppetje, joystick, lopen/rennen/springen, botsen, de hond loopt mee.
  Op het bestaande eiland, via een knop AVONTUUR in STAD. Meetlat: hij loopt vijf minuten rond zonder te
  vragen "en nu?". Dit is de proef of de richting klopt. GitHub Actions ingericht.
- **R2 Het eiland.** Terrein, bos met instancing, strand, meer, grot, heuvel, paden, kamp met kampvuur,
  drie hutjes, steiger met boot vanuit het dorp. Dag-nachtcyclus met licht. Meetlat: 60 fps op de iPad,
  "wauw" bij de eerste nacht.
- **R3 Doen.** Hakken, rapen, vissen; rugzak; inleveren en verkopen bij het kampvuur; bijl, lantaarn, hek,
  tent kopen (aan de portemonnee en de winkel gekoppeld); dagopdrachten van Muntje. Inhoud grotendeels door
  Ollama geschreven.
- **R4 Nacht.** Vuur dat hout vraagt, spoken die stelen, lantaarnbereik, fakkels, de Nachtbeer, beloningen
  na een overleefde nacht. Balans doorrekenen met de bestaande simulator (les blijft: investeren loont).
- **R5 Samen.** Relais met kamercode, drie spelers, gedeeld vuur en gedeelde nacht, naambordjes met dieren,
  emotes (zwaaien, dansen), de beer alleen samen weg te jagen.
- **R6 Afwerking.** iPad-prestaties, geluid en muziek voor dag en nacht, sticker(s), rapport, ouderpagina
  ("waar was hij mee bezig").

## 4. Risico's

- **Besturing op een iPad-scherm** is het eerste dat kan tegenvallen; daarom R1 als proef op het kleine eiland.
- **Prestaties** met een groot terrein en licht 's nachts: puntlichten zijn duur; maximaal 4 tegelijk in beeld.
- **Samen spelen** brengt een server en een account mee; dat is de ronde met de meeste onbekenden, daarom laatst.
- **Balans**: te makkelijk = saai voor een gamer van zes, te moeilijk = huilen om acht uur 's avonds. Mama en
  papa spelen mee, dus de beer mag echt spannend zijn.
