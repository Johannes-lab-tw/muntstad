# PLAN-V7 — Kind-eerst: het eiland leesbaar zonder te lezen (13 september 2026)

Aanleiding: de iPad-test van Johannes en zijn zoon (6, ervaren gamer) op 7 september. Twee uitkomsten: **Samen spelen
werkt.** En: **STOOK deed niks bij een volle rugzak en zei "Je hebt geen hout."** Johannes: "dit kan voor een ervaren
gamer van 6 jaar nog vele malen beter qua werking en lay-out, UX enzovoort." Dit plan is de beoordeling van dat scherm
plus de stappen. Zelfde regels als altijd (SPEC §1): Nederlands, één woord per knop, geen tekstinvoer, eigen art.

## A. De fout van 7 september (V7.1, gedaan)

**Oorzaak.** Het vuur brandt in breuken (0,4 stuk per minuut overdag). Bij 399,6 van 400 stuks rondde `stokeFire` de
resterende ruimte naar beneden af naar 0 stuks, gebruikte dus niets, en de enige melding voor "niets gebruikt" was
`noWood`. Zo ontstond precies wat de zoon zag: één stuk erin (398,6 → 399,6), daarna "Je hebt geen hout" met 38 stuks
in de rugzak. Tweede fout, alleen voor de gast in Samen: het vuur van de host werd bij de gast afgekapt op 100 stuks
(`Math.min(100, d.f)`), terwijl het maximum 400 is; een vreugdevuur (level 5) zag de gast als level 4.

**Oplossing (nacht.js, ui/avontuur.js, 3d/scene-eiland.js, i18n.js).**
- `stokeFire`: de laatste breuk ruimte telt als een heel stuk (`ceil`), en het antwoord zegt waarom er niets in ging:
  `reason: 'hout'` (rugzak leeg) of `'vol'` (vuur vol). Nieuw: `canStoke()` — hout in de tas én minstens een half stuk
  ruimte, zodat STOOK niet flikkert zodra een vol vuur een kruimel opbrandt.
- STOOK-knop volgt `canStoke`; de melding is `lines.fireFull` ("Het vuur is vol! Bewaar je hout voor vannacht.") of
  `lines.noWood`, nooit meer de verkeerde.
- Gast ziet het hostvuur tot `fireMax`.
- Tests: unit (nacht.test.js: breuk, reden, knopregel) en e2e (eiland-nacht.spec.js: het exacte iPad-scenario met
  399,4 stuks en een grote rugzak met 38 hout).

## B. Beoordeling van het eilandscherm voor een zesjarige (de foto van 7 september)

Wat er op het scherm stond: 5 HUD-pillen links boven elkaar (munten, per minuut, rugzak+vuur+eten+warmte, dag +
hoofdstuk, ketenstap), een tekstballon van twee regels, twee tekstwegwijzers, en **negen knoppen**: ZWAAI, DANS, EET,
STOOK, SPRING, KAMP, DORP, SAMEN plus de kaart. Voor een kind dat nog niet leest is dat te veel tekst en te weinig
hiërarchie. De punten, in volgorde van belang:

1. **STOOK is de belangrijkste actie bij het vuur en staat als vierde in een rij emotes.** ZWAAI en DANS wegen even
   zwaar als overleven. → Eén grote, gloeiende STOOK-knop met een 🪵-plaatje naast KAMP; ZWAAI/DANS achter één
   smiley-knop (uitklap). EET alleen als het kan (is al zo), maar dan groot.
2. **Het vuur is niet te zien.** De houtstapel is een reusachtige tipi die het figuurtje verbergt; de vlam is een
   klein oranje gloeipuntje. Level 5 is alleen in de HUD te lezen ("🔥 5"). → Kleinere, nette stapel; vlam die met
   het level meegroeit (level 5 = vreugdevuur met vonken en gloed op het gras); bij STOOK springt "+3 🪵" uit het
   vuur, niet uit het midden van het scherm. Vuurlevel als vijf blokjes boven het vuur in de wereld.
