// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

import { createFPSCamera } from './camera.js';
import { createController } from './controller.js';
import { createTouchControls } from './touchcontrols.js';
import { createBuildTool } from './buildtool.js';

// These are expected from your minimal modules:
import { createTerrain } from './terrain.js';      // returns { mesh, getHeightAt(x,z) }
import { createSky } from './sky.js';              // returns a sky mesh or group (optional)
import { setupLighting } from './lighting.js';     // returns { hemi, sun, ambient }

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
const terrain = createTerrain(THREE, { size: 50, cell: 1, color: 0x8b8f97, uneven: 0.02 });
scene.add(terrain.mesh);

// Optional sky
const sky = createSky?.(THREE);
if (sky) scene.add(sky);

// PBR lighting
const lights = setupLighting(THREE, scene, renderer);

// Neutral envMap so metals look right
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x888c92, side: THREE.BackSide }));
  envScene.add(box);
  scene.environment = pmrem.fromScene(envScene).texture;
  pmrem.dispose();
}

// ---------- Controls ----------
const pad = createController();        // gamepad
const touch = createTouchControls();   // on-screen joystick + drag look

// Movement settings
const EYE = 1.6;
const SPEED_WALK = 5.0;
const SPEED_FLY  = 7.5;

// Spawn at terrain center (0,0), height from terrain
function terrainHeightAt(x, z) {
  return (terrain.getHeightAt?.(x, z) ?? 0);
}
yaw.position.set(0, terrainHeightAt(0, 0) + EYE, 0);

// ---------- Build Tool ----------
const buildTool = createBuildTool(THREE, { scene, camera, input: pad });

// (Optional) hook to your menu button to toggle build tool
document.addEventListener('toggle-build-tool', () => {
  if (buildTool.active) buildTool.disable();
  else buildTool.enable();
});

// ---------- Player Update ----------
let isFlying = false;
let lastT = performance.now();
let firstFrameSignaled = false;

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  // Update gamepad
  pad.update(dt);

  // Toggle fly on A double
  if (pad.aDouble) isFlying = !isFlying;

  // ---- Look (blend pad + touch) ----
  const lookDX = pad.look.dx + touch.look.dx * 0.5; // touch scaled so it feels similar
  const lookDY = pad.look.dy + touch.look.dy * 0.5;

  const SENS = 0.0022; // yaw/pitch radians per “pixel”
  yaw.rotation.y -= lookDX * SENS;
  pitch.rotation.x -= lookDY * SENS;
  pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.rotation.x));

  // Reset look deltas
  pad.resetLook();
  touch.resetLook();

  // ---- Movement (prefer pad if active, else touch joystick) ----
  const usePad = Math.abs(pad.move.x) + Math.abs(pad.move.y) > 0.02 ||
                 pad.aHold || pad.xHold || pad.l1Pressed || pad.r1Pressed || pad.l2Pressed || pad.r2Pressed;

  const mvX = usePad ? pad.move.x : touch.move.x; // strafe
  const mvY = usePad ? pad.move.y : touch.move.y; // forward (+ = forward in our controller)

  // Movement vectors in world space
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw.quaternion);
  const right   = new THREE.Vector3(1, 0,  0).applyQuaternion(yaw.quaternion);
  if (!isFlying) { forward.y = 0; right.y = 0; forward.normalize(); right.normalize(); }

  const speed = isFlying ? SPEED_FLY : SPEED_WALK;
  yaw.position.addScaledVector(forward, mvY * speed * dt);
  yaw.position.addScaledVector(right,   mvX * speed * dt);

  // Vertical while flying (A hold up, X hold down)
  if (isFlying) {
    if (pad.aHold) yaw.position.y += speed * dt;
    if (pad.xHold) yaw.position.y -= speed * dt;
  } else {
    // Snap to terrain height
    const yGround = terrainHeightAt(yaw.position.x, yaw.position.z) + EYE;
    yaw.position.y += (yGround - yaw.position.y) * 0.25; // gentle follow
  }

  // ---- Tools ----
  buildTool.update(dt);

  // ---- Render ----
  renderer.render(scene, camera);

  // Let the loader know we rendered once
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