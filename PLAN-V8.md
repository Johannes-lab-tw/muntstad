# PLAN-V8 — Vloeiend op de iPad, spanning op het eiland, een economie die je moet bijhouden (16 september 2026)

Besluiten van Johannes, 16 september 2026, na de vierde iPad-test (v7.7) met de eerste echte MELD-code. Drie punten:
(1) het eiland hapert nog, het water hapert en lopen voelt niet lekker; (2) het avontuur mist een spannende beleving;
(3) het dorp gaat te makkelijk: te weinig upgrades die het volgende mogelijk maken, het geld gaat nergens aan op, de
kunst moet zijn om het te behouden. Zelfde werkwijze als V6/V7: kleine stappen, elke stap speelbaar en getest, één
PR per stap (niet gestapeld, zie PROGRESS Run 8), Ollama voor bulkinhoud en de screenshotkritiek, Johannes test op de
iPad en plakt de MELD-code. De punten van zijn zoon komen er als §E bij zodra ze er zijn.

## 0. Wat de MELD-code van 16 september zegt

```
MELD v7.7 · iPad 1180x688 dpr2 · fps 60 tier 2 scherm papa
munten 3215 makers 1 nacht 5 vuur 328 warm 100 maag 96 hoofdstuk 2 keten 5/0 · eiland 240,303 grass
```

- **tier 2** is de laagste kwaliteit (geen schaduwen, pixelratio 1, stilstaand water). Het spel is daar zelf naartoe
  gezakt en komt er nooit meer uit: omhoog gaat pas bij een gemiddelde frametijd onder 13 ms, en op een iPad met
  60 Hz is 16,7 ms het best haalbare. Eén keer haperen (de tegels die tijdens de eerste stappen gebouwd worden, elk
  in één frame) en het eiland speelt de rest van de sessie in de kale stand. Dat verklaart "water hapert" (het stond
  stil of stapte) en een deel van "lopen doet het niet lekker".
- **fps 60** is gemeten op het laatste 3D-scherm (STAD), niet op het eiland. De MELD-code moet voortaan de frametijden
  van het eiland zelf geven (p50, p95, aantal hikken > 50 ms per minuut) en de tier per scherm.
- **1180×688 bij dpr 2** = 2 360 × 1 376 pixels per beeld in een Safari-tabblad. Dat is veel voor schaduwen plus water;
  de startstand moet op de iPad pixelratio 1,5 zijn, niet 2.
- **3 215 munten met één geldmaker op nacht 5, hoofdstuk 2**: het eiland (vis 8, maal 16, kisten 60 + 60 per dag,
  hoofdstukbeloningen 50-500) en de nacht-beloningen brengen meer op dan het dorp in dit stadium. Dat is het "te
  makkelijk" van punt 3.

## A. Vloeiend op de iPad (V8.1, avond 1)

1. **Kwaliteitsregeling gerepareerd** (`3d/engine.js`). Hikken (frames > 80 ms: tegels bouwen, shaders, tabwissel)
   tellen niet mee in het gemiddelde; de regeling kijkt naar de mediaan van 3 s. Omlaag bij > 24 ms, omhoog bij
   < 17,5 ms over 8 s (bij 60 Hz haalbaar). Op een echte iPad (geen software-renderer) begint pixelratio op 1,5;
   tier 1 = 1,25 en schaduwmap 1 024; tier 2 = 1,0 zonder schaduwen. Unit-test op de regeling met een gespeelde reeks
   frametijden (hikken negeren, omhoog bij 16,7 ms).
2. **Tegels in plakjes** (`3d/tiles.js`). Een tegel wordt nu in één frame gebouwd: terrein (14 400 hoekpunten),
   bos-instances, schelpen, struiken, en daarna het hele obstakelrooster opnieuw. Wordt: frame 1 terrein, frame 2 bos,
   frame 3 rooster erbij (incrementeel per tegel in plaats van alles opnieuw). Voorladen begint een ring eerder zodra
   je in een richting loopt. Meetlat: geen frame > 60 ms na de eerste drie seconden, lopend van kamp naar meer.
