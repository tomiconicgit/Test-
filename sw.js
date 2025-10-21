// sw.js

// --- CONFIGURATION ---
const CACHE_VERSION = 'v1.0.14'; // <-- MODIFICATION: Incremented version
const CACHE_NAME = `builder-pwa-${CACHE_VERSION}`;

// List of all the files that make up the "app shell"
const APP_SHELL_URLS = [
  './',
  './index.html',
  './style.css?v=1.0.7', // Keep cache-busted CSS
  './main.js',
  './manifest.json',

  // UI
  './ui/Joystick.js',

  // Engine
  './engine/Materials.js', // Ensure this is correctly listed
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
  // ... (texture list unchanged) ...
];

// --- SERVICE WORKER LOGIC --- (unchanged)
// ... install ...
// ... activate ...
// ... fetch ...
