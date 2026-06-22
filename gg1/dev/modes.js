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
  // 78 added (T162 P3 range check) — half=39 covers the BWS Mock 7 Q5 atom
  // (the 4,9,19,39 sequence is ×2+1; needs fluency at odd 2-digit halves/doubles).
  const HALVES_SRC   = [30,60,90,24,12,50,100,200,20,40,80,1000,500,250,360,180,144,16,64,9,15,45,7,25,5,3,78];
  // Numbers whose doubles come up constantly (recipes, prices, money chains).
  // 39 added (T162 P3 range check) — double=78 covers the BWS Mock 7 Q5 atom.
  const DOUBLES_SRC  = [6,7,8,9,12,15,16,18,25,35,45,50,60,75,120,125,250,11,13,14,17,39];
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
  // 11+ band: recall to 12², common extension to 15², plus the pattern-based
  // "handy" ones (20²/25²/30²). 16²–19² trimmed as beyond GL 11+ recall (T30).
  const SQUARES_SRC  = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,20,25,30];
  // Common fractions and their (terminating) decimal forms.
  // Part 1 — the Year-6 RECALL set: halves/quarters, fifths, tenths, twentieths
  // (the last link to percentages via ×5). T213 2b — the eighths and the 4-dp
  // sixteenth moved to a locked Part-2 `fractions2` (research-11plus.md marks ⅛/
  // sixteenths as Part-2 stretch; 1/16 = 0.0625 exceeds base recall calibration).
  const FRACTIONS_SRC = [
    ["1/2",0.5],  ["1/4",0.25], ["3/4",0.75],
    ["1/5",0.2],  ["2/5",0.4],  ["3/5",0.6],  ["4/5",0.8],
    ["1/10",0.1], ["3/10",0.3], ["7/10",0.7], ["9/10",0.9],
    ["1/20",0.05],["3/20",0.15],["9/20",0.45],["11/20",0.55],["17/20",0.85]
  ];
  // Part 2 (locked) — the harder terminating fraction→decimal: eighths and
  // sixteenths (up to 4 decimal places). All exact / numpad-clean.
  const FRACTIONS2_SRC = [
    ["1/8",0.125], ["3/8",0.375], ["5/8",0.625], ["7/8",0.875],
    ["1/16",0.0625], ["3/16",0.1875], ["5/16",0.3125], ["7/16",0.4375],
    ["9/16",0.5625], ["11/16",0.6875], ["13/16",0.8125], ["15/16",0.9375]
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
  // Part 2 — to 1000 and decimal bonds to 1. Each entry is [value, target, answer];
  // decimal answers are stored as literals so they are exactly numpad-matchable
  // (never computed as target − value). T213 2b — the to-1000 half now mixes in
  // NON-round targets (e.g. 680 + ? = 1000) so the step up from Part-1 "bonds to
  // 10 with two zeros" is a real one, not just round multiples of 50/100.
  const BONDS_P2_SRC = [
    [100,1000,900],[680,1000,320],[300,1000,700],[430,1000,570],[500,1000,500],
    [600,1000,400],[650,1000,350],[185,1000,815],[800,1000,200],[900,1000,100],[950,1000,50],
    [0.1,1,0.9],[0.2,1,0.8],[0.3,1,0.7],[0.4,1,0.6],[0.5,1,0.5],
    [0.7,1,0.3],[0.25,1,0.75],[0.75,1,0.25],[0.05,1,0.95],[0.95,1,0.05]
  ];
  // Place value ×/÷ fixed sets. Each entry is [value, op, target, answer] — the
  // ANSWER is stored as a literal (never computed as value×/÷target) so it is
  // exactly numpad-matchable despite IEEE float error (e.g. 4.2 × 10 must read 42,
  // not 42.00000000000001). Part 1 blends whole AND simple decimal ×/÷ 10·100 so
  // the base topic covers decimals too (the harder stretch stays in Part 2).
  const PV_P1_SRC = [
    // whole-number ×/÷ 10·100
    [35,"×",10,350],[60,"×",10,600],[128,"×",10,1280],[250,"×",10,2500],
    [35,"×",100,3500],[8,"×",100,800],[24,"×",100,2400],
    [4500,"÷",10,450],[700,"÷",10,70],[3500,"÷",100,35],[9000,"÷",100,90],
    // simple decimal ×/÷ 10·100
    [3.5,"×",10,35],[4.2,"×",10,42],[0.6,"×",10,6],[1.5,"×",10,15],[2.5,"×",10,25],
    [1.2,"×",100,120],[0.4,"×",100,40],[7,"÷",10,0.7],[35,"÷",10,3.5],[60,"÷",100,0.6]   // T213 2c — was 3.5×100 (exact dup of placevalue2); now 1.2×100
  ];
  // Part 2 — the harder decimal stretch: ×100/×1000 and ÷100/÷1000, answers < 1
  // and 3-decimal-place results.
  const PV_P2_SRC = [
    [3.5,"×",100,350],[0.4,"×",1000,400],[0.06,"×",100,6],[0.8,"×",100,80],[0.35,"×",1000,350],
    [4.5,"×",100,450],[2.7,"×",100,270],[0.125,"×",1000,125],[1.5,"×",1000,1500],[0.04,"×",100,4],
    [25,"÷",100,0.25],[350,"÷",1000,0.35],[8,"÷",100,0.08],[45,"÷",100,0.45],[120,"÷",1000,0.12],
    [9,"÷",100,0.09],[250,"÷",100,2.5],[60,"÷",1000,0.06],[6,"÷",1000,0.006],[12,"÷",1000,0.012],[450,"÷",1000,0.45]
  ];
  // Fractions-of fixed sets. Shown as "a/b of N" (text form so every glyph
  // renders). Each entry [num, den, base, answer]; bases are chosen so the answer
  // is a WHOLE number (e.g. 1/3 of 18 = 6, never 1/3 of 20). Part 1: ½ ¼ ⅓ ⅕.
  const FRACTIONSOF_P1_SRC = [
    [1,2,20,10],[1,2,60,30],[1,2,18,9],[1,2,50,25],[1,2,24,12],
    [1,4,20,5],[1,4,40,10],[1,4,100,25],[1,4,24,6],[1,4,16,4],
    [1,3,18,6],[1,3,30,10],[1,3,24,8],[1,3,12,4],[1,3,60,20],
    [1,5,20,4],[1,5,100,20],[1,5,35,7],[1,5,50,10],[1,5,30,6],[1,5,40,8]
  ];
  // Part 2: ⅔ ¾ ⅗ ⅝.
  const FRACTIONSOF_P2_SRC = [
    [2,3,18,12],[2,3,30,20],[2,3,15,10],[2,3,60,40],[2,3,9,6],[2,3,21,14],
    [3,4,20,15],[3,4,40,30],[3,4,100,75],[3,4,16,12],[3,4,24,18],
    [3,5,25,15],[3,5,100,60],[3,5,20,12],[3,5,50,30],[3,5,35,21],
    [5,8,16,10],[5,8,80,50],[5,8,40,25],[5,8,24,15],[5,8,8,5]
  ];
  // Percentages-of fixed sets, shown as "p% of N". Each entry [pct, base, answer];
  // the answer is stored as a literal so it round-trips exactly on the numpad.
  // Part 1: 10/25/50% of round bases ≤400 (answers whole).
  const PERCENT_P1_SRC = [
    [10,80,8],[10,250,25],[10,400,40],[10,60,6],[10,150,15],[10,200,20],
    [25,160,40],[25,80,20],[25,200,50],[25,40,10],[25,360,90],[25,240,60],[25,120,30],
    [50,60,30],[50,250,125],[50,400,200],[50,84,42],[50,36,18],[50,140,70],[50,90,45],[50,16,8]
  ];
  // Part 2: 1/5/20/75% of bases ≤200 (answers whole or clean-terminating decimals).
  const PERCENT_P2_SRC = [
    [1,200,2],[1,50,0.5],[1,80,0.8],[1,150,1.5],[1,60,0.6],
    [5,80,4],[5,200,10],[5,60,3],[5,140,7],[5,90,4.5],
    [20,80,16],[20,150,30],[20,200,40],[20,45,9],[20,60,12],
    [75,60,45],[75,80,60],[75,200,150],[75,40,30],[75,120,90],[75,16,12]
  ];

  // T162 P1 — Mock-driven drill gaps (the calibration doc + IDEAS I9 are the spec).
  // 1. `scaling` — Proportion / unit-rate ("N→X, M→?"). Each entry [N, X, M, A] with
  //    A = M·X/N (always integer in this set: clean unit rate or ×1.5/×2.5 variants).
  const SCALING_P1_SRC = [
    [4,200,6,300],[5,75,8,120],[3,18,7,42],[6,90,10,150],[8,200,5,125],
    [2,9,6,27],[5,60,7,84],[3,21,8,56],[4,6,10,15],
    [2,14,5,35],[3,12,7,28],[6,24,9,36],[4,32,5,40],
    [5,45,8,72],[2,18,11,99],[3,30,7,70],[4,50,6,75],
    [6,48,11,88],[2,25,10,125],[5,35,9,63],[4,100,7,175]
  ];
  // 2. `percentoff` — % decrease / "the rest". Each entry [pct, base, A] with A =
  //    base − (pct·base)/100 (integer or 1-dp). Bases mostly ≤100, a few stretch.
  const PERCENTOFF_P1_SRC = [
    [20,50,40],[10,80,72],[25,60,45],[15,40,34],[30,90,63],
    [5,80,76],[50,38,19],[10,350,315],[45,360,198],
    [10,60,54],[25,80,60],[50,60,30],[50,24,12],[20,30,24],
    [20,80,64],[30,40,28],[15,60,51],[10,150,135],[25,40,30],
    [5,100,95],[25,200,150]
  ];
  // 3. `partwhole` — Reverse: find the whole from a part. Mixed prompts: a unit
  //    fraction OR a percent. Each entry tagged:
  //      ["f", num, den, given, A]  → "num/den of ? = given"  (A = given·den/num)
  //      ["p", pct,      given, A]  → "pct% of ? = given"     (A = given·100/pct)
  //    The literal A is stored so it round-trips exactly on the numpad.
  const PARTWHOLE_P1_SRC = [
    ["f",1,4,7,28],["f",1,5,6,30],["f",1,2,19,38],["f",1,3,8,24],["f",1,8,5,40],
    ["f",1,2,12,24],["f",1,4,9,36],["f",1,5,8,40],["f",1,3,12,36],["f",1,4,12,48],
    ["p",10,9,90],["p",20,9,45],["p",25,7,28],["p",10,7,70],
    ["p",50,12,24],["p",25,15,60],["p",20,14,70],["p",10,15,150],
    ["p",50,25,50],["p",25,9,36],["p",20,12,60]
  ];
  // 4. `balance` (T162 P1) — "Complete the Sum": evaluate one side then INVERSE-
  //    find the missing number on the other side ("a ⊕ b = c ⊖ ?"). Each entry
  //    [a, lop, b, c, rop, A] with lop ∈ {"+","−","×"}, rop ∈ {"+","−"} and
  //    A = (a lop b) − c when rop="+", else c − (a lop b). The numpad has no
  //    minus key, so P1 ships POSITIVE-ONLY (the calibration doc's negative
  //    stretch — e.g. `37×4 = 100−?` → −48 — is a follow-up; not in this set).
  const BALANCE_P1_SRC = [
    [34, "+", 17, 90, "−", 39],
    [93, "−", 18, 51, "+", 24],
    [13, "×", 9, 17, "+", 100],
    [65, "×", 3, 500, "−", 305],
    [7, "×", 7, 60, "−", 11],
    [45, "+", 28, 100, "−", 27],
    [9, "×", 6, 12, "+", 42],
    [6, "×", 8, 200, "−", 152],
    [27, "+", 36, 100, "−", 37],
    [48, "+", 25, 50, "+", 23],
    [8, "×", 7, 80, "−", 24],
    [6, "×", 9, 24, "+", 30],
    [7, "×", 6, 50, "−", 8],
    [11, "×", 8, 100, "−", 12],
    [12, "×", 9, 100, "+", 8],
    [4, "×", 11, 50, "−", 6],
    [74, "−", 29, 30, "+", 15],
    [82, "−", 47, 50, "−", 15],
    [60, "−", 27, 20, "+", 13],
    [12, "×", 6, 100, "−", 28],
    [7, "×", 8, 30, "+", 26]
  ];

  // ---- T162 Tier P2 — 4 more mock-driven drill gaps (per the calibration doc) ----
  // 5. `ratioshare` — Share an amount in a ratio. Tagged entries:
  //      ["2", t, a, b, which, A]      → "t in a:b → bigger|smaller"  (which ∈ {"big","small"})
  //      ["3", t, a, b, c, "big3", A]  → "t in a:b:c → biggest"       (3-part stretch)
  //    A = t·(asked share)/(a+b[+c]); integer in this set.
  const RATIOSHARE_P2_SRC = [
    ["2", 20, 2, 3, "big", 12],
    ["2", 45, 4, 5, "big", 25],
    ["2", 30, 1, 5, "big", 25],
    ["2", 28, 3, 4, "small", 12],
    ["2", 50, 1, 4, "big", 40],
    ["2", 36, 5, 4, "big", 20],
    ["2", 24, 1, 2, "big", 16],
    ["2", 30, 2, 3, "small", 12],
    ["2", 40, 3, 5, "big", 25],
    ["2", 60, 1, 2, "big", 40],
    ["2", 35, 2, 5, "big", 25],
    ["2", 42, 1, 6, "big", 36],
    ["2", 18, 1, 2, "small", 6],
    ["2", 48, 3, 5, "small", 18],
    ["2", 25, 2, 3, "small", 10],
    ["2", 56, 1, 6, "small", 8],
    ["2", 32, 3, 5, "small", 12],
    ["3", 180, 2, 3, 7, "big3", 105],
    ["3", 24, 1, 2, 3, "big3", 12],
    ["3", 60, 1, 2, 3, "big3", 30],
    ["3", 36, 1, 3, 5, "big3", 20]
  ];
  // 6. `timegap` — Minutes between two 24-h clock times. Each entry
  //    [h1, m1, h2, m2, A] with A = (h2·60 + m2) − (h1·60 + m1), integer minutes.
  //    Spans 15 min – 2 h 59 m; the mock's 14:38→16:07 (89) is included.
  const TIMEGAP_P2_SRC = [
    [14, 38, 16, 7, 89],
    [9, 50, 11, 15, 85],
    [13, 25, 14, 10, 45],
    [8, 40, 9, 5, 25],
    [10, 15, 12, 0, 105],
    [7, 55, 8, 30, 35],
    [15, 20, 16, 50, 90],
    [11, 48, 12, 36, 48],
    [6, 30, 7, 15, 45],
    [9, 25, 10, 10, 45],
    [12, 50, 13, 35, 45],
    [16, 5, 17, 30, 85],
    [8, 15, 8, 45, 30],
    [13, 10, 14, 0, 50],
    [10, 45, 12, 40, 115],
    [7, 20, 9, 50, 150],
    [14, 25, 16, 40, 135],
    [11, 0, 12, 20, 80],
    [9, 35, 11, 35, 120],
    [17, 50, 18, 25, 35],
    [6, 15, 8, 5, 110]
  ];
  // 7. `lcmhcf` — Lowest common multiple / highest common factor of two numbers.
  //    Each entry [kind, a, b, A] with kind ∈ {"LCM","HCF"}; inputs ≤30, LCM ≤200.
  const LCMHCF_P2_SRC = [
    ["LCM", 4, 6, 12],
    ["LCM", 6, 8, 24],
    ["LCM", 12, 18, 36],
    ["LCM", 12, 30, 60],
    ["LCM", 5, 7, 35],
    ["LCM", 3, 5, 15],
    ["LCM", 6, 9, 18],
    ["LCM", 8, 12, 24],
    ["LCM", 9, 12, 36],
    ["LCM", 10, 15, 30],
    ["LCM", 4, 14, 28],
    ["LCM", 15, 20, 60],
    ["LCM", 6, 10, 30],
    ["HCF", 24, 36, 12],
    ["HCF", 18, 24, 6],
    ["HCF", 30, 45, 15],
    ["HCF", 16, 24, 8],
    ["HCF", 12, 30, 6],
    ["HCF", 20, 30, 10],
    ["HCF", 27, 36, 9],
    ["HCF", 14, 21, 7]
  ];
  // 8. `mean` — Average (mean). Tagged entries:
  //      ["f", [values],   A]    → "mean of v1,v2,…"      (A = sum÷count, integer)
  //      ["r", [knowns], M, A]   → "mean of k1,…,? is M"  (A = M·(N+1) − sum(knowns))
  //    Reverse variants form the back half (the same inverse-finding move that
  //    `balance` drilled in P1 — that's why `mean` chains off `mastery:balance`).
  const MEAN_P2_SRC = [
    ["f", [4,8,6],            6],
    ["f", [10,14,12],          12],
    ["f", [3,7,5,9],           6],
    ["f", [12,15,9],           12],
    ["f", [6,8,10],            8],
    ["f", [5,15,10],           10],
    ["f", [4,6,8,10],          7],
    ["f", [2,4,6],             4],
    ["f", [9,11,13],           11],
    ["f", [5,10,15,20,25],     15],
    ["f", [7,7,7,7,7],         7],
    ["f", [20,30,40],          30],
    ["r", [5,7],          6,    6],
    ["r", [8,10],         9,    9],
    ["r", [10,14],        12,   12],
    ["r", [6,8,10],       9,    12],
    ["r", [3,5,7],        5,    5],
    ["r", [12,15],        13,   12],
    ["r", [4,8,12],       10,   16],
    ["r", [25,30,35],     30,   30],
    ["r", [12,20,16],     18,   24]
  ];

  // ---- T162 Tier P3 — extensions to existing modes (cheap, high-leverage) ----
  // 9. `cubes` (now "Cubes & Roots") — n³ for small n, PLUS the inverse the design
  //    pairs it with (research-11plus.md line 164, "Cubes & roots"): cube roots (∛)
  //    of perfect cubes and square roots (√) of perfect squares. Tagged entries:
  //      ["c", n]        → "n³"     (a = n³)
  //      ["∛", cube, a]  → "∛cube"  (a = the cube root)
  //      ["√", sq,   a]  → "√sq"    (a = the square root)
  const CUBES_P3_SRC = [
    ["c",2],["c",3],["c",4],["c",5],["c",6],["c",7],["c",8],["c",9],["c",10],
    ["∛",8,2],["∛",27,3],["∛",64,4],["∛",125,5],["∛",216,6],["∛",1000,10],
    ["√",36,6],["√",49,7],["√",64,8],["√",81,9],["√",121,11],["√",144,12],["√",169,13],["√",196,14],["√",225,15]
  ];
  // 10. `money` — n items at £x.xx and change from £10/£20. Tagged entries:
  //       ["m", n, price, A]  → "n × £price"            (A = n·price, 2dp)
  //       ["c", from, of,  A] → "change from £F of £O"  (A = F − O,    2dp)
  //     Answers stored as numeric literals (numpad allows decimals, cf. fractions).
  const MONEY_P3_SRC = [
    ["m", 4, 1.25, 5.00],
    ["m", 6, 1.35, 8.10],
    ["m", 3, 2.40, 7.20],
    ["m", 5, 0.80, 4.00],
    ["m", 7, 1.50, 10.50],
    ["m", 4, 2.25, 9.00],
    ["m", 5, 1.20, 6.00],
    ["m", 3, 3.30, 9.90],
    ["m", 8, 0.95, 7.60],
    ["m", 6, 0.65, 3.90],
    ["m", 4, 1.75, 7.00],
    ["c", 10, 8.10, 1.90],
    ["c", 10, 6.55, 3.45],
    ["c", 20, 13.40, 6.60],
    ["c", 10, 4.25, 5.75],
    ["c", 20, 7.85, 12.15],
    ["c", 10, 2.99, 7.01],
    ["c", 10, 9.45, 0.55],
    ["c", 20, 15.20, 4.80],
    ["c", 20, 11.10, 8.90],
    ["c", 10, 7.35, 2.65]
  ];
  // 11. `digitsum` — sum the digits of N (the ÷3/÷9 divisibility mechanic), and
  //     the connected "remainder N ÷ 9" (= digitSum mod 9). Tagged entries:
  //       ["s", N, A]  → "digit sum of N"      (A = sum of N's digits)
  //       ["r", N, A]  → "remainder N ÷ 9"     (A = N mod 9, integer 0..8)
  //     N is 3–4 digits; answer is a small integer (numpad-clean).
  const DIGITSUM_P3_SRC = [
    ["s", 7263, 18],
    ["s", 7267, 22],
    ["s", 4581, 18],
    ["s", 936, 18],
    ["s", 5012, 8],
    ["s", 384, 15],
    ["s", 1729, 19],
    ["s", 4827, 21],
    ["s", 6519, 21],
    ["s", 3082, 13],
    ["s", 9999, 36],
    ["s", 5050, 10],
    ["r", 7263, 0],
    ["r", 7267, 4],
    ["r", 845, 8],
    ["r", 1234, 1],
    ["r", 567, 0],
    ["r", 999, 0],
    ["r", 4321, 1],
    ["r", 2046, 3],
    ["r", 8642, 2]
  ];

  // ---- T219 batch 1 (Number group) — two planned-but-unbuilt recall topics ----
  // `roman` — read a Roman numeral as a number. Each entry [numeral, value]; the
  // set spans the subtractive forms (IV/IX/XL/XC/CD/CM) and 2–4 symbol stacks up
  // to MMXXIV. Answers are positive integers (numpad-clean).
  const ROMAN_SRC = [
    ["IV",4],["IX",9],["XIV",14],["XIX",19],["XXXVII",37],["XL",40],["XLII",42],
    ["LIX",59],["LXVII",67],["LXXXVIII",88],["XC",90],["XCIX",99],["CXXIV",124],
    ["CCXLVI",246],["CD",400],["CDLV",455],["DCCLXXXIX",789],["CM",900],["CMXC",990],
    ["MCMLXXXIV",1984],["MMXXIV",2024]
  ];
  // `primes` — the next prime ABOVE N (recall the small-prime sequence). Each entry
  // [n, A] with A the least prime > n. Answers are primes ≤ 61 (numpad-clean).
  const PRIMES_SRC = [
    [2,3],[4,5],[6,7],[8,11],[10,11],[12,13],[14,17],[16,17],[18,19],[20,23],
    [22,23],[24,29],[26,29],[30,31],[32,37],[36,37],[40,41],[44,47],[48,53],[50,53],[60,61]
  ];

  // ---- T219 batch 2 (Fractions & % group) — % increase + F↔D↔P conversion ----
  // `pctup` — INCREASE a number by a percentage, find the new total (the one-way
  // gap `percentoff` doesn't cover). Each entry [pct, base, A] with A = base +
  // pct·base/100 (integer in this set).
  const PCTUP_SRC = [
    [10,200,220],[20,150,180],[25,80,100],[50,60,90],[15,200,230],
    [10,90,99],[5,80,84],[20,45,54],[10,350,385],[25,40,50],
    [30,40,52],[50,24,36],[20,60,72],[10,60,66],[15,40,46],
    [25,200,250],[5,100,105],[20,80,96],[10,150,165],[50,30,45],[20,250,300]
  ];
  // `fdp` — three-way Fraction↔Decimal↔Percent conversion. Tagged entries:
  //   ["d", pct, A]    → "pct% as a decimal"  (A = pct/100, terminating literal)
  //   ["p", dec, A]    → "dec as a %"         (A = dec·100, integer)
  //   ["f", n, d, A]   → "n/d as a %"         (A = n/d·100, integer in this set)
  const FDP_SRC = [
    ["d",45,0.45],["d",20,0.2],["d",75,0.75],["d",8,0.08],["d",60,0.6],["d",5,0.05],["d",90,0.9],
    ["p",0.6,60],["p",0.25,25],["p",0.4,40],["p",0.07,7],["p",0.85,85],["p",0.5,50],["p",0.12,12],
    ["f",3,5,60],["f",1,4,25],["f",7,10,70],["f",1,2,50],["f",4,5,80],["f",9,20,45],["f",3,4,75]
  ];

  // ---- T219 batch 3 (Reasoning group) — BODMAS + function machines -----------
  // `bodmas` — evaluate a multi-operation expression in the correct order (×÷
  // before +−, brackets first). Each entry [expr, A]; A is a non-negative integer
  // and every ÷ in the set divides exactly. The expression string is the prompt.
  const BODMAS_SRC = [
    ["3 + 4 × 2", 11], ["5 × 2 + 6", 16], ["20 − 3 × 4", 8], ["2 × (3 + 4)", 14],
    ["10 − 6 ÷ 2", 7], ["(8 + 4) ÷ 3", 4], ["6 + 2 × 5", 16], ["18 ÷ 3 + 7", 13],
    ["4 × 5 − 8", 12], ["3 × (10 − 6)", 12], ["12 ÷ 4 + 9", 12], ["7 + 3 × 3", 16],
    ["(5 + 5) × 2", 20], ["30 − 4 × 5", 10], ["2 + 6 × 4", 26], ["9 × 2 − 5", 13],
    ["16 ÷ 2 + 3", 11], ["(9 − 3) × 4", 24], ["5 × 4 ÷ 2", 10], ["8 + 12 ÷ 4", 11], ["2 × 3 + 4 × 5", 26]
  ];
  // `algebra` — function machines: feed the number through each op in turn, LEFT TO
  // RIGHT (sequential, not BODMAS). Each entry [machine, A]; A non-negative integer,
  // every intermediate step non-negative and every ÷ exact.
  const ALGEBRA_SRC = [
    ["5 → ×2 → +3", 13], ["4 → ×3 → +1", 13], ["7 → +3 → ×2", 20], ["6 → ×2 → −4", 8],
    ["3 → ×4 → +2", 14], ["8 → −3 → ×2", 10], ["10 → ÷2 → +6", 11], ["9 → +1 → ÷2", 5],
    ["2 → ×5 → +3", 13], ["12 → ÷3 → ×2", 8], ["5 → ×3 → −7", 8], ["4 → +6 → ×2", 20],
    ["6 → ×3 → ÷2", 9], ["7 → ×2 → −5", 9], ["3 → +7 → ×3", 30], ["8 → ÷4 → +9", 11],
    ["5 → ×4 → −6", 14], ["10 → −4 → ×3", 18], ["6 → ÷2 → ×5", 15], ["9 → ×2 → +4", 22], ["4 → ×5 → ÷2", 10]
  ];

  // ---- T219 batch 4 (Number group) — ×-tricks + negatives-P1 -----------------
  // `xtricks` — mental MULTIPLICATION shortcuts (×11, ×25, ×9, ×99, ×5). Each entry
  // [a, b, A] with A = a·b; the "trick" is the method (guide/explain), the answer a
  // clean product.
  const XTRICKS_SRC = [
    [23,11,253],[34,11,374],[52,11,572],[18,11,198],[45,11,495],[27,11,297],   // ×11
    [16,25,400],[12,25,300],[24,25,600],[8,25,200],[28,25,700],                // ×25
    [7,9,63],[13,9,117],[15,9,135],[24,9,216],                                 // ×9
    [6,99,594],[8,99,792],[12,99,1188],                                        // ×99
    [18,5,90],[46,5,230],[24,5,120]                                            // ×5
  ];
  // `negatives` (P1) — add/subtract crossing zero, ALWAYS landing on a NON-negative
  // answer (the numpad has no minus key, so P2 — negative answers — is deferred).
  // The curated expression string is the prompt; A ≥ 0.
  const NEG_SRC = [
    ["−5 + 8",3],["−3 + 10",7],["−8 + 8",0],["−6 + 15",9],["−12 + 20",8],["−4 + 9",5],["−9 + 11",2],
    ["−7 + 17",10],["−15 + 18",3],["−10 + 16",6],["−2 + 13",11],["−14 + 14",0],["−5 + 17",12],
    ["3 − 8 + 9",4],["5 − 12 + 10",3],["2 − 7 + 6",1],["6 − 11 + 9",4],["8 − 15 + 12",5],["4 − 10 + 14",8],["1 − 6 + 7",2],["7 − 13 + 8",2]
  ];

  // ---- T59 — Wave-2 Batch A: Rounding + Larger ×/÷ (genuinely NEW topics; no
  // overlap with the T162 mock modes). Specs from docs/research-11plus.md.
  // `rounding` — round N to the nearest 10/100/1000. Each entry [N, unit, A] with
  // A = Math.round(N/unit)*unit (round-half-up; the curated N avoid the .5 tie so
  // every answer is unambiguous + numpad-clean).
  const ROUNDING_SRC = [
    [47, 10, 50], [83, 10, 80], [126, 10, 130], [274, 10, 270], [68, 10, 70], [351, 10, 350], [99, 10, 100],
    [6832, 100, 6800], [241, 100, 200], [1749, 100, 1700], [383, 100, 400], [962, 100, 1000], [4520, 100, 4500],
    [2841, 1000, 3000], [7263, 1000, 7000], [1730, 1000, 2000], [849, 1000, 1000], [6190, 1000, 6000],
    [3472, 1000, 3000], [638, 100, 600], [88, 10, 90]
  ];
  // `largermd` — Larger ×/÷: 2-digit × 1-digit, and 2-digit ÷ 1-digit with clean
  // (integer) results. Each entry [a, op, b, A] with op ∈ {"×","÷"}.
  const LARGERMD_SRC = [
    [14, "×", 7, 98], [23, "×", 4, 92], [18, "×", 5, 90], [16, "×", 6, 96], [27, "×", 3, 81],
    [34, "×", 2, 68], [13, "×", 8, 104], [45, "×", 2, 90], [19, "×", 4, 76], [24, "×", 3, 72],
    [12, "×", 9, 108], [15, "×", 7, 105],
    [84, "÷", 6, 14], [96, "÷", 8, 12], [72, "÷", 4, 18], [91, "÷", 7, 13], [78, "÷", 6, 13],
    [85, "÷", 5, 17], [60, "÷", 4, 15], [56, "÷", 4, 14], [92, "÷", 4, 23], [68, "÷", 4, 17]
  ];

  // ---- T60 (Metric) + T61 (Sequences) — the remaining NON-overlapping Wave-2
  // topics (Money/Time→T162 `money`/`timegap`; Ratio/Mean→T162 `ratioshare`/`mean`).
  // `metric` — unit conversions. Each entry [val, from, to, A] with A the stored
  // literal (numpad-clean integer or terminating decimal).
  const METRIC_SRC = [
    [3, "km", "m", 3000], [5, "km", "m", 5000], [2, "m", "cm", 200], [7, "m", "cm", 700],
    [40, "cm", "mm", 400], [12, "cm", "mm", 120], [250, "cm", "m", 2.5], [180, "cm", "m", 1.8],
    [4500, "m", "km", 4.5], [2000, "m", "km", 2],
    [4, "kg", "g", 4000], [2, "kg", "g", 2000], [3500, "g", "kg", 3.5], [750, "g", "kg", 0.75], [1500, "g", "kg", 1.5],
    [3, "L", "mL", 3000], [6, "L", "mL", 6000], [2500, "mL", "L", 2.5], [400, "mL", "L", 0.4], [1250, "mL", "L", 1.25], [5, "L", "mL", 5000]
  ];
  // `sequences` — term-to-term LINEAR "next term" only (spot the common step, carry
  // it on). The nth-term RULE (an+b) moved to a locked Part-2 `sequences2` (T213 2b)
  // — research-11plus.md classes the nth-term as Part-2/locked, and mixing the two
  // skills under one unlabelled pool hid which was being asked.
  //   ["next", [a,b,c,d], A]   → "next: a, b, c, d"   (A = d + common difference)
  const SEQUENCES_SRC = [
    ["next", [2,5,8,11], 14], ["next", [3,7,11,15], 19], ["next", [10,8,6,4], 2], ["next", [1,4,7,10], 13],
    ["next", [5,10,15,20], 25], ["next", [20,17,14,11], 8], ["next", [2,4,6,8], 10], ["next", [6,11,16,21], 26],
    ["next", [100,90,80,70], 60], ["next", [1,3,5,7], 9],
    ["next", [4,9,14,19], 24], ["next", [7,13,19,25], 31], ["next", [2,10,18,26], 34], ["next", [50,45,40,35], 30],
    ["next", [3,9,15,21], 27], ["next", [8,16,24,32], 40], ["next", [30,26,22,18], 14], ["next", [1,8,15,22], 29],
    ["next", [5,9,13,17], 21], ["next", [12,21,30,39], 48], ["next", [60,48,36,24], 12]
  ];
  // `sequences2` (locked Part-2) — the nth-term RULE: evaluate "Mn ± A" at term k.
  //   ["nth", mult, add, n, A]   → "<mult>n±<add>, term <n>" (A = mult·n + add, ≥ 0)
  const SEQUENCES2_SRC = [
    ["nth", 3, 2, 10, 32], ["nth", 2, 1, 8, 17], ["nth", 4, 0, 6, 24], ["nth", 5, -2, 5, 23], ["nth", 2, 3, 12, 27],
    ["nth", 3, 1, 7, 22], ["nth", 10, 0, 9, 90], ["nth", 6, 4, 5, 34], ["nth", 2, 5, 10, 25], ["nth", 4, -1, 8, 31], ["nth", 5, 5, 6, 35],
    ["nth", 3, 4, 8, 28], ["nth", 6, 1, 6, 37], ["nth", 2, 7, 9, 25], ["nth", 4, 2, 7, 30], ["nth", 5, 1, 8, 41],
    ["nth", 3, -1, 9, 26], ["nth", 8, 0, 5, 40], ["nth", 2, 9, 7, 23], ["nth", 4, 3, 6, 27], ["nth", 6, -2, 7, 40]
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

  // Map a fixed Place-value entry [value, op, target, answer] to a { p, a }
  // question, using the stored literal answer (no float ×/÷ on decimals).
  function pvItem(e){ return { p: e[0] + " " + e[1] + " " + e[2], a: e[3] }; }

  // Map a fixed Fractions-of entry [num, den, base, answer] to a question.
  function fractionsOfItem(e){ return { p: e[0] + "/" + e[1] + " of " + e[2], a: e[3] }; }

  // Map a fixed Percentages-of entry [pct, base, answer] to a question.
  function percentItem(e){ return { p: e[0] + "% of " + e[1], a: e[2] }; }

  // T162 P1 item builders.
  // Scaling: prompt as the proportion "N→X, M→?"; answer = literal A.
  function scalingItem(e){ return { p: e[0] + "→" + e[1] + ", " + e[2] + "→?", a: e[3] }; }
  // Percent-off: prompt as "P% off N"; answer = N − P·N/100 (stored literal).
  function percentOffItem(e){ return { p: e[0] + "% off " + e[1], a: e[2] }; }
  // Part-whole: either a fraction ("a/b of ? = N") or a percent ("P% of ? = N").
  function partWholeItem(e){
    if(e[0] === "f") return { p: e[1] + "/" + e[2] + " of ? = " + e[3], a: e[4] };
    return { p: e[1] + "% of ? = " + e[2], a: e[3] };
  }
  // Balance: "a lop b = c rop ?" — the inverse hunts for the missing balance.
  function balanceItem(e){ return { p: e[0] + " " + e[1] + " " + e[2] + " = " + e[3] + " " + e[4] + " ?", a: e[5] }; }

  // T162 P2 item builders.
  // Ratio share: "t in a:b → bigger|smaller" or "t in a:b:c → biggest".
  function ratioShareItem(e){
    if(e[0] === "2") return { p: e[1] + " in " + e[2] + ":" + e[3] + " → " + (e[4] === "big" ? "bigger" : "smaller"), a: e[5] };
    return { p: e[1] + " in " + e[2] + ":" + e[3] + ":" + e[4] + " → biggest", a: e[6] };
  }
  // Time gap: "HH:MM → HH:MM" — zero-pad both fields (mock format: "09:50").
  function timegapItem(e){ const z = n => (n < 10 ? "0" : "") + n; return { p: z(e[0]) + ":" + z(e[1]) + " → " + z(e[2]) + ":" + z(e[3]), a: e[4] }; }
  // LCM/HCF: "LCM a,b" / "HCF a,b" — kind label up front for instant routing.
  function lcmhcfItem(e){ return { p: e[0] + " " + e[1] + "," + e[2], a: e[3] }; }
  // Mean: "mean of v1,v2,…" (forward) or "mean of k1,…,? is M" (reverse).
  function meanItem(e){
    if(e[0] === "f") return { p: "mean of " + e[1].join(","), a: e[2] };
    return { p: "mean of " + e[1].join(",") + ",? is " + e[2], a: e[3] };
  }
  // T162 P3 item builders.
  // Money: "n × £p" (multiplication) or "change from £F of £O" (subtraction).
  // toFixed(2) keeps the £-prompt to 2dp; the answer is the literal numeric
  // value (numpad accepts decimals — same pattern as fractions / percentages2).
  function moneyItem(e){
    if(e[0] === "m") return { p: e[1] + " × £" + e[2].toFixed(2), a: e[3] };
    return { p: "change from £" + e[1] + " of £" + e[2].toFixed(2), a: e[3] };
  }
  // Roman numeral: show the numeral, answer the value. Prime: "next prime > n".
  function romanItem(e){ return { p: e[0], a: e[1] }; }
  function primeItem(e){ return { p: "next prime > " + e[0], a: e[1] }; }
  // BODMAS / function machine / negatives: the curated expression string IS the prompt.
  function exprItem(e){ return { p: e[0], a: e[1] }; }
  // ×-tricks: "a × b" (the trick is the method); answer = the product.
  function xtrickItem(e){ return { p: e[0] + " × " + e[1], a: e[2] }; }
  // T219 batch 5 (Geometry) — area/perimeter, volume, angles.
  const AREA_SRC = [
    ["ar",6,4,24],["ar",7,5,35],["ar",9,3,27],["ar",8,8,64],["ar",12,5,60],["ar",10,7,70],["ar",11,4,44],   // rectangle area
    ["pr",6,4,20],["pr",7,5,24],["pr",9,3,24],["pr",10,6,32],["pr",12,8,40],["pr",5,5,20],["pr",11,4,30],     // rectangle perimeter
    ["at",8,5,20],["at",6,4,12],["at",10,3,15],["at",7,4,14],["at",12,5,30],["at",9,6,27],["at",4,4,8]         // triangle area (½·b·h)
  ];
  function areaItem(e){
    if(e[0] === "ar") return { p: "area " + e[1] + "×" + e[2], a: e[3] };
    if(e[0] === "pr") return { p: "perim " + e[1] + "×" + e[2], a: e[3] };
    return { p: "△ " + e[1] + "×" + e[2], a: e[3] };
  }
  const VOLUME_SRC = [
    [2,3,4,24],[3,3,3,27],[5,2,4,40],[6,2,3,36],[4,4,2,32],[5,5,2,50],[10,2,2,40],
    [2,2,2,8],[3,4,5,60],[6,3,2,36],[4,3,3,36],[7,2,3,42],[8,2,2,32],[5,4,3,60],
    [2,5,6,60],[3,3,4,36],[10,3,2,60],[4,5,5,100],[6,4,2,48],[2,2,5,20],[3,5,4,60]
  ];
  function volItem(e){ return { p: "vol " + e[0] + "×" + e[1] + "×" + e[2], a: e[3] }; }
  const ANGLES_SRC = [
    ["L",110,70],["L",45,135],["L",125,55],["L",90,90],["L",155,25],["L",72,108],["L",30,150],     // on a line (180)
    ["P",250,110],["P",200,160],["P",300,60],["P",145,215],["P",90,270],["P",215,145],["P",260,100], // round a point (360)
    ["T",60,70,50],["T",90,45,45],["T",50,50,80],["T",100,40,40],["T",35,85,60],["T",75,75,30],["T",110,30,40] // triangle (180)
  ];
  function angleItem(e){
    if(e[0] === "L") return { p: "line " + e[1] + " + ?", a: e[2] };
    if(e[0] === "P") return { p: "point " + e[1] + " + ?", a: e[2] };
    return { p: "△ " + e[1] + ", " + e[2] + " → ?", a: e[3] };
  }
  // T219 batch 6 — median/mode/range (the other averages) + speed-distance-time.
  const MMR_SRC = [
    ["med",[3,7,5],5],["med",[8,2,6,4,10],6],["med",[12,9,15],12],["med",[5,1,9,3,7],5],["med",[20,14,18],18],["med",[6,2,4,8,10],6],["med",[11,7,9,13,5],9],
    ["mod",[4,7,4,2,9],4],["mod",[3,3,8,5,3],3],["mod",[6,1,6,9,6],6],["mod",[2,5,5,8,1],5],["mod",[7,7,2,4,9],7],["mod",[10,3,10,1,10],10],["mod",[8,8,4,4,8],8],
    ["rng",[3,9,5,7],6],["rng",[12,4,8,20],16],["rng",[15,6,11,9],9],["rng",[2,18,10,5],16],["rng",[7,7,7,12],5],["rng",[14,3,9,21],18],["rng",[5,8,2,6],6]
  ];
  function mmrItem(e){ const label = e[0] === "med" ? "median" : e[0] === "mod" ? "mode" : "range"; return { p: label + " of " + e[1].join(","), a: e[2] }; }
  const SDT_SRC = [
    ["d",60,2,120],["d",50,3,150],["d",40,4,160],["d",70,2,140],["d",30,5,150],["d",80,3,240],["d",45,2,90],   // distance = speed × time
    ["s",120,2,60],["s",150,3,50],["s",200,4,50],["s",180,3,60],["s",90,2,45],["s",240,4,60],["s",160,2,80],     // speed = distance ÷ time
    ["t",120,40,3],["t",150,50,3],["t",200,50,4],["t",100,25,4],["t",180,60,3],["t",90,45,2],["t",240,80,3]       // time = distance ÷ speed
  ];
  function sdtItem(e){
    if(e[0] === "d") return { p: "dist: " + e[1] + "km/h × " + e[2] + "h", a: e[3] };
    if(e[0] === "s") return { p: "speed: " + e[1] + "km in " + e[2] + "h", a: e[3] };
    return { p: "time: " + e[1] + "km at " + e[2] + "km/h", a: e[3] };
  }
  // Percent increase: "base + pct%" → the new total. F↔D↔P: three conversion shapes.
  function pctUpItem(e){ return { p: e[1] + " + " + e[0] + "%", a: e[2] }; }
  function fdpItem(e){
    if(e[0] === "d") return { p: e[1] + "% as a decimal", a: e[2] };
    if(e[0] === "p") return { p: e[1] + " as a %", a: e[2] };
    return { p: e[1] + "/" + e[2] + " as a %", a: e[3] };
  }
  // Cubes & roots: "n³" (cube), or "∛cube" / "√sq" (the inverse roots).
  function cubeRootItem(e){
    if(e[0] === "c") return { p: e[1] + "³", a: e[1] * e[1] * e[1] };
    return { p: e[0] + e[1], a: e[2] };
  }
  // Digit sum: "digit sum of N" or "remainder N ÷ 9" (= digitSum mod 9).
  function digitsumItem(e){
    if(e[0] === "s") return { p: "digit sum of " + e[1], a: e[2] };
    return { p: "remainder " + e[1] + " ÷ 9", a: e[2] };
  }
  // T59 item builders.
  // Rounding: "N to nearest U" (U ∈ {10,100,1000}); answer is the stored literal.
  function roundingItem(e){ return { p: e[0] + " to nearest " + e[1], a: e[2] }; }
  // Larger ×/÷: "a × b" or "a ÷ b" (2-digit ×/÷ 1-digit, clean result).
  function largerMdItem(e){ return { p: e[0] + " " + e[1] + " " + e[2], a: e[3] }; }
  // T60 — Metric conversion: "<n> <from> in <to>" (mm/cm/m/km, g/kg, ml/l).
  // Answers are stored literals (terminating decimals e.g. 2.5, 0.75) — numpad-clean.
  function metricItem(e){ return { p: e[0] + " " + e[1] + " in " + e[2], a: e[3] }; }
  // T61 — Sequences: "next: a, b, c, d" (next linear term) or "Mn±A, term k"
  // (the value of the kth term of the nth-term rule). Answers are non-negative.
  function sequenceItem(e){
    if(e[0] === "next") return { p: "next: " + e[1].join(", "), a: e[2] };
    const add = e[2];
    const rule = e[1] + "n" + (add < 0 ? " − " + (-add) : add > 0 ? " + " + add : "");
    return { p: rule + ", term " + e[3], a: e[4] };
  }

  // Listed in importance / unlock order: Halves → Times → Doubles →
  // Add&Subtract → Number Bonds → Place Value → Fractions of → Percentages of →
  // Fraction→decimal → Squares. `unlockedBy` points at the previous topic; the
  // first topic (Halves) has none and is always open. A Part-2 mode (e.g. Add &
  // Subtract II, …, Percentages of II) sits off the chain with `requires`
  // instead. New topics are spliced in at their importance position.
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
      build(){ return shuffle(PV_P1_SRC).map(pvItem); }
    },
    {
      id:"placevalue2", name:"Place Value II", tag:"Decimals ×÷ powers of 10.",
      glyph:'<span class="slash">×</span>÷',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:placevalue", masterSecs:5, group:"Number",
      build(){ return shuffle(PV_P2_SRC).map(pvItem); }
    },
    {
      id:"fractionsof", name:"Fractions of", tag:"½ ¼ ⅓ ⅕ of an amount.",
      glyph:'<span class="slash">½</span>n',
      eyebrow:'solve <b>↓</b>', expr:true, unlockedBy:"placevalue", masterSecs:9, group:"Fractions & %",
      build(){ return shuffle(FRACTIONSOF_P1_SRC).map(fractionsOfItem); }
    },
    {
      id:"fractionsof2", name:"Fractions of II", tag:"⅔ ¾ ⅗ ⅝ of an amount.",
      glyph:'a<span class="slash">/</span>b',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:fractionsof", masterSecs:9, group:"Fractions & %",
      build(){ return shuffle(FRACTIONSOF_P2_SRC).map(fractionsOfItem); }
    },
    {
      id:"percentages", name:"Percentages of", tag:"10/25/50% of an amount.",
      glyph:'<span class="slash">%</span>',
      eyebrow:'solve <b>↓</b>', expr:true, unlockedBy:"fractionsof", masterSecs:9, group:"Fractions & %",
      build(){ return shuffle(PERCENT_P1_SRC).map(percentItem); }
    },
    {
      id:"percentages2", name:"Percentages of II", tag:"1/5/20/75% of an amount.",
      glyph:'n<span class="slash">%</span>',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:percentages", masterSecs:9, group:"Fractions & %",
      build(){ return shuffle(PERCENT_P2_SRC).map(percentItem); }
    },
    {
      id:"fractions", name:"Fractions", tag:"As a decimal.",
      glyph:'<span class="slash">¾</span>',
      eyebrow:'as a decimal <b>↓</b>', expr:false, unlockedBy:"percentages", masterSecs:3.5, group:"Fractions & %",
      build(){ return shuffle(FRACTIONS_SRC).map(([f,d]) => ({ p:f, a:d })); }
    },
    {
      // T213 2b — eighths & sixteenths (the 4-dp stretch) as a LOCKED Part-2 off
      // `fractions` (single-child branch; the recall set stays in Part-1).
      id:"fractions2", name:"Fractions II", tag:"Eighths & sixteenths as decimals.",
      glyph:'<span class="slash">⅛</span>',
      eyebrow:'as a decimal <b>↓</b>', expr:false, requires:"mastery:fractions", masterSecs:5, group:"Fractions & %",
      build(){ return shuffle(FRACTIONS2_SRC).map(([f,d]) => ({ p:f, a:d })); }
    },
    {
      id:"squares", name:"Squares", tag:"Square it.",
      glyph:'x<span class="slash">²</span>',
      eyebrow:'square of <b>↓</b>', expr:false, unlockedBy:"fractions", masterSecs:3.5, group:"Core",
      build(){ return shuffle(SQUARES_SRC).map(n => ({ p:n+"²", a:n*n })); }
    },
    // ---- T59 — Wave-2 Batch A: extend the SPINE (unlockedBy) with two new
    // foundational topics. Each is a 1-wide tree row (no children yet), so the
    // T170 ≤4-abreast invariant is unaffected.
    {
      id:"rounding", name:"Rounding", tag:"Nearest 10 · 100 · 1000.",
      glyph:'<span class="slash">~</span>0',
      eyebrow:'round <b>↓</b>', expr:true, unlockedBy:"squares", masterSecs:6, group:"Number",
      build(){ return shuffle(ROUNDING_SRC).map(roundingItem); }
    },
    {
      id:"largermd", name:"Larger × / ÷", tag:"2-digit × / ÷ 1-digit.",
      glyph:'<span class="slash">×</span>÷',
      eyebrow:'solve <b>↓</b>', expr:true, unlockedBy:"rounding", masterSecs:7, group:"Number",
      build(){ return shuffle(LARGERMD_SRC).map(largerMdItem); }
    },
    // ---- T60 / T61 — Wave-2 Batch B: two more SPINE topics (the genuinely-new
    // remainder of the Measures/Reasoning brief — Money/Time/Ratio/Mean already
    // shipped in T162). Each is a 1-wide tree row (no children), so the T170
    // ≤4-abreast invariant still holds. Continue the spine squares→rounding→
    // largermd→metric→sequences.
    {
      id:"metric", name:"Metric Units", tag:"mm · cm · m · km · g · kg · mL · L.",
      glyph:'k<span class="slash">→</span>m',
      eyebrow:'convert <b>↓</b>', expr:true, unlockedBy:"largermd", masterSecs:7, group:"Measures",
      build(){ return shuffle(METRIC_SRC).map(metricItem); }
    },
    {
      id:"sequences", name:"Sequences", tag:"Next term in the pattern.",
      glyph:'n<span class="slash">+</span>k',
      eyebrow:'continue the pattern <b>↓</b>', expr:true, unlockedBy:"metric", masterSecs:9, group:"Reasoning",
      build(){ return shuffle(SEQUENCES_SRC).map(sequenceItem); }
    },
    {
      // T213 2b — nth-term rule as a LOCKED Part-2 (research-11plus.md marks an+b as
      // Part-2/locked). Chains off `sequences` (single-child branch, tree stays
      // linear): continue-the-pattern → evaluate-the-rule.
      id:"sequences2", name:"Sequences II", tag:"Evaluate the nth-term rule.",
      glyph:'n<span class="slash">×</span>k',
      eyebrow:'evaluate the rule <b>↓</b>', expr:true, requires:"mastery:sequences", masterSecs:10, group:"Reasoning",
      build(){ return shuffle(SEQUENCES2_SRC).map(sequenceItem); }
    },
    // T162 P1 — mock-driven drill gaps (per docs/agent/T162-calibration.md). Each
    // sits OFF the main chain via `requires:"mastery:<predecessor>"`, so the live
    // chain (Halves → … → Squares) is unchanged and they become available only
    // when the predecessor topic has been mastered.
    {
      // Chains off `percentoff` (not directly off `percentages2`) so the existing
      // single-child `branchOf` part-chain remains linear: percentages → P2 →
      // percentoff (P3) → scaling (P4). Still satisfies the calibration's
      // "unlock after `percentages2`" via transitivity. Group is "Reasoning" so the
      // PICKER lists it as a Reasoning topic (group is independent of the chain).
      id:"scaling", name:"Scaling", tag:"Unit-rate proportion.",
      glyph:'a<span class="slash">→</span>b',
      eyebrow:'same rule — in proportion <b>↓</b>', expr:true, requires:"mastery:percentoff", masterSecs:10, group:"Reasoning",
      build(){ return shuffle(SCALING_P1_SRC).map(scalingItem); }
    },
    {
      id:"percentoff", name:"Percent Off", tag:"% decrease — the rest.",
      glyph:'<span class="slash">−</span>%',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:percentages2", masterSecs:9, group:"Fractions & %",
      build(){ return shuffle(PERCENTOFF_P1_SRC).map(percentOffItem); }
    },
    {
      id:"partwhole", name:"Part → Whole", tag:"Reverse: find the whole.",
      glyph:'?<span class="slash">/</span>n',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:fractionsof2", masterSecs:8, group:"Fractions & %",
      build(){ return shuffle(PARTWHOLE_P1_SRC).map(partWholeItem); }
    },
    {
      // Balance ("Complete the Sum") — chains off addsub2 (the calibration's
      // sensible predecessor), so the existing single-child branchOf stays linear:
      // addsub → addsub2 → balance. Group "Reasoning" for the picker.
      id:"balance", name:"Balance", tag:"Complete the sum.",
      glyph:'k<span class="slash">±</span>',
      eyebrow:'make both sides equal <b>↓</b>', expr:true, requires:"mastery:addsub2", masterSecs:9, group:"Reasoning",
      build(){ return shuffle(BALANCE_P1_SRC).map(balanceItem); }
    },
    // ---- T162 P2 — 4 more mock-driven drill gaps ---------------------------
    {
      id:"lcmhcf", name:"LCM / HCF", tag:"Common multiples & factors.",
      glyph:'n<span class="slash">÷</span>k',
      eyebrow:'solve <b>↓</b>', expr:false, requires:"mastery:times", masterSecs:8, group:"Core",
      build(){ return shuffle(LCMHCF_P2_SRC).map(lcmhcfItem); }
    },
    {
      // mean per spec is "after addsub2 mastery" — but balance already requires
      // mastery:addsub2 (a sibling unlock would collide with the single-child
      // branchOf model). Chain mean off balance instead: balance's inverse-finding
      // is exactly the move mean's reverse variants reuse, so the gate is sensible
      // and the addsub branch stays linear: addsub → addsub2 → balance → mean.
      id:"mean", name:"Mean", tag:"Average · forward & reverse.",
      glyph:'<span class="slash">+</span>÷n',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:balance", masterSecs:9, group:"Reasoning",
      build(){ return shuffle(MEAN_P2_SRC).map(meanItem); }
    },
    {
      id:"timegap", name:"Time Gap", tag:"Minutes between two times.",
      glyph:'n<span class="slash">−</span>k',
      eyebrow:'minutes between <b>↓</b>', expr:false, requires:"mastery:placevalue2", masterSecs:7, group:"Reasoning",
      build(){ return shuffle(TIMEGAP_P2_SRC).map(timegapItem); }
    },
    {
      // T170 — ratioshare chains off `partwhole` (NOT `scaling`) so no tech-tree
      // row exceeds 4 nodes abreast (the owner's max): fractionsof → fractionsof2
      // → partwhole → ratioshare (4), keeping percentages → percentages2 →
      // percentoff → scaling at 4 too. Skill link holds — partwhole (reverse
      // proportion: find the whole) → ratioshare (share in proportion). Group
      // stays "Reasoning" (the picker family; independent of the tree chain).
      id:"ratioshare", name:"Ratio Share", tag:"Share an amount in a ratio.",
      glyph:'a<span class="slash">÷</span>b',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:partwhole", masterSecs:10, group:"Reasoning",
      build(){ return shuffle(RATIOSHARE_P2_SRC).map(ratioShareItem); }
    },
    // ---- T162 P3 — extensions to existing modes ----------------------------
    {
      // Cubes mirrors squares: squares is the spine leaf with no existing child,
      // so cubes slots cleanly as its P2 (depth 2): squares → cubes.
      id:"cubes", name:"Cubes & Roots", tag:"Cube it; undo it with roots.",
      glyph:'x<span class="slash">³</span>',
      eyebrow:'evaluate <b>↓</b>', expr:false, requires:"mastery:squares", masterSecs:5, group:"Core",
      build(){ return shuffle(CUBES_P3_SRC).map(cubeRootItem); }
    },
    {
      // Money per spec is "after addsub2", but the addsub branch already chains
      // addsub2 → balance → mean (single-child tree). Chained off bonds2 instead
      // — the closest sensible leaf: bonds2 covers decimal bonds-to-1 (£0.40 +
      // £0.60 = £1.00), the foundation for £-totals + change. Calibration's
      // "+/− fluency required" is met via the spine route addsub→bonds→bonds2.
      id:"money", name:"Money", tag:"£ totals & change.",
      glyph:'a<span class="slash">×</span>k',
      eyebrow:'answer in £ <b>↓</b>', expr:true, requires:"mastery:bonds2", masterSecs:9, group:"Core",
      build(){ return shuffle(MONEY_P3_SRC).map(moneyItem); }
    },
    {
      // Digit sum chains off lcmhcf (the spec's sensible predecessor — both live
      // in the divisibility / factor family). lcmhcf has no existing child → fits.
      id:"digitsum", name:"Digit Sum", tag:"Sum the digits · ÷9 mechanic.",
      glyph:'<span class="slash">+</span>9',
      eyebrow:'solve <b>↓</b>', expr:false, requires:"mastery:lcmhcf", masterSecs:6, group:"Core",
      build(){ return shuffle(DIGITSUM_P3_SRC).map(digitsumItem); }
    },
    // ---- T219 batch 1 (Number group) — Roman numerals + Primes -----------------
    {
      // Roman → number. Branches off `rounding` (a free number-sense leaf); both are
      // "read/representation of numbers" topics. Group Number.
      id:"roman", name:"Roman Numerals", tag:"Read the numeral.",
      glyph:'<span class="slash">X</span>',
      eyebrow:'as a number <b>↓</b>', expr:false, requires:"mastery:rounding", masterSecs:6, group:"Number",
      build(){ return shuffle(ROMAN_SRC).map(romanItem); }
    },
    {
      // Primes — the next prime above N. Branches off `digitsum` (divisibility →
      // primality, both the factor/divisor family). Group Number.
      id:"primes", name:"Primes", tag:"Find the next prime.",
      glyph:'1<span class="slash">·</span>n',
      eyebrow:'next prime <b>↓</b>', expr:false, requires:"mastery:digitsum", masterSecs:7, group:"Number",
      build(){ return shuffle(PRIMES_SRC).map(primeItem); }
    },
    // ---- T219 batch 2 (Fractions & % group) — % increase + F↔D↔P ---------------
    {
      // % increase — the new total after adding pct%. Branches off `fdp` (keeps the
      // Fractions-&-% lineage fractions→fractions2→fdp→pctup at the ≤4-abreast max;
      // chaining off the percentoff/scaling row would make it 5). Group Fractions & %.
      id:"pctup", name:"Percent Increase", tag:"Add the % — new total.",
      glyph:'<span class="slash">+</span>%',
      eyebrow:'new total <b>↓</b>', expr:true, requires:"mastery:fdp", masterSecs:9, group:"Fractions & %",
      build(){ return shuffle(PCTUP_SRC).map(pctUpItem); }
    },
    {
      // F↔D↔P three-way conversion. Branches off `fractions2` (extends fraction→
      // decimal into the full %/decimal/fraction triangle). Group Fractions & %.
      id:"fdp", name:"F · D · P", tag:"Convert %, decimal, fraction.",
      glyph:'%<span class="slash">/</span>d',
      eyebrow:'convert <b>↓</b>', expr:false, requires:"mastery:fractions2", masterSecs:8, group:"Fractions & %",
      build(){ return shuffle(FDP_SRC).map(fdpItem); }
    },
    // ---- T219 batch 3 (Reasoning group) — BODMAS + function machines -----------
    {
      // BODMAS — evaluate-the-expression in the right order. Branches off `sequences2`
      // (evaluate-the-rule → evaluate-the-expression). Group Reasoning.
      id:"bodmas", name:"Order of Operations", tag:"BODMAS — what comes first?",
      glyph:'<span class="slash">×</span>+',
      eyebrow:'work it out <b>↓</b>', expr:true, requires:"mastery:sequences2", masterSecs:9, group:"Reasoning",
      build(){ return shuffle(BODMAS_SRC).map(exprItem); }
    },
    {
      // Function machines — run the input through each op in turn. Branches off
      // `bodmas` (both "evaluate the operations"); keeps the Reasoning eval-chain
      // sequences→sequences2→bodmas→algebra at the 4-abreast max. Group Reasoning.
      id:"algebra", name:"Function Machines", tag:"Run the machine.",
      glyph:'n<span class="slash">±</span>k',
      eyebrow:'in → out <b>↓</b>', expr:true, requires:"mastery:bodmas", masterSecs:9, group:"Reasoning",
      build(){ return shuffle(ALGEBRA_SRC).map(exprItem); }
    },
    // ---- T219 batch 4 (Number group) — ×-tricks + negatives-P1 -----------------
    {
      // ×-tricks — mental multiplication shortcuts. Branches off `largermd` (the
      // bigger-×/÷ leaf); group Number.
      id:"xtricks", name:"×-Tricks", tag:"×11 · ×25 · ×9 · ×99 · ×5.",
      glyph:'<span class="slash">×</span>k',
      eyebrow:'use the trick <b>↓</b>', expr:true, requires:"mastery:largermd", masterSecs:7, group:"Number",
      build(){ return shuffle(XTRICKS_SRC).map(xtrickItem); }
    },
    {
      // Negatives P1 — add/subtract across zero, non-negative answers only. Branches
      // off `doubles` (a free Number leaf); group Number.
      id:"negatives", name:"Negatives", tag:"Cross zero (answer ≥ 0).",
      glyph:'<span class="slash">−</span>n',
      eyebrow:'answer is 0 or more <b>↓</b>', expr:true, requires:"mastery:doubles", masterSecs:8, group:"Number",
      build(){ return shuffle(NEG_SRC).map(exprItem); }
    },
    // ---- T219 batch 5 (NEW Geometry group) — area/perim, volume, angles --------
    {
      // Area & Perimeter — rectangle area/perimeter + triangle area (dims in the
      // prompt). Opens the Geometry chain off `metric` (measurement → geometry).
      id:"area", name:"Area & Perimeter", tag:"Rectangles & triangles.",
      glyph:'a<span class="slash">×</span>b',
      eyebrow:'work it out <b>↓</b>', expr:true, requires:"mastery:metric", masterSecs:9, group:"Geometry",
      build(){ return shuffle(AREA_SRC).map(areaItem); }
    },
    {
      // Volume — cuboid l×w×h. Branches off `area` (the Geometry chain stays linear:
      // metric → area → volume → angles, within the 4-abreast limit).
      id:"volume", name:"Volume", tag:"Cuboids: l×w×h.",
      glyph:'<span class="slash">×</span>³',
      eyebrow:'volume <b>↓</b>', expr:true, requires:"mastery:area", masterSecs:8, group:"Geometry",
      build(){ return shuffle(VOLUME_SRC).map(volItem); }
    },
    {
      // Angles — the missing angle on a line (180), round a point (360), in a
      // triangle (180). Branches off `volume` (Geometry chain).
      id:"angles", name:"Angles", tag:"Find the missing angle.",
      glyph:'n<span class="slash">−</span>k',
      eyebrow:'missing angle <b>↓</b>', expr:false, requires:"mastery:volume", masterSecs:8, group:"Geometry",
      build(){ return shuffle(ANGLES_SRC).map(angleItem); }
    },
    // ---- T219 batch 6 — Median/Mode/Range (Reasoning) + Speed-Distance-Time -----
    {
      // Median/Mode/Range — the other averages. Branches off `timegap` (the free
      // Reasoning leaf with room); group Reasoning.
      id:"mmr", name:"Median · Mode · Range", tag:"The other averages.",
      glyph:'a<span class="slash">−</span>b',
      eyebrow:'find it <b>↓</b>', expr:false, requires:"mastery:timegap", masterSecs:8, group:"Reasoning",
      build(){ return shuffle(MMR_SRC).map(mmrItem); }
    },
    {
      // Speed-Distance-Time — D = S × T and its rearrangements. Branches off `money`
      // (the closest free applied-number leaf with room); group Measures.
      id:"sdt", name:"Speed · Distance · Time", tag:"D = S × T.",
      glyph:'a<span class="slash">÷</span>n',
      eyebrow:'solve <b>↓</b>', expr:false, requires:"mastery:money", masterSecs:9, group:"Measures",
      build(){ return shuffle(SDT_SRC).map(sdtItem); }
    }
  ];

  // Mode-picker section order. Empty sections are skipped by the picker.
  const MODE_GROUPS = ["Core", "Number", "Fractions & %", "Measures", "Geometry", "Reasoning"];   // T219 — new Geometry group

  // Thematic chiptune style per topic — an explicit `music` field on each mode
  // (index into Sound.STYLES 0..14; see T17/T71). Every topic maps to a DISTINCT
  // style (no two share). Any topic without an entry falls back to a deterministic
  // hash(id)%15 in sound.js, so new (Wave-2) topics always get one.
  const TOPIC_MUSIC = {
    halves:8, times:10, doubles:6, addsub:2, addsub2:0,
    bonds:1, bonds2:4, placevalue:9, placevalue2:5,
    fractionsof:14, fractionsof2:12, percentages:3, percentages2:13,
    fractions:11, squares:7
  };
  MODES.forEach(m => { if(TOPIC_MUSIC[m.id] != null) m.music = TOPIC_MUSIC[m.id]; });

  // Structured glyph tokens for the procedural pixel-font renderer (glyphs.js /
  // window.Glyphs; T56). Each token is a compact string: a single character in
  // operand ink, a leading "*" marking the amber operator ACCENT, "fNM" for a
  // stacked vulgar fraction N⁄M, or "sC" for a superscript. These mirror exactly
  // the operator each topic showed in the old `glyph` HTML (kept as a fallback):
  // the accented token is the one that used to live in the amber ".slash" span.
  const TOPIC_GLYPHS = {
    halves:       ["x","*/","2"],
    times:        ["a","*×","b"],
    doubles:      ["2","*×","x"],
    addsub:       ["a","*+","b"],
    addsub2:      ["a","*±","b"],
    bonds:        ["+","*1","*0","*0"],
    bonds2:       ["+","*1","*k"],
    placevalue:   ["×","*÷"],
    placevalue2:  ["*×","÷"],
    fractionsof:  ["*f12","n"],
    fractionsof2: ["a","*/","b"],
    percentages:  ["*%"],
    percentages2: ["n","*%"],
    fractions:    ["*f34"],
    fractions2:   ["*f18"],            // ⅛ — eighths/sixteenths Part-2 (distinct from ¾)
    squares:      ["x","*s2"],
    // T162 P1 — each new mode gets an accented operator marking its shape, using
    // only chars the pixel font supports (BIG: 0-9, a, b, n, k, x, ×, ÷, +, −,
    // ±, /, %). Each grid must be distinct from the 15 existing topic glyphs.
    scaling:      ["a","*×","n"],      // a×n — scale by an unknown factor (proportion)
    percentoff:   ["%","*−"],          // %− — percent decrease
    partwhole:    ["%","*/","n"],      // %/n — reverse: given a part %, find the whole
    balance:      ["k","*±"],          // k± — "the missing balance" (unknown k, plus-or-minus)
    // T162 P2 — 4 more accented marks. Distinct bitmaps from the 19 existing.
    lcmhcf:       ["n","*÷","k"],      // n÷k — common-factor / multiple feel
    mean:         ["*+","÷","n"],      // sum-then-divide-by-n — the mean atom
    timegap:      ["n","*−","k"],      // n−k — interval (positive minutes between)
    ratioshare:   ["a","*÷","b"],      // a÷b — divide an amount by the parts (ratio share)
    // T162 P3 — 3 more accented marks (cubes mirrors squares with ³ superscript).
    cubes:        ["x","*s3"],         // x³ — cube (mirrors squares' x² but ³ ≠ ²)
    money:        ["a","*×","k"],      // a×k — items × cost (cost is an unknown k)
    digitsum:     ["*+","9"],          // +9 — sum-of-digits → ÷9 divisibility mechanic
    // T59 — two new spine topics (supported chars only; pairwise-distinct grids).
    rounding:     ["n","*0"],          // n→0 — a number rounded to a round number
    largermd:     ["*×","*÷"],         // ×÷ both accented (distinct from placevalue ×÷)
    // T60 / T61 — two more spine topics (supported chars only; pairwise-distinct).
    metric:       ["a","*/","k"],      // a/k — a quantity rescaled per unit (conversion)
    sequences:    ["n","*+","k"],      // n+k — continue the linear pattern (common step)
    // T213 2b — nth-term Part-2 (distinct grid from `sequences`' n+k).
    sequences2:   ["n","*×","k"],      // n×k — evaluate the rule Mn ± A at term k
    // T219 batch 1 — Number recall topics (supported chars; distinct grids).
    roman:        ["*x"],              // X — the iconic Roman numeral (accented)
    primes:       ["*1","n"],          // 1·n — a prime's only factors are 1 and itself
    // T219 batch 2 — Fractions & % additions (distinct grids).
    pctup:        ["*+","%"],          // +% — increase by a percent
    fdp:          ["f12","*%"],        // ½% — fraction ↔ decimal ↔ percent
    // T219 batch 3 — Reasoning eval topics (distinct grids).
    bodmas:       ["*×","+"],          // ×+ — × before + (order of operations)
    algebra:      ["n","*±","k"],      // n±k — a function machine transforming n
    // T219 batch 4 — Number additions (distinct grids).
    xtricks:      ["*×","k"],          // ×k — a multiplication trick
    negatives:    ["*−","n"],          // −n — crossing below zero (answer ≥ 0)
    // T219 batch 5 — Geometry group (distinct grids).
    area:         ["k","*×","b"],      // k×b — a rectangle's two sides
    volume:       ["b","*×","x"],      // b×x — three dimensions multiplied
    angles:       ["n","*−","b"],      // n−b — the angle left over (to 180 / 360)
    // T219 batch 6 — averages + speed.
    mmr:          ["a","*−","b"],      // a−b — the range (max − min) stands in for the trio
    sdt:          ["a","*÷","n"]       // a÷n — distance ÷ time (speed)
  };
  MODES.forEach(m => { if(TOPIC_GLYPHS[m.id]) m.glyphTokens = TOPIC_GLYPHS[m.id]; });

  window.MODES = MODES;
  window.MODE_GROUPS = MODE_GROUPS;
})();