3. **Water in de shader** (`3d/world.js` createSea). De golven worden nu elk frame op de CPU over 4 225 hoekpunten
   gerekend en geüpload; dat wordt een tijd-uniform in de vertex shader (`onBeforeCompile`), gratis op elke tier, dus
   ook op tier 2 beweegt de zee. Schuim en meeuwen blijven uit op tier 2.
4. **Lopen** (`3d/player.js`, `3d/controls.js`). Frametijd-plafond 50 ms per stap (een hik slingert je niet vooruit),
   stick-dode zone 8 %, versnellen 24 en afremmen 30 (was 18/18), camera met vaste demping los van de hik, de
   loopanimatie op afgelegde afstand in plaats van tijd (geen glijdende voeten), kleine drempels (< 0,35 m) zonder
   sprong. Meetlat: Johannes zegt "lekker" en de MELD-code toont p95 < 25 ms.
5. **MELD-code uitgebreid**: frametijden p50/p95 en hikken per minuut per 3D-scherm, tier per scherm, pixelratio,
   `hardwareConcurrency`, GPU-naam (WEBGL_debug_renderer_info), aantal getekende tegels en instances.

## B. Spanning op het eiland (V8.2 t/m V8.4)

Wat er is (nacht, spoken, beer, hert, wolven, campagne) komt naar je toe zonder aankondiging en zonder weer of geluid
dat de spanning opbouwt. Drie stappen die elk iets zichtbaars en hoorbaars toevoegen; niets ervan is een druk-timer
(regel 2): je ziet het aankomen en kunt je voorbereiden.

### V8.2 Weer, geluid en aankondiging (avond 2)
- **Weer per dag** (`config.weer`, `daycycle`): zon, bewolkt, regen, storm; nooit storm in de eerste drie nachten,
  hooguit één storm per vier dagen, met een zaad per dag zodat de test het kan afdwingen. Regen = druppels
  (instanced lijnen), grijzere lucht, natte glans op de steiger; storm = harde wind (bomen en vlaggen zwaaien mee),
  donder, bliksemflits (ambient-flikker) en regen.
- **Het vuur en de regen**: regen eet 2× hout, storm 3×; een **afdak** (nieuw kampspul, 120 munten, bij het vuur) houdt
  het vuur droog. Bliksem slaat één keer per storm in een boom in de buurt van het kamp: die brandt tot de ochtend
  (licht, spoken blijven weg aan die kant) en geeft daarna 6 gratis hout.
- **Aankondigingen**: wolven huilen 20 s voordat ze komen (Muntje "🐺 Ze komen!"), de beer gromt uit het bos, het
  hert hoor je stampen; hartslag bij honger of kou onder een kwart; trommelslag bij de Nachtberen; het
  nachtthema wordt zwaarder per nacht (bestaande audio-lagen, geen nieuwe bestanden).
- Tests: unit voor de weerloting (zaad, regels), e2e: storm afgedwongen via `window.__muntstad` → vuur zakt sneller →
  met afdak niet; bliksemboom geeft hout.

### V8.3 De schatkaart en de schep (avond 3)
- **Vijf kaartstukken** liggen verstopt bij de vijf plekken die nu nog weinig doen: ruïne, moeras, bergtop,
  vuurtorenhut, grot. Elk stuk zit onder een **graafplek** (hoopje aarde met een kraai erop) die je pas ziet als je de
  plek ontdekt hebt. Nieuw gereedschap **Schep** (80 munten, bij het vuur); actie GRAAF.
- **De X**: met vijf stukken tekent het kaartje rechtsboven een X op een plek die per week verandert (zaad = weeknummer);
  daar graaf je de **schatkist** op: 300 munten en één zeldzaam ding dat je nergens kunt kopen (piratenhoed, gouden
  schep, papegaai voor op je schouder; één per week, uit een vaste lijst). Volgende week een nieuwe X.
