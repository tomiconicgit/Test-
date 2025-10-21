// controller.js
export function createController() {
  const state = {
    look: { dx:0, dy:0 },
    move: { x:0, y:0 },
    _gp: null
  };

  window.addEventListener('gamepadconnected', e => state._gp = e.gamepad);
  window.addEventListener('gamepaddisconnected', () => state._gp = null);

  function applyDeadzone(v, dz=0.15){ return Math.abs(v) > dz ? v : 0; }

  state.update = (dt) => {
    state.look.dx = 0; state.look.dy = 0;
    state.move.x = 0;  state.move.y = 0;

    const gp = (navigator.getGamepads && navigator.getGamepads()[0]) || state._gp;
    if (gp) {
      const ax = gp.axes;
      // Left stick: move
      state.move.x = -applyDeadzone(ax[0] || 0); // strafe (invert to feel natural)
      state.move.y =  applyDeadzone(ax[1] || 0); // forward
      // Right stick: look
      state.look.dx += applyDeadzone(ax[2] || 0) * 250 * dt;
      state.look.dy += applyDeadzone(ax[3] || 0) * 250 * dt;
    }
  };

  state.resetLook = () => { state.look.dx = 0; state.look.dy = 0; };

  return state;
}