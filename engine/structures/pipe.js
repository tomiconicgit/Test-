import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
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
  // A cylinder for the flange
  return new THREE.CylinderGeometry(FLANGE_RADIUS, FLANGE_RADIUS, FLANGE_HEIGHT, SEGMENTS);
}

/**
 * Your "straight up pipe".
 * A vertical pipe, 0.5 units tall, with a pivot at the bottom center.
 */
export function createPipeStraightGeometry() {
  const pipeGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, 0.5, SEGMENTS);
  pipeGeo.translate(0, 0.25, 0); // Move base to y=0

  const flange1 = createFlange();
  flange1.translate(0, FLANGE_HEIGHT / 2, 0); // At bottom

  const flange2 = createFlange();
  flange2.translate(0, 0.5 - FLANGE_HEIGHT / 2, 0); // At top

  return mergeGeometries([pipeGeo, flange1, flange2]);
}

/**
 * Your "ground to curve" or "curve to vertical up" piece.
 * A 90-degree elbow. Pivot is at the bottom (y=0) flange.
 * It curves from Y-up to X-positive.
 */
export function createPipeElbowGeometry() {
  // Use a curve just like you had, but with the new radius
  const v0 = new THREE.Vector3(0, 0, 0);
  const v1 = new THREE.Vector3(0, 0.5, 0);
  const v2 = new THREE.Vector3(0.5, 0.5, 0);
  const path = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  const pipeGeo = new THREE.TubeGeometry(path, 20, RADIUS, SEGMENTS, false);

  const flange1 = createFlange();
  flange1.rotateX(Math.PI / 2); // Faces down at (0,0,0)
  flange1.translate(0, 0, 0);

  const flange2 = createFlange();
  flange2.rotateZ(-Math.PI / 2); // Faces +X at (0.5, 0.5, 0)
  flange2.translate(0.5, 0.5, 0);

  return mergeGeometries([pipeGeo, flange1, flange2]);
}

/**
 * A T-junction piece.
 * Pivot is at the bottom (y=0) flange.
 * It has a vertical stem and a horizontal top bar.
 */
export function createPipeTeeGeometry() {
  // Vertical stem
  const pipe1 = new THREE.CylinderGeometry(RADIUS, RADIUS, 0.5, SEGMENTS);
  pipe1.translate(0, 0.25, 0);

  // Horizontal bar
  const pipe2 = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.0, SEGMENTS);
  pipe2.rotateZ(Math.PI / 2);
  pipe2.translate(0, 0.5, 0);

  const flange1 = createFlange();
  flange1.translate(0, FLANGE_HEIGHT / 2, 0); // Bottom flange

  const flange2 = createFlange();
  flange2.rotateZ(Math.PI / 2);
  flange2.translate(-0.5, 0.5, 0); // Left flange

  const flange3 = createFlange();
  flange3.rotateZ(Math.PI / 2);
  flange3.translate(0.5, 0.5, 0); // Right flange

  return mergeGeometries([pipe1, pipe2, flange1, flange2, flange3]);
}

/**
 * A 4-way cross-junction piece.
 * This piece is horizontal. Its pivot is at the ground (y=0),
 * but the geometry itself is at y=0.5 to connect to the
 * tops of the other pipes.
 */
export function createPipeCrossGeometry() {
  // Bar along the X-axis
  const pipe1 = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.0, SEGMENTS);
  pipe1.rotateZ(Math.PI / 2);

  // Bar along the Z-axis
  const pipe2 = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.0, SEGMENTS);
  pipe2.rotateX(Math.PI / 2);

  const flange1 = createFlange();
  flange1.rotateZ(Math.PI / 2);
  flange1.translate(-0.5, 0, 0); // -X flange

  const flange2 = createFlange();
  flange2.rotateZ(Math.PI / 2);
  flange2.translate(0.5, 0, 0); // +X flange

  const flange3 = createFlange();
  flange3.rotateX(Math.PI / 2);
  flange3.translate(0, 0, -0.5); // -Z flange

  const flange4 = createFlange();
  flange4.rotateX(Math.PI / 2);
  flange4.translate(0, 0, 0.5); // +Z flange

  const merged = mergeGeometries([pipe1, pipe2, flange1, flange2, flange3, flange4]);
  
  // Lift the whole cross-piece to connect to the tops (0.5) of other pipes
  merged.translate(0, 0.5, 0); 
  
  return merged;
}
