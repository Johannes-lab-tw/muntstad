# Muntstad — rapport

**Live:** https://johannes-lab-tw.github.io/muntstad/

## 1. Op de iPad zetten

1. Open Safari op de iPad en ga naar https://johannes-lab-tw.github.io/muntstad/
2. Tik op de Deel-knop (het vierkantje met de pijl omhoog).
3. Kies **Zet op beginscherm** en tik op Voeg toe.

Vanaf dan start Muntstad als app, in liggende stand, en werkt hij ook zonder internet. De voortgang staat op de iPad zelf (als beginscherm-app blijft die bewaard; in een gewoon Safari-tabblad kan Safari opslag na 7 dagen zonder gebruik opruimen, daarom is er ook een Bewaar-code, zie punt 3).

## 2. Wat het spel leert

Eén les, zonder uitleg-tekst: **geld dat je aan het werk zet, maakt meer geld, en met dat geld koop je leuke dingen.** Werken (auto's wassen) geeft munten, maar langzaam en alleen als je zelf tikt. Een geldmaker (limonadekraam, wasstraat, pizzeria, speelgoedfabriek, flat) maakt munten vanzelf, ook als de iPad uit staat. Wie eerst geldmakers koopt, heeft daarna veel meer hoeden, huisdieren en auto's dan wie alles meteen uitgeeft. Leuke dingen kopen is de beloning, niet iets fouts. Kosten (hondenvoer) betalen de geldmakers vanzelf.

| Hij leert | Hoe het in het spel zit | Wanneer hij het merkt |
|---|---|---|
| Munten komen van werk, en handen worden moe | WERK: auto's wassen, 2 munten per auto, nooit sneller dan 30 per minuut | Eerste minuut; Muntje zegt het na 10 auto's |
| Geld kan voor je werken | GELDMAKERS in de WINKEL maken munten die je ziet vliegen | Eerste kraam (20 munten) |
| Meer geldmakers → meer munten → nog meer geldmakers | Upgrades en nieuwe geldmakers; "+X per minuut" staat altijd bovenin | Sticker "Je geld werkt harder dan jij!" |
| Geld werkt door als je weg bent | Bij terugkomst telt een popup op wat de geldmakers maakten (max 4 uur) | Elke keer dat hij terugkomt |
| Geld betaalt kosten | Een huisdier eet elke 2 minuten voor 5 munten; op = het beest slaapt even | Na het eerste huisdier |
| Leuk is waar geld voor is | LEUK-tab: 38 dingen met vaste prijzen, altijd zichtbaar | Elke leuke aankoop |
| Keuzes hebben gevolgen, fouten mogen | Beide winkeltabs staan naast elkaar; alles uitgeven mag, WERK blijft altijd | Als de portemonnee op nul staat |

## 3. Zo speel je, per scherm

- **START:** kies een kleur, naam mag leeg, tik SPEEL. De eerste tik zet ook het geluid en de stem aan (regel van iOS).
- **STAD:** het dorp. Bovenin munten en "per minuut". Tik op een gebouw voor de kaart met level, opbrengst en BETER (de upgrade). Een wijzend handje verschijnt boven een leeg plekje zodra hij genoeg munten heeft. Onderin WERK, WINKEL, HUIS. PAPA staat klein rechtsonder.
- **WERK:** een auto rijdt binnen met 3 of 4 vlekken; tik of veeg ze weg, de auto rijdt schoon weg, 2 munten. KLAAR brengt je terug.
- **WINKEL:** tab GELDMAKERS (kraam 20, wasstraat 120, pizzeria 400, fabriek 2 000, flat 10 000; de volgende gaat open als hij in totaal zoveel verdiend heeft) en tab LEUK (hoeden, kleuren, scooter, auto, verf, tuin, huisdieren, vuurwerk, dansjes, trampoline). Te duur? De kaart blijft staan met "nog 12 🪙" en een balkje.
- **HUIS:** zijn huis en tuin: hoed en pak op de poppetje, huisdieren, trampoline (tik = springen), VUURWERK, DANSJE, SALTO en de stickermuur met mijlpalen.
- **PAPA:** houd PAPA 3 seconden vast en maak de som (bijvoorbeeld 37 + 48). Daar staan de cijfers (verdiend met werk vs. geldmakers, uitgegeven aan leuk vs. geïnvesteerd, inkomen per minuut, speeltijd), drie gespreksvragen, schakelaars voor STEM, GELUID en MUZIEK, de Bewaar-code (kopieer hem naar Notities; op een andere iPad plakken en LADEN) en ALLES WISSEN (twee keer bevestigen).

## 4. Aan de knoppen draaien

Alle getallen staan in `docs/js/config.js`. Verander een getal, sla op, zet in `docs/sw.js` het versienummer één hoger (`muntstad-v2` → `muntstad-v3`), commit en push. Veilige marges:

| Knop | Nu | Wat het doet | Veilig tussen |
|---|---|---|---|
| `work.coinsPerCar` | 2 | munten per gewassen auto | 1 – 3 (hoger maakt werken te aantrekkelijk) |
| `work.minCycleMs` | 4000 | minimum tijd per auto, dus max 30 munten/min | 3000 – 6000 |
| `makers[].price` | 20 / 120 / 400 / 2 000 / 10 000 | prijs én het moment waarop de volgende geldmaker opengaat | ±30 % per stuk, houd de volgorde |
| `makers[].income` | 12 / 50 / 150 / 600 / 2 500 (level 1) | munten per minuut per level | houd de vorm ×1 / 1,5 / 2,25 / 3,4 / 5 |
| `pet.foodCost`, `pet.foodIntervalMs` | 5 munten, elke 2 min | hondenvoer | 3 – 10 munten, 1 – 5 min |
| `offlineCapMs` | 4 uur | maximum dat geldmakers maken als de iPad uit staat | 1 – 8 uur |
| `offlinePopupMinMs` | 60 s | vanaf welke afwezigheid de popup komt | 30 – 300 s |
| `mentor.tipGapMs` | 90 s | hoe vaak Muntje ongevraagd iets zegt | 60 – 180 s |
| `papa.holdMs`, `papa.sumMin/Max` | 3 s, 23 – 69 | de ouderpoort | laat staan |

Na elke verandering: `npm test` draait de balanssimulatie en zegt of de les nog klopt (investeerder ≥ 3× zoveel munten aan leuke dingen, ≥ 1,5× zoveel spullen, inhaalmoment binnen 4 minuten).

## 5. Wat er getest is

**Unit tests (51, allemaal groen):** rekenwerk van de economie (opbrengst per tik, upgradeprijzen 40/80/160/320, vrijspelen, hondenvoer automatisch betaald, saldo nooit onder nul, 4-uur-plafond, werktempo = munten in de laatste 60 seconden met een plafond van 30 per minuut, oude save-versie wordt omgezet, kapotte save geeft een schone start), stemkeuze (nl-NL eerst, dan andere nl, anders stil), de service-worker-lijst (elk bestand in `docs/` staat erin), manifest en iOS-metatags, en de balanssimulatie in vijf varianten (twee lezingen van "kortste terugverdientijd", werken in korte uitbarstingen, met een huisdier zodat het voer meetelt, en een langzamer en sneller kind).

**Twee onafhankelijke reviews** (een "kind-tester" op de screenshots en de UX-regels, en een economie-check tegen de SPEC) leverden samen twintig punten op; allemaal verwerkt. De belangrijkste: het werktempo werd bij korte sessies te hoog geschat (nu letterlijk "munten in de laatste minuut"), vergrendelde winkelkaarten reageerden niet op een tik, getallen als "2 000" braken af over twee regels, de vijf geldmakers staan nu op één rij, lange woorden zijn ingekort (Fabriek, Piraat, Cowboy, Tovenaar) en UPGRADE heet BETER.

**Balanssimulatie (20 minuten, kind verdient 15 munten per minuut met WERK):**

| | Investeerder | Uitgever |
|---|---:|---:|
| Munten verdiend (totaal) | 1413 | 300 |
| … waarvan door WERK | 300 | 300 |
| … waarvan door geldmakers | 1113 | 0 |
| Passief inkomen aan het eind (per minuut) | 77 | 0 |
| Geldmakers (levels) | limonade 3, wasstraat 1 | geen |
| Geïnvesteerd in geldmakers | 260 | 0 |
| Uitgegeven aan LEUK | 1105 | 300 |
| Leuke spullen (verschillende) | 25 | 10 |
| Passief > werk na | 2,8 min | nooit |

Verhouding LEUK-munten 3,68× (eis ≥ 3×), leuke spullen 2,5× (eis ≥ 1,5×), inhaalmoment 2,8 min (eis ≤ 4 min). Bij een langzamer kind (10/min) wordt de verhouding groter; bij een snelle tikker (20/min) haalt het passieve inkomen het werk na ongeveer 5,5 minuten in, omdat die de wasstraat nodig heeft.

**Browsertests (Playwright, 45 groen):** drie iPad-formaten (iPad gen 7 1080×810, iPad mini 1024×768, iPad Pro 11 1194×834) in Chromium: geen foutmeldingen op geen enkel scherm · volledig doorspelen (start → werken tot 20 munten → limonadekraam kopen → portemonnee groeit zonder tikken → hoed kopen → hoed zichtbaar in HUIS → ouderpoort) · herladen bewaart de voortgang · gesimuleerde afwezigheid (1 uur weg = 720 munten; 5 uur weg = precies het plafond van 4 uur = 2 880) · echt offline (server uitgezet, spel laadt uit de cache) · manifest en iconen bereikbaar · tikdoelen ≥ 64×64 zonder overlap · alle tekst ≥ 20 px · geen Engelse woorden · staand scherm toont "Draai je iPad".

**Live rooktest** tegen https://johannes-lab-tw.github.io/muntstad/ (Chromium met het iPad gen 7-profiel): laadt, start, WERK en WINKEL werken, manifest, iconen en service worker worden geserveerd, geen foutmeldingen. Geslaagd.

**WebKit (≈ Safari) kon op deze pc niet draaien:** Windows blokkeert de ongesigneerde WebKit-bestanden van Playwright via het toepassingsbeheerbeleid (Smart App Control). Dat is een beveiligingsinstelling van Windows die ik niet heb aangepast. Op een andere machine: `WEBKIT=1 npm run test:e2e`. De echte Safari-check doe je op de iPad, zie punt 6.

**Screenshots:** `screenshots/chromium-ipad-gen7/`, `screenshots/chromium-ipad-mini/`, `screenshots/chromium-ipad-pro11/` (12 per formaat: start, stad, werk, winkel ×2, huis, poort, papa, staand, sticker-popup, huis met hoed, weg-geweest-popup). Ik heb ze zelf bekeken en de gevonden punten (huis dat buiten beeld viel, vlekken die over elkaar lagen, Muntje over de winkelknoppen) verholpen.

## 6. Zelf even checken op de iPad

1. **Stem:** tik op SPEEL; Muntje moet "Hoi …! Ik ben Muntje" zeggen met een Nederlandse stem. Geen stem? Instellingen → Toegankelijkheid → Gesproken content → Stemmen → Nederlands → een stem downloaden (bijvoorbeeld Xander). Zonder Nederlandse stem blijft het spel stil en werkt alles verder gewoon.
2. **Geluid en muziek:** de zijschakelaar van de iPad (stil) dempt ook het spel. Uitzetten kan in PAPA.
3. **Beginscherm:** na "Zet op beginscherm" start hij zonder Safari-balk, liggend.
4. **Offline:** zet wifi uit en open de app: hij moet gewoon starten.
5. **Weg geweest:** leg de iPad 10 minuten weg met minstens één geldmaker; bij terugkomst komt "Terwijl je weg was…".

## 7. Wat (nog) niet kan, en Volgende versie

Bekende beperkingen:
- Werken blijft altijd lineair; dat is expres (de les).
- Muntje spreekt alleen als de iPad een Nederlandse stem heeft.
- De Bewaar-code is lang (ongeveer 150 tekens); kopiëren naar Notities werkt het best.
- WebKit-tests konden hier niet draaien (zie punt 5).

Volgende versie (bewust weggelaten voor een afgemaakte versie 1):
- Meer geldmakers na de flat en meer levels.
- Vaste WERK-baantjes naast auto's wassen (bijvoorbeeld pizza's bezorgen).
- De avatar zelf laten rondlopen met tikken op de weg.
- Een tweede kind/profiel op dezelfde iPad.
- Seizoensdingen (sneeuw, Sinterklaas) in de tuin.

## 8. Later iets veranderen

Open een terminal in `C:\Claude_code\Geldspel` en start Claude Code (`claude`). Vraag gewoon: "Maak de wasstraat 20% goedkoper en voeg een brandweerauto toe aan LEUK." `claude --continue` pakt de vorige sessie op; SPEC.md en PROGRESS.md staan in de map. Tests: `npm test` en `npm run test:e2e`. Deployen: versienummer in `docs/sw.js` ophogen, `git commit`, `git push`; GitHub Pages zet het binnen een paar minuten live.

Node staat op deze pc als losse map in `C:\Users\jgsno\.local\node` (in je PATH gezet; nieuwe terminals zien hem). Wil je hem "netjes" installeren: `winget install OpenJS.NodeJS.LTS` in een terminal als beheerder, dat mag ernaast.
