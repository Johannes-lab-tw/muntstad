# PLAN-V6 — Eén wereld, een nieuwe top, en de campagne "De verdwenen munten" (5 september 2026)

Besluiten van Johannes, 5 september 2026, na de tweede iPad-test: eerst de drie fouten, dan het spel een maat groter
(zijn zoon heeft zes miljoen munten en alles gekocht; hij wil door het dorp lopen), dan een campagne van zeven
hoofdstukken met een echte eindbaas. Alles blijft staan: munten, geldmakers en spullen gaan mee. Na het einde speel je
door met dagopdrachten en een wekelijkse gouden dag. Zelfde werkwijze als V4/V5: kleine bestanden, een commit per
stap, e2e in GitHub Actions, Ollama voor bulkinhoud en screenshots, de lokale criticus kijkt mee.

## A. De drie fouten (V6.1, één avond)

1. **Haperen bij de eerste stappen op het eiland.** Oorzaak: de eilandscène wordt pas gebouwd bij de tik op AVONTUUR
   en de videokaart compileert de shaders zodra iets voor het eerst in beeld komt, precies tijdens de eerste stappen.
   Oplossing: het eiland bouwen terwijl je nog in STAD staat (in stille tijd, na ~2 s), `renderer.compile()` vooraf en
   twee warm-up-frames buiten beeld. Meetlat: geen zichtbare hik meer bij het eerste lopen (frametijden in dev-shot).
2. **Het kampvuur-scherm.** Het paneel erft de stijl van de sticker-popup (max 780 px, alles gecentreerd): de
   verkoopkolom valt eruit, teksten breken per woord af, de onderste spullen zijn niet te bereiken. Wordt een echt
   scherm zoals WINKEL: tabbladen VERKOPEN en KOPEN, grote kaarten met plaatje (uit het 3D-model), prijs en één
   KOOP/VERKOOP-knop, pijltjes per vier, DICHT rechtsonder. Zelfde kind-UX-audit als de winkel (knoppen ≥ 64 px,
   geen overlap).
3. **PAK of PLUK schiet terug naar het dorp.** Oorzaak: na de actie verdwijnt de actieknop, DORP zakt naar de plek
   waar de vinger nog staat, en de klik van dezelfde tik landt op DORP. Oplossing: de actieknop houdt zijn plek
   (onzichtbaar in plaats van weg), DORP negeert een tik binnen 500 ms na een actie, en een e2e-test die dit naspeelt.

## B0. Avontuur: echt overleven, en samen (V6.2, de kern)

Johannes, 5 september: "In 99 Nights moet je echt met elkaar overleven en kun je elkaar zien. Dat mist hier compleet;
avontuur is saai en klein." Dit is het hart van V6, vóór het dorp.

**Groter.** Het Avontuureiland wordt vijf keer zo groot (480 × 480 m) met vijf gebieden die elk anders voelen: het
strand en het kamp (veilig), het dennenbos (hout, spoken), het moeras (veenhout, kikkers, mist, je zakt weg als je
stilstaat), de sneeuwberg (kou, klimschoenen, de munt op de top) en de ruïne (een verlaten dorpje met kisten en de
schaduwwolven). Dag 8 minuten, nacht 5 minuten. Plekken om te ontdekken: een waterval, een oude mijn, een verlaten
hut, een tweede kamp dat je kunt bouwen. Techniek: de wereld in **tegels van 60 × 60 m** (64 tegels) waarvan alleen
de negen rond de speler geladen zijn (terrein, bos, dingen), instancing per tegel, mist op 90 m, maximaal vier
lichten in beeld; zo blijft de iPad gen 7 op 60 fps ondanks de omvang. De hoogtekaart en de plaatsing blijven puur en
deterministisch (unit-tests per tegel).

**Het vuur heeft levels.** Hoe meer hout erin, hoe groter: level 1 (tot 20 hout) een kampvuurtje, level 2 (50) een
vuur met stenen kring, level 3 (100) een vuurkorf waar je op kunt koken (vis geroosterd = dubbele voeding), level 4
(200) een vuurtoren-achtig baken dat de halve nacht licht geeft, level 5 (400) een vreugdevuur dat het hele kamp
verlicht en de beer op afstand houdt. Het vuur brandt per level meer hout per nacht; zakt het onder de grens, dan zakt
het level. Zichtbaar in het model, het licht, het geluid en de HUD.

