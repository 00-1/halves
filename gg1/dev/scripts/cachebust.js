/*
 * Halves — deploy-time asset cache-busting (T107).
 *
 * Problem: index.html references its CSS/JS with BARE local paths
 * (`href="styles.css"`, `src="main.js"`). GH-Pages serves those with a default
 * cache max-age, so after a deploy a browser/CDN can keep serving the OLD
 * styles.css / main.js while `build.json` (fetched no-store) reads fresh — the
 * page LOOKS deployed but runs stale code. Every live review is then untrustworthy.
 *
 * Fix (no-build): at deploy time CI runs this to append `?v=<version>` to the
 * stylesheet link and EVERY local module <script>, so a new build is a new URL the
 * cache cannot shadow. The SOURCE index.html stays clean (bare refs) — only the
 * deployed artifact is rewritten — so `node -c` / the Node test harness are
 * unaffected. Cooperates with the T54 version-check: the refreshed page references
 * the new `?v=<sha>` URLs, so the manual-refresh reload lands on fresh assets.
 *
 * External refs (anything with a scheme or an existing query) are left untouched.
 * T169 — also versions SELF-HOSTED font url()s inside CSS (`url(fonts/x.woff2)` →
 * `url(fonts/x.woff2?v=…)`), so the self-hosted fonts cache-bust like every other
 * asset (run this on styles.css too at deploy). Re-running is idempotent (already-
 * versioned refs are skipped). Run as CLI it also VERIFIES the result — no bare
 * local asset ref may survive — so the deploy step is itself a gate on the file.
 *
 * Usage: node scripts/cachebust.js <version> [file=index.html]
 */
"use strict";
const fs = require("fs");

// Matches an href/src to a LOCAL .css/.js file: the path must contain no quote,
// no "?" (skips already-versioned) and no ":" (skips http(s):// and data:),
// so only bare local asset refs are rewritten.
const ASSET_RE = /(\s(?:href|src)=")([^"?:]+\.(?:css|js))(")/g;
// T169 — a CSS `url(local-font.woff2)` ref: no quote/paren, no "?" (skips
// already-versioned), no ":" (skips data:/http(s):) → only bare local font refs.
const FONT_RE = /(url\()([^"'?:)]+\.(?:woff2|woff|ttf))(\))/g;

// Pure: append ?v=<version> to every bare local css/js/font ref in `text`.
function bust(text, version){
  return text
    .replace(ASSET_RE, (m, pre, file, post) => pre + file + "?v=" + version + post)
    .replace(FONT_RE,  (m, pre, file, post) => pre + file + "?v=" + version + post);
}

// The set of bare local css/js/font refs still present (verifies completeness).
function bareRefs(text){
  const out = [];
  let m;
  const reA = new RegExp(ASSET_RE.source, "g");
  while((m = reA.exec(text))) out.push(m[2]);
  const reF = new RegExp(FONT_RE.source, "g");
  while((m = reF.exec(text))) out.push(m[2]);
  return out;
}

module.exports = { bust, bareRefs, ASSET_RE, FONT_RE };

if(require.main === module){
  const version = process.argv[2];
  const file = process.argv[3] || "index.html";
  if(!version){ console.error("usage: node scripts/cachebust.js <version> [file]"); process.exit(1); }
  const src = fs.readFileSync(file, "utf8");
  const out = bust(src, version);
  const left = bareRefs(out);
  if(left.length){ console.error("cachebust: bare local asset refs survived: " + left.join(", ")); process.exit(1); }
  fs.writeFileSync(file, out);
  console.log("cachebust: " + file + " → ?v=" + version + " on " + bareRefs(src).length + " local asset refs");
}
