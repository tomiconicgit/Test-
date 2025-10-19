// MechzillaTower.js — mast-style truss chopsticks (three r128)

export class MechzillaTower {
  constructor({
    height = 75,
    baseSize = 6,
    // Chopstick shape
    armLength = 26,
    armWidth  = 3.0,   // box width  (matches mast visual bulk)
    armDepth  = 2.2,   // box depth
    postSize  = 0.45,  // chord/post thickness
    ringSize  = 0.35,  // ring beam thickness
    braceSize = 0.28,  // X-brace thickness
    panelStep = 2.4,   // panel height for ring/X spacing
    position = new THREE.Vector3(0, 0, -18),
    maxOpenDeg = 62
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.params = { height, baseSize, armLength, armWidth, armDepth, postSize, ringSize, braceSize, panelStep, maxOpenDeg };

    this.state = {
      open: 1, targetOpen: 1,
      armHeight: height * 0.55, targetArmHeight: height * 0.55
    };

    // Materials
    const steel = new THREE.MeshStandardMaterial({ color: 0x1a1d20, metalness: 0.9, roughness: 0.38 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0d0f11, metalness: 0.6, roughness: 0.5 });

    // --- Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.2, 2, baseSize * 1.2), dark);
    base.position.y = 1; base.receiveShadow = true;
    this.group.add(base);

    // --- Mast (same language as before)
    const mast = this._buildMast({ height, baseSize, steel });
    this.group.add(mast);

    // --- Sliding carriage
    const carriage = new THREE.Group();
    carriage.name = "carriage";
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(baseSize * 0.62, 0.18, 8, 24), steel);
    ring.rotation.x = Math.PI / 2; ring.castShadow = ring.receiveShadow = true;
    carriage.add(ring);

    // --- Chopsticks (mast-style truss boxes)
    const hingeDist = baseSize * 0.55;
    const leftRoot  = new THREE.Group();  leftRoot.position.set(-hingeDist, 0, 0);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeDist, 0, 0);
    carriage.add(leftRoot, rightRoot);

    const leftArm  = this._buildMastStyleArm(steel);
    const rightArm = this._buildMastStyleArm(steel);
    leftRoot.add(leftArm);
    rightRoot.add(rightArm);

    // Grip pads (flat ends)
    const tipLen = 3.0;
    const tipGeo = new THREE.BoxGeometry(this.params.armWidth * 0.9, this.params.armDepth * 0.6, tipLen);
    const lTip = new THREE.Mesh(tipGeo, steel);
    const rTip = new THREE.Mesh(tipGeo, steel);
    lTip.position.z = this.params.armLength + tipLen * 0.5;
    rTip.position.z = this.params.armLength + tipLen * 0.5;
    lTip.castShadow = rTip.castShadow = true;
    leftArm.add(lTip); rightArm.add(rTip);

