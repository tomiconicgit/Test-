// digtool.js — highlight & dig terrain tiles; B grows, X shrinks, R2 digs; top-right X closes
export function createDigTool(THREE, { scene, camera, terrain, input }) {
  const tool = {
    active:false,
    sizes:[1,2,10], // 1x1, 2x2, 10x10
    sizeIdx:0,
    highlight:null,
    uiClose:null,
    enable(){
      if (this.active) return;
      this.active = true; this.sizeIdx = 0;
      this._ensureHighlight(); this._ensureUI();
      this.highlight.visible = true; this.uiClose.style.display = 'block';
    },
    disable(){
      this.active = false;
      if (this.highlight) this.highlight.visible = false;
      if (this.uiClose) this.uiClose.style.display = 'none';
    },
    update(dt){
      if (!this.active) return;
      // grow/shrink via controller
      if (input.bPressed) this._grow();
      if (input.xPressed) this._shrink();
      // position highlight at crosshair hit
      const hit = rayToTerrain(THREE, camera, terrain);
      if (hit) {
        const size = this.sizes[this.sizeIdx];
        const gx = Math.round(hit.point.x);
        const gz = Math.round(hit.point.z);
        this._placeHighlight(gx, gz, hit.point.y + 0.02, size);
        // dig with R2
        if (input.r2Pressed) digArea(THREE, terrain, gx, gz, size, -1);
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
      if (this.uiClose) return;
      const b = document.createElement('button');
      b.id = 'digtool-close';
      b.textContent = '×';
      b.title = 'Close Dig Tool';
      b.style.display = 'none';
      b.addEventListener('click', () => this.disable());
      document.body.appendChild(b);

      const css = document.createElement('style');
      css.textContent = `
        #digtool-close{
          position:fixed;top:16px;right:16px;z-index:1000;width:42px;height:42px;
          border-radius:10px;border:1px solid rgba(255,255,255,.2);
          background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;
          font-size:22px;line-height:22px;font-weight:900;display:grid;place-items:center;
        }
      `;
      document.head.appendChild(css);
      this.uiClose = b;
    }
  };

  // --- helpers ---
  function rayToTerrain(THREE, camera, terrain){
    const rc = new THREE.Raycaster();
    rc.setFromCamera({x:0,y:0}, camera);
    const hit = rc.intersectObject(terrain, true);
    return hit && hit[0];
  }

  function digArea(THREE, terrain, cx, cz, size, deltaY){
    // adjust vertices within [cx - k .. cx + k], same for z
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
        pos.setY(i, y + deltaY); // deltaY negative digs down
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.normalsNeedUpdate = true;
  }

  return tool;
}