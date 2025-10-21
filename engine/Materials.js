console.log("Executing engine/Materials.js..."); // <-- ADD THIS LOG

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) { /* ... unchanged ... */ }

async function createPBRMaterial(name, options = {}) { /* ... unchanged ... */ }

// --- ADD LOG BEFORE EXPORT ---
console.log("Defining makeMaterials function...");

export async function makeMaterials() {
  console.log("makeMaterials() called."); // <-- ADD LOG INSIDE FUNCTION
  const repeatVal = 0.5;

  try {
      // ... (Promise.all for createPBRMaterial unchanged) ...

      const [
        metal, alloywall, cement, grate, hexfloor, metalcubes,
        oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
        techwall, vent, ventslating
      ] = await Promise.all([ /* ... calls unchanged ... */ ]);

      // ... (sand, glass unchanged) ...

      console.log("makeMaterials() returning materials object."); // <-- ADD LOG BEFORE RETURN
      return {
        metal, alloywall, cement, grate, hexfloor, metalcubes,
        oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
        techwall, vent, ventslating,
        sand, glass
      };
    } catch (error) {
        console.error("Failed inside makeMaterials:", error); // <-- More specific error log
        // ... (fallback unchanged) ...
        const fallbackMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
         const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8c6a1'), roughness: 0.9 });
         const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.25 });
        return { metal: fallbackMetal, sand, glass };
    }
}

// --- ADD LOG AFTER EXPORT ---
console.log("engine/Materials.js execution finished.");
