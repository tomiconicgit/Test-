// Minimal chunked voxel world w/ face culling mesher
export const BLOCK = { AIR:0, SAND:1, METAL:2 };

const DIRS = [
  { dx: 1, dy: 0, dz: 0, nx: 1, ny: 0, nz: 0 },  // +X
  { dx:-1, dy: 0, dz: 0, nx:-1, ny: 0, nz: 0 },  // -X
  { dx: 0, dy: 1, dz: 0, nx: 0, ny: 1, nz: 0 },  // +Y
  { dx: 0, dy:-1, dz: 0, nx: 0, ny:-1, nz: 0 },  // -Y
  { dx: 0, dy: 0, dz: 1, nx: 0, ny: 0, nz: 1 },  // +Z
  { dx: 0, dy: 0, dz:-1, nx: 0, ny: 0, nz:-1 },  // -Z
];

export class VoxelWorld {
  constructor(THREE, materials, opts) {
    this.THREE = THREE;
    this.mat = materials;
    this.sizeX = opts.sizeX; // 100
    this.sizeZ = opts.sizeZ; // 100
    this.minY = opts.minY;   // -30
    this.maxY = opts.maxY;   // 500
    this.chunkSize = 16;
    this.props = []; // Keep track of placeable props

    this.chunks = new Map(); // key "cx,cy,cz" -> {data:Uint16Array, mesh:Group}
    this.scene = opts.scene;

    this.height = new Int16Array(this.sizeX * this.sizeZ).fill(this.minY-1);

    for (let x=0;x<this.sizeX;x++){
      for(let z=0;z<this.sizeZ;z++){
        for(let y=this.minY;y<=0;y++) this.setVoxel(x,y,z,BLOCK.SAND,false);
        this.height[x + z*this.sizeX] = 0;
      }
    }
    this.rebuildAll();
  }

  // --- ADD THIS SERIALIZE METHOD ---
  serialize() {
    // 1. Serialize Voxels
    const voxelData = [];
    for (const [key, chunk] of this.chunks.entries()) {
      // Only save chunks that have been modified (i.e., not all AIR)
      if (chunk.data.some(v => v !== BLOCK.AIR)) {
        voxelData.push({
          key: key,
          // Convert Uint16Array to a regular array for JSON
          data: Array.from(chunk.data)
        });
      }
    }

    // 2. Serialize Props
    const propData = this.props.map(prop => {
      return {
        name: prop.name.toUpperCase(), // e.g., "BLOCK", "PIPE_STRAIGHT"
        position: prop.position.toArray(),
        rotation: [prop.rotation.x, prop.rotation.y, prop.rotation.z],
        // Find the key of the material in the materials object
        materialKey: Object.keys(this.mat).find(key => this.mat[key] === prop.material)
      };
    });

    return JSON.stringify({ voxels: voxelData, props: propData });
  }
  
