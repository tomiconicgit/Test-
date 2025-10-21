import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class LightingControls {
    constructor(refs) {
        if (!refs || !refs.renderer || !refs.ambientLight || !refs.hemisphereLight || !refs.directionalLight || !refs.materials || !refs.world) {
            console.error("LightingControls missing required references (e.g., world).");
            return;
        }
        this.refs = refs;
        
        const firstMat = Object.values(this.refs.materials)[0];
        
        // Store initial values from the refs
        this.settings = {
            exposure: this.refs.renderer.toneMappingExposure,
            ambient: this.refs.ambientLight.intensity,
            hemi: this.refs.hemisphereLight.intensity,
            hemiSky: "#" + this.refs.hemisphereLight.color.getHexString(),
            hemiGround: "#" + this.refs.hemisphereLight.groundColor.getHexString(),
            sun: this.refs.directionalLight.intensity,
            sunColor: "#" + this.refs.directionalLight.color.getHexString(),
            reflectivity: firstMat ? firstMat.envMapIntensity : 1.5,
            // --- ADDED: Default values for new sliders ---
            metalness: 1.0,
            roughness: 1.0
            // --- END ADDED ---
        };

        this._createUI();
        this._injectCSS();
        this._addEventListeners();
    }

    _createUI() {
        // Create Toggle Button
        this.toggleButton = document.createElement('button');
        this.toggleButton.id = 'lightControlsToggle';
        this.toggleButton.textContent = '💡';
        document.body.appendChild(this.toggleButton);

        // Create Panel
        this.panel = document.createElement('div');
        this.panel.id = 'lightControlsPanel';
        this.panel.style.display = 'none'; // Hidden by default

        let content = '<h3>Lighting Controls</h3>';

        // Helper to create slider
        const createSlider = (id, label, min, max, step, value) => {
            return `
                <div class="light-slider-group">
                    <label for="${id}">${label}</label>
                    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
                    <span>${parseFloat(value).toFixed(2)}</span>
                </div>
            `;
        };
        
        // Helper to create color picker
        const createColorPicker = (id, label, value) => {
             return `
                <div class="light-slider-group">
                    <label for="${id}">${label}</label>
                    <input type="color" id="${id}" value="${value}">
                </div>
            `;
        };

        content += createSlider('lc_exposure', 'Exposure', 0, 3, 0.05, this.settings.exposure);
        content += createSlider('lc_ambient', 'Ambient', 0, 2, 0.05, this.settings.ambient);
        content += createSlider('lc_hemi', 'Hemi', 0, 3, 0.05, this.settings.hemi);
        content += createSlider('lc_sun', 'Sun', 0, 3, 0.05, this.settings.sun);
        content += createSlider('lc_reflectivity', 'Reflectivity', 0, 5, 0.1, this.settings.reflectivity);
        
        // --- ADDED: Metalness and Roughness sliders ---
        content += '<hr class="lc-divider">';
        content += createSlider('lc_metalness', 'Metalness', 0, 1, 0.01, this.settings.metalness);
        content += createSlider('lc_roughness', 'Roughness', 0, 1, 0.01, this.settings.roughness);
        // --- END ADDED ---

        content += '<hr class="lc-divider">';
        content += createColorPicker('lc_hemiSky', 'Hemi Sky', this.settings.hemiSky);
        content += createColorPicker('lc_hemiGround', 'Hemi Ground', this.settings.hemiGround);
        content += createColorPicker('lc_sunColor', 'Sun Color', this.settings.sunColor);

        content += '<button id="lc_copyButton">Copy Settings</button>';

        this.panel.innerHTML = content;
        document.body.appendChild(this.panel);

        // Store references to inputs
        this.inputs = {
            exposure: this.panel.querySelector('#lc_exposure'),
            ambient: this.panel.querySelector('#lc_ambient'),
            hemi: this.panel.querySelector('#lc_hemi'),
            sun: this.panel.querySelector('#lc_sun'),
            reflectivity: this.panel.querySelector('#lc_reflectivity'),
            // --- ADDED ---
            metalness: this.panel.querySelector('#lc_metalness'),
            roughness: this.panel.querySelector('#lc_roughness'),
            // --- END ADDED ---
            hemiSky: this.panel.querySelector('#lc_hemiSky'),
            hemiGround: this.panel.querySelector('#lc_hemiGround'),
            sunColor: this.panel.querySelector('#lc_sunColor'),
            copyButton: this.panel.querySelector('#lc_copyButton')
        };
    }

    _addEventListeners() {
        this.toggleButton.addEventListener('click', () => {
            const isHidden = this.panel.style.display === 'none';
            this.panel.style.display = isHidden ? 'flex' : 'none';
        });

        // Helper function to update all PBR materials
        const updateAllMaterials = (property, value) => {
            // 1. Update all props already in the world
            this.refs.world.props.forEach(prop => {
                if (prop.material && prop.material[property] !== undefined) {
                    prop.material[property] = value;
                }
            });

            // 2. Update all original materials so new props get the new value
            Object.values(this.refs.materials).forEach(mat => {
                if (mat && mat[property] !== undefined) {
                    mat[property] = value;
                }
            });
        };

        // Sliders
        this.inputs.exposure.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            this.refs.renderer.toneMappingExposure = val;
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });
        
        this.inputs.ambient.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            this.refs.ambientLight.intensity = val;
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });
        
        this.inputs.hemi.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            this.refs.hemisphereLight.intensity = val;
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });
        
        this.inputs.sun.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            this.refs.directionalLight.intensity = val;
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });
        
        this.inputs.reflectivity.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            updateAllMaterials('envMapIntensity', val); // Use helper
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });

        // --- ADDED: New slider listeners ---
        this.inputs.metalness.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            updateAllMaterials('metalness', val); // Use helper
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });

        this.inputs.roughness.addEventListener('input', e => {
            const val = parseFloat(e.target.value);
            updateAllMaterials('roughness', val); // Use helper
            e.target.nextElementSibling.textContent = val.toFixed(2);
        });
        // --- END ADDED ---

        // Color Pickers
        this.inputs.hemiSky.addEventListener('input', e => {
            this.refs.hemisphereLight.color.set(e.target.value);
        });
        
        this.inputs.hemiGround.addEventListener('input', e => {
            this.refs.hemisphereLight.groundColor.set(e.target.value);
        });
        
        this.inputs.sunColor.addEventListener('input', e => {
            this.refs.directionalLight.color.set(e.target.value);
        });

        // Copy Button
        this.inputs.copyButton.addEventListener('click', () => this._copySettings());
    }

    _copySettings() {
        const settings = {
            exposure: parseFloat(this.inputs.exposure.value),
            ambientIntensity: parseFloat(this.inputs.ambient.value),
            hemiIntensity: parseFloat(this.inputs.hemi.value),
            hemiSkyColor: this.inputs.hemiSky.value,
            hemiGroundColor: this.inputs.hemiGround.value,
            sunIntensity: parseFloat(this.inputs.sun.value),
            sunColor: this.inputs.sunColor.value,
            envMapIntensity: parseFloat(this.inputs.reflectivity.value),
            // --- ADDED ---
            metalness: parseFloat(this.inputs.metalness.value),
            roughness: parseFloat(this.inputs.roughness.value)
            // --- END ADDED ---
        };
        
        navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
            .then(() => {
                const btn = this.inputs.copyButton;
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 1500);
            })
            .catch(err => {
                console.error('Failed to copy settings: ', err);
            });
    }

    _injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            #lightControlsToggle {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1001;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(20, 22, 25, 0.5);
                backdrop-filter: blur(8px);
                color: white;
                font-size: 24px;
                line-height: 44px;
                text-align: center;
                cursor: pointer;
                pointer-events: auto;
            }
            #lightControlsPanel {
                position: fixed;
                top: 80px;
                left: 20px;
                width: 280px;
                z-index: 1000;
                background: rgba(20, 22, 25, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                backdrop-filter: blur(10px);
                color: #eaeaea;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: auto;
            }
            #lightControlsPanel h3 {
                margin: 0 0 10px 0;
                text-align: center;
                font-weight: 600;
            }
            /* --- ADDED: Divider style --- */
            .lc-divider {
                border: none;
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 4px 0;
            }
            /* --- END ADDED --- */
            .light-slider-group {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }
            .light-slider-group label {
                flex-basis: 90px;
                flex-shrink: 0;
            }
            .light-slider-group input[type="range"] {
                flex-grow: 1;
                margin: 0;
            }
            .light-slider-group span {
                flex-basis: 35px;
                flex-shrink: 0;
                text-align: right;
                font-family: monospace;
            }
            .light-slider-group input[type="color"] {
                margin-left: auto;
                width: 50px;
                height: 25px;
                padding: 0;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                background: transparent;
            }
            #lc_copyButton {
                padding: 12px;
                font-size: 14px;
                border-radius: 12px;
                border: 1px solid rgba(77,163,255,.35);
                background: rgba(20,22,25,.4);
                backdrop-filter: blur(8px);
                color: #eaeaea;
                font-weight: 600;
                transition: background .2s;
                margin-top: 10px;
            }
            #lc_copyButton:active {
                background: rgba(40,42,45,.6);
            }
        `;
        document.head.appendChild(style);
    }
}
