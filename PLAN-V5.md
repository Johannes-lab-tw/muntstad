# PLAN-V5 — Spannender: wat zijn zoon vroeg (5 september 2026)

Na de iPad-test van 5 september. Zes punten van de speler zelf, plus de open punten uit RAPPORT §7. Zelfde werkwijze als
PLAN-V4: kleine bestanden, elke stap een commit, e2e in GitHub Actions, Ollama voor bulkinhoud en screenshots,
de lokale criticus kijkt mee. Motto van Johannes: "hij huilt niet zo snel, dus het mag spannender."

## De punten (in de woorden van de speler → wat we bouwen)

1. **"De grot is te klein en saai."** Een langere gang met een bocht, een grote kamer met de kist, vleermuizen die
   opvliegen, druppelend water, en een **grotspook** dat naast de kist slaapt: pak je de schat, dan wordt het wakker
   en jaagt het je naar de uitgang. Haalt het je in, dan pakt het schelpen uit je rugzak. Buiten is het weg.
2. **"Bomen vallen niet om."** Na het laatste stuk hout valt de boom echt om (van je af), met een plof en extra hout;
   er blijft een stronk staan en na anderhalve minuut groeit er een nieuwe boom.
3. **"Avontuur mag uitdagender, zoals 99 Nights."**
   - **Honger.** Een etenmeter die langzaam leegloopt; bessen en vis eten (knop EET) vult hem. Leeg = je wordt traag,
     en 's nachts met een lege maag **val je flauw**: je wordt wakker bij het kampvuur en de helft van je rugzak is weg.
   - **Het Nachthert.** Een hert met gloeiende ogen dat in het donker op je afrent en je omver duwt: je rugzak
     valt open en de spullen liggen om je heen; snel oprapen voor het spook ze pakt. Licht houdt het hert weg.
   - **Elke nacht zwaarder.** Meer spoken en snellere spoken per nacht (tot een maximum), de beer vaker.
   - **Gadgets en kampupgrades** (bij het vuur, met munten): grote rugzak (60), snelle schoenen, hengel (grotere vis
     = meer munten), trommel (beer schrikt bij één BOE), vuurkuil (vuur brandt langzamer), hoog hek, tweede hut
     (slaapplek voor de gast), en de vuurtoren-boot naar het tweede eiland als eindbaas van de winkel (later).
4. **"Ik wil mijn carwash upgraden, visueel."** De wasstraat in WERK groeit mee met het level van de geldmaker
   Wasstraat: meer borstels, neonbord, vlaggen, schuimkanon, dak, lampjes; level 5 is een paleis.
5. **"Mijn eiland mag groter, met upgrades die geld verdienen."** Het dorp wordt groter (20 × 14) en krijgt twee
   nieuwe geldmakers na de flat: **IJssalon** en **Pretpark**, elk vijf levels, doorgerekend met de simulator zodat de
   les (investeren loont) blijft kloppen.
6. **"De stem is saai, en er mag muziek in."** Muntje praat levendiger (hogere toon, iets sneller, een betere
   Nederlandse stem als de iPad die heeft); de muziek wordt echt een deuntje: een dorpsthema en een
   avontuurthema, en de nacht klinkt anders dan de dag.

Open punten uit RAPPORT §7 die meegaan: tikken op dingen in de wereld naast de contextknop; dag-en-nacht ook in het
dorp (lampen aan) als het past.

## Rondes

- **V5.1 Bomen en tikken.** Vallende bomen met stronk en hergroei; tikken op een boom/schelp/struik/kist = actie.
- **V5.2 De grot.** Gang met bocht, kamer, vleermuizen, druppels, grotspook met achtervolging.
- **V5.3 Uitdaging.** Honger en EET, flauwvallen, Nachthert, zwaarder per nacht, gadgets en kampupgrades.
  Balans in de unit-tests: een gemiddelde speler haalt nacht 1 en 2, nacht 3 vraagt de bijl of de fakkels.
- **V5.4 Wasstraat.** WERK-hal per level 1-5.
- **V5.5 Dorp.** Groter eiland, IJssalon en Pretpark met vijf levels (Ollama maakt varianten, Claude keurt),
  simulator en balance-test bijgewerkt.
- **V5.6 Stem en muziek.** Stemkeuze en toon; twee thema's; nachtvariant.
- **V5.7 Afwerking.** PAPA-cijfers (honger, flauwvallen, hert), RAPPORT, README, CI groen.

## Regels die blijven

Geen geweld, niemand gaat dood: flauwvallen en omver geduwd worden is het ergste, en je bent alles morgen weer
kwijt of terug. Verliezen kost hout, schelpen of munten, nooit vooruitgang in het dorp.