  // --- ADD THIS DESERIALIZE METHOD ---
  deserialize(jsonString, geoms) {
    const data = JSON.parse(jsonString);

    // 1. Clear existing world (voxels and props)
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      }
    }
    this.chunks.clear();
    
    for (const prop of this.props) {
      this.scene.remove(prop);
      if (prop.geometry) prop.geometry.dispose();
    }
    this.props.length = 0;

    // 2. Load Voxels
    for (const item of data.voxels) {
      const [cx, cy, cz] = item.key.split(',').map(Number);
      const chunk = this.getChunk(cx, cy, cz, true);
      chunk.data.set(item.data);
    }
    
    // 3. Load Props
    for (const item of data.props) {
      const geo = geoms[item.name];
      const mat = this.mat[item.materialKey] || this.mat.metal; // Default to metal
      if (!geo) continue;

      const newProp = new this.THREE.Mesh(geo, mat);
      newProp.position.fromArray(item.position);
      newProp.rotation.fromArray(item.rotation);
      newProp.castShadow = newProp.receiveShadow = true;
      newProp.name = item.name.toLowerCase();
      this.scene.add(newProp);
      this.props.push(newProp);
    }
    
    // 4. Rebuild the visual mesh for all chunks
    this.rebuildAll();
  }

  key(cx,cy,cz){ return `${cx},${cy},${cz}`; }
  toChunk(v){ return Math.floor(v / this.chunkSize); }
  inXZ(x,z){ return x>=0 && z>=0 && x<this.sizeX && z<this.sizeZ; }

  getChunk(cx,cy,cz,create=false){
    const k=this.key(cx,cy,cz);
    let c=this.chunks.get(k);
    if(!c && create){
      c = { data:new Uint16Array(this.chunkSize**3).fill(BLOCK.AIR), mesh:null, cx,cy,cz };
      this.chunks.set(k,c);
    }
    return c;
  }

  idx(lx,ly,lz){ return lx + this.chunkSize*(lz + this.chunkSize*ly); }

  getVoxel(x,y,z){
    const cx=this.toChunk(x), cy=this.toChunk(y), cz=this.toChunk(z);
    const c = this.getChunk(cx,cy,cz,false);
    if(!c) {
      if(this.inXZ(x,z) && y>=this.minY && y<=0) return BLOCK.SAND;
      return BLOCK.AIR;
    }
    const lx = x-cx*this.chunkSize, ly = y-cy*this.chunkSize, lz = z-cz*this.chunkSize;
    if(lx<0||ly<0||lz<0||lx>=this.chunkSize||ly>=this.chunkSize||lz>=this.chunkSize) return BLOCK.AIR;
    return c.data[this.idx(lx,ly,lz)];
  }

  setVoxel(x,y,z, id, rebuild=true){
    const cx=this.toChunk(x), cy=this.toChunk(y), cz=this.toChunk(z);
    const c = this.getChunk(cx,cy,cz,true);
    const lx = x - cx*this.chunkSize, ly = y - cy*this.chunkSize, lz = z - cz*this.chunkSize;
    c.data[this.idx(lx,ly,lz)] = id;

    if(this.inXZ(x,z)){
      const topIdx = x + z*this.sizeX;
      if(id!==BLOCK.AIR && y > this.height[topIdx]) this.height[topIdx] = y;
      if(id===BLOCK.AIR && y === this.height[topIdx]){
        let ny = y-1;
        while(ny>=this.minY && this.getVoxel(x,ny,z)===BLOCK.AIR) ny--;
        this.height[topIdx] = (ny<this.minY) ? this.minY-1 : ny;
      }
    }

    if(rebuild) this.rebuildNeighbors(cx,cy,cz, x,y,z);
  }

  rebuildNeighbors(cx,cy,cz, x,y,z){
    const near = new Set([this.key(cx,cy,cz)]);
    const pushIfBoundary=(axis,l)=>{if(l===0)near.add(this.key(cx-(axis==='x'),cy-(axis==='y'),cz-(axis==='z')));if(l===this.chunkSize-1)near.add(this.key(cx+(axis==='x'),cy+(axis==='y'),cz+(axis==='z')));}
    pushIfBoundary('x',x-cx*this.chunkSize);pushIfBoundary('y',y-cy*this.chunkSize);pushIfBoundary('z',z-cz*this.chunkSize);
    for(const k of near) this.rebuildChunkByKey(k);
  }

  rebuildAll(){
    // Find all chunks that should exist based on world size and min/max Y
    const cxMin=0, cxMax=Math.floor((this.sizeX-1)/this.chunkSize);
    const czMin=0, czMax=Math.floor((this.sizeZ-1)/this.chunkSize);
    const cyMin=this.toChunk(this.minY), cyMax=this.toChunk(this.maxY);
    
    // Rebuild all chunks that have data
    for(const chunk of this.chunks.values()) {
        this.rebuildChunk(chunk.cx, chunk.cy, chunk.cz);
    }
    // Also explicitly rebuild sand chunks which might not be in the map yet on a fresh load
    for(let cx=cxMin;cx<=cxMax;cx++){
        for(let cz=czMin;cz<=czMax;cz++){
            for(let cy=this.toChunk(this.minY);cy<=0;cy++) {
                if (!this.chunks.has(this.key(cx,cy,cz))) {
                   this.rebuildChunk(cx,cy,cz);
                }
            }
        }
    }
  }

  rebuildChunkByKey(k){ const [cx,cy,cz]=k.split(',').map(Number);this.rebuildChunk(cx,cy,cz); }

  rebuildChunk(cx,cy,cz){
    const c = this.getChunk(cx,cy,cz,false);
    
    if(c && c.mesh){ this.scene.remove(c.mesh); c.mesh.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
    
    // Even if the chunk doesn't exist in our map, it might have sand, so we build it
    const gSand = this._buildGeometryFor(c, BLOCK.SAND, cx,cy,cz);
    const gMetal = this._buildGeometryFor(c, BLOCK.METAL, cx,cy,cz);

    const group = new this.THREE.Group();
    const mk = (geom, mat) => {
      if(geom.getIndex().count===0) return;
      const m = new this.THREE.Mesh(geom, mat);
      m.castShadow = false; m.receiveShadow = true;
      group.add(m);
    };
    mk(gSand, this.mat.sand);
    mk(gMetal, this.mat.metal);
    
    if (group.children.length > 0) {
      group.frustumCulled = true;
      this.scene.add(group);
      if (c) c.mesh = group;
      // If the chunk didn't exist but we created a mesh for it (e.g. sand), we still need to manage it.
      else this.getChunk(cx,cy,cz,true).mesh = group;
    }
  }

  _buildGeometryFor(c, matchId, cx,cy,cz){
    const THREE = this.THREE; const positions=[],normals=[],uvs=[],indices=[],uvs2=[]; let idxBase=0;
    const cs=this.chunkSize;
    for(let ly=0;ly<cs;ly++){for(let lz=0;lz<cs;lz++){for(let lx=0;lx<cs;lx++){
      const blockId = c ? c.data[this.idx(lx,ly,lz)] : this.getVoxel(cx*cs+lx, cy*cs+ly, cz*cs+lz);
      if(blockId!==matchId) continue;
      
      const vx=cx*cs+lx,vy=cy*cs+ly,vz=cz*cs+lz;
      for(const d of DIRS){
        const neighbor = this.getVoxel(vx+d.dx,vy+d.dy,vz+d.dz);
        if(neighbor===BLOCK.AIR){
          const face=quadForDir(d,vx,vy,vz);positions.push(...face.p);normals.push(...face.n);uvs.push(0,0,1,0,1,1,0,1);uvs2.push(0,0,1,0,1,1,0,1);indices.push(idxBase,idxBase+1,idxBase+2,idxBase,idxBase+2,idxBase+3);idxBase+=4;
        }
      }
    }}}
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geom.setAttribute('uv2',new THREE.Float32BufferAttribute(uvs2,2));geom.setIndex(indices);geom.computeBoundingSphere();return geom;
    function quadForDir(d,x,y,z){if(d.nx===1)return{p:[x+1,y,z,x+1,y+1,z,x+1,y+1,z+1,x+1,y,z+1],n:[1,0,0,1,0,0,1,0,0,1,0,0]};if(d.nx===-1)return{p:[x,y,z,x,y,z+1,x,y+1,z+1,x,y+1,z],n:[-1,0,0,-1,0,0,-1,0,0,-1,0,0]};if(d.ny===1)return{p:[x,y+1,z,x,y+1,z+1,x+1,y+1,z+1,x+1,y+1,z],n:[0,1,0,0,1,0,0,1,0,0,1,0]};if(d.ny===-1)return{p:[x,y,z,x+1,y,z,x+1,y,z+1,x,y,z+1],n:[0,-1,0,0,-1,0,0,-1,0,0,-1,0]};if(d.nz===1)return{p:[x,y,z+1,x+1,y,z+1,x+1,y+1,z+1,x,y+1,z+1],n:[0,0,1,0,0,1,0,0,1,0,0,1]};return{p:[x,y,z,x,y+1,z,x+1,y+1,z,x+1,y,z],n:[0,0,-1,0,0,-1,0,0,-1,0,0,-1]};}
  }

  topY(x,z){ if(!this.inXZ(x,z))return this.minY-1; return this.height[x+z*this.sizeX]; }
}
