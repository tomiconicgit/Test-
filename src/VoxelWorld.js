// src/VoxelWorld.js
import * as THREE from 'three';
import { BLOCK } from './Blocks.js';

export class VoxelWorld {
  constructor({ chunkSize=16, heightMin=-30, heightMax=1000, worldSize=100 }) {
    this.chunkSize = chunkSize;
    this.heightMin = heightMin;
    this.heightMax = heightMax;
    this.worldSize = worldSize;
    this.chunks = new Map();  // "cx,cz" -> { voxels, group, meshes, needsRemesh }
    this.blockLib = null;
    this.scene = null;
  }

  key(cx, cz){ return `${cx},${cz}`; }

  toChunk(x,y,z){
    const cs=this.chunkSize;
    const cx=Math.floor(x/cs), cz=Math.floor(z/cs);
    const lx=x - cx*cs, lz=z - cz*cs;
    return { cx, cz, lx, ly: y - this.heightMin, lz };
  }

  _ensureChunk(cx,cz){
    const k=this.key(cx,cz);
    if(!this.chunks.has(k)){
      const voxels=new Map();
      const group=new THREE.Group();
      group.name=`chunk_${k}`;
      group.matrixAutoUpdate=false;
      group.matrix.identity();
      this.chunks.set(k,{ voxels, group, meshes:new Map(), needsRemesh:true });
      if(this.scene) this.scene.add(group);
    }
    return this.chunks.get(k);
  }

  // Fill 100×100 area from y=0 down to heightMin with CONCRETE
  seedFlat(scene, blockLib, size=100){
    this.scene=scene; this.blockLib=blockLib;
    const half=Math.floor(size/2);
    for(let x=-half;x<half;x++){
      for(let z=-half;z<half;z++){
        for(let y=0;y>=this.heightMin;y--){
          this.setBlock(x,y,z,BLOCK.CONCRETE,false);
        }
      }
    }
    for(const [,chunk] of this.chunks) if(!chunk.group.parent) this.scene.add(chunk.group);
    this.remeshAll();
  }

  getBlock(x,y,z){
    if(y<this.heightMin||y>this.heightMax) return BLOCK.AIR;
    const {cx,cz,lx,lz}=this.toChunk(x,y,z);
    const chunk=this._ensureChunk(cx,cz);
    return chunk.voxels.get(`${lx}|${y}|${lz}`) ?? BLOCK.AIR;
  }

  setBlock(x,y,z,id,doRemesh=true){
    if(y<this.heightMin||y>this.heightMax) return;
    const {cx,cz,lx,lz}=this.toChunk(x,y,z);
    const chunk=this._ensureChunk(cx,cz);
    const key=`${lx}|${y}|${lz}`;
    if(id===BLOCK.AIR) chunk.voxels.delete(key); else chunk.voxels.set(key,id);
    chunk.needsRemesh=true;
    if(doRemesh) this.remeshChunk(cx,cz);
  }

  remeshAll(){
    for(const k of this.chunks.keys()){
      const [cx,cz]=k.split(',').map(Number);
      this.remeshChunk(cx,cz);
    }
  }

  remeshChunk(cx,cz){
    const chunk=this._ensureChunk(cx,cz);
    if(!chunk.needsRemesh) return;
    chunk.needsRemesh=false;

    // clear old
    for(const m of chunk.meshes.values()){ chunk.group.remove(m); m.geometry.dispose(); }
    chunk.meshes.clear();

    const accum=new Map(); // id -> {p,n,u,u2,idx,count}
    const cs=this.chunkSize, half=Math.floor(this.worldSize/2);

    const dirs=[
      { n:[ 1,0,0], u:[0,0,1], v:[0,1,0] }, { n:[-1,0,0], u:[0,0,-1], v:[0,1,0] },
      { n:[ 0,1,0], u:[1,0,0], v:[0,0,1] }, { n:[ 0,-1,0],u:[1,0,0], v:[0,0,-1]},
      { n:[ 0,0,1], u:[1,0,0], v:[0,1,0] }, { n:[ 0,0,-1],u:[-1,0,0],v:[0,1,0] },
    ];

    for (const [key, id] of chunk.voxels.entries()) {
      if (id === BLOCK.AIR) continue;

      const [lx, y, lz] = key.split('|').map(Number);
      const x = cx * cs + lx;
      const z = cz * cs + lz;

      if (x < -half || x >= half || z < -half || z >= half) continue;

      for (let f = 0; f < 6; f++) {
        const d = dirs[f];
        const nx = x + d.n[0], ny = y + d.n[1], nz = z + d.n[2];
        if (this.getBlock(nx, ny, nz) !== BLOCK.AIR) continue;

        let pack = accum.get(id);
        if (!pack) {
          pack = { p: [], n: [], u: [], u2: [], idx: [], count: 0 };
          accum.set(id, pack);
        }
        const { p, n, u, u2, idx } = pack;

        const ox = x + 0.5 * d.n[0], oy = y + 0.5 * d.n[1], oz = z + 0.5 * d.n[2];
        const ux = d.u[0] * 0.5, uy = d.u[1] * 0.5, uz = d.u[2] * 0.5;
        const vx = d.v[0] * 0.5, vy = d.v[1] * 0.5, vz = d.v[2] * 0.5;

        const base = pack.count;
        const verts = [
          [ox - ux - vx, oy - uy - vy, oz - uz - vz],
          [ox + ux - vx, oy + uy - vy, oz + uz - vz],
          [ox + ux + vx, oy + uy + vy, oz + uz + vz],
          [ox - ux + vx, oy - uy + vy, oz - uz + vz],
        ];
        for (const vv of verts) { p.push(vv[0], vv[1], vv[2]); n.push(d.n[0], d.n[1], d.n[2]); }
        u.push(0, 0, 1, 0, 1, 1, 0, 1); u2.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(base + 0, base + 1, base + 2, base + 0, base + 2, base + 3);
        pack.count += 4;
      }
    }

    for(const [id,pack] of accum){
      if(!pack.count) continue;
      const g=new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pack.p,3));
      g.setAttribute('normal',   new THREE.Float32BufferAttribute(pack.n,3));
      g.setAttribute('uv',       new THREE.Float32BufferAttribute(pack.u,2));
      g.setAttribute('uv2',      new THREE.Float32BufferAttribute(pack.u2,2));
      g.setIndex(pack.idx);

      const matGeom=this._materialFor(id);
      const mesh=new THREE.Mesh(g, matGeom.material);
      mesh.receiveShadow=true;
      mesh.frustumCulled=true;

      chunk.group.add(mesh);
      chunk.meshes.set(id, mesh);
    }
  }

  _materialFor(id){
    const mats=this.blockLib?.materials;
    if(!mats) return { material:new THREE.MeshStandardMaterial({color:0xff00ff}) };
    return mats[id] || mats[BLOCK.CONCRETE];
  }
}
