const CACHE_NAME = 'voxel-game-cache-v2'; // Bumped version to ensure old cache is cleared
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/controls.js',
  '/world.js',
  'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/objects/Sky.js', // Cache new sky library
  '/assets/metal_albedo.png',
  '/assets/metal_normal.png',
  '/assets/metal_ao.png',
  '/assets/metal_metallic.png',
  '/assets/metal_height.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: Cache all the essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: Implement network-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If the fetch is successful, clone the response and cache it
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // If the fetch fails (e.g., offline), try to get it from the cache
        return caches.match(event.request);
      })
  );
});


