// buildtool.js — assets picker + ghost preview + place/remove/rotate
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { createRampGeometry } from './structures/ramp.js';

export function createBuildTool(THREE_NS, { scene, camera, input }) {
  const tool = {
    active:false,
    assetsPanel:null,
    closeBtn:null,
    assetsBtn:null,
    ghost:null,
    currentAsset:'RAMP',
    assetGeos:{},
    placed:[],
    standUp:false,     // L1 toggles ground ↔ vertical
    yawDeg:0,          // R1 adds +45° each tap
  };

  // ---- UI ---------------------------------------------------------------
  function ensureUI() {
    if (tool.closeBtn) return;

    // top-right close button (X)
    const close = document.createElement('button');
    close.id = 'build-close';
    close.textContent = '×';
    close.title = 'Close Build Tool';
    close.style.display = 'none';
    close.addEventListener('click', () => tool.disable());

    // assets button (drawer)
    const assetsBtn = document.createElement('button');
    assetsBtn.id = 'build-assets';
    assetsBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l9 5-9 5-9-5 9-5zm0 7l9 5-9 5-9-5 9-5z" fill="currentColor"/>
      </svg>`;
    assetsBtn.title = 'Assets';
    assetsBtn.style.display = 'none';

    // dropdown
    const panel = document.createElement('div');
    panel.id = 'build-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="entry" data-type="RAMP">Ramp</div>
    `;

    document.body.append(close, assetsBtn, panel);

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

    tool.closeBtn = close;
    tool.assetsBtn = assetsBtn;
    tool.assetsPanel = panel;
  }

  function setActiveAsset(type) {
    tool.currentAsset = type;
    ensureGhost();
  }

  // ---- Ghost / Geometries ------------------------------------------------
  function ensureGeos() {
    if (Object.keys(tool.assetGeos).length) return;
    tool.assetGeos.RAMP = createRampGeometry();
  }

  function ensureGhost() {
    ensureGeos();
    if (!tool.ghost) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7fb3ff, transparent:true, opacity:0.35, roughness:0.6, metalness:0.0,
        depthWrite:false
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

  // ---- Public API --------------------------------------------------------
  tool.enable = () => {
    tool.active = true;
    ensureUI();
    ensureGhost();
    tool.closeBtn.style.display = 'grid';
    tool.assetsBtn.style.display = 'grid';
  };

  tool.disable = () => {
    tool.active = false;
    if (tool.ghost) tool.ghost.visible = false;
    if (tool.closeBtn) tool.closeBtn.style.display = 'none';
    if (tool.assetsBtn) tool.assetsBtn.style.display = 'none';
    if (tool.assetsPanel) tool.assetsPanel.style.display = 'none';
  };

  tool.update = (dt) => {
    if (!tool.active) return;

    // orient controls
    if (input.l1Pressed) tool.standUp = !tool.standUp;                 // horizontal ↔ vertical
    if (input.r1Pressed) tool.yawDeg = (tool.yawDeg + 45) % 360;       // yaw +45°

    // raycast to ground/scene for placement position
    const rc = new THREE.Raycaster();
    rc.setFromCamera({x:0, y:0}, camera);
    const hits = rc.intersectObjects(scene.children, true);
    const hit = hits.find(h => h.object !== tool.ghost); // ignore ghost self
    if (hit) {
      const gx = Math.round(hit.point.x);
      const gz = Math.round(hit.point.z);
      const gy = hit.point.y;
      tool.ghost.position.set(gx, gy + 0.001, gz);
      tool.ghost.rotation.set(0, THREE.MathUtils.degToRad(tool.yawDeg), 0);
      if (tool.standUp) {
        // stand up around X so it becomes wall-like
        tool.ghost.rotation.x = Math.PI / 2;
      }
      tool.ghost.visible = true;

      // place
      if (input.r2Pressed) placeCurrent();

      // remove (looked item)
      if (input.l2Pressed) tryRemoveAtRay(rc);
    } else {
      tool.ghost.visible = false;
    }
  };

  function makePlacedMesh() {
    const geo = tool.assetGeos[tool.currentAsset];
    const mat = new THREE.MeshStandardMaterial({ color:0xcccccc, metalness:0.0, roughness:0.6 });
    const m = new THREE.Mesh(geo.clone(), mat);
    m.castShadow = m.receiveShadow = true;
    m.userData.isBuild = true;
    return m;
  }

  function placeCurrent() {
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
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
      obj.removeFromParent();
    }
  }

  return tool;
}