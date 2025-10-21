// camera.js — first-person camera rig (FOV 60)
export function createFPSCamera(THREE) {
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);

  const yaw = new THREE.Object3D();
  const pitch = new THREE.Object3D();
  yaw.add(pitch);
  pitch.add(camera);

  // spawn at scene center; main.js should set position.y based on terrain
  yaw.position.set(0, 2, 0);

  return { camera, yaw, pitch };
}