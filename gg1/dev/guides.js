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
    fractions2: {
      intro: "The harder terminating ones — eighths and sixteenths — by repeated halving.",
      tips: [
        "An eighth is a half of a half of a half: 1/8 = 0.125. Count up: 3/8 = 0.375.",
        "A sixteenth halves again: 1/16 = 0.0625 (four decimal places).",
        "Count in the unit fraction: 5/8 is five lots of 0.125."
      ],
      example: "3/16 → one sixteenth is 0.0625, so three of them → 0.1875."
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
        "Going to a SMALLER unit (km→m, m→cm, kg→g, L→mL)? Multiply.",
        "Going to a BIGGER unit (m→km, cm→m, g→kg, mL→L)? Divide.",
        "The steps: km↔m and kg↔g and L↔mL are ×1000; m↔cm is ×100; cm↔mm is ×10."
      ],
      example: "3 km in m → smaller unit, so × 1000 → 3000 m."
    },
    sequences: {
      intro: "A linear sequence goes up (or down) by the same step each time — spot the step, then carry it on.",
      tips: [
        "Find the common difference: subtract one term from the next.",
        "For the NEXT term, add that difference to the last one.",
        "Going DOWN? The step is a take-away — keep subtracting it."
      ],
      example: "Next in 2, 5, 8, 11 → step is 3 → 11 + 3 = 14."
    },
    sequences2: {
      intro: "An nth-term rule like 'Mn + A' is a formula — put the term number in for n and work it out.",
      tips: [
        "Multiply the term number by M first, then add (or subtract) A.",
        "n is just 'which term' — for the 10th term, n = 10.",
        "'3n + 2' at term 10: 3 × 10 = 30, then + 2 = 32."
      ],
      example: "4n − 1, term 8 → 4 × 8 = 32, then − 1 → 31."
    },
    scaling: {
      intro: "Scaling keeps two amounts in proportion — find what one unit is worth, then scale up.",
      tips: [
        "Find ONE unit first: if 4 cost 200, one costs 200 ÷ 4 = 50.",
        "Then multiply by how many you need. 6 of them → 6 × 50 = 300.",
        "It's multiplying, never adding — '4→6' means ×1.5, not '+2'."
      ],
      example: "5→75, 8→? → one is 75 ÷ 5 = 15, so 8 × 15 → 120."
    },
    percentoff: {
      intro: "A percentage OFF means take that slice away — you're left with the rest.",
      tips: [
        "Find the percentage, then subtract it from the whole.",
        "Or find the part that's LEFT: 20% off leaves 80%.",
        "Build the percentage from 10%: 30% is three lots of a tenth."
      ],
      example: "20% off 50 → 10% is 5, so 20% is 10 → 50 − 10 → 40."
    },
    partwhole: {
      intro: "You're given a PART and must find the whole it came from — work backwards.",
      tips: [
        "A unit fraction reverses by multiplying: if ⅕ of it is 6, the whole is 6 × 5.",
        "A percentage reverses by scaling up to 100%: 50% → ×2, 25% → ×4, 20% → ×5, 10% → ×10.",
        "Check it makes sense — the whole must be BIGGER than the part."
      ],
      example: "¼ of ? = 7 → one quarter is 7, so four quarters → 7 × 4 → 28."
    },
    balance: {
      intro: "Both sides must be EQUAL — work out the side you can, then find the number that balances it.",
      tips: [
        "Solve the side with no gap first to get its total.",
        "Then ask: what makes the other side match that total?",
        "If the missing number is being taken away, it's the difference."
      ],
      example: "34 + 17 = 90 − ? → left is 51, so 90 − ? = 51 → ? is 90 − 51 → 39."
    },
    lcmhcf: {
      intro: "LCM is the lowest number both go INTO; HCF is the biggest number that goes into BOTH.",
      tips: [
        "LCM (lowest common multiple): count up in the bigger number until the smaller one also fits.",
        "HCF (highest common factor): find the biggest number that divides both exactly.",
        "Sanity check: the LCM is never below the bigger number; the HCF never above the smaller one."
      ],
      example: "LCM 4,6 → multiples of 6: 6, 12 — and 12 divides by 4 too → 12."
    },
    mean: {
      intro: "The mean (average) shares the total out equally — add them up, then divide by how many.",
      tips: [
        "Forward: add all the values, then divide by how many there are.",
        "Reverse: the total is the mean × how many values — then take away the ones you already have.",
        "Quick check: the mean always sits between the smallest and largest value."
      ],
      example: "mean of 4, 8, 6 → total 18, three values → 18 ÷ 3 → 6."
    },
    timegap: {
      intro: "Count the minutes between two clock times — bridge through the whole hour.",
      tips: [
        "Count up to the next o'clock first, then add the rest of the way.",
        "Each whole hour you cross is 60 minutes.",
        "09:50 → 11:15: to 10:00 is 10, then on to 11:15 is 75 → 85 min."
      ],
      example: "13:25 → 14:10 → to 14:00 is 35 min, then 10 more → 45 min."
    },
    ratioshare: {
      intro: "Sharing in a ratio splits an amount into equal parts, then hands out the right number of parts.",
      tips: [
        "Add the ratio numbers for the total parts: 2:3 is 5 parts.",
        "Divide the amount by the total parts to find ONE part.",
        "Multiply one part by the share asked for (the bigger or smaller side)."
      ],
      example: "20 in 2:3 → bigger → 5 parts, 20 ÷ 5 = 4 each, bigger is 3 → 3 × 4 → 12."
    },
    cubes: {
      intro: "Cubing multiplies a number by itself three times; a ROOT undoes it — ∛ finds the cube's source, √ the square's.",
      tips: [
        "n³ means n × n × n: 4³ = 4 × 4 = 16, then × 4 = 64. (It is NOT n × 3.)",
        "Learn the small cubes: 2³ = 8, 3³ = 27, 5³ = 125, 10³ = 1000.",
        "A root reads them backwards: ∛64 asks 'what cubed makes 64?' (4); √225 asks 'what squared makes 225?' (15).",
        "So know your squares and cubes and the roots come for free."
      ],
      example: "∛125 → what number cubed is 125? 5 × 5 × 5 = 125 → 5."
    },
    money: {
      intro: "Everyday money sums — totals for several items, or the change from a note.",
      tips: [
        "For a total, multiply the price by how many. 4 × £1.25 = £5.00.",
        "For change, subtract the spend from the note. £10 − £8.10 = £1.90.",
        "£4 is the same as £4.00, and £1.90 the same as £1.9 — trailing zeros don't change the value."
      ],
      example: "3 × £2.40 → 3 × £2 = £6, 3 × 40p = £1.20 → £7.20."
    },
    bodmas: {
      intro: "When a sum mixes operations, BODMAS sets the order so everyone gets the same answer.",
      tips: [
        "Order: Brackets, then Orders (powers), then × and ÷, then + and −.",
        "Do the brackets FIRST, then all the × and ÷ (left to right), then + and −.",
        "3 + 4 × 2 is 3 + 8 = 11, NOT 7 × 2 — the × happens before the +."
      ],
      example: "20 − 3 × 4 → do 3 × 4 = 12 first → 20 − 12 → 8."
    },
    algebra: {
      intro: "A function machine takes a number IN and applies each step in turn to get the number OUT.",
      tips: [
        "Work LEFT TO RIGHT, one box at a time — not BODMAS.",
        "The output of each step is the input to the next.",
        "5 → ×2 → +3: 5 × 2 = 10, then 10 + 3 = 13."
      ],
      example: "6 → ×2 → −4 → 6 × 2 = 12, then 12 − 4 → 8."
    },
    xtricks: {
      intro: "Some multiplications have a shortcut that's faster than the long way.",
      tips: [
        "×11 (2-digit): add the two digits and drop the sum in the middle. 23 × 11 → 2_(2+3)_3 = 253.",
        "×25 = ×100 ÷ 4. 16 × 25 → 1600 ÷ 4 = 400.",
        "×9 = ×10 − 1 lot; ×99 = ×100 − 1 lot. 13 × 9 → 130 − 13 = 117.",
        "×5 = ×10 ÷ 2. 46 × 5 → 460 ÷ 2 = 230."
      ],
      example: "24 × 25 → 2400 ÷ 4 → 600."
    },
    negatives: {
      intro: "Adding and subtracting can dip below zero and come back — track the running total.",
      tips: [
        "Start negative? Adding climbs back up: −5 + 8 means start at −5 and count up 8 → 3.",
        "Going below zero mid-sum is fine if you end at zero or above.",
        "Work left to right, keeping a running total."
      ],
      example: "3 − 8 + 9 → 3 − 8 = −5, then −5 + 9 → 4."
    },
    area: {
      intro: "Area is the space inside a shape; perimeter is the distance all the way round.",
      tips: [
        "Rectangle area = length × width. 6 × 4 = 24.",
        "Rectangle perimeter = 2 × (length + width). 6 × 4 → 2 × 10 = 20.",
        "Triangle area = ½ × base × height. 8 and 5 → 40 ÷ 2 = 20."
      ],
      example: "area 7×5 → 7 × 5 → 35 (square units)."
    },
    volume: {
      intro: "The volume of a cuboid is how much space it fills — multiply its three sides.",
      tips: [
        "Volume = length × width × height. 2 × 3 × 4 = 24.",
        "Multiply two sides first, then the third. 2 × 3 = 6, then × 4 = 24.",
        "A cube is all three the same: 3 × 3 × 3 = 27."
      ],
      example: "vol 5×4×3 → 5 × 4 = 20, then × 3 → 60."
    },
    angles: {
      intro: "Angles in a set position add up to a fixed total — subtract what you know to find the rest.",
      tips: [
        "On a straight line the angles make 180°. 110 → 180 − 110 = 70.",
        "Round a point they make 360°. 250 → 360 − 250 = 110.",
        "In a triangle the three angles make 180°. 60 + 70 → 180 − 130 = 50."
      ],
      example: "△ 60, 70 → 180 − 60 − 70 → 50."
    },
    pctup: {
      intro: "A percentage INCREASE adds that slice ON — find the part, then add it to the original.",
      tips: [
        "Find the percentage of the number, then add it to the start value.",
        "Or scale in one go: +10% is ×1.1, +25% is ×1.25, +50% is ×1.5.",
        "Build the percentage from 10%: 30% is three tenths."
      ],
      example: "200 + 15% → 10% is 20, 5% is 10, so 15% is 30 → 200 + 30 → 230."
    },
    fdp: {
      intro: "Fractions, decimals and percentages are three ways to write the same value — convert between them.",
      tips: [
        "Percent → decimal: divide by 100 (45% = 0.45). Decimal → percent: ×100 (0.6 = 60%).",
        "Fraction → percent: scale it to hundredths (3/5 = 60/100 = 60%).",
        "The anchors: ½ = 0.5 = 50%, ¼ = 0.25 = 25%, ⅕ = 0.2 = 20%, 1/10 = 0.1 = 10%."
      ],
      example: "3/4 as a % → 3/4 = 0.75 = 75%."
    },
    roman: {
      intro: "Roman numerals build a number from letter-symbols, mostly adding left to right.",
      tips: [
        "The symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.",
        "Add left to right: LXVII = 50 + 10 + 5 + 1 + 1 = 67.",
        "A SMALLER symbol before a larger one SUBTRACTS: IV = 5 − 1 = 4, XC = 100 − 10 = 90.",
        "Read it in chunks: MCMLXXXIV = M + CM + LXXX + IV = 1000 + 900 + 80 + 4."
      ],
      example: "XLII → XL is 40, II is 2 → 42."
    },
    primes: {
      intro: "A prime has exactly two factors — 1 and itself; the 'next prime' is the first one above the number.",
      tips: [
        "Learn the run: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47…",
        "After 2, every prime is ODD — step up through the odd numbers.",
        "Skip anything in the 3, 5 or 7 times-tables (those have extra factors).",
        "2 is the only even prime; 1 is NOT prime."
      ],
      example: "Next prime above 24 → 25 (=5²) and 27 (=3×9) are out → 29."
    },
    digitsum: {
      intro: "Adding a number's digits powers the ÷3 and ÷9 tricks — and the leftover gives the remainder.",
      tips: [
        "Add the digits one at a time: 7263 → 7 + 2 + 6 + 3.",
        "If the digit sum divides by 9 (or 3), so does the whole number.",
        "For the remainder ÷ 9, keep adding the digits to a single digit — that's the remainder; but if you reach 9 the number divides exactly, so the remainder is 0."
      ],
      example: "digit sum of 384 → 3 + 8 + 4 → 15."
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
      case "fractions": case "fractions2": { const m = p.match(/(\d+)\/(\d+)/); if(!m) break; const nu = +m[1], d = +m[2];
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
        const STEP = { "km-m":"× 1000", "m-cm":"× 100", "cm-mm":"× 10", "kg-g":"× 1000", "L-mL":"× 1000",
          "m-km":"÷ 1000", "cm-m":"÷ 100", "mm-cm":"÷ 10", "g-kg":"÷ 1000", "mL-L":"÷ 1000" };
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
        break; }
      case "sequences2": {
        const nth = p.match(/^(\d+)n\s*([+−]\s*\d+)?,\s*term\s*(\d+)$/);
        if(nth){ const M = +nth[1], k = +nth[3];
          return "Evaluate the rule: work out " + M + " × " + k + (nth[2] ? ", then " + (nth[2][0] === "+" ? "add " : "subtract ") + nth[2].replace(/[+−]\s*/, "") : "") + "."; }
        break; }
      case "scaling": { const m = p.match(/^(\d+)→(\d+),\s*(\d+)→\?$/); if(!m) break;
        const n = +m[1], x = +m[2], M = +m[3];
        // METHOD only — point at the unit rate, never the scaled result.
        return "Find what one is worth (" + x + " ÷ " + n + "), then multiply by " + M + " — keep it in proportion, don't just add the gap."; }
      case "percentoff": { const m = p.match(/^(\d+)%\s*off\s*(\d+)$/); if(!m) break;
        const pct = +m[1], base = +m[2];
        return "Find " + pct + "% of " + base + ", then take it away from " + base + " — what's left is the answer."; }
      case "partwhole": {
        const mf = p.match(/^(\d+)\/(\d+)\s*of\s*\?\s*=\s*(\d+)$/);
        if(mf){ const d = +mf[2], given = +mf[3];
          return "One " + (ORD[d] || d + "th") + " of the whole is " + given + ", so the whole is " + given + " × " + d + "."; }
        const mp = p.match(/^(\d+)%\s*of\s*\?\s*=\s*(\d+)$/);
        if(mp){ const given = +mp[2];
          return "That percentage of the whole is " + given + " — find 1% (divide " + given + " by the percentage shown), then × 100 for the whole."; }
        break; }
      case "balance": { const m = p.match(/^(\d+)\s*([+−×])\s*(\d+)\s*=\s*(\d+)\s*([+−])\s*\?$/); if(!m) break;
        const a = +m[1], lop = m[2], b = +m[3], c = +m[4], rop = m[5];
        // METHOD only — names the moves, never the balancing number.
        return "Work out " + a + " " + lop + " " + b + " first, then find the number that makes " + c + " " + rop + " ? equal to it."; }
      case "lcmhcf": { const m = p.match(/^(LCM|HCF)\s*(\d+),(\d+)$/); if(!m) break;
        const kind = m[1], a = +m[2], b = +m[3], big = Math.max(a, b), small = Math.min(a, b);
        return kind === "LCM"
          ? "Count up in multiples of " + big + " until you reach one that " + small + " also divides into."
          : "Find the largest number that divides both " + a + " and " + b + " exactly."; }
      case "mean": {
        const mf = p.match(/^mean of ([\d,]+)$/);
        if(mf){ const vals = mf[1].split(",").filter(s => s !== "");
          return "Add all " + vals.length + " values together, then divide by " + vals.length + "."; }
        const mr = p.match(/^mean of ([\d,]+),\?\s*is\s*(\d+)$/);
        if(mr){ const knowns = mr[1].split(",").filter(s => s !== ""), total = knowns.length + 1;
          return "Multiply the mean by " + total + " values for the total, then subtract the " + knowns.length + " you're given to find the missing one."; }
        break; }
      case "timegap": { const m = p.match(/^(\d{2}):(\d{2})\s*→\s*(\d{2}):(\d{2})$/); if(!m) break;
        // METHOD only — never the minute count (and never echo the clock digits,
        // which can themselves equal the gap, e.g. 11:48 → answer 48).
        return "Count up from the first time to the next o'clock, then add the whole hours and the spare minutes to reach the second time."; }
      case "ratioshare": { const m = p.match(/^(\d+)\s*in\s*([\d:]+)\s*→\s*(bigger|smaller|biggest)$/); if(!m) break;
        const t = +m[1], parts = m[2].split(":").map(Number), total = parts.reduce((s, n) => s + n, 0);
        return "Add the ratio (" + parts.join(" + ") + " = " + total + " parts), divide " + t + " by " + total + " for one part, then take the " + m[3] + " share's worth."; }
      case "cubes": {
        const mc = p.match(/^(\d+)³$/);
        if(mc){ const n = +mc[1]; return "Cube it: multiply " + n + " by itself, then by " + n + " again — three " + n + "s (not " + n + " × 3)."; }
        const mr = p.match(/^∛(\d+)$/);
        if(mr) return "Cube root: find the number that, multiplied by itself three times, makes " + mr[1] + " (run through the small cubes).";
        const ms = p.match(/^√(\d+)$/);
        if(ms) return "Square root: find the number that, multiplied by itself, makes " + ms[1] + " (which square is it?).";
        break; }
      case "money": {
        const mm = p.match(/^(\d+)\s*×\s*£([\d.]+)$/);
        if(mm) return "Multiply £" + mm[2] + " by " + mm[1] + " — the pence scale up just like the pounds.";
        const mc = p.match(/^change from £(\d+) of £([\d.]+)$/);
        if(mc) return "Count up from £" + mc[2] + " to £" + mc[1] + ", or subtract — that's the change.";
        break; }
      case "bodmas":
        // METHOD only — the ordering rule, never the result.
        return "Work in BODMAS order: brackets first, then × and ÷ (left to right), then + and − last.";
      case "algebra":
        // METHOD only — feed it through the boxes, never the output.
        return "Run the number through the boxes left to right — each step's result is the next step's input.";
      case "xtricks": { const m = p.match(/^(\d+) × (\d+)$/); if(!m) break; const b = +m[2];
        if(b === 11) return "×11: add the two digits of " + m[1] + " and slot the sum between them (carry if it's 10+).";
        if(b === 25) return "×25 is ×100 then ÷ 4 — put two zeros on " + m[1] + ", then quarter it.";
        if(b === 9)  return "×9 is ×10 minus one lot — ten " + m[1] + "s, then take one " + m[1] + " away.";
        if(b === 99) return "×99 is ×100 minus one lot — a hundred " + m[1] + "s, then take one " + m[1] + " away.";
        if(b === 5)  return "×5 is ×10 then halve — ten " + m[1] + "s, then halve it.";
        return "Use the shortcut for × " + b + "."; }
      case "negatives":
        // METHOD only — track the running total, never state it.
        return "Work left to right, keeping a running total — it can dip below zero and climb back up.";
      case "area": {
        const ma = p.match(/^area (\d+)×(\d+)$/);
        if(ma) return "Rectangle area = length × width — multiply " + ma[1] + " by " + ma[2] + ".";
        const mp = p.match(/^perim (\d+)×(\d+)$/);
        if(mp) return "Perimeter = twice (length + width) — add " + mp[1] + " and " + mp[2] + ", then double.";
        const mt = p.match(/^△ (\d+)×(\d+)$/);
        if(mt) return "Triangle area = half of base × height — multiply " + mt[1] + " by " + mt[2] + ", then halve.";
        break; }
      case "volume": { const m = p.match(/^vol (\d+)×(\d+)×(\d+)$/); if(!m) break;
        return "Volume = the three sides multiplied — " + m[1] + " × " + m[2] + ", then × " + m[3] + "."; }
      case "angles": {
        // METHOD only — echo the fixed total (180/360, never an answer), not the
        // given angle (which can equal the answer, e.g. line 90 → 90).
        if(/^line /.test(p)) return "Angles on a straight line make 180° — take the angle you're given away from 180.";
        if(/^point /.test(p)) return "Angles round a point make 360° — take the angle you're given away from 360.";
        if(/^△ /.test(p)) return "A triangle's three angles make 180° — take the two given angles away from 180.";
        break; }
      case "pctup": { const m = p.match(/^(\d+) \+ (\d+)%$/); if(!m) break; const base = +m[1], pct = +m[2];
        return "Find " + pct + "% of " + base + ", then add it on to " + base + " for the new total."; }
      case "fdp": {
        const md = p.match(/^(\d+)% as a decimal$/);
        if(md) return "A percent is out of 100 — divide " + md[1] + " by 100 (shift the digits two places smaller).";
        const mp = p.match(/^([\d.]+) as a %$/);
        if(mp) return "To make a decimal a percent, multiply " + mp[1] + " by 100 (shift two places bigger).";
        const mf = p.match(/^(\d+)\/(\d+) as a %$/);
        if(mf) return "Scale " + mf[1] + "/" + mf[2] + " to an equivalent fraction over 100 — the new top is the percent.";
        break; }
      case "roman":
        // METHOD only — the same rule reads every numeral; never the value.
        return "Add the symbols left to right (I=1, V=5, X=10, L=50, C=100, D=500, M=1000); a smaller one before a larger one subtracts.";
      case "primes": { const m = p.match(/next prime > (\d+)/); if(!m) break; const n = +m[1];
        return "Step up from " + n + " and test each: skip the even ones, then the first with no factors apart from 1 and itself is prime."; }
      case "digitsum": {
        const ms = p.match(/^digit sum of (\d+)$/);
        if(ms) return "Add the digits of " + ms[1] + " one at a time.";
        const mr = p.match(/^remainder (\d+) ÷ 9$/);
        if(mr) return "Add the digits of " + mr[1] + " down to a single digit — that's the remainder, unless it reaches 9, which means 9 divides in exactly.";
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
