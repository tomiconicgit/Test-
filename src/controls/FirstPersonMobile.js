// src/controls/FirstPersonMobile.js
import * as THREE from 'three';

/**
 * First-person mobile/desktop controller.
 *
 * Features:
 * - Left-screen virtual joystick for move (mobile).
 * - Right-screen touch-drag to look (mobile).
 * - Desktop fallback: WASD + mouse drag.
 * - Gravity + jump.
 * - Optional ground collision using raycasts against your voxel chunk meshes.
 * - Optional world bounds clamp.
 *
 * Usage in Game.js (optional collision/bounds, keeps old signature working):
 *   const controls = new FirstPersonMobile(camera, renderer.domElement, {
 *     joy: document.getElementById('joy'),
 *     stick: document.getElementById('stick')
 *   });
 *   // (optional) provide collision sources for proper ground over holes:
 *   controls.setCollision({
 *     raycaster,
 *     getMeshes: () => {
 *       const list = [];
 *       for (const ch of world.chunks.values()) for (const m of ch.meshes.values()) list.push(m);
 *       return list;
 *     }
 *   });
 *   // (optional) clamp play area:
 *   controls.setBounds({ minX:-49, maxX:49, minZ:-49, maxZ:49, minY:-30, maxY:999 });
 */
export class FirstPersonMobile {
  constructor(camera, dom, hudEls, opts = {}) {
    this.camera = camera;
    this.dom = dom;
    this.hud = hudEls || {};
    this.opts = opts;

    // Movement state
    this.move = new THREE.Vector2(0, 0);         // x: strafe, y: forward
    this.velocity = new THREE.Vector3();         // current velocity
    this.speed = opts.speed ?? 5.0;              // m/s walk
    this.sprintMultiplier = opts.sprint ?? 1.6;  // sprint factor
    this.airControl = 0.35;                      // movement factor in air
    this.gravity = opts.gravity ?? -22.0;        // m/s^2
    this.jumpSpeed = opts.jumpSpeed ?? 7.5;      // m/s
    this.eyeHeight = opts.eyeHeight ?? 1.8;      // camera height above ground
    this.onGround = false;
    this.canJump = true;

    // Look state
    this.yaw = 0;
    this.pitch = 0;
    this.lookSensitivity = opts.lookSensitivity ?? 0.13; // higher = faster
    this.invertY = !!opts.invertY;

    // Bounds (optional)
    this.bounds = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity, minY: -Infinity, maxY: Infinity };

    // Collision (optional): { raycaster, getMeshes:()=>THREE.Object3D[] }
    this.collision = null;

    // Spawn a bit above ground to avoid clipping on start
    const spawn = opts.spawn ?? new THREE.Vector3(0, this.eyeHeight + 1.0, 6);
    this.camera.position.copy(spawn);

