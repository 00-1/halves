/*
 * Halves — daily Events scheduler + roster (T78, Phase 6.5).
 *
 * Daily, time-limited maths challenges with today-only rewards. A fixed roster
 * of 14 events cycles once per UTC day at 00:00 UTC, so the whole set recurs
 * every 14 days. Everything is DETERMINISTIC from the device's UTC date — there
 * is no backend. "What's live today" is a baked-in rotating calendar indexed by
 * the UTC day number; "today-only" keys off the device clock at 00:00 UTC.
 *
 * Pure + offline: every helper takes an optional `now` (ms epoch) so the clock
 * is injectable and the module is unit-testable (no Date.now baked in). The day
 * index uses UTC (floor(ms / 86_400_000)) so the rollover is 00:00 UTC, never
 * local midnight.
 *
 * Each event is a distinct, compelling thing — its own copy, question mix and
 * reward (real bespoke art + music arrive in T81). `questionMix` is the spec the
 * play mode (T79) reads: which existing topics, and how many questions each.
 * The reward is a real collection member with id `event:<id>` (registered in
 * collectibles.js) that carries a hero buff and feeds Arena power like any loot.
 *
 * window.Events = {
 *   ROSTER, roster(), today(now), isLive(id,now), daysUntilLive(id,now),
 *   indexFor(now), epochDaysUTC(now), byId(id), rewardId(id)
 * }
 */
