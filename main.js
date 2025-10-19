import { createTerrain } from './Terrain.js';
import { createSkydome } from './Skydome.js';
import { setupLighting } from './Lighting.js';
import { CameraRig } from './Camera.js';
import { Joystick } from './Joystick.js';
import { MechzillaTower } from './MechzillaTower.js'; // ⬅️ NEW

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

    // --- Add Mechzilla
    this.tower = new MechzillaTower({
      height: 75,
      baseSize: 6,
      armLength: 24,
      position: new THREE.Vector3(-10, 0, -8)   // place near pad
    });
    this.scene.add(this.tower.group);

    // UI hooks
    const btn = document.getElementById('toggle-arms');
    const slider = document.getElementById('arm-height');
    if (btn) btn.addEventListener('click', () => this.tower.toggle());
    if (slider) slider.addEventListener('input', (e) => {
      const v = Number(e.target.value);
      this.tower.setCatcherHeight(v);
    });

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupWorld() {
    const terrain = createTerrain();
    this.scene.add(terrain);

    const skydome = createSkydome();
    this.scene.add(skydome);

    setupLighting(this.scene);

    this.scene.add(this.cameraRig.camera);
    this.cameraRig.camera.position.set(8, this.playerHeight, 18); // a nicer starting view
    this.cameraRig.lon = -140; // look roughly toward tower
    this.cameraRig.lat = -5;
  }

  handleControls(deltaTime) {
    const moveSpeed = 5 * deltaTime;
    if (this.joystick.isActive) {
      const forwardMovement = this.joystick.vertical;
      const strafeMovement = this.joystick.horizontal;

      const direction = new THREE.Vector3();
      this.cameraRig.camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      const strafeDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

      const moveVector = new THREE.Vector3();
      if (forwardMovement !== 0) moveVector.addScaledVector(direction, -forwardMovement * moveSpeed);
      if (strafeMovement !== 0) moveVector.addScaledVector(strafeDirection, -strafeMovement * moveSpeed);

      this.cameraRig.camera.position.add(moveVector);
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

    if (this.tower) this.tower.update(dt); // ⬅️ animate arms/height

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