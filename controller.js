// controller.js — Backbone/iOS-safe polling + mappings
export function createController() {
  const state = {
    look: { dx:0, dy:0 },
    move: { x:0, y:0 },
    _gpIndex: 0
  };

  // Some iOS devices don’t emit gamepadconnected reliably. Poll anyway.
  window.addEventListener('gamepadconnected', e => { state._gpIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', () => { state._gpIndex = 0; });

  function dz(v, dead=0.10){ return Math.abs(v) > dead ? v : 0; }

  function readStick(axes, iX, iY) {
    const x = dz(axes[iX] ?? 0);
    const y = dz(axes[iY] ?? 0);
    return { x, y };
  }

  state.update = (dt) => {
    state.look.dx = 0; state.look.dy = 0;
    state.move.x = 0;  state.move.y = 0;

    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    const gp = pads.find(p => p && p.connected) || null;
    if (!gp || !gp.axes) return;

    const a = gp.axes;

    // Try standard mapping first (most iOS Backbone firmwares):
    // Left: 0,1  Right: 2,3
    let L = readStick(a, 0, 1);
    let R = readStick(a, 2, 3);

    // If right stick is dead on standard, try common WebKit alt mappings:
    if (Math.hypot(R.x, R.y) === 0) {
      // Some Safari builds report RX/RY at 4/5
      R = readStick(a, 4, 5);
    }
    if (Math.hypot(L.x, L.y) === 0 && a.length >= 6) {
      // Rare: left at 1/2 (seen on certain adapters)
      L = readStick(a, 1, 2);
    }

    // Apply (invert X on strafe to feel natural with our camera basis)
    state.move.x = -L.x;
    state.move.y =  L.y;

    // Scale look by dt; main.js multiplies by 250*dt, so keep units tiny here
    state.look.dx += R.x * 250 * dt;
    state.look.dy += R.y * 250 * dt;
  };

  state.resetLook = () => { state.look.dx = 0; state.look.dy = 0; };

  return state;
}