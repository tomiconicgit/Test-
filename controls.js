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
        this.yaw.position.set(50, 5, 50); // Start position for flat world
        this.scene.add(this.yaw);

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 15;
        this.lookSpeed = 2.5;
        this.gravity = 35;
        this.jumpSpeed = 12;
        this.onGround = false;
        this.playerHeight = 1.8;
        this.eyeHeight = 1.6;
        this.playerWidth = 0.5;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 8.0;
        this.currentBlock = 2;
        this.raycastResult = null;
        this.initPlacementHelper();

        this.direction = new THREE.Vector2(0, 0);
        this.joystickTouchId = null;
        this.lookTouchId = null;
        this.lookPrev = new THREE.Vector2();

        this.joystick = document.getElementById('joystick');
        this.knob = document.getElementById('knob');
        this.blockSelect = document.getElementById('block-select');
        this.onResize();

        this.addEventListeners();
    }

    initPlacementHelper() {
        const placementGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
        const placementEdges = new THREE.EdgesGeometry(placementGeo);
        this.placementHelper = new THREE.LineSegments(placementEdges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.7 }));
        this.placementHelper.visible = false;
        this.scene.add(this.placementHelper);
    }
    
    addEventListeners() {
        const canvas = this.scene.renderer ? this.scene.renderer.domElement : document.querySelector('canvas');
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        window.addEventListener('resize', this.onResize.bind(this));

        // Correctly wiring the buttons to their functions
        document.getElementById('dig-button').addEventListener('click', this.dig.bind(this));
        document.getElementById('place-button').addEventListener('click', this.place.bind(this));
        document.getElementById('jump-button').addEventListener('click', this.jump.bind(this));
        
        this.blockSelect.addEventListener('change', () => {
            this.currentBlock = parseInt(this.blockSelect.value);
        });
    }
    
    onResize() {
        this.joystickRect = this.joystick.getBoundingClientRect();
        this.center = { x: this.joystickRect.left + this.joystickRect.width / 2, y: this.joystickRect.top + this.joystickRect.height / 2 };
        this.radius = this.joystickRect.width / 2;
    }

    onTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (this.joystickTouchId === null && touch.clientX < window.innerWidth / 3) {
                this.joystickTouchId = touch.identifier;
                this.updateDirection(touch);
            } else if (this.lookTouchId === null) {
                // Check if the touch is on a button
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                if (targetElement && targetElement.closest('.action-button, #block-select')) {
                    continue; // Don't start a look touch on a button
                }
                this.lookTouchId = touch.identifier;
                this.lookPrev.set(touch.clientX, touch.clientY);
            }
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        for (const touch of e.touches) {
            if (touch.identifier === this.joystickTouchId) {
                this.updateDirection(touch);
            } else if (touch.identifier === this.lookTouchId) {
                const deltaX = touch.clientX - this.lookPrev.x;
                const deltaY = touch.clientY - this.lookPrev.y;
                this.yaw.rotation.y -= deltaX * (this.lookSpeed / 1000);
                this.pitch.rotation.x -= deltaY * (this.lookSpeed / 1000);
                this.pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch.rotation.x));
                this.lookPrev.set(touch.clientX, touch.clientY);
            }
        }
    }

    onTouchEnd(e) {
        for (const touch of e.changedTouches) {
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

    isPositionValid(pos) {
        const halfWidth = this.playerWidth / 2;
        const checkPoints = [
            [0,0,0], [0, this.playerHeight, 0], // Center column
            [-halfWidth, 0, -halfWidth], [halfWidth, 0, -halfWidth], // Bottom corners
            [-halfWidth, 0, halfWidth], [halfWidth, 0, halfWidth],
            [-halfWidth, this.playerHeight, -halfWidth], [halfWidth, this.playerHeight, -halfWidth], // Top corners
            [-halfWidth, this.playerHeight, halfWidth], [halfWidth, this.playerHeight, halfWidth]
        ];
        for(const p of checkPoints) {
            if (this.world.getBlock(Math.floor(pos.x + p[0]), Math.floor(pos.y + p[1]), Math.floor(pos.z + p[2])) > 0) {
                return false;
            }
        }
        return true;
    }

    tryMove(delta, feetPos) {
        if (!this.isPositionValid(feetPos.clone().add(delta))) {
            return false;
        }
        feetPos.add(delta);
        return true;
    }

    jump() {
        if (this.onGround) {
            this.velocity.y = this.jumpSpeed;
        }
    }

    place() {
        if (this.raycastResult) {
            const { point, face } = this.raycastResult;
            const placePos = point.clone().add(face.normal.clone().multiplyScalar(0.5)).floor();
            
            const playerFeet = this.yaw.position.clone().sub(new THREE.Vector3(0, this.eyeHeight, 0)).floor();
            const playerHead = playerFeet.clone().add(new THREE.Vector3(0, 1, 0));

            if (!placePos.equals(playerFeet) && !placePos.equals(playerHead)) {
                if (this.world.getBlock(placePos.x, placePos.y, placePos.z) === 0) {
                    this.world.setBlock(placePos.x, placePos.y, placePos.z, this.currentBlock);
                    this.world.rebuildDirtyChunks();
                }
            }
        }
    }

    dig() {
        if (this.raycastResult) {
            const { point, face } = this.raycastResult;
            const blockPos = point.clone().sub(face.normal.clone().multiplyScalar(0.5)).floor();
            if (this.world.getBlock(blockPos.x, blockPos.y, blockPos.z) !== 0) {
                this.world.setBlock(blockPos.x, blockPos.y, blockPos.z, 0);
                this.world.rebuildDirtyChunks();
            }
        }
    }
    
    updatePlacementHelper() {
        this.raycaster.setFromCamera({x: 0, y: 0}, this.camera);
        const intersects = this.raycaster.intersectObjects(this.world.blockMeshes);
        if (intersects.length > 0) {
            const int = intersects[0];
            const blockPos = int.point.clone().sub(int.face.normal.clone().multiplyScalar(0.5)).floor();
            this.placementHelper.position.copy(blockPos).addScalar(0.5);
            this.placementHelper.visible = true;
            this.raycastResult = int;
        } else {
            this.placementHelper.visible = false;
            this.raycastResult = null;
        }
    }

    update(delta) {
        this.velocity.y -= this.gravity * delta;

        // --- JOYSTICK FIX: Base movement on yaw (left/right look) only ---
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.yaw.quaternion);
        const right = new THREE.Vector3().crossVectors(this.camera.up, forward).normalize();
        
        const moveX = right.multiplyScalar(this.direction.x * this.moveSpeed * delta);
        const moveZ = forward.multiplyScalar(this.direction.y * this.moveSpeed * delta); // Inverted Y-axis
        const horizDelta = moveX.add(moveZ);

        const feetPos = this.yaw.position.clone();
        feetPos.y -= this.eyeHeight;

        this.tryMove(new THREE.Vector3(horizDelta.x, 0, 0), feetPos);
        this.tryMove(new THREE.Vector3(0, 0, horizDelta.z), feetPos);

        const vertDelta = new THREE.Vector3(0, this.velocity.y * delta, 0);
        const movedVertically = this.tryMove(vertDelta, feetPos);

        if (this.velocity.y <= 0 && !movedVertically) {
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        if (this.velocity.y > 0 && !movedVertically) {
            this.velocity.y = 0;
        }
        
        this.yaw.position.copy(feetPos);
        this.yaw.position.y += this.eyeHeight;

        this.updatePlacementHelper();
    }
}

