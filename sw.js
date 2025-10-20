// sw.js

// --- CONFIGURATION ---
// Increment this version every time you push updates
const CACHE_VERSION = 'v1.0.1'; // <-- MODIFICATION 1: Incremented version
const CACHE_NAME = `builder-pwa-${CACHE_VERSION}`;

// List of all the files that make up the "app shell"
const APP_SHELL_URLS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  
  // UI
  './ui/Joystick.js',

  // Engine
  './engine/Materials.js',
  './engine/VoxelWorld.js',
  './engine/inputController.js',
  './engine/placement.js',
  './engine/player.js',
  
  // Structures
  './engine/structures/block.js',
  './engine/structures/cylinder.js',
  './engine/structures/floor.js',
  './engine/structures/glass.js',
  './engine/structures/slope.js',
  './engine/structures/wall.js',
  './engine/structures/pipe.js', // <-- Caches your pipe file

  // Assets
  './assets/metal_albedo.png',
  './assets/metal_ao.png',
  './assets/metal_height.png', // <-- Corrected typo from your file list
  './assets/metal_metallic.png',
  './assets/metal_normal.png',

  // External assets
  'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',
  // <-- MODIFICATION 2: Added the new dependency. This fixes the 404.
  'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/utils/BufferGeometryUtils.module.js'
];

// --- SERVICE WORKER LOGIC ---

// 1. Installation: Cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[SW] Caching app shell for version ${CACHE_VERSION}`);
        // This will now cache the new BufferGeometryUtils file
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => self.skipWaiting()) // Activate new SW immediately
  );
});

// 2. Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          // This deletes any cache that is NOT the new v1.0.1
          .filter(name => name.startsWith('builder-pwa-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Take control of open pages
  );
});

// 3. Fetch: Serve from cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If we have a cached version, return it.
        return response || fetch(event.request);
      })
  );
});
