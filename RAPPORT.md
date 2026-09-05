# Muntstad — rapport

**Live:** https://johannes-lab-tw.github.io/muntstad/

## 0. Vijfde ronde: spannender, wat je zoon vroeg (5 september 2026)

Na jullie iPad-test van 5 september noemde je zoon zes dingen; die zijn alle zes gebouwd (PLAN-V5.md), plus twee open punten uit §7.

1. **De grot** is nu een gang met een bocht die uitkomt in een ronde kamer met stalactieten en kristallen. Vleermuizen vliegen op als je binnenkomt, er druppelt water, en naast de schatkist slaapt een grotspook: pak je de schat, dan wordt het wakker en jaagt het je naar buiten. Haalt het je in, dan pakt het schelpen. Buiten is het weg.
2. **Bomen vallen om** na het laatste stuk hout, van je af, met een plof en twee stukken hout extra; er blijft een stronk, na anderhalve minuut groeit er een nieuwe boom.
3. **Uitdagender.** Een etenmeter (appel) loopt leeg; bessen en vis eten met EET. Onder een kwart loop je traag, en met een lege maag in het donker val je flauw: je wordt wakker bij het vuur en de helft van je rugzak is weg. Vanaf de tweede nacht komt het **Nachthert**: het rent in het donker op je af en duwt je omver, je spullen liggen om je heen (snel oprapen). Licht en het hek houden het weg; met rennen ontsnap je net, met de snelle schoenen zeker. Elke nacht komen er meer en snellere spoken, de beer komt later vaker. Bij het vuur zijn zeven nieuwe spullen te koop: grote rugzak, snelle schoenen, hengel, trommel, vuurkuil, hoog hek, tweede hut. Ouderpagina: flauwgevallen, omvergeduwd, maag.
4. **De wasstraat** in WERK groeit mee met het level van de geldmaker: vlaggen, neon, extra borstels, schuimkanon, luifel met lampjes, en op level 5 een paleis met toren en fontein.
5. **Het dorp** is groter (20 bij 14) met twee nieuwe geldmakers: de IJssalon (1 000 munten) en het Pretpark (40 000) met een draaiend reuzenrad. De les blijft kloppen: de simulator en de balanstest zijn groen. In de winkel staan de geldmakers nu vier per pagina.
6. **Stem en muziek.** Muntje kiest de levendigste Nederlandse stem op de iPad en praat met toonverschil per zin; de muziek is luider en heeft twee deuntjes (dorp en eiland) met een drum, en de nacht klinkt trager, lager en met wind.

Ook: tikken op een boom, schelp of struik doet wat de knop doet. Bewaar-codes van vóór deze ronde blijven laden.

Wil je een stem downloaden voor Muntje: Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands, kies Claire of Xander (verbeterd). Het spel pakt hem vanzelf.

## 0-vorig. Vierde ronde: Muntstad Avontuur (3 tot 5 september 2026)

Je besluit van 3 september: doorbouwen in de eigen app, richting 99 Nights in the Forest. Dat staat er nu, in zes rondes uit PLAN-V4.md, elk met een commit en tests in de cloud.

**Wat je ziet.** In STAD staat rechtsboven een knop AVONTUUR. Die brengt je per boot naar het Avontuureiland: een eiland van 96 bij 96 meter met strand rondom, een bos van honderden bomen, een meer, een heuvel met sneeuwtop en een grot, zandpaden en in het midden het kamp met het kampvuur, drie hutjes en een steiger. Je loopt er zelf rond met een joystick onder je duim, veegt rechts om rond te kijken, springt met SPRING, en de hond (of kat, of dino) draaft mee. De grote knop rechtsonder zegt steeds wat je hier kunt doen: PAK (schelpen op het strand), PLUK (bessen), HAK (hout bij bomen, met snippers), VIS (bij het meer: wachten, tikken als de dobber duikt), KAMP (verkopen en kopen bij het vuur), STOOK (hout in het vuur), BOE (de Nachtbeer wegjagen), SLAAP (in de tent). Elke 9 minuten gaat de dag over in nacht: de zon zakt, de lucht en de mist kleuren, sterren en maan komen op, het kampvuur en de lantaarn geven echt licht.

