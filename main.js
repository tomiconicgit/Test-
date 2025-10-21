// main.js — minimal app bootstrap + menu + dig tool
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createRenderer } from './renderer.js';
import { createFPSCamera } from './camera.js';
import { createController } from './controller.js';
import { createTerrain } from './terrain.js';
import { createSky } from './sky.js';
import { setupLightingAndEnv } from './lighting.js';
import { createMenu } from './menu.js';
import { createDigTool } from './digtool.js';

const canvas = document.getElementById('c');

(async function start() {
  try {
    window.__LOADER?.setStatus?.('Init renderer…');
    const renderer = createRenderer(THREE, canvas);

    window.__LOADER?.setStatus?.('Create scene…');
    const scene = new THREE.Scene();

    window.__LOADER?.setStatus?.('Lighting & env…');
    setupLightingAndEnv(THREE, renderer, scene);

    window.__LOADER?.setStatus?.('Camera & controls…');
    const { camera, yaw, pitch } = createFPSCamera(THREE);
    const input = createController();
    scene.add(yaw); // IMPORTANT

    window.__LOADER?.setStatus?.('Sky…');
    scene.add(createSky(THREE));

    window.__LOADER?.setStatus?.('Terrain…');
    const terrain = createTerrain(THREE);
    scene.add(terrain);

    // spawn in the center of the terrain
    yaw.position.set(0, 2, 0);

    // UI: menu + dig tool
    const digTool = createDigTool(THREE, { scene, camera, terrain, input });
    createMenu({
      onDigTool: () => digTool.enable(),
    });

    // main loop
    let first = true, last = performance.now();
    (function tick(){
      requestAnimationFrame(tick);
      const now = performance.now(), dt = Math.min((now - last)/1000, 0.05); last = now;

      input.update(dt);

      // look
      const sens = 0.0022;
      yaw.rotation.y -= input.look.dx * sens;
      pitch.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch.rotation.x - input.look.dy * sens));
      input.resetLook();

      // move
      const speed = 5.0;
      const forward = -input.move.y;
      const strafe  =  input.move.x;
      const dir = new THREE.Vector3(0,0,-1).applyQuaternion(yaw.quaternion).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), dir).normalize();
      yaw.position.addScaledVector(dir, forward * speed * dt);
      yaw.position.addScaledVector(right, strafe  * speed * dt);

      // keep above terrain
      const ray = new THREE.Raycaster(new THREE.Vector3(yaw.position.x, 50, yaw.position.z), new THREE.Vector3(0,-1,0), 0, 100);
      const hit = ray.intersectObject(terrain, true)[0];
      const groundY = hit ? hit.point.y : 0;
      yaw.position.y += ((groundY + 1.6) - yaw.position.y) * 0.35;

      // tools
      if (digTool.active) digTool.update(dt);

      renderer.render(scene, camera);

      if (first) {
        first = false;
        window.__LOADER?.appReady?.();
        window.dispatchEvent(new CustomEvent('world:first-frame'));
      }
    })();

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