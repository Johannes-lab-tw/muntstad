// i18n.js — every Dutch string in one place. jij/je, short, friendly. Button labels are single capitalised words.

export const T = {
  appName: 'Muntstad',
  mentorName: 'Muntje',
  defaultName: 'kapitein',
  perMinute: 'per minuut',

  ui: {
    koop: 'KOOP',
    upgrade: 'UPGRADE',
    max: 'MAX ⭐',
    aan: 'AAN',
    uit: 'UIT',
    speel: 'SPEEL',
    top: 'TOP!',
    stad: 'STAD',
    klaar: 'KLAAR',
    nog: 'nog',
    verdienEerst: 'Verdien eerst',
    perMinuut: 'per minuut',
    level: 'Level',
    munten: 'munten',
    verderSpelen: 'VERDER SPELEN ▶',
    speelStart: 'SPEEL ▶',
    kiesKleur: 'Kies je kleur',
    naam: 'Je naam (mag ook leeg)',
    dicht: 'DICHT',
    wis: 'WIS',
    ok: 'OK',
    hoed: 'hoed',
  },

  fun: {
    spring: 'SPRING',
    vuurwerk: 'VUURWERK',
    dansje: 'DANSJE',
    salto: 'SALTO',
  },

  popups: {
    offlineTitle: 'Terwijl je weg was…',
    offlineText: 'maakten je geldmakers',
    milestoneTitle: 'Sticker!',
    buildingLevel: 'Level {n}',
    buildingIncome: '{n} per minuut',
    buildingNext: 'Level {n}: {inc} per minuut',
    buildingLocked: 'Verdien eerst {n} 🪙',
    buildingBuy: 'Koop hem in de WINKEL',
    huis: 'Dit is jouw huis!',
    huisText: 'Ga naar HUIS om te spelen.',
  },

  lines: {
    start: 'Hoi {naam}! Ik ben Muntje. Kom, we gaan munten maken!',
    welcomeBack: 'Hoi {naam}! Fijn dat je er weer bent.',
    firstWork: 'Tik op de vlekken. Elke schone auto geeft munten!',
    tired: 'Goed gedaan! Werken geeft munten. Maar je handen worden moe… Wil je iets dat munten maakt terwijl jij speelt?',
    firstMaker: 'Kijk! Je kraam maakt munten. Ook als jij niks doet!',
    newMaker: 'Nieuwe geldmaker! Die maakt munten, ook als jij slaapt.',
    upgrade: 'Nog beter! Je {ding} maakt nu {n} munten per minuut.',
    passiveBeatsWork: 'Wauw! Je geldmakers verdienen nu meer dan jij. Je geld werkt voor jou!',
    offline: 'Terwijl je weg was, maakten je geldmakers {n} munten!',
    hatBought: 'Gave hoed! Leuk hè, wat je met munten kunt doen?',
    funBought: 'Gave {ding}! Leuk hè, wat je met munten kunt doen?',
    petBought: 'Een {ding}! Die krijgt elke twee minuten eten. Je geldmakers betalen dat.',
    vehicleBought: 'Een {ding}! Kijk maar in de STAD, je gaat nu sneller.',
    notEnough: 'Nog {n} munten. Bijna!',
    notEnoughMaker: 'Nog {n} munten. Je {ding} is er bijna!',
    locked: 'Verdien eerst {n} munten. Dan kun je die kopen.',
    foodPaid: 'Je {ding} betaalt het eten van je {dier}. Handig!',
    petSleeping: 'Je {dier} slaapt even. Met munten wordt hij weer wakker.',
    walletZero: 'Op is op! Ga je werken, of wacht je op je geldmakers?',
    tipBuilding: 'Tik op een gebouw. Dan zie je wat het maakt.',
    tipAfford: 'Je hebt genoeg voor een {ding}. Kijk maar in de WINKEL!',
    tipHouse: 'Ga naar HUIS om je spullen te zien.',
    gateWrong: 'Dat klopt niet. Probeer nog eens.',
    maxLevel: 'Je {ding} is helemaal top. Level 5!',
    trampoline: 'Hoog! Nog een keer?',
    fireworks: 'Wauw, vuurwerk!',
  },

  milestones: {
    'eerste-geldmaker': 'Kijk! Je kraam maakt munten. Ook als jij niks doet!',
    'geld-werkt': 'Wauw! Je geldmakers verdienen nu meer dan jij. Je geld werkt voor jou!',
    'duizend': 'Duizend munten verdiend. Wat een kapitein!',
    'alle-geldmakers': 'Alle geldmakers van Muntstad zijn van jou!',
    'level-5': 'Level vijf! Beter kan niet.',
    'honderdduizend': 'Honderdduizend munten! Jij bent de baas van Muntstad.',
  },

  papa: {
    title: 'Voor papa en mama',
    stats: {
      earnedWork: 'Verdiend met WERK',
      earnedPassive: 'Verdiend door GELDMAKERS',
      earnedOffline: '… waarvan terwijl de iPad uit stond',
      spentFun: 'Uitgegeven aan LEUK',
      spentMakers: 'Geïnvesteerd in GELDMAKERS',
      spentFood: 'Betaald aan eten voor huisdieren',
      perMinute: 'Inkomen nu (per minuut)',
      bestWorkRate: 'Beste werktempo (per minuut)',
      playTime: 'Speeltijd',
      carsWashed: 'Auto’s gewassen',
      makersOwned: 'Geldmakers',
      funOwned: 'Leuke spullen',
    },
    starters: [
      'Wat werkt harder: jij of je wasstraat?',
      'Wat gebeurde er met je munten toen de iPad uit stond?',
      'Je krijgt 100 munten. Wat koop je? En wat maakt dat morgen?',
    ],
    toggles: { voice: 'STEM', sound: 'GELUID', music: 'MUZIEK' },
    codeCopied: 'Gekopieerd!',
    codeLoaded: 'Geladen! Veel plezier.',
    codeBad: 'Die code klopt niet.',
    hours: 'u',
    minutes: 'min',
  },
};

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/** t('lines.notEnough', { n: 12 }) → 'Nog 12 munten. Bijna!' */
export function t(key, vars = {}) {
  let s = get(T, key);
  if (typeof s !== 'string') return key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export default T;
