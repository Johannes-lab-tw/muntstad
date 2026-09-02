# Muntstad — art direction (v3, binding for every change to the look)

Goal: the town, the wash bay and the yard must look like a modern Roblox-style toy world the way a 6-year-old
knows it from Brookhaven, hotel tycoons and the like: **smooth rounded plastic**, saturated but friendly colours,
one warm sun with real soft shadows, round puffy trees, glossy game UI with outlined type. Not Minecraft cubes:
every block has rounded edges, every tree is a ball, every character has soft limbs that really swing.

Everything is real 3D with Three.js (r185, vendored in `docs/vendor/`), rendered by ONE `WebGLRenderer`
(`docs/js/3d/engine.js`) whose canvas moves into the container of the active screen. No images, no web fonts, no
other libraries, no Roblox trademarks, names, models or assets.

## 1. Building blocks (`docs/js/3d/build.js`)

- `Builder` merges rounded boxes, cylinders, spheres, puffs, cones, pyramids, gabled roofs and face panels into
  ONE mesh with vertex colours: one draw call per building, per scenery layer, per character limb.
- The builder keeps the v2 canvas signatures, so old art ported 1:1: `box(x, y, z, w, d, h, color)` = base corner
  (x, y) on the ground, z = height, w along x, d along the old "y" (world z), h up. `face(x, y, z, w, d, side, u, v,
  uw, vh, color)` puts a panel on the +x face (`'x'`, lower-right on screen) or the +z face (`'y'`, lower-left).
- Corner radius defaults to 0.06 world units (`{ r }` per part); anything thinner than 0.04 falls back to a sharp box.
- Materials: `MAT.plastic` (roughness 0.42, vertex colours) for everything solid; `MAT.gold` (metalness, warm
  emissive) for coins; `MAT.water` (glossy blue); `MAT.cloud` (white, slightly emissive).
- Text on signs: `textPlane(text, { w, h, font, color })` = canvas texture on a plane, 0.02 proud of the surface.
- Contact shadow under characters: `blob(r, alpha)` (radial gradient plane), on top of the real shadow.

## 2. Light and camera (`docs/js/3d/engine.js`)

- `addLights`: one warm sun (`DirectionalLight` 0xfff6e0, 2.4) from the upper left front, casting a soft 2048 px
  shadow map (1536 / 1024 on slower iPads); hemisphere light sky 0xd6f0ff / ground 0x6fa84f (0.85); a faint warm
  fill from the opposite side. No tone mapping, so the colours stay as saturated as the palette.
- `createCamera`: perspective (fov 26–30°) from the front-right corner, elevation ≈ 0.46–0.6 rad, fitted so the
  world's bounding box fills the container minus the HUD paddings. Every screen recentres on resize.
- Fog (`#8fdcff`, 40–55 → 120–150) fades the far sea into the sky.
- Adaptive quality: frames slower than 26 ms step the pixel ratio and shadow resolution down (tier 1, 2); steady
  fast frames step back up. Tier 2 also freezes the water.

## 3. Scale and proportions

- 1 world unit ≈ one plot cell. A plot is 3 × 3 units, a building footprint ≤ 2.6 × 2.2 and ≤ 3 units tall (the
  flat may reach 5). The avatar is 1.2 units tall (`S = 0.62`). Pets ~0.7 units. Garden props ≤ 1 unit footprint,
  ≤ 1.6 tall. Cars 1.5 × 0.8 in town, 2.8 × 1.3 in the wash bay.
- Details are parts too: windows are white-framed glass panels (`windowPane`), doors dark wood, chimneys grey,
  signs white slabs with a coloured strip. Keep 3–6 accent details per building; do not add clutter.
- Nothing floats: every object has a real shadow on the ground; characters also get the contact blob.

## 4. Palette (toy plastic)