- **De ruïne krijgt inhoud**: muren, een oude put (de eerste graafplek), een bord met een raadselplaatje.
- Tests: unit kaartstukken/weekzaad, e2e: teleport naar een graafplek, GRAAF met schep, vijfde stuk → X op het
  kaartje → kist.

### V8.4 De piraten (avond 4)
- Vanaf nacht 8 (en daarna één op de drie nachten) verschijnt bij zonsondergang een **piratenboot aan de horizon**
  (je ziet hem al bij daglicht dichterbij komen); 60 s na donker landt hij op het zuidstrand en lopen **drie piraten**
  naar het kamp om de houtstapel en je rugzak te plunderen. Ze zijn langzaam en dragen lantaarns: je ziet ze komen
  over het strand.
- **Verdedigen** met wat je hebt: BOE (één piraat per keer, zoals de beren), fakkels en hek houden ze 20 s tegen, en
  de **hond** blaft en jaagt er één weg als hij bij je is. Alle drie weg = ze laten elk een gouden munt vallen (10) en
  de boot vertrekt; anders nemen ze 30 % van elke soort uit je rugzak mee en 20 hout uit het vuur.
- Samen: piraten verdelen zich over de spelers; de baas van de wereld stuurt de piraten (zoals de beren).
- Tests: e2e piratennacht afgedwongen (`pirateNight()`), BOE × 3 = gewonnen, niets doen = verloren; unit voor de
  planning (nacht 8, 11, 14…).

## C. Een economie die je moet bijhouden (V8.5 en V8.6)

De les blijft: geld dat je aan het werk zet, maakt meer geld (SPEC §2, balanstest). Wat verandert: het duurt langer,
elke stap maakt de volgende mogelijk, en er gaat geld af als je niet oplet.

### V8.5 Langzamer omhoog, en elke stap opent de volgende (avond 5)
- **Prijzen en inkomens**: level-up kost ×2,6 per level (was ×2), inkomen groeit ×1,35 per level t/m 5 (was ×1,5); de
  levels 6-10 houden hun vermenigvuldigers. Eilandopbrengst: vis 8 → 5, maal 16 → 10, kisten 60 → 30 en 30,
  hoofdstukbeloningen blijven. Werk blijft 2 munten per truck en 4 s per truck.
- **Voorwaarden** (`config.makers[].vereist`): Wasstraat vraagt Limonadekraam level 3; Pizzeria vraagt Wasstraat level 3;
  IJssalon vraagt Pizzeria level 3; Fabriek vraagt drie geldmakers op level 3; Flatgebouw vraagt Fabriek level 5 plus
  een **bouwvergunning** (5 000); het Pretpark vraagt de Flat op level 5; de noordstrook (Hotel, Handelshaven,
  Raketbasis) gaat pas open met **de brug** (25 000) en de haven met **de kade** (100 000). Op de kaart staat bij een
  dicht kavel een bord met plaatje: "🍕 eerst level 3". In de winkel staat de kaart grijs met dezelfde regel.
- **Simulator** (`scripts/simulate.js`): naast de 20-minutensessie een **week van zeven avonden** van 20 minuten met de
  4-uurs-afwezigheidsplafonds ertussen. Doelen: 1 000 munten na avond 1, 10 000 na avond 3, 100 000 na avond 7, de
  eerste miljoen niet binnen de week; investeerder ≥ 3× spender blijft. De balanstest bewaakt beide tabellen.
- Bewaar-codes: nieuwe velden achteraan (vergunning, brug, kade), oude codes laden.

### V8.6 Geld dat opgaat, en het behouden (avond 6)
- **Onderhoud**: elke geldmaker gaat af en toe kapot (kans per dag, hoger bij storm uit V8.2): rook uit het dak, bord
  KAPOT, inkomen nul tot je REPAREER tikt (15 % van de prijs). Nooit meer dan één kapot tegelijk, nooit in de eerste
  dag, en Muntje zegt het één keer ("🔧 Repareer je pizzeria").
