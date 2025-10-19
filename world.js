import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class World {
  constructor(scene, sizeX, sizeZ, minY, maxY) {
    this.scene = scene;
    this.sizeX = sizeX;
    this.sizeZ = sizeZ;
    this.minY = minY;
    this.maxY = maxY;

    this.chunkSizeX = 16;
    this.chunkSizeY = 16;
    this.chunkSizeZ = 16;

    this.chunks = new Map();
    this.blockMeshes = [];
    this.textureLoader = new THREE.TextureLoader();

    // --- Materials ---
    this.concreteMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.85 });

    const base = this.textureLoader.load('assets/metal_albedo.png');
    base.colorSpace = THREE.SRGBColorSpace;            // correct gamma for albedo
    const normal = this.textureLoader.load('assets/metal_normal.png');
    const ao = this.textureLoader.load('assets/metal_ao.png');
    const metalnessMap = this.textureLoader.load('assets/metal_metallic.png');

    [base, normal, ao, metalnessMap].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    });

    this.metalMaterial = new THREE.MeshStandardMaterial({
      map: base,
      normalMap: normal,
      aoMap: ao,                 // NOTE: aoMap uses uv2; we’ll duplicate uv into uv2 below
      metalnessMap,
      metalness: 1.0,
      roughness: 0.35
    });

    this.materials = [null, this.concreteMaterial, this.metalMaterial];
  }

  getChunkKey(cx, cy, cz) { return `${cx},${cy},${cz}`; }

  getChunk(x, y, z) {
    const cx = Math.floor(x / this.chunkSizeX);
    const cy = Math.floor(y / this.chunkSizeY);
    const cz = Math.floor(z / this.chunkSizeZ);
    return this.chunks.get(this.getChunkKey(cx, cy, cz));
  }

  createChunk(cx, cy, cz) {
    const key = this.getChunkKey(cx, cy, cz);
    const chunk = {
      data: new Uint8Array(this.chunkSizeX * this.chunkSizeY * this.chunkSizeZ),
      dirty: true,
      meshes: []
    };
    this.chunks.set(key, chunk);
    return chunk;
  }

  localIndex(lx, ly, lz) { return ly * (this.chunkSizeX * this.chunkSizeZ) + lz * this.chunkSizeX + lx; }

  getBlock(x, y, z) {
    const cx = Math.floor(x / this.chunkSizeX);
    const cy = Math.floor(y / this.chunkSizeY);
    const cz = Math.floor(z / this.chunkSizeZ);
    const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) return 0;
    const lx = x - cx * this.chunkSizeX;
    const ly = y - cy * this.chunkSizeY;
    const lz = z - cz * this.chunkSizeZ;
    return chunk.data[this.localIndex(lx, ly, lz)];
  }

  setBlock(x, y, z, type) {
    if (x < 0 || x >= this.sizeX || y < this.minY || y >= this.maxY || z < 0 || z >= this.sizeZ) return;
    const cx = Math.floor(x / this.chunkSizeX);
    const cy = Math.floor(y / this.chunkSizeY);
    const cz = Math.floor(z / this.chunkSizeZ);
    let chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) chunk = this.createChunk(cx, cy, cz);

    const lx = x - cx * this.chunkSizeX;
    const ly = y - cy * this.chunkSizeY;
    const lz = z - cz * this.chunkSizeZ;

    const idx = this.localIndex(lx, ly, lz);
    if (chunk.data[idx] === type) return;

    chunk.data[idx] = type;
    chunk.dirty = true;

    if (lx === 0) this.markDirty(cx - 1, cy, cz);
    if (lx === this.chunkSizeX - 1) this.markDirty(cx + 1, cy, cz);
    if (ly === 0) this.markDirty(cx, cy - 1, cz);
    if (ly === this.chunkSizeY - 1) this.markDirty(cx, cy + 1, cz);
    if (lz === 0) this.markDirty(cx, cy, cz - 1);
    if (lz === this.chunkSizeZ - 1) this.markDirty(cx, cy, cz + 1);
  }

  markDirty(cx, cy, cz) {
    const c = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (c) c.dirty = true;
  }

  generate() {
    // flat floor at y=0 across sizeX × sizeZ
    for (let x = 0; x < this.sizeX; x++) {
      for (let z = 0; z < this.sizeZ; z++) {
        this.setBlock(x, 0, z, 1);
      }
    }
    this.rebuildDirtyChunks();
  }

  rebuildDirtyChunks() {
    this.chunks.forEach((chunk, key) => {
      if (chunk.dirty) {
        const [cx, cy, cz] = key.split(',').map(Number);
        this.buildChunk(cx, cy, cz);
        chunk.dirty = false;
      }
    });
  }

  buildChunk(cx, cy, cz) {
    const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) return;

    // remove old meshes
    chunk.meshes.forEach(m => {
      this.scene.remove(m);
      const idx = this.blockMeshes.indexOf(m);
      if (idx > -1) this.blockMeshes.splice(idx, 1);
      m.geometry.dispose();
    });
    chunk.meshes = [];

    const cubeFaces = [
      { normal:[ 1, 0, 0], corners:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
      { normal:[-1, 0, 0], corners:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
      { normal:[ 0, 1, 0], corners:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
      { normal:[ 0,-1, 0], corners:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
      { normal:[ 0, 0, 1], corners:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
      { normal:[ 0, 0,-1], corners:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]] }
    ];
    const quadUV = [[0,0],[0,1],[1,1],[1,0]];

    for (let type = 1; type < this.materials.length; type++) {
      const pos=[], nrm=[], uv=[], idx=[];
      for (let lx=0; lx<this.chunkSizeX; lx++) {
        for (let ly=0; ly<this.chunkSizeY; ly++) {
          for (let lz=0; lz<this.chunkSizeZ; lz++) {
            if (chunk.data[this.localIndex(lx,ly,lz)] !== type) continue;

            const gx = cx*this.chunkSizeX + lx;
            const gy = cy*this.chunkSizeY + ly;
            const gz = cz*this.chunkSizeZ + lz;

            for (const face of cubeFaces) {
              const nx = gx + face.normal[0];
              const ny = gy + face.normal[1];
              const nz = gz + face.normal[2];
              if (this.getBlock(nx, ny, nz) !== 0) continue;

              const base = pos.length/3;
              for (let i=0;i<4;i++){
                const c = face.corners[i];
                pos.push(gx+c[0], gy+c[1], gz+c[2]);
                nrm.push(...face.normal);
                uv.push(...quadUV[i]);
              }
              idx.push(base, base+1, base+2, base, base+2, base+3);
            }
          }
        }
      }

      if (pos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
        g.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm,3));
        g.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,2));
        g.setIndex(idx);
        // duplicate uv into uv2 so aoMap works
        g.setAttribute('uv2', new THREE.Float32BufferAttribute(uv.slice(), 2));

        const mesh = new THREE.Mesh(g, this.materials[type]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // keep voxels in frustum culling; works fine here
        this.scene.add(mesh);
        this.blockMeshes.push(mesh);
        chunk.meshes.push(mesh);
      }
    }
  }
}