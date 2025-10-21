// ... (loadTex function unchanged) ...

/**
 * Creates a PBR material from a set of textures in a directory.
 * // ... (parameters unchanged) ...
 */
async function createPBRMaterial(name, options = {}) {
  const path = options.path || name;
  const basePath = `./assets/textures/${path}/${name}`;
  const repeat = options.repeat || 1.0;

  // Define texture paths, allowing for overrides
  const texPaths = { /* ... unchanged ... */ };

  const [albedo, normal, metallic, ao, roughness, height] = await Promise.all([ /* ... unchanged ... */ ]);

  // Set texture repeats for all loaded textures
  for (const t of [albedo, normal, metallic, ao, roughness, height]) {
    if (t) { t.repeat.set(repeat, repeat); }
  }

  return new THREE.MeshStandardMaterial({
    map: albedo || null,
    normalMap: normal || null,
    metalnessMap: metallic || null,
    aoMap: ao || null,
    roughnessMap: roughness || null,
    metalness: 1.0,
    roughness: roughness ? 1.0 : (options.roughness || 0.35),
    // --- MODIFICATION: Slightly increased envMapIntensity ---
    envMapIntensity: 1.5, // Increased from 1.0 - boosts reflection brightness
    // --- END MODIFICATION ---
  });
}

export async function makeMaterials() {
  const repeatVal = 0.5; 
  
  // Create all PBR materials in parallel
  const [
    metal, alloywall, cement, grate, hexfloor, metalcubes,
    oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
    techwall, vent, ventslating
  ] = await Promise.all([
    // Note: envMapIntensity is now set inside createPBRMaterial
    createPBRMaterial('metal', { roughness: 0.35 }),
    createPBRMaterial('alloywall', { roughness: 0.25, repeat: repeatVal }),
    createPBRMaterial('cement', { roughness: 0.8, repeat: repeatVal }),
    createPBRMaterial('grate', { aoFile: 'grate.ao.png', roughness: 0.1 }), 
    createPBRMaterial('hexfloor', { roughness: 0.1, repeat: repeatVal }),
    createPBRMaterial('metalcubes', { roughness: 0.1, repeat: repeatVal }),
    createPBRMaterial('oiltubes', { roughness: 0.4 }), 
    createPBRMaterial('oldmetal', { roughness: 0.3 }), 
    createPBRMaterial('polishedtile', { metalFile: 'polishedtile_metallic2.png', roughness: 0.05, repeat: repeatVal }),
    createPBRMaterial('rustymetal', { roughness: 0.4 }), 
    createPBRMaterial('spacepanels', { roughness: 0.3, repeat: repeatVal }),
    createPBRMaterial('techwall', { roughness: 0.1, repeat: repeatVal }),
    createPBRMaterial('vent', { roughness: 0.15, repeat: repeatVal }),
    createPBRMaterial('ventslating', { roughness: 0.1, repeat: repeatVal }),
  ]);

  // Original non-PBR materials
  const sand = new THREE.MeshStandardMaterial({ /* ... unchanged ... */ });
  const glass = new THREE.MeshStandardMaterial({ /* ... unchanged ... */ });

  // Return an object with all materials
  return {
    metal, alloywall, cement, grate, hexfloor, metalcubes,
    oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
    techwall, vent, ventslating,
    sand, glass
  };
}
