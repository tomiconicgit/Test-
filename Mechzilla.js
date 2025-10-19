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

      // 4 vertical