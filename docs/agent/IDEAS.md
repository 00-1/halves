# Ideas — parking lot (NOT tasks; do NOT build)

> Babysitter-owned. A holding place for **future ideas the owner wants captured but
> not yet queued**. Nothing here is a task. The Builder must **not** pick anything up
> from this file — work is only ever the topmost `OPEN` task in `BACKLOG.md`. When the
> owner decides to proceed with an idea, the Babysitter promotes it into `BACKLOG.md`
> as a properly-specced task (or tasks) at that point.

---

## I1 — Events: time-limited rotating challenges (owner idea, 2026-06-21)

**Concept.** Limited-time "challenges with rewards you can only get *today*" — a sense
of "be here now". They **rotate** (owner suggested roughly a **two-week cycle**) so a
given event comes around again later (FOMO, but not permanent loss).

**Owner's sketch.**
- Some kind of **special maths challenge** (a distinct mode/ruleset, not just a normal
  round), with **its own compelling graphics + text** (events should feel special, not
  reskinned).
- Possibly an **accompanying limited-time Arena** (or similar) tied to the event —
  e.g. a special foe / boss / region available only during the event.
- **Today-only rewards** that you miss if you don't play, but the event recurs on the
  cycle so the reward is obtainable again next time around.

**Key constraint to design around (important).** The game is a **static site, no
backend**. So events **cannot** be server-driven — the schedule and "what's live today"
must be **computed deterministically from the date** (a baked-in rotating calendar +
the device's local day). We already have a local-day signal (the T31 momentum
day-counter / `localDay`) to reuse. "Today-only" therefore keys off the device clock.

**Open questions to resolve before queuing (don't decide now):**
- **Reward exclusivity vs. the collection.** Do event rewards count toward the
  Collector ladder / carry hero **buffs** (and thus feed Arena power)? If yes, missing
  an event temporarily gates power until it recurs — need to keep the "no tier gated
  behind unobtainable loot" invariant intact. If no (cosmetic-only event rewards),
  simpler and safer. → likely **cosmetic / separate "Events" collectible category** so
  it never breaks Arena buff-gating.
- **Rotation schedule.** A fixed ordered list of N events cycling every 2 weeks,
  indexed by `floor(daysSinceEpoch / 14) % N`? Deterministic, offline-safe, recurs.
- **Surfacing.** A home-screen **"Event live!" banner / entry** with a countdown
  ("ends in 3 days"); its own art + copy.
- **The challenge itself.** A new ruleset (e.g. a themed mixed-topic gauntlet, a
  speed/accuracy gauntlet, a "boss maths" fight) — needs its own generator + a new
  procedural art set (per the anti-dilution rule).
- **Engagement, not pressure.** Keep it calm/forgiving (consistent with the momentum
  design — no streak-anxiety); a missed event recurs, never punished.
- **Scope.** Could be large (new mode engine + art + scheduler + Arena variant +
  banner). When queued, likely **several** tasks (scheduler/infra → one event template
  → art/copy → optional event-Arena), behind a short design doc.

*(Status: captured, NOT queued. Promote to BACKLOG when the owner says go.)*
