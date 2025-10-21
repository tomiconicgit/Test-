import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { VoxelWorld, BLOCK } from './VoxelWorld.js'; // Assumes BLOCK is exported

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

        this.previewMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        this.previewMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.previewMat);
        this.previewMesh.visible = false;
        this.scene.add(this.previewMesh);

        this.voxelHighlight = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001)), new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 }));
        this.scene.add(this.voxelHighlight);

        this.propHighlight = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
        this.propHighlight.visible = false;
        this.scene.add(this.propHighlight);
    }
    
    // --- MODIFICATION: Added activeScale parameter (unused in update for now) ---
    update(world, player, activeItem, activeMaterial, activeScale, input) {
        this.voxelHighlight.visible = false;
        this.propHighlight.visible = false;
        this.previewMesh.visible = false;
        this.currentHit = null;

        const voxelHit = this._raycastVoxel(world, player.position, player.lookDirection);
        this.raycaster.setFromCamera({x:0, y:0}, this.camera);
        const propIntersects = this.raycaster.intersectObjects(world.props, false); 
        const propHit = propIntersects.length > 0 ? propIntersects[0] : null;
        let targetedProp = propHit ? propHit.object : null;
        
        // Handle snap input
        if (input.snap && targetedProp) {
             if (this.isSnapping && this.snapTarget === targetedProp) {
                this.isSnapping = false; this.snapTarget = null;
            } else {
                this.isSnapping = true; this.snapTarget = targetedProp;
            }
        }
        
        if (this.isSnapping && targetedProp !== this.snapTarget) { this.isSnapping = false; this.snapTarget = null; }

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
        
        // Keep using the basic green preview material
        if (this.previewMesh.visible) {
             this.previewMesh.material = this.previewMat; 
        }
    }
    
    _handleSnapMode(activeItem, target) { /* ... unchanged ... */ }
    _handleVoxelMode(voxelHit, player, activeItem) { /* ... unchanged ... */ }

    // --- MODIFICATION: Added activeScale parameter ---
    place(world, activeItem, activeMaterial, activeScale) {
        if (!this.currentHit && !this.isSnapping) return;
        if (this.isSnapping && this.previewMesh.visible) { 
            this._placeProp(world, activeItem, activeMaterial, activeScale); // Pass scale
            this.isSnapping = false; 
            this.snapTarget = null; 
            return; 
        }
        if (this.currentHit) {
            if (activeItem === 'VOXEL') { 
                world.setVoxel(this.currentHit.prev.x, this.currentHit.prev.y, this.currentHit.prev.z, BLOCK.METAL, true); 
            }
            else if (this.propGeometries[activeItem] && this.previewMesh.visible) { 
                this._placeProp(world, activeItem, activeMaterial, activeScale); // Pass scale
            }
        }
    }

    // --- MODIFICATION: Added activeScale parameter and material cloning ---
    _placeProp(world, activeItem, activeMaterial, activeScale) {
        let materialToUse;
        
        // Always use glass for PANE
        if (activeItem === 'PANE') {
            materialToUse = this.allMaterials.glass; 
        } else {
            // IMPORTANT: Clone the material so scaling doesn't affect other objects
            materialToUse = activeMaterial.clone(); 
            
            // Apply the selected scale to all maps in the cloned material
            const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
            maps.forEach(mapType => {
                if (materialToUse[mapType]) {
                    // Clone the texture as well before modifying repeat
                    materialToUse[mapType] = materialToUse[mapType].clone(); 
                    materialToUse[mapType].repeat.set(activeScale, activeScale);
                    materialToUse[mapType].needsUpdate = true; // Important!
                }
            });
        }
        
        const newProp = new THREE.Mesh(this.propGeometries[activeItem], materialToUse);
        newProp.position.copy(this.previewMesh.position); newProp.rotation.copy(this.previewMesh.rotation);
        newProp.castShadow = newProp.receiveShadow = true; 
        newProp.name = activeItem.toLowerCase();
        
        // --- MODIFICATION: Store scale in userData for saving ---
        newProp.userData.scale = activeScale; 
        
        if (activeItem.includes('FLOOR')) newProp.userData.height = 0.1; 
        else newProp.userData.height = 1; 

        this.scene.add(newProp); 
        world.props.push(newProp);
    }

    remove(world) { /* ... unchanged ... */ }
    rotate(world) { /* ... unchanged ... */ }
    _raycastVoxel(world, origin, dir) { /* ... unchanged ... */ }
}
