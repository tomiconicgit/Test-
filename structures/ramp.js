// structures/ramp.js — watertight 1×1 ramp, 0→0.5 height, per-face UVs
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createRampGeometry() {
  // Coordinates are tile-aligned so adjacent ramps are perfectly flush.
  const A = [-0.5, 0.0, -0.5]; // back-left  bottom
  const B = [ 0.5, 0.0, -0.5]; // back-right bottom
  const C = [ 0.5, 0.0,  0.5]; // front-right bottom
  const D = [-0.5, 0.0,  0.5]; // front-left  bottom
  const E = [-0.5, 0.5,  0.5]; // front-left  top
  const F = [ 0.5, 0.5,  0.5]; // front-right top

  // We duplicate verts per face so each face can have its own UV projection.
  const pos = [];
  const uv  = [];
  const pushTri = (p0, p1, p2, uv0, uv1, uv2) => {
    pos.push(...p0, ...p1, ...p2);
    uv.push(...uv0, ...uv1, ...uv2);
  };

  // Helpers for planar UVs
  const uvXZ = ([x, , z]) => [x + 0.5, z + 0.5];     // project to XZ (0..1)
  const uvXY = ([x, y])    => [x + 0.5, y / 0.5];     // X 0..1, Y 0..1 (since top=0.5)
  const uvZY = ([, y, z])  => [z + 0.5, y / 0.5];     // Z 0..1, Y 0..1

  // Top slope (project on XZ so texture isn't stretched by slope)
  pushTri(A, B, F, uvXZ(A), uvXZ(B), uvXZ(F));
  pushTri(A, F, E, uvXZ(A), uvXZ(F), uvXZ(E));

  // Bottom (faces down) — project on XZ
  pushTri(A, C, B, uvXZ(A), uvXZ(C), uvXZ(B));
  pushTri(A, D, C, uvXZ(A), uvXZ(D), uvXZ(C));

  // Front wall (Z = +0.5) — project on X (0..1) and Y (0..1)
  pushTri(D, C, F, uvXY([D[0], D[1]]), uvXY([C[0], C[1]]), uvXY([F[0], F[1]]));
  pushTri(D, F, E, uvXY([D[0], D[1]]), uvXY([F[0], F[1]]), uvXY([E[0], E[1]]));

  // Left side (X = -0.5) — triangle, project on ZY
  pushTri(A, D, E, uvZY(A), uvZY(D), uvZY(E));

  // Right side (X = +0.5) — triangle, project on ZY
  pushTri(B, F, C, uvZY(B), uvZY(F), uvZY(C));

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2));
  // uv2 for AO (copy uv)
  g.setAttribute('uv2',      new THREE.Float32BufferAttribute(uv.slice(), 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}