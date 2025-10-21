// buildtool.js — Ramp placement + PBR texture picker + bottom-right HUD
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createRampGeometry } from './structures/ramp.js';

export function createBuildTool(THREE_NS, { scene, camera, input, terrain, terrainHeightAt }) {
  const EPS = 0.0005;

  // --- PBR sets available in /assets/textures/<set> ---
  // Not every set has all maps. We’ll attach what exists.
  const TEX_BASE = 'assets/textures';
  const TEXTURE_SETS = {
    alloywall: {
      label: 'Alloy Wall',
      albedo: `${TEX_BASE}/alloywall/alloywall_albedo.png`,
      ao:     `${TEX_BASE}/alloywall/alloywall_ao.png`,
      height: `${TEX_BASE}/alloywall/alloywall_height.png`,
      metallic:`${TEX_BASE}/alloywall/alloywall_metallic.png`,
      normal: `${TEX_BASE}/alloywall/alloywall_normal.png`,
      // no roughness map listed
    },
    cement: {
      label: 'Cement',
      albedo: `${TEX_BASE}/cement/cement_albedo.png`,
      height: `${TEX_BASE}/cement/cement_height.png`,
      metallic:`${TEX_BASE}/cement/cement_metallic.png`,
      normal: `${TEX_BASE}/cement/cement_normal.png`,
      roughness:`${TEX_BASE}/cement/cement_roughness.png`,
    },
    grate: {
      label: 'Grate',
      albedo: `${TEX_BASE}/grate/grate_albedo.png`,
      ao:     `${TEX_BASE}/grate/grate.ao.png`,       // note the dot
      height: `${TEX_BASE}/grate/grate_height.png`,
      metallic:`${TEX_BASE}/grate/grate_metallic.png`,
      normal: `${TEX_BASE}/grate/grate_normal.png`,
      // no roughness map listed
    },
    hexfloor: {
      label: 'Hex Floor',
      albedo: `${TEX_BASE}/hexfloor/hexfloor_albedo.png`,
      ao:     `${TEX_BASE}/hexfloor/hexfloor_ao.png`,
      height: `${TEX_BASE}/hexfloor/hexfloor_height.png`,
      metallic:`${TEX_BASE}/hexfloor/hexfloor_metallic.png`,
      normal: `${TEX_BASE}/hexfloor/hexfloor_normal.png`,
      roughness:`${TEX_BASE}/hexfloor/hexfloor_roughness.png`,
    },
    metal: {
      label: 'Metal',
      albedo: `${TEX_BASE}/metal/metal_albedo.png`,
      ao:     `${TEX_BASE}/metal/metal_ao.png`,
      height: `${TEX_BASE}/metal/metal_height.png`,
      metallic:`${TEX_BASE}/metal/metal_metallic.png`,
      normal: `${TEX_BASE}/metal/metal_normal.png`,
      // no roughness
    },
    metalcubes: {
      label: 'Metal Cubes',
      albedo: `${TEX_BASE}/metalcubes/metalcubes_albedo.png`,
      ao:     `${TEX_BASE}/metalcubes/metalcubes_ao.png`,
      height: `${TEX_BASE}/metalcubes/metalcubes_height.png`,
      metallic:`${TEX_BASE}/metalcubes/metalcubes_metallic.png`,
      normal: `${TEX_BASE}/metalcubes/metalcubes_normal.png`,
      // no roughness
    },
    oiltubes: {
      label: 'Oil Tubes',
      albedo: `${TEX_BASE}/oiltubes/oiltubes_albedo.png`,
      ao:     `${TEX_BASE}/oiltubes/oiltubes_ao.png`,
      height: `${TEX_BASE}/oiltubes/oiltubes_height.png`,
      metallic:`${TEX_BASE}/oiltubes/oiltubes_metallic.png`,
      normal: `${TEX_BASE}/oiltubes/oiltubes_normal.png`,
      roughness:`${TEX_BASE}/oiltubes/oiltubes_roughness.png`,
    },
    oldmetal: {
      label: 'Old Metal',
      albedo: `${TEX_BASE}/oldmetal/oldmetal_albedo.png`,
      ao:     `${TEX_BASE}/oldmetal/oldmetal_ao.png`,
      height: `${TEX_BASE}/oldmetal/oldmetal_height.png`,
      metallic:`${TEX_BASE}/oldmetal/oldmetal_metallic.png`,
      normal: `${TEX_BASE}/oldmetal/oldmetal_normal.png`,
      // no roughness
    },
    polishedtile: {
      label: 'Polished Tile',
      albedo: `${TEX_BASE}/polishedtile/polishedtile_albedo.png`,
      ao:     `${TEX_BASE}/polishedtile/polishedtile_ao.png`,
      height: `${TEX_BASE}/polishedtile/polishedtile_height.png`,
      metallic:`${TEX_BASE}/polishedtile/polishedtile_metallic.png`,
      normal: `${TEX_BASE}/polishedtile/polishedtile_normal.png`,
      // there is also metallic2.png, ignoring unless needed
    },
    rustymetal: {
      label: 'Rusty Metal',
      albedo: `${TEX_BASE}/rustymetal/rustymetal_albedo.png`,
      ao:     `${TEX_BASE}/rustymetal/rustymetal_ao.png`,
      height: `${TEX_BASE}/rustymetal/rustymetal_height.png`,
      metallic:`${TEX_BASE}/rustymetal/rustymetal_metallic.png`,
      normal: `${TEX_BASE}/rustymetal/rustymetal_normal.png`,
      // no roughness
    },
    spacepanels: {
      label: 'Space Panels',
      albedo: `${TEX_BASE}/spacepanels/spacepanels_albedo.png`,
      ao:     `${TEX_BASE}/spacepanels/spacepanels_ao.png`,
      height: `${TEX_BASE}/spacepanels/spacepanels_height.png`,
      metallic:`${TEX_BASE}/spacepanels/spacepanels_metallic.png`,
      normal: `${TEX_BASE}/spacepanels/spacepanels_normal.png`,
      roughness:`${TEX_BASE}/spacepanels/spacepanels_roughness.png`,
    },
    techwall: {
      label: 'Tech Wall',
      albedo: `${TEX_BASE}/techwall/techwall_albedo.png`,
      ao:     `${TEX_BASE}/techwall/techwall_ao.png`,
      height: `${TEX_BASE}/techwall/techwall_height.png`,
      metallic:`${TEX_BASE}/techwall/techwall_metallic.png`,
      normal: `${TEX_BASE}/techwall/techwall_normal.png`,
      roughness:`${TEX_BASE}/techwall/techwall_roughness.png`,
    },
    vent: {
      label: 'Vent',
      albedo: `${TEX_BASE}/vent/vent_albedo.png`,
      ao:     `${TEX_BASE}/vent/vent_ao.png`,
      height: `${TEX_BASE}/vent/vent_height.png`,
      metallic:`${TEX_BASE}/vent/vent_metallic.png`,
      normal: `${TEX_BASE}/vent/vent_normal.png`,
      // no roughness
    },
    ventslating: {
      label: 'Vent Slating',
      albedo: `${TEX_BASE}/ventslating/ventslating_albedo.png`,
      ao:     `${TEX_BASE}/ventslating/ventslating_ao.png`,
      height: `${TEX_BASE}/ventslating/ventslating_height.png`,
      metallic:`${TEX_BASE}/ventslating/ventslating_metallic.png`,
      normal: `${TEX_BASE}/ventslating/ventslating_normal.png`,
      // no roughness
    },
  };

  // Texture loader + cache of loaded maps and resulting materials
  const texLoader = new THREE.TextureLoader();
  const materialCache = new Map(); // key `${setKey}::MeshStandardMaterial`

  function loadMap(url, isColor = false) {
    if (!url) return null;
    const t = texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (isColor) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function createPBRMaterialForSet(setKey) {
    const cacheKey = `${setKey}::std`;
    if (materialCache.has(cacheKey)) return materialCache.get(cacheKey).clone();

    const s = TEXTURE_SETS[setKey];
    if (!s) return new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 });

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,        // sane defaults if maps are missing
      metalness: 0.0,
    });

    // Maps
    const map       = loadMap(s.albedo, true);
    const normalMap = loadMap(s.normal);
    const roughnessMap = loadMap(s.roughness);
    const metalnessMap = loadMap(s.metallic);
    const aoMap     = loadMap(s.ao);
    const heightMap = loadMap(s.height); // use as bump if no displacement tessellation

    if (map)        mat.map = map;
    if (normalMap)  mat.normalMap = normalMap;
    if (roughnessMap) { mat.roughnessMap = roughnessMap; mat.roughness = 1.0; }
    if (metalnessMap) { mat.metalnessMap = metalnessMap; mat.metalness = 1.0; }
    if (aoMap)      { mat.aoMap = aoMap; mat.aoMapIntensity = 1.0; }
    if (heightMap)  { mat.bumpMap = heightMap; mat.bumpScale = 0.03; }

    // Ensure second UV for AO if geometry provides uv2 (our ramp does).
    // (If not, AO will simply be ignored.)
    mat.needsUpdate = true;

    materialCache.set(cacheKey, mat);
    return mat.clone();
  }

  const tool = {
    active:false,
    // UI
    assetsPanel:null,
    closeBtn:null,
    assetsBtn:null,
    texturesBtn:null,
    texturesPanel:null,

    // geometry/placement
    ghost:null,
    currentAsset:'RAMP',
    assetGeos:{},
    placed:[],

    // orientation
    standUp:false,
    yawDeg:0,

    // active texture set
    currentTexKey:'hexfloor',

    // HUD buttons
    hud:null, btnPlace:null, btnRemove:null, btnFlip:null, btnRotate:null
  };

  // ---------- UI ----------
  function ensureUI() {
    if (tool.closeBtn) return;

    const close = document.createElement('button');
    close.id = 'build-close';
    close.textContent = '×';
    close.title = 'Close Build Tool';
    close.style.display = 'none';
    close.addEventListener('click', () => tool.disable());

    // Textures button (to the LEFT of assets)
    const texturesBtn = document.createElement('button');
    texturesBtn.id = 'build-textures';
    texturesBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <!-- simple tiles icon -->
        <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" fill="currentColor"/>
      </svg>`;
    texturesBtn.title = 'Textures';
    texturesBtn.style.display = 'none';

    const texturesPanel = document.createElement('div');
    texturesPanel.id = 'build-tex-panel';
    texturesPanel.style.display = 'none';
    texturesPanel.innerHTML = Object.entries(TEXTURE_SETS)
      .map(([k, s]) => `<div class="entry" data-tex="${k}">${s.label}</div>`).join('');

    const assetsBtn = document.createElement('button');
    assetsBtn.id = 'build-assets';
    assetsBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l9 5-9 5-9-5 9-5zm0 7l9 5-9 5-9-5 9-5z" fill="currentColor"/>
      </svg>`;
    assetsBtn.title = 'Assets';
    assetsBtn.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = 'build-panel';
    panel.style.display = 'none';
    panel.innerHTML = `<div class="entry" data-type="RAMP">Ramp</div>`;

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

    document.body.append(close, texturesBtn, assetsBtn, texturesPanel, panel, hud);

    const css = document.createElement('style');
    css.textContent = `
      #build-close{
        position:fixed;top:16px;right:16px;z-index:1000;width:42px;height:42px;
        border-radius:10px;border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;
        font-size:22px;line-height:22px;font-weight:900;display:grid;place-items:center;
      }
      #build-assets, #build-textures{
        position:fixed;top:16px;z-index:1000;width:42px;height:42px;
        border-radius:10px;border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;display:grid;place-items:center;
      }
      #build-textures{ right:116px; } /* left of assets */
      #build-assets{ right:66px; }

      #build-panel, #build-tex-panel{
        position:fixed;top:66px;z-index:1000;min-width:220px;
        border-radius:12px;border:1px solid rgba(255,255,255,.18);
        background:rgba(20,22,25,.92);backdrop-filter:blur(10px);
        padding:8px;display:flex;flex-direction:column;gap:6px;
      }
      #build-panel{ right:16px; }
      #build-tex-panel{ right:116px; }

      #build-panel .entry, #build-tex-panel .entry{
        padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);
        background:rgba(35,37,41,.9);color:#eaeaea;font-weight:600;cursor:pointer;
      }
      #build-panel .entry:hover, #build-tex-panel .entry:hover{ background:rgba(60,62,66,.9); }

      #build-hud{
        position:fixed; right:16px; bottom:16px; z-index:1000;
        display:grid; grid-template-columns:1fr 1fr; gap:8px; width:220px;
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

    // Button behaviors
    assetsBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      texturesPanel.style.display = 'none';
    });
    panel.addEventListener('click', (e) => {
      const div = e.target.closest('.entry');
      if (!div) return;
      setActiveAsset(div.dataset.type);
      panel.style.display = 'none';
    });

    texturesBtn.addEventListener('click', () => {
      texturesPanel.style.display = texturesPanel.style.display === 'none' ? 'block' : 'none';
      panel.style.display = 'none';
    });
    texturesPanel.addEventListener('click', (e) => {
      const div = e.target.closest('.entry');
      if (!div) return;
      setActiveTexture(div.dataset.tex);
      texturesPanel.style.display = 'none';
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
    tool.assetsPanel = panel;
    tool.texturesBtn = texturesBtn;
    tool.texturesPanel = texturesPanel;
    tool.hud = hud;
    tool.btnPlace = hud.querySelector('#bt-place');
    tool.btnRemove = hud.querySelector('#bt-remove');
    tool.btnFlip = hud.querySelector('#bt-flip');
    tool.btnRotate = hud.querySelector('#bt-rot');
  }

  function setActiveAsset(type) {
    tool.currentAsset = type;
    ensureGhost();
  }
  function setActiveTexture(texKey) {
    if (!TEXTURE_SETS[texKey]) return;
    tool.currentTexKey = texKey;
    // (Ghost remains translucent; we don't apply PBR to ghost)
  }

  // ---------- Geos / Ghost ----------
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

  // ---------- Public API ----------
  tool.enable = () => {
    tool.active = true;
    ensureUI();
    ensureGhost();
    tool.closeBtn.style.display = 'grid';
    tool.assetsBtn.style.display = 'grid';
    tool.texturesBtn.style.display = 'grid';
    tool.hud.style.display = 'grid';
  };

  tool.disable = () => {
    tool.active = false;
    if (tool.ghost) tool.ghost.visible = false;
    if (tool.closeBtn) tool.closeBtn.style.display = 'none';
    if (tool.assetsBtn) tool.assetsBtn.style.display = 'none';
    if (tool.assetsPanel) tool.assetsPanel.style.display = 'none';
    if (tool.texturesBtn) tool.texturesBtn.style.display = 'none';
    if (tool.texturesPanel) tool.texturesPanel.style.display = 'none';
    if (tool.hud) tool.hud.style.display = 'none';
  };

  tool.update = (dt) => {
    if (!tool.active) return;

    // controller buttons still work
    if (input.l1Pressed) { tool.standUp = !tool.standUp; syncGhostRotation(); }
    if (input.r1Pressed) { tool.yawDeg = (tool.yawDeg + 45) % 360; syncGhostRotation(); }

    // ---- Placement ray: terrain only so height is stable
    const rc = new THREE.Raycaster();
    rc.setFromCamera({x:0, y:0}, camera);
    const hit = terrain ? rc.intersectObject(terrain, true)[0] : null;

    if (hit) {
      const gx = Math.round(hit.point.x);
      const gz = Math.round(hit.point.z);
      const gy = typeof terrainHeightAt === 'function'
        ? terrainHeightAt(gx, gz) + EPS
        : hit.point.y + EPS;

      tool.ghost.position.set(gx, gy, gz);
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

  function makePlacedMesh() {
    const geo = tool.assetGeos[tool.currentAsset];

    // Build PBR material for current texture set
    const mat = createPBRMaterialForSet(tool.currentTexKey);

    const m = new THREE.Mesh(geo.clone(), mat);
    m.castShadow = m.receiveShadow = true;
    m.userData.isBuild = true;

    // If geometry has only uv (no uv2) but we have AO, copy uv→uv2 to enable AOMap
    if (!m.geometry.getAttribute('uv2') && mat.aoMap) {
      const uv = m.geometry.getAttribute('uv');
      if (uv) m.geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(0), 2));
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
      // Dispose textures only if no one else uses the cached material; we used clones,
      // so just dispose the material instance (maps are shared by cache).
      obj.material?.dispose?.();
      obj.removeFromParent();
    }
  }

  return tool;
}