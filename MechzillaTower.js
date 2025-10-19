// MechzillaTower.js (updated)
// three.js r128 compatible

export class MechzillaTower {
  constructor({
    height = 75,
    baseSize = 6,
    armLength = 26,
    armThickness = 1.2,       // thicker arms
    armTrussWidth = 2.2,      // box-truss cross-section size
    position = new THREE.Vector3(0, 0, -18),
    maxOpenDeg = 62           // outward swing angle
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.params = { height, baseSize, armLength, armThickness, armTrussWidth, maxOpenDeg };

    this.state = {
      open: 1,               // 1=open, 0=closed
      targetOpen: 1,
      armHeight: height * 0.55,
      targetArmHeight: height * 0.55
    };

    const steel = new THREE.MeshStandardMaterial({ color: 0x202326, metalness: 0.9, roughness: 0.35 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0f1113, metalness: 0.6, roughness: 0.5 });

    // --- Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.2, 2, baseSize * 1.2), dark);
    base.position.y = 1;
    base.receiveShadow = true;
    this.group.add(base);

    // --- Mast (truss)
    const mast = this._buildMast({ height, baseSize, steel });
    this.group.add(mast);

    // --- Carriage (slides)
    const carriage = new THREE.Group();
    carriage.name = "carriage";
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(baseSize * 0.62, 0.18, 8, 24), steel);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = ring.receiveShadow = true;
    carriage.add(ring);

    // --- Chopsticks (box-truss)
    const hingeDist = baseSize * 0.55;

    const leftRoot  = new THREE.Group();  leftRoot.position.set(-hingeDist, 0, 0);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeDist, 0, 0);
    carriage.add(leftRoot, rightRoot);

    const leftArm  = this._buildBoxTrussArm(armLength, armTrussWidth, armThickness, steel);
    const rightArm = this._buildBoxTrussArm(armLength, armTrussWidth, armThickness, steel);

    // Arms are built pointing along +Z; hinge rotation around Y swings them open/closed
    leftRoot.add(leftArm);
    rightRoot.add(rightArm);

    // Tips (grip pads)
    const tipLen = 3.2;
    const tipGeo = new THREE.BoxGeometry(armTrussWidth * 0.8, armTrussWidth * 0.35, tipLen);
    const lTip = new THREE.Mesh(tipGeo, steel);
    const rTip = new THREE.Mesh(tipGeo, steel);
    lTip.position.set(0, 0, armLength + tipLen * 0.5);
    rTip.position.set(0, 0, armLength + tipLen * 0.5);
    lTip.castShadow = rTip.castShadow = true;
    leftArm.add(lTip);
    rightArm.add(rTip);

    // Upper work platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.6, 1, baseSize * 1.0), dark);
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    // Decorative fueling arm
    const fuelRoot = new THREE.Group();
    fuelRoot.position.set(baseSize * 0.6, height * 0.35, 0);
    this.group.add(fuelRoot);
    const fuelArm = new THREE.Mesh(new THREE.BoxGeometry(armLength * 0.6, armThickness * 0.7, armThickness * 0.7), steel);
    fuelArm.position.x = armLength * 0.3;
    fuelArm.castShadow = fuelArm.receiveShadow = true;
    fuelRoot.add(fuelArm);

