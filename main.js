import { createTerrain } from './Terrain.js';
import { createSkydome } from './Skydome.js';
import { setupLighting } from './Lighting.js';
import { CameraRig } from './Camera.js';
import { Joystick } from './Joystick.js';
import { Mechzilla } from './Mechzilla.js';

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

    // --- Mechzilla ---
    this.tower = new Mechzilla({});
    this.scene.add(this.tower.root);

    // UI wiring
    this.bindTowerUI();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  bindTowerUI() {
    const btnChop = document.getElementById('btn-chop');
    const btnBooster = document.getElementById('btn-booster');
    const btnShip = document.getElementById('btn-ship');

    const refreshLabels = () => {
      btnChop.textContent = this.tower.state.chopstickOpen ? 'Close Chopsticks' : 'Open Chopsticks';
      btnBooster.textContent = this.tower.state.boosterQDExtended ? 'Retract Booster QD' : 'Extend Booster QD';
      btnShip.textContent = this.tower.state.shipQDExtended ? 'Retract Ship QD' : 'Extend Ship QD';
    };

    btnChop.onclick = () => { this.tower.toggleChopsticks(); refreshLabels(); };
    btnBooster.onclick = () => { this.tower.toggleBoosterQD(); refreshLabels(); };
    btnShip.onclick = () => { this.tower.toggleShipQD(); refreshLabels(); };

    refreshLabels();
  }

  setupWorld() {
    const terrain = createTerrain();
    this.scene.add(terrain);

    const skydome = createSkydome();
    this.scene.add(skydome);

    setupLighting(this.scene);

    this.scene.add(this.cameraRig.camera);
    this.cameraRig.camera.position.set(0, this.playerHeight, 18); // start near the pad
    this.cameraRig.lon = 180; // look toward tower by default
  }

  handleControls(dt) {
    const moveSpeed = 5 * dt;

    if (this.joystick.isActive) {
      const forward = this.joystick.vertical;
      const strafe = this.joystick.horizontal;

      const dir = new THREE.Vector3();
      this.cameraRig.camera.getWorldDirection(dir);
      dir.y = 0; dir.normalize();
      const right = dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);

      const move = new THREE.Vector3();
      if (forward) move.addScaledVector(dir, -forward * moveSpeed);
      if (strafe)  move.addScaledVector(right, -strafe * moveSpeed);

      this.cameraRig.camera.position.add(move);
    }

    // keep camera on ground (plane)
    const terrain = this.scene.getObjectByName('terrain');
    if (terrain) {
      const rayOrigin = new THREE.Vector3(this.cameraRig.camera.position.x, 50, this.cameraRig.camera.position.z);
      this.raycaster.set(rayOrigin, new THREE.Vector3(0,-1,0));
      const isects = this.raycaster.intersectObject(terrain);
      if (isects.length) {
        const groundY = isects[0].point.y;
        this.cameraRig.camera.position.y = groundY + this.playerHeight;
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    this.handleControls(dt);
    this.tower.update(dt);
    this.cameraRig.update();

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