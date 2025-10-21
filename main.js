import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
// ... other imports ...

// --- INITIALIZATION ---
// ... renderer, scene, camera setup ...

// --- MODIFICATION: Store Lights for Panel Access ---
let hemi, sun, ambient; // Declare here to make them accessible

async function initializeApp() {
    try {
        // ... renderer, scene, camera initialization ...
        
        // --- Lighting Setup ---
        hemi = new THREE.HemisphereLight(0xddeeff, 0x998877, 1.5);
        scene.add(hemi);

        sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(100, 100, 50);
        sun.castShadow = true;
        // ... shadow setup ...
        scene.add(sun);

        ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);
        
        // ... materials, geometries, controllers, world setup ...

        // --- UI STATE ---
        let activeItem = 'VOXEL';
        let activeMaterial = materials.metal;
        let activeScale = 1.0;
        
        // ... existing UI listeners ...
        
        // --- MODIFICATION: Settings Panel Logic ---
        const btnSettings = document.getElementById('btnSettings');
        const btnCloseSettings = document.getElementById('btnCloseSettings');
        const settingsPanel = document.getElementById('settingsPanel');

        // Toggle panel visibility
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

        // Function to update the JSON display
        function updateSettingsDisplay() {
            const currentSettings = {
                renderer: {
                    toneMappingExposure: parseFloat(sliders.exposure.input.value)
                },
                sun: {
                    intensity: parseFloat(sliders.sunIntensity.input.value),
                    position: [
                        parseInt(sliders.sunX.input.value),
                        parseInt(sliders.sunY.input.value),
                        parseInt(sliders.sunZ.input.value),
                    ]
                },
                hemisphere: {
                    intensity: parseFloat(sliders.hemiIntensity.input.value)
                },
                ambient: {
                    intensity: parseFloat(sliders.ambientIntensity.input.value)
                }
            };
            settingsOutput.value = JSON.stringify(currentSettings, null, 2);
        }

        // Add event listeners to all sliders
        for (const key in sliders) {
            const { input, value, target, prop } = sliders[key];
            input.addEventListener('input', () => {
                const newValue = parseFloat(input.value);
                target[prop] = newValue;
                value.textContent = newValue.toFixed(1);
                updateSettingsDisplay(); // Update JSON on change
            });
        }
        
        // Copy button logic
        btnCopySettings.addEventListener('click', () => {
            settingsOutput.select();
            // Use document.execCommand as a fallback for iframe compatibility
            try {
                document.execCommand('copy');
                btnCopySettings.textContent = 'Copied!';
                setTimeout(() => { btnCopySettings.textContent = 'Copy to Clipboard'; }, 1500);
            } catch (err) {
                console.error('Failed to copy settings:', err);
                btnCopySettings.textContent = 'Copy Failed!';
                 setTimeout(() => { btnCopySettings.textContent = 'Copy to Clipboard'; }, 1500);
            }
        });
        
        // Initial call to populate the textarea
        updateSettingsDisplay();
        // --- END MODIFICATION ---

        // --- MAIN LOOP ---
        // ... (tick function unchanged) ...
        
        console.log("Starting main loop.");
        tick();

        // ... (resize listener unchanged) ...

    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Failed to initialize the application. Please check the console for errors.");
    }
}

initializeApp();
