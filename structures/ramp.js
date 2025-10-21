// structures/ramp.js — 1x1 ramp wedge, height from 0 to 0.5, centered, pivot at ground
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createRampGeometry() {
  // Coordinates:
  // Back edge z=-0.5 at y=0; Front edge z=+0.5 at y=0.5
  const A = [-0.5, 0.0, -0.5];
  const B = [ 0.5, 0.0, -0.5];
  const C = [ 0.5, 0.0,  0.5];
  const D = [-0.5, 0.0,  0.5];

  const A2 = [-0.5, 0.0, -0.5]; // top back same height
  const B2 = [ 0.5, 0.0, -0.5];
  const C2 = [ 0.5, 0.5,  0.5]; // front top +0.5
  const D2 = [-0.5, 0.5,  0.5];

  const positions = [
    // Top sloped (A2,B2,C2,D2)
    ...A2, ...B2, ...C2,
    ...A2, ...C2, ...D2,

    // Bottom (A,B,C,D) — facing down
    ...A, ...C, ...B,
    ...A, ...D, ...C,

    // Front face z=+0.5 (D,C,C2,D2)
    ...D, ...C, ...C2,
    ...D, ...C2, ...D2,

    // Left face x=-0.5 (A,D,D2,A2)
    ...A, ...D, ...D2,
    ...A, ...D2, ...A2,

    // Right face x=+0.5 (B,C,C2,B2)
    ...B, ...C, ...C2,
    ...B, ...C2, ...B2,

    // (Back face would be degenerate; skipped)
  ];

  // Simple UVs (not perfect; good enough for flat color/PBR)
  const uvs = [];
  for (let i=0; i<positions.length; i+=3) {
    const x = positions[i], z = positions[i+2];
    uvs.push(x+0.5, z+0.5);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();

  // Pivot at base is already at y=0 (lowest edge)
  return geom;
}