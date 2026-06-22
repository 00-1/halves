/*
 * Halves — the 12 heroes (Phase 3). Pure data + functions on window.Heroes.
 *
 * Stats: power, guard, speed, focus. A hero's EFFECTIVE stat = base + the sum of
 * every owned item's boost that targets {this hero, this stat} (items carry their
 * boost from collectibles.js T20). Rating drives battles. Unlock predicates mirror
 * the design table. Reuses HERO_IDS/HERO_NAMES from collectibles.js so names stay
 * in sync. No DOM — Node-testable.
 */
(function(){
  "use strict";

  const C = window.Collectibles || {};
  const NAMES = C.HERO_NAMES || {};

  function cnt(col, pre){ let n = 0; for(const k in col) if(k.indexOf(pre) === 0) n++; return n; }
  function has(col, id){ return !!col[id]; }

  // id · type · base{power,guard,speed,focus} · unlock predicate (over collected).
  const HEROES = [
    { id:"bram",  type:"Brawn",   base:{power:14,guard:12,speed:6, focus:6 }, unlockHint:"Finish your first round",          unlock:c => cnt(c,"init:") >= 1 },
    { id:"greta", type:"Brawn",   base:{power:16,guard:10,speed:5, focus:7 }, unlockHint:"Finish 3 topics",                  unlock:c => cnt(c,"init:") >= 3 },
    { id:"tovar", type:"Brawn",   base:{power:12,guard:16,speed:5, focus:5 }, unlockHint:"Master any topic",                 unlock:c => cnt(c,"mastery:") >= 1 },
    { id:"mo",    type:"Brawn",   base:{power:18,guard:8, speed:7, focus:5 }, unlockHint:"Reach the Dark Wizard rank",       unlock:c => has(c,"rank:darkwizard") },
    { id:"wisp",  type:"Arcane",  base:{power:7, guard:6, speed:10,focus:15}, unlockHint:"Collect 25 items",                unlock:c => has(c,"collector:25") },
    { id:"mira",  type:"Arcane",  base:{power:6, guard:8, speed:9, focus:17}, unlockHint:"Earn a flawless round in 3 modes", unlock:c => cnt(c,"flawless:") >= 3 },
    { id:"nim",   type:"Arcane",  base:{power:8, guard:10,speed:7, focus:14}, unlockHint:"Reach 100% on a topic",            unlock:c => has(c,"topics:one100") },
    { id:"zeph",  type:"Arcane",  base:{power:9, guard:6, speed:13,focus:13}, unlockHint:"Reach the Archmage rank",          unlock:c => has(c,"rank:archmage") },
    { id:"pip",   type:"Cunning", base:{power:8, guard:6, speed:16,focus:9 }, unlockHint:"Earn a Lightning speed bracket",   unlock:c => { for(const k in c) if(/^speed:.+:3$/.test(k)) return true; return false; } },
    { id:"vex",   type:"Cunning", base:{power:10,guard:7, speed:15,focus:8 }, unlockHint:"Finish a round in every mode",     unlock:c => has(c,"meta:allmodes") },
    { id:"sela",  type:"Cunning", base:{power:9, guard:9, speed:14,focus:9 }, unlockHint:"Collect 75 items",                unlock:c => has(c,"collector:75") },
    { id:"roon",  type:"Cunning", base:{power:11,guard:8, speed:17,focus:7 }, unlockHint:"Defeat enemy tier 10",             unlock:c => has(c,"tier:10") }
  ];
  HEROES.forEach(h => { h.name = NAMES[h.id] || h.id; });
  const byIdMap = {}; HEROES.forEach(h => byIdMap[h.id] = h);
  function byId(id){ return byIdMap[id]; }

  // Effective stats = base + Σ owned-item boosts for this hero.
  function effectiveStats(hero, collected){
    const h = (typeof hero === "string") ? byIdMap[hero] : hero;
    const s = { power:h.base.power, guard:h.base.guard, speed:h.base.speed, focus:h.base.focus };
    const cat = (window.Collectibles && window.Collectibles.CATALOG) || [];
    collected = collected || {};
    for(const it of cat){
      if(collected[it.id] && it.boost && it.boost.hero === h.id) s[it.boost.stat] += it.boost.amount;
    }
    return s;
  }
  // Battle rating from a stats object (weighted toward power/focus).
  function ratingOf(s){ return s.power * 1.0 + s.focus * 0.8 + s.speed * 0.5 + s.guard * 0.3; }
  function rating(hero, collected){ return ratingOf(effectiveStats(hero, collected)); }

  function isHeroUnlocked(hero, collected){
    const h = (typeof hero === "string") ? byIdMap[hero] : hero;
    return !!h && h.unlock(collected || {});
  }

  // Rock-paper-scissors: Brawn > Cunning > Arcane > Brawn. (For battles, T23+.)
  function beats(a, b){ return (a==="Brawn"&&b==="Cunning") || (a==="Cunning"&&b==="Arcane") || (a==="Arcane"&&b==="Brawn"); }
  function matchup(a, b){ return a === b ? 1.0 : (beats(a, b) ? 1.5 : 0.6); }

  window.Heroes = { HEROES, byId, effectiveStats, rating, ratingOf, isHeroUnlocked, matchup, beats };
})();