**De les blijft dezelfde.** Verzamelen is werk; verkopen bij het vuur geeft munten in dezelfde portemonnee als het dorp; de geldmakers in het dorp werken door terwijl je op avontuur bent. De bijl (60 munten) is de eerste investering die zichzelf terugbetaalt: met de hand kost een stuk hout drie tikken, met de bijl geeft één tik twee stuks. Een nacht vraagt ongeveer acht stuks hout; drie nachten beloning betalen de bijl terug. Muntje geeft dagopdrachten ("raap vijf schelpen") met een bonus.

**De nacht.** Het vuur brandt op hout. In het donker komen spoken: ze zweven naar het vuur of naar jou, blijven buiten het licht, en pakken in het donker hout uit het vuur, iets uit je rugzak of drie munten. Lantaarn, fakkels en hek houden ze weg. Elke derde nacht komt de Nachtbeer; drie keer BOE en hij keert om. Overleef je de nacht met brandend vuur, dan krijg je 's ochtends munten. Niemand gaat dood, niemand slaat; verliezen is hout of munten kwijt.

**Samen.** Op PAPA zet je het adres van jullie eigen relais en druk je op KAMER: vier plaatjes zijn de code. Op de andere iPad: START, SAMEN, de vier plaatjes tikken. Dan lopen jullie op hetzelfde eiland, zien elkaar met een naambordje (dier en nummer), zwaaien en dansen, en delen het vuur en de nacht: de eerste speler is de baas van de wereld. Er gaan geen namen over de lijn, alleen getallen. Het relais is 150 regels, draait op Cloudflare (gratis) of op een pc thuis; zie §1a.

**Op een echte iPad.** Dit is gebouwd en getest in Chromium op drie iPad-formaten (in GitHub Actions) en op een pc; op de iPad zelf moet jij de snelheid beoordelen. Het spel zet zelf schaduwen, gras en bloemen uit als het traag wordt.

**Hoe dit is gebouwd.** Claude schreef de architectuur, de besturing, de netwerkcode en de tests; Ollama (qwen3.8:27b, lokaal, nul tokens) beoordeelde de screenshots en schreef de veertien dagopdrachten van Muntje. De e2e-tests draaien sinds deze ronde in de cloud, zodat jouw pc vrij blijft.

## 0. Derde ronde: echt 3D (2 september 2026)

Je koos voor route 1: geen opgepoetste tekenlaag, maar echte 3D. Het referentiebeeld dat je gaf: Roblox zoals in Brookhaven, hotel-tycoons en Steal a Brainrot, dus gladde afgeronde plastic vormen, felle kleuren, echt licht, geen Minecraft-blokjes. Dat is nu gebouwd.

**Wat er is veranderd.** De hele tekenlaag is vervangen door Three.js (één bibliotheek, meegeleverd in de site zelf, geen internet nodig). STAD, WERK en HUIS zijn echte 3D-scènes met een zon die schaduwen werpt, wolken die over het eiland schuiven, water met golven en schuim, boten, meeuwen, palmen, heggen en lantaarns die branden. Gebouwen, huis, avatar, hoeden, pakjes, voertuigen, tuinspullen en huisdieren zijn opnieuw gemaakt als afgeronde 3D-modellen; de avatar heeft echte armen en benen die zwaaien bij het lopen. De winkelkaarten, de gebouwkaart en de knop-iconen worden uit diezelfde 3D-modellen gerenderd, dus alles is één familie. De wasstraat is een 3D-hal met draaiende borstels; de modder zit als 3D-klodders op de auto en spat weg in 3D-schuim.

**Wat hetzelfde bleef.** De economie, het sparen, de Bewaar-code, de ouderpoort, Muntje, de geluiden, de knoppen en alle tests. De spelregels die de site klein hielden zijn iets verruimd: de site mag nu 1,5 MB zijn (was 1 MB) omdat Three.js zelf 751 KB is; over de lijn is dat gecomprimeerd zo'n 200 KB.

