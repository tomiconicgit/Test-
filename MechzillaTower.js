// MechzillaTower.js — 30x30 base + four 4x4x60 beams
// Applies PBR textures from /assets: albedo, normal, metallic, ao, height

export class MechzillaTower {
  constructor({
    baseSize = 30,
    baseThickness = 1,
    beamSize = 4,
    beamHeight = 60,
    position = new THREE.Vector3(0, 0, 0),
    // texture tiling controls
    beamRepeatU = 1.0,
    beamRepeatV = 6.0,      // more tiles vertically so it doesn't stretch
    baseRepeatU = 2.5,
    baseRepeatV = 2.5
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = 'MechzillaTower';

    // ---- Load texture set once (cached) -----------------------------------
    const tex = MechzillaTower._getMetalTextures();

    // ---- Materials ---------------------------------------------------------
    const makeTexturedMetal = (repeatU = 1, repeatV = 1) => {
      // clone the base textures so we can set different repeats per material
      const map        = tex.map.clone();        map.repeat.set(repeatU, repeatV);
      const normalMap  = tex.normal.clone();     normalMap.repeat.set(repeatU, repeatV);
      const metalMap   = tex.metallic.clone();   metalMap.repeat.set(repeatU, repeatV);
      const aoMap      = tex.ao.clone();         aoMap.repeat.set(repeatU, repeatV);
      const dispMap    = tex.height.clone();     dispMap.repeat.set(repeatU, repeatV);

      [map, normalMap, metalMap, aoMap, dispMap].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.needsUpdate = true;
      });

      return new THREE.MeshPhysicalMaterial({
        // base color still matters (multiplies albedo)
        color: 0xffffff,
        map,
        normalMap,
        metalnessMap: metalMap,
        aoMap,
        displacementMap: dispMap,
        // PBR tuning
        metalness: 1.0,            // driven by metalnessMap
        roughness: 0.45,           // can adjust to taste
        normalScale: new THREE.Vector2(0.9, 0.9),
        displacementScale: 0.03,   // subtle height; increase if you want more relief
        displacementBias: 0.0,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25
      });
    };

    const beamMat = makeTexturedMetal(beamRepeatU, beamRepeatV);
    const baseMat = makeTexturedMetal(baseRepeatU, baseRepeatV);

    // ---- Base slab ---------------------------------------------------------
    // Add a few segments so displacement can affect the top surface a bit
    const baseGeo = new THREE.BoxGeometry(baseSize, baseThickness, baseSize, 4, 1, 4);
    // aoMap needs uv2
    baseGeo.setAttribute('uv2', new THREE.BufferAttribute(baseGeo.attributes.uv.array, 2));

    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // ---- Beams -------------------------------------------------------------
    // Extra segments along height so displacement can work
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

    const b1 = makeBeam(); b1.position.set(+half, y, +half); b1.name = 'cornerBeam_1';
    const b2 = makeBeam(); b2.position.set(-half, y, +half); b2.name = 'cornerBeam_2';
    const b3 = makeBeam(); b3.position.set(-half, y, -half); b3.name = 'cornerBeam_3';
    const b4 = makeBeam(); b4.position.set(+half, y, -half); b4.name = 'cornerBeam_4';

    this.group.add(b1, b2, b3, b4);
  }

  addTo(scene) { scene.add(this.group); }
  update() {}

  // ---------- static texture loader (cached) ----------
  static _getMetalTextures() {
    if (this._texCache) return this._texCache;

    const loader = new THREE.TextureLoader();

    const map       = loader.load('assets/metal_albedo.png');
    const normal    = loader.load('assets/metal_normal.png');
    const metallic  = loader.load('assets/metal_metallic.png');
    const ao        = loader.load('assets/metal_ao.png');
    const height    = loader.load('assets/metal_height.png');

    // Encoding: albedo is sRGB; the rest are linear
    map.encoding = THREE.sRGBEncoding;
    [normal, metallic, ao, height].forEach(t => t.encoding = THREE.LinearEncoding);

    // A little anisotropy helps on mobile if supported
    const gl = rendererFromDOM(); // helper (below) tries to grab the active renderer
    if (gl && gl.capabilities && gl.capabilities.getMaxAnisotropy) {
      const aniso = gl.capabilities.getMaxAnisotropy();
      [map, normal, metallic, ao, height].forEach(t => t.anisotropy = Math.min(8, aniso));
    }

    this._texCache = { map, normal, metallic, ao, height };
    return this._texCache;
  }
}

// Try to find a THREE.WebGLRenderer from the page so we can set anisotropy.
// If not found, we just skip it (textures still work fine).
function rendererFromDOM() {
  const cvs = document.querySelector('canvas');
  // Three attaches renderer to canvas via __webglRenderer sometimes; if not present we skip
  return cvs && cvs.__threeRenderer ? cvs.__threeRenderer : null;
}