import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class Player {
    constructor(scene, camera) {
        this.camera = camera;
        this.yaw = new THREE.Object3D();
        this.pitch = new THREE.Object3D();
        this.yaw.add(this.pitch);
        this.pitch.add(this.camera);
        scene.add(this.yaw);
        
        this.SPEED = 5.0;
        this.EYE_HEIGHT = 1.6;
        this.isFlying = false;

        this.yaw.position.set(50.5, this.EYE_HEIGHT + 1, 50.5);
    }
    
    get position() {
        return this.yaw.position;
    }
    
    get lookDirection() {
        const d = new THREE.Vector3(0, 0, -1);
        d.applyQuaternion(this.pitch.quaternion).applyQuaternion(this.yaw.quaternion);
        return d.normalize();
    }

    update(dt, input, world) {
        // Handle flight toggle
        if (input.toggleFly) {
            this.isFlying = !this.isFlying;
        }
        
        // Handle looking
        const sens = 0.002;
        this.yaw.rotation.y -= input.look.dx * sens;
        this.pitch.rotation.x -= input.look.dy * sens;
        this.pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch.rotation.x));
        input.resetLook(); // Important to reset after processing

        // Handle movement
        const forward = -input.movement.y;
        const strafe = input.movement.x;
        
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        if (!this.isFlying) {
            direction.y = 0;
        }
        direction.normalize();
        
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        
        this.yaw.position.addScaledVector(direction, forward * this.SPEED * dt);
        this.yaw.position.addScaledVector(right, strafe * this.SPEED * dt);
        
        // Handle vertical flight
        if (this.isFlying) {
            if (input.flyUp) this.yaw.position.y += this.SPEED * dt;
            if (input.flyDown) this.yaw.position.y -= this.SPEED * dt;
        } else {
            // Follow terrain
            const gx = Math.floor(this.yaw.position.x);
            const gz = Math.floor(this.yaw.position.z);
            const groundHeight = world.topY(gx, gz);
            const targetY = (groundHeight < world.minY ? 0 : groundHeight + 1) + this.EYE_HEIGHT;
            this.yaw.position.y += (targetY - this.yaw.position.y) * 0.35;
        }
        
        // Clamp position to world bounds
        this.yaw.position.x = Math.max(0.001, Math.min(99.999, this.yaw.position.x));
        this.yaw.position.z = Math.max(0.001, Math.min(99.999, this.yaw.position.z));
    }
}
