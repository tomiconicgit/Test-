// structures/ramp.js — solid 1×1 ramp, height 0 → 0.5, watertight
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createRampGeometry() {
  // Build a right triangle in the XY plane:
  // (-0.5,0) -> (0.5,0) -> (0.5,0.5)
  // Then extrude along +Z depth=1, center, rotate so extrusion axis becomes X.
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0.0);
  shape.lineTo( 0.5, 0.0);
  shape.lineTo( 0.5, 0.5);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,            // extrude thickness
    steps: 1,
    bevelEnabled: false,
    curveSegments: 3
  });

  // Center: move extrusion axis from [0..1] to [-0.5..0.5]
  geo.translate(0, 0, -0.5);

  // Rotate so extrusion (Z) becomes X. (Z->X), (-X->Z)
  geo.rotateY(-Math.PI / 2);

  // Now: footprint X∈[-0.5,0.5], Z∈[-0.5,0.5], height Y∈[0,0.5]
  // Pivot at ground already (min Y = 0), nothing else to do.

  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  // Ensure uv2 exists for aoMap if you ever add PBR maps later
  const uv = geo.getAttribute('uv');
  if (uv && !geo.getAttribute('uv2')) {
    geo.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(0), 2));
  }

  return geo;
}