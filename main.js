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

const camera = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 0.1, 1000);
const yaw = new THREE.Object3D(); const pitch = new THREE.Object3D();
yaw.add(pitch); pitch.add(camera); scene.add(yaw);

// Lights
const hemi = new THREE.HemisphereLight(0xddeeff, 0x998877, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100, 100, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);
const lightFill1 = new THREE.DirectionalLight(0xffffff, 0.4); lightFill1.position.set(-100, 60, -50); scene.add(lightFill1);
const lightFill2 = new THREE.DirectionalLight(0xffffff, 0.4); lightFill2.position.set(50, 60, -100); scene.add(lightFill2);
const lightFill3 = new THREE.DirectionalLight(0xffffff, 0.4); lightFill3.position.set(-50, 60, 100); scene.add(lightFill3);

const materials = await makeMaterials();
const WORLD = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });

// Player/State
const SPEED = 4.0;
const EYE = 1.6;
let activeItem = 'METAL';
const props = [];
const raycaster = new THREE.Raycaster();

// --- PROP GEOMETRIES ---
const wallGeo = new THREE.BoxGeometry(1, 1, 0.1); wallGeo.translate(0, 0.5, 0);
const paneGeo = new THREE.BoxGeometry(0.8, 1, 0.05); paneGeo.translate(0, 0.5, 0);
const doorGeo = new THREE.BoxGeometry(1, 2, 0.15); doorGeo.translate(0, 1, 0);

const propGeometries = { 'WALL': wallGeo, 'PANE': paneGeo, 'DOOR': doorGeo };

// Ghost preview mesh
const previewMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
const previewMesh = new THREE.Mesh(wallGeo, previewMat); // Start with wall geometry
previewMesh.visible = false;
scene.add(previewMesh);

// Block highlight
const boxGeom = new THREE.BoxGeometry(1.001, 1.001, 1.001);
const edges = new THREE.EdgesGeometry(boxGeom);
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
const highlightWireframe = new THREE.LineSegments(edges, lineMat);
scene.add(highlightWireframe);

let currentHit = null;

// --- UI WIRING ---
const js = new Joystick(document.getElementById('joystick'));
document.getElementById('itemPicker').addEventListener('change', e => { activeItem = e.target.value; });

document.getElementById('btnPlace').addEventListener('click', () => {
  if (!currentHit) return;
  const item = activeItem;
  if (item === 'METAL' || item === 'CONCRETE') {
    const block = (item === 'METAL') ? BLOCK.METAL : BLOCK.CONCRETE;
    const p = currentHit.prev;
    if(!inWorldXZ(p.x,p.z) || p.y < WORLD.minY || p.y > WORLD.maxY) return;
    WORLD.setVoxel(p.x, p.y, p.z, block, true);
  } else if (propGeometries[item] && previewMesh.visible) {
    let material = materials.metal;
    if (item === 'PANE') material = materials.glass;
    
    const newProp = new THREE.Mesh(propGeometries[item], material);
    newProp.position.copy(previewMesh.position);
    newProp.rotation.copy(previewMesh.rotation);
    newProp.castShadow = newProp.receiveShadow = true;
    newProp.name = item.toLowerCase(); // 'wall', 'pane', 'door'
    
    if (item === 'DOOR') {
      newProp.userData.isOpen = false;
    }

    scene.add(newProp);
    props.push(newProp);
  }
});

document.getElementById('btnUse').addEventListener('click', () => {
    raycaster.setFromCamera({x:0, y:0}, camera);
    const intersects = raycaster.intersectObjects(props, false);
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.name === 'door') {
            obj.userData.isOpen = !obj.userData.isOpen;
            // Animate door
            const targetAngle = obj.userData.isOpen ? Math.PI / 2 : 0;
            // Simple instant rotation for now
            obj.rotation.y += targetAngle - (obj.rotation.y % (Math.PI*2));
        }
    }
});

document.getElementById('btnRemove').addEventListener('click', () => {
  raycaster.setFromCamera({x:0, y:0}, camera);
  const intersects = raycaster.intersectObjects(props);
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    scene.remove(obj);
    props.splice(props.indexOf(obj), 1);
    if(obj.geometry) obj.geometry.dispose();
  } else {
    if (!currentHit) return;
    WORLD.setVoxel(currentHit.pos.x, currentHit.pos.y, currentHit.pos.z, BLOCK.AIR, true);
  }
});

// Look (right-half drag)
let lookId=null, lastX=0, lastY=0;
window.addEventListener('pointerdown', e=>{ if(e.clientX > innerWidth*0.5){ lookId = e.pointerId; lastX=e.clientX; lastY=e.clientY; }});
window.addEventListener('pointermove', e=>{
  if(e.pointerId!==lookId) return;
  const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
  const sens = 0.3 * (1/renderer.getPixelRatio());
  yaw.rotation.y -= dx * sens * 0.01;
  pitch.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch.rotation.x - dy * sens * 0.01));
});
window.addEventListener('pointerup', e=>{ if(e.pointerId===lookId) lookId=null; });

