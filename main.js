// main.js
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

    // Mechzilla
    this.tower = new MechzillaTower({
      height: 75,
      baseSize: 6,
      armLength: 24,
      position: new THREE.Vector3(-10, 0, -8)
    });
    this.scene.add(this.tower.group);

    // UI
    const btn = document.getElementById('toggle-arms');
    const slider = document.getElementById('arm-height');
    if (btn) btn.addEventListener('click', () => this.tower.toggle());
    if (slider) slider.addEventListener('input', (e) => this.tower.setCatcherHeight(Number(e.target.value)));

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupWorld() {
    const terrain = createTerrain(); this.scene.add(terrain);
    const skydome = createSkydome(); this.scene.add(skydome);
    setupLighting(this.scene);

    this.scene.add(this.cameraRig.camera);
    this.cameraRig.camera.position.set(8, this.playerHeight, 18);
    this.cameraRig.lon = -140; // face the tower initially
    this.cameraRig.lat = -5;
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

    // Ground stick
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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
  }
  new Game();
});