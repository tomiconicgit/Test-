// MechzillaTower.js — 30x30 base + four 4x4x60 beams using your textures
export class MechzillaTower {
  constructor({
    baseSize = 30, baseThickness = 1, beamSize = 4, beamHeight = 60,
    position = new THREE.Vector3(0,0,0),
    beamRepeatU = 1.0, beamRepeatV = 6.0,
    baseRepeatU = 2.5, baseRepeatV = 2.5,
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = 'MechzillaTower';

    const tex = MechzillaTower._getMetalTextures();

    const makeMetal = (repU, repV) => {
      const map   = tex.map.clone();    map.repeat.set(repU, repV);
      const norm  = tex.normal.clone(); norm.repeat.set(repU, repV);
      const ao    = tex.ao.clone();     ao.repeat.set(repU, repV);
      const disp  = tex.height.clone(); disp.repeat.set(repU, repV);
      [map, norm, ao, disp].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; });

      return new THREE.MeshPhysicalMaterial({
        color: 0xdde3ea,             // brighten base color (multiplies albedo)
        map,
        normalMap: norm,
        aoMap: ao,
        aoMapIntensity: 0.4,         // ↓ AO so it doesn't crush
        displacementMap: disp,
        displacementScale: 0.02,
        normalScale: new THREE.Vector2(0.9, 0.9),
        metalness: 0.35,             // partial metal → shades without env
        roughness: 0.45,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.0         // will pick up the neutral env we set
      });
    };

    const baseMat = makeMetal(baseRepeatU, baseRepeatV);
    const beamMat = makeMetal(beamRepeatU, beamRepeatV);

    const baseGeo = new THREE.BoxGeometry(baseSize, baseThickness, baseSize, 4, 1, 4);
    baseGeo.setAttribute('uv2', new THREE.BufferAttribute(baseGeo.attributes.uv.array, 2));
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    const beamGeo = new THREE.BoxGeometry(beamSize, beamHeight, beamSize, 2, Math.max(20, Math.floor(beamHeight / 3)), 2);
    beamGeo.setAttribute('uv2', new THREE.BufferAttribute(beamGeo.attributes.uv.array, 2));

    const makeBeam = () => { const m = new THREE.Mesh(beamGeo.clone(), beamMat); m.castShadow = m.receiveShadow = true; return m; };

    const half = baseSize / 2 - beamSize / 2;
    const y = beamHeight / 2 + baseThickness;
    const b1 = makeBeam(); b1.position.set(+half, y, +half);
    const b2 = makeBeam(); b2.position.set(-half, y, +half);
    const b3 = makeBeam(); b3.position.set(-half, y, -half);
    const b4 = makeBeam(); b4.position.set(+half, y, -half);
    [b1,b2,b3,b4].forEach((b,i)=> b.name = `cornerBeam_${i+1}`);
    this.group.add(b1,b2,b3,b4);
  }

  addTo(scene) { scene.add(this.group); }
  update() {}

  static _getMetalTextures() {
    if (this._cache) return this._cache;
    const loader = new THREE.TextureLoader();
    const map    = loader.load('assets/metal_albedo.png'); map.encoding = THREE.sRGBEncoding;
    const normal = loader.load('assets/metal_normal.png'); normal.encoding = THREE.LinearEncoding;
    const ao     = loader.load('assets/metal_ao.png');     ao.encoding = THREE.LinearEncoding;
    const height = loader.load('assets/metal_height.png'); height.encoding = THREE.LinearEncoding;
    this._cache = { map, normal, ao, height };
    return this._cache;
  }
}