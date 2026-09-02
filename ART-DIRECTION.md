# Muntstad — art direction (v2, binding for every change to the look)

Goal: the town, the shop and the yard must look like a modern blocky toy-town game a 6-year-old knows from tablet tycoon games: chunky 3D blocks with three lit faces, saturated plastic colours, deep shadows, glossy game UI with outlined type. Everything is drawn with canvas 2D through `docs/js/iso.js` (2:1 dimetric projection). No images, no web fonts, no frameworks, no Roblox trademarks or models.

## 1. Projection and primitives (`docs/js/iso.js`)

- World axes: x → screen right-down, y → screen left-down, z → up. `iso.P(x, y, z)` → `[X, Y]`.
- `iso.block(x, y, z, w, d, h, color, opts)` cuboid with base corner (x, y, z). Faces are shaded automatically: top +22 %, +y face (screen lower-left) neutral, +x face (screen lower-right) −30 %, thin dark edge (55 % darker at 32 % alpha). Options: `{ top, left, right, edge:false|color, alpha }`.
- `iso.roof(x, y, z, w, d, h, color, axis)` gabled roof, ridge along `axis` ('x' | 'y'); `iso.pyramid(...)`; `iso.slab(x, y, z, w, d, color)` flat top-only quad; `iso.face(x, y, z, w, d, side, u0, v0, uw, vh, color, opts)` a rectangle on the +x (`'x'`) or +y (`'y'`) face of a block, face-local coordinates (u along the face, v up) — use it for doors, windows, signs, eyes.
- `iso.shadow(x, y, w, d, h)` ground shadow of a block (falls right-down); `iso.blob(x, y, r)` round shadow; `iso.disc`, `iso.groundRect` ground shapes; `iso.ground(fn)` runs `fn(ctx)` with the canvas transformed to the ground plane (draw roads/paths in world units, strokes foreshorten correctly).
- Compound props: `iso.tree`, `iso.bush`, `iso.flower`, `iso.coin(X, Y, r, t)` (screen space).
- Colours: `shade(hex, amount)` (+ toward white, − toward deep navy), `rgba(hex, a)`.
- Painter's algorithm: draw things with a smaller `x + y` first. Inside one object draw back parts first (higher z later only if they sit on top).

## 2. Scale and proportions

- 1 world unit ≈ one "block". A plot is 3 × 3 units. A building footprint is ≤ 2.6 × 2.2 units and ≤ 3 units tall (the flat may reach 5). The avatar is 1.2 units tall (`s = 0.62`). Pets ~0.7 units. Garden props ≤ 1 unit footprint, ≤ 1.6 tall.
- Every drawn thing gets a ground shadow (`iso.shadow` for boxes, `iso.blob` for characters). Never skip shadows: they are what makes it read as 3D.
- Details are blocks too: windows are `iso.face` rectangles (light `#cfe9ff`, lit at night `#fff1a8`), doors dark wood `#7a3f1a`, chimneys grey `#9aa3b2`, signs are white slabs/blocks with a coloured strip. Keep 3–6 accent details per building; do not add clutter.

## 3. Palette (toy plastic)

| Role | Hex |
|---|---|
| ink (outlines, shadows on UI) | `#1b1f3b` |
| grass top / dark | `#6fd35b` / `#55b647` |
| sand | `#f4d98a` |
| cliff dirt / rock | `#b97b4b` / `#8a5a3a` |
| water light / deep | `#2fb5ef` / `#1683d6` |
| road / dashes / kerb light | `#5d6675` / `#f7d24a` / `#dcd7cb` |
| pavement | `#e9e2cf` |
| lemon | `#ffd23f`, `#ffe94d` |
| coral red | `#ff5f5f`, roof red `#e8483f` |
| sky blue | `#4fb6ff`, `#45b6ff` |
| mint | `#6ee7b7`, green `#45d65c` |
| lavender | `#b794f4` |
| orange | `#ff9f2e` |
| cream wall | `#fff2c9` |
| wood | `#b5763f` / dark `#8a5a35` |
| metal | `#9aa3b2`, dark `#5b6472` |
| skin | `#f7c59f` |
| gold coin | `#ffd93d` / `#e59b13` / `#c97a00` |

Use these; pick new tints with `shade()` from them so the town stays one family.

## 4. Coin-makers (5 buildings × levels 1–5)

Each level adds one visible thing (never just scale): level 2 an extra prop, level 3 an annex or second floor, level 4 a flag on a pole + sign, level 5 three floating coins above the roof and a white "★" banner. Buildings must stay inside their 3 × 3 plot (overhangs of 0.3 are fine).

