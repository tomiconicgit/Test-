import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) {
  return new Promise((resolve) => {
    const tl = new THREE.TextureLoader();
    try {
      tl.load(url, tex => {
        if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
        // Always prepare for repeat, even if we set 1x1
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        resolve(tex);
      }, undefined, () => resolve(null));
    } catch (error) {
      console.error(`Error initiating texture load for ${url}:`, error);
      resolve(null);
    }
  });
}

/**
 * Creates a PBR material from a set of textures in a directory.
 * Textures are applied to cover the whole prop once (repeat = 1,1).
 */
async function createPBRMaterial(name, options = {}) {
  const path = options.path || name;
  const basePath = `./assets/textures/${path}/${name}`;
  const hasRoughnessMap = options.hasRoughnessMap || false;

  const texPaths = {
    albedo: `${basePath}_albedo.png`,
    normal: `${basePath}_normal.png`,
    metallic: options.metalFile ? `./assets/textures/${path}/${options.metalFile}` : `${basePath}_metallic.png`,
    ao: options.aoFile ? `./assets/textures/${path}/${options.aoFile}` : `${basePath}_ao.png`,
    roughness: hasRoughnessMap ? `${basePath}_roughness.png` : null,
    height: `${basePath}_height.png`,
  };

  const roughnessPromise = texPaths.roughness ? loadTex(texPaths.roughness) : Promise.resolve(null);

  const results = await Promise.allSettled([
    loadTex(texPaths.albedo, { srgb: true }),
    loadTex(texPaths.normal),
    loadTex(texPaths.metallic),
    loadTex(texPaths.ao),
    roughnessPromise,
    loadTex(texPaths.height),
  ]);

  const [albedo, normal, metallic, ao, roughness, height] = results.map(r => r.status === 'fulfilled' ? r.value : null);

  // IMPORTANT: force 1×1 repeat (one texture per prop), keep wrap as RepeatWrapping
  for (const t of [albedo, normal, metallic, ao, roughness, height]) {
    if (t) { t.repeat.set(1, 1); t.needsUpdate = true; }
  }

  return new THREE.MeshStandardMaterial({
    map: albedo || null,
    normalMap: normal || null,
    metalnessMap: metallic || null,
    aoMap: ao || null,
    roughnessMap: roughness || null,
    metalness: metallic ? 1.0 : (options.metalness !== undefined ? options.metalness : 1.0),
    roughness: roughness ? 1.0 : (options.roughness !== undefined ? options.roughness : 0.5),
    envMapIntensity: 1.5,
  });
}

export async function makeMaterials() {
  try {
    const [
      metal, alloywall, cement, grate, hexfloor, metalcubes,
      oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
      techwall, vent, ventslating
    ] = await Promise.all([
      createPBRMaterial('metal', { roughness: 0.35 }),
      createPBRMaterial('alloywall', { roughness: 0.25 }),
      createPBRMaterial('cement', { roughness: 0.8, hasRoughnessMap: true, metalness: 0.0 }),
      createPBRMaterial('grate', { aoFile: 'grate.ao.png', roughness: 0.1 }),
      createPBRMaterial('hexfloor', { roughness: 0.1, hasRoughnessMap: true }),
      createPBRMaterial('metalcubes', { roughness: 0.1 }),
      createPBRMaterial('oiltubes', { roughness: 0.4, hasRoughnessMap: true }),
      createPBRMaterial('oldmetal', { roughness: 0.3 }),
      createPBRMaterial('polishedtile', { metalFile: 'polishedtile_metallic2.png', roughness: 0.05 }),
      createPBRMaterial('rustymetal', { roughness: 0.4 }),
      createPBRMaterial('spacepanels', { roughness: 0.3, hasRoughnessMap: true }),
      createPBRMaterial('techwall', { roughness: 0.1, hasRoughnessMap: true }),
      createPBRMaterial('vent', { roughness: 0.15 }),
      createPBRMaterial('ventslating', { roughness: 0.1 }),
    ]);

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

    return {
      metal, alloywall, cement, grate, hexfloor, metalcubes,
      oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
      techwall, vent, ventslating,
      sand, glass
    };
  } catch (error) {
    console.error("Failed to create materials:", error);
    const fallbackMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
    const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8c6a1'), roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.25 });
    return { metal: fallbackMetal, sand, glass };
  }
}