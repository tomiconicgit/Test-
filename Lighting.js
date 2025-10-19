// Lighting.js — brighter ambient & sky, stronger sun, soft back fill
export function setupLighting(scene) {
  // Overall lift so nothing is crushed to black
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  // Sky / ground fill
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x222222, 1.0);
  scene.add(hemi);

  // Key sun with quality shadows
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(80, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 4096;
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 600;
  const s = 160;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;   sun.shadow.camera.bottom = -s;
  scene.add(sun);

  // Gentle back/side fill (no shadows) to lift dark sides
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-60, 40, -90);
  scene.add(fill);
}