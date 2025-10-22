// buildtool.js — Truss Frame placement + texture picker + bottom-right HUD
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createTrussBay } from './structures/trussframe.js'; // ← fixed path

/* --- texture library + material loader ------------------ */
const TEX = {
  alloywall:   files('alloywall',   { ao:true,  height:true }),
  cement:      files('cement',      { roughness:true, height:true }),
  grate:       files('grate',       { ao:true,  height:true }),
  hexfloor:    files('hexfloor',    { ao:true,  roughness:true, height:true }),
  metal:       files('metal',       { ao:true,  height:true }),
  metalcubes:  files('metalcubes',  { ao:true,  height:true }),
  oiltubes:    files('oiltubes',    { ao:true,  roughness:true, height:true }),
  oldmetal:    files('oldmetal',    { ao:true,  height:true }),
  polishedtile:files('polishedtile',{ ao:true,  height:true }),
  rustymetal:  files('rustymetal',  { ao:true,  height:true }),
  spacepanels: files('spacepanels', { ao:true,  height:true, roughness:true }),
  techwall:    files('techwall',    { ao:true,  height:true, roughness:true }),
  vent:        files('vent',        { ao:true,  height:true }),
  ventslating: files('ventslating', { ao:true,  height:true })
};
function files(folder, opts={}) {
  const base = `assets/textures/${folder}/${folder}_`;
  return {
    name: folder,
    preview: `assets/textures/${folder}/${folder}_preview.jpg`,
    albedo:  `${base}albedo.png`,
    normal:  `${base}normal.png`,
    metal:   `${base}metallic.png`,
    rough:   opts.roughness ? `${base}roughness.png` : null,
    ao:      opts.ao ? (folder==='grate' ? `assets/textures/grate/grate.ao.png` : `${base}ao.png`) : null,
    height:  opts.height ? `${base}height.png` : null
  };
}
const MATERIAL_CACHE = new Map();
async function loadPBRMaterial(rec) {
  if (!rec) return null;
  if (MATERIAL_CACHE.has(rec.name)) return MATERIAL_CACHE.get(rec.name);
  const loader = new THREE.TextureLoader();
  function tex(url, color=false){
    return new Promise((res,rej)=>{
      loader.load(url, t=>{
        t.wrapS=t.wrapT=THREE.RepeatWrapping;
        t.anisotropy=4;
        t.colorSpace = color ? THREE.SRGBColorSpace : (THREE.LinearSRGBColorSpace || THREE.NoColorSpace);
        res(t);
      },undefined,rej);
    });
  }
  const m = new THREE.MeshStandardMaterial({ color:0xffffff, metalness:0.3, roughness:0.6, side:THREE.DoubleSide });
  const tasks=[];
  if (rec.albedo) tasks.push(tex(rec.albedo,true).then(t=>m.map=t));
  if (rec.normal) tasks.push(tex(rec.normal).then(t=>m.normalMap=t));
  if (rec.metal)  tasks.push(tex(rec.metal).then(t=> (m.metalnessMap=t, m.metalness=1)));
  if (rec.rough)  tasks.push(tex(rec.rough).then(t=> (m.roughnessMap=t, m.roughness=1)));
  if (rec.ao)     tasks.push(tex(rec.ao).then(t=> (m.aoMap=t)));
  await Promise.allSettled(tasks);
  MATERIAL_CACHE.set(rec.name, m);
  return m;
}
/* ------------------------------------------------------------------------ */

