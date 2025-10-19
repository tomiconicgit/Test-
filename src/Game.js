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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Scene / Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1218);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.05, maxSky+200);
    // The camera's starting position is now set explicitly in the controller options below.

    // Sky
    {
      const skyGeo = new THREE.SphereGeometry(maxSky, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          top: { value: new THREE.Color(0x1a2a44) },
          mid: { value: new THREE.Color(0x112033) },
          bot: { value: new THREE.Color(0x070b12) },
        },
        vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vPos; uniform vec3 top,mid,bot;
          void main(){
            float h = normalize(vPos).y * 0.5 + 0.5;
            vec3 c = mix(bot, mix(mid, top, smoothstep(0.4,1.0,h)), smoothstep(0.0,0.8,h));
            gl_FragColor = vec4(c,1.0);
          }`
      });
      scene.add(new THREE.Mesh(skyGeo, skyMat));
    }

    // Lights
    const hemi = new THREE.HemisphereLight(0xcfd8ff, 0x2b2a2a, 0.85); scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(60,120,40); dir.castShadow=true;
    dir.shadow.mapSize.set(1024,1024); dir.shadow.camera.near=1; dir.shadow.camera.far=400;
    dir.shadow.camera.left=-80; dir.shadow.camera.right=80; dir.shadow.camera.top=80; dir.shadow.camera.bottom=-80;
    scene.add(dir);

    // Optional helpers (visual sanity)
    scene.add(new THREE.GridHelper(worldSize, worldSize, 0x334d66, 0x223344));

    // Materials
    const blockLib = new BlockLibrary(assetsBase);
    try { await blockLib.load(); } catch(e){ logErr('[assets] '+(e?.message||e)); }

    // Voxel world
    const world = new VoxelWorld({ chunkSize:16, heightMin:minY, heightMax:maxSky, worldSize });
    world.blockLib = blockLib;
    world.seedFlat(scene, blockLib, worldSize);

    // Count meshed content
    let chunkMeshCount=0; for (const ch of world.chunks.values()) chunkMeshCount += ch.meshes.size;

    // Guaranteed fallback floor if meshing yielded nothing
    let fallbackFloor=null;
    if(chunkMeshCount===0){
      const floorGeo=new THREE.PlaneGeometry(worldSize,worldSize,1,1);
      floorGeo.rotateX(-Math.PI/2);
      const floorMat=new THREE.MeshStandardMaterial({ color:0x9ea3aa, roughness:0.85, metalness:0.0 });
      fallbackFloor=new THREE.Mesh(floorGeo,floorMat);
      fallbackFloor.name='fallbackFloor';
      fallbackFloor.receiveShadow=true;
      scene.add(fallbackFloor);
      logErr('[safe] fallback 100×100 floor active.');
    }

    // HUD
    const hud = initHUD({
      onPlace: ()=>placeAtCrosshair(BLOCK_CURRENT),
      onDig:   ()=>digAtCrosshair(),
      onSelectBlock: id => { BLOCK_CURRENT=id; }
    });

    // Controls
    const controls = new FirstPersonMobile(
      camera, renderer.domElement,
      { joy: document.getElementById('joy'), stick: document.getElementById('stick') },
      { 
        eyeHeight: 1.8, 
        gravity: -22, 
        jumpSpeed: 7.5,
        spawn: new THREE.Vector3(0, 5, 8) // Explicitly set a safe spawn point
      }
    );

    // Collision & bounds
    const raycaster = new THREE.Raycaster();
    controls.setCollision({
      raycaster,
      getMeshes:()=>{
        const list=[];
        for(const ch of world.chunks.values()) for(const m of ch.meshes.values()) list.push(m);
        if(fallbackFloor) list.push(fallbackFloor);
        return list;
      }
    });
    const half=Math.floor(worldSize/2)-1;
    controls.setBounds({ minX:-half, maxX:half, minZ:-half, maxZ:half, minY:minY, maxY:maxSky-1 });

    // Place / Dig via center ray
    const mouseCenter=new THREE.Vector2(0,0);
    let BLOCK_CURRENT = BLOCK.CONCRETE;

    function raycastBlock(){
      const objs = controls.collision?.getMeshes?.() ?? [];
      raycaster.setFromCamera(mouseCenter,camera);
      const hits = raycaster.intersectObjects(objs,false);
      return hits[0];
    }
    function hitPointToVoxel(point, face, bias=0){
      const n = face?.normal ?? new THREE.Vector3(0,1,0);
      const hit = new THREE.Vector3().copy(point).addScaledVector(n,bias);
      return new THREE.Vector3(
        Math.floor(hit.x+0.5),
        Math.floor(hit.y+0.5),
        Math.floor(hit.z+0.5)
      );
    }
    function digAtCrosshair(){
      const hit=raycastBlock(); if(!hit || hit.object===fallbackFloor) return;
      const p=hitPointToVoxel(hit.point, hit.face, -0.001);
      world.setBlock(p.x,p.y,p.z, BLOCK.AIR, true);
    }
    function placeAtCrosshair(blockId){
      const hit=raycastBlock(); if(!hit) return;
      const p=hitPointToVoxel(hit.point, hit.face, +0.501);
      if(p.x<-half||p.x>=half||p.z<-half||p.z>=half) return;
      if(p.y<minY||p.y>maxSky) return;
      world.setBlock(p.x,p.y,p.z, blockId, true);
    }

    // Resize
    window.addEventListener('resize', ()=>{
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
    });

    // Main loop
    let last=performance.now(), frames=0, acc=0;
    function tick(now){
      const dt=Math.min(0.05,(now-last)/1000); last=now;
      controls.update(dt);
      renderer.render(scene,camera);
      frames++; acc+=dt; if(acc>=0.5){ hud.setFPS(`${Math.round(frames/acc)} fps`); frames=0; acc=0; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function logErr(m){
      const box=document.getElementById('err'); if(!box) return;
      box.style.display='block'; box.textContent+=String(m)+'\n';
    }
  }
};
