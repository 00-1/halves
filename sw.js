/*
 * Halves — service worker (T102, PWA installability + offline). Caches the static,
 * version-busted assets so the app loads offline, WITHOUT breaking the T54 update
 * flow:
 *   - `build.json` + navigation requests (index.html) → NETWORK-FIRST: a new deploy
 *     is always picked up online, and the T54 version check (which fetches build.json
 *     no-store) reads fresh; offline falls back to the cached copy.
 *   - versioned / static same-origin GET (styles.css?v=…, *.js?v=…, icon.svg, the
 *     manifest) and the cross-origin font CSS/files → CACHE-FIRST (the ?v=<sha> URLs
 *     are immutable, so this is safe + fast + offline-capable), cached on first fetch.
 * No-build: this file is served as-is and registered by main.js.
 */
const CACHE = "halves-static-v1";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));   // drop superseded caches
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if(req.method !== "GET") return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  const isNav = req.mode === "navigate";
  const isBuild = url.pathname.replace(/\/+$/, "").endsWith("/build.json") || url.pathname.endsWith("build.json");

  if(isNav || isBuild){
    // NETWORK-FIRST: keep updates + the version check working; cache is the offline net.
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

  // CACHE-FIRST for the immutable, version-busted assets (and fonts).
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
