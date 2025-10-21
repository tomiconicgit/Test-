// terrain.js
export function createTerrain(THREE, {
  size = 50,          // world units wide/deep
  cell = 1,           // ~1 unit per quad
  uneven = 0.02,      // bumpiness amount
  color = 0x7a7a7a    // flat grey
} = {}) {
  const segs = Math.max(1, Math.round(size / cell));
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);

  // Add subtle height noise along plane normal (Z before rotation)
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = (Math.sin(x * 0.7) + Math.cos(y * 0.6)) * (uneven * 1.5) + (Math.random() - 0.5) * uneven;
    // IMPORTANT: displace along +Z before we rotate to XZ-plane
    pos.setXYZ(i, x, y, z + n);
  }

  // Lay it flat (XZ) so Y is “up”
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';

  // Utility: sample ground height via raycast
  const rc = new THREE.Raycaster();
  function getHeightAt(x, z) {
    rc.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
    const hit = rc.intersectObject(mesh, true)[0];
    return hit ? hit.point.y : 0;
  }

  return { mesh, getHeightAt };
}