// src/Game.js
import * as THREE from 'three';
import { BlockLibrary, BLOCK } from './Blocks.js';
import { VoxelWorld } from './VoxelWorld.js';
import { FirstPersonMobile } from './controls/FirstPersonMobile.js';
import { initHUD } from './ui/HUD.js';

export const Game = {
  async init({ modules, assetsBase, worldSize, minY, maxSky }) {
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Scene & camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101319);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, maxSky+100);
    camera.position.set(0, 2, 5);

    // Sky dome
    {
      const skyGeo = new THREE.SphereGeometry(maxSky, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          top:   { value: new THREE.Color(0x112131) },
          mid:   { value: new THREE.Color(0x0d1520) },
          bot:   { value: new THREE.Color(0x06080c) },
        },
        vertexShader: `
          varying vec3 vPos;
          void main(){
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vPos;
          uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
          void main(){
            float h = normalize(vPos).y * .5 + .5;
            vec3 c = mix(bot, mix(mid, top, smoothstep(0.5,1.0,h)), smoothstep(0.0,0.8,h));
            gl_FragColor = vec4(c,1.0);
          }
        `
      });
      const sky = new THREE.Mesh(skyGeo, skyMat);
      scene.add(sky);
    }

    // Lights
    {
      const hemi = new THREE.HemisphereLight(0xcfd8ff, 0x2b2a2a, 0.7);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(60, 120, 40);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.near = 1;
      dir.shadow.camera.far = 400;
      dir.shadow.camera.left = -80;
      dir.shadow.camera.right = 80;
      dir.shadow.camera.top = 80;
      dir.shadow.camera.bottom = -80;
      scene.add(dir);
    }

    // Blocks/materials
    const blockLib = new BlockLibrary(assetsBase);
    await blockLib.load();

    // World (chunked)
    const world = new VoxelWorld({ chunkSize: 16, heightMin: minY, heightMax: maxSky, worldSize });
    world.blockLib = blockLib; // provide materials
    world.seedFlat(scene, blockLib, worldSize);

    // Controls + HUD
    const hud = initHUD({
      onPlace: () => placeAtCrosshair(BLOCK_CURRENT),
      onDig:   () => digAtCrosshair(),
      onSelectBlock: id => { BLOCK_CURRENT = id; },
      currentBlockGetter: () => BLOCK_CURRENT,
    });
    const controls = new FirstPersonMobile(camera, renderer.domElement, { joy: document.getElementById('joy'), stick: document.getElementById('stick') });

    // Raycaster for place/dig
    const raycaster = new THREE.Raycaster();
    const mouseCenter = new THREE.Vector2(0,0);
    let BLOCK_CURRENT = BLOCK.CONCRETE; // default selection

    function digAtCrosshair() {
      const hit = raycastBlock();
      if (!hit) return;
      const { point, face, object } = hit;
      // find voxel coord for the block we hit
      const p = hitPointToVoxel(point, face, -0.001);
      world.setBlock(p.x, p.y, p.z, BLOCK.AIR, true);
    }

    function placeAtCrosshair(blockId) {
      const hit = raycastBlock();
      if (!hit) return;
      const { point, face } = hit;
      // place on the face outward
      const p = hitPointToVoxel(point, face, +0.501);
      // Bounds: stay inside 100x100 and within [-30..1000]
      const half = Math.floor(worldSize/2);
      if (p.x < -half || p.x >= half || p.z < -half || p.z >= half) return;
      if (p.y < minY || p.y > maxSky) return;
      world.setBlock(p.x, p.y, p.z, blockId, true);
    }

    function hitPointToVoxel(point, face, bias=0) {
      const n = face?.normal ?? new THREE.Vector3(0,1,0);
      const hit = new THREE.Vector3().copy(point).addScaledVector(n, bias);
      return new THREE.Vector3(
        Math.floor(hit.x + 0.5),
        Math.floor(hit.y + 0.5),
        Math.floor(hit.z + 0.5)
      );
    }

    function raycastBlock() {
      // Build a list of chunk meshes in scene (group children)
      const objs = [];
      for (const ch of world.chunks.values()) {
        for (const m of ch.meshes.values()) objs.push(m);
      }
      raycaster.setFromCamera(mouseCenter, camera);
      const hits = raycaster.intersectObjects(objs, false);
      return hits[0];
    }

    // Resize
    window.addEventListener('resize', ()=>{
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
    });

    // Main loop
    let last = performance.now();
    let frames = 0, acc = 0;
    function tick(now) {
      const dt = Math.min(0.05, (now - last)/1000); last = now;
      controls.update(dt);

      renderer.render(scene, camera);

      // fps
      frames++; acc += dt;
      if (acc >= 0.5) {
        const fps = Math.round(frames/acc);
        hud.setFPS(`${fps} fps`);
        frames = 0; acc = 0;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Optional: keep camera within world bounds horizontally
    const half = Math.floor(worldSize/2)-1;
    setInterval(()=>{
      camera.position.x = Math.max(-half, Math.min(half, camera.position.x));
      camera.position.z = Math.max(-half, Math.min(half, camera.position.z));
    }, 50);
  }
};