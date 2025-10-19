import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/objects/Sky.js';
import { World } from './world.js';
import { Controls } from './controls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e2126);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.8;              // bright on purpose
renderer.setClearColor(0x1e2126);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Bright, simple lights (always visible)
const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 1.2);
scene.add(hemi);
const amb  = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(amb);
const dir  = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(50, 80, 20);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// Sky (visual only, lights above already guarantee visibility)
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);
const sun = new THREE.Vector3();
(function updateSky(){
  const u = sky.material.uniforms;
  u.turbidity.value = 10; u.rayleigh.value = 3; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.7;
  const elev = 30, az = 180;
  sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(az));
  u.sunPosition.value.copy(sun);
  dir.position.copy(sun).multiplyScalar(200);
})();

// World
const world = new World(scene, 100, 100, -30, 30);
world.generate();

// Debug helpers so you SEE something even if textures fail
scene.add(new THREE.GridHelper(120, 60));
const test = new THREE.Mesh(new THREE.BoxGeometry(2,2,2), new THREE.MeshBasicMaterial({ color: 0xffcc66 }));
test.position.set(50, 2, 50);
scene.add(test);

// Controls
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
(function animate(){
  requestAnimationFrame(animate);
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
})();