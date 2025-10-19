// MechzillaTower.js — 30x30 base + four 4x4x60 corner beams
// Upgraded metal (physical material + clearcoat) and *real recessed* indent panels

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

    // --- Materials -----------------------------------------------------------
    // Richer "painted steel" using Physical material so highlights look crisp.
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x6e7a86,
      metalness: 0.55,          // more metallic than before
      roughness: 0.35,          // still a brushed/painted look
      clearcoat: 0.7,           // thin glossy coat
      clearcoatRoughness: 0.15,
      reflectivity: 0.5         // (ignored by Standard, used by Physical)
    });

    // The recessed panel is a touch darker and more matte
    const panelMat = new THREE.MeshPhysicalMaterial({
      color: 0x505963,
      metalness: 0.45,
      roughness: 0.55,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
      polygonOffset: true,           // avoid any z-fighting shimmer
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    // A small raised frame around each panel (to sell the recess)
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x64707b,
      metalness: 0.5,
      roughness: 0.4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18
    });

    // --- Base slab -----------------------------------------------------------
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize, baseThickness, baseSize),
      shellMat
    );
    base.position.y = baseThickness / 2;
    base.receiveShadow = true;
    base.name = 'towerBase';
    this.group.add(base);

    // --- Four detailed beams -------------------------------------------------
    const half = baseSize / 2 - beamSize / 2;
    const beamY = beamHeight / 2 + baseThickness;

    const protoBeam = this._makeDetailedBeam(beamSize, beamHeight, shellMat, panelMat, frameMat);

    const b1 = protoBeam.clone(); b1.position.set(+half, beamY, +half); b1.name = 'cornerBeam_1';
    const b2 = protoBeam.clone(); b2.position.set(-half, beamY, +half); b2.name = 'cornerBeam_2';
    const b3 = protoBeam.clone(); b3.position.set(-half, beamY, -half); b3.name = 'cornerBeam_3';
    const b4 = protoBeam.clone(); b4.position.set(+half, beamY, -half); b4.name = 'cornerBeam_4';
    this.group.add(b1, b2, b3, b4);
  }

  /**
   * Creates a 4x4xH column with a *real* recessed panel & a raised frame on each face.
   * We do this with geometry (no CSG): a big shell box, plus inner panel quads pushed inward,
   * and four thin frame strips per face that sit proud of the panel.
   */
  _makeDetailedBeam(size, height, shellMat, panelMat, frameMat) {
    const g = new THREE.Group();

    // 1) Outer shell
    const shell = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), shellMat);
    shell.castShadow = true;
    shell.receiveShadow = true;
    g.add(shell);

    // 2) Recessed panel parameters
    const edgeInset = Math.max(0.18, size * 0.14); // margin to edges
    const recessDepth = Math.max(0.25, size * 0.08); // how far inward the panel sits
    const panelBorder = Math.max(0.14, size * 0.09); // width of the raised frame strips
    const panelThickness = 0.04;                     // very thin panel "sheet"
    const h = height - 0.9;                          // leave top/bottom rims
    const w = size - edgeInset * 2;

    // helper builds one face (direction: +X/-X/+Z/-Z)
    const addFace = (axis) => {
      const face = new THREE.Group();

      if (axis === 'px' || axis === 'nx') {
        // Panel rectangle recessed along X
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(panelThickness, h, w),
          panelMat
        );
        const sign = axis === 'px' ? +1 : -1;
        panel.position.set(
          (size / 2 - recessDepth) * sign,  // push inward from shell surface
          0,
          0
        );
        panel.castShadow = true; panel.receiveShadow = true;
        face.add(panel);

        // Raised frame: 4 strips around the panel, sitting slightly forward
        const frameDepth = panelThickness + 0.03;
        const stripLong = new THREE.BoxGeometry(frameDepth, h, panelBorder);
        const stripTall = new THREE.BoxGeometry(frameDepth, panelBorder, w);

        const sTop = new THREE.Mesh(stripTall, frameMat);
        const sBot = sTop.clone();
        const sLft = new THREE.Mesh(stripLong, frameMat);
        const sRgt = sLft.clone();

        sTop.position.set(panel.position.x, +h/2 - panelBorder/2, 0);
        sBot.position.set(panel.position.x, -h/2 + panelBorder/2, 0);
        sLft.position.set(panel.position.x, 0, -w/2 + panelBorder/2);
        sRgt.position.set(panel.position.x, 0, +w/2 - panelBorder/2);

        [sTop, sBot, sLft, sRgt].forEach(s => { s.castShadow = s.receiveShadow = true; face.add(s); });

        // Move the whole face to the correct X side so it sits on the shell
        face.position.x = (size / 2 - panelThickness / 2) * sign;
      } else {
        // Panel rectangle recessed along Z
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, panelThickness),
          panelMat
        );
        const sign = axis === 'pz' ? +1 : -1;
        panel.position.set(
          0,
          0,
          (size / 2 - recessDepth) * sign
        );
        panel.castShadow = true; panel.receiveShadow = true;
        face.add(panel);

        // Raised frame strips
        const frameDepth = panelThickness + 0.03;
        const stripLong = new THREE.BoxGeometry(panelBorder, h, frameDepth);
        const stripTall = new THREE.BoxGeometry(w, panelBorder, frameDepth);

        const sTop = new THREE.Mesh(stripTall, frameMat);
        const sBot = sTop.clone();
        const sLft = new THREE.Mesh(stripLong, frameMat);
        const sRgt = sLft.clone();

        sTop.position.set(0, +h/2 - panelBorder/2, panel.position.z);
        sBot.position.set(0, -h/2 + panelBorder/2, panel.position.z);
        sLft.position.set(-w/2 + panelBorder/2, 0, panel.position.z);
        sRgt.position.set(+w/2 - panelBorder/2, 0, panel.position.z);

        [sTop, sBot, sLft, sRgt].forEach(s => { s.castShadow = s.receiveShadow = true; face.add(s); });

        // Move the whole face to the correct Z side so it sits on the shell
        face.position.z = (size / 2 - panelThickness / 2) * sign;
      }

      g.add(face);
    };

    addFace('px'); // +X
    addFace('nx'); // -X
    addFace('pz'); // +Z
    addFace('nz'); // -Z

    return g;
  }

  addTo(scene) { scene.add(this.group); }
  update() {}
}