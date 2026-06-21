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
    }
  };

  // ---- explain(modeId, question): the guide's method applied to the specific
  // numbers (generated, not hand-written), for the Practice view (T32). British,
  // 10-yo-appropriate, mathematically correct. Always returns a non-empty line.
  const ORDINAL = { 2:"half", 3:"third", 4:"quarter", 5:"fifth", 6:"sixth", 8:"eighth", 10:"tenth" };
  function tidy(n){ return Math.round(n * 1e6) / 1e6; }   // kill float fuzz for display
  function explain(modeId, q){
    if(!q) return "";
    const p = String(q.p), a = q.a, fb = "Work it through step by step — the answer is " + a + ".";
    switch(modeId){
      case "halves": { const n = parseFloat(p); if(isNaN(n)) break;
        return "Halve the tens and ones separately, then add — half of " + n + " is " + a + (n % 2 ? " (odd, so it ends in a half)" : "") + "."; }
      case "doubles": { const n = parseFloat(p); if(isNaN(n)) break;
        return "Double the tens and ones, then add them — double " + n + " is " + a + "."; }
      case "times": { const m = p.match(/(\d+)\s*[×x]\s*(\d+)/); if(!m) break; const x = +m[1], y = +m[2];
        let trick = "";
        if(x === 9 || y === 9){ const o = x === 9 ? y : x; trick = " Tip: ×9 is ×10 then take one lot off (" + (o*10) + " − " + o + " = " + a + ")."; }
        else if(x === 4 || y === 4){ trick = " Tip: ×4 is double, then double again."; }
        else if(x === 5 || y === 5){ trick = " Tip: ×5 is ×10 then halve."; }
        return x + " lots of " + y + " is " + a + "." + trick; }
      case "addsub": case "addsub2": {
        const mp = p.match(/(\d+)\s*\+\s*(\d+)/);
        if(mp) return "Add by bridging through the next ten (and hundred): " + (+mp[1]) + " + " + (+mp[2]) + " = " + a + ".";
        const ms = p.match(/(\d+)\s*[−-]\s*(\d+)/);
        if(ms) return "Count up from " + (+ms[2]) + " to " + (+ms[1]) + " (or take tens then ones) → " + a + ".";
        break; }
      case "bonds": { const m = p.match(/(\d+)\s*\+/); if(!m) break;
        return "The two parts make 100: " + (+m[1]) + " needs " + a + " (the ones make 10, the tens make 9)."; }
      case "bonds2": { const m = p.match(/([\d.]+)\s*\+.*?=\s*([\d.]+)/); if(!m) break; const x = +m[1], whole = +m[2];
        return whole === 1
          ? "A decimal bond to 1 — just a bond to 10 in disguise: " + x + " needs " + a + "."
          : "Count up to the next hundred, then on to 1000: " + x + " needs " + a + "."; }
      case "placevalue": case "placevalue2": {
        const m = p.match(/([\d.]+)\s*([×x÷\/])\s*(\d+)/); if(!m) break;
        const v = m[1], op = m[2], t = +m[3];
        const places = t === 10 ? "one place" : t === 100 ? "two places" : "three places";
        const dir = (op === "×" || op === "x") ? "bigger" : "smaller";
        return "× or ÷ by " + t + " shifts the digits " + places + " " + dir + ": " + v + " " + (op === "x" ? "×" : op) + " " + t + " = " + a + "."; }
      case "fractionsof": { const m = p.match(/(\d+)\/(\d+)\s*of\s*(\d+)/); if(!m) break;
        return "Share " + (+m[3]) + " into " + (+m[2]) + " equal groups: " + (+m[3]) + " ÷ " + (+m[2]) + " = " + a + "."; }
      case "fractionsof2": { const m = p.match(/(\d+)\/(\d+)\s*of\s*(\d+)/); if(!m) break;
        const nu = +m[1], d = +m[2], amt = +m[3], one = tidy(amt / d);
        return "Find one " + (ORDINAL[d] || ("1/" + d)) + ", then take " + nu + ": " + amt + " ÷ " + d + " = " + one + ", × " + nu + " = " + a + "."; }
      case "percentages": case "percentages2": {
        const m = p.match(/(\d+)%\s*of\s*(\d+)/); if(!m) break; const pct = +m[1], amt = +m[2];
        const how = pct === 50 ? "50% is half" : pct === 25 ? "25% is a quarter (halve, then halve again)" :
          pct === 10 ? "10% is divide by 10" : pct === 20 ? "20% is double 10%" : pct === 5 ? "5% is half of 10%" :
          pct === 1 ? "1% is divide by 100" : pct === 75 ? "75% is a half plus a quarter" : (pct + "% of " + amt);
        return how + ": " + pct + "% of " + amt + " = " + a + "."; }
      case "fractions": { const m = p.match(/(\d+)\/(\d+)/); if(!m) break;
        return "Turn " + (+m[1]) + "/" + (+m[2]) + " into a decimal — build it from a fraction you know → " + a + "."; }
      case "squares": { const m = p.match(/(\d+)/); if(!m) break; const n = +m[1];
        return "A square is the number times itself: " + n + " × " + n + " = " + a + "."; }
    }
    return fb;
  }

  window.Guides = {
    get: function(id){ return GUIDES[id] || null; },
    has: function(id){ return !!GUIDES[id]; },
    ids: function(){ return Object.keys(GUIDES); },
    explain: explain
  };
})();
