import { createTerrain } from './Terrain.js';
import { createSkydome } from './Skydome.js';
import { setupLighting } from './Lighting.js';
import { CameraRig } from './Camera.js';
import { Joystick } from './Joystick.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.cameraRig = new CameraRig();
        this.renderer = this.cameraRig.renderer;

        this.setupWorld();
        this.joystick = new Joystick(document.getElementById('joystick-container'), document.getElementById('joystick-handle'));
        
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        this.animate();
    }

    setupWorld() {
        const terrain = createTerrain();
        this.scene.add(terrain);

        const skydome = createSkydome();
        this.scene.add(skydome);

        setupLighting(this.scene);
        
        // Add camera to the scene
        this.scene.add(this.cameraRig.camera);
        this.cameraRig.camera.position.y = 1.7; // Player height
    }

    handleControls(deltaTime) {
        const moveSpeed = 5 * deltaTime; // units per second
        const rotateSpeed = 1.5 * deltaTime;

        if (this.joystick.isActive) {
            const forward = this.joystick.vertical;
            const turn = this.joystick.horizontal;

            if (forward !== 0) {
                const direction = new THREE.Vector3();
                this.cameraRig.camera.getWorldDirection(direction);
                this.cameraRig.camera.position.addScaledVector(direction, -forward * moveSpeed);
            }
            if (turn !== 0) {
                const strafeDirection = new THREE.Vector3();
                this.cameraRig.camera.getWorldDirection(strafeDirection);
                const axis = new THREE.Vector3(0, 1, 0);
                strafeDirection.applyAxisAngle(axis, Math.PI / 2);
                this.cameraRig.camera.position.addScaledVector(strafeDirection, -turn * moveSpeed);
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        const deltaTime = this.clock.getDelta();
        
        this.handleControls(deltaTime);
        this.cameraRig.update();

        this.renderer.render(this.scene, this.cameraRig.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(function(error) {
            console.log('Service Worker registration failed:', error);
        });
    }
    
    // Lock to landscape on mobile
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.log("Could not lock orientation:", err);
        });
    }

    new Game();
});

