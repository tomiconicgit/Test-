// main.js — FPVMC bootstrap (clean, ASCII-only)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";

import { createRenderer } from "./renderer.js";
import { createFPSCamera } from "./camera.js";
import { setupLighting } from "./lighting.js";
import { createSky } from "./sky.js";
import { createTerrain } from "./terrain.js";

import { createController } from "./controller.js";
import { createTouchControls } from "./touchcontrols.js";

import { createMenu } from "./menu.js";
import { createDigTool } from "./digtool.js";
import { createBuildTool } from "./buildtool.js";

// Warm the truss module (optional safety; buildtool imports it too)
import "./structures/trussframe.js";

// ---------- Renderer / Scene ----------
const canvas = document.getElementById("c");
const renderer = createRenderer(THREE, canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101215);
scene.fog = new THREE.Fog(0x101215, 60, 220);

// ---------- Camera rig ----------
const { camera, yaw, pitch } = createFPSCamera(THREE);
scene.add(yaw);

// ---------- World ----------
const terrainMesh = createTerrain(THREE);   // always a Mesh
scene.add(terrainMesh);

// Optional sky
const sky = typeof createSky === "function" ? createSky(THREE) : null;
if (sky) scene.add(sky);

// PBR lights
setupLighting(THREE, scene, renderer);

// Neutral envMap for nicer metals (simple PMREM cube)
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x888c92, side: THREE.BackSide })
    )
  );
  scene.environment = pmrem.fromScene(envScene).texture;
  pmrem.dispose();
}

// ---------- Helpers ----------
const RC_DOWN = new THREE.Raycaster();

/** Sample terrain height at x,z. Safe: returns 0 if no hit. */
function sampleTerrainY(x, z) {
  if (!terrainMesh || !terrainMesh.isObject3D) return 0;
  RC_DOWN.set(new THREE.Vector3(x, 200, z), new THREE.Vector3(0, -1, 0));
  const hit = RC_DOWN.intersectObject(terrainMesh, false)[0];
  return hit ? hit.point.y : 0;
}

// Spawn player at center of the terrain
const EYE = 1.6;
yaw.position.set(0, sampleTerrainY(0, 0) + EYE, 0);

// ---------- Input ----------
const pad   = createController();
const touch = createTouchControls();

// Movement constants
const SPEED_WALK = 5.0;
const SPEED_FLY  = 7.5;

// ---------- Tools & Menu ----------
const digTool = createDigTool(THREE, {
  scene,
  camera,
  terrain: terrainMesh,
  input: pad
});

const buildTool = createBuildTool(THREE, {
  scene,
  camera,
  input: pad,
  terrain: terrainMesh,
  terrainHeightAt: (x, z) => sampleTerrainY(x, z)
});

createMenu({
  onDigTool: () => {
    if (buildTool.active) buildTool.disable();
    digTool.active ? digTool.disable() : digTool.enable();
  },
  onBuildTool: () => {
    if (digTool.active) digTool.disable();
    buildTool.active ? buildTool.disable() : buildTool.enable();
  }
});

// ---------- Game Loop ----------
let isFlying = false;
let firstFrameSignaled = false;
let lastT = performance.now();

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  // Update inputs
  pad.update(dt);

  // Toggle fly on A double-tap
  if (pad.aDouble) isFlying = !isFlying;

  // ---- Look (gamepad + touch blend) ----
  const lookDX = pad.look.dx + touch.look.dx * 0.5;
  const lookDY = pad.look.dy + touch.look.dy * 0.5;

  const SENS = 0.0022;
  yaw.rotation.y   -= lookDX * SENS;
  pitch.rotation.x -= lookDY * SENS;
  pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.rotation.x));

  // consume deltas
  pad.resetLook();
  touch.resetLook();

  // ---- Movement (prefer pad when active) ----
  const usePad =
    Math.abs(pad.move.x) + Math.abs(pad.move.y) > 0.02 ||
    pad.aHold || pad.xHold || pad.l1Pressed || pad.r1Pressed || pad.l2Pressed || pad.r2Pressed;

  const mvX = usePad ? pad.move.x : touch.move.x; // strafe
  const mvY = usePad ? pad.move.y : touch.move.y; // forward

  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw.quaternion);

  if (!isFlying) { fwd.y = 0; right.y = 0; fwd.normalize(); right.normalize(); }

  const speed = isFlying ? SPEED_FLY : SPEED_WALK;
  yaw.position.addScaledVector(fwd,  mvY * speed * dt);
  yaw.position.addScaledVector(right, mvX * speed * dt);

  // Vertical while flying (A hold up, X hold down)
  if (isFlying) {
    if (pad.aHold) yaw.position.y += speed * dt;
    if (pad.xHold) yaw.position.y -= speed * dt;
  } else {
    // Follow terrain smoothly
    const yGround = sampleTerrainY(yaw.position.x, yaw.position.z) + EYE;
    yaw.position.y += (yGround - yaw.position.y) * 0.25;
  }

  // ---- Tools ----
  digTool.update?.(dt);
  buildTool.update?.(dt);

  // ---- Render ----
  renderer.render(scene, camera);

  if (!firstFrameSignaled) {
    firstFrameSignaled = true;
    window.__LOADER?.appReady?.();
    window.dispatchEvent(new CustomEvent("world:first-frame"));
  }
}

tick();

// ---------- Resize ----------
window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});