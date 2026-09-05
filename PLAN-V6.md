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

**Groter.** Het Avontuureiland wordt 2,5 keer zo groot (240 × 240 m) met vijf gebieden die elk anders voelen: het
strand en het kamp (veilig), het dennenbos (hout, spoken), het moeras (veenhout, kikkers, mist, je zakt weg als je
stilstaat), de sneeuwberg (kou, klimschoenen, de munt op de top) en de ruïne (een verlaten dorpje met kisten en de
schaduwwolven). Dag 8 minuten, nacht 5 minuten. Plekken om te ontdekken: een waterval, een oude mijn, een verlaten
hut, een tweede kamp dat je kunt bouwen.

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

## Regels die blijven

Geen geweld, niemand gaat dood; verliezen kost hout of munten, nooit vooruitgang in het dorp. Geen tekstinvoer voor
het kind, alles in het Nederlands, knoppen van één woord, alles offline na de eerste keer laden.
