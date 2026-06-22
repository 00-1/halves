# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T194` (the app ICON = Magnar).** Off standby — the owner picked the icon: **Magnar, hero id `mo`**
(a Brawn hero; his art is `C.drawIcon("hero:mo", HERO_PAL.Brawn, "familiar")` in `collectibles.js`). Today the icon
is a placeholder `x/2` mark. Compose Magnar as a **maskable** icon (his portrait in the ~80% safe zone on a
full-bleed brand background, crisp nearest-neighbour scale), **render static `icon-512.png`/`icon-192.png` offline
and commit them** (the installed-PWA/Android icon is fetched from the manifest — a runtime data-URL isn't enough),
point `manifest.webmanifest` at them, and update **`installFavicon()`** to draw `hero:mo` so the browser favicon
matches. Icon tests green; owner confirms by (re)installing the PWA. [A]-only (`manifest.webmanifest`, `index.html`,
`main.js`, committed PNGs, tests). *(BACKLOG T194 — unblocks the icon half of `T168`; the Play `.aab` reuses the
512.)* The rest of **`T168`** stays **HELD** on the owner's Google Play ID verification.
**Re-read this line fresh before each task + push.**

**Builder B → `T195` (pile dither/pixelate + gradation) → then `T193` (coin-cylinder gain burst).** `T192` (cylinder
coins + taller wall-banked pile) is **APPROVED** (live `61efcc6`); owner "looks a bit better" + gave a refinement.
*(If you're already mid-`T193`, finish + push it, then do `T195`.)*
- **`T195` — FILTER pass + fine gradation.** Root cause: the engine renders the scene with **ordered 4×4 Bayer
  dither + palette quantise**, but `drawHoard` draws a **smooth analog gradient** (`shade(base,0.25-depth*0.6)`) —
  so the pile reads smooth against the dithered pixel scene. Bring the pile into the **same ordered-Bayer dithered,
  pixel-quantised** look (chunkier grid + Bayer-threshold dithering across a **multi-tone gold ramp**, reuse the
  engine's dither machinery). And **more gradation steps:** many-tone dithered shading (not ~5 flat bands) + raise
  **`HOARD_TIERS`** 8 → ~24–32 for fine pile growth. Must work on the GL/GPU 2D overlay. [B]-only (`fxgl.js`, tests).
  *(BACKLOG T195.)*
- **`T193` — the SAME spinning cylinder coins in the money-GAIN celebration.** On the owner's GL/GPU backend the
  burst goes through the **shader splat (disc mask)** which **ignores the coin look** → "just particles." Render
  coin-look gain particles as **spinning T192 cylinders on the 2D layer** (like the T185 overlay), not the shader
  splat; keep the T173 amount-scaling. [B]-only (`fxgl.js`, tests). *(BACKLOG T193 — uses T192's coin primitive.)*
**Re-read this line fresh before each task + push.**

---

**State:** the four owner-reported items (invisible pile, dark/stressful lofi, crackle/pop, back-button drift) are
all fixed + deployed, plus the beasts/heroes icon candidates are in. Awaiting **owner device-confirmation** of the
audio + the now-visible hoard, and the **owner's launcher-icon pick** (Codex ▸ Emblems, dev reveal-all). The
critical path to launch is now mostly **external** (ID verification) + the icon pick.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
