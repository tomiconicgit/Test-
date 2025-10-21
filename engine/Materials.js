import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts = {}) {
  return new Promise((resolve) => {
    const tl = new THREE.TextureLoader();
    tl.load(url, tex => {
      if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, () => resolve(null));
  });
}

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

  const results = await Promise.allSettled([
    loadTex(texPaths.albedo, { srgb: true }),
    loadTex(texPaths.normal),
    loadTex(texPaths.metallic),
    loadTex(texPaths.ao),
    texPaths.roughness ? loadTex(texPaths.roughness) : Promise.resolve(null),
    loadTex(texPaths.height),
  ]);

  const [albedo, normal, metallic, ao, roughness, height] = results.map(r => r.status === 'fulfilled' ? r.value : null);

  for (const t of [albedo, normal, metallic, ao, roughness, height]) if (t) t.repeat.set(repeat, repeat);

  const mat = new THREE.MeshStandardMaterial({
    map: albedo || null,
    normalMap: normal || null,
    metalnessMap: metallic || null,
    aoMap: ao || null,
    roughnessMap: roughness || null,
    metalness: metallic ? 1.0 : (options.metalness ?? 0.0),
    roughness: roughness ? 1.0 : (options.roughness ?? 0.5),
    envMapIntensity: options.iblIntensity ?? 0.6, // ↓ lower default IBL so sky doesn’t overpower
  });

  if (mat.aoMap) mat.aoMapIntensity = 1.0;
  return mat;
}

export async function makeMaterials() {
  const repeatVal = 0.5;

  try {
    const [
      metal, alloywall, cement, grate, hexfloor, metalcubes,
      oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
      techwall, vent, ventslating
    ] = await Promise.all([
      createPBRMaterial('metal',        { roughness: 0.35, iblIntensity: 0.7 }),
      createPBRMaterial('alloywall',    { roughness: 0.25, repeat: repeatVal, iblIntensity: 0.65 }),
      createPBRMaterial('cement',       { roughness: 0.9,  repeat: repeatVal, hasRoughnessMap: true, metalness: 0.0, iblIntensity: 0.4 }),
      createPBRMaterial('grate',        { aoFile: 'grate.ao.png', roughness: 0.2, iblIntensity: 0.6 }),
      createPBRMaterial('hexfloor',     { roughness: 0.2,  repeat: repeatVal, hasRoughnessMap: true, iblIntensity: 0.6 }),
      createPBRMaterial('metalcubes',   { roughness: 0.2,  repeat: repeatVal, iblIntensity: 0.65 }),
      createPBRMaterial('oiltubes',     { roughness: 0.5,  hasRoughnessMap: true, iblIntensity: 0.6 }),
      createPBRMaterial('oldmetal',     { roughness: 0.35, iblIntensity: 0.65 }),
      createPBRMaterial('polishedtile', { metalFile: 'polishedtile_metallic2.png', roughness: 0.12, repeat: repeatVal, iblIntensity: 0.55 }),
      createPBRMaterial('rustymetal',   { roughness: 0.45, iblIntensity: 0.6 }),
      createPBRMaterial('spacepanels',  { roughness: 0.35, repeat: repeatVal, hasRoughnessMap: true, iblIntensity: 0.55 }),
      createPBRMaterial('techwall',     { roughness: 0.2,  repeat: repeatVal, hasRoughnessMap: true, iblIntensity: 0.55 }),
      createPBRMaterial('vent',         { roughness: 0.25, repeat: repeatVal, iblIntensity: 0.55 }),
      createPBRMaterial('ventslating',  { roughness: 0.22, repeat: repeatVal, iblIntensity: 0.55 }),
    ]);

    const sand = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d8c6a1'),
      roughness: 0.9,
      metalness: 0.0,
      envMapIntensity: 0.35
    });

    const glass = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5
    });

    return {
      metal, alloywall, cement, grate, hexfloor, metalcubes,
      oiltubes, oldmetal, polishedtile, rustymetal, spacepanels,
      techwall, vent, ventslating,
      sand, glass
    };
  } catch (error) {
    console.error("Failed to create materials:", error);
    const fallbackMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5, envMapIntensity: 0.5 });
    const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8c6a1'), roughness: 0.9, envMapIntensity: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.25, envMapIntensity: 0.4 });
    return { metal: fallbackMetal, sand, glass };
  }
}