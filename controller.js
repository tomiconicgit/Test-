// controller.js — Backbone/iOS-safe polling + edges/holds for Build/Dig
export function createController() {
  const state = {
    look: { dx:0, dy:0 },
    move: { x:0, y:0 },

    // edge-triggered buttons:
    bPressed:false, xPressed:false, yPressed:false, r2Pressed:false,
    l2Pressed:false, l1Pressed:false, r1Pressed:false, aDouble:false,

    // holds:
    aHold:false, xHold:false,

    // internals
    _prev:{ b:false, x:false, y:false, r2:false, l2:false, l1:false, r1:false, a:false },
    _lastATime:0
  };

  function dz(v, d=0.10){ return Math.abs(v)>d ? v : 0; }
  function readStick(a, ix, iy){ return { x: dz(a[ix] ?? 0), y: dz(a[iy] ?? 0) }; }

  state.update = (dt) => {
    state.look.dx = 0; state.look.dy = 0;
    state.move.x = 0;  state.move.y = 0;

    state.bPressed = state.xPressed = state.yPressed = state.r2Pressed =
    state.l2Pressed = state.l1Pressed = state.r1Pressed = state.aDouble = false;

    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    const gp = pads.find(p => p && p.connected) || null;
    if (!gp) { state.aHold = state.xHold = false; return; }

    const a = gp.axes || [];
    // sticks: try 0/1 and 2/3 first; fallback to 4/5 or 1/2 if needed
    let L = readStick(a, 0, 1);
    let R = readStick(a, 2, 3);
    if (Math.hypot(R.x,R.y)===0 && a.length>=6) R = readStick(a, 4, 5);
    if (Math.hypot(L.x,L.y)===0 && a.length>=3) L = readStick(a, 1, 2);

    state.move.x = -L.x; // strafe invert to match camera basis
    state.move.y =  L.y;

    state.look.dx += R.x * 250 * dt;
    state.look.dy += R.y * 250 * dt;

    // buttons (standard mapping): A(0), B(1), X(2), Y(3), L1(4), R1(5), L2(6), R2(7)
    const aNow  = !!(gp.buttons?.[0]?.pressed);
    const bNow  = !!(gp.buttons?.[1]?.pressed);
    const xNow  = !!(gp.buttons?.[2]?.pressed);
    const yNow  = !!(gp.buttons?.[3]?.pressed);
    const l1Now = !!(gp.buttons?.[4]?.pressed);
    const r1Now = !!(gp.buttons?.[5]?.pressed);
    const l2Now = !!(gp.buttons?.[6]?.pressed);
    const r2Now = !!(gp.buttons?.[7]?.pressed);

    // edges
    state.bPressed  = bNow  && !state._prev.b;
    state.xPressed  = xNow  && !state._prev.x;
    state.yPressed  = yNow  && !state._prev.y;
    state.l1Pressed = l1Now && !state._prev.l1;
    state.r1Pressed = r1Now && !state._prev.r1;
    state.l2Pressed = l2Now && !state._prev.l2;
    state.r2Pressed = r2Now && !state._prev.r2;

    // double-tap A (<=300ms)
    state.aDouble = false;
    if (aNow && !state._prev.a) {
      const now = performance.now();
      if (now - state._lastATime < 300) state.aDouble = true;
      state._lastATime = now;
    }

    // holds
    state.aHold = aNow;
    state.xHold = xNow;

    state._prev = { a:aNow, b:bNow, x:xNow, y:yNow, l1:l1Now, r1:r1Now, l2:l2Now, r2:r2Now };
  };

  state.resetLook = () => { state.look.dx = 0; state.look.dy = 0; };

  return state;
}