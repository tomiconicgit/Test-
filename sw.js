const CACHE_NAME = 'voxel-game-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/controls.js',
  '/world.js',
  'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',
  '/assets/metal_albedo.png',
  '/assets/metal_normal.png',
  '/assets/metal_ao.png',
  '/assets/metal_metallic.png',
  '/assets/metal_height.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