| Role | Hex |
|---|---|
| ink (outlines, UI shadows) | `#1b1f3b` |
| grass top / dark | `#6fd35b` / `#55b647` |
| sand | `#f4d98a` |
| cliff dirt / rock | `#b97b4b` / `#8a5a3a` |
| sea | `#22aef2`, foam white 55 % |
| road / dashes / pavement | `#4f5766` / `#f7d24a` / `#dcd7cb` |
| plot pavement | `#e9e2cf` |
| lemon | `#ffd23f`, `#ffe94d` |
| coral red | `#ff5f5f`, roof red `#e8483f` |
| sky blue | `#4fb6ff`, `#45b6ff` |
| mint | `#6ee7b7`, green `#45d65c`, tree `#3fbf5a` |
| lavender | `#b794f4` |
| orange | `#ff9f2e` |
| cream wall | `#fff2c9` |
| wood | `#b5763f` / dark `#8a5a35` |
| metal | `#9aa3b2`, dark `#5b6472` |
| skin | `#f7c59f` |
| gold coin | `#ffd23f` / `#e59b13` |

Use these; pick new tints with `shade()` from them so the world stays one family.

## 5. The island (`docs/js/3d/world.js`)

- A cushion: rounded-rectangle extrusion with a bevelled rim, coloured by normal (grass on top, sand on the
  rounded rim, dirt → rock down the cliff). Same helper (`cushionMesh`) for the yard and the wash bay.
- The sea is a 320-unit plane with three overlapping sine waves; a white foam ring hugs the island.
- Road loop with a pavement band, yellow dashes and a zebra; plot pavements are raised slabs; hedges of bushes
  frame every plot on the side away from the road; flower beds at the four road corners; lamps with glowing bulbs.
- Life: three NPC cars, bobbing sailing boats, five circling gulls, drifting clouds that cast shadows, a fountain
  in the pond, smoke, waving flags, floating coins on level-5 buildings, three islets with palms on the horizon.

## 6. Coin-makers, house, signs (`docs/js/3d/buildings.js`)

Each level adds one visible thing (never just scale): 2 an extra prop, 3 an annex or second floor, 4 a flag on a
pole, 5 three spinning coins above the roof and a white ★ banner. Still parts are one merged mesh; flags, smoke,
drips and coins are small separate meshes animated by `update(t)`.
"For sale" boards are small (1.7 × 0.72) with the maker's icon, the price and a coin, or a lock; an affordable plot
gets a pulsing gold ring on the ground and a bobbing golden arrow.

## 7. Avatar (`docs/js/3d/avatar.js`)

Rounded figure: two legs and two arms on real pivots, torso in the chosen colour, cube-ish head with the face,
hair cap and hat on the +z front. Poses: `idle` (breathing, head turns, blink every ~3 s), `walk` (legs and arms
swing ±0.75 rad), `jump` (arms up), `dance` (torso twist, arms up, bob), `wave`, `salto` (whole figure flips
around its centre). Hats and skins as in v2 (9 hats, 5 skins); vehicles (scooter, car) carry the figure.

## 8. Yard and wash bay

- HUIS: the yard is its own cushion island with a double-rail fence on the far edges, a hedge along the front,
  a curved slab path from the door, garden props (`3d/props.js`), pets (`3d/pets.js`) that wander and nap, the
  trampoline that dips when the avatar bounces. DOM `.hit` areas are projected over the figures every frame.
- WERK: the wash hall with a dark tunnel mouth and two spinning red brush rollers, a tiled concrete slab with
  puddles, bucket, hose reel, cone, palm. The car is a big rounded model with spinning wheels; mud is 3D blobs
  squashed onto the car's faces, each with a transparent DOM `.dirt` tap area; foam is 3D spheres.

## 9. Thumbnails (`docs/js/3d/thumbs.js`)

Shop cards, popups, the START avatar and HUD icons are rendered once from the same 3D models into an offscreen
target (4× MSAA, transparent) and cached as PNG data URLs. Same export names as the old sprites module.

## 10. UI kit (`docs/css/style.css`)

Unchanged from v2: outlined white game type, glossy 3D buttons with the 6 px ink edge, pills, panels, cards.
Screens have a sky gradient (`#a6e4ff → #1479cf`) behind the transparent 3D canvas.

## 11. Do / don't

- Do: rounded edges on everything, one light direction, saturated colours, chunky proportions, a little motion
  everywhere (waves, gulls, boats, smoke, flags, coins, brushes), overshoot easing on UI.
- Don't: voxel cubes, textures, dark or muddy colours, floating objects without shadows, clutter that hides the
  buttons, anything that pushes the frame time above 16 ms on an iPad gen 7.
