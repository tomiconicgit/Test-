// Minimal chunked voxel world w/ face culling mesher
export const BLOCK = { AIR:0, SAND:1, METAL:2, CONCRETE:3 };

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

    this.chunks = new Map(); // key "cx,cy,cz" -> {data:Uint16Array, mesh:Group}
    this.scene = opts.scene;

    // simple height map for walking (x,z in bounds)
    this.height = new Int16Array(this.sizeX * this.sizeZ).fill(this.minY-1);

    // init: fill y ∈ [minY..0] with SAND
    for (let x=0;x<this.sizeX;x++){
      for(let z=0;z<this.sizeZ;z++){
        for(let y=this.minY;y<=0;y++) this.setVoxel(x,y,z,BLOCK.SAND,false);
        this.height[x + z*this.sizeX] = 0;
      }
    }
    // build all chunks within populated range
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
      // implicit fill: sand if y∈[minY..0] and xz in bounds; else air
      if(this.inXZ(x,z) && y>=this.minY && y<=0) return BLOCK.SAND;
      return BLOCK.AIR;
    }
    const lx = x - cx*this.chunkSize;
    const ly = y - cy*this.chunkSize;
    const lz = z - cz*this.chunkSize;
    if(lx<0||ly<0||lz<0||lx>=this.chunkSize||ly>=this.chunkSize||lz>=this.chunkSize) return BLOCK.AIR;
    return c.data[this.idx(lx,ly,lz)];
  }

  setVoxel(x,y,z, id, rebuild=true){
    const cx=this.toChunk(x), cy=this.toChunk(y), cz=this.toChunk(z);
    const c = this.getChunk(cx,cy,cz,true);
    const lx = x - cx*this.chunkSize;
    const ly = y - cy*this.chunkSize;
    const lz = z - cz*this.chunkSize;
    c.data[this.idx(lx,ly,lz)] = id;

    if(this.inXZ(x,z)){
      const topIdx = x + z*this.sizeX;
      if(id!==BLOCK.AIR && y > this.height[topIdx]) this.height[topIdx] = y;
      if(id===BLOCK.AIR && y === this.height[topIdx]){
        // scan downward to find next solid
        let ny = y-1;
        while(ny>=this.minY && this.getVoxel(x,ny,z)===BLOCK.AIR) ny--;
        this.height[topIdx] = (ny<this.minY) ? this.minY-1 : ny;
      }
    }

    if(rebuild) this.rebuildNeighbors(cx,cy,cz, x,y,z);
  }

  rebuildNeighbors(cx,cy,cz, x,y,z){
    const near = new Set([this.key(cx,cy,cz)]);
    // if at chunk boundary, also rebuild adjacent chunk
    const pushIfBoundary = (axis, l) => {
      if(l===0) near.add(this.key(cx-(axis==='x'), cy-(axis==='y'), cz-(axis==='z')));
      if(l===this.chunkSize-1) near.add(this.key(cx+(axis==='x'), cy+(axis==='y'), cz+(axis==='z')));
    };
    pushIfBoundary('x', x - cx*this.chunkSize);
    pushIfBoundary('y', y - cy*this.chunkSize);
    pushIfBoundary('z', z - cz*this.chunkSize);
    for(const k of near) this.rebuildChunkByKey(k);
  }

  rebuildAll(){
    // Build only chunks that intersect populated slice y∈[minY..0] within xz bounds
    const cxMin = 0, cxMax = Math.ceil(this.sizeX/this.chunkSize)-1;
    const czMin = 0, czMax = Math.ceil(this.sizeZ/this.chunkSize)-1;
    const cyMin = this.toChunk(this.minY), cyMax = this.toChunk(0);
    for(let cx=cxMin; cx<=cxMax; cx++){
      for(let cz=czMin; cz<=czMax; cz++){
        for(let cy=cyMin; cy<=cyMax; cy++){
          this.rebuildChunk(cx,cy,cz);
        }
      }
    }
  }

  rebuildChunkByKey(k){
    const [cx,cy,cz] = k.split(',').map(Number);
    this.rebuildChunk(cx,cy,cz);
  }

  rebuildChunk(cx,cy,cz){
    const c = this.getChunk(cx,cy,cz,false);
    if(!c) return;
    // dispose old
    if(c.mesh){ this.scene.remove(c.mesh); c.mesh.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
    const gSand = this._buildGeometryFor(c, BLOCK.SAND, cx,cy,cz);
    const gMetal = this._buildGeometryFor(c, BLOCK.METAL, cx,cy,cz);
    const gConc = this._buildGeometryFor(c, BLOCK.CONCRETE, cx,cy,cz);

    const group = new this.THREE.Group();
    const mk = (geom, mat) => {
      if(geom.getIndex().count===0) return;
      const m = new this.THREE.Mesh(geom, mat);
      m.castShadow = false; m.receiveShadow = true;
      group.add(m);
    };
    mk(gSand, this.mat.sand);
    mk(gMetal, this.mat.metal);
    mk(gConc, this.mat.concrete);
    group.frustumCulled = true;
    this.scene.add(group);
    c.mesh = group;
  }

  _buildGeometryFor(c, matchId, cx,cy,cz){
    const THREE = this.THREE;
    const positions=[], normals=[], uvs=[], indices=[], uvs2=[];
    let idxBase=0;

    const cs=this.chunkSize;
    for(let ly=0; ly<cs; ly++){
      for(let lz=0; lz<cs; lz++){
        for(let lx=0; lx<cs; lx++){
          const id = c.data[this.idx(lx,ly,lz)];
          if(id!==matchId) continue;
          const vx = cx*cs+lx, vy=cy*cs+ly, vz=cz*cs+lz;

          for(const d of DIRS){
            const nx=vx+d.dx, ny=vy+d.dy, nz=vz+d.dz;
            const neighbor = this.getVoxel(nx,ny,nz);
            if(neighbor===BLOCK.AIR){
              // add face for direction d
              const face = quadForDir(d, vx,vy,vz);
              positions.push(...face.p);
              normals.push(...face.n);
              // 0..1 uv; duplicate into uv2 for AO
              uvs.push(0,0, 1,0, 1,1, 0,1);
              uvs2.push(0,0, 1,0, 1,1, 0,1);
              indices.push(idxBase, idxBase+1, idxBase+2, idxBase, idxBase+2, idxBase+3);
              idxBase += 4;
            }
          }
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geom.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,3));
    geom.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,2));
    geom.setAttribute('uv2',      new THREE.Float32BufferAttribute(uvs2,2));
    geom.setIndex(indices);
    geom.computeBoundingSphere();
    return geom;

    function quadForDir(d, x,y,z){
      // returns {p:[...12], n:[...12]} positions & normals for one unit face
      if(d.nx=== 1) return { p:[x+1,y  ,z  , x+1,y+1,z  , x+1,y+1,z+1, x+1,y  ,z+1], n:[1,0,0, 1,0,0, 1,0,0, 1,0,0] };
      if(d.nx===-1) return { p:[x  ,y  ,z  , x  ,y  ,z+1, x  ,y+1,z+1, x  ,y+1,z  ], n:[-1,0,0,-1,0,0,-1,0,0,-1,0,0] };
      if(d.ny=== 1) return { p:[x  ,y+1,z  , x  ,y+1,z+1, x+1,y+1,z+1, x+1,y+1,z  ], n:[0,1,0, 0,1,0, 0,1,0, 0,1,0] };
      if(d.ny===-1) return { p:[x  ,y  ,z  , x+1,y  ,z  , x+1,y  ,z+1, x  ,y  ,z+1], n:[0,-1,0,0,-1,0,0,-1,0,0,-1,0] };
      if(d.nz=== 1) return { p:[x  ,y  ,z+1, x+1,y  ,z+1, x+1,y+1,z+1, x  ,y+1,z+1], n:[0,0,1, 0,0,1, 0,0,1, 0,0,1] };
      /* nz=-1 */    return { p:[x  ,y  ,z  , x  ,y+1,z  , x+1,y+1,z  , x+1,y  ,z  ], n:[0,0,-1,0,0,-1,0,0,-1,0,0,-1] };
    }
  }

  // Highest solid Y at x,z (or minY-1 if none)
  topY(x,z){
    if(!this.inXZ(x,z)) return this.minY-1;
    return this.height[x + z*this.sizeX];
  }
}