import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { makeMaterials } from './engine/Materials.js';
import { VoxelWorld } from './engine/VoxelWorld.js';
import { Joystick } from './ui/Joystick.js';
import { InputController } from './engine/inputController.js';
import { Player } from './engine/player.js';
import { PlacementController } from './engine/placement.js';
import { LightingControls } from './ui/lightingcontrols.js';

// Geometries
import { createBlockGeometry } from './engine/structures/block.js';
import { createWallGeometry } from './engine/structures/wall.js';
import { createFloorGeometry } from './engine/structures/floor.js';
import { createGlassPaneGeometry } from './engine/structures/glass.js';
import { createSlopeGeometry } from './engine/structures/slope.js';
import { createCylinderGeometry } from './engine/structures/cylinder.js';
import { createPipeStraightGeometry, createPipeElbowGeometry } from './engine/structures/pipe.js';

const canvas = document.getElementById('c');
let renderer, scene, camera, materials, propGeometries, input, player, placement, world;

async function initializeApp() {
  try {
    window.__LOADER?.setStatus?.('Init renderer…');

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xa7c4ff, 80, 300);
    const SKY = 0x87b4ff;
    renderer.setClearColor(SKY, 1.0);
    scene.background = new THREE.Color(SKY);

    window.__LOADER?.setStatus?.('Build environment…');
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x8a8f96, side: THREE.BackSide })
    );
    envScene.add(room);
    const neutralEnv = pmrem.fromScene(envScene).texture;
    scene.environment = neutralEnv;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(90, innerWidth / innerHeight, 0.1, 1000);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(100, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;  sun.shadow.camera.bottom = -80;
    scene.add(sun);
    const ambient = new THREE.AmbientLight(0xffffff, 0.2); scene.add(ambient);

    window.__LOADER?.setStatus?.('Load materials…');
    materials = await makeMaterials();
    window.__LOADER?.done?.();

    propGeometries = {
      BLOCK: createBlockGeometry(),
      WALL: createWallGeometry(),
      PANE: createGlassPaneGeometry(),
      FLOOR: createFloorGeometry(),
      SLOPE: createSlopeGeometry(),
      CYLINDER: createCylinderGeometry(),
      PIPE_STRAIGHT: createPipeStraightGeometry(),
      PIPE_ELBOW: createPipeElbowGeometry(),
    };

    window.__LOADER?.setStatus?.('Start world…');
    input = new InputController(new Joystick(document.getElementById('joystick')));
    player = new Player(scene, camera);
    placement = new PlacementController(scene, camera, propGeometries, materials);
    world = new VoxelWorld(THREE, materials, { scene, sizeX: 100, sizeZ: 100, minY: -30, maxY: 500 });
    world.rebuildAll();

    new LightingControls({ renderer, ambientLight: ambient, hemisphereLight: hemi, directionalLight: sun, materials, world });

    let activeItem = 'VOXEL';
    let activeMaterial = materials.metal;
    let activeScale = 1.0;

    document.getElementById('itemPicker').addEventListener('change', e => { activeItem = e.target.value; });
    document.getElementById('texturePicker').addEventListener('change', e => { activeMaterial = materials[e.target.value] || materials.metal; });

    const scaleButtons = document.querySelectorAll('.scaleBtn');
    scaleButtons.forEach(button => {
      button.addEventListener('click', () => {
        scaleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        activeScale = parseFloat(button.dataset.scale);
      });
    });

    document.getElementById('btnPlace').addEventListener('click', () => placement.place(world, activeItem, activeMaterial, activeScale));
    document.getElementById('btnRemove').addEventListener('click', () => placement.remove(world));
    document.getElementById('btnSave').addEventListener('click', () => {
      try {
        const worldData = world.serialize();
        const blob = new Blob([worldData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'world.json'; a.click();
        URL.revokeObjectURL(url);
      } catch { alert("Could not save world data."); }
    });
    const loadFileInput = document.getElementById('loadFile');
    document.getElementById('btnLoad').addEventListener('click', () => loadFileInput.click());
    loadFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => { try { world.deserialize(e.target.result, propGeometries); } catch { alert("Error loading world file."); } };
      reader.readAsText(file);
      event.target.value = null;
    });

    window.__LOADER?.setStatus?.('Render…');

    // --- Signal loader ONLY after the first frame is drawn ---
    let firstFrameSignaled = false;

    let lastT = performance.now();
    function tick() {
      requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;

      input.update(dt);
      player.update(dt, input, world);
      placement.update(world, player, activeItem, activeMaterial, activeScale, input);

      if (input.place) placement.place(world, activeItem, activeMaterial, activeScale);
      if (input.remove) placement.remove(world);
      if (input.rotate) placement.rotate(world);

      renderer.render(scene, camera);

      if (!firstFrameSignaled) {
        firstFrameSignaled = true;
        // Either call the API…
        window.__LOADER?.appReady?.();
        // …and also emit an event for completeness:
        window.dispatchEvent(new CustomEvent('world:first-frame'));
      }
    }
    tick();

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

  } catch (error) {
    console.error("Initialization failed:", error);
    throw error; // loader shows error UI
  }
}

initializeApp();