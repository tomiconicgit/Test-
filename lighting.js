// lighting.js
export function setupLightingAndEnv(THREE, renderer, scene) {
  // Ambient + Hemi + Sun
  const ambient = new THREE.AmbientLight(0xffffff, 0.20);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x8da0b3, 0x2a2e36, 0.5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(60, 100, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
  sun.shadow.camera.top  = 80;  sun.shadow.camera.bottom = -80;
  scene.add(sun);

  // Neutral environment for PBR (PMREM from a simple box)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(
    new THREE.BoxGeometry(10,10,10),
    new THREE.MeshBasicMaterial({ color: 0x7f8490, side: THREE.BackSide })
  ));
  const pmremEnv = pmrem.fromScene(envScene).texture;
  scene.environment = pmremEnv;
  pmrem.dispose();

  // Fog for murky feel
  scene.fog = new THREE.Fog(0x2b313b, 60, 220);

  return { ambient, hemi, sun, pmremEnv };
}