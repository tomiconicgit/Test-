import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function createTower20Geometry() {
  // 1 × 20 × 1 block; pivot at base so it stands on ground
  const geo = new THREE.BoxGeometry(1, 20, 1);
  geo.translate(0, 10, 0);
  return geo;
}