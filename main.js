// ... (imports unchanged) ...

// --- INITIALIZATION ---
// ... (declarations unchanged) ...

async function initializeApp() {
    try {
        // ... (renderer, scene, camera, lights setup unchanged - keep reduced intensities for now) ...

        console.log("Loading materials...");
        materials = await makeMaterials();
        console.log("Materials loaded:", Object.keys(materials));

        // Geometries list
        propGeometries = { /* ... unchanged ... */ };
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
        document.getElementById('btnSave').addEventListener('click', () => { /* ... save logic ... */ });
        const loadFileInput = document.getElementById('loadFile');
        document.getElementById('btnLoad').addEventListener('click', () => { loadFileInput.click(); });
        loadFileInput.addEventListener('change', (event) => { /* ... load logic ... */ });

        // --- Settings Panel Logic ---
        console.log("Setting up settings panel...");
        const btnSettings = document.getElementById('btnSettings');
        const btnCloseSettings = document.getElementById('btnCloseSettings');
        const settingsPanel = document.getElementById('settingsPanel');

        // --- MODIFICATION: Add checks for elements ---
        if (!btnSettings || !btnCloseSettings || !settingsPanel) {
            throw new Error("Settings panel buttons or panel element not found in HTML!");
        }
        // --- END MODIFICATION ---

        btnSettings.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
        btnCloseSettings.addEventListener('click', () => settingsPanel.classList.add('hidden'));

        // Get all sliders and value displays
        const sliders = {
            exposure: { input: document.getElementById('exposure'), value: document.getElementById('exposureValue'), target: renderer, prop: 'toneMappingExposure' },
            sunIntensity: { input: document.getElementById('sunIntensity'), value: document.getElementById('sunIntensityValue'), target: sun, prop: 'intensity' },
            sunX: { input: document.getElementById('sunX'), value: document.getElementById('sunXValue'), target: sun.position, prop: 'x' },
            sunY: { input: document.getElementById('sunY'), value: document.getElementById('sunYValue'), target: sun.position, prop: 'y' },
            sunZ: { input: document.getElementById('sunZ'), value: document.getElementById('sunZValue'), target: sun.position, prop: 'z' },
            hemiIntensity: { input: document.getElementById('hemiIntensity'), value: document.getElementById('hemiIntensityValue'), target: hemi, prop: 'intensity' },
            ambientIntensity: { input: document.getElementById('ambientIntensity'), value: document.getElementById('ambientIntensityValue'), target: ambient, prop: 'intensity' },
        };

        const settingsOutput = document.getElementById('settingsOutput');
        const btnCopySettings = document.getElementById('btnCopySettings');

        // --- MODIFICATION: Check slider elements ---
        let missingSlider = false;
        for (const key in sliders) {
            if (!sliders[key].input || !sliders[key].value) {
                console.error(`Settings panel slider element not found for: ${key}`);
                missingSlider = true;
            }
        }
        if (!settingsOutput || !btnCopySettings) {
             console.error("Settings panel output or copy button not found!");
             missingSlider = true;
        }
        if (missingSlider) {
            throw new Error("One or more settings panel elements are missing!");
        }
        // --- END MODIFICATION ---

        function updateSettingsDisplay() { /* ... unchanged ... */ }

        // Add event listeners to all sliders
        for (const key in sliders) {
             const { input, value, target, prop } = sliders[key];
            input.addEventListener('input', () => {
                const newValue = parseFloat(input.value);
                target[prop] = newValue;
                value.textContent = newValue.toFixed(1);
                updateSettingsDisplay();
            });
        }

        btnCopySettings.addEventListener('click', () => { /* ... unchanged ... */ });
        updateSettingsDisplay(); // Initial call
        console.log("Settings panel setup complete.");

        // --- MAIN LOOP ---
        let lastT = performance.now();
        function tick() {
            requestAnimationFrame(tick);
            const dt = Math.min((performance.now() - lastT) / 1000, 0.05);
            lastT = performance.now();

            try {
                input.update(dt);
                player.update(dt, input, world);
                if (placement) {
                    placement.update(world, player, activeItem, activeMaterial, activeScale, input);
                }

                if (placement) {
                    if (input.place) placement.place(world, activeItem, activeMaterial, activeScale);
                    if (input.remove) placement.remove(world);
                    if (input.rotate) placement.rotate(world);
                }

                if (renderer && scene && camera) {
                    renderer.render(scene, camera);
                }
             } catch (error) {
                 console.error("Error in tick function:", error);
                 // No longer stopping the loop on error to aid debugging
             }
        }

        console.log("Starting main loop.");
        tick(); // Start the game loop

        window.addEventListener('resize', () => { /* ... unchanged ... */ });

    } catch (error) {
        console.error("Initialization failed:", error); // Log the specific error
        alert("Failed to initialize the application. Please check the console for errors. Error: " + error.message); // Show error message in alert
    }
}

initializeApp();
