// Lighting.js — brighter, warm key + sky fill, still with contrast
export function setupLighting(scene) {
  // Gentle ambient
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  // Sky/ground fill (cool sky, dark ground)
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x141414, 0.55);
  scene.add(hemi);

  // Warm sun with shadows
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.25);
  sun.position.set(80, 130, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 600;
  const s = 160;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top  =  s; sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  // Soft back/edge fill (no shadows)
  const fill = new THREE.DirectionalLight(0xffffff, 0.2);
  fill.position.set(-90, 50, -100);
  scene.add(fill);
}