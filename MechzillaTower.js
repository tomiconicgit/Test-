// MechzillaTower.js — 30x30 base + four 4x4x60 beams using your PBR textures
// Uses albedo/normal/AO/height; scalar metalness (no metalnessMap) so it renders
// correctly without an environment map on mobile.

export class MechzillaTower {
  constructor({
    baseSize = 30,
    baseThickness = 1,
    beamSize = 4,
    beamHeight = 60,
    position = new THREE.Vector3(0, 0, 0),
    // texture tiling
    beamRepeatU = 1.0,
    beamRepeatV = 6.0,
    baseRepeatU = 2.5,
    baseRepeatV = 2.5,
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = 'MechzillaTower';

    // ---- Load textures (cached) -------------------------------------------
    const tex = MechzillaTower._getMetalTextures();

    // Helper to build a material with independent tiling
    const makeMetal = (repU, repV) => {
      const map   = tex.map.clone();    map.repeat.set(repU, repV);
      const norm  = tex.normal.clone(); norm.repeat.set(repU, repV);
      const ao    = tex.ao.clone();     ao.repeat.set(repU, repV);
      const disp  = tex.height.clone(); disp.repeat.set(repU, repV);

      [map, norm, ao, disp].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.needsUpdate = true;
      });

      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,       // multiplied with map (keep white)
        map,
        normalMap: norm,
        aoMap: ao,
        displacementMap: disp,
        displacementScale: 0.02,   // subtle; raise to 0.04 if you want more relief
        normalScale: new THREE.Vector2(0.9, 0.9),

        // IMPORTANT: not a full metal, so it lights without envMap
        metalness: 0.3,
        roughness: 0.5,

        clearcoat: 0.5,
        clearcoatRoughness: 0.25
      });
    };

    const baseMat = makeMetal(baseRepeatU, baseRepeatV);
    const beamMat = makeMetal(beamRepeatU, beamRepeatV);

    // ---- Base slab (more segments so displacement can work) ---------------
    const baseGeo = new THREE.BoxGeometry(baseSize, baseThickness, baseSize, 4, 1, 4);
    baseGeo.setAttribute('uv2', new THREE.BufferAttribute(baseGeo.attributes.uv.array, 2));

    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // ---- Beams (extra vertical segments for displacement) -----------------
    const beamGeo = new THREE.BoxGeometry(
      beamSize, beamHeight, beamSize,
      2, Math.max(20, Math.floor(beamHeight / 3)), 2
    );
    beamGeo.setAttribute('uv2', new THREE.BufferAttribute(beamGeo.attributes.uv.array, 2));

    const makeBeam = () => {
      const m = new THREE.Mesh(beamGeo.clone(), beamMat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };

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

  // ---------- static texture loader (cached) ----------
  static _getMetalTextures() {
    if (this._cache) return this._cache;

    const loader = new THREE.TextureLoader();

    // Paths must match your repo exactly (case-sensitive on GitHub Pages)
    const map    = loader.load('assets/metal_albedo.png');
    const normal = loader.load('assets/metal_normal.png');
    const ao     = loader.load('assets/metal_ao.png');
    const height = loader.load('assets/metal_height.png');

    // Correct color spaces for r128
    map.encoding = THREE.sRGBEncoding;
    normal.encoding = THREE.LinearEncoding;
    ao.encoding = THREE.LinearEncoding;
    height.encoding = THREE.LinearEncoding;

    this._cache = { map, normal, ao, height };
    return this._cache;
  }
}