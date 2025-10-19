const CACHE_NAME = 'voxel-game-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './main.js',
  './controls.js',
  './world.js',
  './assets/metal_albedo.png',
  './assets/metal_normal.png',
  './assets/metal_ao.png',
  './assets/metal_metallic.png',
  './assets/metal_height.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/objects/Sky.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for modules; cache-first for textures/icons
self.addEventListener('fetch', event => {
  const req = event.request;
  const isAsset = req.url.includes('/assets/') || req.destination === 'image' || req.url.endsWith('.png');
  if (isAsset) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }))
    );
  } else {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});