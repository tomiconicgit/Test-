// MechzillaTower.js — 15x15 mast, solid carriage, STRAIGHT truss chopsticks (three r128)

export class MechzillaTower {
  constructor({
    height = 75,
    baseSize = 15,            // mast footprint
    // Mast beam sizes
    post = 1.2,
    ring = 0.8,
    // Chopstick straight beam
    armLength = 28,
    armWidth  = 3.0,          // box-truss width
    armDepth  = 2.4,          // box-truss depth
    chord     = 0.5,          // corner chord thickness
    brace     = 0.32,         // X-brace thickness
    panelStep = 2.4,          // panel spacing
    tipLen    = 3.0,          // end pad length
    maxOpenDeg = 62,
    position = new THREE.Vector3(0, 0, -18)
  } = {}) {

    this.params = { height, baseSize, post, ring, armLength, armWidth, armDepth, chord, brace, panelStep, tipLen, maxOpenDeg };

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.state = {
      open: 1, targetOpen: 1,
      armHeight: height * 0.55, targetArmHeight: height * 0.55
    };

    const steel = new THREE.MeshStandardMaterial({ color: 0x1a1d20, metalness: 0.9, roughness: 0.38 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0d0f11, metalness: 0.6, roughness: 0.5 });

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.25, 2.2, baseSize * 1.25), dark);
    base.position.y = 1.1; base.receiveShadow = true;
    this.group.add(base);

    // Mast 15x15
    const mast = this._buildSolidMast(steel);
    this.group.add(mast);

    // Solid carriage
    const carriage = this._buildCarriage(steel);
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    // Hinges
    const hingeOffset = baseSize * 0.60;
    const leftRoot  = new THREE.Group();  leftRoot.position.set(-hingeOffset, 0, 0);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeOffset, 0, 0);
    carriage.add(leftRoot, rightRoot);

    // STRAIGHT truss chopsticks (built along +Z)
    const leftArm  = this._buildStraightTrussArm(steel);
    const rightArm = this._buildStraightTrussArm(steel);
    leftRoot.add(leftArm); rightRoot.add(rightArm);

    // Tips
    const tipGeo = new THREE.BoxGeometry(this.params.armWidth * 0.9, this.params.armDepth * 0.6, this.params.tipLen);
    const lTip = new THREE.Mesh(tipGeo, steel);
    const rTip = new THREE.Mesh(tipGeo, steel);
    lTip.position.z = this.params.armLength + this.params.tipLen * 0.5;
    rTip.position.z = this.params.armLength + this.params.tipLen * 0.5;
    lTip.castShadow = rTip.castShadow = true;
    leftArm.add(lTip); rightArm.add(rTip);

    // Platform (decorative)
    const platform = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.0, 1.2, baseSize * 0.9), dark);
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    this.anim = { leftHinge: leftRoot, rightHinge: rightRoot, carriage };
    this._applyOpenAmount(1);
  }

  // ===== BUILDERS =====
  _buildSolidMast(mat) {
    const { height, baseSize, post, ring } = this.params;
    const g = new THREE.Group(); g.name = 'mast';
    const half = baseSize/2 - post*0.6;

    const postGeo = new THREE.BoxGeometry(post, height, post);
    [[+1,+1],[-1,+1],[-1,-1],[+1,-1]].forEach(([sx,sz])=>{
      const m = new THREE.Mesh(postGeo, mat);
      m.position.set(half*sx, height/2, half*sz);
      m.castShadow = m.receiveShadow = true; g.add(m);
    });

    const step=3, levels=Math.floor(height/step);
    const bx = new THREE.BoxGeometry(baseSize - post*1.6, ring, ring);
    const bz = new THREE.BoxGeometry(ring, ring, baseSize - post*1.6);
    for(let i=1;i<=levels;i++){
      const y=i*step;
      const bx1=new THREE.Mesh(bx,mat); bx1.position.set(0,y,  half);
      const bx2=new THREE.Mesh(bx,mat); bx2.position.set(0,y, -half);
      const bz1=new THREE.Mesh(bz,mat); bz1.position.set( half,y,0);
      const bz2=new THREE.Mesh(bz,mat); bz2.position.set(-half,y,0);
      [bx1,bx2,bz1,bz2].forEach(b=>{ b.castShadow=b.receiveShadow=true; g.add(b); });

      const diagW = baseSize - post*1.8;
      const d = new THREE.Mesh(new THREE.BoxGeometry(diagW, ring*0.9, ring*0.9), mat);
      d.position.set(0, y - step/2, half); d.rotation.z = Math.PI/4;
      const d2 = d.clone(); d2.position.z *= -1; d2.rotation.z *= -1;
      g.add(d, d2);
    }
    return g;
  }

  _buildCarriage(mat) {
    const { baseSize, ring } = this.params;
    const c = new THREE.Group(); c.name = 'carriage';

    const plateW = baseSize * 0.5;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, 2.2, ring*3.0), mat);
    const pL = plate.clone(); pL.position.set(-baseSize*0.45, 0, 0);
    const pR = plate.clone(); pR.position.set( baseSize*0.45, 0, 0);
    [pL,pR].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    const xBeam = new THREE.Mesh(new THREE.BoxGeometry(baseSize*1.2, 2.0, ring*2.2), mat);
    xBeam.position.set(0, 0, 0);
    xBeam.castShadow = xBeam.receiveShadow = true;
    c.add(xBeam);

    const ringVis = new THREE.Mesh(new THREE.TorusGeometry(baseSize*0.66, 0.22, 10, 28), mat);
    ringVis.rotation.x = Math.PI/2; ringVis.position.z = -ring*1.1;
    ringVis.castShadow = ringVis.receiveShadow = true;
    c.add(ringVis);

    return c;
  }

  // STRAIGHT mast-style box truss pointing +Z
  _buildStraightTrussArm(mat) {
    const { armLength: L, armWidth: W, armDepth: D, chord: C, brace: B, panelStep: S } = this.params;
    const arm = new THREE.Group();

    // Four chords
    const chordGeo = new THREE.BoxGeometry(C, C, L);
    const zMid = L/2, px = (W/2 - C/2), py = (D/2 - C/2);
    [[+px,+py],[-px,+py],[-px,-py],[+px,-py]].forEach(([x,y])=>{
      const m = new THREE.Mesh(chordGeo, mat);
      m.position.set(x,y,zMid);
      m.castShadow = m.receiveShadow = true;
      arm.add(m);
    });

    // Frames every S
    const rings = Math.max(2, Math.floor(L / S));
    const frameX = new THREE.BoxGeometry(W, C*0.9, C*0.9);
    const frameY = new THREE.BoxGeometry(C*0.9, D, C*0.9);
    for (let i=0;i<=rings;i++){
      const z = (i / rings) * L;
      const fx1=new THREE.Mesh(frameX,mat); fx1.position.set(0, +py + (C/2 - C*0.45), z);
      const fx2=new THREE.Mesh(frameX,mat); fx2.position.set(0, -py - (C/2 - C*0.45), z);
      const fy1=new THREE.Mesh(frameY,mat); fy1.position.set(+px + (C/2 - C*0.45), 0, z);
      const fy2=new THREE.Mesh(frameY,mat); fy2.position.set(-px - (C/2 - C*0.45), 0, z);
      [fx1,fx2,fy1,fy2].forEach(f=>{ f.castShadow=f.receiveShadow=true; arm.add(f); });
    }

    // X-bracing per panel (top/bottom + left/right)
    const braceBar = (a,b)=>{
      const A=new THREE.Vector3(...a), Bv=new THREE.Vector3(...b);
      const mid=new THREE.Vector3().addVectors(A,Bv).multiplyScalar(0.5);
      const dir=new THREE.Vector3().subVectors(Bv,A); const len=dir.length();
      const g=new THREE.BoxGeometry(B,B,len); const m=new THREE.Mesh(g,mat);
      m.position.copy(mid);
      m.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,0,1), dir.clone().normalize()
      ));
      m.castShadow=m.receiveShadow=true; arm.add(m);
    };
    for (let i=0;i<rings;i++){
      const z0 = (i   / rings) * L + C*0.7;
      const z1 = ((i+1)/rings) * L - C*0.7;
      braceBar([-px,+py,z0],[+px,+py,z1]); braceBar([+px,+py,z0],[-px,+py,z1]);
      braceBar([-px,-py,z0],[+px,-py,z1]); braceBar([+px,-py,z0],[-px,-py,z1]);
      braceBar([+px,-py,z0],[+px,+py,z1]); braceBar([+px,+py,z0],[+px,-py,z1]);
      braceBar([-px,-py,z0],[-px,+py,z1]); braceBar([-px,+py,z0],[-px,-py,z1]);
    }

    return arm;
  }

  // ===== ANIMATION =====
  _applyOpenAmount(t) {
    const max = THREE.MathUtils.degToRad(this.params.maxOpenDeg);
    const set = (hinge) => {
      const sign = Math.sign(hinge.position.x) || 1; // left -, right +
      hinge.rotation.y = THREE.MathUtils.lerp(0, -sign * max, t); // OUTWARDS only
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