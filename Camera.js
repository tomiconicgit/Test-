// File: Camera.js
export class CameraRig {
  constructor() {
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // >>> Brighter, more realistic output
    this.renderer.outputEncoding = THREE.sRGBEncoding;          // r128
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    document.body.appendChild(this.renderer.domElement);

    // Keep canvas behind UI & non-interactive so buttons/sliders work
    const cv = this.renderer.domElement;
    cv.style.position = 'fixed';
    cv.style.inset = '0';
    cv.style.zIndex = '0';
    cv.style.display = 'block';
    cv.style.pointerEvents = 'none';

    // Look controls state
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.lon = -90;
    this.lat = 0;
    this.phi = 0;
    this.theta = 0;
    this._mouseDragging = false;
    this._mx = 0;
    this._my = 0;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    // Touch look (ignore UI & joystick)
    document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove',  this.onTouchMove.bind(this),  { passive: false });

    // Mouse look (desktop)
    document.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    document.addEventListener('mouseup',   this.onMouseUp.bind(this),   false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ----- TOUCH -----
  onTouchStart(event) {
    const t = event.touches[0]?.target;
    if (t && (t.closest('#tower-ui') || t.closest('#joystick-container'))) return; // let UI handle
    event.preventDefault();
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  onTouchMove(event) {
    const t = event.touches[0]?.target;
    if (t && (t.closest('#tower-ui') || t.closest('#joystick-container'))) return; // let UI handle
    event.preventDefault();

    const touch = event.touches[0];
    this.lon += (this.touchStartX - touch.clientX) * 0.2;
    this.lat += (this.touchStartY - touch.clientY) * 0.2;
    this.lat = Math.max(-85, Math.min(85, this.lat));
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  // ----- MOUSE -----
  onMouseDown(e) {
    if (e.target.closest && (e.target.closest('#tower-ui') || e.target.closest('#joystick-container'))) return;
    this._mouseDragging = true;
    this._mx = e.clientX;
    this._my = e.clientY;
  }

  onMouseMove(e) {
    if (!this._mouseDragging) return;
    if (e.target.closest && (e.target.closest('#tower-ui') || e.target.closest('#joystick-container'))) return;

    const dx = e.clientX - this._mx;
    const dy = e.clientY - this._my;
    this.lon += (-dx) * 0.2;
    this.lat += (-dy) * 0.2;
    this.lat = Math.max(-85, Math.min(85, this.lat));
    this._mx = e.clientX;
    this._my = e.clientY;
  }

  onMouseUp() {
    this._mouseDragging = false;
  }

  // ----- UPDATE -----
  update() {
    this.phi = THREE.MathUtils.degToRad(90 - this.lat);
    this.theta = THREE.MathUtils.degToRad(this.lon);

    const target = new THREE.Vector3(
      500 * Math.sin(this.phi) * Math.cos(this.theta),
      500 * Math.cos(this.phi),
      500 * Math.sin(this.phi) * Math.sin(this.theta)
    );

    this.camera.lookAt(this.camera.position.clone().add(target));
  }
}