    this.anim = { leftHinge: leftRoot, rightHinge: rightRoot, carriage };
    this._applyOpenAmount(1);  // start opened
  }

  // ---------- BUILDERS ----------

  _buildMast({ height, baseSize, steel }) {
    const mast = new THREE.Group();
    mast.name = "mast";

    // Corner posts
    const postGeo = new THREE.BoxGeometry(0.6, height, 0.6);
    [[+1, +1], [-1, +1], [-1, -1], [+1, -1]].forEach(([sx, sz]) => {
      const m = new THREE.Mesh(postGeo, steel);
      m.position.set((baseSize / 2 - 0.7) * sx, height / 2, (baseSize / 2 - 0.7) * sz);
      m.castShadow = m.receiveShadow = true;
      mast.add(m);
    });

    // Horizontal rings + diagonals
    const step = 3;
    const levels = Math.floor(height / step);
    const beamX = new THREE.BoxGeometry(baseSize - 1.4, 0.4, 0.4);
    const beamZ = new THREE.BoxGeometry(0.4, 0.4, baseSize - 1.4);

    for (let i = 1; i <= levels; i++) {
      const y = i * step;
      const bx1 = new THREE.Mesh(beamX, steel); bx1.position.set(0, y,  baseSize / 2 - 0.7);
      const bx2 = new THREE.Mesh(beamX, steel); bx2.position.set(0, y, -baseSize / 2 + 0.7);
      const bz1 = new THREE.Mesh(beamZ, steel); bz1.position.set( baseSize / 2 - 0.7, y, 0);
      const bz2 = new THREE.Mesh(beamZ, steel); bz2.position.set(-baseSize / 2 + 0.7, y, 0);
      [bx1, bx2, bz1, bz2].forEach(b => { b.castShadow = b.receiveShadow = true; mast.add(b); });

      // Face diagonals
      const diagW = baseSize - 1.6;
      const diag = new THREE.Mesh(new THREE.BoxGeometry(diagW, 0.3, 0.3), steel);
      diag.position.set(0, y - step / 2,  baseSize / 2 - 0.7);
      diag.rotation.z = Math.PI / 4;
      const diag2 = diag.clone(); diag2.position.z *= -1; diag2.rotation.z *= -1;
      mast.add(diag, diag2);
    }
    return mast;
  }

  // Box-truss arm: four chords + cross webs, lengthwise along +Z
  _buildBoxTrussArm(length, width, bar, mat) {
    const arm = new THREE.Group();

    // Four corner chords
    const half = width / 2;
    const chordGeo = new THREE.BoxGeometry(bar, bar, length);
    const chordZ = length / 2;

    const corners = [
      [+half, +half], // +x +y
      [-half, +half], // -x +y
      [-half, -half], // -x -y
      [+half, -half]  // +x -y
    ];

    const chords = corners.map(([x, y]) => {
      const m = new THREE.Mesh(chordGeo, mat);
      m.position.set(x, y, chordZ);
      m.castShadow = m.receiveShadow = true;
      arm.add(m);
      return m;
    });

    // Side rails (to close the box edges)
    const railLen = length;
    const railGeoX = new THREE.BoxGeometry(width, bar * 0.8, bar * 0.9);
    const railGeoY = new THREE.BoxGeometry(bar * 0.9, width, bar * 0.8);

    // Front and back frames
    const frameZ0 = bar * 0.6;
    const frameZ1 = length - bar * 0.6;

    const frame0x = new THREE.Mesh(railGeoX, mat); frame0x.position.set(0, +half, frameZ0);
    const frame0x2 = new THREE.Mesh(railGeoX, mat); frame0x2.position.set(0, -half, frameZ0);
    const frame0y = new THREE.Mesh(railGeoY, mat); frame0y.position.set(+half, 0, frameZ0);
    const frame0y2= new THREE.Mesh(railGeoY, mat); frame0y2.position.set(-half, 0, frameZ0);
    const frame1x = frame0x.clone(); frame1x.position.z = frameZ1;
    const frame1x2= frame0x2.clone(); frame1x2.position.z = frameZ1;
    const frame1y = frame0y.clone(); frame1y.position.z = frameZ1;
    const frame1y2= frame0y2.clone(); frame1y2.position.z = frameZ1;

    [frame0x, frame0x2, frame0y, frame0y2, frame1x, frame1x2, frame1y, frame1y2].forEach(f => {
      f.castShadow = f.receiveShadow = true; arm.add(f);
    });

    // Web diagonals along the length on each face
    const seg = Math.max(5, Math.floor(length / 2.2));
    for (let i = 0; i < seg; i++) {
      const z0 = (i + 0.15) * (length / seg);
      const z1 = z0 + (length / seg) * 0.8;

      // Top face (+y) diagonals
      arm.add(this._diagBar(mat, bar * 0.7, [ -half, +half, z0 ], [ +half, +half, z1 ]));
      arm.add(this._diagBar(mat, bar * 0.7, [ +half, +half, z0 ], [ -half, +half, z1 ]));

      // Bottom face (-y)
      arm.add(this._diagBar(mat, bar * 0.7, [ -half, -half, z0 ], [ +half, -half, z1 ]));
      arm.add(this._diagBar(mat, bar * 0.7, [ +half, -half, z0 ], [ -half, -half, z1 ]));

      // Right face (+x)
      arm.add(this._diagBar(mat, bar * 0.7, [ +half, -half, z0 ], [ +half, +half, z1 ]));
      arm.add(this._diagBar(mat, bar * 0.7, [ +half, +half, z0 ], [ +half, -half, z1 ]));

      // Left face (-x)
      arm.add(this._diagBar(mat, bar * 0.7, [ -half, -half, z0 ], [ -half, +half, z1 ]));
      arm.add(this._diagBar(mat, bar * 0.7, [ -half, +half, z0 ], [ -half, -half, z1 ]));
    }

    return arm;
  }

  _diagBar(mat, size, a, b) {
    const ax = new THREE.Vector3(...a), bx = new THREE.Vector3(...b);
    const mid = new THREE.Vector3().addVectors(ax, bx).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(bx, ax);
    const len = dir.length();
    const geo = new THREE.BoxGeometry(size, size, len);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(mid);
    // orient along dir
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    m.setRotationFromQuaternion(q);
    m.castShadow = m.receiveShadow = true;
    return m;
  }

  // ---------- ANIMATION ----------

  _applyOpenAmount(t) {
    const maxAngle = THREE.MathUtils.degToRad(this.params.maxOpenDeg);

    // Determine sign from hinge X so they ALWAYS open outwards:
    // left hinge (x<0) rotates +max; right hinge (x>0) rotates -max
    const setHinge = (hinge) => {
      const sign = Math.sign(hinge.position.x) || 1;
      hinge.rotation.y = THREE.MathUtils.lerp(0, -sign * maxAngle, t);
    };
    setHinge(this.anim.leftHinge);
    setHinge(this.anim.rightHinge);
  }

  setOpenAmount(t) { this.state.targetOpen = THREE.MathUtils.clamp(t, 0, 1); }
  open()  { this.setOpenAmount(1); }
  close() { this.setOpenAmount(0); }
  toggle(){ this.setOpenAmount(this.state.targetOpen < 0.5 ? 1 : 0); }

  setCatcherHeight(y) { this.state.targetArmHeight = y; }

  update(dt) {
    const k = 8;
    this.state.open += (this.state.targetOpen - this.state.open) * Math.min(1, k * dt);
    this._applyOpenAmount(this.state.open);

    this.state.armHeight += (this.state.targetArmHeight - this.state.armHeight) * Math.min(1, k * dt);
    this.carriage.position.y = this.state.armHeight;
  }
}