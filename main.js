console.log("Executing main.js...");

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { makeMaterials } from './engine/Materials.js';
import { VoxelWorld } from './engine/VoxelWorld.js';
import { Player } from './engine/player.js';
import { InputController } from './engine/inputController.js';
import { PlacementController } from './engine/placement.js';
import { Joystick } from './ui/Joystick.js';

// Import Geometries
import { createBlockGeometry } from './engine/structures/block.js';
import { createCylinderGeometry } from './engine/structures/cylinder.js';
import { createFloorGeometry } from './engine/structures/floor.js';
import { createGlassPaneGeometry } from './engine/structures/glass.js';
import { createPipeStraightGeometry, createPipeElbowGeometry } from './engine/structures/pipe.js';
import { createSlopeGeometry } from './engine/structures/slope.js';
import { createWallGeometry } from './engine/structures/wall.js';


// --- ADD CHECK AFTER IMPORT ---
if (typeof makeMaterials !== 'function') {
    console.error("FATAL: makeMaterials was NOT imported correctly!");
    alert("Critical Error: Failed to load material definitions. Check console.");
    throw new Error("makeMaterials import failed.");
} else {
    console.log("makeMaterials function seems to be imported.");
}

// --- INITIALIZATION ---
// --- FIX: Declare all module-level variables here ---
let materials, world, player, input, placement, propGeometries;
let renderer, scene, camera, sun, hemi, ambient; // Added for settings panel