(function(){
  "use strict";
  const DAY_MS = 86400000;   // 24 * 60 * 60 * 1000

  // The 14-event roster. Each event: a distinct challenge with real copy, a
  // themed cross-topic question mix (topics reference modes.js ids), a reward
  // item name/rarity (the `event:<id>` collectible), and art/music seeds for the
  // bespoke presentation in T81. Order = the daily cycle (index 0 runs on UTC
  // day 0, 14, 28, …). Names/blurbs never leak an answer.
  const ROSTER = [
    { id:"halving-moon", name:"The Halving Moon", theme:"lunar",
      blurb:"Under the cold moon every number must be cleft in two. Halve swiftly before the light fades.",
      reward:"Moonsplit Talisman", rarity:"epic", artSeed:1071, musicSeed:3,
      questionMix:[ {topic:"halves",n:6}, {topic:"doubles",n:4}, {topic:"fractionsof",n:3} ] },
    { id:"tables-gauntlet", name:"The Tables Gauntlet", theme:"arena",
      blurb:"A relentless run through the times tables. Keep your nerve to the end of the gauntlet.",
      reward:"Gauntlet of Twelves", rarity:"epic", artSeed:227, musicSeed:5,
      questionMix:[ {topic:"times",n:8}, {topic:"squares",n:4}, {topic:"doubles",n:2} ] },
    { id:"square-solstice", name:"Square Solstice", theme:"stone",
      blurb:"On the longest day the standing stones demand perfect squares, and nothing less.",
      reward:"Solstice Keystone", rarity:"legendary", artSeed:909, musicSeed:7,
      questionMix:[ {topic:"squares",n:8}, {topic:"times",n:4} ] },
    { id:"bondfire-night", name:"Bondfire Night", theme:"fire",
      blurb:"Stoke the bondfire — close every gap to a hundred before the embers die.",
      reward:"Emberbond Ring", rarity:"epic", artSeed:55, musicSeed:1,
      questionMix:[ {topic:"bonds",n:6}, {topic:"bonds2",n:4}, {topic:"addsub",n:3} ] },
    { id:"carrying-caravan", name:"The Carrying Caravan", theme:"desert",
      blurb:"The caravan crosses the dunes, carrying and borrowing across every sum.",
      reward:"Caravan Seal", rarity:"rare", artSeed:412, musicSeed:2,
      questionMix:[ {topic:"addsub",n:6}, {topic:"addsub2",n:6} ] },
    { id:"decimal-tide", name:"Decimal Tide", theme:"sea",
      blurb:"The tide shifts every digit by a place. Ride the powers of ten.",
      reward:"Tidal Abacus", rarity:"epic", artSeed:780, musicSeed:9,
      questionMix:[ {topic:"placevalue",n:6}, {topic:"placevalue2",n:6} ] },
    { id:"fraction-feast", name:"The Fraction Feast", theme:"banquet",
      blurb:"Carve the feast into fair shares — thirds, quarters and fifths for all.",
      reward:"Feastmaster's Ladle", rarity:"epic", artSeed:163, musicSeed:11,
      questionMix:[ {topic:"fractionsof",n:6}, {topic:"fractionsof2",n:6} ] },
    { id:"percent-parade", name:"The Percent Parade", theme:"festival",
      blurb:"Banners of ten, twenty-five and fifty per cent march through the square.",
      reward:"Parade Medallion", rarity:"epic", artSeed:344, musicSeed:13,
      questionMix:[ {topic:"percentages",n:6}, {topic:"percentages2",n:6} ] },
    { id:"conversion-carnival", name:"The Conversion Carnival", theme:"carnival",
      blurb:"At the carnival of forms, fractions become decimals and per cents at a turn.",
      reward:"Carnival Cipher", rarity:"rare", artSeed:621, musicSeed:6,
      questionMix:[ {topic:"fractions",n:6}, {topic:"percentages",n:4}, {topic:"fractionsof",n:2} ] },
    { id:"doubling-derby", name:"The Doubling Derby", theme:"race",
      blurb:"Two by two down the home straight — double every runner to the line.",
      reward:"Derby Rosette", rarity:"rare", artSeed:288, musicSeed:4,
      questionMix:[ {topic:"doubles",n:8}, {topic:"halves",n:4} ] },
    { id:"grand-melee", name:"The Grand Melee", theme:"battle",
      blurb:"Every discipline at once. Only the all-rounder survives the melee.",
      reward:"Melee Champion's Crest", rarity:"legendary", artSeed:1000, musicSeed:8,
      questionMix:[ {topic:"halves",n:2}, {topic:"times",n:2}, {topic:"addsub",n:2}, {topic:"bonds",n:2},
                    {topic:"placevalue",n:2}, {topic:"fractionsof",n:2}, {topic:"percentages",n:2} ] },
    { id:"midnight-mastery", name:"Midnight Mastery", theme:"night",
      blurb:"When the bell tolls twelve, only the harder second forms remain.",
      reward:"Midnight Sigil", rarity:"legendary", artSeed:1212, musicSeed:10,
      questionMix:[ {topic:"addsub2",n:3}, {topic:"bonds2",n:3}, {topic:"placevalue2",n:3},
                    {topic:"fractionsof2",n:3}, {topic:"percentages2",n:3} ] },
    { id:"quickfire-quest", name:"The Quickfire Quest", theme:"spark",
      blurb:"Snap recall, no hesitation — halves, doubles, tables and bonds in a blur.",
      reward:"Quickfire Charm", rarity:"rare", artSeed:747, musicSeed:12,
      questionMix:[ {topic:"halves",n:4}, {topic:"doubles",n:4}, {topic:"times",n:4}, {topic:"bonds",n:3} ] },
    { id:"sages-trial", name:"The Sage's Trial", theme:"scholar",
      blurb:"The old sage tests the full breadth of your reasoning. Prove your mastery.",
      reward:"Sage's Phylactery", rarity:"legendary", artSeed:1492, musicSeed:14,
      questionMix:[ {topic:"percentages2",n:3}, {topic:"fractionsof2",n:3}, {topic:"squares",n:3},
                    {topic:"placevalue2",n:3}, {topic:"fractions",n:3} ] }
  ];

  // UTC day index (00:00 UTC rollover). `now` is ms epoch; defaults to the clock.
  function epochDaysUTC(now){ return Math.floor((now == null ? Date.now() : now) / DAY_MS); }
  // Today's roster index, always 0..13 (handles negative epoch days defensively).
  function indexFor(now){ const L = ROSTER.length; return ((epochDaysUTC(now) % L) + L) % L; }
  function today(now){ return ROSTER[indexFor(now)]; }
  function byId(id){ for(let i=0;i<ROSTER.length;i++) if(ROSTER[i].id === id) return ROSTER[i]; return null; }
  function isLive(id, now){ const t = today(now); return !!t && t.id === id; }
  // Whole UTC days until this event is live again (0 if live today, else 1..13).
  function daysUntilLive(id, now){
    const L = ROSTER.length, cur = indexFor(now);
    let idx = -1; for(let i=0;i<L;i++) if(ROSTER[i].id === id){ idx = i; break; }
    if(idx < 0) return -1;
    return ((idx - cur) % L + L) % L;
  }
  function rewardId(id){ return "event:" + id; }

  window.Events = {
    ROSTER: ROSTER, roster: () => ROSTER.slice(),
    epochDaysUTC: epochDaysUTC, indexFor: indexFor, today: today, byId: byId,
    isLive: isLive, daysUntilLive: daysUntilLive, rewardId: rewardId, DAY_MS: DAY_MS
  };
})();
