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