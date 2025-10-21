// buildtool.js — Ramp placement + texture picker + bottom-right HUD
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createRampGeometry } from './structures/ramp.js';

/* ------------------------------------------------------------------------- */
/* PBR texture library (from your /assets/textures/* folders)                */
/* Each entry: albedo (sRGB), normal (linear), metalness (linear),           */
/* optional: roughness (linear), ao (linear), height (linear, not applied)   */
/* ------------------------------------------------------------------------- */
const TEX = {
  alloywall:   files('alloywall',   { ao:true,  height:true }),
  cement:      files('cement',      { roughness:true, height:true }),
  grate:       files('grate',       { ao:true,  height:true }),
  hexfloor:    files('hexfloor',    { ao:true,  roughness:true, height:true }),
  metal:       files('metal',       { ao:true,  height:true }),
  metalcubes:  files('metalcubes',  { ao:true,  height:true }),
  oiltubes:    files('oiltubes',    { ao:true,  roughness:true, height:true }),
  oldmetal:    files('oldmetal',    { ao:true,  height:true }),
  polishedtile:files('polishedtile',{ ao:true,  height:true, roughness:false /* has metallic2; ignore */ }),
  rustymetal:  files('rustymetal',  { ao:true,  height:true }),
  spacepanels: files('spacepanels', { ao:true,  height:true, roughness:true }),
  techwall:    files('techwall',    { ao:true,  height:true, roughness:true }),
  vent:        files('vent',        { ao:true,  height:true }),
  ventslating: files('ventslating', { ao:true,  height:true })
};

// helper to build expected filenames from a folder name
function files(folder, opts={}) {
  const base = `assets/textures/${folder}/${folder}_`;
  const f = {
    name: folder,
    preview: `assets/textures/${folder}/${folder}_preview.jpg`,
    albedo:  `${base}albedo.png`,
    normal:  `${base}normal.png`,
    metal:   `${base}metallic.png`,
    rough:   opts.roughness ? `${base}roughness.png` : null,
    ao:      opts.ao ? `${base}ao.png` : (folder==='grate' ? `assets/textures/grate/grate.ao.png` : null),
    height:  opts.height ? `${base}height.png` : null
  };
  // polishedtile has "_metallic2.png" but we’ll just use the normal one if provided.
  if (folder === 'polishedtile') {
    f.metal2 = `${base}metallic2.png`;
  }
  return f;
}

/* Cache for loaded materials (keyed by texture set name) */
const MATERIAL_CACHE = new Map();

/* Create a MeshStandardMaterial from a texture record */
async function loadPBRMaterial(rec, renderer) {
  if (!rec) return null;
  if (MATERIAL_CACHE.has(rec.name)) return MATERIAL_CACHE.get(rec.name);

  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.6,
    side: THREE.DoubleSide,     // keep all faces visible (fixes “missing faces”)
  });

  const loader = new THREE.TextureLoader();
  const pmrem = renderer ? new THREE.PMREMGenerator(renderer) : null;

  const tasks = [];

  function tex(url, isColor=false) {
    return new Promise((res, rej) => {
      loader.load(url, (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 4;
        if (isColor) t.colorSpace = THREE.SRGBColorSpace;
        else t.colorSpace = THREE.LinearSRGBColorSpace || THREE.NoColorSpace;
        res(t);
      }, undefined, rej);
    });
  }

  if (rec.albedo)  tasks.push(tex(rec.albedo, true).then(t => (m.map = t)));
  if (rec.normal)  tasks.push(tex(rec.normal).then(t => (m.normalMap = t)));
  if (rec.metal)   tasks.push(tex(rec.metal).then(t => (m.metalnessMap = t, m.metalness = 1.0)));
  if (rec.rough)   tasks.push(tex(rec.rough).then(t => (m.roughnessMap = t, m.roughness = 1.0)));
  if (rec.ao)      tasks.push(tex(rec.ao).then(t => (m.aoMap = t)));
  // height map not applied by default (displacement needs adequate tessellation)
  // if (rec.height) tasks.push(tex(rec.height).then(t => (m.displacementMap = t, m.displacementScale = 0.02)));

  await Promise.allSettled(tasks);

  // default knobs if maps missing
  if (!m.metalnessMap) m.metalness = 0.2;
  if (!m.roughnessMap) m.roughness = 0.6;

  // uv2 for AO if present (geometry must have uv2; our ramp does)
  if (m.aoMap) m.aoMapIntensity = 1.0;

  MATERIAL_CACHE.set(rec.name, m);
  return m;
}

/* ------------------------------------------------------------------------- */

