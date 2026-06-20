/*
 * Halves — lightweight, non-blocking celebration effects.
 *
 * Pure helpers plus a DOM burst that is fully self-cleaning. Everything here is
 * fire-and-forget: nothing pauses the round, steals focus, or touches the game
 * clock/input. `particleSpecs` is pure (Node-testable); `burst` takes injectable
 * `doc`/`schedule` so its cleanup path can be exercised without a real browser.
 */
(function(){
  "use strict";

  const CAP  = 14;     // hard cap on particles per burst
  const LIFE = 700;    // ms a particle lives (must match the CSS animation)

  // Pure: a capped list of particle descriptors for one burst. Each square flies
  // out along a random angle (biased slightly upward) and fades. `colors` are the
  // rarity tints to cycle through.
  function particleSpecs(colors, count){
    const cols = (colors && colors.length) ? colors : ["#ffffff"];
    const n = Math.max(0, Math.min(CAP, count | 0));
    const out = [];
    for(let i = 0; i < n; i++){
      const ang  = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 34;                 // px travelled
      out.push({
        dx: Math.round(Math.cos(ang) * dist),
        dy: Math.round(Math.sin(ang) * dist) - 10,          // bias upward
        size: 3 + Math.floor(Math.random() * 3),            // 3..5 px
        color: cols[i % cols.length],
        delay: Math.floor(Math.random() * 60)               // ms stagger
      });
    }
    return out;
  }

  // Spawn a particle burst centred at (x, y) inside `layer`. Returns a teardown()
  // that removes every node it created; also auto-tears-down after the particles
  // finish, so there is never a DOM leak. `opts.doc` / `opts.schedule` default to
  // the real document / setTimeout but can be stubbed for tests.
  function burst(layer, x, y, colors, count, opts){
    opts = opts || {};
    const doc = opts.doc || (typeof document !== "undefined" ? document : null);
    const schedule = opts.schedule || setTimeout;
    if(!layer || !doc) return function(){};

    const specs = particleSpecs(colors, count);
    const nodes = [];
    specs.forEach(s => {
      const el = doc.createElement("div");
      el.className = "particle";
      el.style.left = x + "px";
      el.style.top  = y + "px";
      el.style.width = el.style.height = s.size + "px";
      el.style.background = s.color;
      el.style.setProperty("--dx", s.dx + "px");
      el.style.setProperty("--dy", s.dy + "px");
      el.style.animationDelay = s.delay + "ms";
      layer.appendChild(el);
      nodes.push(el);
    });

    let done = false;
    function teardown(){
      if(done) return;
      done = true;
      for(const el of nodes){ if(el.parentNode) el.parentNode.removeChild(el); }
      nodes.length = 0;
    }
    schedule(teardown, LIFE + 150);
    return teardown;
  }

  window.FX = { particleSpecs, burst, CAP, LIFE };
})();
