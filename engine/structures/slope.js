import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createSlopeGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(0, 1);
    const extrudeSettings = { depth: 1, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(-0.5, -0.5, -0.5);
    geometry.translate(0, 0.5, 0); // Set pivot to bottom
    return geometry;
}
