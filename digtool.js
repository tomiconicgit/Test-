// digtool.js — highlight & dig terrain tiles; B grows, X shrinks, Y toggles mode, R2 digs
// Modes: "smooth" (soft sculpt) and "straight" (stepped, crisp borders)
export function createDigTool(THREE, { scene, camera, terrain, input }) {
  const tool = {
    active:false,
    mode:'smooth',            // 'smooth' | 'straight'
    sizes:[1,2,10],           // 1x1, 2x2, 10x10
    sizeIdx:0,
    highlight:null,
    uiClose:null,
    uiBadge:null,             // shows mode
    _terrainPrepared:false,   // once we convert to non-indexed for straight mode

    enable(){
      if (this.active) return;
      this.active = true; this.sizeIdx = 0;
      this._ensureHighlight(); this._ensureUI();
      this._applyModeStyle();
      this.highlight.visible = true;
      this.uiClose.style.display = 'block';
      this.uiBadge.style.display = 'block';
    },
    disable(){
      this.active = false;
      if (this.highlight) this.highlight.visible = false;
      if (this.uiClose) this.uiClose.style.display = 'none';
      if (this.uiBadge) this.uiBadge.style.display = 'none';
    },
    update(dt){
      if (!this.active) return;

      // grow/shrink via controller
      if (input.bPressed) this._grow();
      if (input.xPressed) this._shrink();

      // toggle smooth/straight
      if (input.yPressed) this._toggleMode();

      // position highlight at crosshair hit
      const hit = rayToTerrain(THREE, camera, terrain);
      if (hit) {
        const size = this.sizes[this.sizeIdx];
        const gx = Math.round(hit.point.x);
        const gz = Math.round(hit.point.z);
        this._placeHighlight(gx, gz, hit.point.y + 0.02, size);

        // dig with R2
        if (input.r2Pressed) {
          if (this.mode === 'smooth') {
            digSmooth(THREE, terrain, gx, gz, size, -1);
          } else {
            this._prepareTerrainForStraight(terrain);
            digStraight(THREE, terrain, gx, gz, size, -1);
          }
        }
      }
    },

    _toggleMode(){
      this.mode = this.mode === 'smooth' ? 'straight' : 'smooth';
      this._applyModeStyle();
      if (this.mode === 'straight') this._prepareTerrainForStraight(terrain);
    },
    _applyModeStyle(){
      // change highlight tint to reflect mode
      const mat = this.highlight?.material;
      const line = this.highlight?.children?.[0]?.material;
      if (!mat || !line) return;
      if (this.mode === 'smooth') {
        mat.color.set(0x00ff88); line.color.set(0x00ff88);
        this.uiBadge.textContent = 'Mode: Smooth';
      } else {
        mat.color.set(0x55aaff); line.color.set(0x55aaff);
        this.uiBadge.textContent = 'Mode: Straight';
      }
    },

    _grow(){ if (this.sizeIdx < this.sizes.length - 1) this.sizeIdx++; this._resizeHighlight(); },
    _shrink(){ if (this.sizeIdx > 0) this.sizeIdx--; this._resizeHighlight(); },

    _ensureHighlight(){
      if (this.highlight) return;
      const geom = new THREE.PlaneGeometry(1,1,1,1);
      geom.rotateX(-Math.PI/2);
      const mat = new THREE.MeshBasicMaterial({ color:0x00ff88, transparent:true, opacity:0.25, depthWrite:false });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false; mesh.renderOrder = 999; // keep on top
      // outline
      const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1));
      edges.rotateX(-Math.PI/2);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color:0x00ff88 }));
      mesh.add(line);
      scene.add(mesh);
      this.highlight = mesh;
      this._resizeHighlight();
    },
    _resizeHighlight(){
      if (!this.highlight) return;
      const s = this.sizes[this.sizeIdx];
      this.highlight.scale.set(s, 1, s);
    },
    _placeHighlight(cx, cz, y, size){
      this.highlight.position.set(cx, y, cz);
      this.highlight.visible = true;
    },

    _ensureUI(){
      if (this.uiClose && this.uiBadge) return;

      const closeBtn = document.createElement('button');
      closeBtn.id = 'digtool-close';
      closeBtn.textContent = '×';
      closeBtn.title = 'Close Dig Tool';
      closeBtn.style.display = 'none';
      closeBtn.addEventListener('click', () => this.disable());

      const badge = document.createElement('div');
      badge.id = 'digtool-badge';
      badge.textContent = 'Mode: Smooth';
      badge.style.display = 'none';

      document.body.append(closeBtn, badge);

      const css = document.createElement('style');
      css.textContent = `
        #digtool-close{
          position:fixed;top:16px;right:16px;z-index:1000;width:42px;height:42px;
          border-radius:10px;border:1px solid rgba(255,255,255,.2);
          background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;
          font-size:22px;line-height:22px;font-weight:900;display:grid;place-items:center;
        }
        #digtool-badge{
          position:fixed;top:16px;right:66px;z-index:1000;
          padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);
          background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;
          font-weight:700;font-size:12px;letter-spacing:.2px;
        }
      `;
      document.head.appendChild(css);

      this.uiClose = closeBtn;
      this.uiBadge = badge;
    },

    _prepareTerrainForStraight(terrainMesh){
      if (this._terrainPrepared) return;
      const g = terrainMesh.geometry;
      if (g.getIndex()) {
        // Make triangles independent so boundary steps look crisp
        terrainMesh.geometry = g.toNonIndexed();
      }
      terrainMesh.geometry.computeVertexNormals();
      terrainMesh.geometry.attributes.position.needsUpdate = true;
      this._terrainPrepared = true;
    }
  };

  // --- helpers ---------------------------------------------------------------

  function rayToTerrain(THREE, camera, terrain){
    const rc = new THREE.Raycaster();
    rc.setFromCamera({x:0,y:0}, camera);
    const hit = rc.intersectObject(terrain, true);
    return hit && hit[0];
  }

  // Smooth sculpt: move every vertex inside rect by deltaY
  function digSmooth(THREE, terrain, cx, cz, size, deltaY){
    const k = (size-1)/2;
    const xMin = Math.round(cx - k) - 0.001;
    const xMax = Math.round(cx + k) + 0.001;
    const zMin = Math.round(cz - k) - 0.001;
    const zMax = Math.round(cz + k) + 0.001;

    const geo = terrain.geometry;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (x >= xMin && x <= xMax && z >= zMin && z <= zMax) {
        pos.setY(i, y + deltaY);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.normalsNeedUpdate = true;
  }

  // Straight-edge: only lower triangles fully inside rect (crisp steps)
  function digStraight(THREE, terrain, cx, cz, size, deltaY){
    const k = (size-1)/2;
    const xMin = Math.round(cx - k) - 0.001;
    const xMax = Math.round(cx + k) + 0.001;
    const zMin = Math.round(cz - k) - 0.001;
    const zMax = Math.round(cz + k) + 0.001;

    const geo = terrain.geometry;
    const pos = geo.attributes.position;
    // Non-indexed: 3 verts per triangle
    for (let i = 0; i < pos.count; i += 3) {
      const v0 = { x: pos.getX(i+0), y: pos.getY(i+0), z: pos.getZ(i+0) };
      const v1 = { x: pos.getX(i+1), y: pos.getY(i+1), z: pos.getZ(i+1) };
      const v2 = { x: pos.getX(i+2), y: pos.getY(i+2), z: pos.getZ(i+2) };

      const inside0 = (v0.x >= xMin && v0.x <= xMax && v0.z >= zMin && v0.z <= zMax);
      const inside1 = (v1.x >= xMin && v1.x <= xMax && v1.z >= zMin && v1.z <= zMax);
      const inside2 = (v2.x >= xMin && v2.x <= xMax && v2.z >= zMin && v2.z <= zMax);

      if (inside0 && inside1 && inside2) {
        pos.setY(i+0, v0.y + deltaY);
        pos.setY(i+1, v1.y + deltaY);
        pos.setY(i+2, v2.y + deltaY);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.normalsNeedUpdate = true;
  }

  return tool;
}