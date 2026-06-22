# GG2 · P0 — Pluggable INPUT system design — Babysitter, 2026-06-22

> Prep spec for milestone **P0.2** — the make-or-break investment (FRANCHISE-DESIGN §4). GG1's numeric numpad
> is hard-wired; VR/IQ content needs **multiple-choice, letter-tiles, tap-a-target**, etc. P0.2 makes INPUT a
> pluggable CORE module: **a question declares its input mode; the shell renders the right widget + checks the
> answer.** MCQ ships first. Companion: `GG2-P0-EXTRACTION.md` (the CORE seam this lives in — `core/round.js`).

## Today's hard-wired seam (what we generalise)
In GG1 `main.js`: `press(k)` builds a string `input` from numpad keys (digits / `.` / `back` / `skip`, with a
5-char guard), and `checkAuto()` does `parseFloat(input) === order[idx].a` → auto-advance on match. The question
is `{p, a}` (prompt, numeric answer). **Two things are baked in:** the *widget* (numpad) and the *check*
(float-equality). Both must become per-question-mode strategies.

## The design — an INPUT MODE is a strategy module
A question gains an optional **`inputMode`** (default `"numeric"` so GG1 is unchanged). Each mode is a small
module implementing one interface; CORE's round loop owns the lifecycle, the mode owns widget + validation:
```
InputMode = {
  id,                                  // "numeric" | "mcq" | "tiles" | "tap" | …
  mount(host, question, ctx),          // render the widget into the answer area; wire events
  // the mode reports outcomes back to CORE via ctx (not by knowing the round loop):
  //   ctx.submit(value)   → CORE checks via check() and handles correct/incorrect/advance
  //   ctx.live(value)     → optional: CORE may auto-check (numpad-style) without a Submit btn
  check(question, value),              // → true/false (the answer test for THIS mode)
  reveal(question),                    // → the display string when skipped/shown ("= 42", the right tile)
  unmount(),                           // tear down (next question)
  capabilities,                        // { autoCheck?, needsSubmit?, a11yLabel }
}
```
- **CORE round loop** stays mode-agnostic: it calls `mount` on each question, listens for `submit`/`live`, runs
  `check`, then does the existing correct()/skip()/advance + scoring/combo/streak (all CORE). Skip uses `reveal`.
- **A question declares its mode + the data that mode needs** (e.g. MCQ carries `choices`). The generator
  (pack `topics`) produces it; CORE never hard-codes a mode.

## Question shape (back-compat)
```
GG1 numeric:  { p:"half of 24", a:12 }                              // inputMode omitted → "numeric"
MCQ:          { p:"SYNONYM of BIG", a:"large",
                inputMode:"mcq", choices:["large","small","blue","run"] }   // a = the correct choice
Tiles:        { p:"unscramble: TPALN", a:"PLANT", inputMode:"tiles", tiles:"TPALN" }
Tap-target:   { p:"tap the odd one out", inputMode:"tap", targets:[…], a:<id> }
```
`check`: numeric = `parseFloat(v) === q.a` (today's logic, verbatim); mcq/tiles = string-equal (normalised
case/space); tap = id-equal. **Answers stay single + unambiguous** (the GG1 discipline) for every mode.

## The modes — build order
1. **`numeric`** — extract GG1's numpad AS-IS into this module first (proves the interface with zero behaviour
   change; GG1 still passes). The reference implementation.
2. **`mcq`** — **ship first for GG2** (FRANCHISE-DESIGN §4). N tappable choice buttons; one correct (`a`); the
   rest are pack-supplied **distractors** (the generator must produce plausible wrong answers — a real content
   task, assess them like questions). `needsSubmit:false` (tap = submit). Keyboard + screen-reader accessible.
3. **`tiles`** — on-screen letter/number tiles to assemble an answer (anagrams, alphabet arithmetic, codes);
   tap-to-place + backspace; `Submit`.
4. **`tap`** — tap a target among several (odd-one-out, hidden word, analogy grids).
*(Numpad is retained — some VR atoms are numeric; and GG-maths sequels reuse it.)*

## Why this matters / risks
- **MCQ distractors are content, not chrome.** A weak distractor set makes a question trivially guessable — so
  the M2 enumeration-harness + assessment loop must judge **the choices**, not just the answer. Flag in M2.
- **One answer, unambiguous** must hold across modes (no two correct tiles, exactly one right choice) — extend
  the GG1 question-integrity regression gate to cover each mode.
- **A11y + touch targets**: MCQ/tile buttons need ≥44px hit areas, keyboard nav, `aria` labels — bake into the
  widget once, every pack inherits it.
- **Scoring parity**: combo/speed/streak are CORE and mode-agnostic — a fast correct MCQ scores like a fast
  correct numpad entry. Don't let a mode reach into scoring.

## P0.2 exit criteria (DoD)
`core/round.js` drives questions via the `InputMode` interface; **`numeric` extracted with GG1 behaviour
byte-identical** (suite green, live app unchanged); **`mcq` implemented + demoable** in the gg2-pack skeleton with
a placeholder question; the question-integrity gate covers per-mode "exactly one unambiguous answer"; widgets are
touch/keyboard/SR accessible. *(tiles/tap follow as M2 needs them.)*

*Living prep doc — Babysitter-owned. Cross-ref: GG2-MILESTONES P0.2, GG2-P0-EXTRACTION (core/round.js), FRANCHISE-DESIGN §4.*
