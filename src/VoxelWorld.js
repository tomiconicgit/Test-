// src/VoxelWorld.js
// Chunked voxel storage + face-only meshing for performance
import * as THREE from 'three';
import { BLOCK } from './Blocks.js';

export class VoxelWorld {
  constructor({ chunkSize=16, heightMin=-30, heightMax=1000, worldSize=100 }) {
    this.chunkSize = chunkSize;
    this.heightMin = heightMin; // -30
    this.heightMax = heightMax; // 1000
    this.worldSize = worldSize; // 100 (x,z)
    this.chunks = new Map();    // "cx,cz" -> { meshGroup, voxels, needsRemesh }
  }

  key(cx, cz) { return `${cx},${cz}`; }

  // Convert world coords to chunk coords and local coords
  toChunk(x, y, z) {
    const cs = this.chunkSize;
    const cx = Math.floor(x / cs);
    const cz = Math.floor(z / cs);
    const lx = x - cx*cs;
    const lz = z - cz*cs;
    return { cx, cz, lx, ly: y - this.heightMin, lz };
  }

  // Allocate chunk store
  _ensureChunk(cx, cz) {
    const k = this.key(cx, cz);
    if (!this.chunks.has(k)) {
      const sizeY = this.heightMax - this.heightMin + 1; // big logical range, but we won't fill it
      const voxels = new Map(); // sparse: "x,y,z" -> blockId
      const group = new THREE.Group();
      group.name = `chunk_${k}`;
      group.matrixAutoUpdate = false;
      group.matrix.identity();
      this.chunks.set(k, { voxels, group, meshes: new Map(), needsRemesh: true });
    }
    return this.chunks.get(k);
  }

