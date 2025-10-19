import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/objects/Sky.js';
import { World } from './world.js';
import { Controls } from './controls.js';

const scene = new THREE.Scene();
// Fallback background so you see *something* even if sky fails to compile.
scene.background = new THREE.Color(0x0d0f14);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Sky + Sun light ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const sunDir = new THREE.Vector3();
const skyParams = { turbidity: 10, rayleigh: 3, mieCoefficient: 0.005, mieDirectionalG: 0.7, elevation: 25, azimuth: 180 };

function updateSky() {
  const u = sky.material.uniforms;
  u.turbidity.value = skyParams.turbidity;
  u.rayleigh.value = skyParams.rayleigh;
  u.mieCoefficient.value = skyParams.mieCoefficient;
  u.mieDirectionalG.value = skyParams.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(90 - skyParams.elevation);
  const theta = THREE.MathUtils.degToRad(skyParams.azimuth);
  sunDir.setFromSphericalCoords(1, phi, theta);

  u.sunPosition.value.copy(sunDir);
  dirLight.position.copy(sunDir).multiplyScalar(200);
}
const ambLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);
updateSky();

// --- World ---
const world = new World(scene, 100, 100, -30, 30);
world.generate();

// --- Controls (spawns camera rig at 50,5,50 looking slightly down) ---
const controls = new Controls(camera, world, scene);
controls.pitch.rotation.x = -0.15;

// Resize
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  controls.update(dt);
  renderer.render(scene, camera);
}
animate();