3. **Vijf tekstpillen links.** "38 584 414" en "+47 661 per minuut" zeggen een zesjarige niets op het eiland; dag,
   hoofdstuk en ketenstap zijn drie regels tekst. → Eén muntpil, drie ronde plaatjesmeters met ring (🔥 🍎 🌡️),
   rugzak als één knop met vier plaatjes en badge, opdracht als één plaatjeskaart met vinkje. Alles wat tekst is,
   ingeklapt tot je tikt (V7.0 doet dit al voor campagne en keten; doortrekken naar de rest).
4. **De mentor praat in zinnen.** "Je hebt geen hout. Hak wat bij de bomen." is twee regels; het kind kijkt naar
   het luidsprekertje. → Ballon met plaatje (🌳🪓) en hooguit drie woorden ("Hak bij bomen"), stem spreekt de hele zin.
5. **Wegwijzers in tekst (MEER →, ← GROT).** → Plaatje per bestemming (🌊, 🕳️) op het bord, tekst eronder klein.
6. **Knoppen zonder systeem.** Rechts: SAMEN (paars, klein), kaart, DORP (blauw, ⛵), KAMP (geel, groot), SPRING
   (groene cirkel). → Drie gelijke plaatjesknoppen gestapeld (⛺ KAMP, ⛵ DORP, 👥 SAMEN), SPRING als enige ronde
   knop, actieknop (PAK/HAK/VIS) altijd op dezelfde plek en het grootst.
7. **Feedback per tik.** Een tik op STOOK moet altijd iets laten zien: vlam die opflakkert, stapel die groeit,
   geluid, getal dat uit de tas naar het vuur vliegt. Nu: alleen zwevende tekst midden in beeld.

## C. Stijlkeuze van Johannes (13 september, avond)

Johannes koos uit de zes Higgsfield-concepten de twee met de foto als referentie: **"het vuur als held"** (ronde
plaatjesknoppen met dikke donkerblauwe rand, ringmeters 🔥🍎🌡️, één grote gloeiende STOOK naast het vuur, wegwijzers
met plaatje, kaart rechtsboven) en **"rugzak en mentor"** (rugzakknop met vier tegels en vulring, ballon met plaatje
en drie woorden, zon/maan-wijzer, drie gelijke plaatjesknoppen rechts, ronde SPRING). Zijn regel erbij:
**"Knoppen moeten tijdens het spelen niet te veel in de weg zitten."** Vraag: hoe passen we dit toe op het hele
spel, in samenwerking met Higgsfield?

### C.1 Wat we overnemen (en wat niet)

- **Wél, overal:** de UI-taal. Ronde plaatjesknoppen (icoon boven, één woord eronder), dikke inkt-rand
  (`--ink`, 4 px) met glans, ringmeters in plaats van balken, tegels met badge in plaats van tekstregels, korte
  mentorballon met plaatje. Kleuren blijven het bestaande palet (goud/blauw/groen/paars/oranje uit style.css).
- **Wél, in de wereld:** de compositielessen. Eén held per scherm (het vuur op het eiland, de auto in WERK), dingen
  die iets betekenen zijn groot en zichtbaar (vlam per level, hout boven het vuur), borden met plaatjes, warm
  licht (lantaarn bij de hut), meer detail bij het kamp (tent, hut, houtstapel, kruk), rijker gras en wat rotsen.
- **Niet:** de Minecraft-blokjes. ART-DIRECTION §11 zegt bewust "geen voxelkubussen" en de tweede afbeelding is
  onmiskenbaar Minecraft-achtig (kubushoofd, grasblokken). Twee redenen om daar weg te blijven: regel 5 (eigen
  art, geen look-alike van een merk; voor Minecraft geldt hetzelfde als voor Roblox) en de bouwkosten (terrein,
  bomen, gebouwen en avatar zijn allemaal "afgeronde plastic" en zouden opnieuw moeten). De wereld blijft dus
  rond plastic, maar chunkier en warmer. Als Johannes tóch de blokjeswereld wil, is dat een aparte ronde (V8) met
  een eigen beslissing over regel 5.
