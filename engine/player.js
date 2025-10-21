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
        this.RADIUS = 0.30;     // collision radius
        this.isFlying = false;

        this.yaw.position.set(50.5, this.EYE_HEIGHT + 1, 50.5);
    }

    get position() { return this.yaw.position; }

    get lookDirection() {
        const d = new THREE.Vector3(0, 0, -1);
        d.applyQuaternion(this.pitch.quaternion).applyQuaternion(this.yaw.quaternion);
        return d.normalize();
    }

    update(dt, input, world) {
        // Toggle flight
        if (input.toggleFly) this.isFlying = !this.isFlying;

        // Look
        const sens = 0.002;
        this.yaw.rotation.y -= input.look.dx * sens;
        this.pitch.rotation.x -= input.look.dy * sens;
        this.pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch.rotation.x));
        input.resetLook();

        // Move
        const forward = -input.movement.y;
        const strafe  =  input.movement.x;

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        if (!this.isFlying) dir.y = 0;
        dir.normalize();

        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();

        const vel = new THREE.Vector3()
            .addScaledVector(dir, forward * this.SPEED * dt)
            .addScaledVector(right, strafe * this.SPEED * dt);

        this.yaw.position.add(vel);

        // Vertical movement
        if (this.isFlying) {
            if (input.flyUp) this.yaw.position.y += this.SPEED * dt;
            if (input.flyDown) this.yaw.position.y -= this.SPEED * dt;
        } else {
            // Terrain ground
            const gx = Math.floor(this.yaw.position.x);
            const gz = Math.floor(this.yaw.position.z);
            let groundHeight = world.topY(gx, gz);

            // Consider props as ground too
            const propTop = this._samplePropTop(world, this.yaw.position.x, this.yaw.position.z, this.RADIUS);
            if (propTop !== null) groundHeight = Math.max(groundHeight, propTop);

            const targetY = (groundHeight < world.minY ? 0 : groundHeight + 1) + this.EYE_HEIGHT;
            this.yaw.position.y += (targetY - this.yaw.position.y) * 0.35;
        }

        // Collide against prop solids (XZ push-out)
        this._resolvePropCollisions(world);

        // Clamp bounds
        this.yaw.position.x = Math.max(0.001, Math.min(99.999, this.yaw.position.x));
        this.yaw.position.z = Math.max(0.001, Math.min(99.999, this.yaw.position.z));
    }

    // --- Collisions with placed props (treat as solid AABBs) ----------------
    _resolvePropCollisions(world) {
        const p = this.yaw.position;
        const r = this.RADIUS;
        const feetY = p.y - this.EYE_HEIGHT;          // approximate feet
        const headY = p.y;                             // head at camera

        for (const obj of world.props) {
            const box = obj.userData?.aabb;
            if (!box) continue;

            // Vertical overlap check (allow walking next to tall objects)
            if (headY < box.min.y - 0.05 || feetY > box.max.y + 0.05) continue;

            // Expanded XZ check by radius
            const minX = box.min.x - r, maxX = box.max.x + r;
            const minZ = box.min.z - r, maxZ = box.max.z + r;

            if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
                const penX1 = (maxX - p.x);      // penetration from left side
                const penX2 = (p.x - minX);      // from right side
                const penZ1 = (maxZ - p.z);
                const penZ2 = (p.z - minZ);
                // Smallest push along a single axis
                const pushX = Math.min(penX1, penX2);
                const pushZ = Math.min(penZ1, penZ2);
                if (pushX < pushZ) {
                    // Push on X
                    if (penX1 < penX2) p.x = maxX; else p.x = minX;
                } else {
                    // Push on Z
                    if (penZ1 < penZ2) p.z = maxZ; else p.z = minZ;
                }
            }
        }
    }

    // Sample the highest prop top under player footprint to allow standing on props
    _samplePropTop(world, x, z, radius) {
        let top = null;
        for (const obj of world.props) {
            const box = obj.userData?.aabb;
            if (!box) continue;
            if (x + radius < box.min.x || x - radius > box.max.x) continue;
            if (z + radius < box.min.z || z - radius > box.max.z) continue;
            // overlapping footprint
            top = (top === null) ? box.max.y : Math.max(top, box.max.y);
        }
        return top;
    }
}