**Op een echte iPad.** Alles is getest in Chromium op drie iPad-formaten; op de iPad zelf moet jij kijken (§6). Als een oudere iPad het zwaar heeft, schakelt het spel zelf de schaduwen en de golven een stand lager en de scherpte iets terug, zodat het soepel blijft.

**Hoe dit is gebouwd.** Claude deed het ontwerp en de code; een lokaal model op jouw desktop (qwen3.8:27b via Ollama) beoordeelde elke ronde de screenshots en gaf verbeterpunten, zonder tokens. Zie PLAN-V3.md voor de stappen en de meetlat.

## 0-oud. Wat er in de tweede ronde is gebeurd (2 september 2026)

Je vroeg twee dingen: beoordeel wat de eerste run heeft gemaakt, en til de vormgeving van "tien jaar oud" naar het niveau van een moderne blokkerige tycoon-game. Kort:

**Beoordeling.** Zeven onafhankelijke reviewers (spec-gaten, bugs, kind-UX, vormgeving, economie, PWA/iOS, tests) vonden 101 punten; elk punt is door een tweede, sceptische reviewer nagerekend, 75 bleven overeind. De mechaniek en de les stonden goed: economie, sparen/laden, offline-verdiensten, ouderpoort en de balanssimulatie klopten met de SPEC. Het grootste gat was precies wat jij zag: een platte plattegrond met emoji als plaatjes, geen diepte, geen leven, een saaie werk-scène. Daarnaast een handvol echte foutjes (zie §0.2).

**Vormgeving.** Het hele spel is opnieuw getekend als een blokkerig 3D-speelgoeddorp: een eiland met klif en branding, weg in isometrisch perspectief, gebouwen uit belichte blokken die per level groeien, een avatar met echte hoeden en pakjes, NPC-verkeer, wolkschaduwen, een 3D-wasstraat met modderspatten, een tuin waar huisdieren rondlopen, en een glossy game-UI met omlijnde letters en 3D-knoppen. Alles blijft eigen tekenwerk in code (geen plaatjes, geen webfonts, geen Roblox-materiaal), dus de app blijft klein en offline.

### 0.1 Wat je ziet

| Scherm | Vroeger | Nu |
|---|---|---|
| START | wit paneel op een groene strook | logo in game-letters, avatar-preview in 3D, het levende dorp op de achtergrond |
| STAD | platte weg-ovaal met emoji-bordjes | eiland in 3D, vijf groeiende blokgebouwen, huis, park met fontein, auto's op de weg, TE KOOP-borden met prijs en wijzende pijl |
| WERK | strepen en een zwevende auto | wasstraat-hal, natte tegelvloer, auto's in drie modellen die aan komen rijden, modderspatten, schuim, "+2" |
| WINKEL | witte kaarten met emoji | kaarten met 3D-preview van precies wat je koopt, gloeiende KOOP als je genoeg hebt, vinkje bij bezit |
| HUIS | vlak plaatje met emoji-tuinspullen | tuin in 3D met hek, pad, tuinspullen, huisdieren die rondlopen en slapen, trampoline, stickermuur |
| Popups en knoppen | platte vlakken | glanzende 3D-knoppen, munten als munt, gebouwkaart met 3D-preview |

### 0.2 Wat er is gerepareerd of toegevoegd

