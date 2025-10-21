/* loader.js — FPVMC boot/loader + on-screen debugger
   - Fixed-size loader card with FPVMC logo
   - Progress bar + % while core files preload
   - Waits for the app's *first rendered frame* before hiding
   - Catches errors and shows copy-to-clipboard panel
   - Exposes window.__LOADER API:
       .setStatus(text)
       .addTasks(n)
       .done(n)
       .attachThreeLoadingManager(manager)
       .appReady()        // call this when your app renders a frame
*/

(function () {
  // -------- Config: preloaded modules (not textures) -------
  const CORE_URLS = [
    './main.js',
    './ui/Joystick.js',
    './ui/lightingcontrols.js',
    './engine/Materials.js',
    './engine/VoxelWorld.js',
    './engine/inputController.js',
    './engine/placement.js',
    './engine/player.js',
    './engine/structures/block.js',
    './engine/structures/cylinder.js',
    './engine/structures/floor.js',
    './engine/structures/glass.js',
    './engine/structures/slope.js',
    './engine/structures/wall.js',
    './engine/structures/pipe.js',
    'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
  ];

  // -------- DOM: overlay + fixed card -------
  const root = document.createElement('div');
  root.id = 'boot-overlay';
  root.innerHTML = `
    <div class="boot-card">
      <div class="boot-header">
        <div class="boot-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="28" height="28">
            <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#4da3ff"/><stop offset="1" stop-color="#7bb8ff"/>
            </linearGradient></defs>
            <rect x="8" y="8" width="48" height="48" rx="12" fill="url(#g)"/>
            <path d="M19 40 L32 17 L45 40" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="32" cy="44" r="3" fill="#fff"/>
          </svg>
        </div>
        <div class="boot-title">
          <div class="brand">FPVMC</div>
          <div class="subtitle">First-Person View • Model Creation</div>
        </div>
      </div>

      <div class="boot-status" id="boot-status">Preparing…</div>

      <div class="boot-bar">
        <div class="boot-bar-fill" id="boot-fill" style="width:0%"></div>
      </div>
      <div class="boot-percent"><span id="boot-pct">0</span>%</div>

      <div class="boot-mini-log" id="boot-mini-log"></div>

      <div class="boot-actions" id="boot-actions" style="visibility:hidden">
        <button id="boot-copy">Copy Error</button>
        <button id="boot-retry">Retry</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // CSS
  const style = document.createElement('style');
  style.textContent = `
    #boot-overlay {
      position: fixed; inset: 0; z-index: 99999;
      display:flex; align-items:center; justify-content:center;
      background: radial-gradient(1200px 800px at 50% -10%, rgba(135,180,255,.35), rgba(0,0,0,.85)),
                  linear-gradient(#0b0d10, #0b0d10);
      color:#eaeaea; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    }
    .boot-card {
      width: 560px; height: 300px;  /* FIXED SIZE */
      padding: 18px 18px 14px;
      display: grid;
      grid-template-rows: auto 18px 16px auto auto;
      gap: 8px;
      background: rgba(20,22,25,.70);
      border:1px solid rgba(255,255,255,.12);
      border-radius:16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      overflow: hidden;
    }
    .boot-header { display:flex; align-items:center; gap:10px; }
    .boot-logo { width:28px; height:28px; display:grid; place-items:center; }
    .boot-title .brand { font-weight:800; letter-spacing:.3px; }
    .boot-title .subtitle { font-size:12px; opacity:.75; margin-top:2px; }

    .boot-status { margin-top:2px; font-size:13px; opacity:.95; min-height:16px; }

    .boot-bar { width:100%; height:12px; background:rgba(255,255,255,.06); border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,.12); }
    .boot-bar-fill { height:100%; width:0%; background:linear-gradient(90deg, rgba(77,163,255,.95), rgba(77,163,255,.55)); }

    .boot-percent { text-align:right; font-variant-numeric: tabular-nums; font-size:12px; opacity:.85; }

    .boot-mini-log {
      margin-top:2px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size:12px; line-height:1.35;
      height: 150px; /* FIXED */
      overflow:auto; white-space:pre-wrap; color:#cfd7ff;
      background: rgba(0,0,0,.25);
      border:1px solid rgba(255,255,255,.08);
      border-radius:8px; padding:8px;
    }

    .boot-actions {
      margin-top:4px; display:flex; gap:8px; justify-content:flex-end;
    }
    .boot-actions button {
      padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.2);
      background: rgba(30,32,36,.6); color:#fff; font-weight:700; cursor:pointer; font-size:12px;
    }
    .boot-actions button:active { transform: translateY(1px); }

    .boot-hidden { opacity:0; pointer-events:none; transition: opacity .25s ease; }
    @media (max-width:640px){ .boot-card{ width: 92vw; } }
  `;
  document.head.appendChild(style);

  // -------- State + helpers --------
  let totalTasks = CORE_URLS.length + 1; // +1 for the dynamic import step
  let doneTasks = 0;
  let paused = false;
  let readyResolve;
  const readyPromise = new Promise(res => (readyResolve = res));

  const logs = [];
  const errLogs = [];

  const $ = (id) => document.getElementById(id);
  const fill = $('boot-fill');
  const pct = $('boot-pct');
  const statusEl = $('boot-status');
  const miniLog = $('boot-mini-log');
  const actions = $('boot-actions');

  function setStatus(s) { statusEl.textContent = s; }
  function setPct(value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    pct.textContent = v;
    fill.style.width = v + '%';
  }
  function bump() {
    doneTasks++;
    const p = (doneTasks / Math.max(1, totalTasks)) * 100;
    setPct(p);
  }
  function log(line) {
    const entry = `[${new Date().toLocaleTimeString()}] ${line}`;
    logs.push(entry);
    if (logs.length > 200) logs.shift();
    miniLog.textContent = logs.slice(-10).join('\n');
    miniLog.scrollTop = miniLog.scrollHeight;
  }
  function showErrorPanel() {
    actions.style.visibility = 'visible';
  }
  function pauseForError(msg, stack) {
    paused = true;
    setStatus('An error occurred. Loader paused.');
    log('ERROR: ' + msg);
    if (stack) log(stack);
    showErrorPanel();
  }
  function collectErrorBlob() {
    const html = document.documentElement.outerHTML.slice(0, 2000);
    return [
      '--- Loader Error Report ---',
      `Time: ${new Date().toISOString()}`,
      `UserAgent: ${navigator.userAgent}`,
      '',
      'Last Status:',
      statusEl.textContent,
      '',
      'Recent Log:',
      ...logs.slice(-50),
      '',
      'Recent Errors:',
      ...errLogs.slice(-50),
      '',
      'DOM snapshot (first 2000 chars):',
      html
    ].join('\n');
  }

  $('boot-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(collectErrorBlob()); log('Copied error details to clipboard.'); }
    catch (e) { log('Clipboard failed: ' + e.message); }
  });
  $('boot-retry').addEventListener('click', () => location.reload());

  // -------- Error interception --------
  const origOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const stack = error && error.stack ? error.stack : `${source}:${lineno}:${colno}`;
    errLogs.push(`[onerror] ${message}\n${stack}`);
    if (!paused) pauseForError(String(message), stack);
    if (typeof origOnError === 'function') return origOnError.apply(this, arguments);
    return true;
  };

  window.addEventListener('unhandledrejection', (e) => {
    const msg = (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason);
    errLogs.push(`[unhandledrejection] ${msg}`);
    if (!paused) pauseForError(String(msg));
  });

  const origConsoleError = console.error;
  console.error = function (...args) {
    try { errLogs.push('[console.error] ' + args.map(a => (a && a.stack) ? a.stack : String(a)).join(' ')); } catch {}
    origConsoleError.apply(console, args);
  };

  // -------- Public API for app --------
  window.__LOADER = {
    setStatus,
    addTasks(n = 1) { totalTasks += Math.max(0, n|0); },
    done(n = 1) { for (let i = 0; i < n; i++) bump(); },
    attachThreeLoadingManager(manager) {
      if (!manager) return;
      log('Attached THREE.LoadingManager');
      // reserve some slots so progress moves during texture loads
      window.__LOADER.addTasks(50);
      manager.onProgress = () => bump();
      manager.onError = (url) => pauseForError('Three.js failed to load: ' + url);
    },
    appReady() {  // called by main.js AFTER first frame renders
      try { readyResolve(); } catch {}
    }
  };

  // Also support a custom DOM event if you prefer:
  window.addEventListener('world:first-frame', () => window.__LOADER.appReady(), { once: true });

  // -------- Preload core modules --------
  async function preloadCore() {
    setStatus('Preloading core files…');
    for (const url of CORE_URLS) {
      if (paused) return;
      try {
        const res = await fetch(url, { cache: 'force-cache', mode: 'cors' });
        if (!res.ok && res.type !== 'opaque') throw new Error(`HTTP ${res.status} for ${url}`);
        bump(); log('✓ ' + url);
      } catch (err) {
        pauseForError('Failed to preload: ' + url, err && err.stack);
        return;
      }
    }
  }

  // -------- Boot sequence --------
  (async function boot() {
    try {
      setPct(3); setStatus('Starting loader…');
      await new Promise(r => setTimeout(r, 100));

      // Optional: wait briefly for SW
      if ('serviceWorker' in navigator) {
        setStatus('Checking service worker…');
        await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 1200))]).catch(()=>{});
      }

      await preloadCore();
      if (paused) return;

      setStatus('Launching app…');
      await import('./main.js'); // main will call __LOADER.appReady() after first frame
      bump(); // count dynamic import as a task

      // DO NOT hide loader yet — wait for first frame:
      setStatus('Waiting for first frame…');
      await readyPromise;

      setStatus('Finalizing…');
      setPct(100);
      setTimeout(() => { root.classList.add('boot-hidden'); setTimeout(() => root.remove(), 280); }, 160);

    } catch (err) {
      pauseForError(err.message || String(err), err.stack);
    }
  })();
})();