**Opdrachten die iets vragen.** De dagopdrachten van V4 ("raap vijf schelpen") waren te simpel. Muntje geeft nu
**ketens** met stappen en een beloning die pas aan het eind komt: "Bouw een tweede kamp: 20 hout, 6 stenen, een
vuur, en overleef er een nacht", "Vóór het donker: vang drie vissen, kook ze, en breng er een naar de hut in het
moeras", "Vind de waterval, de mijn en de ruïne" (ontdekken), "Overleef nacht 5 zonder dat een spook iets pakt"
(uitdaging). Elke keten heeft een kaartje op het scherm met de stappen afgevinkt. Ollama schrijft de ketens uit een
formaat met drie voorbeelden; een unit-test controleert dat elke keten haalbaar is met wat op het eiland ligt.

**Echt overleven.** Naast honger komt **kou**: 's nachts daalt je warmte weg van vuur of fakkel; onder een kwart
loop je traag en bibbert het beeld, bij nul val je flauw (zoals honger). Het vuur is dus geen decor maar de reden om
terug te komen. Hout raakt op in de buurt van het kamp (bomen groeien langzamer terug), dus je moet verder het bos in.
Gevaar groeit per nacht zoals in 99 Nights: nacht 1 twee spoken, nacht 3 het hert, nacht 5 de schaduwwolven (een
roedel die je omsingelt en je rugzak leegschudt; licht en lawaai jagen ze weg), nacht 7 de berenfamilie. Een
**nachtteller** op het scherm ("Nacht 4") en op de ouderpagina; verliezen betekent: hout en de helft van de munten in
de rugzak kwijt en de nacht opnieuw. Een tweede kamp bouwen (hout + stenen) geeft een tweede veilige plek.

**Samen, zichtbaar.** Samen spelen wordt de standaard weg, niet een ouderinstelling: op het eiland staat een knop
SAMEN; de eerste speler ziet vier plaatjes, de anderen tikken ze na. Iedereen ziet elkaar met naambordje en dier, ziet
elkaars lantaarn en zaklamp, en hoort elkaar (emotes met geluid: ZWAAI, DANS, KOM, HELP). Wat je samen kunt dat alleen
niet kan: een flauwgevallen vriend wakker maken (WEK), samen een boomstam dragen (twee spelers = een hele stam = 10
hout), de beer wegjagen met twee lantaarns, en de spoken stelen ook bij gasten (nu alleen bij de gastheer). Gedeeld:
het vuur, de nacht, de nachtteller, de kisten; ieder zijn eigen rugzak en munten. Het relais staat al op Cloudflare.

**Meetlat.** Zoon en papa halen samen nacht 5 in één avond en willen door naar 7.

**V6.2b Vormgeving een stap vetter.** Avontuur krijgt een eigen gezicht: een titelscherm met logo en de boot, een
HUD met de nachtteller groot in beeld, warmte en honger als ringen om de knoppen, een minimap in de hoek, een donkere
rand die opkomt als je bevriest of honger hebt, opdrachtkaarten met afvinkstappen, en overgangen (de overtocht, de
zonsopgang met muziek). De frontend-design-skill en de lokale criticus doen de beoordeling; de kind-UX-regels
(knoppen ≥ 64 px, één woord, Nederlands) blijven.

## B. Eén wereld (V6.3 t/m V6.5)

**V6.3 Het loopbare dorp en de haven.** Het dorpseiland wordt drie keer zo groot (60 × 40 m) met straten, stoepen,
zebrapaden, het park met de fontein, het plein met Muntje's standbeeld, en een haven met steiger. Je loopt er zoals op
het eiland (zelfde `player.js`/`controls.js`), de hond loopt mee, NPC's wandelen en auto's rijden (en remmen voor je).
Tikken op een geldmaker opent de bestaande gebouwkaart (BETER, cijfers); tikken op de winkel opent WINKEL; je huis
kun je binnenlopen (HUIS wordt de binnenkant met de stickermuur en de tuin erachter). De vogelvlucht-STAD blijft als
**KAART** (knop rechtsboven) om snel te kopen en te zien wat er gebeurt. De knop AVONTUUR verdwijnt: in de haven ligt
de boot; VAAR laat je de overtocht zien (30 s zeilen met dolfijnen) en zet je op de steiger van het Avontuureiland.
Teruggaan: de boot op het eiland. Bewaar-codes en saves blijven geldig.

