// Simple virtual joystick (returns .axX, .axY in [-1,1])
export class Joystick {
  constructor(rootEl) {
    this.root = rootEl;
    this.center = { x: 70, y: 70 };
    this.knob = document.createElement('div');
    Object.assign(this.root.style, { position:'relative', borderRadius:'50%', background:'rgba(0,0,0,.3)', border:'1px solid rgba(255,255,255,.15)' });
    Object.assign(this.knob.style, { position:'absolute', width:'56px', height:'56px', borderRadius:'50%', left:'42px', top:'42px',
      background:'rgba(0,0,0,.6)', border:'1px solid rgba(255,255,255,.3)' });
    this.root.appendChild(this.knob);

    this.pointerId = null;
    this.axX = 0; this.axY = 0;

    this.root.addEventListener('pointerdown', e => this.start(e));
    window.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.end(e));
    window.addEventListener('pointercancel', e => this.end(e));
  }
  start(e){ if(this.pointerId!==null) return; this.pointerId=e.pointerId; this.updateKnob(e); }
  move(e){ if(e.pointerId!==this.pointerId) return; this.updateKnob(e); }
  end(e){ if(e.pointerId!==this.pointerId) return; this.pointerId=null; this.axX=0; this.axY=0; this.knob.style.left='42px'; this.knob.style.top='42px'; }

  updateKnob(e){
    const rect = this.root.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - this.center.x, dy = y - this.center.y;
    const r = Math.hypot(dx,dy); const maxR = 56;
    const k = r>maxR ? maxR/r : 1;
    const nx = dx*k, ny = dy*k;
    this.knob.style.left = `${this.center.x + nx - 28}px`;
    this.knob.style.top  = `${this.center.y + ny - 28}px`;
    this.axX = nx / maxR;      // right = +1
    this.axY = ny / maxR;      // down  = +1
  }
}