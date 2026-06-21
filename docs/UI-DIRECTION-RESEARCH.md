# UI Direction — Deep Research: a "gamey, less web-2.0" look (T97, doc only)

**Status:** research / design doc. **Zero behaviour/style change ships with this task** — no
CSS, JS, or HTML is modified. Its job is to decide *how* to make the Halves chrome read as a
**game** rather than a generic dark-mode web app — the owner is "not convinced by the current
rounded buttons" and wants the UI **more gamey, less web 2.0** — and to do it **reversibly**,
in harmony with our pixel-art content and the incoming FX layer (T82 / Phase 6.12).

> Grounded in the **live CSS** (`styles.css`) as of build `0d19c72`. All values quoted below
> are real.

---

## 0. TL;DR

- **The diagnosis:** our *content* is pixel/chiptune/RPG (glyph marks, procedural icons, hero
  portraits, monsters, scenery, the tech tree), but our *chrome* is **soft web-app** —
  pervasive medium border-radius, soft drop-shadows, flat rounded cards, pill/rounded
  buttons, a geometric sans display font. The chrome **fights** the content; that mismatch is
  the "web 2.0" feeling.
- **The pick:** a **coherent blend** — an **exposed-tech / mono HUD** structural language
  (low/zero radius, hairline rules, corner ticks, tabular readouts — already half-true and the
  *same language as the brickmap-grit FX*), with **beveled, low-radius "pixel-bevel" buttons**
  (the owner's specific gripe) and **bordered "window" panels** for the RPG screens. **Body
  text stays clean** (no pixel font for paragraphs/numerals — legibility for 10–11yos).
- **The method:** make the whole look **CSS-custom-property-driven + a `data-ui` switch** so
  it is **toggleable and fully reversible**, and ship it **buttons-first** (Step 1), then
  panels → modals → numpad → nav → tree nodes. **No-build** throughout (CSS + the procedural
  canvas we already use; optional procedural 9-slice via `<canvas>`).
- **Co-design with FX:** choose a UI language the FX layer *extends* rather than fights —
  exposed-tech edges + dithered atmosphere + per-biome palette ramps read as **one** surface.

---

## 1. Honest audit of the current UI — where the "web 2.0" lives

From the live `styles.css`:

- **Border-radius is everywhere, and medium-large.** Tallies: `12px ×11`, `10px ×9`, `8px ×8`,
  `14px ×8`, `999px ×3` (pills), `50% ×2` (dots), plus `18/13/11/6/3px`. The signature soft
  rounded-rect of every modern dark-mode SaaS. Buttons are the worst offender for the owner:
  `.btn { border-radius:14px; padding:18px 56px; background:var(--amber); border:none }` — a
  big friendly pill, not a game control.
- **Soft drop-shadows (13 of them).** e.g. the event banner `box-shadow:0 4px 16px
  rgba(0,0,0,.3)`, the modal card, toasts — **Material-style elevation**. Games rarely float
  cards on blurred shadows; they use **hard frames / bevels**.
- **Flat dark "cards."** Panels are `background:var(--surface|--surface-2)` + a `1px
  solid var(--line)` + radius — the default dark-mode card (`.inv-cat`, `.hero-card`,
  `.sum-row`, `.topic-info`, `.event-banner`, `.tnode`, `.navbtn`). Clean, generic, app-like.
- **Geometric sans display font.** `--display:'Space Grotesk'` on every button/title — a
  trendy modern web sans. Reads "startup landing page," not "game."
- **Rounded everything else.** numpad `.key{border-radius:14px}`, modal `.modal-card`, toasts,
  the rank/type **dots** (already squared off in T37/T40 — a good instinct to keep going).

**Where it already reads *game* (keep these):** the **pixel canvases** — the glyph mark
(`Glyphs`), the 16×16 procedural item icons, hero portraits, monster sprites, region scenery,
event emblems, the tree-node icons; the **mono HUD bits** — `#counter`/`#clock`, the build
line, the new gold/momentum readouts (`--mono`, tabular). **The fix is to make the *frame*
speak the same language as this content.**

**One-line diagnosis:** *pixel/RPG content inside a soft rounded web-app frame.* Square up the
frame and it becomes a game.

---

## 2. Candidate UI languages (and how each harmonises with us + the FX)

Four directions that fit *our* specific aesthetic (pixel glyphs/icons, chiptune, RPG
metagame, the brickmap-grit FX, a 10–11yo audience). For each: the look, the per-component
map, harmony, and the legibility risk.

### (a) Pixel / 8-bit UI
Chunky **beveled** borders (light top-left + dark bottom-right → the classic "raised" key),
**hard or pixel-stepped corners** (radius 0, or a 2–3px stepped notch), **dithered edges/
shadows** instead of blur.
- **CSS, no-build:** `border-radius:0; box-shadow: inset 2px 2px 0 var(--hi), inset -2px -2px
  0 var(--lo), 0 2px 0 var(--lo)` for a raised bevel; a **stepped corner** via
  `clip-path:polygon(0 3px,3px 3px,3px 0, …)` or a 2-layer pseudo-element; a **dithered drop
  shadow** via a tiny repeating `background-image` or a 2px hard offset instead of blur;
  `image-rendering:pixelated` on any bitmap edges.
- **Harmony:** *perfect* with our pixel glyphs/icons and brickmap's dither — it's literally the
  same world. **Risk:** if pushed onto *text* (pixel fonts for labels/numbers) it **hurts
  legibility** for kids. Mitigation: pixel-bevel the **frames/controls**, keep **label text in
  the clean mono/sans**.

### (b) 16-bit JRPG "window" panels
Bordered window frames (a **double-line** outer+inner frame with a gap), **corner ornaments**,
a deep flat fill — the Final-Fantasy/Dragon-Quest menu.
- **CSS, no-build:** layered frames via stacked `box-shadow` rings (`0 0 0 2px a, 0 0 0 3px
  bg, 0 0 0 4px b`) or a **procedural 9-slice** `border-image` drawn once to a `<canvas>` and
  used as a data-URL; corner ticks via `::before/::after`.
- **Harmony:** strong with the **RPG metagame** (Heroes/Arena/loot/inventory). **Risk:**
  ornate; can get **busy at 360px** and on small cards. Best reserved for *big* panels
  (Inventory, Hero detail, Arena), not every button.

### (c) Exposed-tech / terminal HUD
Mono everywhere, **hairline 1px rules**, **tabular numerals**, **corner ticks / bracket
framing** (`⌐ ┐ └ ┘`), `label : value` telemetry, **low/zero radius**, minimal fill — the
"systems readout." This is **brickmap's own language**, and **we already lean here**
(`#counter`, `#clock`, build line, readouts).
- **CSS, no-build:** `border-radius:0`; 1px borders; **corner ticks** via four small absolutely-
  positioned pseudo-spans or a `clip-path` notch; `font-variant-numeric:tabular-nums`; the
  amber accent for "live" values.
- **Harmony:** **best fit with the FX layer** (the T82 "exposed-tech mono HUD" was named
  explicitly) — UI + atmosphere become one surface. **Legibility:** excellent (mono is clean;
  no pixel-font tax). **Risk:** can feel **cold/sterile** for a 10yo — warm it with the amber
  accent + the colourful pixel content + chiptune.

### (d) Modern "juicy" angular / beveled (clean, not pixel)
Bold, high-contrast, **angular/clipped corners** (45° cut corners), **low rounding** (0–4px),
chunky borders, punchy `:active` states — modern indie game UI (Hades-ish) without pixel-font
legibility risk.
- **CSS, no-build:** `clip-path:polygon()` cut corners; thick borders; strong active transforms
  (`scale`, a 2px "press-in" via shifting an inset shadow).
- **Harmony:** reads **game** and stays **legible**; a safe bridge between pixel and modern.
  **Risk:** less *distinctively* "ours" than pixel/HUD; can look like any stylised app if the
  palette/icons didn't carry it (ours do).

**Cross-cut:** (a), (c), (d) all converge on **low/zero radius + hard edges + bevels/ticks +
clean text**; (b) adds ornate framing for big panels. They **compose**. (b) alone or full-(a)
pixel-everything are the risky extremes.

---

## 3. Component-by-component treatments (the range, with concrete CSS)

For each component: today → the spectrum (rounded → beveled-pixel → sharp/HUD), with no-build CSS.

- **Buttons** (`.btn`, `.btn.alt`, `.btn.ghost`, `.navbtn`, `.eb-play`, `.key`) — *the owner's
  gripe.* Today: `radius:14px`, amber pill, soft. Spectrum:
  - rounded-rect (radius 6) → **beveled-pixel** (`radius:0; box-shadow: inset 2px 2px 0
    rgba(255,255,255,.25), inset -2px -2px 0 rgba(0,0,0,.45); :active → invert the insets`
    for a real "press") → **sharp/clipped** (`radius:0; border:2px solid var(--text);
    clip-path` cut corners; amber fill only on the primary).
  - Keep the amber primary / outlined secondary distinction; add a **2px focus outline**
    (pixel UIs notoriously drop focus — we must not).
- **Panels / cards** (`.inv-cat`, `.hero-card`, `.sum-row`, `.topic-info`, `.event-banner`,
  `.tnode`): drop the radius to 0–3, **replace blur shadow with a 1–2px hard frame** (or the
  JRPG double-line for the big screens), keep the dark fill. The T37/T40 **square dots** set
  the precedent.
- **Modals** (`.modal-card`): turn the floating rounded card into a **bordered "window"** —
  a 2px frame + corner ticks + a flat fill; drop the blur shadow for a hard 1px outer ring +
  a dimmed scrim (already present).
- **Numpad keys** (`.key`, 64px): ideal **pixel-bevel** target — big, tactile, and the press
  state sells the bevel (invert insets on `:active`). Keep them ≥44px (they're 64px).
- **Nav** (`.navbtn`): square, beveled icon-buttons; the procedural pixel icons already match.
- **Toasts** (`.toast`): hard-framed "alert" strips (the exposed-tech `[ UNLOCKED ]` bracket
  reads gamier than a rounded card).
- **Tree nodes** (`.tnode`, T84): square beveled "tech nodes" with hard connector lines — this
  already wants to look like a skill tree; low-radius + bevel finishes it.

---

## 4. Constraints (weighed honestly)

- **Kid legibility — the key tension.** Pixel UIs are charming but **pixel fonts hurt reading**.
  Rule: **pixel-bevel the frames/controls, never the body text or numerals.** Keep
  `--display`/`--mono` for all labels, prompts, names, and numbers; reserve the bitmap font
  (`Glyphs`) for **decorative marks only** (as today). Explicitly: *no pixel-font paragraphs.*
- **Accessibility.** Pixel/flat UIs commonly kill the focus ring and rely on colour alone.
  Non-negotiables: a **visible 2px focus outline** (amber) on every control; **≥44px tap
  targets** (keys 64px, navbtn min 44px — keep); **AA contrast** (the `contrast.test.js` gate
  stays — hard edges don't change contrast, but bevels must not drop text below AA);
  state never colour-only (keep the ✓/🔒/▶ glyph badges).
- **No-build.** Everything via **CSS + the canvas we already use**; if a 9-slice frame is
  wanted, draw it **procedurally to a `<canvas>` → data-URL `border-image`** (a tiny pure
  function, Node-testable) — **no asset pipeline, no bundler.**
- **360px-safe.** Hard frames cost less space than blur shadows; corner ticks are cheap. The
  JRPG double-frame is the only width risk → reserve it for big panels.
- **Reversible / theme-able — mandatory.** Drive the whole look from **CSS custom properties**
  (`--ui-radius`, `--ui-border`, `--ui-bevel-hi/-lo`, `--ui-frame`) under a root **`data-ui`
  attribute** (`"classic" | "pixel"`). Flipping one attribute rolls the entire restyle back —
  the safety net the owner asked for ("research before committing").

---

## 5. Recommendation + a buttons-first, reversible phased plan

**Pick: a coherent blend — *exposed-tech HUD backbone + pixel-bevel low-radius buttons +
bordered window panels for the RPG screens; body text stays clean.*** Ranking:

1. **Blend (c)+(a):** exposed-tech mono framing (already half-true, **same language as the FX**)
   with **beveled, low-radius buttons/keys**. Most "ours," most FX-coherent, legible. **← pick.**
2. **(d) modern angular:** safe, legible, gamey — the fallback if pixel-bevel reads too retro.
3. **Full (a) pixel-everything:** maximal identity but the **legibility/a11y risk** is real;
   only if we keep text clean and test contrast hard.
4. **(b) JRPG alone:** lovely but **busy at 360px**; use it *only* as accent framing on big panels.

**Buttons-first, reversible phased plan** (each step is a CSS-variable swap under `data-ui`):

- **Step 0 — tokens.** Add `:root[data-ui="pixel"]` overrides: `--ui-radius:2px`,
  `--ui-bevel-hi:rgba(255,255,255,.22)`, `--ui-bevel-lo:rgba(0,0,0,.5)`, `--ui-border:2px`,
  and a **focus token** `--focus:2px solid var(--amber)`. `data-ui="classic"` = today.
- **Step 1 — BUTTONS (the owner's gripe, ships first).** Restyle `.btn`/`.btn.alt`/`.navbtn`/
  `.eb-play`/`.key` to `border-radius:var(--ui-radius)` + the bevel insets + invert-on-`:active`
  + the focus ring. Single-screen visual win; one attribute reverts it.
- **Step 2 — panels/cards.** `.inv-cat`/`.hero-card`/`.sum-row`/`.topic-info`/`.event-banner`/
  `.tnode`: radius→token, blur-shadow→hard 1–2px frame.
- **Step 3 — modals.** `.modal-card` → bordered window + corner ticks; scrim kept.
- **Step 4 — numpad.** `.key` → full pixel-bevel with a real press state.
- **Step 5 — nav + tree nodes + toasts.** Square beveled nav/nodes; bracketed toast strips.

**Co-design with the FX layer (Phase 6.12).** The UI and the FX must read as **one surface**:
the FX backdrop is **dithered + palette-quantised + particle-lit**; the UI should use the
**same hard-edge, low-radius, exposed-tech language** and ideally the **same per-biome palette
ramp** for its accents/frames, so a bordered HUD panel sits *on* the dithered atmosphere as if
machined from it (rather than a soft web card floating above it). Decide the UI tokens and the
FX palette tokens **together** so neither has to be redone.

**Success criterion for the first spike (buttons):** the owner agrees the buttons read "game,
not web app"; contrast/focus/tap-target gates stay green; the whole change reverts with one
`data-ui` flip. **Kill criterion:** if pixel-bevel buttons read too retro/illegible, fall back
to **(d) modern angular** (low-radius, clipped corners, no pixel texture) — same token system,
different values.

---

## 6. Open questions for the owner

1. **Retro vs sleek:** pixel-bevel (8-bit, max identity) or modern-angular (clean, legible) for
   the button spike? (Both shippable from the same token system — this picks the *values*.)
2. **How far past buttons** to take it now (buttons only, or buttons + panels), given the
   restyle is reversible?
3. **JRPG window framing** on the big RPG screens (Inventory/Heroes/Arena) — wanted, or keep
   them plain HUD?
4. Confirm the **clean-text rule** (no pixel font for labels/numbers; bitmap font stays
   decorative-only) — assumed here for kid legibility.

### Appendix — token sketch (illustrative; not shipped)

```css
:root{ --ui-radius:14px; --ui-border:1px; --ui-bevel-hi:transparent; --ui-bevel-lo:transparent; --focus:2px solid transparent; }
:root[data-ui="pixel"]{ --ui-radius:2px; --ui-border:2px;
  --ui-bevel-hi:rgba(255,255,255,.22); --ui-bevel-lo:rgba(0,0,0,.5); --focus:2px solid var(--amber); }
.btn{ border-radius:var(--ui-radius);
  box-shadow:inset 2px 2px 0 var(--ui-bevel-hi), inset -2px -2px 0 var(--ui-bevel-lo); }
.btn:focus-visible{ outline:var(--focus); outline-offset:2px; }
.btn:active{ box-shadow:inset -2px -2px 0 var(--ui-bevel-hi), inset 2px 2px 0 var(--ui-bevel-lo); }
```
Flipping `document.documentElement.dataset.ui` between `"classic"` and `"pixel"` toggles the
entire restyle — the reversibility the owner asked for.
