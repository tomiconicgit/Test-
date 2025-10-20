const CACHE_NAME = 'voxel-game-cache-v4';
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

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first for images; network-first for scripts/modules
self.addEventListener('fetch', e => {
  const req = e.request;
  const isAsset = req.url.includes('/assets/') || req.destination === 'image' || req.url.endsWith('.png');
  if (isAsset) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); return res;
      }))
    );
  } else {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); return res;
      }).catch(() => caches.match(req))
    );
  }
});