async function initializeApp() {
    console.log("initializeApp() started.");
    try {
        // --- Renderer, Scene, Camera, Lights ---
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0b0d10, 10, 70);
        scene.background = new THREE.Color(0x0b0d10);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // --- Lights (based on settings panel) ---
        sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(100, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        scene.add(sun);
        scene.add(sun.target);

        hemi = new THREE.HemisphereLight(0x87ceeb, 0x403020, 1.5);
        scene.add(hemi);

        ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        console.log("Calling makeMaterials...");
        if (typeof makeMaterials !== 'function') {
             throw new Error("makeMaterials is not available right before calling it!");
        }
        
        materials = await makeMaterials(); // This line will now work
        console.log("Materials loaded:", Object.keys(materials));

        // --- Geometries ---
        propGeometries = {
            'BLOCK': createBlockGeometry(),
            'WALL': createWallGeometry(),
            'FLOOR': createFloorGeometry(),
            'SLOPE': createSlopeGeometry(),
            'CYLINDER': createCylinderGeometry(),
            'PANE': createGlassPaneGeometry(),
            'PIPE': createPipeStraightGeometry(),
            'ELBOW': createPipeElbowGeometry()
        };
        console.log("Geometries created.");

        // --- Controllers & World ---
        input = new InputController(new Joystick(document.getElementById('joystick')));
        player = new Player(scene, camera);
        placement = new PlacementController(scene, camera, propGeometries, materials);
        world = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });
        console.log("World and controllers initialized.");

        // --- UI State ---
        let activeItem = 'BLOCK';
        let activeMaterial = materials.metal;
        let activeScale = 1.0;

        // --- UI Listeners ---
        const itemPicker = document.getElementById('itemPicker');
        const texturePicker = document.getElementById('texturePicker');
        
        // Populate Pickers
        Object.keys(propGeometries).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name.charAt(0) + name.slice(1).toLowerCase();
            itemPicker.appendChild(opt);
        });
        const voxelOpt = document.createElement('option');
        voxelOpt.value = 'VOXEL';
        voxelOpt.textContent = 'Voxel';
        itemPicker.prepend(voxelOpt);
        itemPicker.value = 'VOXEL';

        Object.keys(materials).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name.charAt(0) + name.slice(1).toLowerCase();
            if (name === 'sand' || name === 'glass') opt.disabled = true; // Can't place sand/glass directly
            texturePicker.appendChild(opt);
        });
        texturePicker.value = 'metal';


        itemPicker.addEventListener('change', (e) => activeItem = e.target.value);
        texturePicker.addEventListener('change', (e) => activeMaterial = materials[e.target.value]);

        document.getElementById('btnPlace').addEventListener('click', () => placement.place(world, activeItem, activeMaterial, activeScale));
        document.getElementById('btnRemove').addEventListener('click', () => placement.remove(world));

        // Scale buttons
        const scaleButtons = document.getElementById('scaleButtons');
        scaleButtons.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                scaleButtons.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                activeScale = parseFloat(e.target.dataset.scale);
            }
        });

        // Save / Load
        document.getElementById('btnSave').addEventListener('click', () => {
            const data = world.serialize();
            const blob = new Blob([data], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'world.json';
            a.click();
            URL.revokeObjectURL(a.href);
        });
        
        const loadFile = document.getElementById('loadFile');
        document.getElementById('btnLoad').addEventListener('click', () => loadFile.click());
        loadFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    world.deserialize(event.target.result, propGeometries);
                    console.log("World loaded.");
                } catch (err) {
                    console.error("Failed to load world:", err);
                    alert("Error loading world file. See console for details.");
                }
            };
            reader.readAsText(file);
            e.target.value = null; // Reset file input
        });

        // --- Settings Panel ---
        const settingsPanel = document.getElementById('settingsPanel');
        const settingsOutput = document.getElementById('settingsOutput');
        
        document.getElementById('btnSettings').addEventListener('click', () => settingsPanel.classList.remove('hidden'));
        document.getElementById('btnCloseSettings').addEventListener('click', () => settingsPanel.classList.add('hidden'));

        const sliders = [
            { id: 'exposure', obj: renderer, prop: 'toneMappingExposure', valId: 'exposureValue' },
            { id: 'sunIntensity', obj: sun, prop: 'intensity', valId: 'sunIntensityValue' },
            { id: 'sunX', obj: sun.position, prop: 'x', valId: 'sunXValue' },
            { id: 'sunY', obj: sun.position, prop: 'y', valId: 'sunYValue' },
            { id: 'sunZ', obj: sun.position, prop: 'z', valId: 'sunZValue' },
            { id: 'hemiIntensity', obj: hemi, prop: 'intensity', valId: 'hemiIntensityValue' },
            { id: 'ambientIntensity', obj: ambient, prop: 'intensity', valId: 'ambientIntensityValue' },
        ];
        
        function updateSettingsOutput() {
            const settings = {
                renderer: { toneMappingExposure: renderer.toneMappingExposure },
                sun: { intensity: sun.intensity, position: sun.position.toArray() },
                hemi: { intensity: hemi.intensity },
                ambient: { intensity: ambient.intensity }
            };
            settingsOutput.value = JSON.stringify(settings, null, 2);
        }

        sliders.forEach(s => {
            const el = document.getElementById(s.id);
            const valEl = document.getElementById(s.valId);
            el.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                s.obj[s.prop] = val;
                valEl.textContent = val.toFixed(s.id === 'exposure' ? 1 : 0); // Fix formatting
                updateSettingsOutput();
            });
            // Init
            let initialVal = s.obj[s.prop];
            el.value = initialVal;
            valEl.textContent = initialVal.toFixed(s.id === 'exposure' ? 1 : 0); // Fix formatting
        });
        
        // Fix for range sliders that might have fractional initial values
        document.getElementById('exposureValue').textContent = renderer.toneMappingExposure.toFixed(1);
        document.getElementById('sunIntensityValue').textContent = sun.intensity.toFixed(1);
        document.getElementById('hemiIntensityValue').textContent = hemi.intensity.toFixed(1);
        document.getElementById('ambientIntensityValue').textContent = ambient.intensity.toFixed(1);


        document.getElementById('btnCopySettings').addEventListener('click', () => {
             navigator.clipboard.writeText(settingsOutput.value).then(() => {
                 alert('Settings copied to clipboard!');
             }).catch(err => {
                 console.error('Failed to copy settings:', err);
             });
        });
        
        updateSettingsOutput(); // Initial output
        console.log("Settings panel setup complete.");


        // --- MAIN LOOP ---
        let lastT = performance.now();
        function tick() {
            const t = performance.now();
            const dt = (t - lastT) / 1000.0;

            input.update(dt);
            
            // Handle actions triggered by input
            if (input.place) placement.place(world, activeItem, activeMaterial, activeScale);
            if (input.remove) placement.remove(world);
            if (input.rotate) placement.rotate(world); // Handle rotate action
            
            player.update(dt, input, world);
            placement.update(world, player, activeItem, activeMaterial, activeScale, input);

            renderer.render(scene, camera);
            lastT = t;
            requestAnimationFrame(tick);
        }

        console.log("Starting main loop.");
        tick(); // Start the game loop

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

    } catch (error) {
        console.error("Initialization failed:", error); // Log the specific error
        alert("Failed to initialize the application. Please check the console for errors. Error: " + error.message); // Show error message in alert
    }
}

initializeApp(); // Calling the function
console.log("main.js execution finished.");
