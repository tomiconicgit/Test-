// Simple virtual joystick (returns .axX, .axY in [-1,1])
export class Joystick {
  constructor(rootEl) {
    this.root = rootEl;
    
    // Configurable sizes for easier maintenance
    const baseSize = 160;
    const knobSize = 64;
    this.center = { x: baseSize / 2, y: baseSize / 2 };
    this.knobStartPos = (baseSize - knobSize) / 2;
    this.maxRadius = (baseSize / 2) - (knobSize / 2); // Max distance knob center can travel

    this.knob = document.createElement('div');

    // Overhauled styles for a nicer look
    Object.assign(this.root.style, { 
      position:'relative', 
      borderRadius:'50%', 
      background:'rgba(0,0,0,0.25)', 
      border:'2px solid rgba(255,255,255,.1)',
      boxShadow: 'inset 0 0 15px rgba(0,0,0,.5)',
      backdropFilter: 'blur(5px)'
    });
    Object.assign(this.knob.style, { 
      position:'absolute', 
      width: `${knobSize}px`, 
      height: `${knobSize}px`, 
      borderRadius:'50%', 
      left: `${this.knobStartPos}px`, 
      top: `${this.knobStartPos}px`,
      background:'radial-gradient(circle at 50% 40%, rgba(200,200,200,.2) 0%, rgba(0,0,0,.3) 100%)', 
      border:'1px solid rgba(255,255,255,.2)',
      boxShadow: '0 5px 10px rgba(0,0,0,.2)'
    });
    this.root.appendChild(this.knob);

    this.pointerId = null;
    this.axX = 0; this.axY = 0;

    this.root.addEventListener('pointerdown', e => this.start(e));
    window.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.end(e));
    window.addEventListener('pointercancel', e => this.end(e));
  }

  start(e){ 
    if(this.pointerId!==null) return; 
    this.pointerId=e.pointerId; 
    this.root.setPointerCapture(e.pointerId); 
    this.updateKnob(e); 
  }
  move(e){ 
    if(e.pointerId!==this.pointerId) return; 
    this.updateKnob(e); 
  }
  end(e){ 
    if(e.pointerId!==this.pointerId) return; 
    this.root.releasePointerCapture(e.pointerId);
    this.pointerId=null; 
    this.axX=0; this.axY=0; 
    this.knob.style.transition = 'left .15s, top .15s'; // Animate return to center
    this.knob.style.left=`${this.knobStartPos}px`; 
    this.knob.style.top=`${this.knobStartPos}px`; 
    setTimeout(() => this.knob.style.transition = '', 150);
  }

  updateKnob(e){
    const rect = this.root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const r = Math.hypot(dx,dy);
    const maxR = this.maxRadius;
    const k = r > maxR ? maxR/r : 1; // Clamp distance to maxRadius
    const nx = dx * k;
    const ny = dy * k;
    
    this.knob.style.left = `${this.center.x + nx - (this.knob.offsetWidth / 2)}px`;
    this.knob.style.top  = `${this.center.y + ny - (this.knob.offsetHeight / 2)}px`;

    this.axX = nx / maxR; // right = +1
    this.axY = ny / maxR; // down  = +1
  }
}