- **Kosten die zichtbaar zijn**: PAPA toont een regel Uitgaven (eten, reparaties) naast Inkomsten; op STAD een klein
  kasboek-icoon (📒) met dezelfde twee getallen in plaatjes.
- **Spaardoel**: in de winkel KIES DOEL op een kaart; op STAD een spaarvarken met een ring die volloopt; Muntje moedigt
  aan bij een kwart, de helft en driekwart; doel gehaald = sticker 🎯 en de kaart glimt. De Spaarbank (5 % per dag) is
  de plek waar geld veilig groeit; de piraten en de storm komen daar niet.
- **Stormschade in het dorp**: een stormnacht (V8.2) maakt één geldmaker kapot; wie de brug heeft, ziet de storm ook
  aan de vlaggen op de brug. Geen verlies van munten, wel van inkomen tot de reparatie.
- Tests: unit (kapot/repareer, uitgaven, spaardoel, geen twee kapot tegelijk), simulator met reparaties (de les
  houdt), e2e: KAPOT-bord → REPAREER → inkomen terug; spaardoel kiezen en halen.

## D. Afwerking (V8.7, avond 7)

RAPPORT §0 negende ronde, README, PLAN-V8 afgevinkt, ART-DIRECTION (weer, ruïne, piraten, kapotte geldmaker),
screenshotgalerij, MELD-code met frametijden gecontroleerd op de iPad van Johannes, tags v8.1 t/m v8.7.

## E. Punten van zijn zoon

Volgen na de test van Johannes met zijn zoon op v7.7; worden hier toegevoegd en per punt aan een stap gehangen of
naar V9 geschoven.

## Volgorde per bouwavond

| Avond | Stap | Speelbaar aan het eind |
|---|---|---|
| 1 | V8.1 kwaliteitsregeling, tegels in plakjes, water in de shader, lopen, MELD met frametijden | Vloeiend op de iPad, MELD bewijst het |
| 2 | V8.2 weer, afdak, bliksemboom, aankondigingen en geluid | Een nacht met storm die je voelt aankomen |
| 3 | V8.3 schatkaart, schep, graafplekken, ruïne, wekelijkse X | Een schat om voor terug te komen |
| 4 | V8.4 piraten en verdediging met hond, hek, fakkels, BOE | De piratennacht |
| 5 | V8.5 prijzen, voorwaarden, brug en kade, weeksimulator | Elke aankoop opent de volgende |
| 6 | V8.6 onderhoud, uitgaven, spaardoel, stormschade | Geld dat opgaat en dat je behoudt |
| 7 | V8.7 afwerking | Rapport, CI groen, tags |

## Meetlat

- V8.1: op de iPad van Johannes tier 0 of 1 op het eiland na vijf minuten lopen, p95 < 25 ms, geen hik > 60 ms na de
  eerste drie seconden; het water beweegt op elke tier. Bewijs: de MELD-code.
- V8.2-V8.4: elk gevaar is 20 s van tevoren te zien of te horen; geen enkel gevaar kost munten; alles is af te
  dwingen via `window.__muntstad` voor de tests; de kind-UX-audit blijft groen (geen nieuwe knoppen in het midden).
- V8.5-V8.6: de weeksimulator haalt de doelen (1 000 / 10 000 / 100 000, geen miljoen in een week); investeerder
  ≥ 3× spender; een kind dat niets repareert houdt altijd minstens één werkende geldmaker.

## Regels die blijven

De zeven regels uit CLAUDE.md (geen vragen, kindveilig zonder druk-timers en zonder echt geld, alleen Nederlands,
geen frameworks of externe plaatjes, eigen art, offline, af boven nieuw), PLAN-V7 §C.2 (knopvrij midden, één grote
knop, vervagen bij bewegen, korte ballon), en de werkwijze: unit + de geraakte e2e-specs lokaal op gen7 vóór een push,
één PR per stap tegen main (pas de volgende openen als de vorige gemerged is), `CACHE_VERSION` en `GAME_VERSION` mee,
Ollama voor teksten en modellen, de lokale criticus na elke visuele stap, Johannes test op de iPad en plakt MELD.
