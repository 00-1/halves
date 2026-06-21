# Music styles for Halves — genre DNA → a concrete 12-style palette (T141)

**Task:** T141 [B] (research; precedes T139 build). **Owner:** keeps **menu** + **arena**,
finds the others samey, wants the **dubstep victory** back — so: *"a research pass on
musical styles to really get those 10 new styles unique/interesting,"* then a **12-style
launcher palette**. **Author:** Builder B (built the `synth.js` engine — same T119→T120
pattern). The Babysitter surfaces the proposed table below to the owner for a thumbs-up
before **T139** implements it.

This maps each style's **genre DNA** — tempo · mode/progression · rhythmic feel ·
instrumentation/register · the production trick that makes it *recognisable* — onto **this
engine's** levers, and flags the small patch additions a few styles need. References cited
`[n]` at the end; recipes borrowed brickmap-style (the technique, not an asset).

---

## 0. The engine's levers (what a "style" is, concretely)

A style in `synth.js` is a `CONTEXTS` row consumed by the one lookahead scheduler. The
levers we can turn **today**:

- **`tempo`** (BPM), **`mode`** (ionian/dorian/phrygian/lydian/mixolydian/aeolian/
  pentatonic/pentminor), **`root`** (register), **`progression`** (scale-degree chord roots
  → harmony + voice-leading), **`density`** (lead activity).
- **Kit** via Euclid `kickK`/`hatK`/`snareK` (onsets per 16-step bar) and the lead Euclid
  `leadK`; `leadOct` (lead register).
- **Patches**: `pad` (3-osc detuned saw), `pluck` (triangle, snappy filter env), `bass`
  (saw, low-cut), `bell` (FM mallet), `lead` (square), `wub` (saw → resonant LP swept by an
  LFO). Each is a real instrument (ADSR + filter env).
- **`reverb`** (FDN send level), the **`intensity()`** morph, and one-shot **`sting()`**.

**The rhythm grid is 16 steps/bar.** Useful Euclid facts: `euclid(4,16)` = four-on-the-floor
(kick on every ¼); the engine already puts **bass on step 0 & 8** (a half-time 1-&-3 pulse),
which is exactly the dubstep/half-time backbone `[1]`.

### Small engine additions a few styles want (for T139 — all tiny, no-build)
1. **Tempo-synced wub rate** — the `wub` LFO is a fixed 7 Hz; for a *musical* wobble lock it
   to the beat (`rate = tempo/60 × {2 or 4}` = ⅛/¼-note wobble) `[1]`. One line in the wub
   render (read an optional `lfoSync`/`wobbleRate` off the patch/context).
2. **A `chip` patch** — a very short square/pulse pluck for chiptune arps (reuse the `mono`
   square engine with a fast amp `{a:.001,d:.06,s:0,r:.02}` and no/low reverb). Optional —
   `lead` (square) already approximates it.
3. **Optional swing** — delay the odd 16ths ~12–22% for lo-fi/tropical feel (a scheduler
   `swing` field applied to `M.next` on odd steps). Characterful but optional.
4. **A noise riser/sweep + a "drop" gesture** for the dubstep victory / big-room build — a
   filtered-noise sweep patch (the engine already has the seeded noise buffer) and a
   `sting`-driven drop (sub wub hit + bright stab). Built in T139 as the **victory sting**.
5. *(optional)* **per-context reverb decay** — the FDN decay is fixed (0.78); a longer tail
   for **ambient** is nicer than send-level alone. One field on `makeReverb`/context.

None block the palette: every style below renders on **today's** patches; the additions just
sharpen 3–4 of them. They're flagged per-row.

---

## 1. Genre DNA → engine recipe (the 10 new + the 2 kept)

