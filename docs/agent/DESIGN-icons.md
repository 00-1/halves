# Pixel-icon system (for T36) — ~50 categories + per-item variation

> Owner wants (a) many more icon categories (~50, same chunky 16-bit look) and
> (b) **strong variation within a category** — the original mirrored-sprite
> generator varied a lot; the T20 rewrite made items within a style look
> templated. Bring the variety back while keeping recognizable categories.

## Foundations (reuse, don't reinvent)
- Keep the palette model `RARITY[r] = {body, accent, outline}` and the existing
  `paintGrid(cx,g,a,pal,scale,off)` painter (outline auto-derived as the border of
  filled cells). Archetypes only fill `g` (body) and `a` (accent).
- Keep `hashStr(id)` (FNV-1a) + `mulberry32(seed)` as the sole entropy.
- **Grid `G: 12 → 16.`** 16×16 is the canonical 16-bit cell; gives room for
  silhouette variation + scatter; still scales to integer multiples at tile size.
- Strict 3-colour contract stays (no new plane); "dark interior" = `carve` a body
  cell to expose the auto-outline. New item field `archetype`+`preset`
  (`categoryOf(item)`) replaces the old `style` index.
- Shared primitives to add: `box,hline,vline,dot,disc,tri,carve,mirror(x)=15-x`,
  `shiftPalette(pal,{hue,lum})` (HSL nudge on a *cloned* palette).

## 12 archetype renderers `fn(g,a,P,rnd)`
Each covers several categories via params; "mirror" = build left half, reflect.
1. **Critter** (familiars/imps/slimes/bats/dragonets) — mirrored blob; params:
   bodyW,bodyH,headLobe(none/round/eared/horned),ears,eyeRow,eyeGap,feet(0/2/4),
   tail(none/stub/curl/spike),wings(none/folded/spread),fillDensity(.45–.7),
   spotCount,bellyAccent. (Reborn `s_sprite`.)
2. **Bottle** (potions/vials/flasks) — mirrored band stack: cork→neck→shoulder→
   body + liquidLevel; params: bodyW,bodyH,neckW,neckH,shoulder(sloped/round/
   square/flask-tri),cork(none/round/wide),liquidLevel(.3–.9),bubbles(0–4),
   label(none/band/tag),accentMotif(sparkle/cross/skull-dot/none).
3. **Sheet** (scrolls/tomes/maps/letters/cards) — parchment rect; params:
   w,h,topRoll,botRoll,spine(none/left/center),ribbon,glyphLines(1–4),frame,
   tornEdge,seal(none/dot/star),symmetric.
4. **Blade** (daggers/swords/kris/rapiers/cleavers/sickles) — blade+guard+grip+
   pommel; params: bladeLen(5–11),bladeShape(straight/leaf/wavy-kris/curved-
   sickle/broad-cleaver/needle-rapier),bladeWidth,edgeGlow,guard(none/straight/
   crossbar/cup/round),guardW,grip,pommel(none/dot/round/gem),bladeSym.
5. **Tool/Blunt** (hammers/maces/axes/staffs/wands/keys) — shaft+head; params:
   shaftLen,shaftW,head(hammer-block/mace-ball/axe-blade/orb-tip/none),headW,headH,
   bow(none/ring/round),teeth(0–3 key bits, asymmetric),bind,tip(none/spike/gem).
6. **Gem** (crystals/shards/jewels/geodes/clusters) — mirrored facet polygon;
   params: cut(diamond/teardrop/oval/raw/cluster/hexagon),facetW,facetH,point(top/
   both/none),facetLines,glint(1–3 off-centre = symmetry-break),clusterShards.
7. **Ring/Crown** (rings/signets/amulets/torcs/crowns) — band w/ hollow centre;
   params: bandStyle(ring/torc-open/crown/amulet),outerR,innerR,stone(none/round/
   gem/star),stoneSize,prongs,points(0–5 crown),pendant,chain.
8. **Shield/Armour** (shields/bucklers/helms/breastplates) — mirrored heater/
   round/kite + boss/trim; params: outline(heater/round/kite/buckler),w,h,boss
   (none/dot/disc/cross),trim,divide(none/per-pale/per-fess/chevron),charge,studs.
9. **Garment** (hats/cloaks/boots/gloves/belts) — by kind; params: kind(wizard-
   hat/cap/boot/glove/cloak/belt),brimW,crownH,crownShape(cone/round/floppy),
   cuff,buckle,fold,trim,star.
10. **Sigil** (runes/glyphs/talismans) — optional plate + stroke symbol from an
    8-segment alphabet (bitmask = big variety); params: plate(none/tablet/disc/
    diamond),strokeSet(bitmask, keep 3–6 strokes),strokeColor,corners,aura,symmetric.
