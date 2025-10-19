// MechzillaTower.js (three r128)
export class MechzillaTower {
  constructor({
    height = 75,
    baseSize = 6,
    armLength = 24,
    armThickness = 0.6,
    position = new THREE.Vector3(0, 0, -18)
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = "MechzillaTower";

    this.state = {
      open: 1,
      targetOpen: 1,
      armHeight: height * 0.55,
      targetArmHeight: height * 0.55
    };

    // Materials
    const steel = new THREE.MeshStandardMaterial({ color: 0x202326, metalness: 0.9, roughness: 0.35 });
    const dark  = new THREE.MeshStandardMaterial({ color: 0x0f1113, metalness: 0.6, roughness: 0.5 });

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.2, 2, baseSize * 1.2), dark);
    base.position.y = 1; base.receiveShadow = true;
    this.group.add(base);

    // Mast
    const mast = this._buildMast({ height, baseSize, steel });
    this.group.add(mast);

    // Carriage (slides)
    const carriage = new THREE.Group();
    carriage.name = "carriage";
    carriage.position.y = this.state.armHeight;
    mast.add(carriage);
    this.carriage = carriage;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(baseSize * 0.62, 0.15, 8, 24), steel);
    ring.rotation.x = Math.PI / 2; ring.castShadow = ring.receiveShadow = true;
    carriage.add(ring);

    // Chopsticks
    const hingeDist = baseSize * 0.55;
    const leftRoot = new THREE.Group();  leftRoot.position.set(-hingeDist, 0, 0);
    const rightRoot = new THREE.Group(); rightRoot.position.set( hingeDist, 0, 0);
    carriage.add(leftRoot, rightRoot);

    const leftArm  = this._buildTrussArm(armLength, armThickness, steel);
    const rightArm = this._buildTrussArm(armLength, armThickness, steel);
    leftRoot.add(leftArm); rightRoot.add(rightArm);

    // Tips
    const fingerLen = 3;
    const fingerGeo = new THREE.BoxGeometry(armThickness * 0.6, armThickness * 0.6, fingerLen);
    const lFinger = new THREE.Mesh(fingerGeo, steel);
    const rFinger = new THREE.Mesh(fingerGeo, steel);
    lFinger.position.set(0, 0, armLength + fingerLen * 0.5);
    rFinger.position.set(0, 0, armLength + fingerLen * 0.5);
    leftArm.add(lFinger); rightArm.add(rFinger);
    lFinger.castShadow = rFinger.castShadow = true;

    // Top platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 1.6, 1, baseSize * 1.0), dark);
    platform.position.set(0, height - 4, baseSize * 0.2);
    platform.castShadow = platform.receiveShadow = true;
    this.group.add(platform);

    // Fueling arm (decorative)
    const fuelRoot = new THREE.Group();
    fuelRoot.position.set(baseSize * 0.6, height * 0.35, 0);
    this.group.add(fuelRoot);
    const fuelArm = new THREE.Mesh(new THREE.BoxGeometry(armLength * 0.6, armThickness, armThickness), steel);
    fuelArm.position.x = armLength * 0.3;
    fuelRoot.add(fuelArm);

    this.anim = { leftHinge: leftRoot, rightHinge: rightRoot, carriage };

    this._applyOpenAmount(1);
  }

  _buildMast({ height, baseSize, steel }) {
    const mast = new THREE.Group(); mast.name = "mast";

    // Posts
    const postGeo = new THREE.BoxGeometry(0.5, height, 0.5);
    [[+1,+1],[-1,+1],[-1,-1],[+1,-1]].forEach(([sx,sz])=>{
      const m = new THREE.Mesh(postGeo, steel);
      m.position.set((baseSize/2-0.6)*sx, height/2, (baseSize/2-0.6)*sz);
      m.castShadow = m.receiveShadow = true;
      mast.add(m);
    });

    // Bracing
    const step = 3, levels = Math.floor(height / step);
    const beamX = new THREE.BoxGeometry(baseSize - 1.2, 0.35, 0.35);
    const beamZ = new THREE.BoxGeometry(0.35, 0.35, baseSize - 1.2);
    for (let i=1;i<=levels;i++){
      const y = i*step;
      const bx1=new THREE.Mesh(beamX,steel); bx1.position.set(0,y, baseSize/2-0.6);
      const bx2=new THREE.Mesh(beamX,steel); bx2.position.set(0,y,-baseSize/2+0.6);
      const bz1=new THREE.Mesh(beamZ,steel); bz1.position.set( baseSize/2-0.6,y,0);
      const bz2=new THREE.Mesh(beamZ,steel); bz2.position.set(-baseSize/2+0.6,y,0);
      [bx1,bx2,bz1,bz2].forEach(b=>{ b.castShadow=b.receiveShadow=true; mast.add(b); });

      const diag = new THREE.Mesh(new THREE.BoxGeometry(baseSize - 1.4, 0.25, 0.25), steel);
      diag.position.set(0, y - step/2, baseSize/2 - 0.6); diag.rotation.z = Math.PI/4;
      const diag2 = diag.clone(); diag2.position.z *= -1; diag2.rotation.z *= -1;
      mast.add(diag, diag2);
    }
    return mast;
  }

  _buildTrussArm(length, thickness, mat) {
    const arm = new THREE.Group();

    const spine = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), mat);
    spine.position.z = length/2; spine.castShadow = spine.receiveShadow = true; arm.add(spine);

    const chordOfs = thickness * 0.9;
    const top = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), mat);
    top.position.set(0, chordOfs, length/2);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), mat);
    bot.position.set(0, -chordOfs, length/2);
    [top,bot].forEach(m=>{ m.castShadow=m.receiveShadow=true; arm.add(m); });

    const seg = Math.max(4, Math.floor(length / 2));
    const webGeo = new THREE.BoxGeometry(thickness * 0.5, thickness * 0.5, 2);
    for (let i=0;i<seg;i++){
      const z = (i + 0.5) * (length / seg);
      const w1 = new THREE.Mesh(webGeo, mat); w1.position.set(0,0,z); w1.rotation.x = Math.PI/4;
      const w2 = new THREE.Mesh(webGeo, mat); w2.position.set(0,0,z+0.8); w2.rotation.x = -Math.PI/4;
      arm.add(w1, w2);
    }
    return arm;
  }

  _applyOpenAmount(t) {
    const maxAngle = THREE.MathUtils.degToRad(55);
    this.anim.leftHinge.rotation.y  = THREE.MathUtils.lerp(0,  maxAngle, t);
    this.anim.rightHinge.rotation.y = THREE.MathUtils.lerp(0, -maxAngle, t);
  }

  setOpenAmount(t){ this.state.targetOpen = THREE.MathUtils.clamp(t,0,1); }
  open(){ this.setOpenAmount(1); }
  close(){ this.setOpenAmount(0); }
  toggle(){ this.setOpenAmount(this.state.targetOpen < 0.5 ? 1 : 0); }

  setCatcherHeight(y){ this.state.targetArmHeight = y; }

  update(dt){
    const k = 8;
    this.state.open += (this.state.targetOpen - this.state.open) * Math.min(1, k*dt);
    this._applyOpenAmount(this.state.open);

    this.state.armHeight += (this.state.targetArmHeight - this.state.armHeight) * Math.min(1, k*dt);
    this.carriage.position.y = this.state.armHeight;
  }
}