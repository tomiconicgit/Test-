/* loader.js — FPVMC lightweight loader + on-screen debugger
   - Fixed-size card with logo, progress, %.
   - Preloads core modules.
   - Pauses and shows errors with copy button.
   - Waits for app's first rendered frame before hiding.
   - App must call: window.__LOADER.appReady()
*/

(() => {
  const CORE = [
    './main.js',
    './renderer.js',
    './camera.js',
    './controller.js',
    './terrain.js',
    './sky.js',
    './lighting.js',
    'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
  ];

  // Overlay DOM
  const root = document.createElement('div');
  root.id = 'fpvmc-loader';
  root.innerHTML = `
    <div class="card">
      <div class="head">
        <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
          <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#4da3ff"/><stop offset="1" stop-color="#7bb8ff"/>
          </linearGradient></defs>
          <rect x="8" y="8" width="48" height="48" rx="12" fill="url(#g)"/>
          <path d="M19 40 L32 17 L45 40" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="32" cy="44" r="3" fill="#fff"/>
        </svg>
        <div class="title">
          <div class="brand">FPVMC</div>
          <div class="sub">First-Person View • Model Creation</div>
        </div>
      </div>

      <div class="status" id="ld_status">Preparing…</div>

      <div class="bar"><div class="fill" id="ld_fill"></div></div>
      <div class="pct"><span id="ld_pct">0</span>%</div>

      <pre class="log" id="ld_log"></pre>

      <div class="actions" id="ld_actions" style="visibility:hidden">
        <button id="ld_copy">Copy Error</button>
        <button id="ld_retry">Retry</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    #fpvmc-loader{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;
      background: radial-gradient(1200px 800px at 50% -10%, rgba(135,180,255,.25), rgba(0,0,0,.9)) }
    #fpvmc-loader .card{width:560px;height:300px;display:grid;gap:8px;padding:18px;
      grid-template-rows:auto 18px 14px auto auto; color:#eaeaea;
      background:rgba(20,22,25,.72);border:1px solid rgba(255,255,255,.12);border-radius:16px;
      backdrop-filter:blur(10px);box-shadow:0 20px 60px rgba(0,0,0,.45);font-family:Inter,system-ui,Arial}
    .head{display:flex;align-items:center;gap:10px}
    .title .brand{font-weight:800;letter-spacing:.3px}
    .title .sub{font-size:12px;opacity:.75;margin-top:2px}
    .status{font-size:13px;min-height:16px;opacity:.95}
    .bar{height:12px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.12)}
    .fill{height:100%;width:0%;background:linear-gradient(90deg, rgba(77,163,255,.95), rgba(77,163,255,.55))}
    .pct{text-align:right;font-variant-numeric:tabular-nums;font-size:12px;opacity:.85}
    .log{height:150px;margin:0;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);
      border-radius:8px;padding:8px;overflow:auto;color:#cfd7ff;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace}
    .actions{display:flex;gap:8px;justify-content:flex-end}
    .actions button{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);
      background:rgba(30,32,36,.6);color:#fff;font-weight:700;cursor:pointer;font-size:12px}
    .hide{opacity:0;pointer-events:none;transition:opacity .25s}
    @media (max-width:640px){#fpvmc-loader .card{width:92vw}}
  `;
  document.head.appendChild(style);

  const $ = id => document.getElementById(id);
  const statusEl = $('ld_status'), fillEl = $('ld_fill'), pctEl = $('ld_pct'), logEl = $('ld_log'), actionsEl = $('ld_actions');
  let total = CORE.length + 1, done = 0, paused = false;
  const logs = [], errs = [];
  const setStatus = t => { statusEl.textContent = t; };
  const setPct = p => { const v = Math.max(0, Math.min(100, Math.round(p))); pctEl.textContent = v; fillEl.style.width = v+'%'; };
  const bump = () => { done++; setPct(100 * done / total); };
  const log = s => { const line = `[${new Date().toLocaleTimeString()}] ${s}`; logs.push(line); logEl.textContent = logs.slice(-12).join('\n'); logEl.scrollTop = logEl.scrollHeight; };
  const pause = (msg, stack) => { paused = true; setStatus('An error occurred.'); log('ERROR: ' + msg); if (stack) log(stack); actionsEl.style.visibility = 'visible'; };

  $('ld_copy').onclick = async () => {
    const txt = [
      '--- FPVMC Loader Error ---', new Date().toISOString(), navigator.userAgent, '',
      'Status:', statusEl.textContent, '', 'Recent log:', ...logs.slice(-50), '', 'Errors:', ...errs.slice(-50)
    ].join('\n');
    try { await navigator.clipboard.writeText(txt); log('Copied error to clipboard.'); } catch(e){ log('Copy failed: '+e.message); }
  };
  $('ld_retry').onclick = () => location.reload();

  window.addEventListener('error', e => { const m = e.message || String(e.error); errs.push(m); if (!paused) pause(m, e.error && e.error.stack); });
  window.addEventListener('unhandledrejection', e => { const m = (e.reason && (e.reason.message || e.reason)) || 'unhandledrejection'; errs.push(m); if (!paused) pause(String(m)); });

  // Public API
  let readyResolve; const ready = new Promise(res => readyResolve = res);
  window.__LOADER = {
    setStatus, addTasks(n=1){ total += n|0; }, done(n=1){ for(let i=0;i<n;i++) bump(); },
    attachThreeLoadingManager(m){ if(!m) return; this.addTasks(50); m.onProgress = () => bump(); m.onError = (u)=> pause('Three failed: '+u); },
    appReady(){ try{ readyResolve(); }catch{} }
  };

  async function preload() {
    setStatus('Preloading…');
    for (const url of CORE) {
      if (paused) return;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok && res.type !== 'opaque') throw new Error(`HTTP ${res.status} for ${url}`);
        bump(); log('✓ ' + url);
      } catch (err) { pause('Failed to preload '+url, err && err.stack); return; }
    }
  }

  (async () => {
    try {
      setPct(2); setStatus('Starting…');
      await preload(); if (paused) return;
      setStatus('Launching…');
      await import('./main.js'); bump();            // main will call __LOADER.appReady() after first frame
      setStatus('Waiting for first frame…');
      await ready;
      setPct(100); setStatus('Ready');
      setTimeout(()=>{ root.classList.add('hide'); setTimeout(()=>root.remove(), 260); }, 120);
    } catch (e) { pause(e.message || String(e), e.stack); }
  })();
})();