11. **Orb** (orbs/globes/coins/eyes/moons) — mirrored disc + highlight; params:
    r(4–7),highlight,ring(none/equator/halo),stand,face,coin(flatten to token),
    swirl(symmetry-break).
12. **Provision/Plant** (food/mushrooms/chests/barrels/pouches) — `form`=organic
    (cap+stem) or container (box+lid+clasp+slats); params: form,capShape(round/
    loaf/cluster/dome),capW,capH,stem,spots,lid,clasp,bands,fill(coins).

## ~50 categories (presets over archetypes)
Critter: familiar, imp, slime, batling, dragonet · Bottle: potion, elixir, tonic,
vial, poison · Sheet: scroll, tome, map, letter, spellcard · Blade: dagger, sword,
kris, sickle, cleaver, rapier · Tool: hammer, mace, axe, staff, wand · Key: key,
skeleton-key · Gem: gem, shard, jewel, geode, crystal-cluster · Ring/Crown: ring,
signet, amulet, crown · Shield: shield, buckler, kite-shield, helm, breastplate ·
Garment: wizard-hat, cap, boots, gloves, cloak · Sigil: rune, glyph, talisman ·
Orb: orb, globe, coin · Provision: mushroom, bread, chest. **(56 listed; trim to
50 — e.g. drop coin/bread/globe — or keep, owner's call.)** Each preset sets the
distinguishing fixed params (full table in the research synthesis); per-item jitter
applies on top.

## Per-item variation (the key fix)
All entropy = `mulberry32(hashStr(id))`; two streams `rPick` (structure) and
`rTex = mulberry32(seed ^ 0x9e3779b9)` (texture) so adding a detail doesn't
reshuffle the silhouette. Crisp by construction (only integer cell fills).
- **Structural jitter:** ranged preset params resolved per item within bands that
  *preserve the category read* (a dagger's bladeLen never reaches sword length; a
  slime never grows legs).
- **6 generic levers (all archetypes):** (1) **palette hue/lum shift within the
  rarity family** (±~20° hue, ±8% L on a cloned palette — cheapest, highest impact;
  rarity stays recognizable); (2) **accent scatter** (2–6 accent cells on filled
  body cells, archetype-biased); (3) **silhouette jitter** (≤1 edge cell/row on the
  mirrored half, ~12% prob, then mirror — the old organic wobble); (4) **one
  symmetry-breaking mark**; (5) **decorative marks** (0–3, seed count+placement at
  valid anchors); (6) **internal-line micro-rotation** (sigils/gems/coins).
- **Budget/caps:** jitter+scatter touch **≤25% of filled cells** and **never** the
  preset's `locked` identity cells (key teeth, potion cork, crown points) — so max
  variation can't destroy recognizability.

## Variation test (Node, no real canvas) — `test/icon-variation.test.js`
Stub canvas records the integer pixel grid (it only sees `clearRect`/`fillRect`).
Quantize each render to a **role grid** (0 empty/1 outline/2 body/3 accent vs the
*base* palette) so hue-shift doesn't mask shape; keep a raw `colorGrid` too.
`gridDist(A,B)` = fraction of differing cells.
- **(a) cross-category distinct:** one canonical probe per category; every pair
  `gridDist(role) ≥ 0.18`; report the closest pair on failure.
- **(b) within-category diversity (anti-samey):** 40 items/category; `combined =
  0.7·avgRolePairDist + 0.3·avgColorPairDist ≥ 0.22`; **no two identical**
  (`gridDist>0` all pairs).
- **identity preserved:** each item shares ≥95% of the preset's `locked` cells.
- **determinism:** same id twice ⇒ `gridDist==0`.
- Wire `node test/icon-variation.test.js` into the Pages workflow so "samey within
  a category" can't regress; print a table sorted by within-avg (worst first).

## Implementation sequence
Bump G→16; add primitives + `shiftPalette`; implement 12 `arch_*`; add `CATEGORIES`
table `{id,label,arch,preset,locked}`; new `drawIcon(canvas,id,pal,categoryId)`
= resolve preset → jitter → archetype → generic levers → `paintGrid` with shifted
palette; assign each catalogue item a category (`categoryOf`). **Naming coupling
(T35):** name nouns index by the item's **archetype family (12)**, not the 50
categories — so add 2 noun pools (Tool, Garment) to DESIGN-names.md's 10, and the
food templates trigger when the family is Provision. All in `collectibles.js`; test
is the only new file; no assets; palette contract preserved.
