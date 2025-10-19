// src/controls/FirstPersonMobile.js
import * as THREE from 'three';

export class FirstPersonMobile {
  constructor(camera, dom, hudEls) {
    this.camera = camera;
    this.dom = dom;
    this.hud = hudEls;

    // movement
    this.move = new THREE.Vector2(0,0);
    this.velocity = new THREE.Vector3();
    this.speed = 5.0; // m/s
    this.gravity = -18.0;
    this.onGround = true;
    this.posY = 2; // eye height
    this.camera.position.set(0, this.posY, 5);

    // look
    this.yaw = 0;
    this.pitch = 0;
    this.lookSensitivity = 0.14;

    this._bindJoystick();
    this._bindLook();
  }

  _bindJoystick() {
    const joy = this.hud.joy;
    const stick = this.hud.stick;
    const rect0 = () => joy.getBoundingClientRect();

    let active = false, cx=0, cy=0;

    const onStart = (e) => {
      active = true;
      const r = rect0();
      cx = r.left + r.width/2;
      cy = r.top + r.height/2;
      const t = e.touches ? e.touches[0] : e;
      this._updateStick(t.clientX, t.clientY, cx, cy, stick);
    };
    const onMove = (e) => {
      if (!active) return;
      const t = e.touches ? e.touches[0] : e;
      this._updateStick(t.clientX, t.clientY, cx, cy, stick);
    };
    const onEnd = () => {
      active = false;
      this.move.set(0,0);
      stick.style.transform = `translate(-50%,-50%)`;
    };

    joy.addEventListener('touchstart', onStart, {passive:false});
    joy.addEventListener('touchmove', onMove, {passive:false});
    joy.addEventListener('touchend', onEnd);
  }

  _updateStick(x, y, cx, cy, stick) {
    const dx = x - cx, dy = y - cy;
    const r = 60;
    const len = Math.min(Math.hypot(dx,dy), r);
    const ang = Math.atan2(dy, dx);
    const nx = Math.cos(ang)*len, ny = Math.sin(ang)*len;
    stick.style.transform = `translate(${nx}px, ${ny}px)`;
    // forward/back (z): -ny, strafe (x): nx
    this.move.set(nx/r, -ny/r);
  }

  _bindLook() {
    let touching = false;
    let lx=0, ly=0;
    const onStart = (e) => {
      // Only right half of screen for look
      const t = e.touches ? e.touches[0] : e;
      if (t.clientX < window.innerWidth/2) return;
      touching = true; lx = t.clientX; ly = t.clientY;
    };
    const onMove = (e) => {
      if (!touching) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - lx;
      const dy = t.clientY - ly;
      lx = t.clientX; ly = t.clientY;
      this.yaw   -= dx * 0.002 * this.lookSensitivity * 60;
      this.pitch -= dy * 0.002 * this.lookSensitivity * 60;
      this.pitch = Math.max(-Math.PI/2+0.001, Math.min(Math.PI/2-0.001, this.pitch));
    };
    const onEnd = () => touching = false;

    window.addEventListener('touchstart', onStart, {passive:false});
    window.addEventListener('touchmove', onMove,  {passive:false});
    window.addEventListener('touchend', onEnd);
  }

  update(dt) {
    // orientation
    const q = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.camera.quaternion.copy(q);

    // movement vector in camera yaw space
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(q);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).negate();

    const wish = new THREE.Vector3()
      .addScaledVector(forward, this.move.y)
      .addScaledVector(right,   this.move.x);

    if (wish.lengthSq() > 1) wish.normalize();
    const accel = 20;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x * this.speed, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z * this.speed, accel, dt);

    // gravity (keep simple: lock at ground y when onGround and no holes under)
    this.velocity.y += this.gravity * dt;
    // Move
    this.camera.position.x += this.velocity.x * dt;
    this.camera.position.z += this.velocity.z * dt;
    this.camera.position.y += this.velocity.y * dt;

    // clamp to sky and minimum depth
    this.camera.position.y = Math.min(this.camera.position.y, 1000 - 1);

    // crude ground clamp at y>=1 if no pit under (ray will handle pits while digging)
    if (this.camera.position.y < 1) {
      this.camera.position.y = 1;
      this.velocity.y = 0;
    }
  }
}