// menu.js — minimal hamburger with dropdown (Dig Tool)
export function createMenu({ onDigTool }) {
  const btn = document.createElement('button');
  btn.id = 'menu-btn';
  btn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor"/>
      <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/>
      <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor"/>
    </svg>
  `;
  const panel = document.createElement('div');
  panel.id = 'menu-panel';
  panel.innerHTML = `<button id="menu-dig">Dig Tool</button>`;
  panel.style.display = 'none';

  document.body.append(btn, panel);

  const css = document.createElement('style');
  css.textContent = `
    #menu-btn{
      position:fixed;top:16px;left:16px;z-index:1000;
      width:42px;height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.2);
      background:rgba(20,22,25,.6);backdrop-filter:blur(8px);color:#eaeaea;display:grid;place-items:center;
    }
    #menu-panel{
      position:fixed;top:64px;left:16px;z-index:1000;min-width:160px;
      background:rgba(20,22,25,.9);border:1px solid rgba(255,255,255,.18);border-radius:12px;backdrop-filter:blur(8px);
      padding:8px;display:flex;flex-direction:column;gap:6px;
    }
    #menu-panel button{
      padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.2);
      background:rgba(35,37,41,.9);color:#eaeaea;text-align:left;font-weight:600;cursor:pointer;
    }
    #menu-panel button:active{ transform:translateY(1px); }
  `;
  document.head.appendChild(css);

  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('menu-dig').addEventListener('click', () => {
    panel.style.display = 'none';
    onDigTool?.();
  });

  return { open:()=>panel.style.display='block', close:()=>panel.style.display='none' };
}