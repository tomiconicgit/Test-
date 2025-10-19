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
        this.yaw.position.set(50, 5, 50); // Start higher
        this.scene.add(this.yaw);

        this.direction = new THREE.Vector2(0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 20;
        this.lookSpeed = 0.003;
        this.gravity = 30;
        this.jumpSpeed = 10;
        this.onGround = false;
        this.playerHeight = 1.8;
        this.eyeHeight = 1.62;
        this.playerWidth = 0.6;
        this.playerSize = new THREE.Vector3(this.playerWidth, this.playerHeight, this.playerWidth);
        this.raycaster = new THREE.Raycaster();
        this.currentBlock = 2; // Default metal

        this.joystickTouchId = null;
        this.lookTouchId = null;
        this.lookPrev = { x: 0, y: 0 };

        this.joystick = document.getElementById('joystick');
        this.knob = document.getElementById('knob');
        this.joystickRect = this.joystick.getBoundingClientRect();
        this.center = { x: this.joystickRect.left + this.joystickRect.width / 2, y: this.joystickRect.top + this.joystickRect.height / 2 };
        this.radius = this.joystickRect.width / 2;

        document.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onTouchEnd.bind(this));

        document.getElementById('place-button').addEventListener('click', this.place.bind(this));
        document.getElementById('dig-button').addEventListener('click', this.dig.bind(this));
        document.getElementById('jump-button').addEventListener('click', this.jump.bind(this));
        this.blockSelect = document.getElementById('block-select');
        this.blockSelect.addEventListener('change', () => {
            this.currentBlock = parseInt(this.blockSelect.value);
        });
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
                this.knob.style.transform = 'translate(-50%, -50%)';
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
        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    isPositionValid(feetPos) {
        const halfSize = this.playerSize.clone().multiplyScalar(0.5);
        const min = feetPos.clone().sub(halfSize);
        const max = feetPos.clone().add(halfSize);
        max.y = feetPos.y + this.playerHeight;

        for (let x = Math.floor(min.x); x <= Math.floor(max.x); x++) {
            for (let y = Math.floor(min.y); y <= Math.floor(max.y); y++) {
                for (let z = Math.floor(min.z); z <= Math.floor(max.z); z++) {
                    if (this.world.getBlock(x, y, z) > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    tryMove(deltaVec, feetPos) {
        const newFeetPos = feetPos.clone().add(deltaVec);
        if (this.isPositionValid(newFeetPos)) {
            feetPos.copy(newFeetPos);
            return true;
        }
        return false;
    }

    jump() {
        if (this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
        }
    }

    place() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.world.blockMeshes);
        if (intersects.length > 0) {
            const int = intersects[0];
            const pos = int.point.clone();
            const nor = int.face.normal.clone();
            const blockPos = pos.add(nor.multiplyScalar(0.001)).floor();
            const newPos = blockPos.add(nor.round());
            if (this.world.getBlock(newPos.x, newPos.y, newPos.z) === 0) {
                this.world.setBlock(newPos.x, newPos.y, newPos.z, this.currentBlock);
                this.world.rebuildDirtyChunks();
            }
        }
    }

    dig() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.world.blockMeshes);
        if (intersects.length > 0) {
            const int = intersects[0];
            const pos = int.point.clone();
            const nor = int.face.normal.clone();
            const blockPos = pos.add(nor.multiplyScalar(0.001)).floor();
            if (this.world.getBlock(blockPos.x, blockPos.y, blockPos.z) !== 0) {
                this.world.setBlock(blockPos.x, blockPos.y, blockPos.z, 0);
                this.world.rebuildDirtyChunks();
            }
        }
    }

    update(delta) {
        this.velocity.y -= this.gravity * delta;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.yaw.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.yaw.quaternion);

        const horizVelX = this.direction.x * this.moveSpeed;
        const horizVelZ = -this.direction.y * this.moveSpeed;

        const horizDelta = forward.clone().multiplyScalar(horizVelZ * delta).add(right.clone().multiplyScalar(horizVelX * delta));

        const feetPos = this.yaw.position.clone();
        feetPos.y -= this.eyeHeight;

        // Try move horizontal
        this.tryMove(horizDelta, feetPos);

        // Try move vertical
        const vertDelta = new THREE.Vector3(0, this.velocity.y * delta, 0);
        const moved = this.tryMove(vertDelta, feetPos);

        if (this.velocity.y < 0 && !moved) {
            this.velocity.y = 0;
            this.onGround = true;
        } else if (this.velocity.y > 0 && !moved) {
            this.velocity.y = 0;
        } else {
            this.onGround = false;
        }

        this.yaw.position.copy(feetPos);
        this.yaw.position.y += this.eyeHeight;

        this.world.rebuildDirtyChunks();
    }
}