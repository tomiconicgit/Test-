// This service worker is configured to NOT cache any assets.
// It forces the browser to fetch all resources from the network on every request.
// This ensures the PWA always loads the latest version upon launch.

const CACHE_NAME = 'no-cache-v1';

// The install event fires when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing and skipping wait...');
  // self.skipWaiting() forces the waiting service worker to become the
  // active service worker, ensuring updates are applied immediately.
  self.skipWaiting();
});

// The activate event fires after installation.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // This clears out any old caches from previous versions of the app.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// The fetch event fires for every network request the page makes.
self.addEventListener('fetch', (event) => {
  // This is a "network-only" strategy.
  // By calling event.respondWith(fetch(event.request)), we are explicitly
  // telling the browser to ignore any cache and go directly to the network.
  // If the network request fails, the request will fail, as there is no cache fallback.
  event.respondWith(fetch(event.request));
});


