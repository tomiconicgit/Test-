// terrain.js — flat 50×50 with subtle unevenness on Y
export function createTerrain(THREE) {
  const size = 50;
  const segs = 50;

  // Plane in X–Y, then rotate into X–Z so Y becomes "up"
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  // Now safely perturb HEIGHT (Y) a little
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // very subtle bumps
    const n =
      (Math.sin(x * 0.25) * 0.04) +
      (Math.cos(z * 0.21) * 0.03);
    pos.setY(i, pos.getY(i) + n);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x7a7a7a,
    roughness: 0.85,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;          // <— always a Mesh
}