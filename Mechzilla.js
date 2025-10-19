// Mechzilla.js
// Procedural launch tower with animated "chopstick" catcher arms + QD arms.
// three.js r128 compatible (uses global THREE).

export class Mechzilla {
  constructor(opts = {}) {
    this.root = new THREE.Group();
    this.root.name = 'Mechzilla';

    // ---- Tunables ----
    const {
      towerHeight = 90,      // overall tower height
      towerSide   = 6,       // outer square width/depth
      segmentH    = 4,       // truss segment height
      baseY       = 0,       // base sits on terrain
      color       = 0x22262a
    } = opts;

    this.state = {
      chopstickOpen: false,
      boosterQDExtended: false,
      shipQDExtended: false,
      // anim targets
      target: { chop: 0, booster: 0, ship: 0 }, // [0..1]
      current: { chop: 0, booster: 0, ship: 0 }
    };

    // Materials
    const metal = new THREE.MeshStandardMaterial({
      color, roughness: 0.6, metalness: 0.65
    });

    // ---- Base slab ----
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(towerSide * 1.6, 2, towerSide * 1.6),
      metal
    );
    base.position.y = baseY + 1;
    base.castShadow = base.receiveShadow = true;
    this.root.add(base);

    // ---- Vertical truss tower ----
    const tower = new THREE.Group();
    tower.position.y = baseY + 1; // sit on base
    this.root.add(tower);

    const colGeo = new THREE.BoxGeometry(0.6, segmentH, 0.6);
    const beamGeo= new THREE.BoxGeometry(towerSide-1.2, 0.4, 0.4);
    const braceGeo=new THREE.BoxGeometry(0.35, segmentH*1.05, 0.35);

    const levels = Math.floor(towerHeight / segmentH);

    for (let i = 0; i < levels; i++) {
      const y = i * segmentH + segmentH*0.5;

      // 4 vertical columns (square)
      const colPositions = [
        [+1, +1], [-1, +1], [-1, -1], [+1, -1]
      ].map(([sx, sz]) => ([
        (towerSide/2 - 0.6/2) * sx,
        y,
        (towerSide/2 - 0.6/2) * sz
      ]));

      colPositions.forEach(p => {
        const m = new THREE.Mesh(colGeo, metal);
        m.position.set(p[0], p[1], p[2]);
        m.castShadow = m.receiveShadow = true;
        tower.add(m);
      });

      // perimeter beams (X/Z)
      const bx1 = new THREE.Mesh(beamGeo, metal);
      bx1.position.set(0, y,  (towerSide/2 - 0.2));
      const bx2 = bx1.clone(); bx2.position.z = -bx1.position.z;
      const bz1 = new THREE.Mesh(beamGeo, metal);
      bz1.geometry = beamGeo.clone();
      bz1.rotation.y = Math.PI/2;
      bz1.position.set((towerSide/2 - 0.2), y, 0);
      const bz2 = bz1.clone(); bz2.position.x = -bz1.position.x;
      [bx1,bx2,bz1,bz2].forEach(b=>{ b.castShadow=b.receiveShadow=true; tower.add(b); });

      // cross braces on two faces (alternate to reduce count)
      if (i % 2 === 0) {
        const br1 = new THREE.Mesh(braceGeo, metal);
        br1.position.set( (towerSide/2 - 0.2), y,  (towerSide/2 - 0.2));
        br1.rotation.z =  Math.PI/4;
        const br2 = br1.clone();
        br2.position.z = -(towerSide/2 - 0.2);
        br2.rotation.z = -Math.PI/4;
        const br3 = br1.clone();
        br3.position.x = -(towerSide/2 - 0.2);
        br3.rotation.z = -Math.PI/4;
        const br4 = br1.clone();
        br4.position.set(-(towerSide/2 - 0.2), y, -(towerSide/2 - 0.2));
        br4.rotation.z =  Math.PI/4;
        [br1,br2,br3,br4].forEach(b=>{ b.castShadow=b.receiveShadow=true; tower.add(b); });
      }
    }

    // ---- Platforms (simple) ----
    const topDeck = new THREE.Mesh(
      new THREE.BoxGeometry(towerSide*1.2, 0.6, towerSide*1.2),
      metal
    );
    topDeck.position.y = levels*segmentH + baseY + 1;
    topDeck.castShadow = topDeck.receiveShadow = true;
    tower.add(topDeck);

    // ---- Arms ----
    const hingeY_chop = baseY + 52;     // catcher arms height
    const hingeY_booster = baseY + 22;  // booster QD
    const hingeY_ship = baseY + 70;     // ship QD

    // Catcher ("chopsticks") – two mirrored arms rotating in Y to close
    this.chopRoot = new THREE.Group();
    this.chopRoot.position.set(towerSide/2, hingeY_chop, 0); // mounted on east face
    tower.add(this.chopRoot);

