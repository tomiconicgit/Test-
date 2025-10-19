import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export class Controls {
    constructor(camera, world, scene) {
        this.camera = camera;
        this.world = world;
        this.scene = scene;
        this.yaw = new THREE.Object3D();
        this.pitch = new THREE.Object3D();
        this.yaw.add(this.pitch);
        this.pitch.add(this.camera);
        this.yaw.position.set(50, 1.8, 50);
        this.scene.add(this.yaw);

        this.direction = new THREE.Vector2(0, 0);
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 20;
        this.lookSpeed = 0.003;
        this.raycaster = new THREE.Raycaster();

        this.joystickTouchId = null;
        this.lookTouchId = null;
        this.lookPrev = { x: 0, y: 0 };

        this.joystick = document.getElementById('joystick');
        this.joystickRect = this.joystick.getBoundingClientRect();
        this.center = { x: this.joystickRect.left + this.joystickRect.width / 2, y: this.joystickRect.top + this.joystickRect.height / 2 };
        this.radius = this.joystickRect.width / 2;

        document.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onTouchEnd.bind(this));

        document.getElementById('place-button').addEventListener('click', this.place.bind(this));
        document.getElementById('dig-button').addEventListener('click', this.dig.bind(this));
    }

    onTouchStart(e) {
        e.preventDefault();
        for (let touch of e.changedTouches) {
            if (this.joystickTouchId === null && touch.clientX < window.innerWidth / 2) {
                this.joystickTouchId = touch.identifier;
                this.updateDirection(touch);
            } else if (this.lookTouchId === null && touch.clientX > window.innerWidth / 2) {
                this.lookTouchId = touch.identifier;
                this.lookPrev.x = touch.clientX;
                this.lookPrev.y = touch.clientY;
            }
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        for (let touch of e.touches) {
            if (touch.identifier === this.joystickTouchId) {
                this.updateDirection(touch);
            } else if (touch.identifier === this.lookTouchId) {
                const deltaX = touch.clientX - this.lookPrev.x;
                const deltaY = touch.clientY - this.lookPrev.y;
                this.yaw.rotation.y -= deltaX * this.lookSpeed;
                this.pitch.rotation.x -= deltaY * this.lookSpeed;
                this.pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch.rotation.x));
                this.lookPrev.x = touch.clientX;
                this.lookPrev.y = touch.clientY;
            }
        }
    }

    onTouchEnd(e) {
        e.preventDefault();
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.direction.set(0, 0);
            } else if (touch.identifier === this.lookTouchId) {
                this.lookTouchId = null;
            }
        }
    }

    updateDirection(touch) {
        let dx = touch.clientX - this.center.x;
        let dy = touch.clientY - this.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.radius) {
            dx = dx / dist * this.radius;
            dy = dy / dist * this.radius;
        }
        this.direction.set(dx / this.radius, dy / this.radius);
    }

    place() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.world.meshes);
        if (intersects.length > 0) {
            const int = intersects[0];
            const pos = int.point.clone();
            const nor = int.normal.clone();
            const blockPos = pos.subtract(nor.multiplyScalar(0.001)).floor();
            const newPos = blockPos.clone().add(nor);
            if (this.world.getBlock(newPos.x, newPos.y, newPos.z) === 0) {
                this.world.setBlock(newPos.x, newPos.y, newPos.z, 2); // metal
                this.world.buildMesh();
            }
        }
    }

    dig() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.world.meshes);
        if (intersects.length > 0) {
            const int = intersects[0];
            const pos = int.point.clone();
            const nor = int.normal.clone();
            const blockPos = pos.subtract(nor.multiplyScalar(0.001)).floor();
            if (this.world.getBlock(blockPos.x, blockPos.y, blockPos.z) !== 0) {
                this.world.setBlock(blockPos.x, blockPos.y, blockPos.z, 0);
                this.world.buildMesh();
            }
        }
    }

    update(delta) {
        this.velocity.x = -this.direction.x * this.moveSpeed * delta; // strafe
        this.velocity.z = -this.direction.y * this.moveSpeed * delta; // forward/back

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.yaw.quaternion);
        const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(this.yaw.quaternion);

        this.yaw.position.add(forward.multiplyScalar(this.velocity.z));
        this.yaw.position.add(right.multiplyScalar(this.velocity.x));

        // Simple ground collision
        if (this.yaw.position.y < 1.8) this.yaw.position.y = 1.8;
    }
}