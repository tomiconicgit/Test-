import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

// --- Constants for a consistent look ---
const RADIUS = 0.15;
const SEGMENTS = 12;

/**
 * Your "straight up pipe" and "straight that connected to the curve".
 * A simple straight pipe, 1 unit tall, with a pivot at the bottom center.
 */
export function createPipeStraightGeometry() {
  const geo = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.0, SEGMENTS);
  geo.translate(0, 0.5, 0); // Move base to y=0
  return geo;
}

/**
 * Your "ground to curve" and "curve to vertical up".
 * A simple 90-degree elbow. Pivot is at the bottom (y=0) opening.
 * It curves from Y-up to X-positive.
 */
export function createPipeElbowGeometry() {
  const v0 = new THREE.Vector3(0, 0, 0);       // Start at pivot
  const v1 = new THREE.Vector3(0, 0.5, 0);     // Control point for 90-deg turn
  const v2 = new THREE.Vector3(0.5, 0.5, 0);   // End point
  const path = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  
  const geo = new THREE.TubeGeometry(
      path,    // path
      20,      // tubularSegments
      RADIUS,  // radius
      SEGMENTS,// radialSegments
      false    // closed
  );
  
  return geo;
}