  // Initialize flat world: y<=0 filled with CONCRETE down to heightMin
  seedFlat(scene, blockLib, size=100) {
    this.scene = scene;
    this.blockLib = blockLib;
    const half = Math.floor(size/2);

    // Fill voxel data only (not geometry); geometry is built when we remesh
    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        for (let y = 0; y >= this.heightMin; y--) {
          this.setBlock(x,y,z, BLOCK.CONCRETE, false);
        }
      }
    }
    // Add chunk groups to scene
    for (const [k, chunk] of this.chunks) {
      this.scene.add(chunk.group);
    }
    // Build initial meshes
    this.remeshAll();
  }

  // Get and set blocks (sparse storage)
  getBlock(x,y,z) {
    if (y < this.heightMin || y > this.heightMax) return BLOCK.AIR;
    const { cx, cz, lx, ly, lz } = this.toChunk(x,y,z);
    const chunk = this._ensureChunk(cx,cz);
    return chunk.voxels.get(`${lx}|${y}|${lz}`) ?? BLOCK.AIR;
  }

  setBlock(x,y,z, id, doRemesh=true) {
    if (y < this.heightMin || y > this.heightMax) return;
    const { cx, cz, lx, ly, lz } = this.toChunk(x,y,z);
    const chunk = this._ensureChunk(cx,cz);
    const key = `${lx}|${y}|${lz}`;
    if (id === BLOCK.AIR) {
      chunk.voxels.delete(key);
    } else {
      chunk.voxels.set(key, id);
    }
    chunk.needsRemesh = true;
    if (doRemesh) this.remeshChunk(cx,cz);
  }

  remeshAll() {
    for (const [k] of this.chunks) {
      const [cx,cz] = k.split(',').map(Number);
      this.remeshChunk(cx,cz);
    }
  }

  // Build face geometry per material for this chunk
  remeshChunk(cx,cz) {
    const chunk = this._ensureChunk(cx,cz);
    if (!chunk.needsRemesh) return;
    chunk.needsRemesh = false;

    // Remove old meshes
    for (const m of chunk.meshes.values()) {
      chunk.group.remove(m);
      m.geometry.dispose();
    }
    chunk.meshes.clear();

    // Accumulators per blockId: positions, normals, uvs, uv2, indices
    const accum = new Map();

    const cs = this.chunkSize;
    // Determine world xz bounds for this chunk within worldSize
    const half = Math.floor(this.worldSize/2);
    const x0 = cx*cs, x1 = x0 + cs;
    const z0 = cz*cs, z1 = z0 + cs;

    // Skip chunks completely outside 100x100 area
    if (x1 < -half || x0 >= half || z1 < -half || z0 >= half) return;

    // Directions (px,nx,py,ny,pz,nz)
    const dirs = [
      { n:[ 1, 0, 0], u:[0,0,1], v:[0,1,0] }, // +x
      { n:[-1, 0, 0], u:[0,0,-1], v:[0,1,0] },// -x
      { n:[ 0, 1, 0], u:[1,0,0], v:[0,0,1] }, // +y
      { n:[ 0,-1, 0], u:[1,0,0], v:[0,0,-1] },// -y
      { n:[ 0, 0, 1], u:[1,0,0], v:[0,1,0] }, // +z
      { n:[ 0, 0,-1], u:[-1,0,0], v:[0,1,0] },// -z
    ];

    // Iterate visible voxels in this chunk's world bounds, but only over y where we have data
    // For performance we only scan y in [heightMin..0] plus a small headroom
    for (let x = Math.max(x0, -half); x < Math.min(x1, half); x++) {
      for (let z = Math.max(z0, -half); z < Math.min(z1, half); z++) {
        // Quick column presence check: if nothing at y=0 and -1, skip fast path (but digging can add)
        for (let y = 0; y >= this.heightMin; y--) {
          const id = this.getBlock(x,y,z);
          if (id === BLOCK.AIR) continue;

          for (let f = 0; f < 6; f++) {
            const d = dirs[f];
            const nx = x + d.n[0], ny = y + d.n[1], nz = z + d.n[2];
            const neighbor = this.getBlock(nx,ny,nz);
            if (neighbor !== BLOCK.AIR) continue; // face hidden

            // Create face quad
            let pack = accum.get(id);
            if (!pack) {
              pack = { p:[], n:[], u:[], u2:[], idx:[], count:0 };
              accum.set(id, pack);
            }
            const { p,n,u,u2,idx } = pack;

            // Build 4 corners of the face (centered cube, unit size)
            // Face origin at (x,y,z), offset half along normal to sit on block boundary
            const ox = x + 0.5*d.n[0];
            const oy = y + 0.5*d.n[1];
            const oz = z + 0.5*d.n[2];
            const ux = d.u[0]*0.5, uy = d.u[1]*0.5, uz = d.u[2]*0.5;
            const vx = d.v[0]*0.5, vy = d.v[1]*0.5, vz = d.v[2]*0.5;

            const i0 = pack.count;
            const verts = [
              [ox - ux - vx, oy - uy - vy, oz - uz - vz],
              [ox + ux - vx, oy + uy - vy, oz + uz - vz],
              [ox + ux + vx, oy + uy + vy, oz + uz + vz],
              [ox - ux + vx, oy - uy + vy, oz - uz + vz],
            ];
            for (const vtx of verts) {
              p.push(vtx[0], vtx[1], vtx[2]);
              n.push(d.n[0], d.n[1], d.n[2]);
            }
            // UVs
            u.push(0,0, 1,0, 1,1, 0,1);
            // uv2 duplicates for aoMap
            u2.push(0,0, 1,0, 1,1, 0,1);
            idx.push(i0+0, i0+1, i0+2, i0+0, i0+2, i0+3);
            pack.count += 4;
          }
        }
      }
    }

    // Build meshes for each blockId
    for (const [id, pack] of accum) {
      if (pack.count === 0) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pack.p, 3));
      g.setAttribute('normal',   new THREE.Float32BufferAttribute(pack.n, 3));
      g.setAttribute('uv',       new THREE.Float32BufferAttribute(pack.u, 2));
      g.setAttribute('uv2',      new THREE.Float32BufferAttribute(pack.u2, 2));
      g.setIndex(pack.idx);

      const matGeom = this._materialFor(id);
      const mesh = new THREE.Mesh(g, matGeom.material);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;

      chunk.group.add(mesh);
      chunk.meshes.set(id, mesh);
    }
  }

  _materialFor(id) {
    if (id === BLOCK.CONCRETE) return this.blockLib.materials[id];
    if (id === BLOCK.METAL)     return this.blockLib.materials[id];
    // fallback
    return this.blockLib.materials[BLOCK.CONCRETE];
  }
}