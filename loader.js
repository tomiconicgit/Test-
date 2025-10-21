/* loader.js — boot/loader + on-screen debugger for your PWA
   - Fullscreen splash with progress %
   - Preloads core modules (so you don't stare at a black screen)
   - Dynamically imports ./main.js when ready
   - Catches errors (window.onerror / unhandledrejection / console.error)
   - Shows an on-screen error panel with Copy + Retry
   - Exposes window.__LOADER API (optional) so app code can push extra progress
*/

(function () {
  // -------- Config: list the critical files to preload (modules only; textures load later in-app) -----
  const CORE_URLS = [
    './main.js',

    // UI
    './ui/Joystick.js',
    './ui/lightingcontrols.js',

    // Engine
    './engine/Materials.js',
    './engine/VoxelWorld.js',
    './engine/inputController.js',
    './engine/placement.js',
    './engine/player.js',

    // Structures
    './engine/structures/block.js',
    './engine/structures/cylinder.js',
    './engine/structures/floor.js',
    './engine/structures/glass.js',
    './engine/structures/slope.js',
    './engine/structures/wall.js',
    './engine/structures/pipe.js',

    // External (cache a local copy through SW; still good to touch it so % moves)
    'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
  ];

  // -------- DOM: create overlay, bar, percent, status, and error panel -------
  const root = document.createElement('div');
  root.id = 'boot-overlay';
  root.innerHTML = `
    <div class="boot-card">
      <div class="boot-title">Loading…</div>
      <div class="boot-status" id="boot-status">Preparing</div>
      <div class="boot-bar">
        <div class="boot-bar-fill" id="boot-fill" style="width:0%"></div>
      </div>
      <div class="boot-percent"><span id="boot-pct">0</span>%</div>
      <div class="boot-mini-log" id="boot-mini-log"></div>
      <div class="boot-actions" id="boot-actions" style="display:none">
        <button id="boot-copy">Copy Error</button>
        <button id="boot-retry">Retry</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // CSS (scoped)
  const style = document.createElement('style');
  style.textContent = `
    #boot-overlay {
      position: fixed; inset: 0; z-index: 99999;
      display:flex; align-items:center; justify-content:center;
      background: radial-gradient(1200px 800px at 50% -10%, rgba(135,180,255,.35), rgba(0,0,0,.8)),
                  linear-gradient(#0b0d10, #0b0d10);
      color:#eaeaea; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    }
    .boot-card {
      width:min(520px, 90vw);
      padding:24px 20px;
      background: rgba(20,22,25,.65);
      border:1px solid rgba(255,255,255,.12);
      border-radius:16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
    }
    .boot-title { font-size:18px; font-weight:700; letter-spacing:.2px; margin-bottom:8px; }
    .boot-status { opacity:.9; font-size:13px; margin-bottom:12px; min-height:18px; }
    .boot-bar { width:100%; height:12px; background:rgba(255,255,255,.06); border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,.12); }
    .boot-bar-fill { height:100%; width:0%; background:linear-gradient(90deg, rgba(77,163,255,.95), rgba(77,163,255,.55)); }
    .boot-percent { text-align:right; font-variant-numeric: tabular-nums; font-size:13px; margin-top:6px; opacity:.85; }
    .boot-mini-log { margin-top:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; line-height:1.35; max-height:120px; overflow:auto; white-space:pre-wrap; color:#cfd7ff; }
    .boot-actions { margin-top:14px; display:flex; gap:8px; justify-content:flex-end; }
    .boot-actions button {
      padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.2);
      background: rgba(30,32,36,.6); color:#fff; font-weight:600; cursor:pointer;
    }
    .boot-actions button:active { transform: translateY(1px); }
    .boot-hidden { opacity:0; pointer-events:none; transition: opacity .25s ease; }
  `;
  document.head.appendChild(style);

  // -------- State + helpers --------
  let totalTasks = CORE_URLS.length;
  let doneTasks = 0;
  let paused = false;
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
    if (logs.length > 100) logs.shift();
    miniLog.textContent = logs.slice(-8).join('\n');
  }
  function showErrorPanel() {
    actions.style.display = 'flex';
  }
  function pauseForError(msg, stack) {
    paused = true;
    setStatus('An error occurred. Loader paused.');
    log('ERROR: ' + msg);
    if (stack) log(stack);
    showErrorPanel();
  }
  function collectErrorBlob() {
    const html = document.documentElement.outerHTML.slice(0, 2000); // small snapshot
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

  // Copy + Retry buttons
  $('boot-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(collectErrorBlob());
      log('Copied error details to clipboard.');
    } catch (e) {
      log('Clipboard failed: ' + e.message);
    }
  });
  $('boot-retry').addEventListener('click', () => {
    location.reload();
  });

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

  // Mirror console.error into on-screen log (but don't suppress it)
  const origConsoleError = console.error;
  console.error = function (...args) {
    try { errLogs.push('[console.error] ' + args.map(a => (a && a.stack) ? a.stack : String(a)).join(' ')); } catch {}
    origConsoleError.apply(console, args);
  };

  // -------- Optional public API so app code can extend progress later --------
  window.__LOADER = {
    addTasks(n = 1) { totalTasks += Math.max(0, n|0); },
    done(n = 1) { for (let i = 0; i < n; i++) bump(); },
    setStatus,
    // If your app uses THREE.LoadingManager, you can hook it:
    attachThreeLoadingManager(manager) {
      if (!manager) return;
      log('Attached THREE.LoadingManager');
      // optimistic: each item = 1 task
      manager.onStart = (_url, _loaded, _total) => { /* no-op */ };
      manager.onLoad = () => { /* no-op */ };
      manager.onProgress = () => { bump(); };
      manager.onError = (url) => { pauseForError('Three.js failed to load: ' + url); };
      // reserve 50 slots by default (tweak as needed)
      window.__LOADER.addTasks(50);
    }
  };

  // -------- Preload core modules (count by file, not bytes) --------
  async function preloadCore() {
    setStatus('Preloading core files…');
    for (const url of CORE_URLS) {
      if (paused) return;
      try {
        // Use cache, but ensure we get a body so SW warms it
        const res = await fetch(url, { cache: 'force-cache', mode: 'cors' });
        if (!res.ok && res.type !== 'opaque') throw new Error(`HTTP ${res.status} for ${url}`);
        bump();
        log('✓ ' + url);
      } catch (err) {
        pauseForError('Failed to preload: ' + url, err && err.stack);
        return;
      }
    }
  }

  // -------- Boot sequence --------
  (async function boot() {
    try {
      // Small visual head-start
      setPct(3);
      setStatus('Starting loader…');
      await new Promise(r => setTimeout(r, 120));

      // Wait for SW to be ready (if present) — optional, but helps consistent caching
      if ('serviceWorker' in navigator) {
        setStatus('Checking service worker…');
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(r => setTimeout(r, 1200))
        ]).catch(() => {});
      }

      await preloadCore();
      if (paused) return;

      setStatus('Launching app…');
      // Important: Dynamic import main.js (ESM) AFTER preload
      await import('./main.js');

      // Give main a moment to paint
      setStatus('Finalizing…');
      setPct(100);
      setTimeout(() => {
        root.classList.add('boot-hidden');
        setTimeout(() => {
          root.remove();
        }, 300);
      }, 150);

    } catch (err) {
      pauseForError(err.message || String(err), err.stack);
    }
  })();
})();