    const stickLen = 24, stickThick = 0.8;
    const stickGeo = new THREE.BoxGeometry(stickLen, stickThick, 2.6);
    const stickMat = metal;

    this.leftStick = new THREE.Mesh(stickGeo, stickMat);
    this.leftStick.castShadow = this.leftStick.receiveShadow = true;
    this.leftStick.position.x = stickLen/2; // pivot at inner end
    this.leftStick.position.y = 0.6;
    this.leftStick.rotation.z = 0.02;
    this.chopRoot.add(this.leftStick);

    this.rightStick = this.leftStick.clone();
    this.rightStick.position.y = -0.6;
    this.rightStick.scale.y = 1.0;
    this.chopRoot.add(this.rightStick);

    // Simple "fingers" at ends
    const fingerGeo = new THREE.BoxGeometry(3.6, 0.5, 0.5);
    const lf = new THREE.Mesh(fingerGeo, stickMat);
    lf.position.set(stickLen-1.6, 0, 1.3);
    const lf2 = lf.clone(); lf2.position.z = -1.3;
    this.leftStick.add(lf, lf2);
    const rf = lf.clone(); const rf2 = lf2.clone();
    this.rightStick.add(rf, rf2);

    // Booster QD (lower extendable arm – translates along X)
    this.boosterQDBase = new THREE.Group();
    this.boosterQDBase.position.set(towerSide/2, hingeY_booster, 0);
    tower.add(this.boosterQDBase);

    const qdBase = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3), metal);
    qdBase.castShadow = qdBase.receiveShadow = true;
    this.boosterQDBase.add(qdBase);

    this.boosterQD = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 2.2), metal);
    this.boosterQD.castShadow = this.boosterQD.receiveShadow = true;
    this.boosterQD.position.x = 7.5; // extends outward
    this.boosterQDBase.add(this.boosterQD);

    // Ship QD (upper small platform – rotates a little)
    this.shipQDBase = new THREE.Group();
    this.shipQDBase.position.set(towerSide/2, hingeY_ship, 3.2);
    tower.add(this.shipQDBase);

    const shipNeck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.2), metal);
    shipNeck.position.x = 2;
    this.shipQDBase.add(shipNeck);

    this.shipQD = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 3.2), metal);
    this.shipQD.position.x = 5;
    this.shipQD.castShadow = this.shipQD.receiveShadow = true;
    this.shipQDBase.add(this.shipQD);

    // Slight offset so rocket stand can sit at (0,0,0)
    this.root.position.set(0, 0, -15);
  }

  // ----------------- Controls -----------------
  openChopsticks(open = true) {
    this.state.chopstickOpen = open;
    this.state.target.chop = open ? 1 : 0; // 0 closed, 1 open
  }
  toggleChopsticks() { this.openChopsticks(!this.state.chopstickOpen); }

  extendBoosterQD(extend = true) {
    this.state.boosterQDExtended = extend;
    this.state.target.booster = extend ? 1 : 0; // 0 retracted, 1 extended
  }
  toggleBoosterQD(){ this.extendBoosterQD(!this.state.boosterQDExtended); }

  extendShipQD(extend = true) {
    this.state.shipQDExtended = extend;
    this.state.target.ship = extend ? 1 : 0;
  }
  toggleShipQD(){ this.extendShipQD(!this.state.shipQDExtended); }

  // ----------------- Animation -----------------
  update(dt) {
    // critically damped-ish easing
    const lerp = (a,b,t)=>a+(b-a)*Math.min(1, t);
    const speed = 4.0 * dt;

    // Ease toward targets
    this.state.current.chop    = lerp(this.state.current.chop,    this.state.target.chop,    speed);
    this.state.current.booster = lerp(this.state.current.booster, this.state.target.booster, speed);
    this.state.current.ship    = lerp(this.state.current.ship,    this.state.target.ship,    speed);

    // Apply to transforms
    // Chopsticks: rotate around Y at hinge (0=closed touching, 1=fully open ~55°)
    const openAngle = THREE.MathUtils.degToRad(55) * this.state.current.chop;
    this.leftStick.rotation.y  =  openAngle;
    this.rightStick.rotation.y = -openAngle;

    // Booster QD: slide out 0..1 maps to 0.5m..7.5m (already at 7.5 default)
    const bMin = 0.6, bMax = 7.5;
    this.boosterQD.position.x = bMin + (bMax - bMin) * this.state.current.booster;

    // Ship QD: small yaw toward vehicle (0..1 => 0..18°)
    const sAngle = THREE.MathUtils.degToRad(18) * this.state.current.ship;
    this.shipQDBase.rotation.y = sAngle;
  }
}