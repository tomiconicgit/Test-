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
let renderer, scene, camera, materials, propGeometries, input, player, placement, world; // Declare vars

async function initializeApp() {
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(innerWidth, innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // --- Tone Mapping (keeping exposure slightly increased) ---
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2; // Reduced from 1.5, still brighter than 1.0

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xa7c4ff, 80, 300);
        renderer.setClearColor(0x87b4ff, 1.0);

        camera = new THREE.PerspectiveCamera(90, innerWidth/innerHeight, 0.1, 1000);

        // --- Slightly Reduced Light Intensities ---
        const hemi = new THREE.HemisphereLight(0xddeeff, 0x998877, 1.5); // Reduced from 2.0
        scene.add(hemi);

        const sun = new THREE.DirectionalLight(0xffffff, 1.8); // Reduced from 2.0
        sun.position.set(100, 100, 50); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
        scene.add(sun);

        const ambient = new THREE.AmbientLight(0xffffff, 0.4); // Reduced from 0.5
        scene.add(ambient);
        // --- END LIGHTING ADJUSTMENT ---

        console.log("Loading materials...");
        materials = await makeMaterials();
        console.log("Materials loaded:", Object.keys(materials));

        // Geometries list
        propGeometries = {
            'BLOCK': createBlockGeometry(),
            'WALL': createWallGeometry(),
            'PANE': createGlassPaneGeometry(),
            'FLOOR': createFloorGeometry(),
            'SLOPE': createSlopeGeometry(),
            'CYLINDER': createCylinderGeometry(),
            'PIPE_STRAIGHT': createPipeStraightGeometry(),
            'PIPE_ELBOW': createPipeElbowGeometry(),
        };
        console.log("Geometries created.");

        // --- CREATE CONTROLLERS AND WORLD ---
        input = new InputController(new Joystick(document.getElementById('joystick')));
        player = new Player(scene, camera);
        placement = new PlacementController(scene, camera, propGeometries, materials);
        world = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });
        console.log("World and controllers initialized.");

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

        document.getElementById('btnSave').addEventListener('click', () => {
            try {
                const worldData = world.serialize();
                const blob = new Blob([worldData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'world.json';
                a.click();
                URL.revokeObjectURL(url);
             } catch (error) {
                 console.error("Error saving world:", error);
                 alert("Could not save world data.");
             }
        });

        const loadFileInput = document.getElementById('loadFile');
        document.getElementById('btnLoad').addEventListener('click', () => {
            loadFileInput.click(); // Open the file picker
        });

        loadFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                 try {
                    console.log("Deserializing world data...");
                    world.deserialize(content, propGeometries);
                    console.log("World deserialized successfully.");
                } catch (error) {
                    console.error("Failed to load world:", error);
                    alert("Error loading world file. It might be corrupted.");
                }
            };
             reader.onerror = (e) => {
                 console.error("Error reading file:", e);
                 alert("Could not read the selected file.");
             };
            reader.readAsText(file);
            event.target.value = null; // Reset input
        });

        // --- MAIN LOOP ---
        let lastT = performance.now();
        function tick() {
            requestAnimationFrame(tick);
            const dt = Math.min((performance.now() - lastT) / 1000, 0.05);
            lastT = performance.now();

            try { // Add try...catch around updates
                // Update controllers
                input.update(dt);
                player.update(dt, input, world);
                // Ensure placement is defined before calling update
                if (placement) {
                    placement.update(world, player, activeItem, activeMaterial, activeScale, input);
                } else {
                    console.warn("Placement controller not initialized yet.");
                }


                // Check for actions from input controller
                // Ensure placement is defined before calling actions
                if (placement) {
                    if (input.place) {
                        placement.place(world, activeItem, activeMaterial, activeScale);
                    }
                    if (input.remove) {
                        placement.remove(world);
                    }
                    if (input.rotate) {
                        placement.rotate(world);
                    }
                }

                // Ensure renderer and scene are defined
                if (renderer && scene && camera) {
                    renderer.render(scene, camera);
                }

             } catch (error) {
                 console.error("Error in tick function:", error);
                 // Optionally stop the loop if a critical error occurs
                 // return;
             }
        }

        console.log("Starting main loop.");
        tick(); // Start the game loop

        window.addEventListener('resize', () => {
            if (renderer && camera) {
                renderer.setSize(window.innerWidth, window.innerHeight);
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
            }
        });

    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Failed to initialize the application. Please check the console for errors.");
    }
}

// Start the app initialization
initializeApp();

