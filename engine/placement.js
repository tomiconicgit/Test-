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

        // D-pad: preview flip (assumes input.flipToHorizontal / flipToVertical exist)
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
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const intersects = this.raycaster.intersectObjects(world.props);
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (this.snapTarget === obj) { this.isSnapping = false; this.snapTarget = null; }

            // Dispose cloned materials (not shared base materials like glass/sand)
            if (obj.material && obj.material !== this.allMaterials.glass && obj.material !== this.allMaterials.sand) {
                const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap', 'displacementMap'];
                maps.forEach(m => { if (obj.material[m]) obj.material[m].dispose(); });
                obj.material.dispose();
            }
            this.scene.remove(obj);
            const i = world.props.indexOf(obj);
            if (i >= 0) world.props.splice(i, 1);
        } else {
            if (!this.currentHit || !this.currentHit.isVoxel) return;
            world.setVoxel(this.currentHit.pos.x, this.currentHit.pos.y, this.currentHit.pos.z, BLOCK.AIR, true);
        }
    }

    rotate() { /* kept for compatibility; rotation handled in update() */ }

    // ---- Internal -----------------------------------------------------------

    _handleSnapMode(activeItem, target) {
        this.propHighlight.setFromObject(target);
        this.propHighlight.visible = true;

        if (!this.propGeometries[activeItem]) return;

        this.previewMesh.geometry = this.propGeometries[activeItem];
        const targetBox = new THREE.Box3().setFromObject(target);

        // Sit on top; copy rotation
        this.previewMesh.position.set(target.position.x, targetBox.max.y, target.position.z);
        this.previewMesh.rotation.copy(target.rotation);
        this.previewMesh.visible = true;
    }

    _handleVoxelMode(hit, player, activeItem) {
        this.currentHit = { ...hit, isVoxel: true };
        const isBlock = activeItem === 'VOXEL';
        const isProp = !!this.propGeometries[activeItem];

        if (isBlock) {
            this.voxelHighlight.position.set(hit.pos.x + 0.5, hit.pos.y + 0.5, hit.pos.z + 0.5);
            this.voxelHighlight.visible = true;
            return;
        }
        if (!isProp) return;

        this.previewMesh.geometry = this.propGeometries[activeItem];

        const pos = hit.prev;
        const n = hit.normal;
        const playerAngle = Math.round(player.yaw.rotation.y / (Math.PI / 2)) * (Math.PI / 2);

        // Default preview orientation (upright vs horizontal)
        this.previewMesh.rotation.set(0, 0, 0);
        if (!this.verticalPreview) this.previewMesh.rotation.x = Math.PI / 2;

        // Edge-snapping for WALL / PANE to the block *face* (perimeter)
        if (activeItem === 'WALL' || activeItem === 'PANE') {
            const halfT = (activeItem === 'WALL') ? 0.05 : 0.025; // geometry half-thickness
            let px = pos.x + 0.5, py = pos.y + 0.5, pz = pos.z + 0.5;

            if (Math.abs(n.x) > 0.5) {
                px = hit.pos.x + (n.x > 0 ? 1 + halfT : -halfT);
                this.previewMesh.rotation.y = Math.PI / 2;
            } else if (Math.abs(n.z) > 0.5) {
                pz = hit.pos.z + (n.z > 0 ? 1 + halfT : -halfT);
                this.previewMesh.rotation.y = 0;
            } else if (Math.abs(n.y) > 0.5) {
                py = hit.pos.y + (n.y > 0 ? 1 + halfT : -halfT);
                // orientation already set by verticalPreview
            }

            this.previewMesh.position.set(px, py, pz);
            this.previewMesh.visible = true;
            return;
        }

        // Other props: center in the cell, align Y to player facing
        this.previewMesh.position.set(pos.x + 0.5, pos.y, pos.z + 0.5);
        this.previewMesh.rotation.y = playerAngle;
        this.previewMesh.visible = true;
    }

    _placeProp(world, activeItem, activeMaterial, activeScale) {
        // ----- MATERIAL: clone & force one-texture-per-asset (1×1 repeat) -----
        const materialKey = Object.keys(this.allMaterials).find(k => this.allMaterials[k] === activeMaterial);
        const mat = (activeItem === 'PANE') ? this.allMaterials.glass : activeMaterial.clone();

        if (activeItem !== 'PANE') {
            const maps = ['map', 'normalMap', 'metalnessMap', 'aoMap', 'roughnessMap', 'displacementMap'];
            for (const m of maps) {
                const t = mat[m];
                if (!t) continue;
                const c = t.clone();
                c.wrapS = c.wrapT = THREE.RepeatWrapping;
                if (m === 'map') c.colorSpace = THREE.SRGBColorSpace; // keep albedo sRGB
                c.repeat.set(1, 1);                                   // << force 1×1 coverage
                c.needsUpdate = true;
                mat[m] = c;
            }
            mat.needsUpdate = true;
        }

        // ----- GEOMETRY: clone & ensure uv2 (for aoMap) -----
        const baseGeo = this.propGeometries[activeItem];
        const geo = baseGeo.clone();
        const uv = geo.getAttribute('uv');
        if (uv && !geo.getAttribute('uv2')) {
            geo.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(0), 2));
        }

        // ----- MESH -----
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(this.previewMesh.position);
        mesh.rotation.copy(this.previewMesh.rotation);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.name = activeItem.toLowerCase();

        // Keep metadata (scale kept for save compatibility, though not used for tiling now)
        mesh.userData.materialKey = materialKey || 'metal';
        mesh.userData.scale = 1.0;

        // Solid collision AABB
        this._refreshPropAABB(mesh);

        this.scene.add(mesh);
        world.props.push(mesh);
    }

    _setVertical(obj, vertical) {
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