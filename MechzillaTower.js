// MechzillaTower.js — 15x15 mast, SQUARE carriage brace (front-mounted hinges), straight truss arms
// three r128

export class MechzillaTower {
  constructor({
    height = 75,
    baseSize = 15,            // mast footprint (15x15)
    // Mast beam sizes
    post = 1.2,
    ring = 0.8,
    // Carriage brace
    braceDepth = 2.6,         // Z depth of the square brace box
    braceWall  = 1.0,         // thickness of brace beams
    // Chopsticks (straight truss)
    armLength = 28,
    armWidth  = 3.0,
    armDepth  = 2.4,
    chord     = 0.5,
    brace     = 0.32,
    panelStep = 2.4,
    tipLen    = 3.0,
    maxOpenDeg = 62,
    position = new THREE.Vector3(0, 0, -18)
  } = {}) {

    this.params = {
      height, baseSize, post, ring, braceDepth, braceWall,
      armLength, armWidth, armDepth, chord, brace, panelStep, tipLen, maxOpenDeg
    };

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.state = {
      open: 1, targetOpen: 1,
      armHeight: height * 0.55, targetArmHeight: height * 0.55
    };

    const steel = new THREE.MeshStandardMaterial({ color: 0x1a1d20, metalness: 0.9, roughness: 0.38 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0d0f11, metalness: 0.6, roughness: 0.5 });

    // --- Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.25, 2.2, baseSize * 1.25), dark);
    base.position.y = 1.1; base.receiveShadow = true;
    this.group.add(base);

    // --- Mast 15×15 (solid-beam style)
    const mast = this._buildSolidMast(steel);
    this.group.add(mast);

    // --- Square carriage brace that wraps the mast
    const carriage = this._buildSquareBrace(steel);
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    // Hinge roots go on the **front face** of the square brace (z = +braceDepth/2)
    const outer = this._braceOuter();                 // outer width of brace (matches mast + wall*2)
    const hingeZ = this.params.braceDepth / 2;        // front face
    const hingeX = (outer / 2) - this.params.braceWall / 2;

    const leftRoot  = new THREE.Group();  leftRoot.position.set(-hingeX, 0, hingeZ);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeX, 0, hingeZ);
    carriage.add(leftRoot, rightRoot);

    // STRAIGHT truss chopsticks (along +Z)
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

  // ===== helpers =====
  _braceOuter() {
    const { baseSize, post, braceWall } = this.params;
    // Mast outer ≈ baseSize - small margin; brace wraps around with wall on each side
    const mastOuter = baseSize - post * 0.8;
    return mastOuter + braceWall * 2;
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

  // Square “wrap” brace (four beams making a rectangular tube; no circles)
  _buildSquareBrace(mat) {
    const { braceDepth, braceWall } = this.params;
    const outer = this._braceOuter();
    const halfO = outer / 2;
    const c = new THREE.Group(); c.name = 'carriage';

    // Build a rectangular tube with four beams (front & back frames connected by short webs)
    // Front frame (z = +braceDepth/2)
    const beamX = new THREE.BoxGeometry(outer, braceWall, braceDepth);
    const beamY = new THREE.BoxGeometry(braceWall, outer, braceDepth);

    const topF = new THREE.Mesh(beamX, mat); topF.position.set(0, +halfO, 0);
    const botF = new THREE.Mesh(beamX, mat); botF.position.set(0, -halfO, 0);
    const leftF= new THREE.Mesh(beamY, mat); leftF.position.set(-halfO, 0, 0);
    const rightF=new THREE.Mesh(beamY, mat); rightF.position.set(+halfO, 0, 0);
    [topF,botF,leftF,rightF].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    // Back frame (thin links so it looks boxy)
    const linkDepth = Math.max(0.6, braceDepth * 0.45);
    const linkX = new THREE.Mesh(new THREE.BoxGeometry(outer, braceWall, linkDepth), mat);
    const linkY = new THREE.Mesh(new THREE.BoxGeometry(braceWall, outer, linkDepth), mat);

    const topB = linkX.clone();  topB.position.set(0, +halfO, -braceDepth/2 + linkDepth/2);
    const botB = linkX.clone();  botB.position.set(0, -halfO, -braceDepth/2 + linkDepth/2);
    const leftB= linkY.clone(); leftB.position.set(-halfO, 0, -braceDepth/2 + linkDepth/2);
    const rightB=linkY.clone(); rightB.position.set(+halfO, 0, -braceDepth/2 + linkDepth/2);
    [topB,botB,leftB,rightB].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    // Cross-webs (short struts) between front/back at the corners for solidity
    const strut = new THREE.BoxGeometry(braceWall * 0.9, braceWall * 0.9, braceDepth - linkDepth);
    const s1 = new THREE.Mesh(strut, mat); s1.position.set(+halfO - braceWall/2, +halfO - braceWall/2, -linkDepth/2);
    const s2 = s1.clone(); s2.position.x *= -1;
    const s3 = s1.clone(); s3.position.y *= -1;
    const s4 = s2.clone(); s4.position.y *= -1;
    [s1,s2,s3,s4].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

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
      const sign = Math.sign(hinge.position.x) || 1;    // left -, right +
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