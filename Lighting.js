// Lighting.js — toned, contrasty lighting (no blowouts)
export function setupLighting(scene) {
  // Gentle ambient (just a lift)
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  // Sky/ground fill — subtle
  const hemi = new THREE.HemisphereLight(0xbfd3ff, 0x2a2a2a, 0.55);
  scene.add(hemi);

  // Key sun with shadows
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 400;
  const s = 120;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  scene.add(sun);

  // Very soft back fill (no shadows)
  const fill = new THREE.DirectionalLight(0xffffff, 0.22);
  fill.position.set(-50, 35, -70);
  scene.add(fill);
}