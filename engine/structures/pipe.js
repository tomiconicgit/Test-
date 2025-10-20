import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createPipeGeometry() {
    // We'll create a curve that goes up, then curves right
    const v0 = new THREE.Vector3(0, 0, 0);       // Start at bottom-center (our pivot)
    const v1 = new THREE.Vector3(0, 0.5, 0);     // Control point (pulls the curve straight up)
    const v2 = new THREE.Vector3(0.5, 0.5, 0);   // End point (half a unit up, half a unit right)
    
    const path = new THREE.QuadraticBezierCurve3(v0, v1, v2);
    
    const geo = new THREE.TubeGeometry(
        path,    // path
        20,      // tubularSegments
        0.1,     // radius
        8,       // radialSegments
        false    // closed (so the ends are open)
    );
    
    return geo;
}
