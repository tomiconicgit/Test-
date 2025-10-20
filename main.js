import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { makeMaterials } from './engine/Materials.js';
import { VoxelWorld, BLOCK } from './engine/VoxelWorld.js';
import { Joystick } from './ui/Joystick.js';

// Import new structure modules
import { createBlockGeometry } from './engine/structures/block.js';
import { createWallGeometry } from './engine/structures/wall.js';
import { createFloorGeometry } from './engine/structures/floor.js';
import { createGlassPaneGeometry } from './engine/structures/glass.js';
import { createSlopeGeometry } from './engine/structures/slope.js';
import { createCylinderGeometry } from './engine/structures/cylinder.js';


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
const hemi = new THREE.HemisphereLight(0xddeeff, 0x998877, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100, 100, 50); sun.castShadow = true;
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
const SPEED = 5.0; const EYE = 1.6; let activeItem = 'BLOCK'; let isFlying = false; let isSnapping = false; let snapTarget = null;
let activeMaterial = materials.metal; // New state for selected texture
const props = []; const raycaster = new THREE.Raycaster(); raycaster.far = 8.0;

// --- PROP GEOMETRIES FROM MODULES ---
const propGeometries = {
    'BLOCK': createBlockGeometry(), // This is now a prop, separate from the voxel block
    'WALL': createWallGeometry(),
    'PANE': createGlassPaneGeometry(),
    'FLOOR': createFloorGeometry(),
    'SLOPE': createSlopeGeometry(),
    'CYLINDER': createCylinderGeometry(),
};

// Previews & Highlights
const previewMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
const previewMesh = new THREE.Mesh(new THREE.BoxGeometry(), previewMat);
previewMesh.visible = false; scene.add(previewMesh);
const voxelHighlight = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001)), new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 }));
scene.add(voxelHighlight);
const propHighlight = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
propHighlight.visible = false; scene.add(propHighlight);

let currentHit = null;

// Gamepad & UI Wiring
let gamepad = null; let r2Pressed = false, l2Pressed = false, aPressed = false, r1Pressed = false; let lastAPressTime = 0;
window.addEventListener('gamepadconnected', (e) => { gamepad = e.gamepad; }); window.addEventListener('gamepaddisconnected', () => { gamepad = null; });
const js = new Joystick(document.getElementById('joystick'));
document.getElementById('itemPicker').addEventListener('change', e => { activeItem = e.target.value; });
document.getElementById('texturePicker').addEventListener('change', e => {
    // Update the active material based on selection
    activeMaterial = materials[e.target.value] || materials.metal;
});

function placeAction() {
    if (!currentHit && !isSnapping) return;
    if (isSnapping && previewMesh.visible) { placeProp(); isSnapping = false; snapTarget = null; return; }
    if (currentHit) {
        if (activeItem === 'BLOCK') { WORLD.setVoxel(currentHit.prev.x, currentHit.prev.y, currentHit.prev.z, BLOCK.METAL, true); }
        else if (propGeometries[activeItem] && previewMesh.visible) { placeProp(); }
    }
}
function placeProp() {
    // Use the activeMaterial, but override for Glass Panes
    let material = activeItem === 'PANE' ? materials.glass : activeMaterial;
    const newProp = new THREE.Mesh(propGeometries[activeItem], material);
    newProp.position.copy(previewMesh.position); newProp.rotation.copy(previewMesh.rotation);
    newProp.castShadow = newProp.receiveShadow = true; newProp.name = activeItem.toLowerCase();
    if (activeItem.includes('FLOOR')) newProp.userData = { height: 0.1 }; else newProp.userData = { height: 1 };
    scene.add(newProp); props.push(newProp);
}
function removeAction() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera); const intersects = raycaster.intersectObjects(props);
    if (intersects.length > 0) { const obj = intersects[0].object; if(snapTarget === obj) { isSnapping = false; snapTarget = null; } scene.remove(obj); props.splice(props.indexOf(obj), 1); if (obj.geometry) obj.geometry.dispose(); }
    else { if (!currentHit || !currentHit.isVoxel) return; WORLD.setVoxel(currentHit.pos.x, currentHit.pos.y, currentHit.pos.z, BLOCK.AIR, true); }
}
document.getElementById('btnPlace').addEventListener('click', placeAction); document.getElementById('btnRemove').addEventListener('click', removeAction);