export function createBuildTool(THREE_NS, { scene, camera, input, terrain, terrainHeightAt, renderer }) {
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
    ghost:null, currentAsset:'RAMP', assetGeos:{}, placed:[],
    standUp:false, yawDeg:0,
    // textures
    activeTexKey:null, activeMaterial:null,
  };

  /* ----------------------------- UI ------------------------------------- */
  function ensureUI() {
    if (tool.closeBtn) return;

    // Close (X)
    const close = document.createElement('button');
    close.id = 'build-close';
    close.textContent = '×';
    close.title = 'Close Build Tool';
    close.style.display = 'none';
    close.addEventListener('click', () => tool.disable());

    // Textures button (to the LEFT of Assets)
    const texBtn = document.createElement('button');
    texBtn.id = 'build-textures';
    texBtn.innerHTML = iconLayers();
    texBtn.title = 'Textures';
    texBtn.style.display = 'none';

    // Assets button
    const assetsBtn = document.createElement('button');
    assetsBtn.id = 'build-assets';
    assetsBtn.innerHTML = iconGrid();
    assetsBtn.title = 'Assets';
    assetsBtn.style.display = 'none';

    // Assets panel
    const aPanel = document.createElement('div');
    aPanel.id = 'build-panel';
    aPanel.style.display = 'none';
    aPanel.innerHTML = `<div class="entry" data-type="RAMP">Ramp</div>`;

    // Textures panel
    const tPanel = document.createElement('div');
    tPanel.id = 'tex-panel';
    tPanel.style.display = 'none';
    tPanel.innerHTML = buildTextureListHTML();

    // HUD (bottom-right)
    const hud = document.createElement('div');
    hud.id = 'build-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <button class="hud-btn" id="bt-place">Place</button>
      <button class="hud-btn" id="bt-remove">Remove</button>
      <button class="hud-btn" id="bt-flip">Flip V/H</button>
      <button class="hud-btn" id="bt-rot">Rotate 45°</button>
    `;

    document.body.append(close, texBtn, assetsBtn, aPanel, tPanel, hud);

    const css = document.createElement('style');
    css.textContent = `
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
      #tex-panel .tex img{
        width:36px;height:36px;border-radius:6px;object-fit:cover;flex:0 0 auto;border:1px solid rgba(255,255,255,.15);
      }
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

    // Events
    assetsBtn.addEventListener('click', () => {
      aPanel.style.display = aPanel.style.display === 'none' ? 'block' : 'none';
      tPanel.style.display = 'none';
    });
    texBtn.addEventListener('click', () => {
      tPanel.style.display = tPanel.style.display === 'none' ? 'block' : 'none';
      aPanel.style.display = 'none';
    });

    aPanel.addEventListener('click', (e) => {
      const div = e.target.closest('.entry');
      if (!div) return;
      setActiveAsset(div.dataset.type);
      aPanel.style.display = 'none';
    });

    tPanel.addEventListener('click', async (e) => {
      const row = e.target.closest('.tex');
      if (!row) return;
      tool.activeTexKey = row.dataset.key;
      // Lazy-load & cache a PBR material for this texture
      tool.activeMaterial = await loadPBRMaterial(TEX[tool.activeTexKey], renderer);
      // give user a tiny visual acknowledgment
      row.style.outline = '2px solid rgba(110,176,255,.8)';
      setTimeout(()=>row.style.outline='', 220);
      tPanel.style.display = 'none';
    });

    // HUD events
    hud.querySelector('#bt-place').addEventListener('click', () => placeCurrent());
    hud.querySelector('#bt-remove').addEventListener('click', () => {
      const rc = new THREE.Raycaster(); rc.setFromCamera({x:0,y:0}, camera); tryRemoveAtRay(rc);
    });
    hud.querySelector('#bt-flip').addEventListener('click', () => { tool.standUp = !tool.standUp; syncGhostRotation(); });
    hud.querySelector('#bt-rot').addEventListener('click', () => { tool.yawDeg = (tool.yawDeg + 45) % 360; syncGhostRotation(); });

    tool.closeBtn = close;
    tool.assetsBtn = assetsBtn;
    tool.assetsPanel = aPanel;
    tool.texBtn = texBtn;
    tool.texPanel = tPanel;
    tool.hud = hud;
    tool.btnPlace = hud.querySelector('#bt-place');
    tool.btnRemove = hud.querySelector('#bt-remove');
    tool.btnFlip = hud.querySelector('#bt-flip');
    tool.btnRotate = hud.querySelector('#bt-rot');
  }

  function buildTextureListHTML() {
    const keys = Object.keys(TEX);
    return keys.map(k => {
      const rec = TEX[k];
      return `<div class="tex" data-key="${k}">
        <img src="${rec.preview}" alt="${k}"/>
        <div style="display:flex;flex-direction:column">
          <div style="font-weight:800;text-transform:capitalize">${k.replace(/([a-z])([A-Z])/g,'$1 $2')}</div>
          <div style="opacity:.7;font-size:12px">albedo/normal/metal${rec.rough?'/rough':''}${rec.ao?'/ao':''}</div>
        </div>
      </div>`;
    }).join('');
  }

  function iconGrid(){
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/>
        <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/>
        <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/>
        <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/>
      </svg>`;
  }
  function iconLayers(){
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l8 4-8 4-8-4 8-4zm0 6.5l8 4-8 4-8-4 8-4z" fill="currentColor"/>
      </svg>`;
  }

  /* ---------------------------- Asset/Ghost ------------------------------- */
  function ensureGeos() {
    if (!tool.assetGeos.RAMP) tool.assetGeos.RAMP = createRampGeometry();
  }
  function ensureGhost() {
    ensureGeos();
    if (!tool.ghost) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7fb3ff, transparent:true, opacity:0.35,
        roughness:0.6, metalness:0.0, depthWrite:false, side:THREE.DoubleSide
      });
      tool.ghost = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      tool.ghost.renderOrder = 999;
      scene.add(tool.ghost);
    }
    tool.ghost.geometry = tool.assetGeos[tool.currentAsset];
    tool.ghost.visible = tool.active;
    tool.ghost.rotation.set(0,0,0);
    tool.standUp = false;
    tool.yawDeg = 0;
  }
  function syncGhostRotation() {
    if (!tool.ghost) return;
    tool.ghost.rotation.set(0, THREE.MathUtils.degToRad(tool.yawDeg), 0);
    if (tool.standUp) tool.ghost.rotation.x = Math.PI / 2;
  }
  function setActiveAsset(type) {
    tool.currentAsset = type;
    ensureGhost();
  }

  /* ---------------------------- Public API -------------------------------- */
  tool.enable = () => {
    tool.active = true;
    ensureUI();
    ensureGhost();
    tool.closeBtn.style.display = 'grid';
    tool.assetsBtn.style.display = 'grid';
    tool.texBtn.style.display = 'grid';
    tool.hud.style.display = 'grid';
  };

  tool.disable = () => {
    tool.active = false;
    if (tool.ghost) tool.ghost.visible = false;
    if (tool.closeBtn)  tool.closeBtn.style.display = 'none';
    if (tool.assetsBtn) tool.assetsBtn.style.display = 'none';
    if (tool.texBtn)    tool.texBtn.style.display = 'none';
    if (tool.assetsPanel) tool.assetsPanel.style.display = 'none';
    if (tool.texPanel)    tool.texPanel.style.display = 'none';
    if (tool.hud) tool.hud.style.display = 'none';
  };

  tool.update = (dt) => {
    if (!tool.active) return;

    // Controller buttons
    if (input.l1Pressed) { tool.standUp = !tool.standUp; syncGhostRotation(); }
    if (input.r1Pressed) { tool.yawDeg = (tool.yawDeg + 45) % 360; syncGhostRotation(); }

    // Placement ray hits **terrain only** so height stays stable
    const rc = new THREE.Raycaster();
    rc.setFromCamera({x:0, y:0}, camera);
    const hit = terrain ? rc.intersectObject(terrain, false)[0] : null;

    if (hit) {
      const gx = Math.round(hit.point.x);
      const gz = Math.round(hit.point.z);
      const baseY = typeof terrainHeightAt === 'function' ? terrainHeightAt(gx, gz) : hit.point.y;
      tool.ghost.position.set(gx, baseY + EPS, gz);
      tool.ghost.visible = true;
      syncGhostRotation();

      if (input.r2Pressed) placeCurrent();
    } else {
      tool.ghost.visible = false;
    }

    // Removal ray: target placed meshes only
    if (input.l2Pressed) {
      const r2 = new THREE.Raycaster();
      r2.setFromCamera({x:0,y:0}, camera);
      tryRemoveAtRay(r2);
    }
  };

  /* ----------------------------- Place/Remove ----------------------------- */
  function makePlacedMesh() {
    const geo = tool.assetGeos[tool.currentAsset].clone();
    // If a texture has been selected, use that material; else default grey PBR
    let mat;
    if (tool.activeMaterial) {
      // clone so transforms on this mesh (like map.repeat) don't affect others
      mat = tool.activeMaterial.clone();
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: 0xcccccc, metalness: 0.2, roughness: 0.6, side: THREE.DoubleSide
      });
    }
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    m.userData.isBuild = true;

    // Ensure uv2 exists for AO maps
    if (mat.aoMap && !geo.getAttribute('uv2')) {
      const uvAttr = geo.getAttribute('uv');
      if (uvAttr) geo.setAttribute('uv2', new THREE.BufferAttribute(uvAttr.array.slice(0), 2));
    }
    return m;
  }

  function placeCurrent() {
    if (!tool.active || !tool.ghost || !tool.ghost.visible) return;
    const m = makePlacedMesh();
    m.position.copy(tool.ghost.position);
    m.rotation.copy(tool.ghost.rotation);
    scene.add(m);
    tool.placed.push(m);
  }

  function tryRemoveAtRay(raycaster) {
    const hits = raycaster.intersectObjects(tool.placed, false);
    if (hits.length) {
      const obj = hits[0].object;
      tool.placed = tool.placed.filter(o => o !== obj);
      obj.geometry?.dispose?.();
      // Dispose textures only if no other mesh shares this material instance
      obj.material?.dispose?.();
      obj.removeFromParent();
    }
  }

  return tool;
}