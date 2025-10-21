// main.js — minimal app bootstrap
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createRenderer } from './renderer.js';
import { createFPSCamera } from './camera.js';
import { createController } from './controller.js';
import { createTerrain } from './terrain.js';
import { createSky } from './sky.js';
import { setupLightingAndEnv } from './lighting.js';

const canvas = document.getElementById('c');

(async function start() {
  try {
    window.__LOADER?.setStatus?.('Init renderer…');
    const renderer = createRenderer(THREE, canvas);

    window.__LOADER?.setStatus?.('Create scene…');
    const scene = new THREE.Scene();

    window.__LOADER?.setStatus?.('Lighting & env…');
    const { pmremEnv } = setupLightingAndEnv(THREE, renderer, scene);

    window.__LOADER?.setStatus?.('Camera & controls…');
    const { camera, yaw, pitch } = createFPSCamera(THREE);
    const input = createController();

    window.__LOADER?.setStatus?.('Sky…');
    const sky = createSky(THREE);
    scene.add(sky);

    window.__LOADER?.setStatus?.('Terrain…');
    const terrain = createTerrain(THREE);
    scene.add(terrain);

    // place camera above terrain center
    yaw.position.set(25, 2, 25);

    // main loop
    let first = true, last = performance.now();
    (function tick(){
      requestAnimationFrame(tick);
      const now = performance.now(), dt = Math.min((now - last)/1000, 0.05); last = now;

      input.update(dt);
      // look
      const sens = 0.0022; // controller look speed
      yaw.rotation.y -= input.look.dx * sens;
      pitch.rotation.x -= input.look.dy * sens;
      pitch.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch.rotation.x));
      input.resetLook();

      // move (X/Z on ground plane)
      const speed = 5.0;
      const forward = -input.move.y;
      const strafe  =  input.move.x;

      const dir = new THREE.Vector3(0,0,-1).applyQuaternion(yaw.quaternion).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), dir).normalize();
      yaw.position.addScaledVector(dir, forward * speed * dt);
      yaw.position.addScaledVector(right, strafe  * speed * dt);

      // keep above terrain (simple raycast)
      {
        const ray = new THREE.Raycaster(new THREE.Vector3(yaw.position.x, 20, yaw.position.z), new THREE.Vector3(0,-1,0), 0, 40);
        const hit = ray.intersectObject(terrain, true)[0];
        const groundY = hit ? hit.point.y : 0;
        yaw.position.y += ((groundY + 1.6) - yaw.position.y) * 0.3;
      }

      renderer.render(scene, camera);

      if (first) {
        first = false;
        window.__LOADER?.appReady?.();
        window.dispatchEvent(new CustomEvent('world:first-frame'));
      }
    })();

    // resize
    addEventListener('resize', () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
    });

  } catch (e) {
    console.error('App failed:', e);
    throw e; // surfaces to loader
  }
})();