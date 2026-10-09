// The site's service worker. GitHub Pages gives every file ten minutes (max-age=600) and no way to say more, so after that a returning
// visitor asks again for each script, font and model; on a phone every one of those is a round trip before the room can open.
//   - files whose name carries a content hash (/_astro/…, the cut-down Cubic 11): taken from the cache whenever they are there.
//   - the rest of /fonts/ and /models/: served from the cache at once and checked behind it (a changed file shows on the next visit).
//   - pages, and the article bodies the room fetches (/study/…): always from the network while there is one, so nothing goes stale;
//     the last copy of each is kept for when there is none.
// Everything else (other origins, images, feeds) is left to the browser. Registered by SiteHead, in production builds only.
// To take it out again, deploy a sw.js that deletes the caches and calls self.registration.unregister() when it activates.
const STATIC = 'static-v1', PAGES = 'pages-v1';
const MAX_STATIC = 60, MAX_PAGES = 30; // every deploy that changes a script leaves its old hashed file behind: keep only the newest

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== STATIC && k !== PAGES) await caches.delete(k);
  await self.clients.claim();
})()));

// what a same-origin address is, by its path alone
const bucket = (url) => {
  if (url.origin !== location.origin) return null;
  const p = url.pathname;
  if (p.startsWith('/_astro/') || /^\/fonts\/.*\.[0-9a-f]{8}\.woff2$/.test(p)) return 'hashed';
  if (p.startsWith('/fonts/') || p.startsWith('/models/')) return 'checked';
  if (p.startsWith('/study/')) return 'page';
  return null;
};

// cache.keys() comes back in the order things were put, so the first ones are the oldest
const keep = async (name, req, res) => {
  if (!res.ok || res.type !== 'basic') return;
  const c = await caches.open(name);
  await c.put(req, res);
  const keys = await c.keys(), max = name === PAGES ? MAX_PAGES : MAX_STATIC;
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await c.delete(k);
};

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const b = e.request.mode === 'navigate' && url.origin === location.origin ? 'page' : bucket(url);
  if (!b) return;
  // on a static site a page's address names the same file whatever its query, so the copy is kept under the bare path
  const key = b === 'page' ? url.origin + url.pathname : e.request;
  const save = (name) => (res) => { e.waitUntil(keep(name, key, res.clone())); return res; };
  if (b === 'hashed') {
    e.respondWith(caches.match(key).then((hit) => hit || fetch(e.request).then(save(STATIC))));
  } else if (b === 'checked') {
    e.respondWith(caches.match(key).then((hit) => {
      const net = fetch(e.request).then(save(STATIC));
      if (!hit) return net;
      e.waitUntil(net.catch(() => {}));
      return hit;
    }));
  } else {
    e.respondWith(fetch(e.request).then(save(PAGES)).catch(() => caches.match(key).then((hit) => hit || Response.error())));
  }
});

// The page that registered the worker fetched its scripts and fonts before the worker was there to see them. Once it runs, the page
// sends their addresses and its own ({ page, warm }), and those the rules above would keep are cached now, out of the HTTP cache where
// they are still fresh, rather than on the next visit.
self.addEventListener('message', (e) => {
  const { page, warm } = e.data || {};
  if (!Array.isArray(warm)) return;
  e.waitUntil((async () => {
    for (const u of [page, ...warm]) {
      let url; try { url = new URL(u); } catch { continue; }
      const b = u === page && url.origin === location.origin ? 'page' : bucket(url);
      if (!b) continue;
      const key = url.origin + url.pathname;
      if (await caches.match(key)) continue;
      try { await keep(b === 'page' ? PAGES : STATIC, key, await fetch(key)); } catch {}
    }
  })());
});
