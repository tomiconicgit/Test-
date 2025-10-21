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

        this.verticalPreview = true; // preview orientation flag (vertical by default)

        this.previewMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
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

        // Flip orientation via D-pad pulses
        if (input.flipToHorizontal) this.verticalPreview = false;
        if (input.flipToVertical)   this.verticalPreview = true;

        const voxelHit = this._raycastVoxel(world, player.position, player.lookDirection);
        this.raycaster.setFromCamera({x:0, y:0}, this.camera);
        const propIntersects = this.raycaster.intersectObjects(world.props, false);
        const propHit = propIntersects.length > 0 ? propIntersects[0] : null;
        let targetedProp = propHit ? propHit.object : null;

        // Rotate existing target (L1)
        if (input.rotate && targetedProp) {
            targetedProp.rotation.y += Math.PI / 2;
            this._refreshPropAABB(targetedProp);
        }

        // Flip existing target vertical/horizontal (D-pad)
        if (input.flipToHorizontal && targetedProp) {
            this._setVertical(targetedProp, false);
        }
        if (input.flipToVertical && targetedProp) {
            this._setVertical(targetedProp, true);
        }

        // Snap mode toggle
        if (input.snap && targetedProp) {
            if (this.isSnapping && this.snapTarget === targetedProp) { this.isSnapping = false; this.snapTarget = null; }
            else { this.isSnapping = true; this.snapTarget = targetedProp; }
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

        if (this.previewMesh.visible) this.previewMesh.material = this.previewMat;
    }

    // Place / Remove ---------------------------------------------------------
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
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const intersects = this.raycaster.intersectObjects(world.props);
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if(this.snapTarget === obj) { this.isSnapping = false; this.snapTarget = null; }

            // Dispose cloned materials
            if (obj.material && obj.material !== this.allMaterials.glass && obj.material !== this.allMaterials.sand) {
                const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
                maps.forEach(m => { if (obj.material[m]) obj.material[m].dispose(); });
                obj.material.dispose();
            }
            // Remove from scene and world
            this.scene.remove(obj);
            const i = world.props.indexOf(obj);
            if (i >= 0) world.props.splice(i, 1);
        } else {
            if (!this.currentHit || !this.currentHit.isVoxel) return;
            world.setVoxel(this.currentHit.pos.x, this.currentHit.pos.y, this.currentHit.pos.z, BLOCK.AIR, true);
        }
    }

    rotate(world) { /* kept for compatibility; L1 handled in update() */ }

    // Internal ---------------------------------------------------------------
    _handleSnapMode(activeItem, target) {
        this.propHighlight.setFromObject(target);
        this.propHighlight.visible = true;
        if (this.propGeometries[activeItem]) {
            this.previewMesh.geometry = this.propGeometries[activeItem];
            const targetBox = new THREE.Box3().setFromObject(target);
            this.previewMesh.position.set(target.position.x, targetBox.max.y, target.position.z);
            this.previewMesh.rotation.copy(target.rotation);
            this.previewMesh.visible = true;
        }
    }

    _handleVoxelMode(hit, player, activeItem) {
        this.currentHit = { ...hit, isVoxel: true };
        const isBlock = activeItem === 'VOXEL';
        const isProp = this.propGeometries[activeItem];

        if (isBlock) {
            this.voxelHighlight.position.set(hit.pos.x + 0.5, hit.pos.y + 0.5, hit.pos.z + 0.5);
            this.voxelHighlight.visible = true;
            return;
        }
        if (!isProp) return;

        // Build preview geometry
        this.previewMesh.geometry = this.propGeometries[activeItem];
        const pos = hit.prev;
        const n = hit.normal;
        const playerAngle = Math.round(player.yaw.rotation.y / (Math.PI / 2)) * (Math.PI / 2);

        // Default preview orientation (upright vs horizontal)
        this.previewMesh.rotation.set(0, 0, 0);
        if (!this.verticalPreview) this.previewMesh.rotation.x = Math.PI / 2;

        // Edge-snapping for WALL / PANE to the voxel face (perimeter)
        if (activeItem === 'WALL' || activeItem === 'PANE') {
            const halfT = (activeItem === 'WALL') ? 0.05 : 0.025; // geometry thickness/2
            let px = pos.x + 0.5;
            let py = pos.y + 0.5;
            let pz = pos.z + 0.5;

            if (Math.abs(n.x) > 0.5) {
                px = hit.pos.x + (n.x > 0 ? 1 + halfT : -halfT); // flush to +X or -X face
                this.previewMesh.rotation.y = Math.PI / 2;       // face ±X
            } else if (Math.abs(n.z) > 0.5) {
                pz = hit.pos.z + (n.z > 0 ? 1 + halfT : -halfT); // flush to +Z or -Z face
                this.previewMesh.rotation.y = 0;                 // face ±Z
            } else if (Math.abs(n.y) > 0.5) {
                // top/bottom face: center in XZ, sit on top or below
                py = hit.pos.y + (n.y > 0 ? 1 + halfT : -halfT);
                // rotate flat if horizontal preview
            }

            this.previewMesh.position.set(px, py, pz);
            this.previewMesh.visible = true;
            return;
        }

        // Other props: center on cell and use player-facing Y rotation
        this.previewMesh.position.set(pos.x + 0.5, pos.y, pos.z + 0.5);
        this.previewMesh.rotation.y = playerAngle;
        this.previewMesh.visible = true;
    }

    _placeProp(world, activeItem, activeMaterial, activeScale) {
        // Determine original key
        const materialKey = Object.keys(this.allMaterials).find(k => this.allMaterials[k] === activeMaterial);

        // Clone material for per-prop scaling (except glass)
        const mat = (activeItem === 'PANE') ? this.allMaterials.glass : activeMaterial.clone();
        if (activeItem !== 'PANE') {
            const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap'];
            maps.forEach(m => {
                if (mat[m]) {
                    mat[m] = mat[m].clone();
                    mat[m].repeat.set(activeScale, activeScale);
                    mat[m].needsUpdate = true;
                }
            });
        }

        const mesh = new THREE.Mesh(this.propGeometries[activeItem], mat);
        mesh.position.copy(this.previewMesh.position);
        mesh.rotation.copy(this.previewMesh.rotation);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.name = activeItem.toLowerCase();
        mesh.userData.materialKey = materialKey || 'metal';
        mesh.userData.scale = activeScale;

        // Compute and store solid AABB (for collisions)
        this._refreshPropAABB(mesh);

        this.scene.add(mesh);
        world.props.push(mesh);
    }

    _setVertical(obj, vertical) {
        // vertical = rotation.x = 0; horizontal = lay flat (rotation.x = 90°)
        const keepY = obj.rotation.y;
        obj.rotation.set(vertical ? 0 : Math.PI / 2, keepY, 0);
        this._refreshPropAABB(obj);
    }

    _refreshPropAABB(obj) {
        obj.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(obj);
        obj.userData.aabb = box;
    }

    _raycastVoxel(world, origin, dir) {
        const pos=new THREE.Vector3().copy(origin);
        const step=new THREE.Vector3(Math.sign(dir.x)||1,Math.sign(dir.y)||1,Math.sign(dir.z)||1);
        const tDelta=new THREE.Vector3(Math.abs(1/dir.x)||1e9,Math.abs(1/dir.y)||1e9,Math.abs(1/dir.z)||1e9);
        let voxel=new THREE.Vector3(Math.floor(pos.x),Math.floor(pos.y),Math.floor(pos.z));
        const bound=new THREE.Vector3(voxel.x+(step.x>0?1:0),voxel.y+(step.y>0?1:0),voxel.z+(step.z>0?1:0));
        const tMax=new THREE.Vector3(dir.x!==0?(bound.x-pos.x)/dir.x:1e9,dir.y!==0?(bound.y-pos.y)/dir.y:1e9,dir.z!==0?(bound.z-pos.z)/dir.z:1e9);
        let dist=0;let lastVoxel=voxel.clone();
        for(let i=0;i<256;i++){
            if(world.inXZ(voxel.x,voxel.z)){
                const id=world.getVoxel(voxel.x,voxel.y,voxel.z);
                if(id!==BLOCK.AIR){
                    const normal=lastVoxel.clone().sub(voxel);
                    return{pos:voxel.clone(),prev:lastVoxel.clone(),id,normal,distance:dist};
                }
            }
            lastVoxel.copy(voxel);
            if(tMax.x<tMax.y){ if(tMax.x<tMax.z){ voxel.x+=step.x; dist=tMax.x; tMax.x+=tDelta.x; } else { voxel.z+=step.z; dist=tMax.z; tMax.z+=tDelta.z; } }
            else { if(tMax.y<tMax.z){ voxel.y+=step.y; dist=tMax.y; tMax.y+=tDelta.y; } else { voxel.z+=step.z; dist=tMax.z; tMax.z+=tDelta.z; } }
            if(dist>this.raycaster.far) break;
        }
        return null;
    }
}