// MechzillaTower.js — 15×15 mast, square carriage brace, ANGLED 3-segment truss chopsticks
// three.js r128

export class MechzillaTower {
  constructor({
    // Tower
    height = 75,
    baseSize = 15,          // 15×15 footprint
    post = 1.2,             // tower corner post thickness
    ring = 0.8,             // tower ring beam thickness
    // Carriage brace (wraps mast)
    braceDepth = 3.2,       // Z depth of the square brace
    braceWall  = 1.0,       // brace beam thickness
    // Chopsticks (box-truss, 3 segments: out → straight → in)
    seg1 = 12,              // base segment length (angled OUT)
    seg2 = 14,              // mid straight segment length
    seg3 = 10,              // tip segment length (angled IN)
    yaw1Deg = 25,           // base segment yaw outward (+/− mirrored)
    yaw3Deg = -20,          // tip segment yaw inward toward rocket
    armW  = 3.0,            // truss width
    armH  = 2.4,            // truss height
    chord = 0.5,            // corner chord thickness
    brace = 0.32,           // X-brace thickness
    panelStep = 2.4,        // truss panel spacing
    tipLen = 3.0,           // flat pad at end
    // Motion
    maxOpenDeg = 60,        // outward opening angle
    position = new THREE.Vector3(0, 0, -18)
  } = {}) {

    this.params = {
      height, baseSize, post, ring, braceDepth, braceWall,
      seg1, seg2, seg3, yaw1Deg, yaw3Deg, armW, armH, chord, brace, panelStep, tipLen, maxOpenDeg
    };

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.state = {
      open: 1, targetOpen: 1,
      armHeight: height * 0.55, targetArmHeight: height * 0.55
    };

    // Materials
    const steel = new THREE.MeshStandardMaterial({ color: 0x1a1d20, metalness: 0.9, roughness: 0.38 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0d0f11, metalness: 0.6, roughness: 0.5 });

    // Base slab
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.25, 2.2, baseSize * 1.25), dark);
    base.position.y = 1.1; base.receiveShadow = true;
    this.group.add(base);

    // Tower (solid truss)
    const mast = this._buildSolidMast(steel);
    this.group.add(mast);

    // Carriage: square brace that wraps the mast
    const carriage = this._buildSquareBrace(steel);
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    // Hinges mounted on FRONT face of the brace
    const hingeZ = this.params.braceDepth / 2;
    const outer = this._braceOuter();
    const hingeX = (outer / 2) - this.params.braceWall / 2;

    const leftRoot  = new THREE.Group();  leftRoot.position.set(-hingeX, 0, hingeZ);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeX, 0, hingeZ);
    carriage.add(leftRoot, rightRoot);

    // ANGLED 3-segment truss arms (mirrored)
    const leftArm  = this._buildAngledTrussArm(steel, +1);
    const rightArm = this._buildAngledTrussArm(steel, -1);
    leftRoot.add(leftArm); rightRoot.add(rightArm);

    // Decorative top platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.0, 1.2, baseSize * 0.9), dark);
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    this.anim = { leftHinge: leftRoot, rightHinge: rightRoot, carriage };
    this._applyOpenAmount(1);
  }

  // ===== Tower & Carriage =====
  _buildSolidMast(mat) {
    const { height, baseSize, post, ring } = this.params;
    const g = new THREE.Group(); g.name = 'mast';
    const half = baseSize/2 - post*0.6;

    // Posts
    const postGeo = new THREE.BoxGeometry(post, height, post);
    [[+1,+1],[-1,+1],[-1,-1],[+1,-1]].forEach(([sx,sz])=>{
      const m = new THREE.Mesh(postGeo, mat);
      m.position.set(half*sx, height/2, half*sz);
      m.castShadow = m.receiveShadow = true; g.add(m);
    });

    // Rings + chunky diagonals
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

  _braceOuter() {
    const { baseSize, post, braceWall } = this.params;
    const mastOuter = baseSize - post * 0.8;
    return mastOuter + braceWall * 2;
  }

  _buildSquareBrace(mat) {
    const { braceDepth, braceWall } = this.params;
    const outer = this._braceOuter();
    const halfO = outer / 2;
    const c = new THREE.Group(); c.name = 'carriage';

    const beamX = new THREE.BoxGeometry(outer, braceWall, braceDepth);
    const beamY = new THREE.BoxGeometry(braceWall, outer, braceDepth);

    const top = new THREE.Mesh(beamX, mat); top.position.set(0, +halfO, 0);
    const bot = new THREE.Mesh(beamX, mat); bot.position.set(0, -halfO, 0);
    const lft = new THREE.Mesh(beamY, mat); lft.position.set(-halfO, 0, 0);
    const rgt = new THREE.Mesh(beamY, mat); rgt.position.set(+halfO, 0, 0);
    [top,bot,lft,rgt].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    // Back frame links + corner struts
    const linkDepth = Math.max(0.6, braceDepth * 0.45);
    const linkX = new THREE.Mesh(new THREE.BoxGeometry(outer, braceWall, linkDepth), mat);
    const linkY = new THREE.Mesh(new THREE.BoxGeometry(braceWall, outer, linkDepth), mat);

    const topB = linkX.clone();  topB.position.set(0, +halfO, -braceDepth/2 + linkDepth/2);
    const botB = linkX.clone();  botB.position.set(0, -halfO, -braceDepth/2 + linkDepth/2);
    const lftB = linkY.clone();  lftB.position.set(-halfO, 0, -braceDepth/2 + linkDepth/2);
    const rgtB = linkY.clone();  rgtB.position.set(+halfO, 0, -braceDepth/2 + linkDepth/2);
    [topB,botB,lftB,rgtB].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    const strutGeo = new THREE.BoxGeometry(braceWall * 0.9, braceWall * 0.9, braceDepth - linkDepth);
    const s1 = new THREE.Mesh(strutGeo, mat); s1.position.set(+halfO - braceWall/2, +halfO - braceWall/2, -linkDepth/2);
    const s2 = s1.clone(); s2.position.x *= -1;
    const s3 = s1.clone(); s3.position.y *= -1;
    const s4 = s2.clone(); s4.position.y *= -1;
    [s1,s2,s3,s4].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    return c;
  }

  // ===== Truss builders =====
  _buildTrussSegment(len, W, H, C, B, S, mat) {
    // Box-truss pointing +Z, origin at segment start (z=0), length along +Z
    const seg = new THREE.Group();

    // Chords (four corners)
    const chordGeo = new THREE.BoxGeometry(C, C, len);
    const px = (W/2 - C/2), py = (H/2 - C/2), zMid = len/2;
    [[+px,+py],[-px,+py],[-px,-py],[+px,-py]].forEach(([x,y])=>{
      const m = new THREE.Mesh(chordGeo, mat);
      m.position.set(x,y,zMid); m.castShadow = m.receiveShadow = true; seg.add(m);
    });

    // Frames every S
    const rings = Math.max(2, Math.floor(len / S));
    const frameX = new THREE.BoxGeometry(W, C*0.9, C*0.9);
    const frameY = new THREE.BoxGeometry(C*0.9, H, C*0.9);
    for (let i=0;i<=rings;i++){
      const z = (i / rings) * len;
      const fx1=new THREE.Mesh(frameX,mat); fx1.position.set(0, +py + (C/2 - C*0.45), z);
      const fx2=new THREE.Mesh(frameX,mat); fx2.position.set(0, -py - (C/2 - C*0.45), z);
      const fy1=new THREE.Mesh(frameY,mat); fy1.position.set(+px + (C/2 - C*0.45), 0, z);
      const fy2=new THREE.Mesh(frameY,mat); fy2.position.set(-px - (C/2 - C*0.45), 0, z);
      [fx1,fx2,fy1,fy2].forEach(f=>{ f.castShadow=f.receiveShadow=true; seg.add(f); });
    }

    // X braces per panel
    const addBar = (a,b)=>{
      const A=new THREE.Vector3(...a), Bv=new THREE.Vector3(...b);
      const mid=new THREE.Vector3().addVectors(A,Bv).multiplyScalar(0.5);
      const dir=new THREE.Vector3().subVectors(Bv,A); const lenB=dir.length();
      const g=new THREE.BoxGeometry(B,B,lenB); const m=new THREE.Mesh(g,mat);
      m.position.copy(mid);
      m.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,0,1), dir.clone().normalize()
      ));
      m.castShadow=m.receiveShadow=true; seg.add(m);
    };
    for (let i=0;i<rings;i++){
      const z0 = (i   / rings) * len + C*0.7;
      const z1 = ((i+1)/rings) * len - C*0.7;
      addBar([-px,+py,z0],[+px,+py,z1]); addBar([+px,+py,z0],[-px,+py,z1]);
      addBar([-px,-py,z0],[+px,-py,z1]); addBar([+px,-py,z0],[-px,-py,z1]);
      addBar([+px,-py,z0],[+px,+py,z1]); addBar([+px,+py,z0],[+px,-py,z1]);
      addBar([-px,-py,z0],[-px,+py,z1]); addBar([-px,+py,z0],[-px,-py,z1]);
    }

    return seg;
  }

  _buildAngledTrussArm(mat, mirrorSign) {
    const p = this.params;
    const root = new THREE.Group();

    // Segment roots (yaw hinges)
    const h1 = new THREE.Group(); root.add(h1);                           // base (outwards)
    const h2 = new THREE.Group(); h2.position.z = p.seg1; h1.add(h2);     // straight
    const h3 = new THREE.Group(); h3.position.z = p.seg2; h2.add(h3);     // tip (inwards)

    // Mirror sign: +1 for left, -1 for right
    const yaw1 = THREE.MathUtils.degToRad(p.yaw1Deg) * mirrorSign;
    const yaw3 = THREE.MathUtils.degToRad(p.yaw3Deg) * mirrorSign;
    h1.rotation.y = yaw1;
    h3.rotation.y = yaw3;

    // Segments (box-truss)
    const s1 = this._buildTrussSegment(p.seg1, p.armW, p.armH, p.chord, p.brace, p.panelStep, mat);
    const s2 = this._buildTrussSegment(p.seg2, p.armW, p.armH, p.chord, p.brace, p.panelStep, mat);
    const s3 = this._buildTrussSegment(p.seg3, p.armW, p.armH, p.chord, p.brace, p.panelStep, mat);
    s2.position.z = 0; s3.position.z = 0; // already aligned by hinge positions
    h1.add(s1); h2.add(s2); h3.add(s3);

    // Tip pad
    const tip = new THREE.Mesh(new THREE.BoxGeometry(p.armW*0.9, p.armH*0.6, p.tipLen), mat);
    tip.position.set(0, 0, p.seg3 + p.tipLen/2);
    tip.castShadow = tip.receiveShadow = true;
    h3.add(tip);

    // Save refs (useful later)
    root.userData = { h1, h2, h3, s1, s2, s3, tip };
    return root;
  }

  // ===== Animation =====
  _applyOpenAmount(t) {
    const max = THREE.MathUtils.degToRad(this.params.maxOpenDeg);
    const set = (hinge) => {
      const sign = Math.sign(hinge.position.x) || 1;      // left -, right +
      hinge.rotation.y = THREE.MathUtils.lerp(0, -sign * max, t); // OUTWARDS
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