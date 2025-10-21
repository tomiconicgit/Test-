// buildtool.js — Ramp placement + bottom-right HUD buttons for touch/mouse
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createRampGeometry } from './structures/ramp.js';

export function createBuildTool(THREE_NS, { scene, camera, input, terrain, terrainHeightAt }) {
  const EPS = 0.0005;

  const tool = {
    active:false,
    assetsPanel:null,
    closeBtn:null,
    assetsBtn:null,
    ghost:null,
    currentAsset:'RAMP',
    assetGeos:{},
    placed:[],
    standUp:false,
    yawDeg:0,

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

    document.body.append(close, assetsBtn, panel, hud);

    const css = document.createElement('style');
    css.textContent = `
      #build-close{
        position:fixed;top:16px;right:16px;z-index:1000;width:42px;height:42px;
        border-radius:10px;border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;
        font-size:22px;line-height:22px;font-weight:900;display:grid;place-items:center;
      }
      #build-assets{
        position:fixed;top:16px;right:66px;z-index:1000;width:42px;height:42px;
        border-radius:10px;border:1px solid rgba(255,255,255,.2);
        background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;display:grid;place-items:center;
      }
      #build-panel{
        position:fixed;top:66px;right:16px;z-index:1000;min-width:200px;
        border-radius:12px;border:1px solid rgba(255,255,255,.18);
        background:rgba(20,22,25,.92);backdrop-filter:blur(10px);
        padding:8px;display:flex;flex-direction:column;gap:6px;
      }
      #build-panel .entry{
        padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);
        background:rgba(35,37,41,.9);color:#eaeaea;font-weight:600;cursor:pointer;
      }
      #build-panel .entry:hover{ background:rgba(60,62,66,.9); }

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

    assetsBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    panel.addEventListener('click', (e) => {
      const div = e.target.closest('.entry');
      if (!div) return;
      setActiveAsset(div.dataset.type);
      panel.style.display = 'none';
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
    tool.hud.style.display = 'grid';
  };

  tool.disable = () => {
    tool.active = false;
    if (tool.ghost) tool.ghost.visible = false;
    if (tool.closeBtn) tool.closeBtn.style.display = 'none';
    if (tool.assetsBtn) tool.assetsBtn.style.display = 'none';
    if (tool.assetsPanel) tool.assetsPanel.style.display = 'none';
    if (tool.hud) tool.hud.style.display = 'none';
  };

  tool.update = (dt) => {
    if (!tool.active) return;

    // controller buttons still work
    if (input.l1Pressed) { tool.standUp = !tool.standUp; syncGhostRotation(); }
    if (input.r1Pressed) { tool.yawDeg = (tool.yawDeg + 45) % 360; syncGhostRotation(); }

    // ---- Placement ray: **terrain only** so snap height is stable
    const rc = new THREE.Raycaster();
    rc.setFromCamera({x:0, y:0}, camera);
    const hit = terrain ? rc.intersectObject(terrain, true)[0] : null;

    if (hit) {
      // Snap to integer tile centers
      const gx = Math.round(hit.point.x);
      const gz = Math.round(hit.point.z);
      // Base height from terrain at snapped center (not from hit on props)
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
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc, metalness: 0.0, roughness: 0.6, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(geo.clone(), mat);
    m.castShadow = m.receiveShadow = true;
    m.userData.isBuild = true;
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
      obj.material?.dispose?.();
      obj.removeFromParent();
    }
  }

  return tool;
}