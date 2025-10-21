// engine/placement.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { VoxelWorld, BLOCK } from './VoxelWorld.js';

export class PlacementController {
    constructor(scene, camera, propGeometries, materials) {
        this.scene = scene;
        this.camera = camera;
        this.propGeometries = propGeometries;
        this.allMaterials = materials;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 8.0;

        this.isSnapping = false;
        this.snapTarget = null;
        this.currentHit = null;

        // Preview orientation flag (true = upright vertical, false = laid horizontal)
        this.verticalPreview = true;

        // Preview visuals
        this.previewMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        this.previewMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.previewMat);
        this.previewMesh.visible = false;
        this.scene.add(this.previewMesh);

        // Voxel highlight box
        this.voxelHighlight = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001)),
            new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 })
        );
        this.scene.add(this.voxelHighlight);

        // Prop highlight
        this.propHighlight = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
        this.propHighlight.visible = false;
        this.scene.add(this.propHighlight);
    }

    update(world, player, activeItem, activeMaterial, activeScale, input) {
        // Reset visuals
        this.voxelHighlight.visible = false;
        this.propHighlight.visible = false;
        this.previewMesh.visible = false;
        this.currentHit = null;

        // D-pad: preview flip
        if (input.flipToHorizontal) this.verticalPreview = false;
        if (input.flipToVertical)   this.verticalPreview = true;

        // Raycasts
        const voxelHit = this._raycastVoxel(world, player.position, player.lookDirection);
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const propIntersects = this.raycaster.intersectObjects(world.props, false);
        const propHit = propIntersects.length > 0 ? propIntersects[0] : null;
        const targetedProp = propHit ? propHit.object : null;

        // L1 rotate currently targeted prop
        if (input.rotate && targetedProp) {
            targetedProp.rotation.y += Math.PI / 2;
            this._refreshPropAABB(targetedProp);
        }
        // D-pad flip targeted prop
        if (input.flipToHorizontal && targetedProp) this._setVertical(targetedProp, false);
        if (input.flipToVertical && targetedProp)   this._setVertical(targetedProp, true);

        // Snap toggle
        if (input.snap && targetedProp) {
            if (this.isSnapping && this.snapTarget === targetedProp) { this.isSnapping = false; this.snapTarget = null; }
            else { this.isSnapping = true; this.snapTarget = targetedProp; }
        }
        if (this.isSnapping && targetedProp !== this.snapTarget) { this.isSnapping = false; this.snapTarget = null; }

        // Build preview
        if (this.isSnapping && this.snapTarget) {
            this._handleSnapMode(activeItem, this.snapTarget);
        } else {
            if (propHit && (!voxelHit || propHit.distance < voxelHit.distance)) {
                this.propHighlight.setFromObject(propHit.object);
                this.propHighlight.visible = true;
            } else if (voxelHit) {
                this._handleVoxelMode(voxelHit, player, activeItem);
            }
        }

        if (this.previewMesh.visible) this.previewMesh.material = this.previewMat;
    }

    // ---- Actions ------------------------------------------------------------

    place(world, activeItem, activeMaterial, activeScale) {
        if (!this.currentHit && !this.isSnapping) return;

        if (this.isSnapping && this.previewMesh.visible) {
            this._placeProp(world, activeItem, activeMaterial, activeScale);
            this.isSnapping = false;
            this.snapTarget = null;
            return;
        }
        if (this.currentHit) {
            if (activeItem === 'VOXEL') {
                world.setVoxel(this.currentHit.prev.x, this.currentHit.prev.y, this.currentHit.prev.z, BLOCK.METAL, true);
            } else if (this.propGeometries[activeItem] && this.previewMesh.visible) {
                this._placeProp(world, activeItem, activeMaterial, activeScale);
            }
        }
    }

    remove(world) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera