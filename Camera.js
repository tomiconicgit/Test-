export class CameraRig {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lon = -90;
        this.lat = 0;
        this.phi = 0;
        this.theta = 0;

        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onTouchStart(event) {
        const touch = event.touches[0];
        // Check if the touch is on the joystick
        if (touch.target.id === 'joystick-handle' || touch.target.id === 'joystick-container') return;
        event.preventDefault();
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    onTouchMove(event) {
        const touch = event.touches[0];
        // Check if the touch is on the joystick
        if (touch.target.id === 'joystick-handle' || touch.target.id === 'joystick-container') return;
        event.preventDefault();
        
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        this.lon += (this.touchStartX - touchX) * 0.2;
        // CORRECTED: Changed -= to += to invert vertical control. Swipe up now looks up.
        this.lat += (this.touchStartY - touchY) * 0.2;
        this.lat = Math.max(-85, Math.min(85, this.lat)); // Clamp vertical rotation

        this.touchStartX = touchX;
        this.touchStartY = touchY;
    }

    update() {
        this.phi = THREE.MathUtils.degToRad(90 - this.lat);
        this.theta = THREE.MathUtils.degToRad(this.lon);

        const target = new THREE.Vector3();
        // The target calculation determines the direction the camera is looking.
        // It points from the camera's position to a point on a large sphere around it.
        target.x = 500 * Math.sin(this.phi) * Math.cos(this.theta);
        target.y = 500 * Math.cos(this.phi);
        target.z = 500 * Math.sin(this.phi) * Math.sin(this.theta);
        
        // The camera looks at a point in the calculated direction.
        this.camera.lookAt(this.camera.position.clone().add(target));
    }
}


