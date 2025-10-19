// Lighting.js — balanced daylight with contrast (warm key, subtle fills)
export function setupLighting(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const hemi = new THREE.HemisphereLight(0xbad3ff, 0x161616, 0.32);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2e0, 1.0);
  sun.position.set(70, 120, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  const s = 140;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top  =  s; sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0002;        // ↓ helps remove banding on the panels
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xffffff, 0.14);
  fill.position.set(-80, 50, -90);
  scene.add(fill);
}