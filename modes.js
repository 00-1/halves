/*
 * Game modes for Halves.
 *
 * Each mode is a small config object:
 *   id      unique key (also used for its localStorage Hall of Fame)
 *   name    label shown on the mode picker and results screen
 *   tag     subtitle on the start screen
 *   glyph   HTML for the big brand mark on the start screen
 *   eyebrow HTML shown above each prompt during play
 *   expr    true when the prompt is an expression (e.g. "7 × 8") so it
 *           is rendered a little smaller to fit
 *   build() returns a freshly shuffled round: an array of { p, a }
 *           where `p` is the prompt string and `a` is the numeric answer.
 *
 * To add a mode, add an object here — main.js picks them up automatically.
 * Answers must be exact numbers; for the Fractions mode keep decimals
 * terminating so they can be matched exactly as the player types.
 *
 * Topic-chain unlock: modes are listed in importance order (most foundational
 * first). Each mode (except the first) declares `unlockedBy` — the id of the
 * previous topic in the chain. A topic becomes playable once the player has
 * finished that previous topic once (its `init:` achievement). See
 * docs/research-11plus.md §"Unlock chain".
 *
 * `masterSecs` is the gentle per-answer target time for the Mastery achievement
 * (finish with no skips AND total time ≤ masterSecs × questions). It is set per
 * difficulty tier — deliberately at the relaxed end so a 10-year-old can reach
 * it. A harder Part-2 mode declares `requires:"mastery:<part1Id>"` so it stays
 * locked until its Part-1 mastery is earned (see docs/agent/BACKLOG.md T2).
 *
 * `group` places the mode in a section of the mode picker. Sections render in
 * `MODE_GROUPS` order; empty sections are skipped, so groups that only future
 * topics will fill (Number, Measures, Reasoning) simply don't show yet.
 */
