import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { makeMaterials } from './engine/Materials.js';
import { VoxelWorld, BLOCK } from './engine/VoxelWorld.js';
import { Joystick } from './ui/Joystick.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa7c4ff, 80, 300);
renderer.setClearColor(0x87b4ff, 1.0);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const yaw = new THREE.Object3D(); const pitch = new THREE.Object3D();
yaw.add(pitch); pitch.add(camera); scene.add(yaw);
camera.position.set(0,0,0);

// Lights - NEW 4-WAY LIGHTING SYSTEM
const hemi = new THREE.HemisphereLight(0xddeeff, 0x998877, 1.2); // Balanced ambient light
scene.add(hemi);

// Main light source with shadows
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100, 100, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); // Higher quality shadows
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);

// Fill lights from other directions (no shadows for performance)
const lightFill1 = new THREE.DirectionalLight(0xffffff, 0.4);
lightFill1.position.set(-100, 60, -50);
scene.add(lightFill1);

const lightFill2 = new THREE.DirectionalLight(0xffffff, 0.4);
lightFill2.position.set(50, 60, -100);
scene.add(lightFill2);

const lightFill3 = new THREE.DirectionalLight(0xffffff, 0.4);
lightFill3.position.set(-50, 60, 100);
scene.add(lightFill3);


const materials = await makeMaterials();
const WORLD = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });

// Player state
const SPEED = 4.0;           // m/s
const EYE = 1.6;             // eye height over ground
let activeBlock = BLOCK.METAL;

// Wireframe highlight for targeted block
const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const edges = new THREE.EdgesGeometry(boxGeom);
const lineMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  linewidth: 2,
  transparent: true,
  opacity: 0.9,
});
const highlightWireframe = new THREE.LineSegments(edges, lineMat);
highlightWireframe.visible = false;
scene.add(highlightWireframe);


// Current hit for actions
let currentHit = null;

// UI wiring
const js = new Joystick(document.getElementById('joystick'));
document.getElementById('btnPlace').addEventListener('click', () => {
  if (!currentHit) return;
  const p = currentHit.prev; // adjacent empty cell
  if(!inWorldXZ(p.x,p.z)) return;
  if(p.y < WORLD.minY || p.y > WORLD.maxY) return;
  WORLD.setVoxel(p.x, p.y, p.z, activeBlock, true);
});
document.getElementById('btnRemove').addEventListener('click', () => {
  if (!currentHit) return;
  WORLD.setVoxel(currentHit.pos.x, currentHit.pos.y, currentHit.pos.z, BLOCK.AIR, true);
});
document.querySelectorAll('input[name="block"]').forEach(r=>{
  r.addEventListener('change', e => activeBlock = (e.target.value==='METAL') ? BLOCK.METAL : BLOCK.CONCRETE);
});

// Look (right-half drag)
let lookId=null, lastX=0, lastY=0;
window.addEventListener('pointerdown', e=>{
  if(e.clientX < innerWidth*0.5) return; // left side reserved for joystick
  lookId = e.pointerId; lastX=e.clientX; lastY=e.clientY;
});
window.addEventListener('pointermove', e=>{
  if(e.pointerId!==lookId) return;
  const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
  const sens = 0.3 * (1/renderer.getPixelRatio());
  yaw.rotation.y -= dx * sens * 0.01;
  pitch.rotation.x -= dy * sens * 0.01;
  pitch.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch.rotation.x));
});
window.addEventListener('pointerup', e=>{ if(e.pointerId===lookId) lookId=null; });

