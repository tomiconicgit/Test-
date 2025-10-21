import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) {
  return new Promise((resolve) => {
    const tl = new THREE.TextureLoader();
    tl.load(url, tex => {
      if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, () => resolve(null)); // Resolve with null on error
  });
}

/**
 * Creates a PBR material from a set of textures in a directory.
 * @param {string} name - The base name of the texture (e.g., "alloywall").
 * @param {object} [options] - Special overrides.
 * @param {string} [options.path] - The directory path (e.g., "alloywall").
 * @param {string} [options.aoFile] - Specific filename for AO (e.g., "grate.ao.png").
 * @param {string} [options.metalFile] - Specific filename for metallic.
 * @param {number} [options.roughness] - Default roughness if no map.
 */
async function createPBRMaterial(name, options = {}) {
  const path = options.path || name;
  const basePath = `./assets/textures/${path}/${name}`;

  // Define texture paths, allowing for overrides
  const texPaths = {
    albedo: `${basePath}_albedo.png`,
    normal: `${basePath}_normal.png`,
    metallic: options.metalFile ? `./assets/textures/${path}/${options.metalFile}` : `${basePath}_metallic.png`,
    ao: options.aoFile ? `./assets/textures/${path}/${options.aoFile}` : `${basePath}_ao.png`,
    roughness: `${basePath}_roughness.png`,
    height: `${basePath}_height.png`,
  };

  const [albedo, normal, metallic, ao, roughness, height] = await Promise.all([
    loadTex(texPaths.albedo, { srgb: true }),
    loadTex(texPaths.normal),
    loadTex(texPaths.metallic),
    loadTex(texPaths.ao),
    loadTex(texPaths.roughness),
    loadTex(texPaths.height), // Not used by MeshStandardMaterial directly
  ]);

  // Set texture repeats for all loaded textures
  for (const t of [albedo, normal, metallic, ao, roughness, height]) {
    if (t) { t.repeat.set(1, 1); }
  }

  return new THREE.MeshStandardMaterial({
    map: albedo || null,
    normalMap: normal || null,
    metalnessMap: metallic || null,
    aoMap: ao || null,
    roughnessMap: roughness || null,
    metalness: 1.0,
    // Use default roughness if no map, otherwise let the map control it
    roughness: roughness ? 1.0 : (options.roughness || 0.35),
    envMapIntensity: 1.0,
  });
}

export async function makeMaterials() {
  // Create all PBR materials in parallel
  const [
    metal, alloywall, cement, grate, hexfloor, metalcubes,
    oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
    techwall, vent, ventslating
  ] = await Promise.all([
    createPBRMaterial('metal', { roughness: 0.35 }),
    createPBRMaterial('alloywall', { roughness: 0.25 }),
    createPBRMaterial('cement', { roughness: 0.8 }),
    createPBRMaterial('grate', { aoFile: 'grate.ao.png', roughness: 0.1 }),
    createPBRMaterial('hexfloor', { roughness: 0.1 }),
    createPBRMaterial('metalcubes', { roughness: 0.1 }),
    createPBRMaterial('oiltubes', { roughness: 0.4 }),
    createPBRMaterial('oldmetal', { roughness: 0.3 }),
    createPBRMaterial('polishedtile', { metalFile: 'polishedtile_metallic2.png', roughness: 0.05 }),
    createPBRMaterial('rustymetal', { roughness: 0.4 }),
    createPBRMaterial('spacepanels', { roughness: 0.3 }),
    createPBRMaterial('techwall', { roughness: 0.1 }),
    createPBRMaterial('vent', { roughness: 0.15 }),
    createPBRMaterial('ventslating', { roughness: 0.1 }),
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
