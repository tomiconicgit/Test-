import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) {
  return new Promise((resolve) => {
    const tl = new THREE.TextureLoader();
    // Wrap load in a try...catch to prevent unhandled promise rejections
    try {
      tl.load(url, tex => {
        if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        resolve(tex);
      }, undefined, () => {
        // console.warn(`Texture failed to load: ${url}`); // Optional: Log warning
        resolve(null); // Resolve with null on error
      });
    } catch (error) {
      console.error(`Error initiating texture load for ${url}:`, error);
      resolve(null); // Resolve with null if load initiation fails
    }
  });
}


/**
 * Creates a PBR material from a set of textures in a directory.
 * @param {string} name - The base name of the texture (e.g., "alloywall").
 * @param {object} [options] - Special overrides.
 * @param {string} [options.path] - The directory path (e.g., "alloywall").
 * @param {string} [options.aoFile] - Specific filename for AO (e.g., "grate.ao.png").
 * @param {string} [options.metalFile] - Specific filename for metallic.
 * @param {boolean} [options.hasRoughnessMap] - Set true if _roughness.png exists.
 * @param {number} [options.roughness] - Default roughness if no map.
 * @param {number} [options.repeat] - UV repeat value (default: 1).
 */
async function createPBRMaterial(name, options = {}) {
  const path = options.path || name;
  const basePath = `./assets/textures/${path}/${name}`;
  const repeat = options.repeat || 1.0;
  const hasRoughnessMap = options.hasRoughnessMap || false; // Default to false

  // Define texture paths, allowing for overrides
  const texPaths = {
    albedo: `${basePath}_albedo.png`,
    normal: `${basePath}_normal.png`,
    metallic: options.metalFile ? `./assets/textures/${path}/${options.metalFile}` : `${basePath}_metallic.png`,
    ao: options.aoFile ? `./assets/textures/${path}/${options.aoFile}` : `${basePath}_ao.png`,
    // Only define roughness path if it should exist
    roughness: hasRoughnessMap ? `${basePath}_roughness.png` : null,
    height: `${basePath}_height.png`,
  };

  // Conditionally load roughness texture
  const roughnessPromise = texPaths.roughness ? loadTex(texPaths.roughness) : Promise.resolve(null);

  const [albedo, normal, metallic, ao, roughness, height] = await Promise.all([
    loadTex(texPaths.albedo, { srgb: true }),
    loadTex(texPaths.normal),
    loadTex(texPaths.metallic),
    loadTex(texPaths.ao),
    roughnessPromise, // Use the conditional promise
    loadTex(texPaths.height), // Not used by MeshStandardMaterial directly
  ]);

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
    // Use default roughness if no map, otherwise let the map control it
    roughness: roughness ? 1.0 : (options.roughness !== undefined ? options.roughness : 0.5), // Default roughness if no map AND no option
    envMapIntensity: 1.5,
  });
}

export async function makeMaterials() {
  const repeatVal = 0.5; // Scale factor for larger textures

  // Create all PBR materials in parallel
  // Added 'hasRoughnessMap: true' ONLY for textures that have the file
  const [
    metal, alloywall, cement, grate, hexfloor, metalcubes,
    oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
    techwall, vent, ventslating
  ] = await Promise.all([
    createPBRMaterial('metal', { roughness: 0.35 }), // No roughness map
    createPBRMaterial('alloywall', { roughness: 0.25, repeat: repeatVal }), // No roughness map
    createPBRMaterial('cement', { roughness: 0.8, repeat: repeatVal, hasRoughnessMap: true }), // Has roughness map
    createPBRMaterial('grate', { aoFile: 'grate.ao.png', roughness: 0.1 }), // No roughness map
    createPBRMaterial('hexfloor', { roughness: 0.1, repeat: repeatVal, hasRoughnessMap: true }), // Has roughness map
    createPBRMaterial('metalcubes', { roughness: 0.1, repeat: repeatVal }), // No roughness map
    createPBRMaterial('oiltubes', { roughness: 0.4, hasRoughnessMap: true }), // Has roughness map
    createPBRMaterial('oldmetal', { roughness: 0.3 }), // No roughness map
    createPBRMaterial('polishedtile', { metalFile: 'polishedtile_metallic2.png', roughness: 0.05, repeat: repeatVal }), // No roughness map
    createPBRMaterial('rustymetal', { roughness: 0.4 }), // No roughness map
    createPBRMaterial('spacepanels', { roughness: 0.3, repeat: repeatVal, hasRoughnessMap: true }), // Has roughness map
    createPBRMaterial('techwall', { roughness: 0.1, repeat: repeatVal, hasRoughnessMap: true }), // Has roughness map
    createPBRMaterial('vent', { roughness: 0.15, repeat: repeatVal }), // No roughness map
    createPBRMaterial('ventslating', { roughness: 0.1, repeat: repeatVal }), // No roughness map
  ]);

  // Original non-PBR materials
  const sand = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d8c6a1'),
    roughness: 0.9,
    metalness: 0.0,
  });

  const glass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });

  // Return an object with all materials, keyed by their name
  return {
    metal, alloywall, cement, grate, hexfloor, metalcubes,
    oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
    techwall, vent, ventslating,
    sand, glass
  };
}
