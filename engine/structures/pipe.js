import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
// This import is NECESSARY to add the flanges.
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/utils/BufferGeometryUtils.module.js';

// --- Constants for a consistent look ---
const RADIUS = 0.15;
const FLANGE_RADIUS = 0.22;
const FLANGE_HEIGHT = 0.04;
const SEGMENTS = 12;

/**
 * Helper function to create a flange geometry.
 */
function createFlange() {
  return new THREE.CylinderGeometry(FLANGE_RADIUS, FLANGE_RADIUS, FLANGE_HEIGHT, SEGMENTS);
}

/**
 * A straight pipe, 1 unit tall, with flanges.
 */
export function createPipeStraightGeometry() {
  const pipeGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.0, SEGMENTS);
  pipeGeo.translate(0, 0.5, 0); // Move base to y=0

  const flange1 = createFlange();
  flange1.translate(0, FLANGE_HEIGHT / 2, 0); // At bottom

  const flange2 = createFlange();
  flange2.translate(0, 1.0 - FLANGE_HEIGHT / 2, 0); // At top

  // We merge the three shapes into one single geometry
  return mergeGeometries([pipeGeo, flange1, flange2]);
}

/**
 * A 90-degree elbow with solid flanges at the ends.
 */
export function createPipeElbowGeometry() {
  const v0 = new THREE.Vector3(0, 0, 0);       // Start at pivot
  const v1 = new THREE.Vector3(0, 0.5, 0);     // Control point
  const v2 = new THREE.Vector3(0.5, 0.5, 0);   // End point
  const path = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  
  const pipeGeo = new THREE.TubeGeometry(
      path,    // path
      20,      // tubularSegments
      RADIUS,  // radius
      SEGMENTS,// radialSegments
      false    // closed
  );
  
  const flange1 = createFlange();
  flange1.rotateX(Math.PI / 2); // Faces down at (0,0,0)
  flange1.translate(0, 0, 0);

  const flange2 = createFlange();
  flange2.rotateZ(-Math.PI / 2); // Faces +X at (0.5, 0.5, 0)
  flange2.translate(0.5, 0.5, 0);

  // We merge the three shapes into one single geometry
  return mergeGeometries([pipeGeo, flange1, flange2]);
}
