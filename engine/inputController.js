export class InputController {
    constructor(joystick) {
        this.touchJoystick = joystick;
        this.gamepad = null;
        this.look = { dx: 0, dy: 0 };
        this.movement = { x: 0, y: 0 }; // x: strafe, y: forward

        // Actions (will be true for one frame)
        this.place = false;
        this.remove = false;
        this.snap = false;
        this.toggleFly = false;
        this.flyUp = false;
        this.flyDown = false;
        this.rotate = false; // <-- ADD THIS

        // Internal state for button presses
        this._r2Pressed = false;
        this._l2Pressed = false;
        this._r1Pressed = false;
        this._l1Pressed = false; // <-- ADD THIS
        this._aPressed = false;
        this._lastAPressTime = 0;
        
        this._lookId = null;
        this._lastLook = { x: 0, y: 0 };
        this._initTouchLook();
        window.addEventListener('gamepadconnected', (e) => this.gamepad = e.gamepad);
        window.addEventListener('gamepaddisconnected', () => this.gamepad = null);
    }

    _initTouchLook() {
        window.addEventListener('pointerdown', e => {
            if (e.clientX > window.innerWidth * 0.5) {
                this._lookId = e.pointerId;
                this._lastLook.x = e.clientX;
                this._lastLook.y = e.clientY;
            }
        });
        window.addEventListener('pointermove', e => {
            if (e.pointerId !== this._lookId) return;
            this.look.dx += e.clientX - this._lastLook.x;
            this.look.dy += e.clientY - this._lastLook.y;
            this._lastLook.x = e.clientX;
            this._lastLook.y = e.clientY;
        });
        window.addEventListener('pointerup', e => { if (e.pointerId === this._lookId) this._lookId = null; });
    }
    
    update(dt) {
        // Reset single-frame actions
        this.place = this.remove = this.snap = this.toggleFly = this.rotate = false; // <-- ADD this.rotate

        // Prioritize gamepad if present
        if (navigator.getGamepads && navigator.getGamepads()[0]) {
            this.gamepad = navigator.getGamepads()[0];
            const deadzone = 0.15;

            // Movement
            const ax0 = this.gamepad.axes[0]; // Strafe
            const ax1 = this.gamepad.axes[1]; // Forward
            this.movement.x = Math.abs(ax0) > deadzone ? ax0 : 0;
            this.movement.y = Math.abs(ax1) > deadzone ? ax1 : 0;
            
            // Look
            const ax2 = this.gamepad.axes[2];
            const ax3 = this.gamepad.axes[3];
            this.look.dx += Math.abs(ax2) > deadzone ? ax2 * 250 * dt : 0;
            this.look.dy += Math.abs(ax3) > deadzone ? ax3 * 250 * dt : 0;

            // Actions
            if (this.gamepad.buttons[7].pressed && !this._r2Pressed) { this.place = true; } this._r2Pressed = this.gamepad.buttons[7].pressed;
            if (this.gamepad.buttons[6].pressed && !this._l2Pressed) { this.remove = true; } this._l2Pressed = this.gamepad.buttons[6].pressed;
            if (this.gamepad.buttons[5].pressed && !this._r1Pressed) { this.snap = true; } this._r1Pressed = this.gamepad.buttons[5].pressed;
            if (this.gamepad.buttons[0].pressed && !this._aPressed) { if (performance.now() - this._lastAPressTime < 300) { this.toggleFly = true; } this._lastAPressTime = performance.now(); } this._aPressed = this.gamepad.buttons[0].pressed;
            this.flyUp = this.gamepad.buttons[0].pressed;
            this.flyDown = this.gamepad.buttons[2].pressed;
            
            // --- ADD THIS BLOCK ---
            // L1 Button (Rotate)
            if (this.gamepad.buttons[4].pressed && !this._l1Pressed) { this.rotate = true; } this._l1Pressed = this.gamepad.buttons[4].pressed;
            // --- END OF BLOCK ---

        } else {
            // Fallback to touch controls
            this.movement.x = this.touchJoystick.axX;
            this.movement.y = this.touchJoystick.axY;
        }
    }

    // Call this after processing look input to reset it for the next frame
    resetLook() {
        this.look.dx = 0;
        this.look.dy = 0;
    }
}
