# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T198` (hoard fills too fast — recalibrate the wealth→pile curve).** `T194` (Magnar icon) + earlier A
work **APPROVED** (live `751cbe7`). Owner: the pile maps wealth→fill too eagerly — `hoardLevel =
log10(1+gold)/log10(1e12)` gives **25% at 1k, 40% at 60k (one day)**, no headroom for the T178 billions/trillions
ramp. Recalibrate with a **floor-offset log**: `clamp((log10(1+gold)−log10(GOLD_EMPTY))/(log10(GOLD_FULL)−
log10(GOLD_EMPTY)),0,1)`, `GOLD_EMPTY`≈100–1k, `GOLD_FULL`≈1e15 → target **1k≈5%, 60k≈15–20%, 1M≈30%, 1Bn≈55%,
1T≈75%, 1e15 full** (tune vs `economy-sim.js`; keep a small visible starter pile). **Visual only — NOT the gold
counter/economy.** `gold`/`hoard-wiring` green. [A]-only (`main.js`, `GOLD-HOARD-DESIGN.md`). *(BACKLOG T198.)*
Then **`T168`** stays HELD on the owner's Play ID verification.
**Re-read this line fresh before each task + push.**

**Builder B → `T193` 🔴 (RE-OPENED bug) → `T197` → `T199` → `T200`.** `T192`/`T195`/`T196` APPROVED (live `751cbe7`).
- **🔴 `T193` — money-gain burst STILL shows no coins (squares), owner on PWA.** REAL bug, not cache: the shower
  uses `fxBurst.burst({look:"coin"})` → `Controller.burst()` → **`seedBurst`, which never sets `look` on its
  particles** (fxgl.js ~:256), so `p.look===1` is always false → squares. (Only `seedConverge` sets `look:1`; the
  outward money-gain uses the ballistic `burst()`.) `drawCoinParticle`/overlay/inline are all correct — they just
  never receive a coin-tagged particle. **FIX:** `seedBurst` honors `opts.look==="coin"` → `look:1` (+ the spin
  fields `aspect`/`glint`, `vrot` exists) so coins render on CPU inline AND GL/GPU overlay; keep it OUTWARD (T173).
  **Add the missing gate** (a `look:"coin"` ballistic burst must tag `look===1` particles). [B]-only (`fxgl.js`, tests).
- **`T197` — the COINS need the dither/pixelation too** (T195 filtered the SHAPE, not the coins). Put the coins
  through the same brickmap halftone-dither (recommend one pixelate + Bayer post-process over the whole hoard 2D
  overlay; or quantise each coin's tones via T195's gold-ramp+`bayer4`). **NO colour shift** (owner dropped it).
- **`T199` — a full pile must reach the TOP of the screen** (`HOARD_MAX_H` 0.82 → ~0.95–1.0; level 1.0 fills it —
  after T198 that's peak wealth, 1T reads ~75% tall).
- **`T200` — coin COLOUR by height:** dark coins lower, light coins higher (bias each coin's gold tone by its
  fill-rank `q`; keep a mix at every level; deterministic/stable with T196). Not a hard split, a gradient.
- All [B]-only (`fxgl.js`, tests). *(BACKLOG T193/T197/T199/T200.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm:** the Magnar app icon (reinstall the PWA to see the launcher icon). **Force-refresh the PWA**
before re-testing any hoard change (the service worker caches). Lofi (T190) already confirmed ✓.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
