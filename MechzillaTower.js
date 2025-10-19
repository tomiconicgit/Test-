// MechzillaTower.js — Fresh start base + 4 detailed beams
// Base: 30x30 bright metal slab
// Beams: 4x4 cross-section, 60 high, with recessed "steel indent" panels on all faces

export class MechzillaTower {
  constructor({
    baseSize = 30,
    baseThickness = 1,
    beamSize = 4,
    beamHeight = 60,                    // ⬅️ raised from 40 → 60
    position = new THREE.Vector3(0, 0, 0)
  } = {}) {
    this.params = { baseSize, baseThickness, beamSize, beamHeight };
    this.group = new THREE.Group();
    this.group.name = 'MechzillaTower';
    this.group.position.copy(position);

    // Materials
    const brightMetal = new THREE.MeshStandardMaterial({
      color: 0xd9dee5, metalness: 1.0, roughness: 0.15
    });
    const indentMetal = new THREE.MeshStandardMaterial({
      color: 0xb8bec6, metalness: 0.85, roughness: 0.4
    });

    // --- Base slab (30 x 30)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, baseThickness, baseSize),
      brightMetal
    );
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // --- Corner beams with recessed panels
    const half = baseSize / 2 - beamSize / 2;
    const beamY = beamHeight / 2 + baseThickness;

    const beam = this._makeDetailedBeam(beamSize, beamHeight, brightMetal, indentMetal);

    const b1 = beam.clone(); b1.position.set(+half, beamY, +half); b1.name = 'cornerBeam_1';
    const b2 = beam.clone(); b2.position.set(-half, beamY, +half); b2.name = 'cornerBeam_2';
    const b3 = beam.clone(); b3.position.set(-half, beamY, -half); b3.name = 'cornerBeam_3';
    const b4 = beam.clone(); b4.position.set(+half, beamY, -half); b4.name = 'cornerBeam_4';
    this.group.add(b1, b2, b3, b4);
  }

  _makeDetailedBeam(size, height, shellMat, panelMat) {
    // Base column
    const g = new THREE.Group();

    const shell = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), shellMat);
    shell.castShadow = true; shell.receiveShadow = true;
    g.add(shell);

    // Recessed panel dimensions (thin boxes slightly inset from each face)
    const panelInset = Math.max(0.16, size * 0.12);      // margin from beam edges
    const panelThick = 0.04;                              // very thin
    const fudge = 0.01;                                   // avoid z-fighting
    const panelHeight = height - 0.8;                     // leave a small top/bottom rim
    const panelWidth  = size - panelInset * 2;

    // +X face
    const px = new THREE.Mesh(
      new THREE.BoxGeometry(panelThick, panelHeight, panelWidth),
      panelMat
    );
    px.position.set(size / 2 - panelThick / 2 - fudge, 0, 0);
    px.castShadow = px.receiveShadow = true;

    // -X face
    const nx = px.clone();
    nx.position.x *= -1;

    // +Z face
    const pz = new THREE.Mesh(
      new THREE.BoxGeometry(panelWidth, panelHeight, panelThick),
      panelMat
    );
    pz.position.set(0, 0, size / 2 - panelThick / 2 - fudge);
    pz.castShadow = pz.receiveShadow = true;

    // -Z face
    const nz = pz.clone();
    nz.position.z *= -1;

    g.add(px, nx, pz, nz);
    return g;
  }

  addTo(scene) { scene.add(this.group); }

  update() { /* no animation yet */ }
}