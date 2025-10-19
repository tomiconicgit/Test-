// Lighting.js — balanced daylight with contrast
export function setupLighting(scene) {
  // Small ambient just to lift shadows a touch
  scene.add(new THREE.AmbientLight(0xffffff, 0.14));

  // Subtle sky/ground fill
  const hemi = new THREE.HemisphereLight(0xbfd3ff, 0x1e1e1e, 0.38);
  scene.add(hemi);

  // Key sun
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(70, 120, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  const s = 140;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  scene.add(sun);

  // Gentle back fill (no shadows)
  const fill = new THREE.DirectionalLight(0xffffff, 0.18);
  fill.position.set(-80, 50, -90);
  scene.add(fill);
}