- Sticker "Je geld werkt harder dan jij" viel bij een langzame werker samen met de eerste geldmaker. Nu pas na minstens 10 gewassen auto's, en nooit in dezelfde seconde als de eerste-geldmaker-sticker.
- Hondenvoer was onzichtbaar. Nu tikt "−5" weg bij de portemonnee en zegt Muntje het af en toe; als het beest slaapt zegt hij dat ook.
- "Je was 1 minuten weg" en "4 uur" bij elke lange afwezigheid: nu "1 minuut", en bij langer dan 4 uur "je geldmakers werkten 4 uur door".
- Eerste keer spelen: Muntje wijst na een paar stille seconden op WERK, en de WERK-knop pulseert tot de eerste auto is gewassen.
- Winkel: huisdieren, vuurwerk en dansje staan nu op pagina 1 (was pagina 5); AAN/UIT-knop laat de stand zien in plaats van het tegenovergestelde; vergrendelde kaarten tonen kort "🔒 400" in plaats van drie regels tekst.
- Een leuke aankoop geeft confetti op de kaart; stickers op HUIS reageren op een tik en vertellen wat ze betekenen; Muntje zelf is tikbaar en herhaalt dan zijn zin.
- Tikken in WERK naast een vlek (of terwijl de auto binnenrijdt) geeft nu ook een spatje water, zodat elke tik antwoord krijgt.
- Bewaar-code: een kapotte code kon een fout gooien in plaats van "klopt niet"; na LADEN begon START opnieuw met "Kies je kleur". Beide verholpen. KOPIEER meldt nu alleen "Gekopieerd!" als het echt lukte.
- Geluid na een telefoontje of Siri (iOS zet het geluid op "onderbroken") wordt bij de volgende tik hervat; de spraak laat op Safari geen zin meer vallen na een onderbreking.
- Service worker haalt bij een nieuwe versie nooit oude bestanden uit de browsercache, en controleert op een nieuwe versie elke keer dat de app naar voren komt.
- Tekst op het canvas (prijsborden, dorpsbord) is nu minstens 20 px, zoals de SPEC eist.
- Tweede reviewronde op de nieuwe look (kind-tester, design-critic, bug-hunter, prestatiemeting, spec-check, elk punt tegengecontroleerd; 42 bevestigde punten): de wasstraat tekende op een echte iPad (2× pixeldichtheid) twee keer te groot, dat is verholpen; elk canvas werd 3,5 % te klein gemeten tijdens de schermanimatie, verholpen; Muntje's ballon staat weer boven hem in plaats van over de knoppen; de weg-lus is kleiner zodat kavels en gebouwen nooit over de stoep liggen; de flat staat vooraan zodat hij nooit onder de bovenbalk groeit; gebouwen, bomen, borden en verkeer worden als plaatje gecached en de wolken/golven schakelen zichzelf uit als een iPad geen 60 beelden per seconde haalt; verder: dieren lopen niet meer dwars door het kind, sprong- en saltohoogte kloppen, halsband van de hond, borden op dichte kavels tonen de prijs, gebouwkaart zegt 'nog 12' als het niet kan, BETER-knop draagt de prijs, uitgeschakelde spullen zien er grijs uit op de kaart, modderspatten kleiner en verder uit elkaar (en ze blijven staan tijdens een veeg, zoals iOS wil), zon weg (het licht komt van linksboven), vuurwerk-plaatje in blokstijl, stickers 66 px en 12 px uit elkaar, START toont het dorp boven het paneel.
- Tests: de kind-UX-audit controleert nu ook 12 px afstand tussen knoppen, ≥ 80 px hoge hoofdknoppen, ≥ 24 px knopletters, ≥ 36 px muntstand en de tikvlakken op HUIS en WERK. Nieuwe tests voor de ouderpoort (korte tik opent niet, RESET twee keer bevestigen, Bewaar-code laden en weigeren), voor twee stickers tegelijk (popups na elkaar) en voor de "echt offline"-test die niet meer stilletjes overslaat.

### 0.3 Bewust anders dan de SPEC, en waarom

- De winkelvolgorde is gemengd per pagina (SPEC noemt geen volgorde). Bestaande Bewaar-codes van vandaag werken daardoor niet meer; er waren er nog geen in gebruik.
- Emoji zijn alleen nog badges (🔒, stickers, 🔊) en tekst in Muntje's ballon; alle spullen, gebouwen en iconen zijn eigen 3D-blokart.

### 0.4 Wat ik in de tweede ronde bewust niet heb gedaan