**V6.4 De economie krijgt weer een top.**
- Levels 6 t/m 10 voor elke geldmaker, zichtbaar in het model (neon, gouden dak, sterren) en in de inkomenstabel
  (dezelfde vermenigvuldigers doorgetrokken: ×7,5 / 11 / 17 / 25 / 38).
- Drie geldmakers boven het Pretpark: **Hotel** (200 000, 40 000/min), **Haven** (1 miljoen, 150 000/min),
  **Raketbasis** (5 miljoen, 600 000/min), elk met vijf (later tien) levels; de simulator en de balanstest bewaken de
  les (investeren loont, de spaarder haalt de uitgever in).
- **Showspullen** voor wie alles heeft: gouden standbeeld van jezelf op het plein (250 000), jacht in de haven
  (1 miljoen), vuurwerk elke avond (100 000), gouden hoed (500 000), eigen straatnaam (2 miljoen).
- **De Spaarbank** op het plein: munten die je wegzet groeien elke dag met een percentage (config: 5 % per dag,
  gemaximeerd), ophalen wanneer je wilt. De tweede les: geld dat groeit terwijl je slaapt. Muntje legt het uit met een
  pot die elke ochtend voller is; de ouderpagina toont "rente verdiend". Kind-veilig: geen schuld, geen verlies.

**V6.5 De boot en de Vuurtoren.** Het tweede eiland (80 × 80 m): een verlaten vuurtoren op een rots, een moeras met
kikkers, een donker dennenbos, een verlaten hut met een kist, en 's nachts spoken die het licht van de vuurtoren
stelen. Nieuw materiaal: veenhout (meer vuur), moerasbessen, de gouden vis. De boot vaart tussen haven, Avontuureiland
en Vuurtoren; op zee geen spoken.

## C. De campagne "De verdwenen munten van Muntstad" (V6.6 en V6.7)

Muntje's vrienden, zeven gouden munten, zijn over de eilanden verspreid. Elk hoofdstuk levert er één op en opent iets
nieuws. Elk hoofdstuk is een avond van ongeveer twintig minuten. De voortgang staat in `state.campagne` (hoofdstuk,
gehaald, pogingen) en in de Bewaar-code; op de ouderpagina staat "waar was hij".

