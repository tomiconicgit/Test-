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

        this.raycaster = new THREE.Raycaster();
        this.playerHeight = 1.7; // Standard height for a first-person character.

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
        
        this.scene.add(this.cameraRig.camera);
        // Set the initial player height above the ground (at y=0).
        this.cameraRig.camera.position.y = this.playerHeight;
    }

    handleControls(deltaTime) {
        const moveSpeed = 5 * deltaTime; // Player moves 5 units per second.

        if (this.joystick.isActive) {
            const forwardMovement = this.joystick.vertical;
            const strafeMovement = this.joystick.horizontal;
            
            // Get the horizontal direction the camera is facing.
            const direction = new THREE.Vector3();
            this.cameraRig.camera.getWorldDirection(direction);
            direction.y = 0; // We only want movement on the XZ plane.
            direction.normalize();

            // Calculate the strafe direction (90 degrees to the right).
            const strafeDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

            // Calculate the total movement vector for this frame.
            const moveVector = new THREE.Vector3();
            if (forwardMovement !== 0) {
                moveVector.addScaledVector(direction, -forwardMovement * moveSpeed);
            }
            if (strafeMovement !== 0) {
                moveVector.addScaledVector(strafeDirection, -strafeMovement * moveSpeed);
            }
            
            // Apply the movement to the camera's position.
            this.cameraRig.camera.position.add(moveVector);
        }

        // --- Terrain Collision Logic ---
        const terrain = this.scene.getObjectByName("terrain");
        if (terrain) {
            // Set the raycaster to point straight down from the player's current XZ position.
            // We start the ray from high up to ensure it's above any potential hills.
            const rayOrigin = new THREE.Vector3(this.cameraRig.camera.position.x, 50, this.cameraRig.camera.position.z);
            this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

            const intersects = this.raycaster.intersectObject(terrain);

            if (intersects.length > 0) {
                // If the ray hits the terrain, move the camera to the intersection point 
                // plus the defined player height.
                const groundY = intersects[0].point.y;
                this.cameraRig.camera.position.y = groundY + this.playerHeight;
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


