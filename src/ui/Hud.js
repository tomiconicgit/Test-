// src/ui/HUD.js
export function initHUD({ onPlace, onDig, onSelectBlock, currentBlockGetter }) {
  const joy = document.getElementById('joy');
  const stick = document.getElementById('stick');
  const btnPlace = document.getElementById('btn-place');
  const btnDig = document.getElementById('btn-dig');
  const fps = document.getElementById('fps');

  btnPlace.addEventListener('touchstart', (e)=>{ e.preventDefault(); onPlace(); }, {passive:false});
  btnDig.addEventListener('touchstart',   (e)=>{ e.preventDefault(); onDig();   }, {passive:false});

  // Block selector (two swatches)
  const sel = document.getElementById('block-select');
  const swatches = [
    { id: 1, name: 'Concrete', color: '#a8afb7' },
    { id: 2, name: 'Metal',    color: '#6b7988' },
  ];
  let current = 1;
  const renderSel = () => {
    sel.innerHTML = '';
    for (const s of swatches) {
      const el = document.createElement('div');
      el.className = 'swatch' + (s.id===current?' active':'');
      el.style.background = s.color;
      el.title = s.name;
      el.addEventListener('touchstart', (e)=>{ e.preventDefault(); current = s.id; onSelectBlock(current); renderSel(); }, {passive:false});
      el.addEventListener('click', (e)=>{ current = s.id; onSelectBlock(current); renderSel(); });
      sel.appendChild(el);
    }
  };
  renderSel();

  return {
    joy, stick, fps,
    setFPS: (t)=>fps.textContent = t,
  };
}