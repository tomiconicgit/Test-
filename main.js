// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

import { createFPSCamera } from './camera.js';
import { createController } from './controller.js';
import { createTouchControls } from './touchcontrols.js';
import { createBuildTool } from './buildtool.js';

import { createTerrain } from './terrain.js';
import { createSky } from './sky.js';
import { setupLighting } from './lighting.js';

// ---------- Renderer / Scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101215);
scene.fog = new THREE.Fog(0x101215, 60, 220);

// ---------- Camera rig (FOV 60) ----------
const { camera, yaw, pitch } = createFPSCamera(THREE);
scene.add(yaw);

// ---------- World ----------
const terrain = createTerrain(THREE, { size: 50, cell: 1, uneven: 0.02, color: 0x8b8f97 });
scene.add(terrain.mesh);

const sky = createSky?.(THREE);
if (sky) scene.add(sky);

setupLighting(THREE, scene, renderer);

// Neutral envMap so PBR looks right
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x888c92, side: THREE.BackSide })
  );
  envScene.add(box);
  scene.environment = pmrem.fromScene(envScene).texture;
  pmrem.dispose();
}

// ---------- Controls ----------
const pad = createController();
const touch = createTouchControls();

const EYE = 1.6;
const SPEED_WALK = 5.0;
const SPEED_FLY  = 7.5;

// Spawn at **center of terrain** at correct height
yaw.position.set(0, terrain.getHeightAt(0, 0) + EYE, 0);

// ---------- Build Tool ----------
const buildTool = createBuildTool(THREE, { scene, camera, input: pad });
document.addEventListener('toggle-build-tool', () => {
  if (buildTool.active) buildTool.disable(); else buildTool.enable();
});

// ---------- Loop ----------
let isFlying = false;
let lastT = performance.now();
let firstFrameSignaled = false;

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  pad.update(dt);

  // Double-tap A toggles fly
  if (pad.aDouble) isFlying = !isFlying;

  // Look: pad + touch
  const lookDX = pad.look.dx + touch.look.dx * 0.5;
  const lookDY = pad.look.dy + touch.look.dy * 0.5;
  const SENS = 0.0022; // radians per px-ish
  yaw.rotation.y -= lookDX * SENS;
  pitch.rotation.x -= lookDY * SENS;
  pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.rotation.x));
  pad.resetLook(); touch.resetLook();

  // Move
  const usingPad = Math.abs(pad.move.x) + Math.abs(pad.move.y) > 0.02 ||
                   pad.aHold || pad.xHold || pad.l1Pressed || pad.r1Pressed || pad.l2Pressed || pad.r2Pressed;

  const mvX = usingPad ? pad.move.x : touch.move.x;
  const mvY = usingPad ? pad.move.y : touch.move.y;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw.quaternion);
  const right   = new THREE.Vector3(1, 0,  0).applyQuaternion(yaw.quaternion);
  if (!isFlying) { forward.y = 0; right.y = 0; forward.normalize(); right.normalize(); }

  const speed = isFlying ? SPEED_FLY : SPEED_WALK;
  yaw.position.addScaledVector(forward, mvY * speed * dt);
  yaw.position.addScaledVector(right,   mvX * speed * dt);

  if (isFlying) {
    if (pad.aHold) yaw.position.y += speed * dt;
    if (pad.xHold) yaw.position.y -= speed * dt;
  } else {
    // Follow ground
    const yGround = terrain.getHeightAt(yaw.position.x, yaw.position.z) + EYE;
    yaw.position.y += (yGround - yaw.position.y) * 0.25;
  }

  buildTool.update(dt);

  renderer.render(scene, camera);

  if (!firstFrameSignaled) {
    firstFrameSignaled = true;
    window.__LOADER?.appReady?.();
    window.dispatchEvent(new CustomEvent('world:first-frame'));
  }
}

tick();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});