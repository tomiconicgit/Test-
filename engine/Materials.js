import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) { /* ... unchanged ... */ }

/**
 * Creates a PBR material from a set of textures in a directory.
 * // ... (parameters unchanged) ...
 */
async function createPBRMaterial(name, options = {}) {
  const path = options.path || name;
  const basePath = `./assets/textures/${path}/${name}`;
  const repeat = options.repeat || 1.0;
  const hasRoughnessMap = options.hasRoughnessMap || false;

  // Define texture paths
  const texPaths = { /* ... unchanged ... */ };

  // Conditionally load roughness texture
  const roughnessPromise = texPaths.roughness ? loadTex(texPaths.roughness) : Promise.resolve(null);

  const [albedo, normal, metallic, ao, roughness, height] = await Promise.all([
    loadTex(texPaths.albedo, { srgb: true }),
    loadTex(texPaths.normal),
    loadTex(texPaths.metallic),
    loadTex(texPaths.ao),
    roughnessPromise,
    loadTex(texPaths.height),
  ]);

  // Set texture repeats
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
    roughness: roughness ? 1.0 : (options.roughness !== undefined ? options.roughness : 0.5),
    // --- MODIFICATION: Increased Reflection Intensity ---
    envMapIntensity: 2.0, // Increased from 1.5
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
    // envMapIntensity is now set inside createPBRMaterial
    createPBRMaterial('metal', { roughness: 0.35 }),
    createPBRMaterial('alloywall', { roughness: 0.25, repeat: repeatVal }),
    createPBRMaterial('cement', { roughness: 0.8, repeat: repeatVal, hasRoughnessMap: true }),
    createPBRMaterial('grate', { aoFile: 'grate.ao.png', roughness: 0.1 }),
    createPBRMaterial('hexfloor', { roughness: 0.1, repeat: repeatVal, hasRoughnessMap: true }),
    createPBRMaterial('metalcubes', { roughness: 0.1, repeat: repeatVal }),
    createPBRMaterial('oiltubes', { roughness: 0.4, hasRoughnessMap: true }),
    createPBRMaterial('oldmetal', { roughness: 0.3 }),
    createPBRMaterial('polishedtile', { metalFile: 'polishedtile_metallic2.png', roughness: 0.05, repeat: repeatVal }),
    createPBRMaterial('rustymetal', { roughness: 0.4 }),
    createPBRMaterial('spacepanels', { roughness: 0.3, repeat: repeatVal, hasRoughnessMap: true }),
    createPBRMaterial('techwall', { roughness: 0.1, repeat: repeatVal, hasRoughnessMap: true }),
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
