// Minimal chunked voxel world w/ face culling mesher
export const BLOCK = { AIR:0, SAND:1, METAL:2 };

const DIRS = [ /* ... unchanged ... */ ];

export class VoxelWorld {
  constructor(THREE, materials, opts) { /* ... unchanged ... */ }

  serialize() {
    // 1. Serialize Voxels
    const voxelData = []; /* ... unchanged ... */

    // 2. Serialize Props
    const propData = this.props.map(prop => {
      return {
        name: prop.name.toUpperCase(), 
        position: prop.position.toArray(),
        rotation: [prop.rotation.x, prop.rotation.y, prop.rotation.z],
        materialKey: Object.keys(this.mat).find(key => this.mat[key].uuid === prop.material.uuid.substring(0, this.mat[key].uuid.length)) || // Find original material by UUID prefix (since we clone)
                     Object.keys(this.mat).find(key => this.mat[key] === prop.material), // Fallback for non-cloned (e.g. glass)
        // --- MODIFICATION: Save scale ---
        scale: prop.userData.scale || 1.0 // Default to 1.0 if not set
      };
    });

    return JSON.stringify({ voxels: voxelData, props: propData });
  }
  
  deserialize(jsonString, geoms) {
    const data = JSON.parse(jsonString);

    // 1. Clear existing world 
    /* ... unchanged ... */
    
    // 2. Load Voxels
    /* ... unchanged ... */
    
    // 3. Load Props
    for (const item of data.props) {
      const geo = geoms[item.name];
      const originalMat = this.mat[item.materialKey] || this.mat.metal; // Find original
      if (!geo || !originalMat) continue;

      // --- MODIFICATION: Clone material and apply scale ---
      let loadedMat = originalMat.clone();
      const scale = item.scale || 1.0;

      // Apply scale to maps if it's not the default
      if (scale !== 1.0 && item.name !== 'PANE') { // Don't scale glass
         const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
         maps.forEach(mapType => {
             if (loadedMat[mapType]) {
                 loadedMat[mapType] = loadedMat[mapType].clone();
                 loadedMat[mapType].repeat.set(scale, scale);
                 loadedMat[mapType].needsUpdate = true;
             }
         });
      }
      // --- END MODIFICATION ---

      const newProp = new this.THREE.Mesh(geo, loadedMat); // Use the (potentially scaled) cloned material
      newProp.position.fromArray(item.position);
      newProp.rotation.fromArray(item.rotation);
      newProp.castShadow = newProp.receiveShadow = true;
      newProp.name = item.name.toLowerCase();
      newProp.userData.scale = scale; // Store scale on loaded prop
      this.scene.add(newProp);
      this.props.push(newProp);
    }
    
    // 4. Rebuild the visual mesh for all chunks
    this.rebuildAll();
  }

  key(cx,cy,cz){ /* ... unchanged ... */ }
  toChunk(v){ /* ... unchanged ... */ }
  inXZ(x,z){ /* ... unchanged ... */ }
  getChunk(cx,cy,cz,create=false){ /* ... unchanged ... */ }
  idx(lx,ly,lz){ /* ... unchanged ... */ }
  getVoxel(x,y,z){ /* ... unchanged ... */ }
  setVoxel(x,y,z, id, rebuild=true){ /* ... unchanged ... */ }
  rebuildNeighbors(cx,cy,cz, x,y,z){ /* ... unchanged ... */ }
  rebuildAll(){ /* ... unchanged ... */ }
  rebuildChunkByKey(k){ /* ... unchanged ... */ }
  rebuildChunk(cx,cy,cz){ /* ... unchanged ... */ }
  _buildGeometryFor(c, matchId, cx,cy,cz){ /* ... unchanged ... */ }
  topY(x,z){ /* ... unchanged ... */ }
}