// Main Loop
let lastT = performance.now();
tick();
function tick(){
  requestAnimationFrame(tick);
  const t = performance.now(); const dt = Math.min((t-lastT)/1000, 0.05); lastT=t;

  const forward = -js.axY; const strafe = js.axX;
  const dir = getForward();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();
  yaw.position.addScaledVector(dir, forward * SPEED * dt);
  yaw.position.addScaledVector(right, strafe * SPEED * dt);
  clampXZ(yaw.position);

  const gx=Math.floor(yaw.position.x), gz=Math.floor(yaw.position.z);
  const top = WORLD.topY(gx,gz);
  const targetY = (top<WORLD.minY ? 0 : top + 1) + EYE;
  yaw.position.y += (targetY - yaw.position.y) * 0.35;

  currentHit = raycastVoxel(yaw.position, getLookDirection(), 8.0);
  
  const isBlockActive = activeItem === 'METAL' || activeItem === 'CONCRETE';
  highlightWireframe.visible = isBlockActive && currentHit;
  previewMesh.visible = propGeometries[activeItem] && currentHit;

  if (currentHit) {
    if(isBlockActive) {
      highlightWireframe.position.set(currentHit.pos.x + 0.5, currentHit.pos.y + 0.5, currentHit.pos.z + 0.5);
    } else if (propGeometries[activeItem]) {
      previewMesh.geometry = propGeometries[activeItem]; // Update preview shape
      const pos = currentHit.prev;
      const normal = currentHit.normal;
      
      previewMesh.position.set(pos.x + 0.5, pos.y, pos.z + 0.5);
      
      // Orient based on which face is being looked at
      if (Math.abs(normal.x) > 0.5) { // Left or Right face
        previewMesh.rotation.y = Math.PI / 2;
      } else if (Math.abs(normal.z) > 0.5) { // Front or Back face
        previewMesh.rotation.y = 0;
      } else { // Top or Bottom face
         // Align with player direction
        previewMesh.rotation.y = Math.round(yaw.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
      }
    }
  }
  renderer.render(scene, camera);
}

// ===== helpers =====
function clampXZ(v){ v.x = Math.max(0.001, Math.min(99.999, v.x)); v.z = Math.max(0.001, Math.min(99.999, v.z)); }
function inWorldXZ(x,z){ return x>=0 && z>=0 && x<100 && z<100; }
function getForward(){ const f=new THREE.Vector3(0,0,-1); f.applyQuaternion(pitch.quaternion).applyQuaternion(yaw.quaternion); f.y=0; f.normalize(); return f; }
function getLookDirection(){ const d=new THREE.Vector3(0,0,-1); d.applyQuaternion(pitch.quaternion).applyQuaternion(yaw.quaternion); d.normalize(); return d; }

// Enhanced RaycastVoxel to return hit normal
function raycastVoxel(origin, dir, maxDist){
  const pos = new THREE.Vector3().copy(origin);
  const step = new THREE.Vector3(Math.sign(dir.x)||1, Math.sign(dir.y)||1, Math.sign(dir.z)||1);
  const tDelta = new THREE.Vector3( Math.abs(1/dir.x)||1e9, Math.abs(1/dir.y)||1e9, Math.abs(1/dir.z)||1e9 );
  let voxel = new THREE.Vector3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
  const bound = new THREE.Vector3( voxel.x + (step.x > 0 ? 1 : 0), voxel.y + (step.y > 0 ? 1 : 0), voxel.z + (step.z > 0 ? 1 : 0) );
  const tMax = new THREE.Vector3(
    dir.x !== 0 ? (bound.x - pos.x) / dir.x : 1e9,
    dir.y !== 0 ? (bound.y - pos.y) / dir.y : 1e9,
    dir.z !== 0 ? (bound.z - pos.z) / dir.z : 1e9
  );
  let dist = 0; let lastVoxel = voxel.clone();
  for(let i=0;i<256;i++){
    if(inWorldXZ(voxel.x, voxel.z)){
      const id = WORLD.getVoxel(voxel.x, voxel.y, voxel.z);
      if(id!==BLOCK.AIR){
        const normal = lastVoxel.clone().sub(voxel);
        return { pos: voxel.clone(), prev: lastVoxel.clone(), id, normal };
      }
    }
    lastVoxel.copy(voxel);
    if(tMax.x < tMax.y){
      if(tMax.x < tMax.z){ voxel.x += step.x; dist=tMax.x; tMax.x += tDelta.x; }
      else { voxel.z += step.z; dist=tMax.z; tMax.z += tDelta.z; }
    }else{
      if(tMax.y < tMax.z){ voxel.y += step.y; dist=tMax.y; tMax.y += tDelta.y; }
      else { voxel.z += step.z; dist=tMax.z; tMax.z += tDelta.z; }
    }
    if(dist>maxDist) break;
  }
  return null;
}

yaw.position.set(50.5, 2.6, 50.5);
addEventListener('resize', ()=>{
  renderer.setSize(innerWidth, innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
});
