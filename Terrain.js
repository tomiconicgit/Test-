// Terrain.js — neutral concrete ground with good contrast
export function createTerrain() {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b8f96,   // medium concrete grey (not white)
    roughness: 0.9,
    metalness: 0.0
  });
  const terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  terrain.name = "terrain";
  return terrain;
}