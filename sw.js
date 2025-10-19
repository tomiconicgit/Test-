// This service worker is intentionally minimal.
// It ensures the PWA is installable but does not cache anything.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Skip waiting to activate the new service worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Take control of all clients immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We are not caching, so we just let the network handle it.
  // This is often called a "network-only" strategy.
  event.respondWith(fetch(event.request));
});