- WebKit-tests draaien nog steeds niet op deze pc (Windows blokkeert de ongesigneerde WebKit-bestanden van Playwright). Controle op de iPad zelf blijft nodig, zie §6.
- De burst-variant van de simulator is aangescherpt (12 auto's per burst) maar bewijst nog steeds vooral dat de les ook bij ongelijkmatig werken overeind blijft; hij is geen tempo-meting.

## 1. Op de iPad zetten

1. Open Safari op de iPad en ga naar https://johannes-lab-tw.github.io/muntstad/
2. Tik op de Deel-knop (het vierkantje met de pijl omhoog).
3. Kies **Zet op beginscherm** en tik op Voeg toe.

Vanaf dan start Muntstad als app en werkt hij ook zonder internet. Let op twee iOS-eigenaardigheden:

- De beginscherm-app heeft zijn eigen opslag. Voortgang die in Safari is gemaakt gaat niet vanzelf mee. Speel dus vanaf het begin in de beginscherm-app, of zet de voortgang over met de Bewaar-code (PAPA-scherm).
- iOS negeert de liggende stand uit het manifest. Houd de iPad liggend; staand toont het spel "Draai je iPad".

Als beginscherm-app blijft de voortgang bewaard; in een gewoon Safari-tabblad kan Safari opslag na 7 dagen zonder gebruik opruimen. Daarom is er de Bewaar-code (§3, PAPA).

## 1a. Samen spelen: het relais

Het relais geeft alleen berichten door tussen de iPads in één kamer. Het staat sinds 5 september 2026 op Cloudflare (gratis): `wss://muntstad-relay.johannes-b0e.workers.dev`. Dat adres zit als standaard in het spel, dus op geen enkele iPad hoeft iets ingetypt te worden: PAPA → KAMER → de vier plaatjes; de andere iPads: START → SAMEN → plaatjes tikken. STOP op PAPA sluit de kamer.

Opnieuw neerzetten (na een wijziging in server/relay/worker.js): `cd server/relay`, `npx wrangler@4 deploy` (inloggen met `npx wrangler@4 login`, het Cloudflare-account is gekoppeld aan GitHub). Alternatief voor testen zonder internet:

2. **Thuis op een pc.** `node server/relay/relay.js --host 0.0.0.0 --port 4174` en op PAPA `ws://<ip-van-de-pc>:4174`. Werkt alleen op hetzelfde wifi-netwerk; Safari op de iPad accepteert ws:// naar een lokaal adres alleen als de site zelf ook via http (niet https) is geopend, dus dit is vooral voor testen.

## 2. Wat het spel leert

Eén les, zonder uitleg-tekst: **geld dat je aan het werk zet, maakt meer geld, en met dat geld koop je leuke dingen.** Werken (auto's wassen) geeft munten, maar langzaam en alleen als je zelf tikt. Een geldmaker (limonadekraam, wasstraat, pizzeria, speelgoedfabriek, flat) maakt munten vanzelf, ook als de iPad uit staat. Wie eerst geldmakers koopt, heeft daarna veel meer hoeden, huisdieren en auto's dan wie alles meteen uitgeeft. Leuke dingen kopen is de beloning, niet iets fouts. Kosten (hondenvoer) betalen de geldmakers vanzelf.

| Hij leert | Hoe het in het spel zit | Wanneer hij het merkt |
|---|---|---|
| Munten komen van werk, en handen worden moe | WERK: auto's wassen, 2 munten per auto, nooit sneller dan 30 per minuut | Eerste minuut; Muntje zegt het na 10 auto's |
| Geld kan voor je werken | GELDMAKERS in de WINKEL maken munten die je uit het gebouw ziet vliegen | Eerste kraam (20 munten) |
| Meer geldmakers → meer munten → nog meer geldmakers | Upgrades en nieuwe geldmakers; "+X per minuut" staat altijd bovenin; gebouwen groeien per level | Sticker "Je geld werkt harder dan jij!" |
| Geld werkt door als je weg bent | Bij terugkomst telt een popup op wat de geldmakers maakten (max 4 uur) | Elke keer dat hij terugkomt |
| Geld betaalt kosten | Een huisdier eet elke 2 minuten voor 5 munten ("−5" bij de portemonnee); op = het beest slaapt even | Na het eerste huisdier |
| Leuk is waar geld voor is | LEUK-tab: 38 dingen met vaste prijzen, altijd zichtbaar, met een 3D-preview | Elke leuke aankoop |
| Keuzes hebben gevolgen, fouten mogen | Beide winkeltabs staan naast elkaar; alles uitgeven mag, WERK blijft altijd | Als de portemonnee op nul staat |

## 3. Zo speel je, per scherm

- **START:** kies een kleur, naam mag leeg, tik SPEEL. De eerste tik zet ook het geluid en de stem aan (regel van iOS). Het dorp leeft alvast op de achtergrond.
- **STAD:** het eiland. Bovenin munten en "per minuut". Lege kavels hebben een TE KOOP-bord met de prijs; heb je genoeg munten, dan wijst een pijl ernaar. Tik op een gebouw voor de kaart met level, opbrengst en BETER (de upgrade). Tik op je poppetje: hij springt. Onderin WERK, WINKEL, HUIS. PAPA staat klein rechtsonder.
- **WERK:** een auto rijdt de wasstraat binnen met 3 of 4 modderspatten; tik of veeg ze weg, de auto glimt en rijdt weg, +2 munten. KLAAR brengt je terug.
- **WINKEL:** tab GELDMAKERS (kraam 20, wasstraat 120, pizzeria 400, fabriek 2 000, flat 10 000; de volgende gaat open als hij in totaal zoveel verdiend heeft) en tab LEUK (hoeden, pakjes, scooter, auto, verf, tuin, huisdieren, vuurwerk, dansjes, trampoline). Te duur? De kaart blijft staan met "nog 12" en een balkje. Genoeg? KOOP gloeit.
- **HUIS:** zijn tuin: hoed en pak op het poppetje, huisdieren die rondlopen, trampoline (tik = springen), VUURWERK, DANSJE, SALTO en de stickermuur met mijlpalen (tik op een sticker en Muntje vertelt wat hij betekent).
- **PAPA:** houd PAPA 3 seconden vast en maak de som (bijvoorbeeld 37 + 48). Daar staan de cijfers (verdiend met werk vs. geldmakers, uitgegeven aan leuk vs. geïnvesteerd, inkomen per minuut, speeltijd), drie gespreksvragen, schakelaars voor STEM, GELUID en MUZIEK, de Bewaar-code (kopieer hem naar Notities; op een andere iPad plakken en LADEN) en ALLES WISSEN (twee keer bevestigen).

## 4. Aan de knoppen draaien

Alle getallen staan in `docs/js/config.js`. Verander een getal, sla op, zet in `docs/sw.js` het versienummer één hoger (`muntstad-v5` → `muntstad-v6`), commit en push. Veilige marges:

| Knop | Nu | Wat het doet | Veilig tussen |
|---|---|---|---|
| `work.coinsPerCar` | 2 | munten per gewassen auto | 1 – 3 (hoger maakt werken te aantrekkelijk) |
| `work.minCycleMs` | 4000 | minimum tijd per auto, dus max 30 munten/min | 3000 – 6000 |
| `work.tiredAfterCars` | 10 | na zoveel auto's zegt Muntje "handen worden moe" en kan de sticker "geld werkt harder" komen | 8 – 15 |
| `makers[].price` | 20 / 120 / 400 / 2 000 / 10 000 | prijs én het moment waarop de volgende geldmaker opengaat | ±30 % per stuk, houd de volgorde |
| `makers[].income` | 12 / 50 / 150 / 600 / 2 500 (level 1) | munten per minuut per level | houd de vorm ×1 / 1,5 / 2,25 / 3,4 / 5 |
| `pet.foodCost`, `pet.foodIntervalMs` | 5 munten, elke 2 min | hondenvoer | 3 – 10 munten, 1 – 5 min |
| `offlineCapMs` | 4 uur | maximum dat geldmakers maken als de iPad uit staat | 1 – 8 uur |
| `offlinePopupMinMs` | 60 s | vanaf welke afwezigheid de popup komt | 30 – 300 s |
| `mentor.tipGapMs` | 90 s | hoe vaak Muntje ongevraagd iets zegt | 60 – 180 s |
| `papa.holdMs`, `papa.sumMin/Max` | 3 s, 23 – 69 | de ouderpoort | laat staan |
| volgorde van `fun[]` | gemengd per pagina van 8 | de winkelpagina's | verplaatsen mag; let op: Bewaar-codes onthouden de plaats in de lijst |

Na elke verandering: `npm test` draait de balanssimulatie en zegt of de les nog klopt (investeerder ≥ 3× zoveel munten aan leuke dingen, ≥ 1,5× zoveel spullen, inhaalmoment binnen 4 minuten).

Wil je iets aan de look veranderen (een gebouw, een hoed, een kleur): `ART-DIRECTION.md` beschrijft de regels (één lichtrichting, kleuren, maten) en waar elk stukje art staat.

## 5. Wat er getest is

**Unit tests (51, allemaal groen):** rekenwerk van de economie (opbrengst per tik, upgradeprijzen 40/80/160/320, vrijspelen, hondenvoer automatisch betaald, saldo nooit onder nul, 4-uur-plafond, werktempo = munten in de laatste 60 seconden met een plafond van 30 per minuut, mijlpalen in de juiste volgorde en de nieuwe regel voor "geld werkt harder", oude save-versie wordt omgezet, kapotte save geeft een schone start), stemkeuze (nl-NL eerst, dan andere nl, anders stil), de service-worker-lijst (elk bestand in `docs/` staat erin), manifest en iOS-metatags, en de balanssimulatie in vijf varianten.

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

Verhouding LEUK-munten 3,68× (eis ≥ 3×), leuke spullen 2,5× (eis ≥ 1,5×), inhaalmoment 2,8 min (eis ≤ 4 min).

**Browsertests (Playwright, 60 groen, drie iPad-formaten in Chromium):** iPad gen 7 1080×810, iPad mini 1024×768, iPad Pro 11 1194×834: geen foutmeldingen op geen enkel scherm · volledig doorspelen (start → werken tot 20 munten → limonadekraam kopen → portemonnee groeit zonder tikken → hoed kopen → hoed zichtbaar in HUIS → ouderpoort) · herladen bewaart de voortgang · gesimuleerde afwezigheid (1 uur weg = 720 munten; 5 uur weg = precies het plafond van 4 uur = 2 880) · echt offline (server uitgezet, spel laadt uit de cache) · manifest en iconen bereikbaar · kind-UX-audit op elk scherm (tikdoelen ≥ 64×64 zonder overlap en ≥ 12 px uit elkaar, hoofdknoppen ≥ 80 px, knopletters ≥ 24 px, muntstand ≥ 36 px, alle tekst ≥ 20 px, geen Engelse woorden) · ouderpoort (korte tik opent niet, som fout = nieuwe som, RESET twee keer bevestigen, Bewaar-code laden en weigeren) · twee stickers tegelijk komen na elkaar · staand scherm toont "Draai je iPad".

**Twee beoordelingsrondes.** Ronde 1 (eerste run): kind-tester en economie-check, twintig punten, verwerkt. Ronde 2 (deze run): zeven reviewers plus een sceptische tegencontrole per punt, 75 bevestigde punten; de vormgevingspunten zijn opgelost door de nieuwe look, de rest staat in §0.2.

**Screenshots:** `screenshots/chromium-ipad-gen7/`, `screenshots/chromium-ipad-mini/`, `screenshots/chromium-ipad-pro11/` (13 per formaat: start, stad, Muntje pratend, werk, winkel ×2, huis, poort, papa, staand, sticker-popup, huis met hoed, weg-geweest-popup). Ik heb ze zelf bekeken op alle drie de formaten.

**WebKit (≈ Safari) kon op deze pc niet draaien:** Windows blokkeert de ongesigneerde WebKit-bestanden van Playwright via het toepassingsbeheerbeleid. Op een andere machine: `WEBKIT=1 npm run test:e2e`. De echte Safari-check doe je op de iPad, zie §6.

## 6. Zelf even checken op de iPad

1. **Stem:** tik op SPEEL; Muntje moet "Hoi …! Ik ben Muntje" zeggen met een Nederlandse stem. Geen stem? Instellingen → Toegankelijkheid → Gesproken content → Stemmen → Nederlands → een stem downloaden (bijvoorbeeld Xander). Zonder Nederlandse stem blijft het spel stil en werkt alles verder gewoon.
2. **Geluid en muziek:** de zijschakelaar van de iPad (stil) dempt ook het spel. Uitzetten kan in PAPA. Na een telefoontje of Siri: één tik en het geluid loopt weer.
3. **Beginscherm:** na "Zet op beginscherm" start hij zonder Safari-balk. Houd de iPad liggend.
4. **Offline:** zet wifi uit en open de app: hij moet gewoon starten.
5. **Weg geweest:** leg de iPad 10 minuten weg met minstens één geldmaker; bij terugkomst komt "Terwijl je weg was…".
6. **Tempo:** het dorp en de wasstraat moeten soepel bewegen (auto's, munten, wolken). Het dorp meet zichzelf: haalt een iPad geen 60 beelden per seconde, dan zet hij de golven en wolkschaduwen uit. In Chromium met 4× vertraagde processor (grofweg een iPad uit 2019): STAD 29, HUIS 55, WERK 60 en WINKEL 60 beelden per seconde; op de iPad zelf is het canvas versneld door de grafische chip, dus daar verwacht ik meer. Hapert het toch, zeg het.

## 7. Wat (nog) niet kan, en Volgende versie

Bekende beperkingen:
- Werken blijft altijd lineair; dat is expres (de les).
- Muntje spreekt alleen als de iPad een Nederlandse stem heeft.
- De Bewaar-code is lang (ongeveer 150 tekens); kopiëren naar Notities werkt het best.
- WebKit-tests konden hier niet draaien (zie §5).
- De beginscherm-app en Safari delen geen opslag (zie §1).

Volgende versie (bewust weggelaten voor een afgemaakte versie):
- Meer geldmakers na de flat en meer levels.
- Vaste WERK-baantjes naast auto's wassen (bijvoorbeeld pizza's bezorgen).
- Een tweede kind/profiel op dezelfde iPad.
- Seizoensdingen (sneeuw, Sinterklaas) in de tuin.
- Dag-en-nacht ook in het dorp (lampen aan, ramen verlicht); op het Avontuureiland is het er al.
- Een tweede eiland per boot (de vuurtoren), meer dieren, en spoken die ook bij gasten in de kamer stelen.
- Kampupgrades die je ziet vanuit het dorp, en een boot die echt vaart.
- Een echte iPad-meting van de framerate op het eiland (nu alleen Chromium).

## 8. Later iets veranderen

Open een terminal in `C:\Claude_code\Geldspel` en start Claude Code (`claude`). Vraag gewoon: "Maak de wasstraat 20% goedkoper en voeg een brandweerauto toe aan LEUK." `claude --continue` pakt de vorige sessie op; SPEC.md, PROGRESS.md en ART-DIRECTION.md staan in de map. Tests: `npm test` en `npm run test:e2e`. Screenshots van elk scherm: `node scripts/dev-shot.mjs --seed rich` (met een draaiende `npm run serve`). Deployen: versienummer in `docs/sw.js` ophogen, `git commit`, `git push`; GitHub Pages zet het binnen een paar minuten live.

Node staat op deze pc als losse map in `C:\Users\jgsno\.local\node` (in je PATH gezet; nieuwe terminals zien hem). Wil je hem "netjes" installeren: `winget install OpenJS.NodeJS.LTS` in een terminal als beheerder, dat mag ernaast.
