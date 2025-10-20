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
    this.yaw.position.set(50, 5, 50);
    this.scene.add(this.yaw);

    this.velocity = new THREE.Vector3(0,0,0);
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

    this.direction = new THREE.Vector2(0,0);
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
    const g = new THREE.BoxGeometry(1.002,1.002,1.002);
    const e = new THREE.EdgesGeometry(g);
    this.placementHelper = new THREE.LineSegments(
      e, new THREE.LineBasicMaterial({ color: 0xffffff, transparent:true, opacity:.7 })
    );
    this.placementHelper.visible = false;
    this.scene.add(this.placementHelper);
  }

  addEventListeners() {
    document.body.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.body.addEventListener('touchmove',  this.onTouchMove.bind(this),  { passive: false });
    document.body.addEventListener('touchend',   this.onTouchEnd.bind(this));
    document.body.addEventListener('touchcancel',this.onTouchEnd.bind(this));
    addEventListener('resize', this.onResize.bind(this));

    document.getElementById('dig-button').addEventListener('touchstart',  e => { e.preventDefault(); this.dig(); });
    document.getElementById('place-button').addEventListener('touchstart',e => { e.preventDefault(); this.place(); });
    document.getElementById('jump-button').addEventListener('touchstart', e => { e.preventDefault(); this.jump(); });

    this.blockSelect.addEventListener('change', () => { this.currentBlock = parseInt(this.blockSelect.value); });
  }

  onResize() {
    this.joystickRect = this.joystick.getBoundingClientRect();
    this.center = { x: this.joystickRect.left + this.joystickRect.width/2, y: this.joystickRect.top + this.joystickRect.height/2 };
    this.radius = this.joystickRect.width / 2;
  }

  onTouchStart(e) {
    for (const t of e.changedTouches) {
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const isButton = el && el.closest('.action-button, #block-select');
      if (isButton) continue;

      const isOverJoy = Math.hypot(t.clientX - this.center.x, t.clientY - this.center.y) < this.radius * 1.5;
      if (this.joystickTouchId === null && isOverJoy) {
        e.preventDefault(); this.joystickTouchId = t.identifier; this.updateDirection(t);
      } else if (this.lookTouchId === null) {
        e.preventDefault(); this.lookTouchId = t.identifier; this.lookPrev.set(t.clientX, t.clientY);
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    for (const t of e.touches) {
      if (t.identifier === this.joystickTouchId) this.updateDirection(t);
      else if (t.identifier === this.lookTouchId) {
        const dx = t.clientX - this.lookPrev.x;
        const dy = t.clientY - this.lookPrev.y;
        this.yaw.rotation.y -= dx * (this.lookSpeed / 1000);
        this.pitch.rotation.x -= dy * (this.lookSpeed / 1000);
        this.pitch.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch.rotation.x));
        this.lookPrev.set(t.clientX, t.clientY);
      }
    }
  }

  onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.joystickTouchId) {
        this.joystickTouchId = null; this.direction.set(0,0); this.knob.style.transform = 'translate(-50%, -50%)';
      } else if (t.identifier === this.lookTouchId) this.lookTouchId = null;
    }
  }

  updateDirection(t) {
    let dx = t.clientX - this.center.x, dy = t.clientY - this.center.y;
    const d = Math.hypot(dx, dy);
    if (d > this.radius) { dx = dx / d * this.radius; dy = dy / d * this.radius; }
    this.direction.set(dx / this.radius, dy / this.radius);
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  isPositionValid(pos) {
    const p = pos.clone(), half = this.playerWidth/2, checks = [[0,0,0],[0,this.playerHeight/2,0],[0,this.playerHeight,0]];
    for (let x=-half; x<=half; x+=this.playerWidth) for (let z=-half; z<=half; z+=this.playerWidth)
      for (const c of checks)
        if (this.world.getBlock(Math.floor(p.x+x), Math.floor(p.y+c[1]), Math.floor(p.z+z)) > 0) return false;
    return true;
  }

  tryMove(delta, feet) { if (!this.isPositionValid(feet.clone().add(delta))) return false; feet.add(delta); return true; }
  jump(){ if (this.onGround) this.velocity.y = this.jumpSpeed; }

  place() {
    if (!this.raycastResult) return;
    const { point, face } = this.raycastResult;
    const placePos = point.clone().add(face.normal.clone().multiplyScalar(0.5)).floor();
    const feet = this.yaw.position.clone().sub(new THREE.Vector3(0, this.eyeHeight, 0)).floor();
    const head = feet.clone().add(new THREE.Vector3(0,1,0));
    if (!placePos.equals(feet) && !placePos.equals(head) && this.world.getBlock(placePos.x, placePos.y, placePos.z) === 0) {
      this.world.setBlock(placePos.x, placePos.y, placePos.z, this.currentBlock);
      this.world.rebuildDirtyChunks();
    }
  }

  dig() {
    if (!this.raycastResult) return;
    const { point, face } = this.raycastResult;
    const blockPos = point.clone().sub(face.normal.clone().multiplyScalar(0.5)).floor();
    if (this.world.getBlock(blockPos.x, blockPos.y, blockPos.z) !== 0) {
      this.world.setBlock(blockPos.x, blockPos.y, blockPos.z, 0);
      this.world.rebuildDirtyChunks();
    }
  }

  updatePlacementHelper() {
    this.raycaster.setFromCamera({x:0,y:0}, this.camera);
    const hits = this.raycaster.intersectObjects(this.world.blockMeshes);
    if (hits.length) {
      const int = hits[0];
      const blockPos = int.point.clone().sub(int.face.normal.clone().multiplyScalar(0.5)).floor();
      this.placementHelper.position.copy(blockPos).addScalar(0.5);
      this.placementHelper.visible = true;
      this.raycastResult = int;
    } else { this.placementHelper.visible = false; this.raycastResult = null; }
  }

  update(delta) {
    this.velocity.y -= this.gravity * delta;

    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.yaw.quaternion);
    const right   = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const moveForward = forward.clone().multiplyScalar(-this.direction.y * this.moveSpeed * delta);
    const moveStrafe  = right.clone().multiplyScalar( this.direction.x * this.moveSpeed * delta);
    const horiz = moveForward.add(moveStrafe);

    const feet = this.yaw.position.clone(); feet.y -= this.eyeHeight;

    this.tryMove(new THREE.Vector3(horiz.x,0,0), feet);
    this.tryMove(new THREE.Vector3(0,0,horiz.z), feet);

    const v = new THREE.Vector3(0, this.velocity.y * delta, 0);
    const movedY = this.tryMove(v, feet);

    if (this.velocity.y <= 0 && !movedY) { this.velocity.y = 0; this.onGround = true; }
    else this.onGround = false;

    if (this.velocity.y > 0 && !movedY) this.velocity.y = 0;

    this.yaw.position.copy(feet); this.yaw.position.y += this.eyeHeight;

    this.updatePlacementHelper();
  }
}