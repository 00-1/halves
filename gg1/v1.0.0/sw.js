/*
 * Halves — service worker (T102; T158 rescoped). Offline + always-fresh updates,
 * without pinning stale code:
 *   - navigation requests (index.html) + `build.json` → NETWORK-FIRST and fetched
 *     with `cache:"no-store"`. T107/cachebust appends `?v=<sha>` to every deployed
 *     script, so the ASSETS are immutable + safe to cache-first; the real staleness
 *     risk is the navigation DOCUMENT — a plain fetch goes through the browser HTTP
 *     cache and GH-Pages serves index.html with a max-age, so the SW could be handed
 *     a STALE index.html (old `?v=` refs → old JS) even online. `no-store` defeats
 *     that shadow; the cache is the OFFLINE fallback. `build.json` is never cached
 *     (the T54/T161 version check reads fresh).
 *   - the `manifest.webmanifest` + the icon files (`icon-512.png`/`icon-192.png`/
 *     `icon.svg`) → NETWORK-FIRST too (T201). These are UNVERSIONED bare URLs (no
 *     `?v=`), so cache-first would freeze the very first install identity FOREVER —
 *     the owner saw an installed app still named "Halves" with the old `x/2` icon,
 *     not "Goblin Gold"/Magnar. Network-first (cache = offline fallback) lets a deploy
 *     propagate the name + icon to the Install dialog on the next visit.
 *   - everything else — the immutable `?v=<sha>` app assets + the cross-origin web
 *     fonts → CACHE-FIRST (fast + offline; a new deploy = new `?v=` URL = cache miss
 *     = fresh fetch). This is correct precisely because those URLs are versioned.
 * No-build: this file is served as-is and registered by main.js.
 */
// T222 — derive a per-app SCOPE from the SW's own path so each GitHub-Pages app
// (gg1/dev, gg1/prod, gg2/dev …) uses a NAMESPACED cache and only ever evicts its
// OWN superseded caches — never a sibling app's (Cache Storage is origin-wide, so the
// old "delete every other cache" on activate would wipe other apps' offline caches).
const SCOPE = (function(){
  try{ const p = self.location.pathname;
    if(p.indexOf("/gg1/dev/")  >= 0) return "gg1-dev";
    if(p.indexOf("/gg1/prod/") >= 0) return "gg1-prod";
    if(p.indexOf("/gg1/v1/")   >= 0) return "gg1-v1";
    if(p.indexOf("/gg2/dev/")  >= 0) return "gg2-dev";
  }catch(e){}
  return "halves";   // root / legacy / test → the original cache name (unchanged)
})();
const CACHE = SCOPE + "-static-v4";   // T201: bump so activate purges manifest/icons frozen under the old cache-first policy
// Unversioned install-identity files that MUST stay fresh (T201) — the manifest + icons.
const FRESH_RE = /(^|\/)(manifest\.webmanifest|icon\.svg|icon-\d+\.png)$/;

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.indexOf(SCOPE + "-") === 0 && k !== CACHE).map(k => caches.delete(k)));   // T222 — drop only THIS app's superseded caches
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if(req.method !== "GET") return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  const isNav = req.mode === "navigate";
  const isBuild = url.pathname.replace(/\/+$/, "").endsWith("/build.json") || url.pathname.endsWith("build.json");
  const isFresh = FRESH_RE.test(url.pathname);   // T201 — manifest + icons must stay fresh (install identity)

  if(isNav || isBuild || isFresh){
    // NETWORK-FIRST + no-store: always pull the freshest index.html/build.json +
    // manifest/icons (bypass the HTTP cache so a stale document/manifest can't shadow
    // a deploy). The cache is the offline net; build.json is never cached (the version
    // check reads fresh); the manifest + icons ARE cached as the offline fallback.
    e.respondWith((async () => {
      try{
        const res = await fetch(req, { cache: "no-store" });
        if(res && res.ok && !isBuild){ const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      }catch(_){
        const cached = await caches.match(req);
        return cached || (isNav ? (await caches.match("./")) || Response.error() : Response.error());
      }
    })());
    return;
  }

  // CACHE-FIRST for the immutable, version-busted (?v=<sha>) assets + the fonts.
  // (Correct because each deploy gives a NEW ?v= URL → a cache miss → a fresh copy.)
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if(cached) return cached;
    try{
      const res = await fetch(req);
      if(res && (res.ok || res.type === "opaque")){ const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    }catch(_){ return cached || Response.error(); }
  })());
});
