// MechzillaTower.js — base 30x30 + four 4x4x60 beams with INTEGRATED indents
// Indents are part of the beam via a procedural bump map (wraps around edges)

export class MechzillaTower {
  constructor({
    baseSize = 30,
    baseThickness = 1,
    beamSize = 4,
    beamHeight = 60,
    position = new THREE.Vector3(0, 0, 0)
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = 'MechzillaTower';

    // === Materials ===========================================================
    // Painted/brushed steel with clearcoat for crisp highlights
    const beamMat = new THREE.MeshPhysicalMaterial({
      color: 0x6e7a86,
      metalness: 0.55,
      roughness: 0.38,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18
    });

    // Add an embossed recessed panel to the beam as part of the surface
    const { bump, bumpScale } = this._makeIndentBumpTexture({
      size: 1024,          // texture resolution
      border: 0.18,        // border thickness (fraction of face)
      bevel: 0.08,         // rounded border size (fraction)
      depth: 0.8           // visual depth strength 0..1
    });
    beamMat.bumpMap = bump;
    beamMat.bumpScale = bumpScale;
    beamMat.needsUpdate = true;

    // Slightly rougher base so it reads differently from columns
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0x5d666f,
      metalness: 0.35,
      roughness: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4
    });

    // === Base slab ===========================================================
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, baseThickness, baseSize),
      baseMat
    );
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // === Four beams ==========================================================
    const half = baseSize / 2 - beamSize / 2;
    const y = beamHeight / 2 + baseThickness;

    const beamGeo = new THREE.BoxGeometry(beamSize, beamHeight, beamSize);
    // Increase UV tiling a bit so the indent detail is sharp on tall columns
    // BoxGeometry already has UVs; we just scale them to keep the panel ratio nice.
    const uv = beamGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      // Slightly stretch along height so border looks proportionate
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, u, v * 1.2);
    }
    uv.needsUpdate = true;

    const makeBeam = () => {
      const m = new THREE.Mesh(beamGeo.clone(), beamMat);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };

    const b1 = makeBeam(); b1.position.set(+half, y, +half); b1.name = 'cornerBeam_1';
    const b2 = makeBeam(); b2.position.set(-half, y, +half); b2.name = 'cornerBeam_2';
    const b3 = makeBeam(); b3.position.set(-half, y, -half); b3.name = 'cornerBeam_3';
    const b4 = makeBeam(); b4.position.set(+half, y, -half); b4.name = 'cornerBeam_4';
    this.group.add(b1, b2, b3, b4);
  }

  /**
   * Creates a procedural bump texture that looks like:
   *   [outer flat] -> [rounded border] -> [recessed center panel]
   * It’s seamless per face and works with BoxGeometry UVs, so indents
   * are visually part of the beam and wrap around edges correctly.
   */
  _makeIndentBumpTexture({ size = 1024, border = 0.18, bevel = 0.08, depth = 0.8 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background = height 0 (outer face)
    ctx.fillStyle = '#808080'; // mid gray = neutral height in bump maps
    ctx.fillRect(0, 0, size, size);

    // Compute panel rect
    const b = Math.max(0, Math.min(0.45, border));   // clamp
    const pad = Math.floor(size * b);
    const inner = size - pad * 2;

    // Build a radial gradient “bevel” that slopes down into the recess
    const bevelPx = Math.floor(size * Math.max(0.02, Math.min(0.2, bevel)));
    const recess = Math.floor((depth * 128)); // darker = lower

    // Draw inner recessed plate (darker than mid gray)
    ctx.fillStyle = `rgb(${128 - recess}, ${128 - recess}, ${128 - recess})`;
    ctx.fillRect(pad + bevelPx, pad + bevelPx, inner - 2 * bevelPx, inner - 2 * bevelPx);

    // Draw the rounded border by layering several alpha strokes
    for (let i = 0; i < bevelPx; i++) {
      const t = i / (bevelPx - 1 || 1);
      const shade = Math.round(128 - recess * (1 - t)); // goes from dark near center to mid gray
      ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, 1)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(pad + i + 1, pad + i + 1, inner - 2 * i - 2, inner - 2 * i - 2);
    }

    const bumpTex = new THREE.CanvasTexture(canvas);
    bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.needsUpdate = true;

    // Negative scale pushes the center "in"
    const bumpScale = -0.06; // tune depth on device

    return { bump: bumpTex, bumpScale };
  }

  addTo(scene) { scene.add(this.group); }
  update() {}
}