- Limonadekraam `#ffd23f`: counter, four wooden posts, red/white striped awning, lemons and a pink pitcher. Reference implementation exists.
- Wasstraat `#4fb6ff`: boxy hall with a dark tunnel mouth on the +x face, two red brush rollers, a white sign with a blue strip, dripping water blocks.
- Pizzeria `#ffb0b0` + roof `#e8483f`: gabled roof, striped awning, chimney with smoke puffs (3 growing circles), round window.
- Fabriek `#b794f4`: sawtooth roof (3 gabled roofs ridge along y), tall chimney with smoke, yellow-lit windows, robot-face sign.
- Flatgebouw `#8fc7ff`: 3 + level floors, window grid on both faces, entrance, roof box; level 5 gets a rooftop garden.

## 5. Avatar (`drawAvatar(iso, x, y, opts)`)

Blocky figure: two legs, torso in the chosen colour, two skin arms, cube head with the face on the visible front face (facing 'se' → +x face, 'sw' → +y face; 'nw'/'ne' show the back: hair only). Walk cycle: legs and arms swing along the facing axis (`sin(t/110)`), head bob 0.03. Poses: `idle` (tiny breathing bob, blink every ~3 s: eyes become 0.02 tall for 120 ms), `walk`, `jump` (z offset), `dance` (torso rotates ±, arms up), `salto` (whole figure flips: draw upside down by mirroring z), `wave` (right arm up).
Hats sit on top of the head (z = head top): pet (cap + brim on the facing side), strohoed (wide thin yellow brim + short crown), helm (red dome-ish block with white stripe), hogehoed (tall black block + red band), feestmuts (pyramid, pink with yellow stripe), piraat (wide black block with a white skull face), cowboy (brown wide brim + dome), tovenaar (tall blue pyramid with yellow stars), kroon (gold ring of small blocks with red/blue/green gems).
Skins change materials: zombie (green skin, grey body, zigzag mouth), kikker (green all over, eyes on top of the head), astronaut (white body, grey backpack block, visor ring), ninja (black body, red headband block), superheld (red body, yellow cape slab behind, blue mask strip).
Vehicles: scooter (small blue deck + handlebar, avatar standing), auto (blocky car in the avatar colour, avatar's head visible through the roof opening). Speed 55 / 110 / 190 px per second on the road as today.

## 6. Garden props (12), pets (3)

Props (≤ 1 unit): bloemen (bed of 5 flowers), vlag (pole + waving flag slab), zandbak (sand square with bucket), bankje (bench), hek (white picket run of 6), boom (`iso.tree`), lantaarn (post + yellow lamp cube), brievenbus (red box on post), sneeuwpop (3 stacked white cubes, carrot), vijver (blue disc with a fish cube), tent (pyramid, striped), fontein (round base + water column + spray dots).
Pets (~0.7 units): hond (brown blocks, ears, red collar, wagging tail slab), kat (grey, triangle ears, whiskers), dino (green, back spikes, tail). Idle: bob + tail swing; sleeping: lying flatter, 💤 in DOM.

## 7. UI kit (`docs/css/style.css`)

- Type: `"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Segoe UI", system-ui`. Game labels: white, uppercase, outlined with 8-direction `text-shadow` in ink + a 4 px drop (class `.gt`). Numbers: `font-variant-numeric: tabular-nums`.
- Buttons `.btn`: 3 px ink border, 22 px radius, vertical gradient (light tint → colour → dark), `box-shadow: 0 7px 0 ink, 0 12px 14px rgba(10,20,60,.35), inset 0 3px 0 rgba(255,255,255,.55)`, a glossy top band via `::before`, press = translateY(6px). Colour variants: gold (KOOP/primary), green (BETER/success), blue (secondary), orange, purple (LEUK), grey (off/PAPA), red (danger).
- Pills (wallet, income): white/cream gradient, ink border, 6 px drop edge. The wallet shows a CSS 3D coin (`.coin3`).
- Panels: white with a coloured header strip and a 6 px ink drop edge; popups pop in with overshoot.
- Cards: item preview image (canvas sprite) on a soft radial backdrop, name plate, price tag with a small coin, KOOP button; affordable → pulsing gold glow; owned → green tick ribbon; locked → desaturated with a lock badge.
- Screen change: `.screen.active` animates `scale(.97)→1` + fade in 280 ms. Reduced motion: keep transitions ≤ 150 ms.
- Every kid-UX rule of SPEC §4 still holds: buttons ≥ 64 px (nav ≥ 92 px tall), text ≥ 20 px, labels ≥ 24 px, coin count ≥ 36 px.

## 8. Do / don't

- Do: shadows under everything, one light direction, saturated colours, chunky proportions, a little motion everywhere (smoke, flags, water, coins), overshoot easing.
- Don't: emoji as item art (emoji stay allowed only inside mentor text and small badges), thin outlines, pure black, gradients on canvas faces (flat faces read as blocks), more than 30 particles, anything that moves the HUD.
