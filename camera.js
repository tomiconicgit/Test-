// camera.js
export function createFPSCamera(THREE) {
  const camera = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 0.1, 1000);
  const yaw = new THREE.Object3D();
  const pitch = new THREE.Object3D();
  yaw.add(pitch);
  pitch.add(camera);

  // expose helpers
  camera.userData.yaw = yaw;
  camera.userData.pitch = pitch;

  return { camera, yaw, pitch };
}