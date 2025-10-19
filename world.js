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

    // Materials
    this.concreteMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a8a8a,
      roughness: 0.7,
      metalness: 0.0,
      emissive: 0x111111,          // never looks fully black
      emissiveIntensity: 0.35
    });

    const albedo = this.textureLoader.load('assets/metal_albedo.png');
    albedo.colorSpace = THREE.SRGBColorSpace;
    const normal = this.textureLoader.load('assets/metal_normal.png');
    const ao     = this.textureLoader.load('assets/metal_ao.png');
    const metal  = this.textureLoader.load('assets/metal_metallic.png');

    [albedo, normal, ao, metal].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });

    this.metalMaterial = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      aoMap: ao,                 // needs uv2 (we duplicate below)
      metalnessMap: metal,
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
    const chunk = { data: new Uint8Array(this.chunkSizeX*this.chunkSizeY*this.chunkSizeZ), dirty: true, meshes: [] };
    this.chunks.set(key, chunk);
    return chunk;
  }

  localIndex(lx, ly, lz) { return ly*(this.chunkSizeX*this.chunkSizeZ) + lz*this.chunkSizeX + lx; }

  getBlock(x, y, z) {
    const cx = Math.floor(x / this.chunkSizeX);
    const cy = Math.floor(y / this.chunkSizeY);
    const cz = Math.floor(z / this.chunkSizeZ);
    const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) return 0;
    const lx = x - cx*this.chunkSizeX;
    const ly = y - cy*this.chunkSizeY;
    const lz = z - cz*this.chunkSizeZ;
    return chunk.data[this.localIndex(lx, ly, lz)];
  }

  setBlock(x, y, z, type) {
    if (x < 0 || x >= this.sizeX || y < this.minY || y >= this.maxY || z < 0 || z >= this.sizeZ) return;
    const cx = Math.floor(x / this.chunkSizeX);
    const cy = Math.floor(y / this.chunkSizeY);
    const cz = Math.floor(z / this.chunkSizeZ);
    let chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) chunk = this.createChunk(cx, cy, cz);

    const lx = x - cx*this.chunkSizeX;
    const ly = y - cy*this.chunkSizeY;
    const lz = z - cz*this.chunkSizeZ;
    const idx = this.localIndex(lx, ly, lz);

    if (chunk.data[idx] === type) return;
    chunk.data[idx] = type;
    chunk.dirty = true;

    if (lx === 0) this.markDirty(cx-1, cy, cz);
    if (lx === this.chunkSizeX-1) this.markDirty(cx+1, cy, cz);
    if (ly === 0) this.markDirty(cx, cy-1, cz);
    if (ly === this.chunkSizeY-1) this.markDirty(cx, cy+1, cz);
    if (lz === 0) this.markDirty(cx, cy, cz-1);
    if (lz === this.chunkSizeZ-1) this.markDirty(cx, cy, cz+1);
  }

  markDirty(cx, cy, cz) { const c = this.chunks.get(this.getChunkKey(cx, cy, cz)); if (c) c.dirty = true; }

  generate() {
    // flat floor at y=0
    for (let x=0; x<this.sizeX; x++) for (let z=0; z<this.sizeZ; z++) this.setBlock(x, 0, z, 1);
    this.rebuildDirtyChunks();
  }

  rebuildDirtyChunks() {
    this.chunks.forEach((chunk, key) => {
      if (!chunk.dirty) return;
      const [cx, cy, cz] = key.split(',').map(Number);
      this.buildChunk(cx, cy, cz);
      chunk.dirty = false;
    });
  }

  buildChunk(cx, cy, cz) {
    const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) return;

    // remove old
    chunk.meshes.forEach(m => {
      this.scene.remove(m);
      const i = this.blockMeshes.indexOf(m);
      if (i > -1) this.blockMeshes.splice(i, 1);
      m.geometry.dispose();
    });
    chunk.meshes = [];

    const faces = [
      { n:[ 1,0,0], c:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
      { n:[-1,0,0], c:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
      { n:[ 0,1,0], c:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
      { n:[ 0,-1,0],c:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
      { n:[ 0,0,1], c:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
      { n:[ 0,0,-1],c:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]] }
    ];
    const uv4 = [[0,0],[0,1],[1,1],[1,0]];

    for (let type=1; type<this.materials.length; type++) {
      const pos=[], nrm=[], uv=[], idx=[];
      for (let lx=0; lx<this.chunkSizeX; lx++){
        for (let ly=0; ly<this.chunkSizeY; ly++){
          for (let lz=0; lz<this.chunkSizeZ; lz++){
            if (chunk.data[this.localIndex(lx,ly,lz)] !== type) continue;

            const gx = cx*this.chunkSizeX + lx;
            const gy = cy*this.chunkSizeY + ly;
            const gz = cz*this.chunkSizeZ + lz;

            for (const f of faces){
              const nx = gx + f.n[0], ny = gy + f.n[1], nz = gz + f.n[2];
              if (this.getBlock(nx,ny,nz) !== 0) continue;

              const base = pos.length/3;
              for (let i=0;i<4;i++){
                const c = f.c[i];
                pos.push(gx+c[0], gy+c[1], gz+c[2]);
                nrm.push(...f.n);
                uv.push(...uv4[i]);
              }
              idx.push(base, base+1, base+2, base, base+2, base+3);
            }
          }
        }
      }

      if (pos.length){
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
        g.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm,3));
        g.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,2));
        g.setAttribute('uv2',      new THREE.Float32BufferAttribute(uv.slice(),2)); // for aoMap
        g.setIndex(idx);

        const mesh = new THREE.Mesh(g, this.materials[type]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.blockMeshes.push(mesh);
        chunk.meshes.push(mesh);
      }
    }
  }
}