// MechzillaTower.js — fresh base + 4 detailed beams (contrast materials)
// Base: 30x30 slab; Beams: 4x4 cross-section, 60 high with recessed panels

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

    // Painted steel — takes diffuse light (works without env map)
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x6e7a86,   // darker steel grey for contrast
      metalness: 0.2,
      roughness: 0.6
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x5f6975,   // slightly darker recess
      metalness: 0.2,
      roughness: 0.65
    });

    // --- Base slab (30 x 30)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, baseThickness, baseSize),
      shellMat
    );
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // --- Four detailed beams (4x4x60) on corners
    const half = baseSize / 2 - beamSize / 2;
    const beamY = beamHeight / 2 + baseThickness;
    const beam = this._makeDetailedBeam(beamSize, beamHeight, shellMat, panelMat);

    const b1 = beam.clone(); b1.position.set(+half, beamY, +half); b1.name = 'cornerBeam_1';
    const b2 = beam.clone(); b2.position.set(-half, beamY, +half); b2.name = 'cornerBeam_2';
    const b3 = beam.clone(); b3.position.set(-half, beamY, -half); b3.name = 'cornerBeam_3';
    const b4 = beam.clone(); b4.position.set(+half, beamY, -half); b4.name = 'cornerBeam_4';
    this.group.add(b1, b2, b3, b4);
  }

  _makeDetailedBeam(size, height, shellMat, panelMat) {
    const g = new THREE.Group();

    // Outer column
    const shell = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), shellMat);
    shell.castShadow = true; shell.receiveShadow = true; g.add(shell);

    // Recessed indent panels (all faces)
    const inset = Math.max(0.16, size * 0.12);
    const thickness = 0.05;
    const fudge = 0.02; // avoid z-fighting
    const h = height - 0.8;           // leave top/bottom rims
    const w = size - inset * 2;

    const px = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, w), panelMat);
    px.position.set(size/2 - thickness/2 - fudge, 0, 0);
    const nx = px.clone(); nx.position.x *= -1;

    const pz = new THREE.Mesh(new THREE.BoxGeometry(w, h, thickness), panelMat);
    pz.position.set(0, 0, size/2 - thickness/2 - fudge);
    const nz = pz.clone(); nz.position.z *= -1;

    [px, nx, pz, nz].forEach(m => { m.castShadow = m.receiveShadow = true; g.add(m); });
    return g;
  }

  addTo(scene) { scene.add(this.group); }
  update() {} // placeholder for future mechanics
}