### Dubstep (the VICTORY) — half-time wobble + a drop
DNA: **138–142 BPM played half-time** (feels ~70) `[1]`; kick on **1**, snare on **3** (the
half-time backbone) `[1]`; the signature is an **LFO modulating a bass synth's cutoff** at
¼/⅛-note rates (the "wobble"), and a **drop** — a dramatic shift into the heavy bass `[1]`.
Engine: `wub` patch *is* an LFO→cutoff bass; add the **tempo-synced wobble rate** (add #1).
Dark `phrygian`/`pentminor`, low `root`, `kickK:4`+`snareK` on the backbeat, dry-ish.
**Used as the win sting** (a short build→drop on the **un-ducked SFX bus** — the T128 lesson),
*and* selectable in the launcher as a loop.

### Chiptune — fast square arps, no reverb
DNA: simple **pulse/square + triangle + noise** waveforms, **rapid arpeggios** that fake
chords on few channels, **fast & frantic**, **dry** (no reverb) `[2]`. Engine: high `density`,
fast `leadK` (busy lead Euclid), high `leadOct`, `lead`(square)/the `chip` patch, `pad` off or
thin, triangle-ish `bass`, `reverb:0`, pentatonic-major so the fast runs never clash. ~150 BPM.

### Synthwave — gated snare, arpeggiated saws, neon
DNA: **80–140 BPM** (dreamy 80–120, driving 128+) `[3]`; **arpeggiated synths** + 1980s drum
machine: **kick 1 & 3, snare 2 & 4, rapid hats**, **gated reverb on the snare** `[3]`;
saw-based patches with filter movement `[3]`. Engine: `aeolian`, `pad`(saw)+`lead`, an arp via
`leadK`, `snareK` on the backbeat, **mid-high reverb** (our FDN ≈ the gated-snare space),
~112 BPM, root mid.

### Lo-fi (CALM #1 — for solves) — swung, jazzy, soft
DNA: slow **~70–85 BPM, swung**, **jazzy 7th-ish** harmony, soft attacks, sparse, **very few
drums** (a brushed hat, soft kick), wet/dusty. Engine: `dorian` (our jazziest mode), slow
tempo, soft `pad`+`pluck`, `kickK:0–1`, a light `hatK`, high `reverb`, low `density`, +the
**swing** add (#3). *(This is the engine's calm-solve heir — replaces the old "solve".)*

### Ambient (CALM #2) — drone, no kit, very wet
DNA: **drone/pad-led, no beat, very long reverb tail**, slow harmonic motion, bright/floating.
Engine: `lydian`, very slow (~60), `pad` drone + sparse `bell`, **no kit** (`kickK/hatK/snareK
= 0`), **max reverb send** (+optional longer FDN decay #5), tiny `density`.

### Drum & Bass — fast breakbeat + sub
DNA: **~174 BPM**, a **syncopated breakbeat** (not four-on-floor), deep **sub bass**, sparse
melodic stabs, minor. Engine: fast tempo, a **breakbeat Euclid** (`hatK`/`snareK` chosen for
syncopation, e.g. snare on the off-beats), `wub`/`bass` low + slow, `aeolian`, mid reverb,
moderate `density`.

### Festival / Big-Room (festive) — four-on-floor + build/drop
DNA: **~128 BPM**, **four-on-the-floor kick** (`euclid(4,16)`), big bright **supersaw**
leads, a **build → drop**. Engine: `lydian`/major, `kickK:4`, `pad`(supersaw)+`lead` bright
high, high `density`, mid reverb; the **drop gesture** (#4) on entry. The festive pick.

### 8-Bit Boss March — dark chiptune, driving
DNA: minor **march** (kick 1 & 3, snare backbeat), **square lead**, relentless, dry. Engine:
`phrygian`, ~140, square `lead`, `kickK`+`snareK` march pattern, low-mid `root`, low reverb —
a darker cousin of Chiptune for boss/tension.

### Synth-Tropical Pluck (light, major) — airy & plucky
DNA: **~100–105 BPM, mixolydian/major**, bright **plucked/mallet** melodies, **light
syncopated percussion**, airy. Engine: `mixolydian`, `bell`+`pluck`, light `hatK`, mid `root`
high `leadOct`, airy reverb, moderate density. A daytime/menu-ish bright option.

### Hypno-Techno (minimal) — hypnotic four-floor
DNA: **~125 BPM**, **four-on-the-floor**, hypnotic **minimal stabs**, sparse, steady bass,
dark. Engine: `aeolian`/`phrygian`, `kickK:4`, sparse `lead` stabs (low `density`, short
`leadK`), a steady `bass`/`wub`, mid reverb. A focused, driving-but-not-busy option.

### Menu — "Neon Lobby" (KEPT) — bright welcoming
Ionian, 96, high `bell`, light kit, mid reverb. (Owner likes it — unchanged.)

### Arena — "Phrygian Onslaught" (KEPT) — dark driving
Phrygian, 124, `wub` bass, full kit, dry, dense. (Owner likes it — unchanged.)

---

## 2. The proposed 12-style palette (the spec T139 implements)

Each row is a `CONTEXTS` entry. `K` = Euclid onsets/16. `lead` patch in **bold** when it's the
style's signature. *Add* = the engine addition it benefits from (all optional except the
dubstep wobble-sync + the victory drop, which T139 builds).

| # | id · launcher label | tempo | mode | root | progression | dens | reverb | kickK·hatK·snareK | leadK·Oct | pad·bass·**lead** | feel / DNA | add |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `menu` · **Neon Lobby** *(kept)* | 96 | ionian | 60 | 0,3,4,0 | .34 | .26 | 4·6·2 | 6·2 | pad·bass·**bell** | bright welcoming | — |
| 2 | `arena` · **Phrygian Onslaught** *(kept)* | 124 | phrygian | 45 | 0,5,6,4 | .62 | .16 | 6·12·2 | 9·1 | pad·**wub**·lead | dark driving | — |
| 3 | `lofi` · **Lo-Fi Study** *(CALM/solve)* | 76 | dorian | 50 | 0,5,3,4 | .24 | .42 | 1·3·0 | 4·1 | pad·bass·**pluck** | swung, jazzy, soft | swing |
| 4 | `ambient` · **Ambient Drift** *(CALM)* | 60 | lydian | 55 | 0,3,0,4 | .14 | .55 | 0·0·0 | 3·1 | **pad**·bass·bell | drone, no kit, very wet | reverb-decay |
| 5 | `chiptune` · **Chiptune Rush** *(festive)* | 150 | pentatonic | 60 | 0,4,5,3 | .60 | .04 | 4·8·2 | 11·2 | pad·bass·**lead** | fast square arps, dry | `chip` patch |
| 6 | `synthwave` · **Synthwave Cruise** | 112 | aeolian | 50 | 0,5,3,4 | .42 | .34 | 4·8·4 *(snare 2&4)* | 7·2 | **pad**·bass·lead | gated snare, neon arp | — |
| 7 | `dubstep` · **Dubstep Victory** *(the DROP / win sting)* | 140 | pentminor | 36 | 0,0,5,3 | .40 | .14 | 4·6·2 *(half-time 1&3)* | 6·1 | pad·**wub**·lead | half-time wobble + drop | **wobble-sync + drop** |
| 8 | `dnb` · **Liquid DnB** | 174 | aeolian | 43 | 0,5,3,4 | .44 | .30 | 4·10·6 *(breakbeat)* | 8·1 | pad·**wub**·lead | breakbeat + sub | — |
| 9 | `bigroom` · **Festival** *(festive)* | 128 | lydian | 57 | 0,3,4,5 | .56 | .26 | 4·10·4 *(4-floor)* | 8·2 | **pad**·bass·lead | four-floor + build/drop | drop gesture |
| 10 | `boss8bit` · **8-Bit Boss March** | 140 | phrygian | 48 | 0,1,0,5 | .50 | .10 | 4·6·4 *(march)* | 9·1 | pad·bass·**lead** | dark square march | `chip` patch |
| 11 | `tropical` · **Tropical Pluck** | 104 | mixolydian | 57 | 0,4,5,2 | .40 | .30 | 3·8·2 | 7·2 | pad·bass·**bell** | airy, plucky, light | swing |
| 12 | `techno` · **Hypno Techno** | 126 | aeolian | 45 | 0,0,5,5 | .34 | .28 | 4·8·0 *(4-floor)* | 5·1 | pad·**wub**·lead | minimal hypnotic | — |

**Spread check (so they don't feel samey):** tempo **60→174**; **8 distinct modes**;
rhythmic feels span **drone · swung · half-time · backbeat · four-on-floor · breakbeat ·
march**; signature instrument varies **bell · pluck · square · wub · supersaw · drone**;
reverb **0.04 (dry) → 0.55 (wash)**; density **0.14 → 0.62**. Calm covered (3 lofi, 4 ambient),
festive covered (5 chiptune, 9 festival), and the **dubstep victory** is back (7).

### Recommended game-context mapping (for [A]'s T140 wiring — names only here)
- **solve** → `lofi` (or `ambient`) — calm by construction.
- **menu** → `menu` (Neon Lobby).
- **arena** → `arena` (Phrygian Onslaught), morphing with `intensity()` toward the boss.
- **event** → `bigroom` or `chiptune` (festive).
- **victory sting** → `dubstep` drop on the **un-ducked SFX bus** (so it cuts through, T128).
- The **launcher** lists all 12 by label for sampling.

---

## 3. T139 build checklist (what implementing this needs)
1. Replace `CONTEXTS` with the **12 rows** above (keep `menu`/`arena`; drop the old
   `solve`/`event`).
2. **Engine adds:** tempo-synced wobble rate on `wub` (dubstep/dnb/techno benefit); a `chip`
   square-pluck patch (chiptune/8-bit); *(optional)* a scheduler `swing` field (lofi/tropical);
   *(optional)* per-context reverb decay (ambient).
3. **Dubstep victory = a real audible drop** reusable by the win sting via `sting()` on the
   **un-ducked SFX bus** (a build → sub-wub drop + bright stab).
4. Extend the **`golden-synth` distinctness gate to all 12** (regen the score goldens —
   intentional) and add per-style score goldens; assert all 12 mutually distinct.
5. Keep the firm **calm (lofi/ambient) ↔ energetic (arena/dnb/bigroom)** invariants in
   `synth.test.js`. `node -c` clean; B-owned only.
6. **Hand A the final names/labels** (the `id · label` column) in `BUILDER-LOG-FX.md` for the
   T140 launcher + context wiring.

---

## References
1. *What BPM is dubstep? / half-time, wobble (LFO→cutoff), the drop* — bpmcalc, DJ.Studio,
   ModeAudio, eMastered — https://bpmcalc.com/genres/dubstep/ ·
   https://dj.studio/blog/bpm-for-dubstep · https://modeaudio.com/magazine/dubstep-5-production-essentials ·
   https://emastered.com/blog/how-to-make-dubstep
2. *Chiptune — pulse/square + triangle + noise, fast arpeggios, dry* — Wikipedia, MusicRadar,
   eMastered — https://en.wikipedia.org/wiki/Chiptune ·
   https://www.musicradar.com/tutorials/exploring-the-retro-video-game-inspired-chiptune-universe ·
   https://emastered.com/blog/how-to-make-chiptune-music
3. *Synthwave — 80–140 BPM, arpeggiated saws, kick 1&3 / snare 2&4, gated-reverb snare* —
   Wikipedia, Orpheus Audio Academy, ModeAudio — https://en.wikipedia.org/wiki/Synthwave ·
   https://www.orpheusaudioacademy.com/how-to-make-synthwave/ ·
   https://modeaudio.com/magazine/synthwave-5-production-essentials
4. Prior in-repo research: `docs/research-generative-audio.md` (the engine's techniques —
   ADSR, BiquadFilter+LFO/the wub, FDN reverb, Euclid rhythms, modes-for-mood).
