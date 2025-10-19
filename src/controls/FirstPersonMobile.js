// src/controls/FirstPersonMobile.js
import * as THREE from 'three';

export class FirstPersonMobile {
  constructor(camera, dom, hudEls, opts = {}) {
    this.camera = camera;
    this.dom = dom;
    this.hud = hudEls || {};
    this.opts = opts;

    // Move/physics
    this.move = new THREE.Vector2(0,0);
    this.velocity = new THREE.Vector3();
    this.speed = opts.speed ?? 5.0;
    this.sprintMultiplier = opts.sprint ?? 1.6;
    this.airControl = 0.35;
    this.gravity = opts.gravity ?? -22.0;
    this.jumpSpeed = opts.jumpSpeed ?? 7.5;
    this.eyeHeight = opts.eyeHeight ?? 1.8;
    this.onGround = false; this.canJump = true;

    // Look
    this.yaw = 0; this.pitch = 0;
    this.lookSensitivity = opts.lookSensitivity ?? 0.13;
    this.invertY = !!opts.invertY;

    // Bounds & collision
    this.bounds = { minX:-Infinity, maxX:Infinity, minZ:-Infinity, maxZ:Infinity, minY:-Infinity, maxY:Infinity };
    this.collision = null;

    // Spawn
    const spawn = opts.spawn ?? new THREE.Vector3(0, 10, 6); // Changed Y from this.eyeHeight + 1.0 to 10
    this.camera.position.copy(spawn);

    // Inputs
    this._keys = new Set();
    this._bindJoystick();
    this._bindLook();
    this._bindKeyboard();
  }

  setCollision({ raycaster, getMeshes }){ this.collision = { raycaster, getMeshes }; }
  setBounds({ minX=-Infinity,maxX=Infinity,minZ=-Infinity,maxZ=Infinity,minY=-Infinity,maxY=Infinity } = {}){
    this.bounds = { minX,maxX,minZ,maxZ,minY,maxY };
  }

  _bindJoystick(){
    const joy=this.hud.joy, stick=this.hud.stick;
    if(!joy||!stick) return;
    let active=false, cx=0, cy=0;
    const rect=()=>joy.getBoundingClientRect();
    const start=(x,y)=>{ active=true; const r=rect(); cx=r.left+r.width/2; cy=r.top+r.height/2; this._updateStick(x,y,cx,cy,stick); };
    const move=(x,y)=>{ if(!active)return; this._updateStick(x,y,cx,cy,stick); };
    const end=()=>{ active=false; this.move.set(0,0); stick.style.transform='translate(-50%,-50%)'; };

    joy.addEventListener('touchstart', e=>{const t=e.changedTouches[0]; start(t.clientX,t.clientY); e.preventDefault();},{passive:false});
    joy.addEventListener('touchmove',  e=>{const t=e.changedTouches[0]; move(t.clientX,t.clientY);  e.preventDefault();},{passive:false});
    joy.addEventListener('touchend',   e=>{end(); e.preventDefault();},{passive:false});

    joy.addEventListener('mousedown', e=>start(e.clientX,e.clientY));
    window.addEventListener('mousemove', e=>move(e.clientX,e.clientY));
    window.addEventListener('mouseup', end);
  }
  _updateStick(x,y,cx,cy,stick){
    const dx=x-cx, dy=y-cy, R=60;
    const len=Math.min(Math.hypot(dx,dy),R), ang=Math.atan2(dy,dx);
    const nx=Math.cos(ang)*len, ny=Math.sin(ang)*len;
    stick.style.transform=`translate(${nx}px,${ny}px)`;
    this.move.set(nx/R, -ny/R);
  }

  _bindLook(){
    let touching=false, lx=0, ly=0;
    const onStart=e=>{
      const t=(e.changedTouches&&e.changedTouches[0])||e;
      if(t.clientX<window.innerWidth/2) return;
      touching=true; lx=t.clientX; ly=t.clientY; e.preventDefault?.();
    };
    const onMove=e=>{
      if(!touching) return;
      const t=(e.changedTouches&&e.changedTouches[0])||e;
      const dx=t.clientX-lx, dy=t.clientY-ly; lx=t.clientX; ly=t.clientY;
      const s=0.002*this.lookSensitivity*60;
      this.yaw -= dx*s;
      this.pitch += (this.invertY?dy:-dy)*s;
      this.pitch=Math.max(-Math.PI/2+0.001, Math.min(Math.PI/2-0.001,this.pitch));
      e.preventDefault?.();
    };
    const onEnd=()=>{touching=false;};
    window.addEventListener('touchstart',onStart,{passive:false});
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('touchend',  onEnd,  {passive:false});

    // Desktop drag
    let dragging=false, mx=0,my=0;
    window.addEventListener('mousedown',e=>{dragging=true;mx=e.clientX;my=e.clientY;});
    window.addEventListener('mousemove',e=>{
      if(!dragging) return;
      const dx=e.clientX-mx, dy=e.clientY-my; mx=e.clientX; my=e.clientY;
      const s=0.002*this.lookSensitivity*60;
      this.yaw -= dx*s;
      this.pitch += (this.invertY?dy:-dy)*s;
      this.pitch=Math.max(-Math.PI/2+0.001, Math.min(Math.PI/2-0.001,this.pitch));
    });
    window.addEventListener('mouseup',()=>{dragging=false;});

    window.addEventListener('keydown',e=>{ if(e.code==='Space') this._tryJump(); });
  }

