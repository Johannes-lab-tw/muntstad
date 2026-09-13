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

## C. Concepten uit Higgsfield (13 september)

Drie beelden gegenereerd met de iPad-foto als referentie (GPT Image 2.5, 1 credit per stuk), als moodboard voor de
punten hierboven; **niet als game-asset** (regel 4 en 5: eigen art, geen externe afbeeldingen in docs/). Ze staan in
de Higgsfield-galerij van Johannes (jobs 29ef6db8…, 9c5b4dbb…, 071676de…; de drie zonder referentiefoto zijn
c295e955…, ebaf9ba1…, fe1f60df…):

1. **HUD kind-eerst** — muntpil + drie ringmeters, één grote STOOK, smiley voor emotes, plaatjesknoppen rechts.
2. **Het vuur als held** — vlam per level, vijf blokjes boven het vuur, STOOK-knop in de wereld naast het vuur.
3. **Rugzak en mentor** — rugzakknop met vier tegels en vulring, ballon met plaatje en drie woorden, zon met boog.

Claude kon de beelden in deze sessie niet zelf bekijken (downloaddomein geblokkeerd door de netwerkproxy); Johannes
kijkt en kiest, daarna bouwen we B.1 t/m B.7 in eigen 3D/CSS-art.

## D. Volgorde

- V7.1 (gedaan): de STOOK-fout, gastvuur tot 400, tests, sw v39.
- V7.2: B.1 + B.7 — één grote STOOK, emotes achter één knop, feedback uit het vuur (een avond).
- V7.3: B.2 — het vuur zichtbaar per level, stapel kleiner, blokjes boven het vuur (een avond, criticus erbij).
- V7.4: B.3 + B.4 + B.5 — HUD naar plaatjes, mentorballon kort, wegwijzers met plaatje (twee avonden).
- V7.5: B.6 — knoppensysteem rechts, kind-UX-audit (≥ 64 px, geen overlap), screenshots, RAPPORT.
