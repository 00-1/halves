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
 */
(function(){
  "use strict";

  function shuffle(a){
    a = a.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }
  function sample(a,n){ return shuffle(a).slice(0,n); }

  // Numbers whose halves are worth knowing cold.
  const HALVES_SRC   = [30,90,60,24,7,25,50,20,12,144,16,1000,500,250,360,180,9,15,45,5,3];
  // Numbers whose doubles come up constantly.
  const DOUBLES_SRC  = [6,7,8,9,12,15,16,18,25,35,45,50,60,75,120,125,250,11,13,14,17];
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

  const MODES = [
    {
      id:"halves", name:"Halves", tag:"Halve it. Fast.",
      glyph:'x<span class="slash">/</span>2',
      eyebrow:'half of <b>↓</b>', expr:false,
      build(){ return shuffle(HALVES_SRC).map(n => ({ p:String(n), a:n/2 })); }
    },
    {
      id:"doubles", name:"Doubles", tag:"Double it. Fast.",
      glyph:'2<span class="slash">×</span>x',
      eyebrow:'double <b>↓</b>', expr:false,
      build(){ return shuffle(DOUBLES_SRC).map(n => ({ p:String(n), a:n*2 })); }
    },
    {
      id:"times", name:"Times", tag:"Know your tables.",
      glyph:'a<span class="slash">×</span>b',
      eyebrow:'product of <b>↓</b>', expr:true,
      build(){
        const all=[];
        for(let a=2;a<=12;a++) for(let b=a;b<=12;b++) all.push([a,b]);
        return sample(all,21).map(([a,b]) => ({ p:a+" × "+b, a:a*b }));
      }
    },
    {
      id:"squares", name:"Squares", tag:"Square it.",
      glyph:'x<span class="slash">²</span>',
      eyebrow:'square of <b>↓</b>', expr:false,
      build(){ return shuffle(SQUARES_SRC).map(n => ({ p:n+"²", a:n*n })); }
    },
    {
      id:"fractions", name:"Fractions", tag:"As a decimal.",
      glyph:'<span class="slash">¾</span>',
      eyebrow:'as a decimal <b>↓</b>', expr:false,
      build(){ return shuffle(FRACTIONS_SRC).map(([f,d]) => ({ p:f, a:d })); }
    }
  ];

  window.MODES = MODES;
})();
