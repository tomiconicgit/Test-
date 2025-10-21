// controller.js — strict mapping; higher right-stick sensitivity for look
export function createController() {
  const state = {
    look: { dx: 0, dy: 0 },
    move: { x: 0, y: 0 },

    // edge-triggered
    bPressed:false, xPressed:false, yPressed:false,
    l1Pressed:false, r1Pressed:false, l2Pressed:false, r2Pressed:false,
    aDouble:false,

    // holds
    aHold:false, xHold:false,

    // internals
    _prev:{ a:false, b:false, x:false, y:false, l1:false, r1:false, l2:false, r2:false },
    _lastATime:0
  };

  const DEADZONE = 0.10;
  const LOOK_SENS_PX = 360; // ↑ was 250 — snappier right-stick look

  const dz = v => (Math.abs(v) > DEADZONE ? v : 0);

  state.update = (dt) => {
    state.look.dx = 0; state.look.dy = 0;
    state.move.x = 0;  state.move.y = 0;

    state.bPressed = state.xPressed = state.yPressed =
    state.l1Pressed = state.r1Pressed = state.l2Pressed = state.r2Pressed =
    state.aDouble = false;

    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    const gp = pads.find(p => p && p.connected) || null;
    if (!gp) { state.aHold = state.xHold = false; return; }

    // Standard mapping only
    const ax = gp.axes || [];
    const LX = dz(ax[0] ?? 0);
    const LY = dz(ax[1] ?? 0);
    const RX = dz(ax[2] ?? 0);
    const RY = dz(ax[3] ?? 0);

    // Left stick = movement only
    state.move.x = -LX;
    state.move.y =  LY;

    // Right stick = look only
    state.look.dx += RX * LOOK_SENS_PX * dt;
    state.look.dy += RY * LOOK_SENS_PX * dt;

    // Buttons (A,B,X,Y,L1,R1,L2,R2)
    const aNow  = !!(gp.buttons?.[0]?.pressed);
    const bNow  = !!(gp.buttons?.[1]?.pressed);
    const xNow  = !!(gp.buttons?.[2]?.pressed);
    const yNow  = !!(gp.buttons?.[3]?.pressed);
    const l1Now = !!(gp.buttons?.[4]?.pressed);
    const r1Now = !!(gp.buttons?.[5]?.pressed);
    const l2Now = !!(gp.buttons?.[6]?.pressed);
    const r2Now = !!(gp.buttons?.[7]?.pressed);

    state.bPressed  = bNow  && !state._prev.b;
    state.xPressed  = xNow  && !state._prev.x;
    state.yPressed  = yNow  && !state._prev.y;
    state.l1Pressed = l1Now && !state._prev.l1;
    state.r1Pressed = r1Now && !state._prev.r1;
    state.l2Pressed = l2Now && !state._prev.l2;
    state.r2Pressed = r2Now && !state._prev.r2;

    // Double-tap A (≤300ms)
    state.aDouble = false;
    if (aNow && !state._prev.a) {
      const now = performance.now();
      if (now - state._lastATime < 300) state.aDouble = true;
      state._lastATime = now;
    }

    // Holds
    state.aHold = aNow;
    state.xHold = xNow;

    state._prev = { a:aNow, b:bNow, x:xNow, y:yNow, l1:l1Now, r1:r1Now, l2:l2Now, r2:r2Now };
  };

  state.resetLook = () => { state.look.dx = 0; state.look.dy = 0; };

  return state;
}