// src/Blocks.js
import * as THREE from 'three';

export const BLOCK = { AIR:0, CONCRETE:1, METAL:2 };

export class BlockLibrary {
  constructor(assetsBase = './assets/') {
    this.assetsBase = assetsBase;
    this.loader = new THREE.TextureLoader();
    this.materials = {};
  }

  async load() {
    // Concrete (default terrain)
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x9ea3aa, roughness: 0.85, metalness: 0.0
    });

    // Metal PBR maps
    const [albedo, normal, ao, height, metalness] = await Promise.all([
      this._tex('metal_albedo.png', true),
      this._tex('metal_normal.png'),
      this._tex('metal_ao.png'),
      this._tex('metal_height.png'),
      this._tex('metal_metallic.png'),
    ]);
    [albedo, ao, metalness].forEach(t=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4; });
    normal.wrapS=normal.wrapT=THREE.RepeatWrapping;
    height.wrapS=height.wrapT=THREE.RepeatWrapping;

    const metalMat = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      aoMap: ao,
      metalnessMap: metalness,
      metalness: 1.0,
      roughness: 0.35,
    });

    // Share a unit cube with uv2 for ao
    const geom = new THREE.BoxGeometry(1,1,1);
    geom.setAttribute('uv2', new THREE.BufferAttribute(geom.attributes.uv.array, 2));

    this.materials[BLOCK.CONCRETE] = { material: concreteMat, geometry: geom };
    this.materials[BLOCK.METAL]    = { material: metalMat,     geometry: geom };
    return this.materials;
  }

  _tex(name, sRGB=false){
    return new Promise((res,rej)=>{
      this.loader.load(
        this.assetsBase + name,
        t=>{ if(sRGB) t.colorSpace = THREE.SRGBColorSpace; res(t); },
        undefined, rej
      );
    });
  }
}