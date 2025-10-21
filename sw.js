// sw.js

// --- CONFIGURATION ---
const CACHE_VERSION = 'v1.0.9'; // Incremented version
const CACHE_NAME = `builder-pwa-${CACHE_VERSION}`;

// List of all the files that make up the "app shell"
const APP_SHELL_URLS = [
  './',
  './index.html',
  './style.css?v=1.0.7', // Keep cache-busted CSS link
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
  './engine/structures/pipe.js',

  // External assets
  'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',

  // --- All 14 texture sets ---
  // alloywall
  './assets/textures/alloywall/alloywall_albedo.png',
  './assets/textures/alloywall/alloywall_ao.png',
  './assets/textures/alloywall/alloywall_height.png',
  './assets/textures/alloywall/alloywall_metallic.png',
  './assets/textures/alloywall/alloywall_normal.png',
  // cement
  './assets/textures/cement/cement_albedo.png',
  './assets/textures/cement/cement_height.png',
  './assets/textures/cement/cement_metallic.png',
  './assets/textures/cement/cement_normal.png',
  './assets/textures/cement/cement_roughness.png',
  // grate
  './assets/textures/grate/grate.ao.png',
  './assets/textures/grate/grate_albedo.png',
  './assets/textures/grate/grate_height.png',
  './assets/textures/grate/grate_metallic.png',
  './assets/textures/grate/grate_normal.png',
  // hexfloor
  './assets/textures/hexfloor/hexfloor_albedo.png',
  './assets/textures/hexfloor/hexfloor_ao.png',
  './assets/textures/hexfloor/hexfloor_height.png',
  './assets/textures/hexfloor/hexfloor_metallic.png',
  './assets/textures/hexfloor/hexfloor_normal.png',
  './assets/textures/hexfloor/hexfloor_roughness.png',
  // metal
  './assets/textures/metal/metal_albedo.png',
  './assets/textures/metal/metal_ao.png',
  './assets/textures/metal/metal_height.png',
  './assets/textures/metal/metal_metallic.png',
  './assets/textures/metal/metal_normal.png',
  // metalcubes
  './assets/textures/metalcubes/metalcubes_albedo.png',
  './assets/textures/metalcubes/metalcubes_ao.png',
  './assets/textures/metalcubes/metalcubes_height.png',
  './assets/textures/metalcubes/metalcubes_metallic.png',
  './assets/textures/metalcubes/metalcubes_normal.png',
  // oiltubes
  './assets/textures/oiltubes/oiltubes_albedo.png',
  './assets/textures/oiltubes/oiltubes_ao.png',
  './assets/textures/oiltubes/oiltubes_height.png',
  './assets/textures/oiltubes/oiltubes_metallic.png',
  './assets/textures/oiltubes/oiltubes_normal.png',
  './assets/textures/oiltubes/oiltubes_roughness.png',
  // oldmetal
  './assets/textures/oldmetal/oldmetal_albedo.png',
  './assets/textures/oldmetal/oldmetal_ao.png',
  './assets/textures/oldmetal/oldmetal_height.png',
  './assets/textures/oldmetal/oldmetal_metallic.png',
  './assets/textures/oldmetal/oldmetal_normal.png',
  // polishedtile
  './assets/textures/polishedtile/polishedtile_albedo.png',
  './assets/textures/polishedtile/polishedtile_ao.png',
  './assets/textures/polishedtile/polishedtile_height.png',
  './assets/textures/polishedtile/polishedtile_metallic.png',
  './assets/textures/polishedtile/polishedtile_metallic2.png',
  './assets/textures/polishedtile/polishedtile_normal.png',
  // rustymetal
  './assets/textures/rustymetal/rustymetal_albedo.png',
  './assets/textures/rustymetal/rustymetal_ao.png',
  './assets/textures/rustymetal/rustymetal_height.png',
  './assets/textures/rustymetal/rustymetal_metallic.png',
  './assets/textures/rustymetal/rustymetal_normal.png',
  // spacepanels
  './assets/textures/spacepanels/spacepanels_albedo.png',
  './assets/textures/spacepanels/spacepanels_ao.png',
  './assets/textures/spacepanels/spacepanels_height.png',
  './assets/textures/spacepanels/spacepanels_metallic.png',
  './assets/textures/spacepanels/spacepanels_normal.png',
  './assets/textures/spacepanels/spacepanels_roughness.png',
  // techwall
  './assets/textures/techwall/techwall_albedo.png',
  './assets/textures/techwall/techwall_ao.png',
  './assets/textures/techwall/techwall_height.png',
  './assets/textures/techwall/techwall_metallic.png',
  './assets/textures/techwall/techwall_normal.png',
  './assets/textures/techwall/techwall_roughness.png',
  // vent
  './assets/textures/vent/vent_albedo.png',
  './assets/textures/vent/vent_ao.png',
  './assets/textures/vent/vent_height.png',
  './assets/textures/vent/vent_metallic.png',
  './assets/textures/vent/vent_normal.png',
  // ventslating
  './assets/textures/ventslating/ventslating_albedo.png',
  './assets/textures/ventslating/ventslating_ao.png',
  './assets/textures/ventslating/ventslating_height.png',
  './assets/textures/ventslating/ventslating_metallic.png',
  './assets/textures/ventslating/ventslating_normal.png'
];

// --- SERVICE WORKER LOGIC ---

// 1. Installation: Cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[SW] Caching app shell for version ${CACHE_VERSION}`);
        // Add all URLs, handling potential failures individually
        const promises = APP_SHELL_URLS.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}: ${err}`);
          });
        });
        return Promise.all(promises);
      })
      .then(() => self.skipWaiting()) // Activate new SW immediately
      .catch(err => console.error('[SW] Installation failed:', err))
  );
});


// 2. Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('builder-pwa-') && name !== CACHE_NAME)
          .map(name => {
             console.log(`[SW] Deleting old cache: ${name}`);
             return caches.delete(name);
          })
      );
    }).then(() => {
       console.log('[SW] Claiming clients');
       return self.clients.claim(); // Take control of open pages
    })
    .catch(err => console.error('[SW] Activation failed:', err))
  );
});

// 3. Fetch: Serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If we have a cached version, return it.
        if (response) {
          // console.log(`[SW] Serving from cache: ${event.request.url}`);
          return response;
        }

        // If not in cache, fetch from network
        // console.log(`[SW] Fetching from network: ${event.request.url}`);
        return fetch(event.request).then(networkResponse => {
            // Optional: Cache the newly fetched resource dynamically
            // Be cautious with dynamic caching, it can fill up storage.
            // Consider only caching specific file types or origins.
            /*
            if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME).then(cache => {
                   cache.put(event.request, responseToCache);
               });
            }
            */
           return networkResponse;
        }).catch(error => {
            console.error(`[SW] Fetch failed for ${event.request.url}:`, error);
            // Optional: Return a fallback offline page/response here
            // return caches.match('/offline.html');
        });
      })
  );
});
