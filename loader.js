/* ========================================================================== *
 *  FPVMC — AAA Loader (dark mode)
 *  … (unchanged preamble)
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
    './structures/trussframe.js', // ← added: ensure this file is fetched up-front
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
  /* … rest of loader.js unchanged … */
  `;
  document.head.appendChild(style);

  /* … everything else in loader.js stays exactly the same … */
})();