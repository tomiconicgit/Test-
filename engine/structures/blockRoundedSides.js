import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 1×1×1 block with rounded vertical edges (sides only).
 * - Top/bottom edges remain sharp.
 * - Pivot at base so it stands on the ground.
 */
export function createBlockRoundedSidesGeometry(radius = 0.15, segments = 16) {
  const r = Math.min(0.24, Math.max(0.05, radius)); // keep sane
  const parts = [];

  // Core (shrunk so quarters + slabs complete the outer 1×1)
  const core = new THREE.BoxGeometry(1 - 2 * r, 1, 1 - 2 * r);
  parts.push(core);

  // Side slabs to reach the full 1×1 extent along X and Z
  const slabX = new THREE.BoxGeometry(r, 1, 1 - 2 * r);
  const slabXPos = slabX.clone(); slabXPos.translate(0.5 - r / 2, 0, 0);
  const slabXNeg = slabX.clone(); slabXNeg.translate(-0.5 + r / 2, 0, 0);
  parts.push(slabXPos, slabXNeg);

  const slabZ = new THREE.BoxGeometry(1 - 2 * r, 1, r);
  const slabZPos = slabZ.clone(); slabZPos.translate(0, 0, 0.5 - r / 2);
  const slabZNeg = slabZ.clone(); slabZNeg.translate(0, 0, -0.5 + r / 2);
  parts.push(slabZPos, slabZNeg);

  // Quarter cylinders on the four vertical edges (round the sides, not caps)
  function quarterAt(sx, sz) {
    // thetaStart aligned with corner direction
    let theta = Math.atan2(sz, sx);
    if (theta < 0) theta += Math.PI * 2;
    const cyl = new THREE.CylinderGeometry(r, r, 1, segments, 1, false, theta, Math.PI / 2);
    cyl.translate(sx * (0.5 - r), 0, sz * (0.5 - r));
    return cyl;
  }
  parts.push(
    quarterAt(+1, +1),
    quarterAt(-1, +1),
    quarterAt(-1, -1),
    quarterAt(+1, -1),
  );

  // Merge all parts
  const merged = mergeGeometries(parts, true);

  // Ensure uv2 for aoMap support
  const uv = merged.getAttribute('uv');
  if (uv && !merged.getAttribute('uv2')) {
    merged.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(0), 2));
  }

  // Pivot to base
  merged.translate(0, 0.5, 0);

  return merged;
}