import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

// --- Constants for a consistent look ---
const RADIUS = 0.15;
const SEGMENTS = 12;

/**
 * A straight pipe, 1 unit tall, with closed ends.
 */
export function createPipeStraightGeometry() {
  // We add '1, false' at the end. 'false' means it is NOT openEnded (i.e., it's closed).
  const geo = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.0, SEGMENTS, 1, false);
  geo.translate(0, 0.5, 0); // Move base to y=0
  return geo;
}

/**
 * A 90-degree elbow with closed ends.
 */
export function createPipeElbowGeometry() {
  const v0 = new THREE.Vector3(0, 0, 0);       // Start at pivot
  const v1 = new THREE.Vector3(0, 0.5, 0);     // Control point
  const v2 = new THREE.Vector3(0.5, 0.5, 0);   // End point
  const path = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  
  const geo = new THREE.TubeGeometry(
      path,    // path
      20,      // tubularSegments
      RADIUS,  // radius
      SEGMENTS,// radialSegments
      true     // <-- MODIFICATION: 'true' means the tube ends are closed
  );
  
  return geo;
}
