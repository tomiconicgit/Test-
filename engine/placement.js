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

        if (this.previewMesh.visible) {
             this.previewMesh.material = this.previewMat;
        }
    }

    _handleSnapMode(activeItem, target) {
        this.propHighlight.setFromObject(target); this.propHighlight.visible = true;
        if (this.propGeometries[activeItem]) {
            this.previewMesh.geometry = this.propGeometries[activeItem];
            const targetBox = new THREE.Box3().setFromObject(target);
            this.previewMesh.position.set(target.position.x, targetBox.max.y, target.position.z);
            this.previewMesh.rotation.copy(target.rotation);
            this.previewMesh.visible = true;
        }
    }

    _handleVoxelMode(voxelHit, player, activeItem) {
        this.currentHit = { ...voxelHit, isVoxel: true };
        const isBlock = activeItem === 'VOXEL';
        const isProp = this.propGeometries[activeItem];
        if (isBlock) {
            this.voxelHighlight.position.set(this.currentHit.pos.x + 0.5, this.currentHit.pos.y + 0.5, this.currentHit.pos.z + 0.5);
            this.voxelHighlight.visible = true;
        } else if (isProp) {
            this.previewMesh.geometry = this.propGeometries[activeItem];
            const pos = this.currentHit.prev; const normal = this.currentHit.normal; const playerAngle = Math.round(player.yaw.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
            if (activeItem === 'FLOOR') { if (normal.y > 0.5) { this.previewMesh.position.set(this.currentHit.pos.x + 0.5, this.currentHit.pos.y + 1, this.currentHit.pos.z + 0.5); this.previewMesh.visible = true; }}
            else { this.previewMesh.position.set(pos.x + 0.5, pos.y, pos.z + 0.5); this.previewMesh.rotation.y = playerAngle; this.previewMesh.visible = true; }
        }
    }

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

    _placeProp(world, activeItem, activeMaterial, activeScale) {
        let materialToUse;
        // Find the original material key (e.g., 'metal', 'cement')
        const materialKey = Object.keys(this.allMaterials).find(key => this.allMaterials[key] === activeMaterial);

        // Always use original glass material for PANE
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

        // --- Store original material key and scale in userData for saving ---
        newProp.userData.materialKey = materialKey || 'metal'; // Store the key
        newProp.userData.scale = activeScale;

        if (activeItem.includes('FLOOR')) newProp.userData.height = 0.1;
        else newProp.userData.height = 1;

        this.scene.add(newProp);
        world.props.push(newProp);
    }

    remove(world) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera); const intersects = this.raycaster.intersectObjects(world.props);
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if(this.snapTarget === obj) { this.isSnapping = false; this.snapTarget = null; }
            // Dispose material resources if it's a cloned material
            if (obj.material && obj.material !== this.allMaterials.glass && obj.material !== this.allMaterials.sand) {
                 const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
                 maps.forEach(mapType => {
                    if (obj.material[mapType]) {
                        obj.material[mapType].dispose();
                    }
                 });
                 obj.material.dispose();
            }
            // Dispose geometry
            if (obj.geometry) obj.geometry.dispose();
            // Remove from scene and world props array
            this.scene.remove(obj);
            world.props.splice(world.props.indexOf(obj), 1);
        }
        else {
             if (!this.currentHit || !this.currentHit.isVoxel) return;
             world.setVoxel(this.currentHit.pos.x, this.currentHit.pos.y, this.currentHit.pos.z, BLOCK.AIR, true);
        }
    }

    rotate(world) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const intersects = this.raycaster.intersectObjects(world.props);
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            obj.rotation.y += Math.PI / 2;
            if (this.isSnapping && this.snapTarget === obj) {
                this.previewMesh.rotation.copy(obj.rotation);
            }
        }
    }

    _raycastVoxel(world, origin, dir) {
        const pos=new THREE.Vector3().copy(origin);const step=new THREE.Vector3(Math.sign(dir.x)||1,Math.sign(dir.y)||1,Math.sign(dir.z)||1);const tDelta=new THREE.Vector3(Math.abs(1/dir.x)||1e9,Math.abs(1/dir.y)||1e9,Math.abs(1/dir.z)||1e9);let voxel=new THREE.Vector3(Math.floor(pos.x),Math.floor(pos.y),Math.floor(pos.z));const bound=new THREE.Vector3(voxel.x+(step.x>0?1:0),voxel.y+(step.y>0?1:0),voxel.z+(step.z>0?1:0));const tMax=new THREE.Vector3(dir.x!==0?(bound.x-pos.x)/dir.x:1e9,dir.y!==0?(bound.y-pos.y)/dir.y:1e9,dir.z!==0?(bound.z-pos.z)/dir.z:1e9);let dist=0;let lastVoxel=voxel.clone();for(let i=0;i<256;i++){if(world.inXZ(voxel.x,voxel.z)){const id=world.getVoxel(voxel.x,voxel.y,voxel.z);if(id!==BLOCK.AIR){const normal=lastVoxel.clone().sub(voxel);return{pos:voxel.clone(),prev:lastVoxel.clone(),id,normal,distance:dist};}}
        lastVoxel.copy(voxel);if(tMax.x<tMax.y){if(tMax.x<tMax.z){voxel.x+=step.x;dist=tMax.x;tMax.x+=tDelta.x;}else{voxel.z+=step.z;dist=tMax.z;tMax.z+=tDelta.z;}}else{if(tMax.y<tMax.z){voxel.y+=step.y;dist=tMax.y;tMax.y+=tDelta.y;}else{voxel.z+=step.z;dist=tMax.z;tMax.z+=tDelta.z;}}
        if(dist>this.raycaster.far)break;}
        return null;
    }
}
