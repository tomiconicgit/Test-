import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

function loadTex(url, opts={}) {
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

export async function makeMaterials() {
  const [albedo, normal, metallic, ao] = await Promise.all([
    loadTex('./assets/metal_albedo.png', { srgb:true }),
    loadTex('./assets/metal_normal.png'),
    loadTex('./assets/metal_metallic.png'),
    loadTex('./assets/metal_ao.png'),
  ]);
  let height = await loadTex('./assets/metal_height.png'); 
  if(!height) height = await loadTex('./assets/metal_heigh.png');

  const metal = new THREE.MeshStandardMaterial({
    map: albedo || null,
    normalMap: normal || null,
    metalnessMap: metallic || null,
    aoMap: ao || null,
    metalness: 1.0,
    roughness: 0.35,
    envMapIntensity: 1.0,
  });

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

  for (const t of [albedo, normal, metallic, ao, height]) if (t) { t.repeat.set(1,1); }

  return { metal, sand, glass };
}
