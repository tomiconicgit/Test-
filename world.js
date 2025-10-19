import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class World {
    constructor(scene, sizeX, sizeZ, minY, maxY) {
        this.scene = scene;
        this.sizeX = sizeX;
        this.sizeZ = sizeZ;
        this.minY = minY;
        this.maxY = maxY;
        this.chunkSizeX = 32;
        this.chunkSizeY = 32;
        this.chunkSizeZ = 32;
        this.chunks = new Map();
        this.blockMeshes = [];
        this.textureLoader = new THREE.TextureLoader();

        this.concreteMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });

        this.metalMaterial = new THREE.MeshStandardMaterial({
            map: this.textureLoader.load('assets/metal_albedo.png'),
            normalMap: this.textureLoader.load('assets/metal_normal.png'),
            aoMap: this.textureLoader.load('assets/metal_ao.png'),
            displacementMap: this.textureLoader.load('assets/metal_height.png'),
            displacementScale: 0.05,
            metalnessMap: this.textureLoader.load('assets/metal_metallic.png'),
            metalness: 1.0,
            roughness: 0.5
        });

        this.materials = [null, this.concreteMaterial, this.metalMaterial];
    }

    getChunkKey(cx, cy, cz) {
        return `${cx}_${cy}_${cz}`;
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
        return lx * this.chunkSizeY * this.chunkSizeZ + ly * this.chunkSizeZ + lz;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= this.sizeX || y < this.minY || y > this.maxY || z < 0 || z >= this.sizeZ) return 0;
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
        if (x < 0 || x >= this.sizeX || y < this.minY || y > this.maxY || z < 0 || z >= this.sizeZ) return;
        const cx = Math.floor(x / this.chunkSizeX);
        const cy = Math.floor(y / this.chunkSizeY);
        const cz = Math.floor(z / this.chunkSizeZ);
        const key = this.getChunkKey(cx, cy, cz);
        let chunk = this.chunks.get(key);
        if (!chunk) chunk = this.createChunk(cx, cy, cz);
        const lx = x - cx * this.chunkSizeX;
        const ly = y - cy * this.chunkSizeY;
        const lz = z - cz * this.chunkSizeZ;
        chunk.data[this.localIndex(lx, ly, lz)] = type;
        chunk.dirty = true;
        // Mark neighboring chunks dirty if on edge
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
                this.setBlock(x, 0, z, 1); // concrete at y=0
            }
        }
        this.rebuildDirtyChunks();
    }

    rebuildDirtyChunks() {
        this.chunks.forEach((chunk, key) => {
            if (chunk.dirty) {
                const [cx, cy, cz] = key.split('_').map(Number);
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
            if (index !== -1) this.blockMeshes.splice(index, 1);
            mesh.geometry.dispose();
        });
        chunk.meshes = [];

        const cubeFaces = [
            { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]] }, // +x
            { normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] }, // -x
            { normal: [0, 1, 0], corners: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] }, // +y
            { normal: [0, -1, 0], corners: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]] }, // -y
            { normal: [0, 0, 1], corners: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]] }, // +z
            { normal: [0, 0, -1], corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] }  // -z
        ];

        for (let type = 1; type <= 2; type++) {
            const positions = [];
            const normals = [];
            const uvs = [];
            const indices = [];
            let vertexIndex = 0;

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
                                    face.corners.forEach(corner => {
                                        positions.push(gx + corner[0], gy + corner[1], gz + corner[2]);
                                        normals.push(...face.normal);
                                        uvs.push(corner[0] ^ corner[1] ^ corner[2], corner[1] ^ corner[2] ^ corner[0]);
                                    });
                                    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
                                    vertexIndex += 4;
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
                const mesh = new THREE.Mesh(geometry, this.materials[type]);
                mesh.frustumCulled = true;
                this.scene.add(mesh);
                this.blockMeshes.push(mesh);
                chunk.meshes.push(mesh);
            }
        }
    }
}