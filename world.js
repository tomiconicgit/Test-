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
        this.concreteMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 });

        this.metalMaterial = new THREE.MeshStandardMaterial({
            map: this.textureLoader.load('assets/metal_albedo.png'),
            normalMap: this.textureLoader.load('assets/metal_normal.png'),
            aoMap: this.textureLoader.load('assets/metal_ao.png'),
            metalnessMap: this.textureLoader.load('assets/metal_metallic.png'),
            metalness: 1.0,
            roughness: 0.4
        });
        
        [this.concreteMaterial, this.metalMaterial].forEach(mat => {
            if (mat.map) {
                mat.map.wrapS = THREE.RepeatWrapping;
                mat.map.wrapT = THREE.RepeatWrapping;
            }
        });

        this.materials = [null, this.concreteMaterial, this.metalMaterial];
    }

    getChunkKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }

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

    localIndex(lx, ly, lz) {
        return ly * (this.chunkSizeX * this.chunkSizeZ) + lz * this.chunkSizeX + lx;
    }

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
        
        if (chunk.data[this.localIndex(lx, ly, lz)] === type) return;

        chunk.data[this.localIndex(lx, ly, lz)] = type;
        chunk.dirty = true;
        
        if (lx === 0) this.markDirty(cx - 1, cy, cz);
        if (lx === this.chunkSizeX - 1) this.markDirty(cx + 1, cy, cz);
        if (ly === 0) this.markDirty(cx, cy - 1, cz);
        if (ly === this.chunkSizeY - 1) this.markDirty(cx, cy + 1, cz);
        if (lz === 0) this.markDirty(cx, cy, cz - 1);
        if (lz === this.chunkSizeZ - 1) this.markDirty(cx, cy, cz + 1);
    }

    markDirty(cx, cy, cz) {
        const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
        if (chunk) chunk.dirty = true;
    }

    generate() {
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

        chunk.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            const index = this.blockMeshes.indexOf(mesh);
            if (index > -1) this.blockMeshes.splice(index, 1);
            mesh.geometry.dispose();
        });
        chunk.meshes = [];

        const cubeFaces = [
            { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
            { normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
            { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
            { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
            { normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
            { normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
        ];
        const uvsForQuad = [[0, 0], [0, 1], [1, 1], [1, 0]];

        for (let type = 1; type < this.materials.length; type++) {
            const positions = [], normals = [], uvs = [], indices = [];

            for (let lx = 0; lx < this.chunkSizeX; lx++) {
                for (let ly = 0; ly < this.chunkSizeY; ly++) {
                    for (let lz = 0; lz < this.chunkSizeZ; lz++) {
                        if (chunk.data[this.localIndex(lx, ly, lz)] === type) {
                            const gx = cx * this.chunkSizeX + lx;
                            const gy = cy * this.chunkSizeY + ly;
                            const gz = cz * this.chunkSizeZ + lz;

                            cubeFaces.forEach(face => {
                                const nx = gx + face.normal[0];
                                const ny = gy + face.normal[1];
                                const nz = gz + face.normal[2];
                                if (this.getBlock(nx, ny, nz) === 0) {
                                    const vertexIndex = positions.length / 3;
                                    face.corners.forEach((corner, i) => {
                                        positions.push(gx + corner[0], gy + corner[1], gz + corner[2]);
                                        normals.push(...face.normal);
                                        uvs.push(...uvsForQuad[i]);
                                    });
                                    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
                                }
                            });
                        }
                    }
                }
            }

            if (positions.length > 0) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geometry.setIndex(indices);
                
                const material = this.materials[type];
                // --- FIX FOR RENDERING GLITCH ---
                // Compute tangents if the material uses a normal map.
                if (material.normalMap) {
                    geometry.computeTangents();
                }

                const mesh = new THREE.Mesh(geometry, material);
                this.scene.add(mesh);
                this.blockMeshes.push(mesh);
                chunk.meshes.push(mesh);
            }
        }
    }
}


