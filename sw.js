self.addEventListener('install', (event) => {
  // This command is crucial. It tells the browser to activate the new
  // service worker immediately after it has finished installing, rather
  // than waiting for all old tabs of your PWA to be closed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // This ensures that the newly activated service worker takes control
  // of all open pages for your PWA right away.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // This is the "zero cache" or "network-only" strategy.
  // For every request (for assets, scripts, etc.), it bypasses any
  // potential service worker cache and goes directly to the network.
  // This guarantees that the user always gets the latest version from the server.
  event.respondWith(fetch(event.request));
});
