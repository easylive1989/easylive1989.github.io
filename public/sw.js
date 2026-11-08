// Retired. The service worker kept the 3D room's scripts, fonts and model cached between visits; the room is gone and the blog's pages
// need no worker. A browser that registered the old one checks this file now and then, finds it changed, and runs it: it deletes
// the caches the old worker kept, unregisters itself and reloads any open page so it comes from the network.
// Once visitors have had time to pass through (a few months), this file can be deleted too.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
