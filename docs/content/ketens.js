// content/ketens.js — Muntje's quest chains (V6.2): fifteen short stories of 3-5 steps with the reward at the end.
// Written by Ollama (qwen3.8:27b) from three examples on 2026-09-05, corrected by hand, checked by docs/js/ketens.js
// validateKetens and tests/unit/ketens.test.js. Order = difficulty; after the last one the chains start over.
export const KETENS = [
  {
    "id": "eerste-eten",
    "titel": "Eerste maaltijd",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "bes",
        "n": 5,
        "tekst": "Pluk vijf bessen in het bos."
      },
      {
        "soort": "eet",
        "n": 1,
        "tekst": "Eet de bessen op."
      },
      {
        "soort": "verzamel",
        "item": "schelp",
        "n": 3,
        "tekst": "Raap drie schelpen op het strand."
      }
    ],
    "beloning": 40,
    "klaar": "Je buik is vol en je hebt schelpen. Goed zo!"
  },
  {
    "id": "hout-hakken",
    "titel": "Hout verzamelen",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 5,
        "tekst": "Hak vijf stukken hout."
      },
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 5,
        "tekst": "Hak nog vijf stukken hout."
      },
      {
        "soort": "stook",
        "n": 5,
        "tekst": "Doe het hout in het vuur."
      }
    ],
    "beloning": 50,
    "klaar": "Het vuur brandt lekker fel."
  },
  {
    "id": "klaar-voor-de-nacht",
    "titel": "Klaar voor de nacht",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 10,
        "tekst": "Hak tien stukken hout in het bos."
      },
      {
        "soort": "stook",
        "n": 10,
        "tekst": "Doe tien stukken hout in het vuur."
      },
      {
        "soort": "vuur",
        "level": 2,
        "tekst": "Maak het vuur level 2."
      },
      {
        "soort": "nacht",
        "n": 1,
        "tekst": "Overleef een nacht met een brandend vuur."
      }
    ],
    "beloning": 60,
    "klaar": "Je eerste nacht met een groot vuur! Muntje is trots op je."
  },
  {
    "id": "schelpen-zoeken",
    "titel": "Schelpen op het strand",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "strand",
        "tekst": "Loop naar het strand."
      },
      {
        "soort": "verzamel",
        "item": "schelp",
        "n": 4,
        "tekst": "Zoek vier schelpen op."
      },
      {
        "soort": "verkoop",
        "item": "schelp",
        "n": 2,
        "tekst": "Verkoop twee schelpen."
      }
    ],
    "beloning": 60,
    "klaar": "Munten verdiend met schelpen!"
  },
  {
    "id": "vuur-sterker",
    "titel": "Sterker vuur",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 10,
        "tekst": "Hak tien stukken hout."
      },
      {
        "soort": "stook",
        "n": 10,
        "tekst": "Doe het hout in het vuur."
      },
      {
        "soort": "vuur",
        "level": 3,
        "tekst": "Maak het vuur level 3."
      }
    ],
    "beloning": 70,
    "klaar": "Nu kun je eindelijk koken!"
  },
  {
    "id": "vis-koken",
    "titel": "Vis bakken",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "vis",
        "n": 2,
        "tekst": "Vang twee vissen."
      },
      {
        "soort": "kook",
        "n": 2,
        "tekst": "Bak de vissen op het vuur."
      },
      {
        "soort": "eet",
        "n": 2,
        "tekst": "Eet de gebakken vis."
      }
    ],
    "beloning": 80,
    "klaar": "Lekker gegeten! Je bent sterk."
  },
  {
    "id": "grot-ontdekken",
    "titel": "De grot",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "grot",
        "tekst": "Vind de ingang van de grot."
      },
      {
        "soort": "kist",
        "tekst": "Open de kist in de grot."
      },
      {
        "soort": "verkoop",
        "item": "schelp",
        "n": 3,
        "tekst": "Verkoop drie schelpen bij het kamp."
      }
    ],
    "beloning": 90,
    "klaar": "Je vond een verborgen schat!"
  },
  {
    "id": "nacht-met-vuur",
    "titel": "Nacht overleven",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 15,
        "tekst": "Hak vijftien stukken hout."
      },
      {
        "soort": "stook",
        "n": 15,
        "tekst": "Doe het hout in het vuur."
      },
      {
        "soort": "nacht",
        "n": 1,
        "tekst": "Houd het vuur aan tijdens de nacht."
      }
    ],
    "beloning": 100,
    "klaar": "De spoken bleven ver weg."
  },
  {
    "id": "meer-ontdekken",
    "titel": "Het meer",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "meer",
        "tekst": "Loop naar het meer."
      },
      {
        "soort": "verzamel",
        "item": "vis",
        "n": 4,
        "tekst": "Vang vier vissen in het water."
      },
      {
        "soort": "verkoop",
        "item": "vis",
        "n": 2,
        "tekst": "Verkoop twee vissen."
      }
    ],
    "beloning": 110,
    "klaar": "Het meer is een goede plek."
  },
  {
    "id": "vissoep",
    "titel": "Vis op het vuur",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "vis",
        "n": 3,
        "tekst": "Vang drie vissen in het meer."
      },
      {
        "soort": "vuur",
        "level": 3,
        "tekst": "Stook het vuur op tot level 3."
      },
      {
        "soort": "kook",
        "n": 2,
        "tekst": "Bak twee vissen op het vuur."
      },
      {
        "soort": "verkoop",
        "item": "maal",
        "n": 1,
        "tekst": "Verkoop een maal bij het kamp."
      }
    ],
    "beloning": 80,
    "klaar": "Gebakken vis! Daar word je sterk van."
  },
  {
    "id": "moeras-waden",
    "titel": "Door het moeras",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "moeras",
        "tekst": "Waad door het moeras."
      },
      {
        "soort": "verzamel",
        "item": "bes",
        "n": 6,
        "tekst": "Pluk zes bessen in het moeras."
      },
      {
        "soort": "eet",
        "n": 2,
        "tekst": "Eet de bessen op."
      }
    ],
    "beloning": 120,
    "klaar": "Je hebt het moeras overleefd."
  },
  {
    "id": "ontdekker",
    "titel": "De ontdekker",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "meer",
        "tekst": "Loop naar het meer."
      },
      {
        "soort": "ontdek",
        "plek": "grot",
        "tekst": "Zoek de grot in de berg."
      },
      {
        "soort": "ontdek",
        "plek": "moeras",
        "tekst": "Waad door het moeras in het oosten."
      },
      {
        "soort": "ontdek",
        "plek": "ruine",
        "tekst": "Vind de ruïne in het westen."
      }
    ],
    "beloning": 100,
    "klaar": "Jij kent het hele eiland! Een echte ontdekker."
  },
  {
    "id": "ruine-ontdekken",
    "titel": "De oude ruïne",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "ruine",
        "tekst": "Vind de ruïne in het westen."
      },
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 10,
        "tekst": "Hak tien stukken hout voor de nacht."
      },
      {
        "soort": "nacht",
        "n": 1,
        "tekst": "Overleef een nacht met het vuur aan."
      }
    ],
    "beloning": 130,
    "klaar": "De ruïne bewaart geheimen. Later meer!"
  },
  {
    "id": "berg-klimmen",
    "titel": "De berg",
    "stappen": [
      {
        "soort": "ontdek",
        "plek": "berg",
        "tekst": "Klim de berg op."
      },
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 20,
        "tekst": "Hak twintig stukken hout."
      },
      {
        "soort": "stook",
        "n": 20,
        "tekst": "Doe het hout in het vuur."
      }
    ],
    "beloning": 140,
    "klaar": "Je was hoog op de berg. Knap!"
  },
  {
    "id": "de-vuurtoren",
    "titel": "De vuurtoren",
    "stappen": [
      { "soort": "ontdek", "plek": "vuurtoren", "tekst": "Loop naar de vuurtoren in het noorden." },
      { "soort": "kist", "tekst": "Open de kist bij de oude hut." },
      { "soort": "verzamel", "item": "hout", "n": 12, "tekst": "Hak twaalf stukken hout voor de terugweg." },
      { "soort": "nacht", "n": 1, "tekst": "Overleef de nacht bij het vuur." }
    ],
    "beloning": 150,
    "klaar": "De vuurtoren draait weer! Wat een tocht."
  },
  {
    "id": "grote-uitdaging",
    "titel": "De grote uitdaging",
    "stappen": [
      {
        "soort": "verzamel",
        "item": "hout",
        "n": 30,
        "tekst": "Hak dertig stukken hout."
      },
      {
        "soort": "stook",
        "n": 30,
        "tekst": "Doe het hout in het vuur."
      },
      {
        "soort": "vuur",
        "level": 5,
        "tekst": "Maak het vuur level 5."
      },
      {
        "soort": "nacht",
        "n": 3,
        "tekst": "Overleef drie nachten met het vuur."
      },
      {
        "soort": "verkoop",
        "item": "maal",
        "n": 5,
        "tekst": "Verkoop vijf maaltijden."
      }
    ],
    "beloning": 300,
    "klaar": "Je bent een echte overlever!"
  }
];
