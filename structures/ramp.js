// structures/ramp.js — solid, watertight 1×1 ramp; height 0 → 0.5; tiles flush
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createRampGeometry() {
  // Vertices (grid-aligned so adjacent ramps share exact edges)
  // Base y=0, front edge z=+0.5 at y=0.5.
  const v = [
    // base rectangle (y=0)
    -0.5, 0.0, -0.5,  // 0
     0.5, 0.0, -0.5,  // 1
     0.5, 0.0,  0.5,  // 2
    -0.5, 0.0,  0.5,  // 3
    // front top edge (z=+0.5, y=0.5)
    -0.5, 0.5,  0.5,  // 4
     0.5, 0.5,  0.5   // 5
  ];

  // Triangles (CCW = outward)
  const idx = [
    // Top slope
    0, 1, 5,
    0, 5, 4,

    // Bottom (faces down)
    0, 2, 1,
    0, 3, 2,

    // Front face (z = +0.5)
    3, 2, 5,
    3, 5, 4,

    // Left side (x = -0.5)
    0, 3, 4,

    // Right side (x = +0.5)
    1, 5, 2
    // Back is a knife-edge; intentional for a wedge
  ];

  // Simple footprint UVs (ok for flat/PBR)
  const uv = [
    0,0,  1,0,  1,1,  0,1,  0,1,  1,1
  ];

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();

  // uv2 for AO compatibility later
  const uvAttr = g.getAttribute('uv');
  g.setAttribute('uv2', new THREE.BufferAttribute(uvAttr.array.slice(0), 2));

  return g;
}