- **Niet:** Higgsfield-plaatjes als game-asset. Regel 4 (geen externe afbeeldingen, alles eigen code) en de
  1,5 MB-grens van docs/ blijven. Iconen zijn **emoji** (V7.2-besluit: nul bytes, groot en scherp op de iPad, dezelfde
  plaatjestaal als de concepten); een inline SVG alleen waar geen emoji past. Higgsfield is de referentie voor de look.

### C.2 Regels voor "niet in de weg" (bindend voor elk scherm)

1. **Veilige zone:** het middelste 60 % van de breedte en 50 % van de hoogte is vrij van knoppen en panelen.
   Knoppen hangen aan de vier hoeken en de onderrand.
2. **Eén grote knop:** alleen de actie van dit moment is groot (110 px): PAK/HAK/VIS/KAMP/STOOK op het eiland,
   KLAAR in WERK, KOOP in de winkel. Al het andere is 84 px (navigatie) of 64 px (emotes, kaart, geluid).
3. **Vervagen bij bewegen:** zodra de joystick actief is, gaan de niet-actieknoppen naar 55 % dekking en het
   HUD klapt dicht (V7.0 doet dit al voor campagne en keten); stilstaan = alles weer 100 %.
4. **Groeperen:** emotes achter één smiley-knop (uitklap naar links, sluit na 4 s); SAMEN en de kaart samen
   rechtsboven; de rugzak als één knop die openklapt tot vier tegels.
5. **Niets verspringt:** een knop houdt zijn plek (zichtbaarheid, niet display), zoals sinds V6.1 bij PAK/DORP.
6. **Ballon boven, kort:** de mentorballon staat bovenin het midden, plaatje + hooguit drie woorden, verdwijnt na
   4 s; de stem zegt de hele zin. Bij een gevaar (spook, beer) blijft hij staan tot het voorbij is.

### C.3 Zo werken we met Higgsfield (de loop)

Higgsfield kan de beelden niet in de game zetten en Claude kan ze in de Claude-Code-sessie niet bekijken (het
downloaddomein is geblokkeerd). De loop die werkt:

1. Claude maakt screenshots van het echte scherm (`scripts/dev-shot.mjs`) en laat Higgsfield ze **herschetsen** in
   de gekozen stijl (GPT Image 2.5, 1 credit per beeld, met de gekozen concepten als tweede referentie).
2. Johannes kijkt in de galerij en **plakt de gekozen beelden in het gesprek** (zoals op 13 sep); dan ziet Claude
   ze ook.
3. Claude bouwt het in eigen CSS/SVG/Three.js, maakt screenshots, en legt die naast het Higgsfield-beeld; de lokale
   criticus (`lokaal.py`) noemt de vijf grootste verschillen. Johannes test op de iPad.
4. Per scherm één PR, CI groen, Johannes merget (of Claude na "merge").

Gemaakt op 13 sep (jobs in de galerij): STAD (0ae6c817…), WINKEL (c3d38fb8…), WERK (d22cfc5b…), HUIS (6a97783c…)
in de gekozen stijl, plus een **stijlgids-blad** (3a76151f…) met knoppen in drie maten, ringmeters, 16 iconen,
ballon en kaarttegel. Dat blad is de meetlat voor de SVG-iconen en de CSS.

Wat Higgsfield verder kan, en wat we er (nog) niet mee doen: `generate_3d` maakt GLB-modellen uit een plaatje;
Three.js kan die laden (GLTFLoader, ~40 KB extra vendor), maar één hut is al 200 KB+ en docs/ zit op 1,7 MB. Pas
overwegen voor twee of drie heldprops in V8 als de grens omhoog mag. Video (trailer voor START) valt buiten de
game (regel 4, offline); wel bruikbaar als filmpje voor familie.