    // Input
    this._keys = new Set();
    this._bindJoystick(); // left thumb
    this._bindLook();     // right thumb / mouse drag
    this._bindKeyboard(); // desktop fallback
  }

  /* -------------------- Public config hooks -------------------- */

  /** Provide raycaster + meshes provider for ground/head collision (optional). */
  setCollision({ raycaster, getMeshes }) {
    this.collision = { raycaster, getMeshes };
  }

  /** Clamp play area horizontally and vertically (optional). */
  setBounds({ minX = -Infinity, maxX = Infinity, minZ = -Infinity, maxZ = Infinity, minY = -Infinity, maxY = Infinity } = {}) {
    this.bounds = { minX, maxX, minZ, maxZ, minY, maxY };
  }

  /* -------------------- Input binding -------------------- */

  _bindJoystick() {
    const joy = this.hud.joy;
    const stick = this.hud.stick;
    if (!joy || !stick) return; // allow desktop-only use

    let active = false, cx = 0, cy = 0;

    const rect = () => joy.getBoundingClientRect();

    const start = (x, y) => {
      active = true;
      const r = rect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      this._updateStick(x, y, cx, cy, stick);
    };
    const move = (x, y) => {
      if (!active) return;
      this._updateStick(x, y, cx, cy, stick);
    };
    const end = () => {
      active = false;
      this.move.set(0, 0);
      stick.style.transform = `translate(-50%,-50%)`;
    };

    const ts = e => { const t = e.changedTouches[0]; start(t.clientX, t.clientY); e.preventDefault(); };
    const tm = e => { const t = e.changedTouches[0]; move(t.clientX, t.clientY);  e.preventDefault(); };
    const te = e => { end(); e.preventDefault(); };

    joy.addEventListener('touchstart', ts, { passive: false });
    joy.addEventListener('touchmove',  tm, { passive: false });
    joy.addEventListener('touchend',   te, { passive: false });

    // Optional: mouse support on joystick (desktop testing)
    joy.addEventListener('mousedown', (e)=>{ start(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e)=>{ move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', end);
  }

  _updateStick(x, y, cx, cy, stick) {
    const dx = x - cx, dy = y - cy;
    const R = 60; // max travel px
    const len = Math.min(Math.hypot(dx, dy), R);
    const ang = Math.atan2(dy, dx);
    const nx = Math.cos(ang) * len;
    const ny = Math.sin(ang) * len;
    // UI
    stick.style.transform = `translate(${nx}px, ${ny}px)`;
    // Map to movement (forward is -ny, strafe is nx)
    this.move.set(nx / R, -ny / R);
  }

  _bindLook() {
    // Touch look on right half of screen
    let touching = false;
    let lx = 0, ly = 0;

    const onStart = (e) => {
      const t = (e.changedTouches && e.changedTouches[0]) || e;
      if (t.clientX < window.innerWidth / 2) return; // right half only
      touching = true; lx = t.clientX; ly = t.clientY;
      e.preventDefault?.();
    };
    const onMove = (e) => {
      if (!touching) return;
      const t = (e.changedTouches && e.changedTouches[0]) || e;
      const dx = t.clientX - lx;
      const dy = t.clientY - ly;
      lx = t.clientX; ly = t.clientY;
      // sensitivity scaled to ~60fps feel
      const s = 0.002 * this.lookSensitivity * 60;
      this.yaw   -= dx * s;
      this.pitch += (this.invertY ? dy : -dy) * s;
      this.pitch = Math.max(-Math.PI/2 + 0.001, Math.min(Math.PI/2 - 0.001, this.pitch));
      e.preventDefault?.();
    };
    const onEnd = () => { touching = false; };

    window.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove',  onMove,  { passive: false });
    window.addEventListener('touchend',   onEnd,   { passive: false });

    // Desktop mouse drag anywhere (no pointer lock needed for testing)
    let dragging = false, mx=0, my=0;
    window.addEventListener('mousedown', (e)=>{ dragging = true; mx=e.clientX; my=e.clientY; });
    window.addEventListener('mousemove', (e)=>{
      if (!dragging) return;
      const dx = e.clientX - mx, dy = e.clientY - my; mx=e.clientX; my=e.clientY;
      const s = 0.002 * this.lookSensitivity * 60;
      this.yaw   -= dx * s;
      this.pitch += (this.invertY ? dy : -dy) * s;
      this.pitch = Math.max(-Math.PI/2 + 0.001, Math.min(Math.PI/2 - 0.001, this.pitch));
    });
    window.addEventListener('mouseup', ()=>{ dragging = false; });

    // Space to jump (desktop)
    window.addEventListener('keydown', (e)=>{ if (e.code === 'Space') this._tryJump(); });
  }

  _bindKeyboard() {
    const down = (e) => { this._keys.add(e.code); };
    const up   = (e) => { this._keys.delete(e.code); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
  }

  /* -------------------- Update loop -------------------- */

  update(dt) {
    // 1) Orientation (yaw/pitch → camera quaternion)
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.camera.quaternion.copy(q);

    // 2) Desired move from touch/keyboard
    const kF = (this._keys.has('KeyW') ? 1 : 0) + (this._keys.has('ArrowUp') ? 1 : 0)
             - ((this._keys.has('KeyS') ? 1 : 0) + (this._keys.has('ArrowDown') ? 1 : 0));
    const kR = (this._keys.has('KeyD') ? 1 : 0) + (this._keys.has('ArrowRight') ? 1 : 0)
             - ((this._keys.has('KeyA') ? 1 : 0) + (this._keys.has('ArrowLeft') ? 1 : 0));

    // Combine joystick + keyboard
    const wishF = THREE.MathUtils.clamp(this.move.y + kF, -1, 1);
    const wishR = THREE.MathUtils.clamp(this.move.x + kR, -1, 1);

    // 3) Build movement vectors in yaw plane
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(q); forward.y = 0; forward.normalize();
    const right   = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).negate();

    const wishDir = new THREE.Vector3()
      .addScaledVector(forward, wishF)
      .addScaledVector(right,   wishR);

    const wishLen = wishDir.length();
    if (wishLen > 1e-5) wishDir.multiplyScalar(1 / wishLen);

    // Sprint (Shift or strong joystick push)
    const isSprinting = this._keys.has('ShiftLeft') || this._keys.has('ShiftRight') || (this.move.length() > 0.9);
    const targetSpeed = (isSprinting ? this.speed * this.sprintMultiplier : this.speed) * wishLen;

    // Ground check (raycast down if collision provided), else synthetic plane y=0
    const ground = this._probeGround();
    const groundedNow = ground.grounded;

    // 4) Accelerate horizontally (reduced control in air)
    const control = groundedNow ? 1.0 : this.airControl;
    const accel = 18 * control;
    const targetVelX = wishDir.x * targetSpeed;
    const targetVelZ = wishDir.z * targetSpeed;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, accel, dt);

    // 5) Gravity & jump
    if (groundedNow) {
      // Snap to ground (keep eye height above hit Y)
      const desiredY = ground.y + this.eyeHeight;
      const snapSpeed = 40;
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, snapSpeed, dt);
      this.velocity.y = 0;
      this.onGround = true;
      this.canJump = true;
    } else {
      this.onGround = false;
      this.velocity.y += this.gravity * dt;
    }

    // 6) Move
    this.camera.position.x += this.velocity.x * dt;
    this.camera.position.y += this.velocity.y * dt;
    this.camera.position.z += this.velocity.z * dt;

    // 7) Head bump (ceiling) quick fix: short ray upward to prevent entering blocks
    if (this.collision) {
      const upHit = this._ray(this.camera.position, new THREE.Vector3(0,1,0), 0.4);
      if (upHit) {
        // push down slightly
        this.camera.position.y = Math.min(this.camera.position.y, upHit.point.y - 0.02);
        if (this.velocity.y > 0) this.velocity.y = 0;
      }
    }

    // 8) Clamp to bounds (optional)
    const b = this.bounds;
    this.camera.position.x = Math.max(b.minX, Math.min(b.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(b.minZ, Math.min(b.maxZ, this.camera.position.z));
    this.camera.position.y = Math.max(b.minY + this.eyeHeight * 0.5, Math.min(b.maxY, this.camera.position.y));

    // 9) Keyboard jump (handled here so holding space doesn't spam)
    if (this._keys.has('Space')) this._tryJump();
  }

  _tryJump() {
    if (this.onGround && this.canJump) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
      this.canJump = false;
    }
  }

  /* -------------------- Collision helpers -------------------- */

  _probeGround() {
    // If collision provided, raycast down; fallback to plane at y=0 (your default solid surface)
    const feet = this.camera.position.clone().add(new THREE.Vector3(0, -this.eyeHeight * 0.5, 0));
    const maxDown = 3.5; // meters to check below feet
    if (this.collision) {
      const hit = this._ray(feet, new THREE.Vector3(0,-1,0), maxDown);
      if (hit) {
        // Consider grounded if we are within small step from surface
        const tgtY = hit.point.y + this.eyeHeight * 0.5;
        const grounded = (feet.y - tgtY) <= 0.15; // step height
        return { grounded, y: hit.point.y };
      }
      return { grounded: false, y: -Infinity };
    } else {
      // Synthetic ground y = 0 (your world filled 0..-30), treat as flat ground
      if (feet.y <= this.eyeHeight * 0.5 + 0.02) {
        return { grounded: true, y: 0 };
      }
      return { grounded: false, y: 0 };
    }
  }

  _ray(origin, dir, dist) {
    if (!this.collision) return null;
    const { raycaster, getMeshes } = this.collision;
    if (!raycaster || !getMeshes) return null;
    raycaster.set(origin, dir.clone().normalize());
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(getMeshes(), false);
    return hits[0] || null;
  }
}