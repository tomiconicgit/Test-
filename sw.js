// sw.js — Builder PWA Service Worker

// ===== CONFIG =====
const CACHE_VERSION = 'v1.0.15'; // bump when you change shell list
const APP_SHELL_CACHE = `builder-app-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `builder-dyn-${CACHE_VERSION}`;
const IMAGE_CACHE = `builder-img-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  './',
  './index.html',
  './style.css?v=1.0.7',
  './main.js',
  './manifest.json',

  // UI
  './ui/Joystick.js',
  './ui/lightingcontrols.js',
  './loader.js',

  // Engine
  './engine/Materials.js',
  './engine/VoxelWorld.js',
  './engine/inputController.js',
  './engine/placement.js',
  './engine/player.js',

  // Structures
  './engine/structures/block.js',
  './engine/structures/blockRoundedSides.js', // NEW
  './engine/structures/cylinder.js',
  './engine/structures/floor.js',
  './engine/structures/glass.js',
  './engine/structures/slope.js',
  './engine/structures/wall.js',
  './engine/structures/pipe.js',

  // Examples utils used by rounded block merge
  'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/utils/BufferGeometryUtils.js',

  // External libs
  'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',

  // --- All texture sets ---
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

// ===== HELPERS =====
const isHTMLNavigate = (req) =>
  req.mode === 'navigate' ||
  (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));

const isTextureOrImage = (url) => {
  const p = url.pathname.toLowerCase();
  return p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.webp');
};

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    await cache.addAll(APP_SHELL_URLS);
    await self.skipWaiting();
  })());
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![APP_SHELL_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(k))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // App shell / navigation
  if (isHTMLNavigate(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(APP_SHELL_CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(APP_SHELL_CACHE);
        const cached = await cache.match('./index.html');
        if (cached) return cached;
        return new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Local JS/CSS + CDN three/* utils — stale-while-revalidate
  if (isStaticAsset(url) || url.href.includes('cdn.jsdelivr.net')) {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => { if (res && res.status === 200) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      return cached || fetchPromise || fetch(req);
    })());
    return;
  }

  // Textures/images — cache-first
  if (isTextureOrImage(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req, { mode: 'no-cors' });
        if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch {
        const fallback = await (await caches.open(APP_SHELL_CACHE)).match(req);
        if (fallback) return fallback;
        return new Response(null, { status: 504 });
      }
    })());
    return;
  }

  // Default network-with-cache-fallback
  event.respondWith((async () => {
    try { return await fetch(req); }
    catch {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const shell = await (await caches.open(APP_SHELL_CACHE)).match(req);
      return shell || new Response(null, { status: 504 });
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});