    // Upper service platform (decorative)
    const platform = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.6, 1, baseSize * 1.0), dark);
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    // Simple fueling boom (decorative)
    const fuelRoot = new THREE.Group();
    fuelRoot.position.set(baseSize * 0.6, height * 0.35, 0);
    const fuelArm = new THREE.Mesh(new THREE.BoxGeometry(armLength * 0.6, 0.5, 0.5), steel);
    fuelArm.position.x = armLength * 0.3; fuelArm.castShadow = fuelArm.receiveShadow = true;
    fuelRoot.add(fuelArm); this.group.add(fuelRoot);

    this.anim = { leftHinge: leftRoot, rightHinge: rightRoot, carriage };
    this._applyOpenAmount(1);
  }

  // ---------- BUILDERS ----------

  _buildMast({ height, baseSize, steel }) {
    const mast = new THREE.Group(); mast.name = "mast";
    const postGeo = new THREE.BoxGeometry(0.6, height, 0.6);
    [[+1,+1],[-1,+1],[-1,-1],[+1,-1]].forEach(([sx,sz])=>{
      const m = new THREE.Mesh(postGeo, steel);
      m.position.set((baseSize/2-0.7)*sx, height/2, (baseSize/2-0.7)*sz);
      m.castShadow = m.receiveShadow = true; mast.add(m);
    });

    const step=3, levels=Math.floor(height/step);
    const beamX = new THREE.BoxGeometry(baseSize-1.4, 0.4, 0.4);
    const beamZ = new THREE.BoxGeometry(0.4, 0.4, baseSize-1.4);
    for(let i=1;i<=levels;i++){
      const y=i*step;
      const bx1=new THREE.Mesh(beamX,steel); bx1.position.set(0,y,  baseSize/2-0.7);
      const bx2=new THREE.Mesh(beamX,steel); bx2.position.set(0,y, -baseSize/2+0.7);
      const bz1=new THREE.Mesh(beamZ,steel); bz1.position.set( baseSize/2-0.7,y,0);
      const bz2=new THREE.Mesh(beamZ,steel); bz2.position.set(-baseSize/2+0.7,y,0);
      [bx1,bx2,bz1,bz2].forEach(b=>{ b.castShadow=b.receiveShadow=true; mast.add(b); });

      const diag = new THREE.Mesh(new THREE.BoxGeometry(baseSize-1.6, 0.3, 0.3), steel);
      diag.position.set(0, y - step/2,  baseSize/2 - 0.7); diag.rotation.z = Math.PI/4;
      const diag2 = diag.clone(); diag2.position.z *= -1; diag2.rotation.z *= -1;
      mast.add(diag, diag2);
    }
    return mast;
  }

  // Build a rectangular arm with the SAME language as the mast: four posts + rings + X-bracing.
  _buildMastStyleArm(mat) {
    const {
      armLength: L, armWidth: W, armDepth: D,
      postSize: P, ringSize: R, braceSize: B, panelStep: S
    } = this.params;

    const arm = new THREE.Group();

    // Corner posts (four chords)
    const chordGeo = new THREE.BoxGeometry(P, P, L);
    const zMid = L / 2;
    const px = (W/2 - P/2), py = (D/2 - P/2);
    const corners = [
      [+px, +py], [-px, +py], [-px, -py], [+px, -py]
    ];
    corners.forEach(([x,y])=>{
      const m = new THREE.Mesh(chordGeo, mat);
      m.position.set(x, y, zMid);
      m.castShadow = m.receiveShadow = true;
      arm.add(m);
    });

    // Ring frames every S units
    const rings = Math.max(2, Math.floor(L / S));
    const frameX = new THREE.BoxGeometry(W, R, R);
    const frameY = new THREE.BoxGeometry(R, D, R);
    for (let i=0;i<=rings;i++){
      const z = (i / rings) * L;
      const fx1 = new THREE.Mesh(frameX, mat); fx1.position.set(0, +py + (P/2 - R/2), z);
      const fx2 = new THREE.Mesh(frameX, mat); fx2.position.set(0, -py - (P/2 - R/2), z);
      const fy1 = new THREE.Mesh(frameY, mat); fy1.position.set(+px + (P/2 - R/2), 0, z);
      const fy2 = new THREE.Mesh(frameY, mat); fy2.position.set(-px - (P/2 - R/2), 0, z);
      [fx1,fx2,fy1,fy2].forEach(f=>{ f.castShadow=f.receiveShadow=true; arm.add(f); });
    }

    // X-bracing on all four faces per panel
    const brace = (a,b)=>{
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
      const mid = new THREE.Vector3().addVectors(A,Bv).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(Bv,A);
      const len = dir.length();
      const g = new THREE.BoxGeometry(B, B, len);
      const m = new THREE.Mesh(g, mat);
      m.position.copy(mid);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize());
      m.setRotationFromQuaternion(q);
      m.castShadow = m.receiveShadow = true;
      arm.add(m);
    };

    for (let i=0;i<rings;i++){
      const z0 = (i   / rings) * L + R*0.6;
      const z1 = ((i+1)/rings) * L - R*0.6;

      // +Z runs outwards from the hinge
      // Top face (y=+py)
      brace([ -px, +py, z0 ], [ +px, +py, z1 ]);
      brace([ +px, +py, z0 ], [ -px, +py, z1 ]);

      // Bottom face (y=-py)
      brace([ -px, -py, z0 ], [ +px, -py, z1 ]);
      brace([ +px, -py, z0 ], [ -px, -py, z1 ]);

      // Right face (x=+px)
      brace([ +px, -py, z0 ], [ +px, +py, z1 ]);
      brace([ +px, +py, z0 ], [ +px, -py, z1 ]);

      // Left face (x=-px)
      brace([ -px, -py, z0 ], [ -px, +py, z1 ]);
      brace([ -px, +py, z0 ], [ -px, -py, z1 ]);
    }

    // Whole arm points +Z
    return arm;
  }

  // ---------- ANIMATION ----------

  _applyOpenAmount(t) {
    const max = THREE.MathUtils.degToRad(this.params.maxOpenDeg);
    const set = (hinge) => {
      const sign = Math.sign(hinge.position.x) || 1;  // left x<0, right x>0
      hinge.rotation.y = THREE.MathUtils.lerp(0, -sign * max, t); // open OUTWARDS
    };
    set(this.anim.leftHinge);
    set(this.anim.rightHinge);
  }

  setOpenAmount(t){ this.state.targetOpen = THREE.MathUtils.clamp(t,0,1); }
  open(){ this.setOpenAmount(1); }
  close(){ this.setOpenAmount(0); }
  toggle(){ this.setOpenAmount(this.state.targetOpen < 0.5 ? 1 : 0); }
  setCatcherHeight(y){ this.state.targetArmHeight = y; }

  update(dt){
    const k = 8;
    this.state.open      += (this.state.targetOpen      - this.state.open)      * Math.min(1, k*dt);
    this.state.armHeight += (this.state.targetArmHeight - this.state.armHeight) * Math.min(1, k*dt);
    this._applyOpenAmount(this.state.open);
    this.carriage.position.y = this.state.armHeight;
  }
}