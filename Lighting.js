// Lighting.js — balanced daylight with contrast (warmer, not washed)
export function setupLighting(scene) {
  // Tiny ambient just to lift darkest shadows
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  // Subtle sky/ground fill (cool sky, dark ground)
  const hemi = new THREE.HemisphereLight(0xbad3ff, 0x161616, 0.32);
  scene.add(hemi);

  // Warm key sun with shadows
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.0);
  sun.position.set(70, 120, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  const s = 140;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top  =  s; sun.shadow.camera.bottom = -s;
  scene.add(sun);

  // Gentle back/edge fill (no shadows)
  const fill = new THREE.DirectionalLight(0xffffff, 0.14);
  fill.position.set(-80, 50, -90);
  scene.add(fill);
}