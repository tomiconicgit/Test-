// MechzillaTower.js (three r128 compatible)
export class MechzillaTower {
  constructor({
    height = 75,          // total mast height
    baseSize = 6,         // mast footprint
    armLength = 24,       // length of each chopstick arm
    armThickness = 0.6,   // thickness of truss arms
    position = new THREE.Vector3(0, 0, -18)
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.state = {
      open: 1,            // 1=open, 0=closed (grabbing)
      targetOpen: 1,
      armHeight: height * 0.55, // vertical slider for catcher carriage
      targetArmHeight: height * 0.55
    };

    // Materials
    const steel = new THREE.MeshStandardMaterial({
      color: 0x202326, metalness: 0.9, roughness: 0.35
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x0f1113, metalness: 0.6, roughness: 0.5
    });

    // --- Base block
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize * 1.2, 2, baseSize * 1.2),
      dark
    );
    base.position.y = 1;
    base.receiveShadow = true;
    this.group.add(base);

    // --- Procedural lattice mast
    const mast = this._buildMast({ height, baseSize, steel });
    this.group.add(mast);

    // --- Catcher carriage that slides up/down the mast
    const carriage = new THREE.Group();
    carriage.name = "carriage";
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    // carriage ring (visual)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(baseSize * 0.62, 0.15, 8, 24),
      steel
    );
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = ring.receiveShadow = true;
    carriage.add(ring);

    // --- Chopstick arms (left/right) — hinge at carriage sides
    const hingeDist = baseSize * 0.55;

    // Left arm root
    const leftRoot = new THREE.Group();
    leftRoot.position.set(-hingeDist, 0, 0);
    carriage.add(leftRoot);

    // Right arm root
    const rightRoot = new THREE.Group();
    rightRoot.position.set(hingeDist, 0, 0);
    carriage.add(rightRoot);

    // Build truss arm for each side
    const leftArm = this._buildTrussArm(armLength, armThickness, steel);
    const rightArm = this._buildTrussArm(armLength, armThickness, steel);
    // Pivot so they rotate toward rocket (in +Z direction by default)
    leftArm.position.set(0, 0, 0);
    rightArm.position.set(0, 0, 0);
    leftRoot.add(leftArm);
    rightRoot.add(rightArm);
    this.leftRoot = leftRoot;
    this.rightRoot = rightRoot;

    // Add small clamp “fingers” at the tips
    const fingerLen = 3;
    const fingerGeo = new THREE.BoxGeometry(armThickness * 0.6, armThickness * 0.6, fingerLen);
    const lFinger = new THREE.Mesh(fingerGeo, steel);
    const rFinger = new THREE.Mesh(fingerGeo, steel);
    lFinger.position.set(0, 0, armLength + fingerLen * 0.5);
    rFinger.position.set(0, 0, armLength + fingerLen * 0.5);
    leftArm.add(lFinger);
    rightArm.add(rFinger);
    lFinger.castShadow = rFinger.castShadow = true;

    // --- Upper work platform (simple)
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize * 1.6, 1, baseSize * 1.0),
      dark
    );
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    // --- Simple fueling arm at mid height (decorative)
    const fuelRoot = new THREE.Group();
    fuelRoot.position.set(baseSize * 0.6, height * 0.35, 0);
    this.group.add(fuelRoot);
    const fuelArm = new THREE.Mesh(
      new THREE.BoxGeometry(armLength * 0.6, armThickness, armThickness),
      steel
    );
    fuelArm.position.x = armLength * 0.3;
    fuelRoot.add(fuelArm);

    // Store animated parts
    this.anim = {
      leftHinge: leftRoot,   // rotates about Y
      rightHinge: rightRoot, // rotates about Y
      carriage: carriage
    };

    // Initial open pose
    this._applyOpenAmount(1);
  }

  // Build a tall lattice using instanced diagonal braces + posts
  _buildMast({ height, baseSize, steel }) {
    const mast = new THREE.Group();
    mast.name = "mast";

    // Four corner posts
    const post = new THREE.BoxGeometry(0.5, height, 0.5);
    const postMat = steel;
    const corners = [
      [+1, +1], [-1, +1], [-1, -1], [+1, -1]
    ];
    corners.forEach(([sx, sz]) => {
      const m = new THREE.Mesh(post, postMat);
      m.position.set((baseSize / 2 - 0.6) * sx, height / 2, (baseSize / 2 - 0.6) * sz);
      m.castShadow = m.receiveShadow = true;
      mast.add(m);
    });

    // Horizontal rings every “step”
    const step = 3;
    const levels = Math.floor(height / step);
    const beamGeo = new THREE.BoxGeometry(baseSize - 1.2, 0.35, 0.35);
    const beamGeoZ = new THREE.BoxGeometry(0.35, 0.35, baseSize - 1.2);

    for (let i = 1; i <= levels; i++) {
      const y = i * step;
      const bx1 = new THREE.Mesh(beamGeo, steel);
      const bx2 = new THREE.Mesh(beamGeo, steel);
      const bz1 = new THREE.Mesh(beamGeoZ, steel);
      const bz2 = new THREE.Mesh(beamGeoZ, steel);
      bx1.position.set(0, y, baseSize / 2 - 0.6);
      bx2.position.set(0, y, -baseSize / 2 + 0.6);
      bz1.position.set(baseSize / 2 - 0.6, y, 0);
      bz2.position.set(-baseSize / 2 + 0.6, y, 0);
      [bx1, bx2, bz1, bz2].forEach(b => { b.castShadow = b.receiveShadow = true; mast.add(b); });

      // Simple diagonal braces (visual)
      const diag = new THREE.Mesh(new THREE.BoxGeometry(baseSize - 1.4, 0.25, 0.25), steel);
      diag.position.set(0, y - step / 2, baseSize / 2 - 0.6);
      diag.rotation.z = Math.PI / 4;
      const diag2 = diag.clone(); diag2.position.z *= -1; diag2.rotation.z *= -1;
      mast.add(diag, diag2);
    }

    return mast;
  }

  _buildTrussArm(length, thickness, mat) {
    const arm = new THREE.Group();

    // Main spine
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, thickness, length),
      mat
    );
    spine.position.z = length / 2;
    spine.castShadow = spine.receiveShadow = true;
    arm.add(spine);

    // Top and bottom chords
    const chordOfs = thickness * 0.9;
    const top = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), mat);
    top.position.set(0, chordOfs, length / 2);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), mat);
    bot.position.set(0, -chordOfs, length / 2);
    [top, bot].forEach(m => { m.castShadow = m.receiveShadow = true; arm.add(m); });

    // Web members (simple repeating diagonals)
    const seg = Math.max(4, Math.floor(length / 2));
    const webGeo = new THREE.BoxGeometry(thickness * 0.5, thickness * 0.5, 2);
    for (let i = 0; i < seg; i++) {
      const z = (i + 0.5) * (length / seg);
      const w1 = new THREE.Mesh(webGeo, mat);
      const w2 = new THREE.Mesh(webGeo, mat);
      w1.position.set(0, 0.0, z);
      w2.position.set(0, 0.0, z + 0.8);
      w1.rotation.x = Math.PI / 4;
      w2.rotation.x = -Math.PI / 4;
      arm.add(w1, w2);
    }
    return arm;
  }

  /** Set arms open amount 0..1 (0=closed/grab, 1=fully open) */
  _applyOpenAmount(t) {
    const maxAngle = THREE.MathUtils.degToRad(55); // how wide the arms open
    // Rotate around Y so arms swing toward +Z (rocket position)
    this.anim.leftHinge.rotation.y = THREE.MathUtils.lerp(0,  maxAngle, t);
    this.anim.rightHinge.rotation.y = THREE.MathUtils.lerp(0, -maxAngle, t);
  }

  /** Public API */
  setOpenAmount(t) { this.state.targetOpen = THREE.MathUtils.clamp(t, 0, 1); }
  open() { this.setOpenAmount(1); }
  close() { this.setOpenAmount(0); }
  toggle() { this.setOpenAmount(this.state.targetOpen < 0.5 ? 1 : 0); }

  setCatcherHeight(y) { this.state.targetArmHeight = y; }

  /** Call every frame with deltaTime */
  update(dt) {
    // Smoothly lerp open/height
    const k = 8; // responsiveness
    this.state.open += (this.state.targetOpen - this.state.open) * Math.min(1, k * dt);
    this._applyOpenAmount(this.state.open);

    this.state.armHeight += (this.state.targetArmHeight - this.state.armHeight) * Math.min(1, k * dt);
    this.anim.carriage.position.y = this.state.armHeight;
  }
}
