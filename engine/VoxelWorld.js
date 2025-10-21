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
    this.mat = materials; // Store the original materials map
    this.sizeX = opts.sizeX;
    this.sizeZ = opts.sizeZ;
    this.minY = opts.minY;
    this.maxY = opts.maxY;
    this.chunkSize = 16;
    this.props = [];
    this.chunks = new Map();
    this.scene = opts.scene;
    this.height = new Int16Array(this.sizeX * this.sizeZ).fill(this.minY-1);

    // Initialize base sand layer
    for (let x=0; x<this.sizeX; x++){
      for(let z=0; z<this.sizeZ; z++){
        for(let y=this.minY; y<=0; y++) this.setVoxel(x,y,z, BLOCK.SAND, false);
        this.height[x + z*this.sizeX] = 0;
      }
    }
    this.rebuildAll();
  }

  serialize() {
    // 1. Serialize Voxels
    const voxelData = [];
    for (const [key, chunk] of this.chunks.entries()) {
      // Check if chunk contains non-AIR and non-SAND blocks, or if it's below y=0 (could be modified sand)
      let shouldSave = chunk.cy < 0; // Always save chunks below y=0
      if (!shouldSave) {
          for(let i=0; i < chunk.data.length; ++i) {
              if (chunk.data[i] !== BLOCK.AIR && chunk.data[i] !== BLOCK.SAND) {
                  shouldSave = true;
                  break;
              }
          }
      }

      if (shouldSave) {
        voxelData.push({
          key: key,
          data: Array.from(chunk.data) // Convert Uint16Array for JSON
        });
      }
    }

    // 2. Serialize Props
    const propData = this.props.map(prop => {
      return {
        name: prop.name.toUpperCase(),
        position: prop.position.toArray(),
        rotation: [prop.rotation.x, prop.rotation.y, prop.rotation.z],
        // --- Read material key directly from userData ---
        materialKey: prop.userData.materialKey || 'metal', // Use stored key
        scale: prop.userData.scale || 1.0
      };
    });

    return JSON.stringify({ voxels: voxelData, props: propData });
  }

  deserialize(jsonString, geoms) {
    const data = JSON.parse(jsonString);

    // 1. Clear existing world (voxels and props)
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.traverse(o => {
            // Check if it's safe to dispose geometry
            if (o.geometry && !Object.values(geoms).includes(o.geometry)) {
                 o.geometry.dispose();
            }
            // Check if it's safe to dispose material (not shared base materials)
            if (o.material && !Object.values(this.mat).includes(o.material)) {
                const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
                maps.forEach(mapType => {
                   if (o.material[mapType]) o.material[mapType].dispose();
                });
                o.material.dispose();
            }
        });
      }
    }
    this.chunks.clear();

    for (const prop of this.props) {
      this.scene.remove(prop);
      // Geometries are shared, materials might be cloned - dispose cloned materials
       if (prop.material && !Object.values(this.mat).includes(prop.material)) {
            const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
            maps.forEach(mapType => {
               if (prop.material[mapType]) prop.material[mapType].dispose();
            });
           prop.material.dispose();
       }
    }
    this.props.length = 0; // Clear the props array

    // Reset height map before loading voxels
    this.height.fill(this.minY - 1);

    // 2. Load Voxels
    for (const item of data.voxels) {
      const [cx, cy, cz] = item.key.split(',').map(Number);
      const chunk = this.getChunk(cx, cy, cz, true);
      chunk.data.set(item.data);

      // Update heightmap based on loaded chunk data
      const cs = this.chunkSize;
      for (let ly = 0; ly < cs; ++ly) {
        for (let lz = 0; lz < cs; ++lz) {
          for (let lx = 0; lx < cs; ++lx) {
            const blockId = chunk.data[this.idx(lx, ly, lz)];
            if (blockId !== BLOCK.AIR) {
              const wx = cx * cs + lx;
              const wy = cy * cs + ly;
              const wz = cz * cs + lz;
              if (this.inXZ(wx, wz)) {
                 const heightIdx = wx + wz * this.sizeX;
                 if (wy > this.height[heightIdx]) {
                     this.height[heightIdx] = wy;
                 }
              }
            }
          }
        }
      }
    }

    // Ensure base sand layer exists and update heightmap AFTER loading saved chunks
    for (let x = 0; x < this.sizeX; x++) {
        for (let z = 0; z < this.sizeZ; z++) {
            let groundSet = false;
            for (let y = 0; y >= this.minY; y--) { // Check downwards from y=0
                if (this.getVoxel(x, y, z) !== BLOCK.AIR) {
                    groundSet = true;
                    // Ensure heightmap reflects the highest non-air block at or below y=0
                    const heightIdx = x + z * this.sizeX;
                     if (this.height[heightIdx] < y) {
                         this.height[heightIdx] = y;
                     }
                    break;
                }
            }
             // If no ground was found (e.g., hole dug below y=0), set base sand and heightmap
             if (!groundSet) {
                 for(let y=this.minY; y<=0; y++) {
                     this.setVoxel(x, y, z, BLOCK.SAND, false); // Set without triggering immediate rebuild
                 }
                 const heightIdx = x + z * this.sizeX;
                 this.height[heightIdx] = 0;
             }
        }
    }


    // 3. Load Props
    for (const item of data.props) {
      const geo = geoms[item.name];
      const originalMat = this.mat[item.materialKey] || this.mat.metal; // Find original
      if (!geo || !originalMat) {
        console.warn(`Skipping prop: Unknown geometry '${item.name}' or material '${item.materialKey}'`);
        continue;
      }

      let loadedMat = originalMat; // Default to original
      const scale = item.scale || 1.0;

      // Clone and apply scale if not default AND not glass
      if (scale !== 1.0 && item.materialKey !== 'glass') {
         loadedMat = originalMat.clone();
         const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
         maps.forEach(mapType => {
             if (loadedMat[mapType]) {
                 loadedMat[mapType] = loadedMat[mapType].clone();
                 loadedMat[mapType].repeat.set(scale, scale);
                 loadedMat[mapType].needsUpdate = true;
             }
         });
      }

      const newProp = new this.THREE.Mesh(geo, loadedMat);
      newProp.position.fromArray(item.position);
      newProp.rotation.fromArray(item.rotation);
      newProp.castShadow = newProp.receiveShadow = true;
      newProp.name = item.name.toLowerCase();
      newProp.userData.materialKey = item.materialKey; // Store original key
      newProp.userData.scale = scale;
      this.scene.add(newProp);
      this.props.push(newProp);
    }

    // 4. Rebuild the visual mesh for all chunks
    this.rebuildAll(); // Rebuild after all voxels/props are loaded
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
    // If chunk doesn't exist, determine if it's default sand or air
    if(!c) {
      if(this.inXZ(x,z) && y >= this.minY && y <= 0) return BLOCK.SAND;
      return BLOCK.AIR;
    }
    const lx = x-cx*this.chunkSize, ly = y-cy*this.chunkSize, lz = z-cz*this.chunkSize;
    // Check local coordinates are valid (should always be if chunk exists)
    if(lx<0||ly<0||lz<0||lx>=this.chunkSize||ly>=this.chunkSize||lz>=this.chunkSize) {
        console.error("Invalid local coordinates in getVoxel");
        return BLOCK.AIR; // Error case
    }
    return c.data[this.idx(lx,ly,lz)];
  }

  setVoxel(x,y,z, id, rebuild=true){
    // Ensure coordinates are within world bounds for setting
    if (!this.inXZ(x,z) || y < this.minY || y > this.maxY) {
        // console.warn(`Attempted to set voxel outside bounds: (${x},${y},${z})`);
        return;
    }

    const cx=this.toChunk(x), cy=this.toChunk(y), cz=this.toChunk(z);
    // Always create chunk if setting a non-air block
    const createChunk = id !== BLOCK.AIR;
    const c = this.getChunk(cx,cy,cz, createChunk);
    // If trying to set AIR in a non-existent chunk, do nothing
    if (!c && id === BLOCK.AIR) return;

    const lx = x - cx*this.chunkSize, ly = y - cy*this.chunkSize, lz = z - cz*this.chunkSize;
    const dataIdx = this.idx(lx, ly, lz);
    const oldId = c.data[dataIdx];

    // Only update and rebuild if the block ID actually changes
    if (oldId !== id) {
        c.data[dataIdx] = id;

        // Update height map
        const heightIdx = x + z * this.sizeX;
        if (id !== BLOCK.AIR && y > this.height[heightIdx]) {
            this.height[heightIdx] = y;
        } else if (id === BLOCK.AIR && y === this.height[heightIdx]) {
            // Find the next highest block downwards
            let ny = y - 1;
            while (ny >= this.minY && this.getVoxel(x, ny, z) === BLOCK.AIR) {
                ny--;
            }
             // Ensure sand base level height is maintained correctly
             if (ny < 0 && this.getVoxel(x, 0, z) === BLOCK.SAND) {
                 this.height[heightIdx] = 0;
             } else {
                 this.height[heightIdx] = Math.max(this.minY - 1, ny);
             }
        }

        if(rebuild) this.rebuildNeighbors(cx,cy,cz, x,y,z);
    }
  }

  rebuildNeighbors(cx,cy,cz, x,y,z){
    const near = new Set([this.key(cx,cy,cz)]);
    const lx = x - cx*this.chunkSize;
    const ly = y - cy*this.chunkSize;
    const lz = z - cz*this.chunkSize;
    const cs = this.chunkSize;

    // Check boundaries and add neighbors to the rebuild set
    if(lx===0) near.add(this.key(cx-1,cy,cz));
    if(lx===cs-1) near.add(this.key(cx+1,cy,cz));
    if(ly===0) near.add(this.key(cx,cy-1,cz));
    if(ly===cs-1) near.add(this.key(cx,cy+1,cz));
    if(lz===0) near.add(this.key(cx,cy,cz-1));
    if(lz===cs-1) near.add(this.key(cx,cy,cz+1));

    for(const k of near) this.rebuildChunkByKey(k);
  }

 rebuildAll(){
    // Clear existing meshes first to avoid duplicates
    const existingMeshes = [];
    for (const chunk of this.chunks.values()) {
        if (chunk.mesh) {
            existingMeshes.push(chunk.mesh);
            chunk.mesh = null; // Clear reference
        }
    }
    existingMeshes.forEach(mesh => {
        this.scene.remove(mesh);
        mesh.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            // Don't dispose shared materials here
        });
    });


    // Rebuild based on current voxel data
    const cxMin=0, cxMax=Math.floor((this.sizeX-1)/this.chunkSize);
    const czMin=0, czMax=Math.floor((this.sizeZ-1)/this.chunkSize);
    // Determine actual min/max Y chunks based on loaded data + default sand
    let actualMinY = 0;
    let actualMaxY = 0;
    for (const key of this.chunks.keys()) {
        const [, cy,] = key.split(',').map(Number);
        actualMinY = Math.min(actualMinY, cy);
        actualMaxY = Math.max(actualMaxY, cy);
    }
    actualMinY = Math.min(actualMinY, this.toChunk(this.minY)); // Include default sand range
    actualMaxY = Math.max(actualMaxY, 0); // Include default sand range

    for(let cx=cxMin; cx<=cxMax; cx++){
        for(let cz=czMin; cz<=czMax; cz++){
            // Iterate only through relevant Y chunks
            for(let cy=actualMinY; cy<=actualMaxY; cy++) {
                // Only rebuild chunks that exist or are part of the base sand layer
                if (this.chunks.has(this.key(cx,cy,cz)) || cy <= 0) {
                     this.rebuildChunk(cx,cy,cz);
                }
            }
        }
    }
  }

  rebuildChunkByKey(k){
      const parts = k.split(',');
      if (parts.length === 3) {
          const [cx,cy,cz] = parts.map(Number);
          this.rebuildChunk(cx,cy,cz);
      } else {
          console.error("Invalid chunk key for rebuild:", k);
      }
   }

  rebuildChunk(cx,cy,cz){
    const c = this.getChunk(cx,cy,cz,false); // Don't create if it doesn't exist

    // If a mesh already exists for this chunk coordinate, remove it first
    const existingMesh = this.scene.getObjectByName(`chunk_${cx}_${cy}_${cz}`);
     if (existingMesh) {
         this.scene.remove(existingMesh);
         existingMesh.traverse(o => {
             if (o.geometry) o.geometry.dispose();
             // Don't dispose shared materials
         });
         // If the chunk exists in our map, clear its mesh reference
         if (c) c.mesh = null;
     } else if (c && c.mesh) {
        // If mesh wasn't found by name but exists on chunk, remove it
        this.scene.remove(c.mesh);
         c.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
         c.mesh = null;
     }

    const gSand = this._buildGeometryFor(c, BLOCK.SAND, cx,cy,cz);
    const gMetal = this._buildGeometryFor(c, BLOCK.METAL, cx,cy,cz);

    // Only create a group if there's geometry to add
    if (gSand.getIndex().count > 0 || gMetal.getIndex().count > 0) {
        const group = new this.THREE.Group();
        group.name = `chunk_${cx}_${cy}_${cz}`; // Name the group for easier removal

        const mk = (geom, mat) => {
          if(!geom || geom.getIndex().count===0) return;
          const m = new this.THREE.Mesh(geom, mat);
          m.castShadow = false; m.receiveShadow = true;
          group.add(m);
        };
        mk(gSand, this.mat.sand);
        mk(gMetal, this.mat.metal);

        group.frustumCulled = true;
        this.scene.add(group);
        // Ensure chunk exists if we created a mesh, and assign the mesh
        this.getChunk(cx,cy,cz,true).mesh = group;
    } else if (c) {
        // If the chunk exists but now has no geometry, ensure its mesh reference is null
        c.mesh = null;
    }
  }


 _buildGeometryFor(c, matchId, cx, cy, cz) {
    const THREE = this.THREE;
    const positions = [], normals = [], uvs = [], indices = [], uvs2 = [];
    let idxBase = 0;
    const cs = this.chunkSize;
    const startX = cx * cs, startY = cy * cs, startZ = cz * cs;

    for (let ly = 0; ly < cs; ly++) {
        for (let lz = 0; lz < cs; lz++) {
            for (let lx = 0; lx < cs; lx++) {
                const worldX = startX + lx;
                const worldY = startY + ly;
                const worldZ = startZ + lz;

                // Use getVoxel which handles chunk existence and default sand
                const blockId = this.getVoxel(worldX, worldY, worldZ);

                if (blockId !== matchId) continue;

                // Check neighbors using getVoxel
                for (const d of DIRS) {
                    const neighborId = this.getVoxel(worldX + d.dx, worldY + d.dy, worldZ + d.dz);
                    if (neighborId === BLOCK.AIR) { // Check if neighbor is AIR
                        const face = quadForDir(d, worldX, worldY, worldZ);
                        positions.push(...face.p);
                        normals.push(...face.n);
                        // Simple UV mapping (full face)
                        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
                        uvs2.push(0, 0, 1, 0, 1, 1, 0, 1); // Use same UVs for aoMap
                        indices.push(idxBase, idxBase + 1, idxBase + 2, idxBase, idxBase + 2, idxBase + 3);
                        idxBase += 4;
                    }
                }
            }
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs2, 2)); // For aoMap
    geom.setIndex(indices);
    if (indices.length > 0) {
        geom.computeBoundingSphere();
    }
    return geom;

    // quadForDir remains the same
    function quadForDir(d,x,y,z){if(d.nx===1)return{p:[x+1,y,z,x+1,y+1,z,x+1,y+1,z+1,x+1,y,z+1],n:[1,0,0,1,0,0,1,0,0,1,0,0]};if(d.nx===-1)return{p:[x,y,z,x,y,z+1,x,y+1,z+1,x,y+1,z],n:[-1,0,0,-1,0,0,-1,0,0,-1,0,0]};if(d.ny===1)return{p:[x,y+1,z,x,y+1,z+1,x+1,y+1,z+1,x+1,y+1,z],n:[0,1,0,0,1,0,0,1,0,0,1,0]};if(d.ny===-1)return{p:[x,y,z,x+1,y,z,x+1,y,z+1,x,y,z+1],n:[0,-1,0,0,-1,0,0,-1,0,0,-1,0]};if(d.nz===1)return{p:[x,y,z+1,x+1,y,z+1,x+1,y+1,z+1,x,y+1,z+1],n:[0,0,1,0,0,1,0,0,1,0,0,1]};return{p:[x,y,z,x,y+1,z,x+1,y+1,z,x+1,y,z],n:[0,0,-1,0,0,-1,0,0,-1,0,0,-1]};}
  }


  topY(x,z){
      if(!this.inXZ(x,z)) return this.minY-1;
      // Ensure height map calculation is robust after load
      const heightIdx = x + z * this.sizeX;
      let calculatedHeight = this.minY -1;
      for (let y = this.maxY; y >= this.minY; --y) {
           if (this.getVoxel(x,y,z) !== BLOCK.AIR) {
               calculatedHeight = y;
               break;
           }
      }
       // Update the stored height if it's different (e.g., after loading)
       if (this.height[heightIdx] !== calculatedHeight) {
          // console.log(`Correcting heightmap at (${x},${z}) from ${this.height[heightIdx]} to ${calculatedHeight}`);
          this.height[heightIdx] = calculatedHeight;
       }
      return this.height[heightIdx];
  }

}
