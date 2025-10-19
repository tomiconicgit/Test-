// Lighting.js — brighter, balanced lighting for mobile
export function setupLighting(scene) {
  // 1) Ambient lift (overall)
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  // 2) Sky/ground fill
  const hemi = new THREE.HemisphereLight(0xbfd3ff, 0x101010, 0.75);
  scene.add(hemi);

  // 3) Key sun with high-quality shadows
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(60, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 4096;
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 400;
  const s = 120; // shadow frustum size
  sun.shadow.camera.left   = -s;
  sun.shadow.camera.right  =  s;
  sun.shadow.camera.top    =  s;
  sun.shadow.camera.bottom = -s;
  scene.add(sun);

  // 4) Soft fill from opposite side (no shadows, reduces harsh contrast)
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-40, 30, -60);
  scene.add(fill);

  // Optional: debug helpers
  // scene.add(new THREE.DirectionalLightHelper(sun, 5));
  // scene.add(new THREE.HemisphereLightHelper(hemi, 5));
}