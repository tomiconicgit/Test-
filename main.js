console.log("Executing main.js..."); // <-- ADD LOG

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
// --- ADD LOG BEFORE IMPORT ---
console.log("Attempting to import Materials...");
import { makeMaterials } from './engine/Materials.js';
// --- ADD CHECK AFTER IMPORT ---
if (typeof makeMaterials !== 'function') {
    console.error("FATAL: makeMaterials was NOT imported correctly!");
    alert("Critical Error: Failed to load material definitions. Check console.");
    // Optionally, stop execution here if desired, though initializeApp's catch will also trigger
    // throw new Error("makeMaterials import failed.");
} else {
    console.log("makeMaterials function seems to be imported.");
}

// ... (other imports unchanged) ...

// --- INITIALIZATION ---
// ... (declarations unchanged) ...

async function initializeApp() {
    console.log("initializeApp() started."); // <-- ADD LOG
    try {
        // ... (renderer, scene, camera, lights setup unchanged) ...

        console.log("Calling makeMaterials..."); // <-- Keep this log
        // --- ADD CHECK BEFORE CALL ---
        if (typeof makeMaterials !== 'function') {
             throw new Error("makeMaterials is not available right before calling it!");
        }
        // --- END CHECK ---
        materials = await makeMaterials();
        console.log("Materials loaded:", Object.keys(materials));

        // ... (Rest of initializeApp unchanged) ...
        propGeometries = { /* ... */ };
        console.log("Geometries created.");
        input = new InputController(new Joystick(document.getElementById('joystick')));
        player = new Player(scene, camera);
        placement = new PlacementController(scene, camera, propGeometries, materials);
        world = new VoxelWorld(THREE, materials, { scene, sizeX:100, sizeZ:100, minY:-30, maxY:500 });
        console.log("World and controllers initialized.");
        // ... (UI State and Listeners unchanged) ...
        console.log("Settings panel setup complete.");


        // --- MAIN LOOP ---
        let lastT = performance.now();
        function tick() { /* ... unchanged ... */ }

        console.log("Starting main loop.");
        tick(); // Start the game loop

        window.addEventListener('resize', () => { /* ... unchanged ... */ });

    } catch (error) {
        console.error("Initialization failed:", error); // Log the specific error
        alert("Failed to initialize the application. Please check the console for errors. Error: " + error.message); // Show error message in alert
    }
}

initializeApp(); // Calling the function
console.log("main.js execution finished."); // <-- ADD LOG
