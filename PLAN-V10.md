# PLAN-V10 — Muntstad: Samen (18 september 2026)

Besluit van Johannes, 18 september 2026, na PLAN-V9 (v9.8 live): "Gasten die schieten moet werken, je doet het
gezamenlijk, anders is er niks aan. Dus kampvuur enzovoort moet allemaal met elkaar gelijklopen." Dat is de eerste stap
van dit plan. De rest volgt uit zijn MELD-code op v9.8, zijn oordeel over Muntjes stem en de punten van zijn zoon.

## A. Samen vechten (V10.1)

Tot v9.8 kon een gast in SAMEN SPELEN lopen, stoken, BOE roepen en gered worden, maar de nacht was van de host: wolven,
piraten en de baas bestonden alleen daar, een gast zag alleen spoken en één beer en had BOE als enige wapen.

- **De host is de spelleider.** Alles wat leeft op het eiland leeft bij de host: wolven, spoken, beren, piraten, de baas,
  het vuur, het weer en de boot. Vier keer per seconde gaat één compact bericht (`world`) naar iedereen: fase, vuur,
  weer, boot, en per vijand plek, levens en of hij vlucht (`docs/js/samen-wereld.js`, puur, met unit-tests). Gasten
  spiegelen ze met dezelfde modellen, zien de baasbanner met hartjes en de schemerbanner (`plan`), de regen en de boot.
- **Vijanden kiezen de dichtstbijzijnde speler.** Wolven cirkelen om wie het dichtst bij is en bijten die; een beet bij
  een gast is een `bump` naar die gast (zijn rugzak valt bij hem op de grond). Spoken stelen bij wie in het donker het
  dichtst bij is (`steal` naar die gast). Piraten, beren en de baas willen het vuur, dat was al gedeeld.
- **Iedereen schiet met zijn eigen wapens.** Een gast ziet bij een vijand in bereik zijn eigen wapen, het schot vliegt
  bij hem en gaat als `schiet` (soort, nummer, wapen) naar de host. De host keurt (bekend soort, echt wapen, het wapen
  past bij het soort, de schutter staat ongeveer in bereik) en telt de treffer; de buit gaat als `buit` naar de schutter.
  Een baas verslagen is van iedereen: `baasklaar` geeft elke speler de munten en de hoed. Piratengoud ook.
- **BOE van een gast** jaagt de vijand weg die naast die gast staat (de host weet waar de gast staat).
- **Redden blijft** zoals in V9.4 (WEK met een reddingsdrank).
- Het relais (Cloudflare) verandert niet: het geeft alles door, de lijst met toegestane berichten staat in de client.
- Tests: unit (`samen-wereld.test.js`), e2e in samen.spec (host en gast; de gast schiet een wolf van de host neer en
  krijgt de munten; de baas van de host staat bij de gast in de banner en zijn buit komt bij beiden). Drie iPads tegelijk
  is Johannes' proef.

## B. Volgt uit de test van Johannes en zijn zoon

Open uit PLAN-V9, in volgorde van waarschijnlijke waarde: held en gebouwen als GLB; mist en gloed; spaardoel met
spaarvarken; de trucs van de bazen; intro-filmpje (65 credits, ffmpeg nodig voor ≤ 4 MB); weektabel in de simulator.

## Meetlat

- Twee iPads: de gast ziet elke vijand van de host binnen een halve seconde op dezelfde plek, schiet met zijn eigen
  wapen, krijgt zijn buit; de baas valt voor beiden tegelijk.
- Drie iPads: hetzelfde, en het tempo op de zwakste iPad blijft binnen de MELD-doelen (p50 ≤ 17 ms op tier ≤ 1).
- Kind-UX-audit groen; geen knop in het midden; geen nieuwe tekst zonder stemtweeling.
