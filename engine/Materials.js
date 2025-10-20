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

function concreteTexture(size=256) {
  const c = document.createElement('canvas'); c.width=c.height=size;
  const g = c.getContext('2d');
  // fBm-ish noise
  const data = g.createImageData(size,size);
  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      const n = (noise(x,y,8) * 0.6 + noise(x,y,32)*0.3 + noise(x,y,2)*0.1);
      const v = Math.round(200 + (n-0.5)*40); // grey
      const i=(y*size+x)*4; data.data[i]=v; data.data[i+1]=v; data.data[i+2]=v; data.data[i+3]=255;
    }
  }
  g.putImageData(data,0,0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;

  function noise(x,y,scale){
    const rx = Math.floor(x/scale), ry = Math.floor(y/scale);
    const fx = (x/scale)-rx, fy=(y/scale)-ry;
    const r00 = rnd(rx,ry), r10=rnd(rx+1,ry), r01=rnd(rx,ry+1), r11=rnd(rx+1,ry+1);
    const ix0 = lerp(r00,r10,smooth(fx)); const ix1 = lerp(r01,r11,smooth(fx));
    return lerp(ix0,ix1,smooth(fy));
  }
  function rnd(x,y){ return fract(Math.sin(x*127.1+y*311.7)*43758.5453123); }
  function fract(v){ return v-Math.floor(v); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function smooth(t){ return t*t*(3-2*t); }
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

  const concreteMap = concreteTexture(256);
  const concrete = new THREE.MeshStandardMaterial({
    map: concreteMap,
    roughness: 0.85,
    metalness: 0.0,
  });

  // New glass material
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide, // Render both sides of the glass
  });

  for (const t of [albedo, normal, metallic, ao, height]) if (t) { t.repeat.set(1,1); }

  return { metal, sand, concrete, glass };
}
