import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) {
  return new Promise((resolve) => {
    const tl = new THREE.TextureLoader();
    try {
      tl.load(url, tex => {
        if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        resolve(tex);
      }, undefined, () => {
        // console.warn(`Texture failed to load: ${url}`);
        resolve(null); // Resolve with null on error
      });
    } catch (error) {
      console.error(`Error initiating texture load for ${url}:`, error);
      resolve(null);
    }
  });
}

/**
 * Creates a PBR material from a set of textures in a directory.
 * // ... (parameters unchanged) ...
 */
async function createPBRMaterial(name, options = {}) {
  const path = options.path || name;
  const basePath = `./assets/textures/${path}/${name}`;
  const repeat = options.repeat || 1.0;
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

  // Use Promise.allSettled to ensure all load attempts complete, even if some fail
  const results = await Promise.allSettled([
    loadTex(texPaths.albedo, { srgb: true }),
    loadTex(texPaths.normal),
    loadTex(texPaths.metallic),
    loadTex(texPaths.ao),
    roughnessPromise,
    loadTex(texPaths.height),
  ]);

  // Extract textures from settled promises, using null for failures
  const [albedo, normal, metallic, ao, roughness, height] = results.map(result =>
     result.status === 'fulfilled' ? result.value : null
  );


  for (const t of [albedo, normal, metallic, ao, roughness, height]) {
    if (t) { t.repeat.set(repeat, repeat); }
  }

  return new THREE.MeshStandardMaterial({
    map: albedo || null,
    normalMap: normal || null,
    metalnessMap: metallic || null,
    aoMap: ao || null,
    roughnessMap: roughness || null,
    // --- MODIFICATION: Use options.metalness if provided, otherwise default to 1.0 ---
    metalness: metallic ? 1.0 : (options.metalness !== undefined ? options.metalness : 0.3),
    // --- END MODIFICATION ---
    roughness: roughness ? 1.0 : (options.roughness !== undefined ? options.roughness : 0.5),
    envMapIntensity: 1.5,
  });
}

export async function makeMaterials() {
  const repeatVal = 0.5;

  try { // Add try...catch around the material creation
      const [
        metal, alloywall, cement, grate, hexfloor, metalcubes,
        oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
        techwall, vent, ventslating
      ] = await Promise.all([
        createPBRMaterial('metal', { roughness: 0.35 }),
        createPBRMaterial('alloywall', { roughness: 0.25, repeat: repeatVal }),
        // --- MODIFICATION: Specify that cement is NOT metallic ---
        createPBRMaterial('cement', { roughness: 0.8, repeat: repeatVal, hasRoughnessMap: true, metalness: 0.0 }),
        // --- END MODIFICATION ---
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
        // Return a basic set of materials or re-throw to stop initialization
        // For now, let's return a minimal set to potentially allow *some* rendering
        const fallbackMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
         const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8c6a1'), roughness: 0.9 });
         const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.25 });
        return { metal: fallbackMetal, sand, glass };
    }
}
