onTouchStart(event) {
    const touch = event.touches[0];
    const t = touch.target;

    // Ignore touches on UI controls (tower panel + joystick)
    if (t.closest('#tower-ui') || t.closest('#joystick-container')) return;

    event.preventDefault();
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
}

onTouchMove(event) {
    const touch = event.touches[0];
    const t = touch.target;

    // Ignore touches on UI controls (tower panel + joystick)
    if (t.closest('#tower-ui') || t.closest('#joystick-container')) return;

    event.preventDefault();

    const touchX = touch.clientX;
    const touchY = touch.clientY;

    this.lon += (this.touchStartX - touchX) * 0.2;
    this.lat += (this.touchStartY - touchY) * 0.2;
    this.lat = Math.max(-85, Math.min(85, this.lat));

    this.touchStartX = touchX;
    this.touchStartY = touchY;
}