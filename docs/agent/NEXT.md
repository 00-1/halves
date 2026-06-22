# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T184` + `T182` 🔴 BOTH DO-FIRST (dev mode in the menu + visible pile) → wire Codex Emblems**
The owner is **blocked from testing** — can't enable dev tools without editing URLs, and can't see the pile.
- **🔴 `T184` — DEV MODE from the MENU (no URLs):** enable via **tapping the build pill ~7×** → persisted
  `halves.dev` flag → a **"Developer" section in Setup** with ALL dev tools: the **gold-setter buttons** (set real
  gold: 0/1K/1M/1Bn/1T…, refresh pill+pile+milestones), the **reveal-all-collections** toggle (heroes/inventory/
  Codex), and the **FX/hoard testers**. (Keep `?dev` as a fallback.) Off by default; remove for publish (T168).
  Absorbs T180. [A]-only. *(BACKLOG T184.)*
- **🔴 `T182` — make the pile VISIBLE:** `hoardLevel(gold) = clamp(log10(1+gold)/log10(GOLD_FULL_MAG),0,1)`,
  `GOLD_FULL_MAG`≈1e12–1e15 (1K≈25%, 1M≈50%, 1Bn≈75%, 1T≈full). The log curve makes the pile show at any wealth
  (currently power-curve → 0.17% at real gold = invisible). [A]-only. *(BACKLOG T182.)*
- **Then `T186` (BUG, owner):** all region bosses render green — every boss tier (12,24,…) lands on the same type
  because `REGION_SIZE`12 is divisible by 3. Vary boss types by region (`enemies.js`, `TYPES[region%3]`) → distinct
  colours + matchups; keep the Void Sovereign adaptive. [A]-only. *(BACKLOG T186.)*
- **Then wire the Codex EMBLEMS section** (B's `emblems.js` candidates; rest unlockable via milestones) — the
  owner's icon-review surface. *(`T168` Play-Store held for ID-verify.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T185` 🔴 BUG (the gold hoard pile is INVISIBLE — no mound even at 1T gold).** Off standby. The
data is correct (`scene.hoard` = level 1.0 is fed to the engine — confirmed), but **no mound draws.** Investigate
the RENDER: **(A) most likely OCCLUSION** — the mound anchors at the bottom 34% of the backdrop, which is
`z-index:-1` **behind the opaque home UI** (topic card + Start/Practice/Guide + nav) → hidden; **(B)** confirm the
hoard layer draws on the device's actual backend (WebGL2/WebGPU vs Canvas2D-still fallback). Browser-verify the
mound at level 1.0 (use the dev gold-setter → home). **The placement likely needs an owner call** (the bottom is
opaque UI) — Babysitter is surfacing options. B-owned (`fxgl.js`); a home-layout move is an [A] companion I'll
split out. *(BACKLOG T185.)*

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*