(function(){
  "use strict";

  function shuffle(a){
    a = a.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  // Numbers whose halves come up in the wild: clock/time (30, 60, 90, 24,
  // 12), money & percentages (50, 100, 200, 1000, 500, 250), angles
  // (360, 180), a gross (144), bytes (16, 64), plus odd values for the
  // ".5" practice (9, 15, 45, 7, 25, 5, 3).
  const HALVES_SRC   = [30,60,90,24,12,50,100,200,20,40,80,1000,500,250,360,180,144,16,64,9,15,45,7,25,5,3];
  // Numbers whose doubles come up constantly (recipes, prices, money chains).
  const DOUBLES_SRC  = [6,7,8,9,12,15,16,18,25,35,45,50,60,75,120,125,250,11,13,14,17];
  // The multiplication facts actually worth memorising: the tricky 6/7/8/9
  // core, plus a few 12s (dozens, feet & inches). Trivial x1/x2/x5/x10 rows
  // are left out — doubling already has its own mode.
  const TIMES_SRC = [
    [3,7],[3,8],[3,9],
    [4,6],[4,7],[4,8],[4,9],
    [6,6],[6,7],[6,8],[6,9],
    [7,7],[7,8],[7,9],
    [8,8],[8,9],[9,9],
    [7,12],[8,12],[11,12],[12,12]
  ];
  // Squares worth memorising.
  const SQUARES_SRC  = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30];
  // Common fractions and their (terminating) decimal forms.
  const FRACTIONS_SRC = [
    ["1/2",0.5],  ["1/4",0.25], ["3/4",0.75],
    ["1/5",0.2],  ["2/5",0.4],  ["3/5",0.6],  ["4/5",0.8],
    ["1/8",0.125],["3/8",0.375],["5/8",0.625],["7/8",0.875],
    ["1/10",0.1], ["3/10",0.3], ["7/10",0.7], ["9/10",0.9],
    ["1/20",0.05],["3/20",0.15],["1/16",0.0625]
  ];
  // Add/Subtract fixed sets — each entry [a, b, sub]: sub=0 → "a + b", sub=1 →
  // "a − b". Part 1: 2-digit ± within 100 (non-negative), a representative spread
  // of bridging and non-bridging sums/differences and varied magnitudes.
  const ADDSUB_P1_SRC = [
    [47,35,0],[28,46,0],[53,39,0],[64,27,0],[19,45,0],[56,17,0],[72,18,0],[84,16,0],[36,29,0],[41,58,0],
    [82,18,1],[91,37,1],[64,29,1],[75,46,1],[53,27,1],[60,24,1],[88,19,1],[47,23,1],[99,45,1],[70,35,1],[56,38,1]
  ];
  // Part 2: 3-digit ± 2-digit (subtraction always non-negative), spread across
  // the range incl. a carry past 1000 (965 + 78).
  const ADDSUB_P2_SRC = [
    [240,85,0],[167,48,0],[320,67,0],[453,29,0],[581,76,0],[724,38,0],[199,55,0],[965,78,0],[675,88,0],[138,92,0],
    [312,47,1],[205,38,1],[430,72,1],[684,59,1],[517,28,1],[760,85,1],[143,57,1],[928,49,1],[350,66,1],[601,93,1],[274,88,1]
  ];
  // Number-bond fixed sets, shown as "X + ? = T" (answer = the missing part).
  // Part 1 — complements to 100: round (20/80), near-round (45/55), quarters
  // (25/75), awkward non-fives (37/63, 28/72, 49/81), and small/large partners.
  const BONDS_P1_SRC = [20,80,30,70,40,60,50,10,90,45,55,25,75,37,63,28,72,49,81,8,92];
  // Part 2 — to 1000 (multiples of 50/100) and decimal bonds to 1. Each entry is
  // [value, target, answer]; decimal answers are stored as literals so they are
  // exactly numpad-matchable (never computed as target − value).
  const BONDS_P2_SRC = [
    [100,1000,900],[250,1000,750],[300,1000,700],[450,1000,550],[500,1000,500],
    [600,1000,400],[650,1000,350],[750,1000,250],[800,1000,200],[900,1000,100],[950,1000,50],
    [0.1,1,0.9],[0.2,1,0.8],[0.3,1,0.7],[0.4,1,0.6],[0.5,1,0.5],
    [0.7,1,0.3],[0.25,1,0.75],[0.75,1,0.25],[0.05,1,0.95],[0.95,1,0.05]
  ];
  // Place value ×/÷ fixed sets. Part 1 — whole numbers × or ÷ 10/100 (values
  // with and without trailing zeros); each entry [value, op] with op one of
  // "*10","*100","/10","/100". Answers are whole (÷ entries are exact multiples).
  const PV_P1_SRC = [
    [35,"*10"],[7,"*10"],[60,"*10"],[128,"*10"],[4,"*10"],[250,"*10"],[90,"*10"],
    [35,"*100"],[8,"*100"],[60,"*100"],[7,"*100"],[24,"*100"],
    [350,"/10"],[80,"/10"],[4500,"/10"],[700,"/10"],[90,"/10"],
    [3500,"/100"],[800,"/100"],[9000,"/100"],[1200,"/100"]
  ];
  // Part 2 — decimals × or ÷ 10/100/1000 (incl. answers < 1). Each entry is
  // [value, op, target, answer]; the ANSWER is stored as a literal (never
  // computed as value×/÷target) so it is exactly numpad-matchable despite IEEE
  // float error (e.g. 2.7 × 10 must read 27, not 27.000000000000004).
  const PV_P2_SRC = [
    [3.5,"×",100,350],[0.4,"×",1000,400],[2.7,"×",10,27],[0.06,"×",100,6],[1.25,"×",10,12.5],
    [0.8,"×",100,80],[5.2,"×",10,52],[0.35,"×",1000,350],[4.5,"×",100,450],[0.09,"×",10,0.9],
    [25,"÷",100,0.25],[7,"÷",10,0.7],[350,"÷",1000,0.35],[8,"÷",100,0.08],[45,"÷",100,0.45],
    [6,"÷",10,0.6],[120,"÷",1000,0.12],[9,"÷",100,0.09],[3.5,"÷",10,0.35],[250,"÷",100,2.5],[60,"÷",1000,0.06]
  ];

  // The proper minus sign (matches the "×" used by Times), for ± prompts.
  const MINUS = "−";
  // Map a fixed Add/Subtract entry [a, b, sub] to a { p, a } question.
  function addSubItem(e){
    const a = e[0], b = e[1];
    return e[2] ? { p: a + " " + MINUS + " " + b, a: a - b }
                : { p: a + " + " + b, a: a + b };
  }

  // Map a fixed Number-bond entry to a { p, a } question.
  function bondP1Item(x){ return { p: x + " + ? = 100", a: 100 - x }; }
  function bondP2Item(e){ return { p: e[0] + " + ? = " + e[1], a: e[2] }; }

  // Map a fixed Place-value entry to a { p, a } question.
  function pvP1Item(e){
    const a = e[0], op = e[1];
    if(op === "*10")  return { p: a + " × 10",  a: a * 10 };
    if(op === "*100") return { p: a + " × 100", a: a * 100 };
    if(op === "/10")  return { p: a + " ÷ 10",  a: a / 10 };
    return { p: a + " ÷ 100", a: a / 100 };           // "/100"
  }
  // Part 2 uses a stored literal answer (no float ×/÷ on decimals).
  function pvP2Item(e){ return { p: e[0] + " " + e[1] + " " + e[2], a: e[3] }; }

  // Listed in importance / unlock order: Halves → Times → Doubles →
  // Add&Subtract → Number Bonds → Place Value → Fractions → Squares.
  // `unlockedBy` points at the previous topic; the first topic (Halves) has none
  // and is always open. A Part-2 mode (e.g. Add & Subtract II, Number Bonds II,
  // Place Value II) sits off the chain with `requires` instead. New topics are
  // spliced in at their importance position as the catalogue grows.
  const MODES = [
    {
      id:"halves", name:"Halves", tag:"Halve it. Fast.",
      glyph:'x<span class="slash">/</span>2',
      eyebrow:'half of <b>↓</b>', expr:false, masterSecs:4, group:"Core",
      build(){ return shuffle(HALVES_SRC).map(n => ({ p:String(n), a:n/2 })); }
    },
    {
      id:"times", name:"Times", tag:"Know your tables.",
      glyph:'a<span class="slash">×</span>b',
      eyebrow:'product of <b>↓</b>', expr:true, unlockedBy:"halves", masterSecs:3.5, group:"Core",
      build(){ return shuffle(TIMES_SRC).map(([a,b]) => ({ p:a+" × "+b, a:a*b })); }
    },
    {
      id:"doubles", name:"Doubles", tag:"Double it. Fast.",
      glyph:'2<span class="slash">×</span>x',
      eyebrow:'double <b>↓</b>', expr:false, unlockedBy:"times", masterSecs:4, group:"Core",
      build(){ return shuffle(DOUBLES_SRC).map(n => ({ p:String(n), a:n*2 })); }
    },
    {
      id:"addsub", name:"Add & Subtract", tag:"2-digit, within 100.",
      glyph:'a<span class="slash">+</span>b',
      eyebrow:'solve <b>↓</b>', expr:true, unlockedBy:"doubles", masterSecs:5, group:"Number",
      build(){ return shuffle(ADDSUB_P1_SRC).map(addSubItem); }
    },
    {
      id:"addsub2", name:"Add & Subtract II", tag:"3-digit ± 2-digit.",
      glyph:'a<span class="slash">±</span>b',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:addsub", masterSecs:5, group:"Number",
      build(){ return shuffle(ADDSUB_P2_SRC).map(addSubItem); }
    },
    {
      id:"bonds", name:"Number Bonds", tag:"Make 100.",
      glyph:'+<span class="slash">100</span>',
      eyebrow:'fill the gap <b>↓</b>', expr:true, unlockedBy:"addsub", masterSecs:3.5, group:"Number",
      build(){ return shuffle(BONDS_P1_SRC).map(bondP1Item); }
    },
    {
      id:"bonds2", name:"Number Bonds II", tag:"To 1000 & to 1.",
      glyph:'+<span class="slash">1k</span>',
      eyebrow:'fill the gap <b>↓</b>', expr:true, requires:"mastery:bonds", masterSecs:3.5, group:"Number",
      build(){ return shuffle(BONDS_P2_SRC).map(bondP2Item); }
    },
    {
      id:"placevalue", name:"Place Value", tag:"Whole ×÷ 10·100.",
      glyph:'×<span class="slash">÷</span>',
      eyebrow:'solve <b>↓</b>', expr:true, unlockedBy:"bonds", masterSecs:5, group:"Number",
      build(){ return shuffle(PV_P1_SRC).map(pvP1Item); }
    },
    {
      id:"placevalue2", name:"Place Value II", tag:"Decimals ×÷ powers of 10.",
      glyph:'<span class="slash">×</span>÷',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:placevalue", masterSecs:5, group:"Number",
      build(){ return shuffle(PV_P2_SRC).map(pvP2Item); }
    },
    {
      id:"fractions", name:"Fractions", tag:"As a decimal.",
      glyph:'<span class="slash">¾</span>',
      eyebrow:'as a decimal <b>↓</b>', expr:false, unlockedBy:"placevalue", masterSecs:3.5, group:"Fractions & %",
      build(){ return shuffle(FRACTIONS_SRC).map(([f,d]) => ({ p:f, a:d })); }
    },
    {
      id:"squares", name:"Squares", tag:"Square it.",
      glyph:'x<span class="slash">²</span>',
      eyebrow:'square of <b>↓</b>', expr:false, unlockedBy:"fractions", masterSecs:3.5, group:"Core",
      build(){ return shuffle(SQUARES_SRC).map(n => ({ p:n+"²", a:n*n })); }
    }
  ];

  // Mode-picker section order. Empty sections are skipped by the picker.
  const MODE_GROUPS = ["Core", "Number", "Fractions & %", "Measures", "Reasoning"];

  window.MODES = MODES;
  window.MODE_GROUPS = MODE_GROUPS;
})();
