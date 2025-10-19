import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class World {
    constructor(scene, sizeX, sizeZ, minY, maxY) {
        this.scene = scene;
        this.sizeX = sizeX;
        this.sizeZ = sizeZ;
        this.minY = minY;
        this.maxY = maxY;
        this.sizeY = maxY - minY + 1;
        this.data = new Uint8Array(sizeX * this.sizeY * sizeZ);
        this.meshes = [];
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
    }

    index(x, y, z) {
        if (x < 0 || x >= this.sizeX || y < this.minY || y > this.maxY || z < 0 || z >= this.sizeZ) return -1;
        return x * this.sizeY * this.sizeZ + (y - this.minY) * this.sizeZ + z;
    }

    getBlock(x, y, z) {
        const idx = this.index(x, y, z);
        return idx === -1 ? 0 : this.data[idx];
    }

    setBlock(x, y, z, type) {
        const idx = this.index(x, y, z);
        if (idx !== -1) this.data[idx] = type;
    }

    generate() {
        for (let x = 0; x < this.sizeX; x++) {
            for (let z = 0; z < this.sizeZ; z++) {
                this.setBlock(x, 0, z, 1); // concrete at y=0
            }
        }
        this.buildMesh();
    }

    buildMesh() {
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        });
        this.meshes = [];

        const materials = [null, this.concreteMaterial, this.metalMaterial];
        const geometries = [null, new THREE.BufferGeometry(), new THREE.BufferGeometry()];

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

            for (let x = 0; x < this.sizeX; x++) {
                for (let y = this.minY; y <= this.maxY; y++) {
                    for (let z = 0; z < this.sizeZ; z++) {
                        if (this.getBlock(x, y, z) === type) {
                            cubeFaces.forEach((face, faceIdx) => {
                                const nx = x + face.normal[0];
                                const ny = y + face.normal[1];
                                const nz = z + face.normal[2];
                                if (this.getBlock(nx, ny, nz) === 0) {
                                    face.corners.forEach(corner => {
                                        positions.push(x + corner[0], y + corner[1], z + corner[2]);
                                        normals.push(...face.normal);
                                        uvs.push(corner[0] ^ corner[1] ^ corner[2], corner[1] ^ corner[2] ^ corner[0]); // simple uv
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
                const geometry = geometries[type];
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geometry.setIndex(indices);
                const mesh = new THREE.Mesh(geometry, materials[type]);
                this.scene.add(mesh);
                this.meshes.push(mesh);
            }
        }
    }
}