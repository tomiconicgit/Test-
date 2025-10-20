import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createCylinderGeometry() {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    geo.translate(0, 0.5, 0);
    return geo;
}
