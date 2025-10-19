// src/Blocks.js
import * as THREE from 'three';

export const BLOCK = {
  AIR: 0,
  CONCRETE: 1,
  METAL: 2,
};

export class BlockLibrary {
  constructor(assetsBase = './assets/') {
    this.assetsBase = assetsBase;
    this.loader = new THREE.TextureLoader();
    this.materials = {};
  }

  async load() {
    // Concrete: simple PBR-ish flat with slight roughness
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x9ea3aa,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Metal: use provided maps
    const [
      albedo, normal, ao, height, metalness
    ] = await Promise.all([
      this._tex('metal_albedo.png', true),
      this._tex('metal_normal.png'),
      this._tex('metal_ao.png'),
      this._tex('metal_height.png'),
      this._tex('metal_metallic.png'),
    ]);

    // Repeat & correct encoding for color
    [albedo, ao, metalness].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; });
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    height.wrapS = height.wrapT = THREE.RepeatWrapping;

    const metalMat = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      aoMap: ao,
      metalnessMap: metalness,
      metalness: 1.0,
      roughness: 0.35,
    });

    // Keep a single box geometry with uv2 for aoMap
    const geom = new THREE.BoxGeometry(1,1,1);
    // duplicate UVs to uv2 for aoMap
    geom.setAttribute('uv2', new THREE.BufferAttribute(geom.attributes.uv.array, 2));

    this.materials[BLOCK.CONCRETE] = { material: concreteMat, geometry: geom };
    this.materials[BLOCK.METAL]     = { material: metalMat,     geometry: geom };

    return this.materials;
  }

  _tex(name, sRGB=false) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        this.assetsBase + name,
        t => { if (sRGB) t.colorSpace = THREE.SRGBColorSpace; resolve(t); },
        undefined,
        reject
      );
    });
  }
}