  _bindKeyboard(){
    window.addEventListener('keydown',e=>this._keys.add(e.code));
    window.addEventListener('keyup',  e=>this._keys.delete(e.code));
  }

  update(dt){
    // Orientation
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'));
    this.camera.quaternion.copy(q);

    // Inputs
    const kF=(this._keys.has('KeyW')||this._keys.has('ArrowUp')?1:0) - (this._keys.has('KeyS')||this._keys.has('ArrowDown')?1:0);
    const kR=(this._keys.has('KeyD')||this._keys.has('ArrowRight')?1:0) - (this._keys.has('KeyA')||this._keys.has('ArrowLeft')?1:0);
    const wishF=THREE.MathUtils.clamp(this.move.y + kF, -1, 1);
    const wishR=THREE.MathUtils.clamp(this.move.x + kR, -1, 1);

    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q); forward.y=0; forward.normalize();
    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).negate();

    const wish=new THREE.Vector3().addScaledVector(forward,wishF).addScaledVector(right,wishR);
    const len=wish.length(); if(len>1e-5) wish.multiplyScalar(1/len);

    const sprint = this._keys.has('ShiftLeft')||this._keys.has('ShiftRight')|| (this.move.length()>0.9);
    const targetSpeed=(sprint?this.speed*this.sprintMultiplier:this.speed)* (len>0?1:0);

    // Ground probe
    const ground=this._probeGround();
    const groundedNow=ground.grounded;

    // Horizontal accel (reduced in air)
    const control=groundedNow?1.0:this.airControl;
    const accel=18*control;
    const targetX=wish.x*targetSpeed, targetZ=wish.z*targetSpeed;
    this.velocity.x=THREE.MathUtils.damp(this.velocity.x,targetX,accel,dt);
    this.velocity.z=THREE.MathUtils.damp(this.velocity.z,targetZ,accel,dt);

    // Gravity & jump
    if(groundedNow){
      const desiredY=ground.y + this.eyeHeight;
      const snap=40;
      this.camera.position.y=THREE.MathUtils.damp(this.camera.position.y,desiredY,snap,dt);
      this.velocity.y=0; this.onGround=true; this.canJump=true;
    }else{
      this.onGround=false; this.velocity.y+=this.gravity*dt;
    }

    // Integrate
    this.camera.position.x += this.velocity.x*dt;
    this.camera.position.y += this.velocity.y*dt;
    this.camera.position.z += this.velocity.z*dt;

    // Ceiling bump
    const upHit=this._ray(this.camera.position,new THREE.Vector3(0,1,0),0.4);
    if(upHit){ this.camera.position.y=Math.min(this.camera.position.y, upHit.point.y-0.02); if(this.velocity.y>0) this.velocity.y=0; }

    // Bounds
    const b=this.bounds;
    this.camera.position.x=Math.max(b.minX,Math.min(b.maxX,this.camera.position.x));
    this.camera.position.z=Math.max(b.minZ,Math.min(b.maxZ,this.camera.position.z));
    this.camera.position.y=Math.max(b.minY + this.eyeHeight*0.5, Math.min(b.maxY,this.camera.position.y));

    if(this._keys.has('Space')) this._tryJump();
  }

  _tryJump(){
    if(this.onGround && this.canJump){ this.velocity.y=this.jumpSpeed; this.onGround=false; this.canJump=false; }
  }

  _probeGround(){
    // If no collision supplied, use infinite plane y=0
    const origin=this.camera.position.clone();
    if(!this.collision||!this.collision.getMeshes||!this.collision.raycaster){
      const feetY=origin.y - this.eyeHeight;
      const grounded = feetY <= 0.02;
      return { grounded, y: 0 };
    }

    const rc=this.collision.raycaster, meshes=this.collision.getMeshes();
    const eye=this.eyeHeight;
    const R=0.35; // body radius
    const samples=[
      new THREE.Vector3(0,0,0),
      new THREE.Vector3( R,0, R),
      new THREE.Vector3( R,0,-R),
      new THREE.Vector3(-R,0, R),
      new THREE.Vector3(-R,0,-R),
    ];
    const feet=origin.clone().add(new THREE.Vector3(0, -eye*0.5 + 0.1, 0));
    let bestY=-Infinity;
    const maxDown=5;

    for(const s of samples){
      const from=feet.clone().add(s);
      rc.set(from,new THREE.Vector3(0,-1,0));
      rc.far=maxDown;
      const hit=rc.intersectObjects(meshes,false)[0];
      if(hit) bestY=Math.max(bestY, hit.point.y);
    }

    if(bestY===-Infinity) return { grounded:false, y:-Infinity };
    const step=0.2;
    const distToSurf=(origin.y - this.eyeHeight) - bestY;
    const grounded= distToSurf <= step;
    return { grounded, y: bestY };
  }

  _ray(origin,dir,dist){
    if(!this.collision) return null;
    const { raycaster, getMeshes }=this.collision;
    if(!raycaster||!getMeshes) return null;
    raycaster.set(origin,dir.clone().normalize());
    raycaster.far=dist;
    const hits=raycaster.intersectObjects(getMeshes(),false);
    return hits[0]||null;
  }
}