// MAIN LOOP
let lastT = performance.now();
tick();
function tick() {
    requestAnimationFrame(tick); const t = performance.now(); const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t; let targetedProp = null;
    if (navigator.getGamepads && navigator.getGamepads()[0]) {
        gamepad = navigator.getGamepads()[0]; const deadzone=0.15; const ax0=gamepad.axes[0]; const ax1=gamepad.axes[1]; if(Math.abs(ax0)>deadzone||Math.abs(ax1)>deadzone){js.axX=ax0;js.axY=ax1;}else{js.axX=0;js.axY=0;}
        const ax2=gamepad.axes[2]; const ax3=gamepad.axes[3]; if(Math.abs(ax2)>deadzone)yaw.rotation.y-=ax2*2.5*dt; if(Math.abs(ax3)>deadzone)pitch.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch.rotation.x-ax3*2.5*dt));
        if(gamepad.buttons[7].pressed&&!r2Pressed){placeAction();r2Pressed=true;}else if(!gamepad.buttons[7].pressed){r2Pressed=false;}
        if(gamepad.buttons[6].pressed&&!l2Pressed){removeAction();l2Pressed=true;}else if(!gamepad.buttons[6].pressed){l2Pressed=false;}
        if(gamepad.buttons[0].pressed&&!aPressed){if(t-lastAPressTime<300){isFlying=!isFlying;}lastAPressTime=t;aPressed=true;}else if(!gamepad.buttons[0].pressed){aPressed=false;}
        if(isFlying){const flySpeed=SPEED*dt;if(gamepad.buttons[0].pressed)yaw.position.y+=flySpeed;if(gamepad.buttons[2].pressed)yaw.position.y-=flySpeed;}
        if(gamepad.buttons[5].pressed&&!r1Pressed){raycaster.setFromCamera({x:0,y:0},camera);const intersects=raycaster.intersectObjects(props);if(intersects.length>0){targetedProp=intersects[0].object;if(isSnapping&&snapTarget===targetedProp){isSnapping=false;snapTarget=null;}else{isSnapping=true;snapTarget=targetedProp;}}r1Pressed=true;}else if(!gamepad.buttons[5].pressed){r1Pressed=false;}
    }
    const forward=-js.axY; const strafe=js.axX; const dir=getForward(isFlying); const right=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();
    yaw.position.addScaledVector(dir,forward*SPEED*dt); yaw.position.addScaledVector(right,strafe*SPEED*dt); clampXZ(yaw.position);
    if(!isFlying){const gx=Math.floor(yaw.position.x),gz=Math.floor(yaw.position.z);const top=WORLD.topY(gx,gz);const targetY=(top<WORLD.minY?0:top+1)+EYE;yaw.position.y+=(targetY-yaw.position.y)*0.35;}
    currentHit = null; voxelHighlight.visible = false; propHighlight.visible = false; previewMesh.visible = false;
    raycaster.setFromCamera({x:0,y:0},camera); const propIntersects=raycaster.intersectObjects(props,false); const propHit=propIntersects.length>0?propIntersects[0]:null; targetedProp=propHit?propHit.object:null;
    if(isSnapping&&targetedProp!==snapTarget){isSnapping=false;snapTarget=null;}
    if(isSnapping&&snapTarget){
        propHighlight.setFromObject(snapTarget);propHighlight.visible=true;
        if(propGeometries[activeItem]){
            previewMesh.geometry=propGeometries[activeItem];
            const targetBox = new THREE.Box3().setFromObject(snapTarget);
            const newY = targetBox.max.y;
            let newPos = new THREE.Vector3(snapTarget.position.x,newY,snapTarget.position.z);
            previewMesh.position.copy(newPos);previewMesh.rotation.copy(snapTarget.rotation);previewMesh.visible=true;
        }
    }else{
        const voxelHit=raycastVoxel(yaw.position,getLookDirection(),8.0);
        if(propHit&&(!voxelHit||propHit.distance<voxelHit.distance)){propHighlight.setFromObject(propHit.object);propHighlight.visible=true;}
        else if(voxelHit){
            currentHit={...voxelHit,isVoxel:true}; const isBlock=activeItem==='BLOCK'; const isProp=propGeometries[activeItem];
            if(isBlock){voxelHighlight.position.set(currentHit.pos.x+0.5,currentHit.pos.y+0.5,currentHit.pos.z+0.5);voxelHighlight.visible=true;}
            else if(isProp){
                previewMesh.geometry=propGeometries[activeItem]; const pos=currentHit.prev; const normal=currentHit.normal; const playerAngle=Math.round(yaw.rotation.y/(Math.PI/2))*(Math.PI/2);
                if(activeItem==='FLOOR'){if(normal.y>0.5){previewMesh.position.set(currentHit.pos.x+0.5,currentHit.pos.y+1,currentHit.pos.z+0.5);previewMesh.visible=true;}}
                else{
                    previewMesh.position.set(pos.x+0.5,pos.y,pos.z+0.5);
                    previewMesh.rotation.y = playerAngle;
                    previewMesh.visible=true;
                }
            }
        }
    }
    renderer.render(scene,camera);
}
function clampXZ(v){v.x=Math.max(0.001,Math.min(99.999,v.x));v.z=Math.max(0.001,Math.min(99.999,v.z));}
function inWorldXZ(x,z){return x>=0&&z>=0&&x<100&&z<100;}
function getForward(flying=false){const f=new THREE.Vector3(0,0,-1);f.applyQuaternion(pitch.quaternion).applyQuaternion(yaw.quaternion);if(!flying)f.y=0;f.normalize();return f;}
function getLookDirection(){const d=new THREE.Vector3(0,0,-1);d.applyQuaternion(pitch.quaternion).applyQuaternion(yaw.quaternion);d.normalize();return d;}
function raycastVoxel(origin,dir,maxDist){const pos=new THREE.Vector3().copy(origin);const step=new THREE.Vector3(Math.sign(dir.x)||1,Math.sign(dir.y)||1,Math.sign(dir.z)||1);const tDelta=new THREE.Vector3(Math.abs(1/dir.x)||1e9,Math.abs(1/dir.y)||1e9,Math.abs(1/dir.z)||1e9);let voxel=new THREE.Vector3(Math.floor(pos.x),Math.floor(pos.y),Math.floor(pos.z));const bound=new THREE.Vector3(voxel.x+(step.x>0?1:0),voxel.y+(step.y>0?1:0),voxel.z+(step.z>0?1:0));const tMax=new THREE.Vector3(dir.x!==0?(bound.x-pos.x)/dir.x:1e9,dir.y!==0?(bound.y-pos.y)/dir.y:1e9,dir.z!==0?(bound.z-pos.z)/dir.z:1e9);let dist=0;let lastVoxel=voxel.clone();for(let i=0;i<256;i++){if(inWorldXZ(voxel.x,voxel.z)){const id=WORLD.getVoxel(voxel.x,voxel.y,voxel.z);if(id!==BLOCK.AIR){const normal=lastVoxel.clone().sub(voxel);return{pos:voxel.clone(),prev:lastVoxel.clone(),id,normal,distance:dist};}}
lastVoxel.copy(voxel);if(tMax.x<tMax.y){if(tMax.x<tMax.z){voxel.x+=step.x;dist=tMax.x;tMax.x+=tDelta.x;}else{voxel.z+=step.z;dist=tMax.z;tMax.z+=tDelta.z;}}else{if(tMax.y<tMax.z){voxel.y+=step.y;dist=tMax.y;tMax.y+=tDelta.y;}else{voxel.z+=step.z;dist=tMax.z;tMax.z+=tDelta.z;}}
if(dist>maxDist)break;}
return null;}
yaw.position.set(50.5, 2.6, 50.5);
addEventListener('resize', ()=>{ renderer.setSize(innerWidth, innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); });
