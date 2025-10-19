// File: main.js
import { createTerrain } from './Terrain.js';
import { createSkydome } from './Skydome.js';
import { setupLighting } from './Lighting.js';
import { CameraRig } from './Camera.js';
import { Joystick } from './Joystick.js';
import { MechzillaTower } from './MechzillaTower.js';

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.cameraRig = new CameraRig();
    this.renderer = this.cameraRig.renderer;

    this.raycaster = new THREE.Raycaster();
    this.playerHeight = 1.7;

    this.setupWorld();

    this.joystick = new Joystick(
      document.getElementById('joystick-container'),
      document.getElementById('joystick-handle')
    );

    // === Mechzilla (15×15 mast, segmented solid-beam chopsticks)
    this.tower = new MechzillaTower({
      height: 75,
      baseSize: 15,        // <- per your request
      // You can tweak these later without touching Main:
      // seg1:10, seg2:12, seg3:10, yaw1:THREE.MathUtils.degToRad(22), yaw3:THREE.MathUtils.degToRad(-18)
    });
    this.scene.add(this.tower.group);

    // === UI wiring
    const btn = document.getElementById('toggle-arms');
    const slider = document.getElementById('arm-height');
    if (btn) btn.addEventListener('click', () => this.tower.toggle());
    if (slider) {
      // keep slider within tower travel
      const maxY = Math.max(20, this.tower.params.height - 5);
      slider.min = '10';
      slider.max = String(maxY);
      if (!slider.value) slider.value = String(Math.round(maxY * 0.55));
      slider.addEventListener('input', (e) => this.tower.setCatcherHeight(Number(e.target.value)));
      // set starting carriage height from slider
      this.tower.setCatcherHeight(Number(slider.value));
    }

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupWorld() {
    const terrain = createTerrain(); this.scene.add(terrain);
    const skydome = createSkydome(); this.scene.add(skydome);
    setupLighting(this.scene);

    // camera start aimed at tower
    this.scene.add(this.cameraRig.camera);
    this.cameraRig.camera.position.set(12, this.playerHeight + 2, 24);
    this.cameraRig.lon = -135;
    this.cameraRig.lat = -4;
  }

  handleControls(deltaTime) {
    const moveSpeed = 5 * deltaTime;

    if (this.joystick.isActive) {
      const forward = this.joystick.vertical;
      const strafe  = this.joystick.horizontal;

      const dir = new THREE.Vector3();
      this.cameraRig.camera.getWorldDirection(dir);
      dir.y = 0; dir.normalize();

      const right = dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);

      const move = new THREE.Vector3();
      if (forward) move.addScaledVector(dir, -forward * moveSpeed);
      if (strafe)  move.addScaledVector(right, -strafe * moveSpeed);

      this.cameraRig.camera.position.add(move);
    }

    // Stick to ground
    const terrain = this.scene.getObjectByName("terrain");
    if (terrain) {
      const rayOrigin = new THREE.Vector3(this.cameraRig.camera.position.x, 50, this.cameraRig.camera.position.z);
      this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
      const hits = this.raycaster.intersectObject(terrain);
      if (hits.length > 0) this.cameraRig.camera.position.y = hits[0].point.y + this.playerHeight;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    this.handleControls(dt);
    this.cameraRig.update();

    if (this.tower) this.tower.update(dt);

    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // SW + orientation (safe no-op fallbacks)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(()=>{});

  new Game();
});