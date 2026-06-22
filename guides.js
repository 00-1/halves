/*
 * Halves — per-topic "how to beat it" guides (T27).
 *
 * Short, friendly help for every topic, aimed at a confident British 10-year-old
 * (Year 5/6). British English; punchy; mathematically correct. Data only — main.js
 * renders it from the topic picker. Each guide: { intro, tips:[2–4], example }.
 */
(function(){
  "use strict";

  const GUIDES = {
    halves: {
      intro: "Halving means splitting a number into two equal parts.",
      tips: [
        "Split into tens and ones, halve each, then add. Half of 48 = 20 + 4 = 24.",
        "Odd numbers end in .5. Half of 7 is 3.5.",
        "Halving twice is the same as finding a quarter.",
        "Learn the everyday ones: half of 100 is 50, half of 60 is 30."
      ],
      example: "Half of 90 → 45 (90 minutes is one and a half hours)."
    },
    times: {
      intro: "Knowing your tables off by heart speeds up almost every question.",
      tips: [
        "Drill the tricky ones: 6×7 = 42, 7×8 = 56, 8×9 = 72.",
        "×9: do ×10 then take one lot off. 9×7 = 70 − 7 = 63.",
        "×4: double, then double again.",
        "Order doesn't matter: 3×8 is the same as 8×3."
      ],
      example: "7×6 → think 7×3 = 21, then double → 42."
    },
    doubles: {
      intro: "Doubling means adding a number to itself — it's halving's twin.",
      tips: [
        "Double the tens and ones separately, then add. Double 36 = 60 + 12 = 72.",
        "Doubling a 5 makes 10, so double 25 is 50.",
        "If you can halve, you can double — they undo each other."
      ],
      example: "Double 48 → 80 + 16 → 96."
    },
    addsub: {
      intro: "Adding and taking away two-digit numbers in your head.",
      tips: [
        "Bridge through the next ten. 47 + 38: 47 + 3 = 50, then + 35 = 85.",
        "Near a ten? Round, then adjust. + 9 is + 10 then − 1.",
        "For take-away, count up. 75 − 46: from 46 up to 75 is 29."
      ],
      example: "64 + 27 → 64 + 6 = 70, then + 21 → 91."
    },
    addsub2: {
      intro: "The same tricks, now with hundreds in the mix.",
      tips: [
        "Keep the hundreds whole and work on the rest. 240 + 85 = 325.",
        "Bridge down through the hundred. 143 − 57: 143 − 43 = 100, then − 14 = 86.",
        "Near a ten? − 49 is − 50 then + 1."
      ],
      example: "320 + 67 → add the tens (380), then the ones → 387."
    },
    bonds: {
      intro: "Number bonds are two parts that make a whole — here, to 100.",
      tips: [
        "When there are ones, the ones add to 10 and the tens add to 9. 63 → 37.",
        "Bonds to 10 are the foundation: 7 needs 3.",
        "Whole tens are quick: 60 needs 40."
      ],
      example: "72 + ? = 100 → tens 7 and 2 make 9, ones 2 and 8 make 10 → 28."
    },
    bonds2: {
      intro: "Bonds to 1000, and decimal bonds to 1.",
      tips: [
        "To 1000, count up to the next hundred, then on to 1000. 650 → 350.",
        "Decimal bonds to 1 are just bonds to 10 in disguise: 0.4 → 0.6.",
        "Whole hundreds are easy: 800 → 200."
      ],
      example: "650 + ? = 1000 → 650 to 700 is 50, 700 to 1000 is 300 → 350."
    },
    placevalue: {
      intro: "Multiplying and dividing by 10 and 100 — the digits shift, the dot stays put.",
      tips: [
        "×10 moves every digit one place bigger; ×100 moves two. 24 × 100 = 2400.",
        "÷10 moves digits one place smaller; ÷100 two. 60 ÷ 100 = 0.6.",
        "It is never just 'add a zero' — that breaks with decimals. 3.5 × 10 = 35."
      ],
      example: "0.4 × 100 → digits move two places bigger → 40."
    },
    placevalue2: {
      intro: "The same shifting, now with 1000 and trickier decimals.",
      tips: [
        "÷1000 moves digits three places smaller. 120 ÷ 1000 = 0.12.",
        "×100 moves two places bigger. 0.04 × 100 = 4.",
        "Fill empty places with zeros: 25 ÷ 100 = 0.25."
      ],
      example: "450 ÷ 1000 → three places smaller → 0.45."
    },
    fractionsof: {
      intro: "Finding a unit fraction of an amount — share it into equal groups.",
      tips: [
        "The bottom number says how many groups. ⅓ means split into 3.",
        "½ is halve it; ¼ is halve, then halve again.",
        "⅕ of 35: 35 ÷ 5 = 7."
      ],
      example: "⅓ of 24 → 24 ÷ 3 → 8."
    },
    fractionsof2: {
      intro: "Non-unit fractions — find one part, then take that many.",
      tips: [
        "Divide by the bottom, then times by the top. ⅔ of 18: 18 ÷ 3 = 6, × 2 = 12.",
        "¾: find a quarter, then take three of them.",
        "⅝ of 40: 40 ÷ 8 = 5, × 5 = 25."
      ],
      example: "⅗ of 30 → 30 ÷ 5 = 6, then × 3 → 18."
    },
    percentages: {
      intro: "Per cent means 'out of 100' — a special kind of fraction.",
      tips: [
        "50% is half. 50% of 36 = 18.",
        "10% is divide by 10. 10% of 400 = 40.",
        "25% is a quarter — halve, then halve again. 25% of 40 = 10.",
        "Build the rest from 10%: 20% is double 10%."
      ],
      example: "50% of 140 → half of 140 → 70."
    },
    percentages2: {
      intro: "More percentages, built from the easy ones.",
      tips: [
        "1% is divide by 100. 1% of 200 = 2.",
        "5% is half of 10%. 5% of 200: 10% is 20, half is 10.",
        "20% is double 10%. 20% of 150 = 30.",
        "75% is a half plus a quarter. 75% of 60 = 30 + 15 = 45."
      ],
      example: "5% of 140 → 10% is 14, half of that → 7."
    },
    fractions: {
      intro: "Turning a fraction into its decimal — learn the common ones by heart.",
      tips: [
        "The key ones: ½ = 0.5, ¼ = 0.25, ¾ = 0.75, ⅕ = 0.2, 1/10 = 0.1.",
        "Tenths are easy: 7/10 = 0.7.",
        "1/20 = 0.05 — half of a tenth."
      ],
      example: "2/5 → each fifth is 0.2, so two of them → 0.4."
    },
    squares: {
      intro: "A square is a number times itself.",
      tips: [
        "Learn 1² to 12² off by heart. 6² = 36, 9² = 81.",
        "Handy big ones: 15² = 225, 25² = 625.",
        "n² just means n × n: 7² = 7 × 7 = 49."
      ],
      example: "8² → 8 × 8 → 64."
    },
    rounding: {
      intro: "Rounding finds the nearest round number — to the nearest 10, 100 or 1000.",
      tips: [
        "Look only at the digit in the place JUST below the one you're rounding to.",
        "5 or more rounds UP; 4 or less rounds DOWN. The lower places all become 0.",
        "Nearest 100? Check the tens digit. Nearest 1000? Check the hundreds digit."
      ],
      example: "6832 to the nearest 100 → the tens digit is 3 (below 5) → round down → 6800."
    },
    largermd: {
      intro: "Bigger multiplication and division by splitting into parts you already know.",
      tips: [
        "To × a 2-digit number, split it into tens and ones, multiply each, then add.",
        "14 × 7 → (10 × 7) + (4 × 7).",
        "To ÷, ask 'how many of the divisor fit?' — build up in easy chunks."
      ],
      example: "23 × 4 → (20 × 4) + (3 × 4) → 80 + 12 → 92."
    },
    metric: {
      intro: "Metric units step by ×10, ×100 or ×1000 — so converting is just multiplying or dividing.",
      tips: [
        "Going to a SMALLER unit (km→m, m→cm, kg→g, l→ml)? Multiply.",
        "Going to a BIGGER unit (m→km, cm→m, g→kg, ml→l)? Divide.",
        "The steps: km↔m and kg↔g and l↔ml are ×1000; m↔cm is ×100; cm↔mm is ×10."
      ],
      example: "3 km in m → smaller unit, so × 1000 → 3000 m."
    },
    sequences: {
      intro: "A linear sequence goes up (or down) by the same step each time — spot the step, then extend the rule.",
      tips: [
        "Find the common difference: subtract one term from the next.",
        "For the NEXT term, add the difference to the last one.",
        "For the rule 'Mn + A', M is the step and A shifts it; the kth term is M×k + A."
      ],
      example: "Next in 2, 5, 8, 11 → step is 3 → 11 + 3 = 14."
    }
  };

  // ---- explain(modeId, question): the METHOD for this specific question, applied
  // to its actual numbers — for the Practice "How to approach this" aside (T32/T49).
  // British, 10-yo-appropriate, mathematically correct, one short sentence. It
  // NEVER states or contains the answer: it describes the method and stops before
  // computing the result. Number-specific (single vs multi-digit, odd/even, the
  // right trick), never naming structure the number doesn't have. Returns a
  // non-empty, answer-free line for every question.
  const WORD = { 1:"one", 2:"two", 3:"three", 4:"four", 5:"five", 6:"six", 7:"seven", 8:"eight", 9:"nine", 10:"ten", 11:"eleven", 12:"twelve" };
  const ORD  = { 2:"half", 3:"third", 4:"quarter", 5:"fifth", 6:"sixth", 7:"seventh", 8:"eighth", 10:"tenth" };
  const FALLBACK = "Picture the method and work it through one step at a time.";
  // ---- place-value helpers for the halves/doubles hints (T62) ----------------
  const UNIT = { 1:"ten", 2:"hundred", 3:"thousand" };   // by number of trailing places
  // The nonzero place parts of n, biggest first: 360 → [300,60]; 144 → [100,40,4].
  function placeChunks(n){
    const s = String(n), L = s.length, out = [];
    for(let i=0;i<L;i++){ const d = +s[i]; if(d) out.push(d * Math.pow(10, L-1-i)); }
    return out;
  }
  // Natural-language list: [300,60] → "300 and 60"; [100,40,4] → "100, 40 and 4".
  function listNums(a){ return a.length === 1 ? String(a[0]) : a.slice(0,-1).join(", ") + " and " + a[a.length-1]; }
  function explain(modeId, q){
    if(!q) return "";
    const p = String(q.p);
    switch(modeId){
      case "halves": { const n = parseFloat(p); if(isNaN(n) || n < 0) break;
        const odd = (n % 2 !== 0);
        if(n < 10) return odd
          ? n + " is an odd single digit, so halving it lands on a half."
          : "Halve the single digit " + n + " straight off.";
        const chunks = placeChunks(n);
        if(chunks.length === 1){            // a round number — work in its one unit
          const L = String(n).length, d = +String(n)[0], unit = UNIT[L-1] || "unit";
          return "Think of " + n + " as " + WORD[d] + " " + unit + (d === 1 ? "" : "s") +
            " — halve the " + WORD[d] + ", keeping the place value" +
            (d % 2 ? " (an odd count, so you land on a half-" + unit + ")." : ".");
        }
        return "Split " + n + " into " + listNums(chunks) + ", halve each part, then add them" +
          (odd ? " (the ones are odd, so it ends in a half)." : "."); }
      case "doubles": { const n = parseFloat(p); if(isNaN(n) || n < 0) break;
        if(n < 10) return "Double the single digit " + n + " — add it to itself.";
        const chunks = placeChunks(n);
        if(chunks.length === 1){            // a round number — double its one unit
          const L = String(n).length, d = +String(n)[0], unit = UNIT[L-1] || "unit";
          return "Think of " + n + " as " + WORD[d] + " " + unit + (d === 1 ? "" : "s") +
            " — double the " + WORD[d] + ", keeping the place value.";
        }
        return "Split " + n + " into " + listNums(chunks) + ", double each part, then add them up."; }
      case "times": { const m = p.match(/(\d+)\s*[×x]\s*(\d+)/); if(!m) break; const x = +m[1], y = +m[2];
        const other = k => (x === k ? y : x);   // the partner of the trick-factor k
        if(x === y) return "It's a square — multiply " + x + " by itself.";
        if(x === 1 || y === 1) return "Times one leaves the number unchanged.";
        if(x === 10 || y === 10) return "Times ten shifts " + other(10) + " one place bigger.";
        if(x === 11 || y === 11) return "For ×11, multiply " + other(11) + " by ten, then add one more " + other(11) + ".";
        if(x === 12 || y === 12) return "For ×12, multiply " + other(12) + " by ten, then add two more lots of " + other(12) + ".";
        if(x === 9 || y === 9) return "For ×9, multiply " + other(9) + " by ten, then take one " + other(9) + " away.";
        if(x === 5 || y === 5) return "For ×5, multiply " + other(5) + " by ten, then halve.";
        if(x === 4 || y === 4) return "For ×4, double " + other(4) + ", then double again.";
        if(x === 2 || y === 2) return "Just double " + other(2) + ".";
        return "Recall " + x + " × " + y + " from your tables — or add one more lot to a nearby fact you know."; }
      case "addsub": case "addsub2": {
        const big = modeId === "addsub2";   // 3-digit work also crosses the hundred
        const mp = p.match(/(\d+)\s*\+\s*(\d+)/);
        if(mp) return "Bridge through the next ten" + (big ? " and hundred" : "") + ": from " + (+mp[1]) + ", add " + (+mp[2]) + " in easy jumps.";
        const ms = p.match(/(\d+)\s*[−-]\s*(\d+)/);
        if(ms) return "Count up from the smaller number to " + (+ms[1]) +
          (big ? ", or subtract column by column (ones, tens, hundreds)." : ", or take away the tens then the ones.");
        break; }
      case "bonds": { const m = p.match(/(\d+)\s*\+/); if(!m) break; const x = +m[1];
        return x % 10 === 0
          ? "A whole ten — count up in tens to make 100."
          : "Make the ones reach the next ten, then count the tens up to 100."; }
      case "bonds2": { const m = p.match(/([\d.]+)\s*\+.*?=\s*([\d.]+)/); if(!m) break; const x = m[1], whole = +m[2];
        if(whole === 1){
          const dp = (x.split(".")[1] || "").length;
          return dp >= 2
            ? "A decimal bond to 1 — pair the digits after the point like a bond to 100."
            : "A decimal bond to 1 — the tenths pair up to make ten.";
        }
        return "Count up to the next hundred, then on to 1000."; }
      case "placevalue": case "placevalue2": {
        const m = p.match(/([\d.]+)\s*([×x÷\/])\s*(\d+)/); if(!m) break;
        const v = m[1], op = m[2], t = +m[3];
        const places = t === 10 ? "one place" : t === 100 ? "two places" : "three places";
        const dir = (op === "×" || op === "x") ? "bigger" : "smaller";
        return "Shift the digits of " + v + " " + places + " " + dir + " (the decimal point stays put)."; }
      case "fractionsof": { const m = p.match(/(\d+)\/(\d+)\s*of\s*(\d+)/); if(!m) break;
        const d = +m[2], amt = +m[3];
        return "Split " + amt + " into " + (WORD[d] || d) + " equal groups and take one " + (ORD[d] || "part") + "."; }
      case "fractionsof2": { const m = p.match(/(\d+)\/(\d+)\s*of\s*(\d+)/); if(!m) break;
        const nu = +m[1], d = +m[2], amt = +m[3];
        return "Split " + amt + " into " + (WORD[d] || d) + " equal groups, then take " + (WORD[nu] || nu) + " of them."; }
      case "percentages": case "percentages2": {
        const m = p.match(/(\d+)%\s*of\s*(\d+)/); if(!m) break; const pct = +m[1], amt = +m[2];
        if(pct === 50) return "50% is one half — halve " + amt + ".";
        if(pct === 25) return "25% is one quarter — halve " + amt + ", then halve again.";
        if(pct === 10) return "10% is one tenth — find a tenth of " + amt + ".";
        if(pct === 20) return "20% is two tenths — find a tenth of " + amt + ", then double it.";
        if(pct === 5)  return "5% is half of a tenth — find a tenth of " + amt + ", then halve.";
        if(pct === 1)  return "1% is one hundredth — find a hundredth of " + amt + ".";
        if(pct === 75) return "75% is a half plus a quarter — add half of " + amt + " and a quarter of " + amt + ".";
        return pct + "% — build it up from one tenth of " + amt + "."; }
      case "fractions": { const m = p.match(/(\d+)\/(\d+)/); if(!m) break; const nu = +m[1], d = +m[2];
        const s = nu === 1 ? "" : "s";   // singular unit noun when there's just one
        if(d === 2)  return "It sits exactly halfway between 0 and 1 — write that midpoint as a decimal.";
        if(d === 10) return nu + " tenth" + s + " — read it straight off as a decimal.";
        if(d === 100) return nu + " hundredth" + s + " — that's two decimal places.";
        if(d === 5)  return "Scale " + nu + "/5 up to tenths (×2 top and bottom), then read off the decimal.";
        if(d === 20) return "Scale " + nu + "/20 up to hundredths (×5 top and bottom), then read off two decimal places.";
        if(d === 4)  return "Halve a whole twice to reach a quarter, then add up " + nu + " quarter" + s + ".";
        if(d === 8)  return "Halve a whole three times to reach an eighth, then add up " + nu + " eighth" + s + ".";
        if(d === 16) return "Halve a whole four times to reach a sixteenth, then add up " + nu + " of them.";
        return "Scale " + nu + "/" + d + " up to tenths or hundredths, then read off the decimal."; }
      case "squares": { const m = p.match(/(\d+)/); if(!m) break; const n = +m[1];
        return "A square is the number times itself — multiply " + n + " by " + n + "."; }
      case "rounding": { const m = p.match(/(\d+)\s*to nearest\s*(\d+)/); if(!m) break;
        const unit = +m[2];
        const place = unit === 10 ? "ones" : unit === 100 ? "tens" : unit === 1000 ? "hundreds" : "next-lower";
        const kept = unit === 10 ? "tens" : unit === 100 ? "hundreds" : "thousands";
        // METHOD only — never names the rounded result.
        return "Look at the " + place + " digit: 5 or more rounds the " + kept +
          " up, 4 or less leaves them — then put zeros below."; }
      case "largermd": { const m = p.match(/(\d+)\s*([×÷x])\s*(\d+)/); if(!m) break;
        const a = +m[1], op = m[2], b = +m[3];
        if(op === "÷") return "How many " + b + "s fit into " + a + "? Build up in easy chunks of " + b + ".";
        // multiply: split the 2-digit number into tens + ones
        const tens = Math.floor(a / 10) * 10, ones = a % 10;
        return "Split " + a + " into " + tens + " and " + ones + ", multiply each by " + b + ", then add the two parts."; }
      case "metric": { const m = p.match(/^([\d.]+)\s+(\w+)\s+in\s+(\w+)$/); if(!m) break;
        const STEP = { "km-m":"× 1000", "m-cm":"× 100", "cm-mm":"× 10", "kg-g":"× 1000", "l-ml":"× 1000",
          "m-km":"÷ 1000", "cm-m":"÷ 100", "mm-cm":"÷ 10", "g-kg":"÷ 1000", "ml-l":"÷ 1000" };
        const op = STEP[m[2] + "-" + m[3]]; if(!op) break;
        const dir = op[0] === "×" ? "a smaller unit, so multiply" : "a bigger unit, so divide";
        // METHOD only — names the operation, not the converted value.
        return m[3] + " is " + dir + ": " + op.replace(/^[×÷]/, op[0]) + "."; }
      case "sequences": {
        const nx = p.match(/^next:\s*([\d,\s]+)$/);
        if(nx){ const nums = nx[1].split(",").map(s => +s.trim());
          // METHOD only — point at the gap between the given terms (never state the
          // step value itself, which can equal the answer in a descending run).
          return "Find the step from " + nums[0] + " to " + nums[1] +
            ", then carry that same step on past the last term, " + nums[nums.length - 1] + "."; }
        const nth = p.match(/^(\d+)n\s*([+−]\s*\d+)?,\s*term\s*(\d+)$/);
        if(nth){ const M = +nth[1], k = +nth[3];
          return "Work out " + M + " × " + k + (nth[2] ? ", then " + (nth[2][0] === "+" ? "add " : "subtract ") + nth[2].replace(/[+−]\s*/, "") : "") + "."; }
        break; }
    }
    return FALLBACK;
  }

  window.Guides = {
    get: function(id){ return GUIDES[id] || null; },
    has: function(id){ return !!GUIDES[id]; },
    ids: function(){ return Object.keys(GUIDES); },
    explain: explain
  };
})();