// Movement & ground follow
let lastT = performance.now();
tick();
function tick(){
  requestAnimationFrame(tick);
  const t = performance.now(); const dt = Math.min((t-lastT)/1000, 0.05); lastT=t;

  // joystick: axX right(+), axY down(+)
  const forward = -js.axY;        // up on stick -> forward
  const strafe  =  js.axX;        // right on stick -> +x
  const dir = getForward();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();
  yaw.position.addScaledVector(dir, forward * SPEED * dt);
  yaw.position.addScaledVector(right, strafe * SPEED * dt);
  clampXZ(yaw.position);

  // ground height
  const gx=Math.floor(yaw.position.x), gz=Math.floor(yaw.position.z);
  const top = WORLD.topY(gx,gz);
  const targetY = (top<=WORLD.minY-1 ? 0 : top + 1) + EYE;
  yaw.position.y += (targetY - yaw.position.y) * 0.35; // smooth step

  // Update highlight and currentHit
  currentHit = raycastVoxel(yaw.position, getLookDirection(), 8.0);
  if (currentHit) {
    highlightWireframe.visible = true;
    highlightWireframe.position.set(currentHit.pos.x + 0.5, currentHit.pos.y + 0.5, currentHit.pos.z + 0.5);
    highlightWireframe.scale.set(1.002, 1.002, 1.002); // slight oversize to prevent z-fighting
  } else {
    highlightWireframe.visible = false;
  }

  renderer.render(scene, camera);
}

// ===== helpers =====
function clampXZ(v){
  v.x = Math.max(0.001, Math.min(99.999, v.x));
  v.z = Math.max(0.001, Math.min(99.999, v.z));
}
function inWorldXZ(x,z){ return x>=0 && z>=0 && x<100 && z<100; }
function getForward(){
  const f = new THREE.Vector3(0,0,-1);
  f.applyQuaternion(pitch.quaternion).applyQuaternion(yaw.quaternion);
  f.y=0; f.normalize();
  return f;
}
function getLookDirection(){
  const d = new THREE.Vector3(0,0,-1);
  d.applyQuaternion(pitch.quaternion).applyQuaternion(yaw.quaternion);
  d.normalize();
  return d;
}
// Fast voxel ray (3D DDA)
function raycastVoxel(origin, dir, maxDist){
  const pos = new THREE.Vector3().copy(origin);
  const step = new THREE.Vector3(Math.sign(dir.x)||1, Math.sign(dir.y)||1, Math.sign(dir.z)||1);
  const tDelta = new THREE.Vector3(
    Math.abs(1/dir.x)||1e9,
    Math.abs(1/dir.y)||1e9,
    Math.abs(1/dir.z)||1e9
  );
  let voxel = new THREE.Vector3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
  const bound = new THREE.Vector3(
    voxel.x + (step.x>0 ? 1 : 0),
    voxel.y + (step.y>0 ? 1 : 0),
    voxel.z + (step.z>0 ? 1 : 0)
  );
  const tMax = new THREE.Vector3(
    (bound.x - pos.x) * tDelta.x,
    (bound.y - pos.y) * tDelta.y,
    (bound.z - pos.z) * tDelta.z
  );
  let dist = 0; let lastVoxel = voxel.clone();
  for(let i=0;i<256;i++){
    if(inWorldXZ(voxel.x, voxel.z)){
      const id = WORLD.getVoxel(voxel.x, voxel.y, voxel.z);
      if(id!==BLOCK.AIR){
        return { pos: voxel.clone(), prev: lastVoxel.clone(), id };
      }
    }
    if(tMax.x < tMax.y){
      if(tMax.x < tMax.z){ lastVoxel = voxel.clone(); voxel.x += step.x; dist=tMax.x; tMax.x += tDelta.x; }
      else               { lastVoxel = voxel.clone(); voxel.z += step.z; dist=tMax.z; tMax.z += tDelta.z; }
    }else{
      if(tMax.y < tMax.z){ lastVoxel = voxel.clone(); voxel.y += step.y; dist=tMax.y; tMax.y += tDelta.y; }
      else               { lastVoxel = voxel.clone(); voxel.z += step.z; dist=tMax.z; tMax.z += tDelta.z; }
    }
    if(dist>maxDist) break;
  }
  return null;
}

// Start position middle of map
yaw.position.set(50.5, 2.6, 50.5);

// Resize
addEventListener('resize', ()=>{
  renderer.setSize(innerWidth, innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
});
