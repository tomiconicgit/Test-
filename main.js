import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { makeMaterials } from './engine/Materials.js';
import { VoxelWorld } from './engine/VoxelWorld.js';
import { Joystick } from './ui/Joystick.js';

// Import the new controllers
import { InputController } from './engine/inputController.js';
import { Player } from './engine/player.js';
import { PlacementController } from './engine/placement.js';

// Import geometries
import { createBlockGeometry } from './engine/structures/block.js';
import { createWallGeometry } from './engine/structures/wall.js';
import { createFloorGeometry } from './engine/structures/floor.js';
import { createGlassPaneGeometry } from './engine/structures/glass.js';
import { createSlopeGeometry } from './engine/structures/slope.js';
import { createCylinderGeometry } from './engine/structures/cylinder.js';
import {
    createPipeStraightGeometry,
    createPipeElbowGeometry
} from './engine/structures/pipe.js';

// --- INITIALIZATION ---
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- MODIFICATION: Increased Exposure ---
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // Increased from 1.0 - Makes everything brighter

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa7c4ff, 80, 300);
renderer.setClearColor(0x87b4ff, 1.0);

const camera = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 0.1, 1000);

// --- MODIFICATION: Increased Light Intensities ---
const hemi = new THREE.HemisphereLight(0xddeeff, 0x998877, 2.0); // Increased from 1.8
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.0); // Increased from 1.5
sun.position.set(100, 100, 50); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.5); // Increased from 0.3
scene.add(ambient);
// --- END MODIFICATION ---

const materials = await makeMaterials();

// Geometries list
const propGeometries = { /* ... unchanged ... */ };

// --- CREATE CONTROLLERS AND WORLD ---
const input = new InputController(new Joystick(document.getElementById('joystick')));
const player = new Player(scene, camera);
const placement = new PlacementController(scene, camera, propGeometries, materials);
const world = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });

// --- UI STATE ---
let activeItem = 'VOXEL';
let activeMaterial = materials.metal;
let activeScale = 1.0;

document.getElementById('itemPicker').addEventListener('change', e => { activeItem = e.target.value; });
document.getElementById('texturePicker').addEventListener('change', e => {
  activeMaterial = materials[e.target.value] || materials.metal;
});

const scaleButtons = document.querySelectorAll('.scaleBtn');
scaleButtons.forEach(button => {
  button.addEventListener('click', () => {
    scaleButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    activeScale = parseFloat(button.dataset.scale);
  });
});

// --- UI ACTIONS ---
document.getElementById('btnPlace').addEventListener('click', () => placement.place(world, activeItem, activeMaterial, activeScale));
document.getElementById('btnRemove').addEventListener('click', () => placement.remove(world));
document.getElementById('btnSave').addEventListener('click', () => { /* ... save logic ... */ });
const loadFileInput = document.getElementById('loadFile');
document.getElementById('btnLoad').addEventListener('click', () => { loadFileInput.click(); });
loadFileInput.addEventListener('change', (event) => { /* ... load logic ... */ });

// --- MAIN LOOP ---
let lastT = performance.now();
function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min((performance.now() - lastT) / 1000, 0.05);
    lastT = performance.now();

    // Update controllers
    input.update(dt);
    player.update(dt, input, world);
    placement.update(world, player, activeItem, activeMaterial, activeScale, input);

    // Check for actions from input controller
    if (input.place) {
        placement.place(world, activeItem, activeMaterial, activeScale);
    }
    if (input.remove) {
        placement.remove(world);
    }
    if (input.rotate) {
        placement.rotate(world);
    }

    renderer.render(scene, camera);
}
tick(); // Start the game loop

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
