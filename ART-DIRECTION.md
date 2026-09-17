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
- WERK (V7.6, Johannes' Higgsfield direction of 16 September 2026: "a side view like a conveyor mini-game"): the
  camera looks at the lane from the side (`az` 0.16, `elev` 0.24). Three chunky trucks (box body, dump truck with a
  heap of sand, tanker, pickup with a crate; six wheels, a driver with a cap in the side window) roll left to right
  over a grey conveyor with moving stripes: one waits on the left, one stands in the tunnel being washed, the clean
  one waits on the right with sparkles while the driver waves an arm. The hall is a wide blue box with a dark tunnel
  mouth, a yellow lintel, a round sign with a drop, a tunnel roof that reaches out over the lane with WASSTRAAT on its
  edge, and a flag. Two big striped rollers (red/yellow/blue/green) stand in front of the lane and one lies across
  above the truck; three rainbow arcs stand behind the truck; static foam puffs at the mouth, live foam from the
  brushes while washing. Behind: hills, round trees, clouds. Mud is 3D blobs squashed onto the side that faces the
  camera, each with a transparent DOM `.dirt` tap area (78 × 70 px on this screen). HUD: the truck ring top-right
  (`.werk-ring`, fills over three trucks, confetti and a line from Muntje when full) and KLAAR bottom-right; the
  middle is free (PLAN-V7 §C.2). The hall's five upgrade levels (flags, neon ring and strip, extra rollers, foam
  cannon and palms, string of lights, golden trim, tower, fountain, bunting) are kept and re-placed.

## 9. Thumbnails (`docs/js/3d/thumbs.js`)

Shop cards, popups, the START avatar and HUD icons are rendered once from the same 3D models into an offscreen
target (4× MSAA, transparent) and cached as PNG data URLs. Same export names as the old sprites module.

## 10. UI kit (`docs/css/style.css`)

Unchanged from v2: outlined white game type, glossy 3D buttons with the 6 px ink edge, pills, panels, cards.
Screens have a sky gradient (`#a6e4ff → #1479cf`) behind the transparent 3D canvas.

**V7.2 (PLAN-V7 §C, Johannes' choice of 13 September): picture first.** Three new pieces, used on the island first and
on every screen in V7.3:

- `.btn-ico` — a round button, the picture on top and one capital word under it, 4 px ink edge, glossy. Four sizes:
  `-s` 64 px (picture only, the word in `aria-label`: emotes, small switches), `-m` 96 px (navigation: SAMEN, DORP,
  EET), `-l` 110 px (the one action of the moment: PAK/HAK/KAMP…, STOOK), `-xl` 130 px (SPRING). Words stay ≥ 24 px.
  The picture is an emoji in an `<i class="ico">` (never the outlined text shadow); iPad Safari draws them large and
  crisp, and they match the icon language of the chosen concepts. Draw an SVG only where no emoji fits.
- `.ring` — a ring meter: the picture in the middle, the value as a conic ring (`--p` 0–100, `--rc` the colour), an
  optional badge bottom-right (the fire level). `.low` turns it red and pulses.
- `.tile` — a picture with a number badge (the backpack); `.n.full` turns the badge red.

**V9.3: the workbench.** A chest is a brown box with a gold band, a hinged lid (rotation −1.3 rad when open) and a small
warm glow sphere above it while it is still closed. The camp levels: the wall reuses `fenceModel`; the watchtower is
four poles, a platform at 4.1 m with a railing and a lantern sphere (point light 7 at night, subject to the light
budget); the big tent is the tent at scale 1.3; the storage chest is a 1.6 m box with a gold band beside the fire; the
flag is a red plane on a pole at the tower's corner that sways. Stones are the rock instances' colour; the item icon is 🪨.

**V9.2: the fight.** A shot is a small sphere in the weapon's colour (spear sand, sling purple, water light blue, boomerang
orange, alien green) flying in an arc of 0.8 m over 180 ms plus 12 ms per metre; a hit scales the enemy to 1.3 for 120 ms
and pushes it back 1.5 m; a beaten enemy poofs into six white spheres that drift up and fade in 450 ms. The dusk banner
is white 44 px game type on a dark rounded box at 30 % height, five seconds, no touch target.