export function createBuildTool(THREE_NS, { scene, camera, input, terrain, terrainHeightAt }) {
  const EPS = 0.0005;

  const tool = {
    active:false,
    // UI
    assetsPanel:null, assetsBtn:null,
    texPanel:null,   texBtn:null,
    closeBtn:null,
    // HUD
    hud:null, btnPlace:null, btnRemove:null, btnFlip:null, btnRotate:null,
    // placement
    ghost:null, currentAsset:'TRUSS', placed:[],
    standUp:false, yawDeg:0,
    // textures
    activeTexKey:null, activeMaterial:null,
  };

  /* ----------------------------- UI ------------------------------------- */
  function ensureUI() {
    if (tool.closeBtn) return;

    // Buttons
    const close = button('build-close','×','Close Build Tool',()=>tool.disable());
    const texBtn = iconBtn('build-textures', iconLayers(), 'Textures', ()=>togglePanel('tex'));
    const assetsBtn = iconBtn('build-assets', iconGrid(), 'Assets', ()=>togglePanel('assets'));
    texBtn.style.display = assetsBtn.style.display = close.style.display = 'none';

    // Panels
    const aPanel = document.createElement('div');
    aPanel.id='build-panel'; aPanel.style.display='none';
    aPanel.innerHTML = `<div class="entry" data-type="TRUSS">Truss Frame</div>`;

    const tPanel = document.createElement('div');
    tPanel.id='tex-panel'; tPanel.style.display='none';
    tPanel.innerHTML = buildTextureListHTML();

    // HUD
    const hud = document.createElement('div');
    hud.id='build-hud'; hud.style.display='none';
    hud.innerHTML = `
      <button class="hud-btn" id="bt-place">Place</button>
      <button class="hud-btn" id="bt-remove">Remove</button>
      <button class="hud-btn" id="bt-flip">Flip V/H</button>
      <button class="hud-btn" id="bt-rot">Rotate 45°</button>
    `;

    document.body.append(close, texBtn, assetsBtn, aPanel, tPanel, hud);
    injectCSS();

    function togglePanel(which){
      if (which==='assets'){ aPanel.style.display = aPanel.style.display==='none' ? 'block':'none'; tPanel.style.display='none'; }
      else { tPanel.style.display = tPanel.style.display==='none' ? 'block':'none'; aPanel.style.display='none'; }
    }

    aPanel.addEventListener('click', (e)=>{
      const div = e.target.closest('.entry');
      if (!div) return;
      tool.currentAsset = div.dataset.type; // only TRUSS for now
      ensureGhost();
      aPanel.style.display='none';
    });

    tPanel.addEventListener('click', async (e)=>{
      const row = e.target.closest('.tex');
      if (!row) return;
      tool.activeTexKey = row.dataset.key;
      tool.activeMaterial = await loadPBRMaterial(TEX[tool.activeTexKey]);
      row.style.outline='2px solid rgba(110,176,255,.8)'; setTimeout(()=>row.style.outline='',220);
      tPanel.style.display='none';
    });

    hud.querySelector('#bt-place').addEventListener('click', placeCurrent);
    hud.querySelector('#bt-remove').addEventListener('click', ()=>{
      const rc = new THREE.Raycaster(); rc.setFromCamera({x:0,y:0}, camera); tryRemoveAtRay(rc);
    });
    hud.querySelector('#bt-flip').addEventListener('click', ()=>{ tool.standUp=!tool.standUp; syncGhostRotation(); });
    hud.querySelector('#bt-rot').addEventListener('click', ()=>{ tool.yawDeg=(tool.yawDeg+45)%360; syncGhostRotation(); });

    tool.closeBtn=close; tool.assetsBtn=assetsBtn; tool.assetsPanel=aPanel;
    tool.texBtn=texBtn;  tool.texPanel=tPanel;
    tool.hud=hud;
  }

  function button(id,text,title,onClick){
    const b=document.createElement('button'); b.id=id; b.textContent=text; b.title=title; b.addEventListener('click',onClick); return b;
  }
  function iconBtn(id,svg,title,onClick){
    const b=document.createElement('button'); b.id=id; b.innerHTML=svg; b.title=title; b.addEventListener('click',onClick); return b;
  }
  function iconGrid(){
    return `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/>
      <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/></svg>`;
  }
  function iconLayers(){
    return `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4l8 4-8 4-8-4 8-4zm0 6.5l8 4-8 4-8-4 8-4z" fill="currentColor"/></svg>`;
  }
  function buildTextureListHTML(){
    return Object.keys(TEX).map(k=>{
      const r=TEX[k];
      return `<div class="tex" data-key="${k}">
        <img src="${r.preview}" alt="${k}"/>
        <div style="display:flex;flex-direction:column">
          <div style="font-weight:800;text-transform:capitalize">${k}</div>
          <div style="opacity:.7;font-size:12px">albedo/normal/metal${r.rough?'/rough':''}${r.ao?'/ao':''}</div>
        </div>
      </div>`;
    }).join('');
  }
  function injectCSS(){
    const css=document.createElement('style');
    css.textContent=`
      #build-close{
        position:fixed;top:16px;right:16px;z-index:1000;width:42px;height:42px;
        border-radius:10px;border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;
        font-size:22px;line-height:22px;font-weight:900;display:grid;place-items:center;
      }
      #build-assets,#build-textures{
        position:fixed;top:16px;z-index:1000;width:42px;height:42px;
        border-radius:10px;border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;display:grid;place-items:center;
      }
      #build-assets{ right:66px; }
      #build-textures{ right:116px; }

      #build-panel,#tex-panel{
        position:fixed;top:66px;right:16px;z-index:1000;min-width:220px;
        border-radius:12px;border:1px solid rgba(255,255,255,.18);
        background:rgba(20,22,25,.94);backdrop-filter:blur(10px);
        padding:8px;display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow:auto;
      }
      #build-panel .entry,#tex-panel .tex{
        padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);
        background:rgba(35,37,41,.9);color:#eaeaea;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:10px;
      }
      #tex-panel .tex img{ width:36px;height:36px;border-radius:6px;object-fit:cover;flex:0 0 auto;border:1px solid rgba(255,255,255,.15); }
      #build-panel .entry:hover,#tex-panel .tex:hover{ background:rgba(60,62,66,.9); }

      #build-hud{
        position:fixed; right:16px; bottom:16px; z-index:1000;
        display:grid; grid-template-columns:1fr 1fr; gap:8px; width:250px;
      }
      .hud-btn{
        padding:12px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.65); color:#eaeaea; font-weight:700;
        backdrop-filter: blur(8px);
        touch-action: manipulation;
      }
      .hud-btn:active{ transform: translateY(1px); }
    `;
    document.head.appendChild(css);
  }

  /* --------------------------- Ghost (group) ----------------------------- */
  function ensureGhost(){
    if (tool.ghost) return;
    // build a translucent clone of a default truss for preview
    const ghost = createTrussBay({ w:12, d:12, h:6, t:0.5, wire:false });
    ghost.traverse(o=>{
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({
          color:0x7fb3ff, transparent:true, opacity:0.35,
          roughness:0.6, metalness:0.0, depthWrite:false, side:THREE.DoubleSide
        });
        o.renderOrder = 999;
      }
    });
    ghost.visible=false;
    scene.add(ghost);
    tool.ghost = ghost;
  }
  function syncGhostRotation(){
    if (!tool.ghost) return;
    tool.ghost.rotation.set(0, THREE.MathUtils.degToRad(tool.yawDeg), 0);
    if (tool.standUp) tool.ghost.rotation.x = Math.PI/2;
  }

  /* ---------------------------- Public API -------------------------------- */
  tool.enable=()=>{ 
    tool.active=true; ensureUI(); ensureGhost();
    tool.closeBtn.style.display='grid';
    tool.assetsBtn.style.display='grid';
    tool.texBtn.style.display='grid';
    tool.hud.style.display='grid';
  };
  tool.disable=()=>{ 
    tool.active=false;
    if (tool.ghost) tool.ghost.visible=false;
    for (const el of [tool.closeBtn,tool.assetsBtn,tool.texBtn,tool.assetsPanel,tool.texPanel,tool.hud]) {
      if (el) el.style.display='none';
    }
  };

  tool.update=(dt)=>{
    if (!tool.active) return;

    if (input.l1Pressed){ tool.standUp=!tool.standUp; syncGhostRotation(); }
    if (input.r1Pressed){ tool.yawDeg=(tool.yawDeg+45)%360; syncGhostRotation(); }

    // snap to terrain center tiles
    const rc=new THREE.Raycaster();
    rc.setFromCamera({x:0,y:0}, camera);
    const hit=terrain ? rc.intersectObject(terrain,false)[0] : null;

    if (hit){
      const gx = Math.round(hit.point.x);
      const gz = Math.round(hit.point.z);
      const baseY = typeof terrainHeightAt==='function' ? terrainHeightAt(gx,gz) : hit.point.y;
      ensureGhost();
      tool.ghost.visible=true;
      tool.ghost.position.set(gx, baseY+EPS, gz);
      syncGhostRotation();

      if (input.r2Pressed) placeCurrent();
    } else if (tool.ghost) {
      tool.ghost.visible=false;
    }

    // removal
    if (input.l2Pressed){
      const r2=new THREE.Raycaster(); r2.setFromCamera({x:0,y:0}, camera);
      tryRemoveAtRay(r2);
    }
  };

  /* -------------------------- Place / Remove ------------------------------ */
  function placeCurrent(){
    if (!tool.active || !tool.ghost || !tool.ghost.visible) return;

    const g = createTrussBay({ w:12, d:12, h:6, t:0.5, wire:false });
    // apply active material (if any) to all meshes
    if (tool.activeMaterial){
      g.traverse(o=>{
        if (o.isMesh){
          // clone per-mesh so edits don’t leak
          o.material = tool.activeMaterial.clone();
          // ensure AO works if present
          if (o.material.aoMap && o.geometry && !o.geometry.getAttribute('uv2')) {
            const uv = o.geometry.getAttribute('uv');
            if (uv) o.geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(0), 2));
          }
        }
      });
    }
    g.position.copy(tool.ghost.position);
    g.rotation.copy(tool.ghost.rotation);
    scene.add(g);
    tool.placed.push(g);
  }

  function tryRemoveAtRay(raycaster){
    const meshes=[];
    for (const g of tool.placed) g.traverse(o=>{ if (o.isMesh) meshes.push(o); });
    const hits=raycaster.intersectObjects(meshes,false);
    if (hits.length){
      const mesh = hits[0].object;
      // find root placed group
      const root = tool.placed.find(g => mesh === g || g.children.includes(mesh) || g.children.includes(mesh.parent));
      if (root){
        tool.placed = tool.placed.filter(x=>x!==root);
        root.traverse(o=>{
          if (o.isMesh){ o.geometry?.dispose?.(); o.material?.dispose?.(); }
        });
        root.removeFromParent();
      }
    }
  }

  return tool;
}