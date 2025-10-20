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
// This import is now simple and has no bad dependencies
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

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa7c4ff, 80, 300);
renderer.setClearColor(0x87b4ff, 1.0);

const camera = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 0.1, 1000);

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

// Geometries list is now simple
const propGeometries = {
    'BLOCK': createBlockGeometry(),
    'WALL': createWallGeometry(),
    'PANE': createGlassPaneGeometry(),
    'FLOOR': createFloorGeometry(),
    'SLOPE': createSlopeGeometry(),
    'CYLINDER': createCylinderGeometry(),
    'PIPE_STRAIGHT': createPipeStraightGeometry(),
    'PIPE_ELBOW': createPipeElbowGeometry(),
};

// --- CREATE CONTROLLERS AND WORLD ---
const input = new InputController(new Joystick(document.getElementById('joystick')));
const player = new Player(scene, camera);
const placement = new PlacementController(scene, camera, propGeometries, materials);
const world = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });
world.props = []; // Add props array to world for the placement controller to use

// --- UI STATE ---
let activeItem = 'VOXEL';
let activeMaterial = materials.metal;
document.getElementById('itemPicker').addEventListener('change', e => { activeItem = e.target.value; });
document.getElementById('texturePicker').addEventListener('change', e => { activeMaterial = materials[e.target.value] || materials.metal; });

// --- UI ACTIONS ---
document.getElementById('btnPlace').addEventListener('click', () => placement.place(world, activeItem));
document.getElementById('btnRemove').addEventListener('click', () => placement.remove(world));

// --- MAIN LOOP ---
let lastT = performance.now();
function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min((performance.now() - lastT) / 1000, 0.05);
    lastT = performance.now();

    // Update controllers
    input.update(dt);
    player.update(dt, input, world);
    placement.update(world, player, activeItem, input);

    // Check for actions from input controller
    if (input.place) {
        placement.place(world, activeItem);
    }
    if (input.remove) {
        placement.remove(world);
    }
    // This is the rotate check you asked for
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
