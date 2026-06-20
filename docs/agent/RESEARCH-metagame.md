# Research — can a metagame drive sustained interest in maths drills?

> Commissioned to answer the owner's question: *how can a metagame keep a child
> coming back to drills, and what are the related risks?* Six evidence passes
> (reward psychology; intrinsic vs. extrinsic motivation; named maths apps —
> TTRS, Sumdog, Prodigy, Mathletics, Khan, Duolingo; gamification anti-patterns;
> idle/incremental design). This doc is the **decision layer**: what the evidence
> says, then what *we* do about it. Sources at the end.

## Headline answer

**Yes — a metagame is justified, and most of our instincts are right — but the
gains are modest and conditional.** Meta-analysis (Sailer & Homner 2020) puts
gamification's effect on learning at *small-to-moderate* (cognitive g≈.49,
motivational g≈.36, behavioural g≈.25) and **heterogeneous**. The decisive
variable is **which** mechanics: those that satisfy **competence, autonomy and
relatedness** (mastery progress, meaningful choice, identity/collection) help;
bare **points/badges/leaderboards** can *backfire* — a 16-week classroom study
(Hanus & Fox 2015) found leaderboards+badges *lowered* motivation **and** exam
scores over time. So "add a metagame" is not automatically good; "add the right
mechanics, tied to mastery, and avoid the social-comparison traps" is.

**Two facts make our situation unusually favourable:**

1. **Maths drills aren't intrinsically interesting for most kids — so the
   over-justification risk is low.** The classic effect (Lepper/Greene/Nisbett
   1973; Deci/Koestner/Ryan 1999 meta-analysis, d≈−.36 for tangible/expected
   rewards) only destroys interest that was *already there*. On low-interest
   tasks, even the reward-sceptics (Cameron/Eisenberger) and D/K/R **agree**
   rewards don't undermine and can help. Rote arithmetic is exactly such a task.
   Our real risk isn't "killing a love of arithmetic" — it's **reward-dependence
   and points-chasing crowding out mastery** once interest *does* start to grow.
2. **We have no monetisation — every reward is earned and non-purchasable.** This
   sidesteps the entire minefield that the named apps fell into: Prodigy drew a
   2021 **FTC complaint** (16 membership ads vs. 4 maths battles in one session;
   "free" while upselling children; pay-gated loot boxes) and the loot-box ↔
   problem-gambling correlation (Zendle & Cairns; *stronger in adolescents*) is
   **entirely about spending money**. Variable-rarity loot is psychologically
   potent **and** ethically fine *as long as nothing is ever purchasable*. This
   is our single biggest advantage and the one line we must never cross.

## What the evidence actually supports (condensed)

- **Streaks are the best-evidenced retention lever in education** — and we don't
  have one. Duolingo optimises around a 7-day "streak-establishment" metric
  (loss aversion "kicks in" ~day 7) and has run 600+ experiments on streaks
  alone; it's the clearest habit-formation proof point in the space. **But** the
  same feature is their most-criticised dark pattern (guilt-trip owl; bandit-timed
  notifications; "engagement ≠ learning"). The mechanic is powerful; the
  *guilt/loss-aversion weaponisation* is the harm. We can take the former without
  the latter.
- **Collection + curiosity gaps** are well-grounded: Zeigarnik (interrupted tasks
  recalled ~90% better) and Loewenstein's information-gap theory both predict
  that locked "?" tiles and half-finished sets create productive pull. We already
  do this. Khan's mastery-points roll-up and Pokédex-style collection are the
  same family.
- **Identity/ownership (heroes/avatars)** raises investment via the endowment
  effect and serves **relatedness** (Sailer et al. 2017: avatars/story/teammates
  specifically raise *relatedness*; badges/leaderboards raise *competence*). For
  a single-player app, heroes + light narrative are our main relatedness lever.
- **Variable/surprise rewards** don't undermine motivation (unexpected rewards
  never did, in D/K/R) and ride the most robust behavioural schedule
  (variable-ratio). Safe for us because we don't sell anything.
- **Mastery framing beats participation rewards.** Khan deliberately under-games,
  centring Bloom's mastery learning; its design is praised as *avoiding* the
  worst extrinsic traps (though criticised as less "sticky" than streak apps).
  Performance/competence-contingent rewards + informative feedback are the
  reward category SDT says *supports* intrinsic motivation.

## Decisions for our game (mechanic by mechanic)

**Keep (evidence-backed, already right):**

- **Collectibles with locked "?" tiles + "100% requires real mastery."** This is
  our strongest single design choice: it turns completionism into genuine skill
  (Lightning speed, Flawless, Mastery) rather than grind. Keep exactly.
