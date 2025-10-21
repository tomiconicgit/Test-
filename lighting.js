// lighting.js — PBR-friendly world lights with shadows
export function setupLighting(THREE, scene, renderer) {
  // Tone mapping stays configured in main.js. This just adds lights.

  // Hemisphere: soft ambient from sky/ground
  const hemi = new THREE.HemisphereLight(0xdfe7ff, 0x40424a, 0.7);
  scene.add(hemi);

  // Directional “sun” with soft shadows
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(60, 120, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  scene.add(sun);

  // Low ambient fill so PBR doesn’t go to pure black in occlusion
  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(ambient);

  // Return handles in case you want UI tweaks later
  return { hemi, sun, ambient };
}