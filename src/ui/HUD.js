// src/ui/HUD.js
export function initHUD({ onPlace, onDig, onSelectBlock }) {
  const joy = document.getElementById('joy');
  const stick = document.getElementById('stick');
  const btnPlace = document.getElementById('btn-place');
  const btnDig = document.getElementById('btn-dig');
  const fps = document.getElementById('fps');

  btnPlace.addEventListener('touchstart', e=>{ e.preventDefault(); onPlace(); }, {passive:false});
  btnDig.addEventListener('touchstart',   e=>{ e.preventDefault(); onDig();   }, {passive:false});

  const sel = document.getElementById('block-select');
  const swatches = [
    { id: 1, name: 'Concrete', color: '#a8afb7' },
    { id: 2, name: 'Metal',    color: '#6b7988' },
  ];
  let current = 1;
  const render = () => {
    sel.innerHTML = '';
    for (const s of swatches) {
      const el = document.createElement('div');
      el.className = 'swatch' + (s.id===current ? ' active':'');
      el.style.background = s.color; el.title = s.name;
      const pick = ()=>{ current=s.id; onSelectBlock(current); render(); };
      el.addEventListener('touchstart', e=>{ e.preventDefault(); pick(); }, {passive:false});
      el.addEventListener('click', pick);
      sel.appendChild(el);
    }
  };
  render();

  return {
    joy, stick,
    setFPS: (t)=>{ fps.textContent = t; }
  };
}