**V8.4: the pirates.** A pirate is a small figure in the avatar's proportions: red shirt with three white stripes, dark
trousers, a skin sphere head with a red bandana (knot at the back), a black eye patch, and an emissive yellow lantern
in the right hand that flickers. The boat is a 6.4 m dark hull with a deck, a mast, a black sail with a white skull and
a red flag; it bobs on the sea off the south beach. `#c8102e` is the pirate red (deeper than the game's `--red`).

**V8.3: the treasure map.** Mounds are three brown puffs with a black crow (orange beak); the X mound carries two crossed
red bars. The ruin: five broken walls (`#b9b1a3` with a darker crumbled top), an old well (stone ring, two posts, a
terracotta roof) and a signpost with a `?` text plane. The pirate hat is a black tricorn with a gold band and a white
skull on the front. The minimap shows ❌ at the X, else `🗺️ n/5` along the bottom.

**V8.2: weather.** One kind per day (`weer.js`), shown in the day badge. Rain is an InstancedMesh of 260 thin streaks in a
24 × 12 × 24 m box round the player (slanted by wind, half of them on tier 2); grey weather lerps sky and fog towards
`#8c9aa8` and pulls the fog closer (`daynight.setGloom`); a lightning flash whitens the sky for 140-220 ms. The
lightning tree beside the camp is a Builder tree with four cone flames and an orange point light while it burns; the
afdak is four poles and a flat terracotta roof 3.6 m over the fire. Wind is shown by the rain and the flags, not by
tilting tree instances (too expensive per frame).

**V7.7: Muntje's bubble.** `#bubble` is `position: fixed`, centred at the top under the top bar (on the island right of
the bag row and under the map; on WINKEL, HUIS, START, the gate and PAPA low beside Muntje), no tail. With `.kort` it
shows one emoji and at most three words at 34 px (`kort.<key>` in i18n.js) and goes after 4 s; the voice says the
whole line, a tap on the words shows it, 🔊 and Muntje repeat it. Lines without a short form show in full.

Rules that go with them ("knoppen niet in de weg"): the middle of the screen (60 % wide, 50 % high) never holds a
button; only the action of the moment is large; while the stick is held everything that is not the action drops to
55 % (`.screen-avontuur.moving .av-dim`); emotes hide behind one smiley; a button keeps its place (visibility, not
display); Muntje's bubble is narrow and lets touches through on the island. `tests/e2e/avontuur.spec.js` audits this.

## 11. Do / don't

- Do: rounded edges on everything, one light direction, saturated colours, chunky proportions, a little motion
  everywhere (waves, gulls, boats, smoke, flags, coins, brushes), overshoot easing on UI.
- Don't: voxel cubes, textures, dark or muddy colours, floating objects without shadows, clutter that hides the
  buttons, anything that pushes the frame time above 16 ms on an iPad gen 7.

## 12. Models from the Higgsfield pipeline (`docs/modellen/`, V9.6)

The enemies and the boat are GLB models; everything else is still built from rounded primitives. The pipeline, per model,
about ten minutes and 31-39 of Johannes' Higgsfield credits:

1. **Concept picture** with `generate_image` (gpt_image_2, 1:1, 1 credit). One prompt skeleton for every model so they
   match: "3D rendered toy figure in a soft rounded plastic cartoon style, smooth matte surface, bright clean colours.
   <the character>. Full body, centered, exact front view, evenly lit, plain white background, no shadow, no ground,
   no text." Characters that must walk: a strict T-pose (arms straight out) for Meshy's auto-rig. Animals and things:
   a three-quarter view gives better geometry. Look at the picture before spending on the mesh.
2. **Mesh** with `generate_3d` (`image_to_3d`, the picture's job id as `image` media, `should_texture`,
   `target_polycount` 4000-8000). Walking characters: `enable_rigging`, `enable_animation`, `animation_action_id` 30
   (Casual Walk; other clips via `animation_actions`). Meshy lands a little over the polycount. The rig fails on
   non-human shapes (the bear, twice): then a static model in a walking pose with a `wiebel`.
3. **Shrink** with `python scripts/glb-verklein.py in.glb docs/modellen/<id>.glb --px 512`: Meshy ships a 2048 px PNG
   (6 MB); 512 px JPEG is plenty for a figure forty pixels tall on the iPad. 0.2-0.7 MB per model.
4. **Catalogue** in `docs/js/modellen.js` (`MODELLEN`): `hoogte` (or `lengte` for the boat), `clip` (regex on the clip
   name) or `wiebel` ('loop' sways, 'ren' bobs fast, 'zweef' floats), `draai` if the front is not +Z, `gloed` (how much of
   its own colours it emits in the dark, default 0.22 — Meshy's emissiveFactor 1 with the colour texture would be a white
   blob at night), `fade` for see-through ghosts, `maxDriehoeken`. Add the file to PRECACHE in `docs/sw.js`; the unit test
   (`tests/unit/modellen.test.js`) checks size, triangles, skeleton, texture size and the cache list.
5. **Scene**: `modellen.instantie(id) || builderModel()` — same `{ group, update(now, opts) }` contract as spoken.js, so
   the swap is one line and the builder model stays the fallback until the file is in (and forever offline on an old
   cache). Materials become Lambert with the texture (V9.1 light budget); skinned meshes are never frustum-culled.

Rules that stay: our own pictures, no brands (rule 5); everything vendored and precached, no CDN (rule 4); a model
under 9 000 triangles and 1 MB; check it in the scene by day and by night with `node scripts/shot-modellen.mjs 0.3` and
`... 0.82` (OUT=dir for the pictures) before it ships.

