// touchcontrols.js — bottom-left fixed joystick for move + screen-drag look
export function createTouchControls() {
  const state = {
    move: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    _lookId: null,
    _lastLookX: 0,
    _lastLookY: 0
  };

  // --- UI ---
  const root = document.createElement('div');
  root.id = 'touch-joystick';
  const knob = document.createElement('div');
  knob.id = 'touch-joystick-knob';
  root.appendChild(knob);
  document.body.appendChild(root);

  const css = document.createElement('style');
  css.textContent = `
    #touch-joystick{
      position:fixed; left:20px; bottom:20px; z-index:900;
      width:140px; height:140px; border-radius:50%;
      background:rgba(0,0,0,.28); border:1px solid rgba(255,255,255,.15);
      backdrop-filter: blur(6px);
      touch-action:none;
    }
    #touch-joystick-knob{
      position:absolute; width:64px; height:64px; border-radius:50%;
      left:38px; top:38px; /* centered in 140px base */
      background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2);
      box-shadow: 0 6px 14px rgba(0,0,0,.25);
      touch-action:none;
    }
  `;
  document.head.appendChild(css);

  const BASE = 140;
  const KNOB = 64;
  const center = { x: BASE/2, y: BASE/2 };
  const maxR = (BASE - KNOB) / 2;

  let joyId = null;

  // Joystick pointer
  root.addEventListener('pointerdown', (e) => {
    if (joyId !== null) return;
    joyId = e.pointerId;
    root.setPointerCapture(joyId);
    updateKnob(e);
  });

  root.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    updateKnob(e);
  });

  const resetKnob = () => {
    knob.style.transition = 'left .12s, top .12s';
    knob.style.left = `${center.x - KNOB/2}px`;
    knob.style.top  = `${center.y - KNOB/2}px`;
    state.move.x = 0; state.move.y = 0;
    setTimeout(() => { knob.style.transition = ''; }, 130);
  };

  root.addEventListener('pointerup', (e) => {
    if (e.pointerId !== joyId) return;
    root.releasePointerCapture(joyId);
    joyId = null;
    resetKnob();
  });
  root.addEventListener('pointercancel', () => { joyId = null; resetKnob(); });

  function updateKnob(e) {
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - center.x;
    const dy = y - center.y;
    const r = Math.hypot(dx, dy);
    const k = r > maxR ? maxR / r : 1;
    const nx = dx * k, ny = dy * k;

    knob.style.left = `${center.x + nx - KNOB/2}px`;
    knob.style.top  = `${center.y + ny - KNOB/2}px`;

    // Movement: strafe = x; **UP should be forward** => invert Y
    state.move.x =  nx / maxR;   // [-1..1]
    state.move.y = -ny / maxR;   // invert so up = +forward
  }

  // --- Touch look: anywhere that's NOT the joystick ---
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#touch-joystick') || e.target.closest('.hud-btn')) return;
    if (joyId && e.pointerId === joyId) return;
    if (state._lookId !== null) return;
    state._lookId = e.pointerId;
    state._lastLookX = e.clientX;
    state._lastLookY = e.clientY;
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== state._lookId) return;
    state.look.dx += (e.clientX - state._lastLookX);
    state.look.dy += (e.clientY - state._lastLookY);
    state._lastLookX = e.clientX;
    state._lastLookY = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerId !== state._lookId) return;
    state._lookId = null;
  });

  state.resetLook = () => { state.look.dx = 0; state.look.dy = 0; };

  return state;
}