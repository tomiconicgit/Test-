/* ============================================================================
 * FPVMC — Simple, robust boot loader
 * - Preloads core modules (by fetch) to surface 404s early
 * - Nice progress bar + log + error overlay
 * - Then dynamically imports main.js
 * - App hides overlay by calling window.__LOADER.appReady()
 * ========================================================================== */

(() => {
  // ---- What to preload (module URLs relative to index.html) ---------------
  const CORE = [
    "./main.js",
    "./renderer.js",
    "./camera.js",
    "./controller.js",
    "./terrain.js",
    "./sky.js",
    "./lighting.js",
    "./menu.js",
    "./digtool.js",
    "./buildtool.js",
    "./structures/trussframe.js", // make sure this exists and path is correct
    "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js"
  ];

  // ---- Overlay DOM ---------------------------------------------------------
  const root = document.createElement("div");
  root.id = "fpvmc-loader";
  root.innerHTML = `
    <div class="wrap">
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

      <div class="status" id="ld_status">Initializing</div>

      <div class="progress">
        <div class="bar">
          <div class="fill" id="ld_fill"></div>
        </div>
        <div class="stats">
          <div class="pct"><span id="ld_pct">0</span>%</div>
          <div class="eta" id="ld_eta">Estimating</div>
          <div class="net" id="ld_net">—</div>
        </div>
      </div>

      <div class="console">
        <div class="log" id="ld_log"></div>
        <div class="actions" id="ld_actions" style="display:none">
          <button id="ld_copy" class="action">Copy Error</button>
          <button id="ld_retry" class="action primary">Retry</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ---- Styles --------------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = `
  #fpvmc-loader {
    position: fixed; inset: 0; z-index: 999999;
    background: radial-gradient(1200px 800px at 50% -10%, #142033 0%, #0b0f14 55%);
    color: #dfe7ff; font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Arial;
  }
  #fpvmc-loader .wrap { position:absolute; inset:0; display:grid; place-items:center; padding:24px; }
  #fpvmc-loader .brand { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
  #fpvmc-loader .titles .name { font-size:20px; font-weight:800; letter-spacing:.3px; }
  #fpvmc-loader .titles .tag  { font-size:12px; color:#9eb0cc; }
  #ld_status { margin-bottom:10px; opacity:.9; }

  .progress { width:min(920px,92vw); }
  .bar { position:relative; height:16px; border-radius:10px; overflow:hidden; background:rgba(255,255,255,.08); }
  .fill { position:absolute; inset:0; width:0%; background:linear-gradient(90deg, #6eb0ff, #2a79ff); box-shadow:0 0 24px rgba(110,176,255,.45); }
  .stats { display:flex; justify-content:space-between; margin-top:8px; color:#9eb0cc; }
  .pct { color:#eef4ff; }

  .console { width:min(920px,92vw); display:grid; grid-template-columns:1fr auto; gap:12px; margin-top:14px; }
  .log { min-height:120px; max-height:160px; padding:10px; border-radius:12px; background:#0c1219; border:1px solid rgba(255,255,255,.08);
         overflow:auto; font:12px/1.35 ui-monospace, Menlo, Consolas, monospace; color:#cfe1ff; }
  .actions { display:flex; gap:10px; align-items:start; }
  .action { padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06);
            color:#e7f0ff; font-weight:700; cursor:pointer; }
  .action.primary{ border-color:rgba(110,176,255,.5); background:linear-gradient(180deg, rgba(110,176,255,.15), rgba(110,176,255,.08)); }
  #fpvmc-loader.hide { opacity: 0; transition: opacity .35s ease; pointer-events:none; }
  `;
  document.head.appendChild(style);

  // ---- Elements ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const statusEl = $("ld_status");
  const pctEl    = $("ld_pct");
  const fillEl   = $("ld_fill");
  const etaEl    = $("ld_eta");
  const netEl    = $("ld_net");
  const logEl    = $("ld_log");
  const actions  = $("ld_actions");
  const copyBtn  = $("ld_copy");
  const retryBtn = $("ld_retry");

  // ---- Progress + ETA + bandwidth sampling --------------------------------
  let totalTasks = CORE.length + 1; // +1 for the dynamic import of main.js
  let doneTasks  = 0;
  let bytesLoaded = 0;
  const sizeSamples = [];
  const t0 = performance.now();
  let paused = false;

  function setStatus(s) { statusEl.textContent = s; }
  function setPct(n) {
    const v = Math.max(0, Math.min(100, Math.round(n)));
    pctEl.textContent = v;
    fillEl.style.width = v + "%";
  }
  function bump() {
    doneTasks++;
    const p = (doneTasks / Math.max(1, totalTasks)) * 100;
    setPct(p);
    const dt = (performance.now() - t0) / 1000;
    const left = Math.max(0, totalTasks - doneTasks);
    const avg = doneTasks ? dt / doneTasks : 0;
    const eta = Math.ceil(avg * left);
    etaEl.textContent = left > 0 && isFinite(eta) ? `ETA ~${eta}s` : "Finalizing";
  }
  function noteSize(nBytes) {
    if (!nBytes || !isFinite(nBytes)) return;
    bytesLoaded += nBytes;
    sizeSamples.push({ t: performance.now(), b: bytesLoaded });
    if (sizeSamples.length > 20) sizeSamples.shift();
    const dt = (sizeSamples.at(-1).t - sizeSamples[0].t) / 1000;
    const db = (sizeSamples.at(-1).b - sizeSamples[0].b);
    const bps = dt > 0 ? db / dt : 0;
    if (bps > 0) netEl.textContent = `${(bps/1024).toFixed(0)} KB/s`;
  }

  // ---- Logging / Errors ----------------------------------------------------
  const logs = [];
  const errs = [];
  function log(line) {
    const msg = `[${new Date().toLocaleTimeString()}] ${line}`;
    logs.push(msg);
    logEl.textContent = logs.slice(-120).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
  function showErrorUI() { actions.style.display = "flex"; }
  function pauseForError(message, stack) {
    paused = true;
    setStatus("Error encountered. Loader paused.");
    log(`ERROR: ${message}`);
    if (stack) log(String(stack));
    errs.push(String(message));
    showErrorUI();
  }

  copyBtn?.addEventListener("click", async () => {
    const bundle = [
      "--- FPVMC Loader Error Report ---",
      `Time: ${new Date().toISOString()}`,
      `UserAgent: ${navigator.userAgent}`,
      `Status: ${statusEl.textContent}`,
      "",
      "Recent Log:",
      ...logs.slice(-120),
      "",
      "Errors:",
      ...errs.slice(-60)
    ].join("\n");
    try {
      await navigator.clipboard.writeText(bundle);
      log("Copied error report to clipboard.");
    } catch (e) {
      log("Clipboard failed: " + e.message);
    }
  });
  retryBtn?.addEventListener("click", () => location.reload());

  // Hook global errors
  window.addEventListener("error", (e) => {
    const msg = e.message || String(e.error || "Unknown error");
    if (!paused) pauseForError(msg, e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = (e.reason && (e.reason.message || e.reason)) || "Unhandled promise rejection";
    if (!paused) pauseForError(String(msg));
  });

  // Public API for app
  let readyResolve;
  const readyPromise = new Promise((res) => (readyResolve = res));
  window.__LOADER = {
    setStatus,
    addTasks(n = 1) { totalTasks += (n | 0); },
    done(n = 1)    { for (let i = 0; i < n; i++) bump(); },
    appReady()     { try { readyResolve(); } catch {} }
  };

  // ---- Preload (fetch to surface 404/500 early) ---------------------------
  async function preloadOne(url) {
    const tStart = performance.now();
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok && res.type !== "opaque") throw new Error(`HTTP ${res.status} on ${url}`);
      if (res.body && res.body.getReader) {
        // stream to estimate bandwidth
        const r = res.body.getReader();
        let total = 0;
        for (;;) {
          const { done, value } = await r.read();
          if (done) break;
          total += value.byteLength;
          noteSize(value.byteLength);
        }
        log(`✓ ${url} (${(total/1024).toFixed(1)} KB, ${(performance.now()-tStart).toFixed(0)} ms)`);
      } else {
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
    setStatus("Preloading core");
    for (const url of CORE) {
      if (paused) return;
      // Keep relative module paths consistent: do not add leading slash.
      await preloadOne(url);
    }
  }

  // ---- Boot ---------------------------------------------------------------
  (async () => {
    try {
      setPct(2);
      setStatus("Starting");
      // Service worker (optional, non-blocking)
      if ("serviceWorker" in navigator) {
        Promise.race([
          navigator.serviceWorker.ready,
          new Promise((r) => setTimeout(r, 800))
        ]).catch(() => {});
      }

      await preloadAll();
      if (paused) return;

      setStatus("Launching");
      await import("./main.js"); // actual module execution
      bump(); // for the dynamic import itself

      setStatus("Waiting for first frame");
      await readyPromise;

      setStatus("Finalizing");
      setPct(100);
      root.classList.add("hide");
      setTimeout(() => root.remove(), 350);
    } catch (e) {
      if (!paused) pauseForError(e.message || String(e), e.stack);
    }
  })();
})();