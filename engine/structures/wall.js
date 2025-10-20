import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createWallGeometry() {
    const geo = new THREE.BoxGeometry(1, 1, 0.1);
    geo.translate(0, 0.5, 0);
    return geo;
}
