/*
 * Halves — house generative PIXEL ICONS for the chrome (T117).
 *
 * Same ethos as glyphs.js (the topic pixel-font) / the T50 procedural nav icons:
 * tiny hand-pixelled bitmaps, crisp at small size, NO image assets. Each icon is a
 * grid of "#"/"." rows; it is emitted as a 1-bit SVG `<rect>` mask (a `data:` URI),
 * and `installCSS()` injects one `.px-ic.<name>{ mask-image:url(...) }` rule per
 * icon. An inline icon is then just `<span class="px-ic <name>">` whose shape is the
 * mask and whose colour is `currentColor` — so it tints with the surrounding text
 * (gold amber, a locked-node's muted, a done-node's mint, …) and aligns inline.
 * Decorative → the spans are `aria-hidden`; the controls keep their `aria-label`.
 *
 * window.Icons = { ICONS, svgURI(name), installCSS(doc?), span(name,cls?), names }
 */
(function(){
  "use strict";

  // 9×9 (or 9×8) bitmaps. "#" = ink, "." = empty. Designed to read at ~14–18px.
  const ICONS = {
    // padlock — shackle arc over a body with a keyhole gap
    lock: [
      "..#####..",
      ".#.....#.",
      ".#.....#.",
      "#########",
      "#########",
      "###...###",
      "##.....##",
      "#########",
      "#########"],
    // speaker + two sound waves
    soundOn: [
      "....#....",
      "...##.#..",
      ".###..#.#",
      "##...#..#",
      "##...#..#",
      ".###..#.#",
      "...##.#..",
      "....#....",
      "........."],
    // speaker + an "x" (muted)
    soundOff: [
      "....#....",
      "...##....",
      ".###.#.#.",
      "##....#..",
      "##...#.#.",
      ".###.....",
      "...##....",
      "....#....",
      "........."],
    // gear / cog
    cog: [
      "...#.#...",
      ".#######.",
      ".#.###.#.",
      "###...###",
      "##.....##",
      "###...###",
      ".#.###.#.",
      ".#######.",
      "...#.#..."],
    // coin — disc with a centre mark
    coin: [
      "..#####..",
      ".#######.",
      "##.###.##",
      "##.###.##",
      "##.###.##",
      "##.###.##",
      "##.....##",
      ".#######.",
      "..#####.."],
    // calendar — header bar + a grid
    calendar: [
      ".#.....#.",
      ".#.....#.",
      "#########",
      "#########",
      "#.#.#.#.#",
      "#########",
      "#.#.#.#.#",
      "#########",
      "........."],
    // crossed swords
    swords: [
      "#.......#",
      ".#.....#.",
      "..#...#..",
      "...#.#...",
      "....#....",
      "...#.#...",
      "..#.#.#..",
      ".##...##.",
      "#.......#"],
    // checkered finish flag
    flag: [
      "##.##....",
      "##.##....",
      "..##.##..",
      "..##.##..",
      "##.##....",
      "##.......",
      "##.......",
      "##.......",
      "##......."],
    // folded map
    map: [
      "###.###.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.###",
      "........."],
    // five-point star
    star: [
      "....#....",
      "....#....",
      "...###...",
      "#########",
      ".#######.",
      "..#####..",
      "..#####..",
      ".##...##.",
      "##.....##"],
    // sparkle (four-point)
    sparkles: [
      "....#....",
      "....#....",
      "...###...",
      "#.#####.#",
      ".#######.",
      "#.#####.#",
      "...###...",
      "....#....",
      "....#...."],
    // fullscreen — corner brackets
    fullscreen: [
      "###...###",
      "#.......#",
      "#.......#",
      ".........",
      ".........",
      ".........",
      "#.......#",
      "#.......#",
      "###...###"],
    // backspace / delete
    backspace: [
      ".........",
      "..######.",
      ".#..#.#.#",
      "#....#..#",
      "#...#.#.#",
      "#..#.#..#",
      ".#....#.#",
      "..######.",
      "........."],
    // close (x)
    close: [
      ".........",
      ".#.....#.",
      "..#...#..",
      "...#.#...",
      "....#....",
      "...#.#...",
      "..#...#..",
      ".#.....#.",
      "........."],
    // check / tick
    check: [
      ".........",
      ".......##",
      "......##.",
      "#....##..",
      "##..##...",
      ".####....",
      "..##.....",
      ".........",
      "........."],
    // play (right triangle)
    play: [
      "##.......",
      "####.....",
      "######...",
      "########.",
      "#########",
      "########.",
      "######...",
      "####.....",
      "##......."]
  };

  function svgURI(name){
    const g = ICONS[name]; if(!g) return "";
    const h = g.length, w = g[0].length;
    let rects = "";
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(g[y].charAt(x) === "#") rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges">' + rects + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // Inject one mask rule per icon (idempotent). Inline icons reference it by class.
  function installCSS(doc){
    doc = doc || (typeof document !== "undefined" ? document : null);
    if(!doc || !doc.createElement) return;
    if(doc.getElementById && doc.getElementById("px-icons")) return;
    let css = "";
    for(const name in ICONS){
      const u = svgURI(name);
      css += '.px-ic.' + name + '{-webkit-mask-image:url("' + u + '");mask-image:url("' + u + '")}\n';
    }
    const st = doc.createElement("style");
    st.id = "px-icons"; st.textContent = css;
    (doc.head || doc.documentElement || doc.body).appendChild(st);
  }

  // Inline icon HTML (decorative): a span the surrounding text colours + sizes.
  function span(name, cls){ return '<span class="px-ic ' + name + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; }

  window.Icons = { ICONS: ICONS, svgURI: svgURI, installCSS: installCSS, span: span, names: Object.keys(ICONS) };
})();
