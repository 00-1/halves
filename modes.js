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
  const FRACTIONS_SRC = [
    ["1/2",0.5],  ["1/4",0.25], ["3/4",0.75],
    ["1/5",0.2],  ["2/5",0.4],  ["3/5",0.6],  ["4/5",0.8],
    ["1/8",0.125],["3/8",0.375],["5/8",0.625],["7/8",0.875],
    ["1/10",0.1], ["3/10",0.3], ["7/10",0.7], ["9/10",0.9],
    // twentieths family — terminating, and the link to percentages (×5 = %)
    ["1/20",0.05],["3/20",0.15],["9/20",0.45],["11/20",0.55],["17/20",0.85],
    ["1/16",0.0625]
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
    [3.5,"×",100,350],[0.4,"×",100,40],[7,"÷",10,0.7],[35,"÷",10,3.5],[60,"÷",100,0.6]
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
    [15, 20, 17, 5, 105],
    [11, 48, 12, 36, 48],
    [6, 30, 7, 15, 45],
    [9, 25, 10, 10, 45],
    [12, 50, 13, 35, 45],
    [16, 5, 17, 30, 85],
    [8, 15, 8, 45, 30],
    [13, 10, 14, 0, 50],
    [10, 45, 12, 30, 105],
    [7, 20, 9, 50, 150],
    [14, 25, 16, 40, 135],
    [11, 0, 12, 45, 105],
    [9, 35, 11, 20, 105],
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
    ["r", [31,44,28,52,39], 37, 28]
  ];

  // ---- T162 Tier P3 — extensions to existing modes (cheap, high-leverage) ----
  // 9. `cubes` — n³ for small n. Calibration: n ∈ 2..6 plus 10 (answers ≤216,
  //    or 1000). Extended to n ∈ 2..10 (max 1000) so a fluent player has more
  //    items per round; the spec called for a "small fixed set + mixed review".
  const CUBES_P3_SRC = [2, 3, 4, 5, 6, 7, 8, 9, 10];
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
  // Digit sum: "digit sum of N" or "remainder N ÷ 9" (= digitSum mod 9).
  function digitsumItem(e){
    if(e[0] === "s") return { p: "digit sum of " + e[1], a: e[2] };
    return { p: "remainder " + e[1] + " ÷ 9", a: e[2] };
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
      id:"squares", name:"Squares", tag:"Square it.",
      glyph:'x<span class="slash">²</span>',
      eyebrow:'square of <b>↓</b>', expr:false, unlockedBy:"fractions", masterSecs:3.5, group:"Core",
      build(){ return shuffle(SQUARES_SRC).map(n => ({ p:n+"²", a:n*n })); }
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
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:percentoff", masterSecs:10, group:"Reasoning",
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
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:addsub2", masterSecs:9, group:"Reasoning",
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
      id:"cubes", name:"Cubes", tag:"Cube it.",
      glyph:'x<span class="slash">³</span>',
      eyebrow:'cube of <b>↓</b>', expr:false, requires:"mastery:squares", masterSecs:4, group:"Core",
      build(){ return shuffle(CUBES_P3_SRC).map(n => ({ p:n+"³", a:n*n*n })); }
    },
    {
      // Money per spec is "after addsub2", but the addsub branch already chains
      // addsub2 → balance → mean (single-child tree). Chained off bonds2 instead
      // — the closest sensible leaf: bonds2 covers decimal bonds-to-1 (£0.40 +
      // £0.60 = £1.00), the foundation for £-totals + change. Calibration's
      // "+/− fluency required" is met via the spine route addsub→bonds→bonds2.
      id:"money", name:"Money", tag:"£ totals & change.",
      glyph:'a<span class="slash">×</span>k',
      eyebrow:'solve <b>↓</b>', expr:true, requires:"mastery:bonds2", masterSecs:9, group:"Core",
      build(){ return shuffle(MONEY_P3_SRC).map(moneyItem); }
    },
    {
      // Digit sum chains off lcmhcf (the spec's sensible predecessor — both live
      // in the divisibility / factor family). lcmhcf has no existing child → fits.
      id:"digitsum", name:"Digit Sum", tag:"Sum the digits · ÷9 mechanic.",
      glyph:'<span class="slash">+</span>9',
      eyebrow:'solve <b>↓</b>', expr:false, requires:"mastery:lcmhcf", masterSecs:6, group:"Core",
      build(){ return shuffle(DIGITSUM_P3_SRC).map(digitsumItem); }
    }
  ];

  // Mode-picker section order. Empty sections are skipped by the picker.
  const MODE_GROUPS = ["Core", "Number", "Fractions & %", "Measures", "Reasoning"];

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
    digitsum:     ["*+","9"]           // +9 — sum-of-digits → ÷9 divisibility mechanic
  };
  MODES.forEach(m => { if(TOPIC_GLYPHS[m.id]) m.glyphTokens = TOPIC_GLYPHS[m.id]; });

  window.MODES = MODES;
  window.MODE_GROUPS = MODE_GROUPS;
})();
