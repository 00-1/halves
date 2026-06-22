/*
 * Halves — service worker (T102; T158 fix). Caches assets for offline WITHOUT
 * pinning stale code or breaking the T54 update flow:
 *   - navigation requests (index.html), `build.json`, AND every same-origin app
 *     asset (.js / .css / .html / .json / .svg / the manifest) → NETWORK-FIRST.
 *     Our scripts are loaded UN-versioned (no `?v=<sha>`), so cache-firsting them
 *     froze the installed PWA on the first-seen copy — a stale pre-T151 synth.js
 *     ran the diverging FDN reverb (the "foghorn") and main.js never updated.
 *     Network-first means a correctness fix lands on the very next ONLINE launch;
 *     the cache is only the OFFLINE fallback. `build.json` is never cached so the
 *     T54 version check always reads fresh.
 *   - cross-origin, genuinely-immutable assets (the web-font CSS/files) →
 *     CACHE-FIRST (safe + fast + offline), cached on first fetch.
 * No-build: this file is served as-is and registered by main.js.
 */
const CACHE = "halves-static-v2";   // T158: v1→v2 so `activate` PURGES the cache that pinned stale JS

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));   // drop superseded caches (incl. the poisoned v1)
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if(req.method !== "GET") return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  const isNav = req.mode === "navigate";
  const isBuild = url.pathname.replace(/\/+$/, "").endsWith("/build.json") || url.pathname.endsWith("build.json");
  const sameOrigin = url.origin === self.location.origin;

  // NETWORK-FIRST for navigations, build.json, AND all same-origin app assets.
  // (T158: our app code is un-versioned, so it must never be served stale from
  // cache while a network copy exists — cache is the offline net only.)
  if(isNav || isBuild || sameOrigin){
    e.respondWith((async () => {
      try{
        const res = await fetch(req);
        if(res && res.ok && !isBuild){ const c = await caches.open(CACHE); c.put(req, res.clone()); }   // never cache build.json
        return res;
      }catch(_){
        const cached = await caches.match(req);
        return cached || (isNav ? (await caches.match("./")) || Response.error() : Response.error());
      }
    })());
    return;
  }

  // CACHE-FIRST only for cross-origin, immutable assets (the web fonts).
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
