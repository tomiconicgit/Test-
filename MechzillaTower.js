// MechzillaTower.js — Solid-beam mast + chunky carriage + 3-segment chopsticks
// three r128 compatible

export class MechzillaTower {
  constructor({
    height = 75,
    baseSize = 15,         // ⬅ mast footprint 15x15
    // Beam language
    post = 1.2,            // corner post thickness
    ring = 0.8,            // ring/diagonal thickness
    // Chopstick layout
    seg1 = 10,             // root segment length (outwards)
    seg2 = 12,             // middle straight length
    seg3 = 10,             // tip segment length (back in toward rocket)
    yaw1 = 22 * Math.PI/180,   // outwards bend
    yaw3 = -18 * Math.PI/180,  // inwards bend
    armW = 3.2,            // chopstick box width
    armH = 2.6,            // chopstick box height
    gripLen = 3.2,         // end pad
    maxOpenDeg = 60,       // outward swing range
    position = new THREE.Vector3(0, 0, -18)
  } = {}) {

    this.params = { height, baseSize, post, ring, seg1, seg2, seg3, yaw1, yaw3, armW, armH, gripLen, maxOpenDeg };

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.state = {
      open: 1, targetOpen: 1,
      armHeight: height * 0.55, targetArmHeight: height * 0.55
    };

    const steel = new THREE.MeshStandardMaterial({ color: 0x1b1f23, metalness: 0.9, roughness: 0.35 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0d0f11, metalness: 0.6, roughness: 0.5 });

    // --- Base slab
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.25, 2.2, baseSize * 1.25), dark);
    base.position.y = 1.1; base.receiveShadow = true;
    this.group.add(base);

    // --- Mast (15 x 15 solid-beam look)
    const mast = this._buildSolidMast(steel);
    this.group.add(mast);

    // --- Carriage: big steel bracket riding the mast
    const carriage = this._buildCarriage(steel);
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    // Hinge roots mounted on the carriage cross-beam
    const hingeOffset = baseSize * 0.60; // distance from mast center
    const leftRoot  = new THREE.Group();  leftRoot.position.set(-hingeOffset, 0, 0);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeOffset, 0, 0);
    carriage.add(leftRoot, rightRoot);

    // --- 3-segment “curved” box-beam chopsticks
    const leftArm  = this._buildSegmentedChopstick(steel);
    const rightArm = this._buildSegmentedChopstick(steel);
    leftRoot.add(leftArm);
    rightRoot.add(rightArm);

    // Store animated parts
    this.anim = { leftHinge: leftRoot, rightHinge: rightRoot, carriage };

    // Top platform (decorative)
    const platform = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.0, 1.2, baseSize * 0.9), dark);
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    // Start open
    this._applyOpenAmount(1);
  }

  // ===== BUILDERS =====

  _buildSolidMast(mat) {
    const { height, baseSize, post, ring } = this.params;
    const g = new THREE.Group(); g.name = 'mast';

    // Four thick corner posts
    const postGeo = new THREE.BoxGeometry(post, height, post);
    const half = baseSize/2 - post*0.6;
    [[+1,+1],[-1,+1],[-1,-1],[+1,-1]].forEach(([sx,sz])=>{
      const m = new THREE.Mesh(postGeo, mat);
      m.position.set(half*sx, height/2, half*sz);
      m.castShadow = m.receiveShadow = true; g.add(m);
    });

    // Ring frames every step (solid look)
    const step = 3;
    const levels = Math.floor(height / step);
    const bx = new THREE.BoxGeometry(baseSize - post*1.6, ring, ring);
    const bz = new THREE.BoxGeometry(ring, ring, baseSize - post*1.6);
    for (let i=1;i<=levels;i++){
      const y = i*step;
      const bx1=new THREE.Mesh(bx,mat); bx1.position.set(0,y, half);
      const bx2=new THREE.Mesh(bx,mat); bx2.position.set(0,y,-half);
      const bz1=new THREE.Mesh(bz,mat); bz1.position.set( half,y,0);
      const bz2=new THREE.Mesh(bz,mat); bz2.position.set(-half,y,0);
      [bx1,bx2,bz1,bz2].forEach(b=>{ b.castShadow=b.receiveShadow=true; g.add(b); });

      // Minimal diagonals (chunky)
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

    // Side plates that wrap mast rails
    const plateW = baseSize * 0.5;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, 2.2, ring*3.0), mat);
    const pL = plate.clone(); pL.position.set(-baseSize*0.45, 0, 0);
    const pR = plate.clone(); pR.position.set( baseSize*0.45, 0, 0);
    [pL,pR].forEach(m=>{ m.castShadow=m.receiveShadow=true; c.add(m); });

    // Cross-beam the chopsticks bolt to
    const xBeam = new THREE.Mesh(new THREE.BoxGeometry(baseSize*1.2, 2.0, ring*2.2), mat);
    xBeam.position.set(0, 0, 0);
    xBeam.castShadow = xBeam.receiveShadow = true;
    c.add(xBeam);

    // Decorative torus ring behind carriage (visual)
    const ringVis = new THREE.Mesh(new THREE.TorusGeometry(baseSize*0.66, 0.22, 10, 28), mat);
    ringVis.rotation.x = Math.PI/2; ringVis.position.z = -ring*1.1;
    ringVis.castShadow = ringVis.receiveShadow = true;
    c.add(ringVis);

    return c;
  }

  // One box-beam segment (solid rectangular tube with inner frames)
  _boxBeamSegment(len, w, h, mat) {
    const g = new THREE.Group();

    // Outer perimeter tubes
    const wall = Math.min(0.5, Math.max(0.28, Math.min(w,h) * 0.12));
    const longX = new THREE.BoxGeometry(w, wall, len);
    const longY = new THREE.BoxGeometry(wall, h, len);
    // top/bottom
    const t = new THREE.Mesh(longX, mat); t.position.set(0, +h/2 - wall/2, len/2);
    const b = new THREE.Mesh(longX, mat); b.position.set(0, -h/2 + wall/2, len/2);
    // left/right
    const l = new THREE.Mesh(longY, mat); l.position.set(-w/2 + wall/2, 0, len/2);
    const r = new THREE.Mesh(longY, mat); r.position.set(+w/2 - wall/2, 0, len/2);
    [t,b,l,r].forEach(m=>{ m.castShadow=m.receiveShadow=true; g.add(m); });

    // Internal frames every ~2m
    const step = Math.max(2, Math.min(3, len/4));
    const frames = Math.max(2, Math.floor(len/step));
    const fx = new THREE.BoxGeometry(w, wall*0.9, wall*0.9);
    const fy = new THREE.BoxGeometry(wall*0.9, h, wall*0.9);
    for (let i=0;i<=frames;i++){
      const z = (i/frames) * len;
      const fx1 = new THREE.Mesh(fx, mat); fx1.position.set(0, +h/2 - wall/2, z);
      const fx2 = new THREE.Mesh(fx, mat); fx2.position.set(0, -h/2 + wall/2, z);
      const fy1 = new THREE.Mesh(fy, mat); fy1.position.set(+w/2 - wall/2, 0, z);
      const fy2 = new THREE.Mesh(fy, mat); fy2.position.set(-w/2 + wall/2, 0, z);
      [fx1,fx2,fy1,fy2].forEach(f=>{ f.castShadow=f.receiveShadow=true; g.add(f); });
    }
    return g;
  }

  _buildSegmentedChopstick(mat) {
    const { seg1, seg2, seg3, yaw1, yaw3, armW, armH, gripLen } = this.params;

    // Segment 1: outwards
    const s1 = this._boxBeamSegment(seg1, armW, armH, mat);
    // Segment 2: straight
    const s2 = this._boxBeamSegment(seg2, armW, armH, mat);
    // Segment 3: inward to wrap rocket
    const s3 = this._boxBeamSegment(seg3, armW, armH, mat);

    // Chain them with small yaw pivots
    const root = new THREE.Group();

    const h1 = new THREE.Group(); root.add(h1);
    h1.rotation.y = yaw1;

    s1.position.z = 0; // built from 0→len; keep origin at hinge
    h1.add(s1);

    const h2 = new THREE.Group(); // straight section follows s1
    h2.position.z = seg1;
    h1.add(h2);
    // no yaw on h2
    s2.position.z = seg2 / 2;
    h2.add(s2);

    const h3 = new THREE.Group();
    h3.position.z = seg2;
    h2.add(h3);
    h3.rotation.y = yaw3;

    s3.position.z = seg3 / 2;
    h3.add(s3);

    // Grip pad at very end
    const tip = new THREE.Mesh(new THREE.BoxGeometry(armW * 0.9, armH * 0.6, gripLen), mat);
    tip.position.set(0, 0, seg3 + gripLen/2);
    tip.castShadow = tip.receiveShadow = true;
    h3.add(tip);

    // Expose roots for possible IK later
    root.userData = { h1, h2, h3 };

    return root;
  }

  // ===== ANIMATION =====

  _applyOpenAmount(t) {
    const max = THREE.MathUtils.degToRad(this.params.maxOpenDeg);
    const set = (hinge) => {
      const sign = Math.sign(hinge.position.x) || 1; // left is -, right is +
      // Outwards opening only
      hinge.rotation.y = THREE.MathUtils.lerp(0, -sign * max, t);
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