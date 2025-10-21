/* ========================================================================== *
 *  FPVMC — AAA Loader (dark mode)                                            *
 *  - Fullscreen cinematic overlay                                            *
 *  - Animated logo + shimmer progress + percent + ETA/network hint          *
 *  - Tip carousel                                                            *
 *  - Live log, error trap, copy & retry                                      *
 *  - Preloads core modules (edit CORE below)                                 *
 *  - Stays until window.__LOADER.appReady() is called by your app            *
 *  Public API (on window.__LOADER):
 *     setStatus(text)                                                        *
 *     addTasks(n)                                                            *
 *     done(n)                                                                *
 *     attachThreeLoadingManager(manager)  // wires into Three loaders        *
 *     appReady()                          // app calls when first frame      *
 * ========================================================================== */

(() => {
  // --- Configure what to preload (modules/scripts only; game/content uses own loaders) ---
  const CORE = [
    './main.js',
    './renderer.js',
    './camera.js',
    './controller.js',
    './terrain.js',
    './sky.js',
    './lighting.js',
    './menu.js',
    './digtool.js',
    // libs
    'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
  ];

  // --- DOM: cinematic overlay ------------------------------------------------
  const root = document.createElement('div');
  root.id = 'fpvmc-aaaloader';
  root.innerHTML = `
    <div class="bg">
      <div class="vignette"></div>
      <div class="noise"></div>
    </div>

    <div class="wrap">
      <div class="top">
        <div class="brand">
          <div class="logo">
            <svg viewBox="0 0 64 64" width="42" height="42" aria-hidden="true">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#5aa8ff"/>
                  <stop offset="1" stop-color="#98c6ff"/>
                </linearGradient>
              </defs>
              <rect x="8" y="8" width="48" height="48" rx="12" fill="url(#g1)"/>
              <path d="M19 40 L32 17 L45 40" fill="none" stroke="#0b0f14" stroke-opacity=".35" stroke-width="6"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 40 L32 17 L45 40" fill="none" stroke="#ffffff" stroke-width="4"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="32" cy="44" r="3" fill="#fff"/>
            </svg>
          </div>
          <div class="titles">
            <div class="name">FPVMC</div>
            <div class="tag">First-Person View · Model Creation</div>
          </div>
        </div>
        <div class="status" id="ld_status">Initializing…</div>
      </div>

      <div class="progress">
        <div class="bar">
          <div class="track"></div>
          <div class="fill" id="ld_fill"><div class="shine"></div></div>
        </div>
        <div class="stats">
          <div class="pct"><span id="ld_pct">0</span>%</div>
          <div class="eta" id="ld_eta">Estimating…</div>
          <div class="net" id="ld_net">—</div>
        </div>
      </div>

      <div class="tips" id="ld_tip">Tip: Press B to expand the Dig Tool area.</div>

      <div class="console">
        <div class="log" id="ld_log"></div>
        <div class="actions" id="ld_actions" style="display:none">
          <button id="ld_copy" class="action">Copy Error</button>
          <button id="ld_retry" class="action primary">Retry</button>
        </div>
      </div>
    </div>

    <div class="footer">© FPVMC</div>
  `;
  document.body.appendChild(root);

  // --- Styles (AAA dark) -----------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
  :root{
    --fg:#dfe7ff; --muted:#9eb0cc; --bg:#0b0f14;
    --card:#0e141b; --glass:rgba(255,255,255,.06);
    --prm:#6eb0ff; --prm2:#2a79ff; --ok:#00d68f; --err:#ff5977;
  }
  #fpvmc-aaaloader{position:fixed;inset:0;z-index:2147483647;color:var(--fg);
    font:14px/1.5 "Inter",system-ui,-apple-system,Segoe UI,Roboto,Arial; letter-spacing:.2px;}

  #fpvmc-aaaloader .bg{position:absolute;inset:0;background:radial-gradient(1200px 800px at 50% -10%, #142033 0%, #0b0f14 55%)}
  #fpvmc-aaaloader .vignette{position:absolute;inset:0;box-shadow:inset 0 0 180px rgba(0,0,0,.7)}
  #fpvmc-aaaloader .noise{
    position:absolute;inset:0;opacity:.035;pointer-events:none;
    background-image: repeating-conic-gradient(#fff 0% 0.1%, transparent 0.1% 0.2%);
    mix-blend-mode:overlay;
    animation:grain 1.4s steps(3,end) infinite;
  }
  @keyframes grain { 0%{transform:translate(0,0)} 25%{transform:translate(-1%,1%)} 50%{transform:translate(1%,-1%)} 75%{transform:translate(1%,1%)} 100%{transform:translate(0,0)} }

  #fpvmc-aaaloader .wrap{position:absolute;inset:0;display:grid;place-items:center;padding:24px}
  #fpvmc-aaaloader .top{width:min(920px,92vw);display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  #fpvmc-aaaloader .brand{display:flex;align-items:center;gap:14px}
  #fpvmc-aaaloader .logo{width:48px;height:48px;display:grid;place-items:center;filter:drop-shadow(0 10px 30px rgba(62,138,255,.25))}
  #fpvmc-aaaloader .titles .name{font-size:20px;font-weight:800;letter-spacing:.3px}
  #fpvmc-aaaloader .titles .tag{font-size:12px;color:var(--muted)}
  #fpvmc-aaaloader .status{color:#e9f1ff;opacity:.9}

  #fpvmc-aaaloader .progress{width:min(920px,92vw);background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 16px;backdrop-filter:blur(6px)}
  #fpvmc-aaaloader .bar{position:relative;height:16px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.06)}
  #fpvmc-aaaloader .track{position:absolute;inset:0;background:linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.07) 100%)}
  #fpvmc-aaaloader .fill{position:absolute;inset:0;width:0%;background:linear-gradient(90deg, var(--prm), var(--prm2));
    box-shadow:0 0 24px rgba(110,176,255,.45)}
  #fpvmc-aaaloader .shine{position:absolute;top:0;bottom:0;width:80px;right:-80px;background:linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
    animation:shine 1.8s infinite}
  @keyframes shine{0%{transform:translateX(-100%)}100%{transform:translateX(600%)}}

  #fpvmc-aaaloader .stats{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:var(--muted)}
  #fpvmc-aaaloader .stats .pct{font-variant-numeric:tabular-nums;color:#eef4ff}
  #fpvmc-aaaloader .stats .eta{opacity:.9}
  #fpvmc-aaaloader .stats .net{opacity:.75}

  #fpvmc-aaaloader .tips{width:min(920px,92vw);margin-top:14px;color:#b8c8e6;font-size:13px;opacity:.9}

  #fpvmc-aaaloader .console{width:min(920px,92vw);display:grid;grid-template-columns:1fr auto;gap:12px;margin-top:12px}
  #fpvmc-aaaloader .log{min-height:120px;max-height:160px;padding:10px;border-radius:12px;background:#0c1219;border:1px solid rgba(255,255,255,.08);
    overflow:auto;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#cfe1ff}
  #fpvmc-aaaloader .actions{display:flex;gap:10px;align-items:start}
  #fpvmc-aaaloader .action{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:#e7f0ff;font-weight:700;cursor:pointer}
  #fpvmc-aaaloader .action.primary{border-color:rgba(110,176,255,.5);background:linear-gradient(180deg, rgba(110,176,255,.15), rgba(110,176,255,.08))}
  #fpvmc-aaaloader .action:active{transform:translateY(1px)}
  #fpvmc-aaaloader .footer{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-size:11px;color:#6f7f98}

  #fpvmc-aaaloader.hide{opacity:0;transition:opacity .35s ease;pointer-events:none}
  `;
  document.head.appendChild(style);

  // --- Elements --------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const statusEl = $('ld_status');
  const fillEl   = $('ld_fill');
  const pctEl    = $('ld_pct');
  const etaEl    = $('ld_eta');
  const netEl    = $('ld_net');
  const tipEl    = $('ld_tip');
  const logEl    = $('ld_log');
  const actions  = $('ld_actions');
  const copyBtn  = $('ld_copy');
  const retryBtn = $('ld_retry');

  // --- Tips carousel ---------------------------------------------------------
  const TIPS = [
    'Tip: Press B to expand the Dig Tool area.',
    'Tip: Press X to shrink the Dig Tool area.',
    'Tip: Hold right stick to look; left stick to move.',
    'Tip: R2 confirms actions in tools.',
    'Tip: Performance improves after first warm-up frame.'
  ];
  let tipIdx = 0;
  setInterval(() => {
    tipIdx = (tipIdx + 1) % TIPS.length;
    tipEl.textContent = TIPS[tipIdx];
  }, 3800);

  // --- Progress, ETA & bandwidth estimate -----------------------------------
  let totalTasks = CORE.length + 1; // +1 for the dynamic import step
  let doneTasks  = 0;
  let bytesLoaded = 0;
  let t0 = performance.now();
  let paused = false;

  function setStatus(s) { statusEl.textContent = s; }
  function setPct(n) { const v = Math.max(0, Math.min(100, Math.round(n))); pctEl.textContent = v; fillEl.style.width = v + '%'; }

  function bump() {
    doneTasks++;
    const p = (doneTasks / Math.max(1,totalTasks)) * 100;
    setPct(p);
    // basic ETA using average task time
    const dt = (performance.now() - t0)/1000;
    const left = Math.max(0, totalTasks - doneTasks);
    const avg = doneTasks ? dt / doneTasks : 0;
    const eta = Math.ceil(avg * left);
    etaEl.textContent = (left>0 && isFinite(eta)) ? `ETA ~${eta}s` : 'Finalizing…';
  }

  // Network speed sampling (rough)
  const sizeSamples = [];
  function noteSize(nBytes) {
    if (!nBytes || !isFinite(nBytes)) return;
    bytesLoaded += nBytes;
    sizeSamples.push({ t: performance.now(), b: bytesLoaded });
    if (sizeSamples.length > 20) sizeSamples.shift();
    const dt = (sizeSamples.at(-1).t - sizeSamples[0].t) / 1000;
    const db = (sizeSamples.at(-1).b - sizeSamples[0].b);
    const bps = dt>0 ? db/dt : 0;
    if (bps>0) {
      const kbps = (bps/1024).toFixed(0);
      netEl.textContent = `${kbps} KB/s`;
    }
  }

  // --- Logging & errors ------------------------------------------------------
  const logs = [];
  const errs = [];
  function log(line) {
    const msg = `[${new Date().toLocaleTimeString()}] ${line}`;
    logs.push(msg);
    logEl.textContent = logs.slice(-80).join('\n');
    logEl.scrollTop = logEl.scrollHeight;
  }
  function showErrorUI() {
    actions.style.display = 'flex';
  }
  function pauseForError(message, stack) {
    paused = true;
    setStatus('Error encountered. Loader paused.');
    log(`ERROR: ${message}`);
    if (stack) log(stack);
    showErrorUI();
  }

  copyBtn?.addEventListener('click', async () => {
    const bundle = [
      '--- FPVMC Loader Error Report ---',
      `Time: ${new Date().toISOString()}`,
      `UserAgent: ${navigator.userAgent}`,
      `Status: ${statusEl.textContent}`,
      '',
      'Recent Log:',
      ...logs.slice(-120),
      '',
      'Errors:',
      ...errs.slice(-60)
    ].join('\n');
    try { await navigator.clipboard.writeText(bundle); log('Copied error report to clipboard.'); }
    catch(e){ log('Clipboard failed: ' + e.message); }
  });
  retryBtn?.addEventListener('click', () => location.reload());

  // Hook global errors
  window.addEventListener('error', (e) => {
    const msg = e.message || String(e.error || 'Unknown error');
    errs.push(msg);
    if (!paused) pauseForError(msg, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = (e.reason && (e.reason.message || e.reason)) || 'Unhandled promise rejection';
    errs.push(String(msg));
    if (!paused) pauseForError(String(msg));
  });

  // --- Public API for app / loaders -----------------------------------------
  let readyResolve;
  const readyPromise = new Promise(res => (readyResolve = res));

  window.__LOADER = {
    setStatus,
    addTasks(n=1){ totalTasks += (n|0); },
    done(n=1){ for (let i=0;i<n;i++) bump(); },
    attachThreeLoadingManager(manager) {
      if (!manager) return;
      log('Three LoadingManager attached.');
      // Reserve some progress cells for asset loads:
      this.addTasks(100);
      // Many loaders don't expose bytes; we bump per onProgress.
      manager.onProgress = () => bump();
      manager.onError = (url) => pauseForError('Three loader failed: ' + url);
    },
    appReady(){ try{ readyResolve(); }catch{} }
  };

  // --- Preload using fetch with streaming size sampling ----------------------
  async function preloadOne(url) {
    const tStart = performance.now();
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok && res.type !== 'opaque') throw new Error(`HTTP ${res.status}`);
      // attempt to count bytes (streams supported in modern iOS Safari)
      const reader = res.body?.getReader?.();
      if (reader) {
        let total = 0;
        // we still need the text/bytes? We don't execute; just drain
        // to estimate bandwidth then drop.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          noteSize(value.byteLength);
        }
        log(`✓ ${url} (${(total/1024).toFixed(1)} KB, ${(performance.now()-tStart).toFixed(0)} ms)`);
      } else {
        // Fallback: read as blob
        const blob = await res.clone().blob();
        noteSize(blob.size);
        log(`✓ ${url} (${(blob.size/1024).toFixed(1)} KB, ${(performance.now()-tStart).toFixed(0)} ms)`);
      }
      bump();
    } catch (err) {
      pauseForError(`Failed to preload: ${url}`, err && err.stack);
      throw err;
    }
  }

  async function preloadAll() {
    setStatus('Preloading core…');
    for (const url of CORE) {
      if (paused) return;
      await preloadOne(url);
    }
  }

  // --- Boot sequence ---------------------------------------------------------
  (async () => {
    try {
      setPct(2); setStatus('Starting…');
      // Soft wait for SW activate (if any), but don’t block UX
      if ('serviceWorker' in navigator) {
        Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 1000))]).catch(()=>{});
      }

      await preloadAll();
      if (paused) return;

      setStatus('Launching…');
      await import('./main.js');
      bump(); // count dynamic import

      setStatus('Waiting for first frame…');
      await readyPromise;

      setStatus('Finalizing…');
      setPct(100);
      setTimeout(() => { root.classList.add('hide'); setTimeout(() => root.remove(), 380); }, 180);

    } catch (e) {
      // already handled by pauseForError, but guard anyway
      if (!paused) pauseForError(e.message || String(e), e.stack);
    }
  })();
})();