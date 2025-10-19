// MechzillaTower.js — Fresh start
// 30x30 bright metal base + four 4x4x40 beams (corner supports)

export class MechzillaTower {
  constructor({
    baseSize = 30,
    baseThickness = 1,
    beamSize = 4,
    beamHeight = 40,
    position = new THREE.Vector3(0, 0, 0)
  } = {}) {
    this.params = { baseSize, baseThickness, beamSize, beamHeight };
    this.group = new THREE.Group();
    this.group.name = 'MechzillaTower';
    this.group.position.copy(position);

    // === Bright smooth metal material ===
    const brightMetal = new THREE.MeshStandardMaterial({
      color: 0xd9dee5,   // light silver
      metalness: 1.0,
      roughness: 0.15
    });

    // === Base (30x30 area) ===
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, baseThickness, baseSize),
      brightMetal
    );
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // === Four corner beams (4x4x40) ===
    const beamGeo = new THREE.BoxGeometry(beamSize, beamHeight, beamSize);
    const half = baseSize / 2 - beamSize / 2;
    const y = beamHeight / 2 + baseThickness;

    const positions = [
      [ +half, y, +half ],
      [ -half, y, +half ],
      [ -half, y, -half ],
      [ +half, y, -half ]
    ];

    positions.forEach(([x, py, z], i) => {
      const beam = new THREE.Mesh(beamGeo, brightMetal);
      beam.position.set(x, py, z);
      beam.castShadow = true;
      beam.receiveShadow = true;
      beam.name = `cornerBeam_${i+1}`;
      this.group.add(beam);
    });
  }

  // Add this object to a scene
  addTo(scene) {
    scene.add(this.group);
  }

  update() {
    // placeholder for future arm mechanics, nothing animated yet
  }
}