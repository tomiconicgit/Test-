// MechzillaTower.js — 30x30 base + four 4x4x60 beams
// Fixed: recessed panels are truly INSET (no extra face offset)

export class MechzillaTower {
  constructor({
    baseSize = 30,
    baseThickness = 1,
    beamSize = 4,
    beamHeight = 60,
    position = new THREE.Vector3(0, 0, 0)
  } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.name = 'MechzillaTower';

    // Rich painted steel
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x6e7a86,
      metalness: 0.5,
      roughness: 0.38,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18
    });

    const panelMat = new THREE.MeshPhysicalMaterial({
      color: 0x505963,           // darker, matte
      metalness: 0.45,
      roughness: 0.55,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      polygonOffset: true,       // kill shimmer
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x646f7a,
      metalness: 0.5,
      roughness: 0.42,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2
    });

    // Base slab
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, baseThickness, baseSize),
      shellMat
    );
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // Four beams
    const half = baseSize / 2 - beamSize / 2;
    const beamY = beamHeight / 2 + baseThickness;

    const proto = this._makeDetailedBeam(beamSize, beamHeight, shellMat, panelMat, frameMat);

    const b1 = proto.clone(); b1.position.set(+half, beamY, +half);
    const b2 = proto.clone(); b2.position.set(-half, beamY, +half);
    const b3 = proto.clone(); b3.position.set(-half, beamY, -half);
    const b4 = proto.clone(); b4.position.set(+half, beamY, -half);
    [b1,b2,b3,b4].forEach((b,i)=>b.name=`cornerBeam_${i+1}`);
    this.group.add(b1,b2,b3,b4);
  }

  _makeDetailedBeam(size, height, shellMat, panelMat, frameMat) {
    const g = new THREE.Group();

    // 1) Outer shell
    const shell = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), shellMat);
    shell.castShadow = true; shell.receiveShadow = true;
    g.add(shell);

    // 2) True recessed panels (no extra group offset)
    const rim = 0.9;                            // top/bottom rim total
    const panelH = height - rim;                // visible height of the recess
    const edgeInset = Math.max(0.18, size*0.14);
    const panelW = size - edgeInset*2;
    const recessDepth = Math.max(0.25, size*0.08); // how far inside the shell
    const panelT = 0.05;                        // panel thickness
    const frameW = Math.max(0.14, size*0.09);   // frame strip width
    const framePop = 0.02;                      // how much the frame sits above panel

    // helpers to add a recessed panel + frame on +X/-X faces
    const addXFace = (sign) => {
      const xPanel = sign * (size/2 - recessDepth); // INSIDE the shell
      // panel sheet
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelT, panelH, panelW),
        panelMat
      );
      panel.position.set(xPanel, 0, 0);
      panel.castShadow = panel.receiveShadow = true;
      g.add(panel);

      // frame strips (slightly in front of panel but still inside shell)
      const xFrame = sign * (size/2 - recessDepth + framePop);
      const stripLong = new THREE.BoxGeometry(panelT + 0.03, panelH, frameW);
      const stripTall = new THREE.BoxGeometry(panelT + 0.03, frameW, panelW);

      const top = new THREE.Mesh(stripTall, frameMat);
      const bot = top.clone();
      const lft = new THREE.Mesh(stripLong, frameMat);
      const rgt = lft.clone();

      top.position.set(xFrame, +panelH/2 - frameW/2, 0);
      bot.position.set(xFrame, -panelH/2 + frameW/2, 0);
      lft.position.set(xFrame, 0, -panelW/2 + frameW/2);
      rgt.position.set(xFrame, 0, +panelW/2 - frameW/2);

      [top, bot, lft, rgt].forEach(s => { s.castShadow = s.receiveShadow = true; g.add(s); });
    };

    // helpers for +Z/-Z faces
    const addZFace = (sign) => {
      const zPanel = sign * (size/2 - recessDepth);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelW, panelH, panelT),
        panelMat
      );
      panel.position.set(0, 0, zPanel);
      panel.castShadow = panel.receiveShadow = true;
      g.add(panel);

      const zFrame = sign * (size/2 - recessDepth + framePop);
      const stripLong = new THREE.BoxGeometry(frameW, panelH, panelT + 0.03);
      const stripTall = new THREE.BoxGeometry(panelW, frameW, panelT + 0.03);

      const top = new THREE.Mesh(stripTall, frameMat);
      const bot = top.clone();
      const lft = new THREE.Mesh(stripLong, frameMat);
      const rgt = lft.clone();

      top.position.set(0, +panelH/2 - frameW/2, zFrame);
      bot.position.set(0, -panelH/2 + frameW/2, zFrame);
      lft.position.set(-panelW/2 + frameW/2, 0, zFrame);
      rgt.position.set(+panelW/2 - frameW/2, 0, zFrame);

      [top, bot, lft, rgt].forEach(s => { s.castShadow = s.receiveShadow = true; g.add(s); });
    };

    // Add all four faces
    addXFace(+1);
    addXFace(-1);
    addZFace(+1);
    addZFace(-1);

    return g;
  }

  addTo(scene) { scene.add(this.group); }
  update() {}
}