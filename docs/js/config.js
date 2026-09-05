// config.js — ALL tunable numbers of Muntstad live here.
// Every price and every per-level income is an integer. Change numbers, keep the shape.

export const CONFIG = Object.freeze({
  saveVersion: 1,
  saveKey: 'muntstad.save',

  // Timing
  tickMs: 1000,                       // economy tick cadence (the loop itself works from timestamps)
  autosaveMs: 5000,                   // autosave interval
  offlineCapMs: 4 * 60 * 60 * 1000,   // earnings while away are capped at 4 hours per absence
  offlinePopupMinMs: 60 * 1000,       // an absence of at least 60 s shows the "terwijl je weg was" popup

  // WERK (washing cars). Work is linear and bounded on purpose: only coin-makers compound.
  work: {
    coinsPerCar: 2,                   // coins per washed car
    dirtMin: 3,                       // dirt spots per car (min)
    dirtMax: 4,                       // dirt spots per car (max)
    tiredAfterCars: 10,               // mentor's "hands get tired" line after this many cars (once)
    windowMs: 60 * 1000,              // work rate = best coins over a trailing 60 s window (capped by minCycleMs)
    carArriveMs: 700,                 // car drive-in animation
    carLeaveMs: 600,                  // car drive-out animation
    minCycleMs: 4000,                 // a new car never arrives sooner than 4 s after the previous one → ceiling 30 coins/min
  },

  // Costs: one gentle recurring cost, paid automatically when possible.
  pet: {
    foodCost: 5,                      // coins per meal per pet
    foodIntervalMs: 2 * 60 * 1000,    // one meal every 2 minutes
  },

  // Mentor Muntje
  mentor: {
    tipGapMs: 90 * 1000,              // at most one unsolicited line per 90 s
    speechRate: 1.02,                 // V5.6: a touch quicker; pitch varies per line in speech.js
  },

  // Avontuureiland (PLAN-V4): the backpack, prices at the campfire, tools, quests. Texts live in i18n.js.
  eiland: {
    bagMax: 30,                       // the backpack holds 30 things; sell at the campfire
    items: {
      hout:   { name: 'Hout',   icon: '🪵', price: 2 },
      schelp: { name: 'Schelp', icon: '🐚', price: 3 },
      bes:    { name: 'Bes',    icon: '🫐', price: 1 },
      vis:    { name: 'Vis',    icon: '🐟', price: 8 },
      maal:   { name: 'Maal',   icon: '🍖', price: 16 },   // a fish cooked on a level-3 fire (V6.2)
    },
    tools: [
      { id: 'bijl',     name: 'Bijl',     icon: '🪓', price: 60,  tekst: 'Elke hak geeft twee stukken hout.' },
      { id: 'lantaarn', name: 'Lantaarn', icon: '🏮', price: 80,  tekst: 'Licht in het donker. Spoken blijven weg.' },
      { id: 'hek',      name: 'Hek',      icon: '🚧', price: 150, tekst: 'Een hek om het kamp. Spoken komen er niet door.' },
      { id: 'tent',     name: 'Tent',     icon: '⛺', price: 200, tekst: 'Slaap in de tent: de nacht gaat sneller.' },
      { id: 'fakkels',  name: 'Fakkels',  icon: '🔥', price: 40,  tekst: 'Vier fakkels om het kamp. Meer licht, minder spoken.' },
      // V5.3 gadgets and camp upgrades (effects in uitdaging.js perks)
      { id: 'rugzak',   name: 'Grote rugzak', icon: '🎒', price: 120, tekst: 'Er passen 60 dingen in.' },
      { id: 'schoenen', name: 'Snelle schoenen', icon: '👟', price: 90, tekst: 'Je loopt en rent sneller dan het hert.' },
      { id: 'hengel',   name: 'Hengel',   icon: '🎣', price: 70,  tekst: 'Twee vissen per vangst.' },
      { id: 'trommel',  name: 'Trommel',  icon: '🥁', price: 110, tekst: 'Eén keer BOE en de beer is weg.' },
      { id: 'vuurkuil', name: 'Vuurkuil', icon: '🕳️', price: 180, tekst: 'Het vuur brandt langzamer op.' },
      { id: 'hoog_hek', name: 'Hoog hek', icon: '🏰', price: 250, tekst: 'Een groter hek: het hele kamp is veilig.' },
      { id: 'hut2',     name: 'Tweede hut', icon: '🛖', price: 300, tekst: 'Een hut voor wie meespeelt.' },
    ],
    bagMaxBig: 60,                    // with the big backpack
    shoesSpeed: 1.25,                 // walk and run × this with the shoes
    chop: { hands: { taps: 3, wood: 1 }, withAxe: { taps: 1, wood: 2 } },   // taps per chop, wood per chop
    treeWood: 6,                      // a tree gives this much wood, then it falls (V5.1)
    treeFallBonus: 2,                 // extra wood when it comes down
    treeRestMs: 90 * 1000,            // a stump for this long, then a new tree grows
    berries: 2,                       // berries per bush
    bushRestMs: 60 * 1000,
    fish: { waitMinMs: 2000, waitMaxMs: 4500, biteMs: 1600 },   // wait for a bite, then tap in time
    questBonus: 2,                    // quest reward = n × item price × bonus
    chest: { coins: 30 },             // the chest in the cave: this many coins, once a day
    caveGhost: { speed: 3.3, reach: 1.1, steals: 3, pauseMs: 2500 },   // V5.2: wakes when the chest opens, chases you to the mouth; takes shells when it catches you
    quests: [
      { item: 'hout', n: 4, tekst: 'Hak vier stukken hout bij de bomen.', klaar: 'Vier stukken hout! Goed gedaan.' },
      { item: 'schelp', n: 3, tekst: 'Raap drie schelpen op het strand.', klaar: 'Drie schelpen! Ze glimmen mooi.' },
      { item: 'bes', n: 5, tekst: 'Pluk vijf bessen bij de struiken.', klaar: 'Vijf bessen! Ze smaken zoet.' },
      { item: 'vis', n: 4, tekst: 'Vang vier vissen in het meer.', klaar: 'Vier vissen! Jij vangt ze snel.' },
      { item: 'hout', n: 7, tekst: 'Hak zeven stukken hout voor mij.', klaar: 'Zeven stukken hout! Sterk werk.' },
      { item: 'schelp', n: 6, tekst: 'Raap zes schelpen op het zand.', klaar: 'Zes schelpen! Ze zijn mooi.' },
      { item: 'bes', n: 4, tekst: 'Pluk vier bessen van de struik.', klaar: 'Vier bessen! Lekker voor de soep.' },
      { item: 'vis', n: 5, tekst: 'Vang vijf vissen bij het water.', klaar: 'Vijf vissen! Wat een vangst.' },
      { item: 'hout', n: 3, tekst: 'Hak drie stukken hout nu.', klaar: 'Drie stukken hout! Klaar voor het vuur.' },
      { item: 'schelp', n: 8, tekst: 'Raap acht schelpen op het strand.', klaar: 'Acht schelpen! Een grote stapel.' },
      { item: 'bes', n: 6, tekst: 'Pluk zes bessen bij de struiken.', klaar: 'Zes bessen! Ze zijn rijp.' },
      { item: 'vis', n: 3, tekst: 'Vang drie vissen in het meer.', klaar: 'Drie vissen! Ze zwemmen snel.' },
      { item: 'hout', n: 5, tekst: 'Hak vijf stukken hout voor mij.', klaar: 'Vijf stukken hout! Goed gehakt.' },
      { item: 'schelp', n: 4, tekst: 'Raap vier schelpen op het zand.', klaar: 'Vier schelpen! Ze zijn glad.' },
    ],
  },

  // The night on the island (PLAN-V4 R4). Balance: a night (3 min) burns ≈ 8 pieces of wood; by hand that is 24 taps,
  // with the axe 4 taps. The reward for a night with the fire still burning grows with every night.
  nacht: {
    // V6.2: the fire is a heap of wood (fire = pieces in it); more wood = a higher level, a bigger fire and more light
    fireMax: 400,                     // the heap never holds more than this
    levels: [20, 50, 100, 200],       // level 2 from 20 pieces, 3 from 50 (you can cook), 4 from 100 (beacon), 5 from 200 (bonfire)
    levelRadius: [0, 4, 6, 9, 13, 18],// light radius per level (0 = out); level 5 lights the whole camp
    burnDay: 0.4,                     // pieces per minute by day at level 1
    burnNight: 2.4,                   // ... in the dark: a level-1 fire eats 12 pieces a night of 5 minutes
    burnPerLevel: 0.35,               // every level above 1 burns 35 % more
    ghostTakes: 3,                    // pieces a ghost pulls out of the fire
    cookLevel: 3,                     // from this level you can cook fish (KOOK): a meal fills twice as much
    lanternRadius: 5,                 // light around the player with the lantern
    torchRadius: 4,                   // each of the four torches
    fenceRadius: 9.5,                 // the fence keeps ghosts out of the camp
    ghostsMax: 3,                     // at most this many ghosts at once
    ghostEveryMs: 20 * 1000,          // a new ghost about every 20 s of darkness (while fewer than ghostsMax)
    ghostSpeed: 1.6,                  // units per second
    ghostReach: 1.3,                  // steals when this close
    ghostPatience: 9,                 // seconds it hovers at the edge of the light before it gives up
    ghostCoins: 3,                    // coins stolen when the bag is empty and the fire is out
    bearEvery: 3,                     // the Nachtbeer comes every third night
    bearSpeed: 0.9,
    bearReach: 1.8,
    bearScares: 3,                    // BOE this many times and it turns round
    bearEats: 8,                      // pieces of wood it takes from the fire
    rewardBase: 20,                   // coins at dawn when the fire burned all night
    rewardPerNight: 5,                // ... plus this per night survived before
    sleepSkipsTo: 0.97,               // SLAAP in the tent moves the clock to just before dawn
    firePitBurn: 0.7,                 // the fire pit: burn rate × this
    fenceRadiusHigh: 13,              // the high fence keeps ghosts and the deer out of the whole camp
  },

  // Hunger (V5.3): a full stomach lasts about a day and a night; berries and fish fill it. Empty in the dark = you faint.
  honger: {
    drainDay: 2.5,                    // per minute by day (100 = full; a day is 8 minutes since V6.2)
    drainNight: 8,                    // per minute in the dark
    slowBelow: 25,                    // under this you are slow…
    slowSpeed: 0.6,                   // … this much
    food: { bes: 15, vis: 40, maal: 80 },   // what a berry, a fish and a cooked meal give back
    afterFaint: 50,                   // strength when you wake up at the fire
    warnBelow: 40,                    // Muntje's 'maag knort' under this (once per 40 s)
  },

  // The Nachthert (V5.3): from the second night, runs at you in the dark, shakes things out of your bag
  // Cold (V6.2): in the dark your warmth drops away from the fire and the torches; in the fire's light it comes back.
  // Under a quarter you shiver and walk slowly; at zero you faint, like with an empty stomach.
  kou: {
    dropNight: 7,                     // warmth per minute lost in the dark, away from fire and light
    dropPerNight: 0.08,               // ... 8 % more each night survived ...
    dropCap: 2,                       // ... up to double
    recoverDay: 4,                    // per minute by day, anywhere
    warmUp: 30,                       // per minute within the fire's light
    litMul: 0.5,                      // a lantern or a torch halves the loss
    slowBelow: 25,                    // under this you shiver and are slow ...
    slowSpeed: 0.65,                  // ... this much
    afterFaint: 60,                   // warmth when you wake up at the fire
    warnBelow: 40,                    // Muntje says 'brr' under this (once per 40 s)
  },

  deer: {
    fromNight: 2,
    speed: 4.0,                       // between your walk (2.6) and your run (4.6); the shoes beat it
    sight: 24,                        // notices you from this far
    reach: 1.3,
    dropShare: 0.5,                   // half of every item falls out…
    maxDrops: 6,                      // … at most this many things lie on the ground
    fleeMs: 6000,
    pushBack: 2.2,                    // how far you are shoved
  },

  // Every night harder (V5.3)
  moeilijker: {
    ghostsEveryNights: 2,             // +1 ghost every two nights…
    ghostsCap: 6,                     // … up to six
    speedPerNight: 0.06,              // ghosts 6 % faster per night…
    speedCap: 1.6,                    // … up to 60 % faster
    ghostEveryStepMs: 1500,           // a new ghost 1.5 s sooner per night…
    ghostEveryMinMs: 8000,            // … never sooner than every 8 s
    bearOftenFrom: 6,                 // from night 6 the bear comes…
    bearEveryLater: 2,                // … every second night
  },

  // SAMEN SPELEN (PLAN-V4 R5): our own relay only (address set by a parent on PAPA), positions 8×/s, the host's world 4×/s.
  net: {
    posMs: 125,
    worldMs: 250,
    maxPlayers: 6,
    // our own relay on Cloudflare (server/relay/worker.js, deployed 2026-09-05); a parent can override it on PAPA
    defaultRelay: 'wss://muntstad-relay.johannes-b0e.workers.dev',
  },

  // Parent gate
  papa: {
    holdMs: 3000,                     // hold PAPA for 3 s
    sumMin: 23,                       // gate sum: two numbers in [sumMin, sumMax], always with a carry
    sumMax: 69,
  },

  // Coin-makers. One of each, level 1..maxLevel. Upgrade price from level n to n+1 = price * 2^n.
  // The next type unlocks when the total coins earned reach its price. Index 0 is always unlocked.
  maxLevel: 5,
  makers: [
    { id: 'limonade',  name: 'Limonadekraam',    icon: '🍋', price: 20,    income: [12, 18, 27, 41, 61] },
    { id: 'wasstraat', name: 'Wasstraat',        icon: '🚿', price: 120,   income: [50, 75, 113, 170, 250] },
    { id: 'pizzeria',  name: 'Pizzeria',         icon: '🍕', price: 400,   income: [150, 225, 338, 510, 750] },
    { id: 'ijssalon',  name: 'IJssalon',         icon: '🍦', price: 1000,  income: [300, 450, 675, 1020, 1500] },   // V5.5
    { id: 'fabriek',   name: 'Fabriek',          icon: '🤖', price: 2000,  income: [600, 900, 1350, 2040, 3000] },
    { id: 'flat',      name: 'Flatgebouw',       icon: '🏢', price: 10000, income: [2500, 3750, 5625, 8500, 12500] },
    { id: 'pretpark',  name: 'Pretpark',         icon: '🎡', price: 40000, income: [8000, 12000, 18000, 27200, 40000] },   // V5.5: the top of the town
  ],

  // LEUK catalogue: fixed prices, all visible from the start, no randomness.
  // kind: hat | skin | vehicle | paint (one equipped per kind) · garden | pet (toggle on/off) · show | dance | toy (actions on HUIS)
  // The order is the shop order (8 per page): every page mixes kinds so a pet, a show and a toy are never
  // buried on the last page. The Bewaar-code stores indices into this list: reorder only with a code-version bump.
  fun: [
    // page 1: a taste of everything
    { id: 'pet',        name: 'Pet',            icon: '🧢', price: 15,  kind: 'hat' },
    { id: 'kat',        name: 'Kat',            icon: '🐱', price: 80,  kind: 'pet' },
    { id: 'hond',       name: 'Hond',           icon: '🐶', price: 100, kind: 'pet' },
    { id: 'tovenaar',   name: 'Tovenaar',       icon: '🧙', price: 50,  kind: 'hat' },
    { id: 'bloemen',    name: 'Bloemen',        icon: '🌷', price: 30,  kind: 'garden' },
    { id: 'vuurwerk',   name: 'Vuurwerk',       icon: '🎆', price: 30,  kind: 'show' },
    { id: 'dansje',     name: 'Dansje',         icon: '🕺', price: 50,  kind: 'dance' },
    { id: 'scooter',    name: 'Scooter',        icon: '🛴', price: 150, kind: 'vehicle' },
    // page 2: hats and the dino
    { id: 'strohoed',   name: 'Strohoed',       icon: '👒', price: 20,  kind: 'hat' },
    { id: 'helm',       name: 'Helm',           icon: '⛑️', price: 25,  kind: 'hat' },
    { id: 'hogehoed',   name: 'Hoge hoed',      icon: '🎩', price: 30,  kind: 'hat' },
    { id: 'feestmuts',  name: 'Feestmuts',      icon: '🥳', price: 35,  kind: 'hat' },
    { id: 'piraat',     name: 'Piraat',         icon: '☠️', price: 40,  kind: 'hat' },
    { id: 'cowboy',     name: 'Cowboy',         icon: '🤠', price: 45,  kind: 'hat' },
    { id: 'kroon',      name: 'Kroon',          icon: '👑', price: 60,  kind: 'hat' },
    { id: 'dino',       name: 'Dino',           icon: '🦖', price: 200, kind: 'pet' },
    // page 3: skins and house paint
    { id: 'zombie',     name: 'Zombie',         icon: '🧟', price: 40,  kind: 'skin' },
    { id: 'kikker',     name: 'Kikker',         icon: '🐸', price: 50,  kind: 'skin' },
    { id: 'astronaut',  name: 'Astronaut',      icon: '🚀', price: 60,  kind: 'skin' },
    { id: 'ninja',      name: 'Ninja',          icon: '🥷', price: 70,  kind: 'skin' },
    { id: 'superheld',  name: 'Superheld',      icon: '🦸', price: 80,  kind: 'skin' },
    { id: 'verf-rood',  name: 'Rood huis',      icon: '🟥', price: 100, kind: 'paint' },
    { id: 'verf-blauw', name: 'Blauw huis',     icon: '🟦', price: 100, kind: 'paint' },
    { id: 'verf-geel',  name: 'Geel huis',      icon: '🟨', price: 100, kind: 'paint' },
    // page 4: the garden
    { id: 'vlag',       name: 'Vlag',           icon: '🚩', price: 35,  kind: 'garden' },
    { id: 'zandbak',    name: 'Zandbak',        icon: '🏖️', price: 40,  kind: 'garden' },
    { id: 'bankje',     name: 'Bankje',         icon: '🪑', price: 40,  kind: 'garden' },
    { id: 'hek',        name: 'Hek',            icon: '🪵', price: 45,  kind: 'garden' },
    { id: 'boom',       name: 'Boom',           icon: '🌳', price: 50,  kind: 'garden' },
    { id: 'lantaarn',   name: 'Lantaarn',       icon: '🏮', price: 55,  kind: 'garden' },
    { id: 'brievenbus', name: 'Brievenbus',     icon: '📮', price: 60,  kind: 'garden' },
    { id: 'sneeuwpop',  name: 'Sneeuwpop',      icon: '⛄', price: 70,  kind: 'garden' },
    // page 5: the big things
    { id: 'vijver',     name: 'Vijver',         icon: '🐟', price: 80,  kind: 'garden' },
    { id: 'tent',       name: 'Tent',           icon: '🎪', price: 100, kind: 'garden' },
    { id: 'fontein',    name: 'Fontein',        icon: '⛲', price: 120, kind: 'garden' },
    { id: 'salto',      name: 'Salto',          icon: '🤸', price: 60,  kind: 'dance' },
    { id: 'trampoline', name: 'Trampoline',     icon: '🦘', price: 300, kind: 'toy' },
    { id: 'auto',       name: 'Auto',           icon: '🚗', price: 500, kind: 'vehicle' },
  ],

  // Milestones: fanfare + confetti + a sticker on the HUIS sticker wall. Rewards, not catalogue items.
  milestones: [
    { id: 'eerste-geldmaker', kind: 'makers',             value: 1,      sticker: '🍋', title: 'Eerste geldmaker!' },
    { id: 'geld-werkt',       kind: 'passive-beats-work', value: 0,      sticker: '💪', title: 'Je geld werkt harder dan jij!' },
    { id: 'duizend',          kind: 'earned',             value: 1000,   sticker: '💰', title: '1 000 munten verdiend!' },
    { id: 'alle-geldmakers',  kind: 'all-makers',         value: 0,      sticker: '🏙️', title: 'Alle geldmakers!' },
    { id: 'level-5',          kind: 'level',              value: 5,      sticker: '⭐', title: 'Eerste level 5!' },
    { id: 'honderdduizend',   kind: 'earned',             value: 100000, sticker: '🏆', title: '100 000 munten verdiend!' },
    { id: 'eerste-nacht',     kind: 'nights',             value: 1,      sticker: '🌙', title: 'Eerste nacht overleefd!' },
    { id: 'eiland-verkoper',  kind: 'island-sold',        value: 100,    sticker: '🐚', title: '100 munten verdiend op het eiland!' },
    { id: 'vijf-opdrachten',  kind: 'quests',             value: 5,      sticker: '🎒', title: 'Vijf opdrachten van Muntje!' },
  ],

  // Avatar colours offered on START (id → CSS colour)
  colors: [
    { id: 'blauw',  hex: '#3b82f6' },
    { id: 'rood',   hex: '#ef4444' },
    { id: 'groen',  hex: '#22c55e' },
    { id: 'geel',   hex: '#facc15' },
    { id: 'paars',  hex: '#a855f7' },
    { id: 'oranje', hex: '#f97316' },
  ],
});

export default CONFIG;
