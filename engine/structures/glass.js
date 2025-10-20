import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createGlassPaneGeometry() {
    const geo = new THREE.BoxGeometry(1, 1, 0.05);
    geo.translate(0, 0.5, 0);
    return geo;
}
