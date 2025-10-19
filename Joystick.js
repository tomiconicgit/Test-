export class Joystick {
    constructor(container, handle) {
        this.container = container;
        this.handle = handle;
        this.isActive = false;
        this.horizontal = 0; // -1 to 1
        this.vertical = 0;   // -1 to 1

        this.containerRect = this.container.getBoundingClientRect();
        this.handleRect = this.handle.getBoundingClientRect();
        this.radius = this.containerRect.width / 2;
        this.handleRadius = this.handleRect.width / 2;
        
        this.centerX = this.containerRect.left + this.radius;
        this.centerY = this.containerRect.top + this.radius;

        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('touchstart', this.onStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.onMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.onEnd.bind(this), { passive: false });
        window.addEventListener('resize', this.onResize.bind(this));
    }

    onStart(event) {
        event.preventDefault();
        this.isActive = true;
        this.onMove(event);
    }

    onMove(event) {
        if (!this.isActive) return;
        event.preventDefault();

        const touch = event.touches[0];
        let x = touch.clientX - this.centerX;
        let y = touch.clientY - this.centerY;
        
        const distance = Math.sqrt(x * x + y * y);

        if (distance > this.radius) {
            x = (x / distance) * this.radius;
            y = (y / distance) * this.radius;
        }

        this.handle.style.transform = `translate(${x}px, ${y}px)`;

        this.horizontal = x / this.radius;
        this.vertical = y / this.radius;
    }

    onEnd(event) {
        event.preventDefault();
        this.isActive = false;
        this.horizontal = 0;
        this.vertical = 0;
        this.handle.style.transform = `translate(0px, 0px)`;
    }
    
    onResize() {
        this.containerRect = this.container.getBoundingClientRect();
        this.handleRect = this.handle.getBoundingClientRect();
        this.radius = this.containerRect.width / 2;
        this.handleRadius = this.handleRect.width / 2;
        
        this.centerX = this.containerRect.left + this.radius;
        this.centerY = this.containerRect.top + this.radius;
    }
}

