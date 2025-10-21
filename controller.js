// controller.js — Backbone/iOS-safe polling + buttons (B, X, R2)
export function createController() {
  const state = {
    look: { dx:0, dy:0 },
    move: { x:0, y:0 },
    // edge-triggered buttons:
    bPressed:false, xPressed:false, r2Pressed:false,
    // internals
    _prev:{ b:false, x:false, r2:false }
  };

  function dz(v, d=0.10){ return Math.abs(v)>d ? v : 0; }
  function readStick(a, ix, iy){ return { x: dz(a[ix] ?? 0), y: dz(a[iy] ?? 0) }; }

  state.update = (dt) => {
    state.look.dx = 0; state.look.dy = 0;
    state.move.x = 0;  state.move.y = 0;
    state.bPressed = state.xPressed = state.r2Pressed = false;

    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    const gp = pads.find(p => p && p.connected) || null;
    if (!gp) return;

    const a = gp.axes || [];
    // sticks: try 0/1 and 2/3 first
    let L = readStick(a, 0, 1);
    let R = readStick(a, 2, 3);
    if (Math.hypot(R.x,R.y)===0 && a.length>=6) R = readStick(a, 4, 5);
    if (Math.hypot(L.x,L.y)===0 && a.length>=3) L = readStick(a, 1, 2);

    state.move.x = -L.x; // strafe invert to match camera basis
    state.move.y =  L.y;

    state.look.dx += R.x * 250 * dt;
    state.look.dy += R.y * 250 * dt;

    // buttons (standard mapping): A(0), B(1), X(2), Y(3), L2(6), R2(7)
    const bNow  = !!(gp.buttons?.[1]?.pressed);
    const xNow  = !!(gp.buttons?.[2]?.pressed);
    const r2Now = !!(gp.buttons?.[7]?.pressed);

    state.bPressed  = bNow  && !state._prev.b;
    state.xPressed  = xNow  && !state._prev.x;
    state.r2Pressed = r2Now && !state._prev.r2;

    state._prev = { b:bNow, x:xNow, r2:r2Now };
  };

  state.resetLook = () => { state.look.dx = 0; state.look.dy = 0; };

  return state;
}