1. **Het kamp.** Overleef de eerste nacht met een brandend vuur. (Bestaat; wordt hoofdstuk 1 met Muntje's verhaal.)
2. **De grot.** Haal de munt uit de kist en kom buiten zonder dat het grotspook je pakt.
3. **Het meer.** Vang de gouden vis (zeldzaam: 1 op 6 met de hengel, nooit zonder).
4. **De heuvel.** Koop klimschoenen (sneeuw wordt loopbaar), klim naar de top; daar ligt een munt in de sneeuw en
   waait het zo hard dat je niet mag stilstaan.
5. **De overtocht.** Koop de zeilboot (2 000) en vaar naar de Vuurtoren; vind de hut en de kist.
6. **Het licht.** Drie nachten de vuurtorenlamp brandend houden met veenhout terwijl spoken het licht stelen.
7. **De Nachtberen.** Drie beren tegelijk komen naar het kamp. Echt spannend: verlies je de nacht (vuur uit of alle
   drie bij het vuur), dan zijn je hout en de helft van je munten in de rugzak weg en probeer je het morgen opnieuw.
   Winst: samen (mama en papa met lantaarns, of alleen met trommel, fakkels en hoog hek) alle drie wegjagen. Daarna is
   Muntstad gered: feest op het plein, vuurwerk, de zeven munten in een gouden kist bij het standbeeld, sticker.

**Daarna.** De wereld blijft open. Muntje geeft elke dag drie opdrachten (Ollama schrijft er honderd), elke zaterdag
is een gouden dag met dubbele beloningen, en de nachten worden langzaam zwaarder tot een vast maximum.

## D. Afwerking (V6.8)

Ouderpagina (campagne, nachtteller, spaarbank, rente), RAPPORT §0 zesde ronde, README, PROGRESS, CI groen op drie
profielen, iPad-meting door Johannes.

## Volgorde per bouwavond

| Avond | Stap | Speelbaar aan het eind |
|---|---|---|
| 1 | V6.1 fouten | Vloeiend lopen, nieuw kampvuur-scherm, PAK zonder sprong |
| 2 | V6.2 groot eiland, kou, nachtteller, wolven, SAMEN-knop, WEK, samen tillen | Echt overleven, samen |
| 3 | V6.3 loopbaar dorp + haven + boot naar het eiland | Door het dorp lopen, KAART, VAAR |
| 4 | V6.4 levels 6-10, Hotel/Haven/Raketbasis, showspullen, Spaarbank | Weer iets om voor te sparen |
| 5 | V6.5 Vuurtoren-eiland | Een tweede eiland |
| 6 | V6.6 hoofdstukken 1-4 | De helft van de campagne |
| 7 | V6.7 hoofdstukken 5-7 + doorspelen | De eindbaas |
| 8 | V6.8 afwerking | Rapport, CI groen |

## E. Avontuur als eigen game naast Muntstad: wat we voorbereiden

Besluit 5 september: Muntstad (het dorp, de les) en Avontuur worden twee spellen die elkaar kennen: dezelfde
portemonnee, dezelfde save en Bewaar-code, dezelfde ouderpoort, en de boot in de haven als deur ertussen. Avontuur
krijgt een eigen startscherm (`docs/avontuur.html`, zelfde map, zelfde service worker, zelfde origin dus zelfde
opslag), een eigen icoon op het beginscherm van de iPad, en mag groeien tot een serieuze game.

**Wat er klaar moet staan voordat we uitpakken:**

1. **Wereld in tegels** (zie B0): één keer goed neerzetten, daarna kan elk eiland zo groot worden als we willen.
2. **Inhoud als data.** Opdrachten, ketens, Muntje-zinnen, spullen en plekken in `docs/content/*.json`, met een
   unit-test die elke regel controleert (Nederlands, lengte, haalbaar). Ollama vult de bestanden in bulk, Claude
   keurt, de test bewaakt. Zo kost meer inhoud geen tokens.
3. **Meetlat in het spel.** Een verborgen fps-teller en een **MELD-knop op PAPA** die een diagnosecode kopieert
   (versie, iPad, fps, waar je was, wat de laatste vijf gebeurtenissen waren). Johannes plakt die code in het gesprek;
   dan hoef ik niet te gissen zoals bij de PAK-sprong.
4. **Tests die het spel kennen.** De e2e-tests sturen het spel via `window.__muntstad` (teleport, setPhase, spawn) in
   plaats van via de klok; ze blijven daardoor snel en stabiel op de trage runner. Per eiland een eigen spec.
5. **Versies.** Elke afgeronde avond een git-tag (v6.1, v6.2, …) en de Bewaar-code blijft altijd achterwaarts
   leesbaar (unit-test met een code van elke versie).
6. **Playtest-protocol.** Elke avond dezelfde vijf minuten: nieuw spel, eerste nacht, samen spelen met twee iPads,
   Bewaar-code laden, offline starten. Wat afwijkt gaat in PROGRESS.md.

**GitHub: twee instellingen om te veranderen** (Johannes, in de browser; ik lever de workflow):
- **Pages pas na groene tests.** Nu deployt GitHub Pages bij elke push, ook als de tests rood zijn. Nieuwe workflow:
  de tests draaien eerst, en pas als alle drie de iPad-profielen groen zijn, deployt een tweede job. Daarvoor moet in
  *Settings → Pages → Build and deployment → Source* "GitHub Actions" gekozen worden in plaats van "Deploy from a
  branch". Daarna kan een rode commit niet meer live komen.
- **Overbodige runs afbreken.** Een `concurrency`-regel in de workflow breekt een oudere run af zodra er een nieuwe
  push is; scheelt wachttijd. Dat is alleen een regel in het workflow-bestand, geen instelling.
- Optioneel later: het relais automatisch naar Cloudflare deployen vanuit GitHub (een API-token als secret).
  Niet nodig zolang het relais niet verandert.

**Wat Fable 5.1, Ollama en GitHub samen aankunnen.** In de sessie van 3 tot 5 september is dit gebouwd: zes rondes
V4, de polijstronde, de grot, zeven stappen V5, met 86 unit-tests en 30 e2e-tests groen in de cloud. Per bouwavond is
een ronde van de omvang van V5.3 (honger, hert, gadgets, moeilijker) of V5.5 (groter dorp, twee geldmakers) haalbaar,
inclusief tests en screenshots. De grens ligt niet bij de tokens maar bij wat er per avond echt getest kan worden op
de iPad; daarom elke avond één speelbare stap en de MELD-knop.

## Regels die blijven

Geen geweld, niemand gaat dood; verliezen kost hout of munten, nooit vooruitgang in het dorp. Geen tekstinvoer voor
het kind, alles in het Nederlands, knoppen van één woord, alles offline na de eerste keer laden.