- **Local-only, self-comparison progress; no public leaderboards.** We already
  removed Hall of Fame — keep it gone. Leaderboards demonstrably harm the kids
  already behind (Hanus & Fox; stereotype-threat work; a 2025 study found
  leaderboards cut *girls'* social engagement). Personal-best heat-map = right.
- **Mastery gate (no skips + gentle time) for Part 2.** Textbook
  competence-contingent reward. Keep; keep the time bar *gentle* and the unlock
  *celebratory*.
- **Rank ladder + per-question Beat/Spark.** Competence signalling. Keep.

**Add / change (the actionable findings):**

1. **Add a gentle daily-practice streak — the ethical version.** This is the
   biggest *missing* retention lever. Rules that keep it on the right side of the
   research:
   - Counts **days you practised** (≥1 round), celebrated on return; **never**
     guilt-trips or shames a missed day (no crying-owl, no "you're about to lose
     it" pressure). We're a web app with **no push notifications** — we keep it
     that way; that alone removes Duolingo's worst vector.
   - **Forgiving:** a built-in "streak freeze"/grace so one missed day doesn't
     wipe weeks — protects the child from the loss-aversion sting we're
     deliberately *not* exploiting.
   - Framed as **competence/consistency** ("5 days practised — nice"), and it
     feeds the existing collectible/milestone system rather than a separate
     pressure economy. → **New backlog task (T31).**
2. **Gold: give the rising number a *purpose* and a mastery-pointed sink.** The
   idle-game literature is blunt: **a currency with no sink devalues itself** and
   trains "watch the number go up" *decoupled from the activity*. Two protections:
   - Our Gold only grows **by playing** (no offline/idle accrual) and earning is
     **scaled by clean+fast performance, not time/attempts** — keep both; that
     keeps the "tap" = doing maths, and avoids paying for mere participation.
   - Even with spending **on hold**, give Gold *anticipated* purpose now: visible
     **wealth milestones/ranks** act as a soft sink (a goal the pile is "for" —
     the "pinch point" that makes accumulation feel meaningful). When a real sink
     ships, make it **prestige-style and pointed back at drilling** (spend Gold →
     future *drilling* earns faster, à la AdVenture Capitalist's Angels), **never**
     a cosmetic/pay-to-win shop and **never** purchasable with real money.
   - → fold into **T26**; documented in DESIGN-heroes.md Gold section.
3. **Protect against timed-pressure anxiety — our biggest pedagogical risk.**
   The single most-documented criticism of TTRS (our closest analog) is
   timer-driven maths anxiety (Boaler: ~⅓ of students stressed by timed tests
   *regardless of ability*; stress consumes working memory). We are a speed drill
   by nature, so we mitigate rather than eliminate:
   - Keep "**accuracy before speed**" framing; keep the mastery time-bar gentle
     and never the source of shame.
   - Offer a **relaxed/practice (no-pressure) way to play** (cf. TTRS's
     timer-light "Jamming") so a nervous child can build fluency before chasing
     speed brackets. → **New backlog task (T32), Wave-2 priority.**

**Hard red lines (never cross):**

- **Nothing is ever purchasable** — no real-money anything, no premium currency,
  no pay-to-open chests, no cosmetic shop behind money. This is what got Prodigy
  an FTC complaint and is the entire loot-box/gambling-harm boundary.
- **No public or social leaderboards / name-and-shame.** Self-comparison only.
- **No guilt/loss-aversion dark patterns** (streak-shaming, fake "you're about to
  lose X", manipulative notifications).
- **No near-miss manipulation** (e.g. faking "just missed" rare drops). It's the
  collection mechanic most tied to gambling harm; our drop odds stay honest.
- **No reward for mere time/clicks/participation** — rewards track mastery, so we
  don't teach point-chasing over understanding (the core Prodigy/Sumdog/Mathletics
  critique: kids optimise the game, not the maths).

## Net effect on the plan

The metagame stays **equal-priority** with the drills (owner's call) and is
**well-justified** by the evidence — *because* ours is mastery-contingent,
non-monetised, collection-and-identity-led, and local-not-competitive, which is
exactly the profile the research says works and avoids the profile that backfires.
Concrete changes queued from this research: **T31 (gentle streak)**, **T32
(relaxed/practice mode)**, and tightened guidance on **T26 (Gold = mastery-pointed
prestige sink, never a shop)**. Everything else we were already doing lines up
with the evidence.

## Sources

Strongest (peer-reviewed): Lepper, Greene & Nisbett (1973) over-justification;
Deci, Koestner & Ryan (1999) meta-analysis (*Psych Bulletin* 125) + Ryan & Deci
SDT/CET; Cameron & Pierce (1994) / Eisenberger & Cameron (1996) counter-position;
Sailer & Homner (2020) gamification meta-analysis (*Educ Psych Review*); Sailer et
al. (2017) element-specific effects (*Computers in Human Behavior*); Hanus & Fox
(2015) leaderboard backfire (*Computers & Education*); Zendle & Cairns (2018/2019)
and Zendle, Meyer & Over (2019) loot-box ↔ problem-gambling (incl. adolescents);
Drummond & Sauer (2018) *Nature Human Behaviour*; Mogavi et al. (2022) "When
Gamification Spoils Your Learning" (L@S); Settles & Meeder (2016) HLR spaced
repetition; Bloom 2-sigma; Boaler/Beilock/Ramirez on timed-test anxiety
(advocacy-leaning on the strong claims — flagged).

Named-app evidence (mostly vendor/practitioner — treat scale/efficacy figures as
directional): TTRS modes & coins (publisher help-centre) + Thomson & Wright
academic critique (anxiety, speed-over-understanding, no formal efficacy study);
Sumdog efficacy (ImpactEd, no control group) vs. Glasgow "binned Sumdog"
(independent, critical); Prodigy FTC complaint (Fairplay; EdWeek/NBC/Axios) +
Johns Hopkins commissioned study; Mathletics ESSA Level II (commissioned);
Khan energy-points/mastery + SRI (2014) & Nov-2024 efficacy; Duolingo streaks/
leagues + investor DAU figures + the "engagement ≠ learning" critique.

Idle/incremental: Pecorella GDC talks ("The Math of Idle Games"); Lantz
(*Universal Paperclips*); Machinations.io on taps/sinks, currency inflation and
the "pinch point"; AdVenture Capitalist Angel-Investor prestige model.

> Full URL list for every claim is preserved in the research-agent transcripts
> for this session; the load-bearing studies above are the ones to cite.