## D. Volgorde (elke stap één PR, screenshots + iPad-test)

- V7.1 (gedaan, live): de STOOK-fout, gastvuur tot 400, tests, sw v39.
- **V7.2 UI-kit (gedaan 13 sep):** in style.css de ronde plaatjesknop (`.btn-ico`, vier maten), ringmeter
  (`.ring`), tegel met badge (`.tile`); emoji als plaatjes; ART-DIRECTION §10 bijgewerkt. Eerst op het **eiland**: STOOK groot naast KAMP, emotes achter de smiley, rugzak als knop met
  tegels, ringmeters 🔥🍎🌡️, kaart + SAMEN rechtsboven, vervagen bij bewegen, veilige zone. Kind-UX-audit
  (≥ 64 px, geen overlap) in de e2e.
- **V7.3 STAD, WINKEL, HUIS (13 sep, in de PR; WERK-scène wacht op de keuze uit de twee nieuwe richtingen):** dezelfde kit: onderbalk met ronde plaatjesknoppen,
  AVONTUUR/DORP rechtsboven als plaatjesknoppen, winkelkaarten als tegels met grote sterren en één ronde
  KOOP/BETER, KLAAR als één grote ronde knop, emotes in HUIS als rij van vier kleine, stickeralbum met ronde
  vakken. Screenshots-galerij vernieuwen.
- **V7.4 Het vuur als held (14 sep, in de PR; STAD/WERK-accenten en rijker gras doorgeschoven naar V7.5):** het vuur als held (vlam per level, vijf blokjes
  boven het vuur, "+3 🪵" uit het vuur), kleinere nette stapel, borden met plaatjes, lantaarn bij de hut, houtstapel
  en kruk bij het kamp, rijker gras en rotsen; in WERK borstels/schuim/spatten groter; in STAD gebouwen met een
  paar accenten meer.
- **V7.5 Afronden (14 sep, gedaan):** RAPPORT §0 ronde 8, README, PLAN-V7 afgevinkt, galerij.
- **V7.6 WERK als lopende band (16 sep, gedaan):** Johannes koos op 16 september het Higgsfield-beeld "zijaanzicht als
  lopende-band-minigame" (drie trucks, grote gestreepte borstels, schuim, regenboogbogen, ring rechtsboven, één ronde
  KLAAR). Gebouwd in Three.js in de bestaande plastic stijl: `truckModel` met vier soorten, lopende band met strepen,
  wachtende/wassende/klaar-truck met zwaaiende chauffeur, borstels die sneller draaien tijdens het wassen, schuim uit
  de borstels, WASSTRAAT op de tunnelrand, vijf upgrade-levels opnieuw geplaatst. Economie ongewijzigd (2 munten,
  minCycleMs 4 s, 3-4 modderplekken). Ring `#werk-count` vult over drie trucks; vol = confetti + Muntje "Drie trucks
  schoon!". Muntje's WERK-zinnen zeggen nu "truck" en "modder". Tests: smoke/audits/live/playthrough/persistence
  groen op gen7; de audit (≥ 64 px, geen overlap, midden vrij) blijft gelden. Criticus (Ollama): vlak licht en geen
  beweging in het plaatje komen door de software-renderer en de stilstaande screenshot (op de iPad zijn er schaduwen
  en draait alles); UI-stijlbreuk en meer detail blijven punten voor later.
- **V7.7 Mentorballon kort (volgende):** regel C.2-6: plaatje + hooguit drie woorden in de ballon, de stem zegt de
  hele zin; korte vormen per zin via Ollama, met de hand nagekeken.
- **V7.8 Onderhoud:** CI met één herkansing per test en negen jobs, emoji-lettertype op de runner voor de galerij,
  bekende problemen in PROGRESS opschonen.
