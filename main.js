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

    // === Fresh Mechzilla base (30x30) + four 4x4x60 corner beams
    this.tower = new MechzillaTower({
      baseSize: 30,
      baseThickness: 1,
      beamSize: 4,
      beamHeight: 60
    });
    this.tower.addTo(this.scene);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupWorld() {
    const terrain = createTerrain(); this.scene.add(terrain);
    const skydome = createSkydome(); this.scene.add(skydome);
    setupLighting(this.scene);

    // Camera start
    this.scene.add(this.cameraRig.camera);
    this.cameraRig.camera.position.set(42, this.playerHeight + 6, 42);
    this.cameraRig.lon = -135; // look toward origin (tower sits at 0,0,0)
    this.cameraRig.lat = -6;
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

    // Keep camera at terrain height
    const terrain = this.scene.getObjectByName("terrain");
    if (terrain) {
      const rayOrigin = new THREE.Vector3(
        this.cameraRig.camera.position.x, 50, this.cameraRig.camera.position.z
      );
      this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
      const hits = this.raycaster.intersectObject(terrain);
      if (hits.length > 0) {
        this.cameraRig.camera.position.y = hits[0].point.y + this.playerHeight;
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    this.handleControls(dt);
    this.cameraRig.update();

    if (this.tower && this.tower.update) this.tower.update(dt);

    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  if (screen.orientation?.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
  }
  new Game();
});