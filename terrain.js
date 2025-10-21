// terrain.js
export function createTerrain(THREE) {
  // 50x50 units, 50 segments so ~1 unit per quad
  const size = 50;
  const segs = 50;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  // make it slightly uneven (small height noise)
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // very subtle bumps
    const n = (Math.sin(x*0.7) + Math.cos(z*0.6))*0.03 + (Math.random()-0.5)*0.02;
    pos.setXYZ(i, x, y, z + n);
  }
  geo.rotateX(-Math.PI/2);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x7a7a7a,
    roughness: 0.85,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}