class InputController {
  constructor() {
    this.move = { x: 0, z: 0 }; // x: left/right, z: forward/backward
    this.look = { x: 0, y: 0 }; // x: horizontal look (yaw), y: vertical look (pitch)

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    // Configuration
    this.lookSensitivity = 0.002;

    this._init();
  }

  _init() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));

    // Mouse Look (Desktop)
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    document.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    // Touch (Mobile)
    document.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this._onTouchEnd(e));

    this.touchStart = { x: 0, y: 0 };
    this.touchStartOrigin = { x: 0, y: 0 };
  }

  _onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.keys.forward = true; break;
      case 'ArrowLeft':
      case 'KeyA': this.keys.left = true; break;
      case 'ArrowDown':
      case 'KeyS': this.keys.backward = true; break;
      case 'ArrowRight':
      case 'KeyD': this.keys.right = true; break;
    }
    this._updateMove();
  }

  _onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.keys.forward = false; break;
      case 'ArrowLeft':
      case 'KeyA': this.keys.left = false; break;
      case 'ArrowDown':
      case 'KeyS': this.keys.backward = false; break;
      case 'ArrowRight':
      case 'KeyD': this.keys.right = false; break;
    }
    this._updateMove();
  }

  _updateMove() {
    this.move.z = Number(this.keys.forward) - Number(this.keys.backward);
    this.move.x = Number(this.keys.right) - Number(this.keys.left);
  }

  _onMouseMove(event) {
    if (document.pointerLockElement === document.body) {
      this.look.x -= event.movementX * this.lookSensitivity;
      this.look.y -= event.movementY * this.lookSensitivity;

      // Clamp pitch
      this.look.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.look.y));
    }
  }

  _onTouchStart(event) {
    if (event.touches.length === 1) {
      this.touchStart.x = event.touches[0].clientX;
      this.touchStart.y = event.touches[0].clientY;
      this.touchStartOrigin.x = event.touches[0].clientX;
      this.touchStartOrigin.y = event.touches[0].clientY;
    }
  }

  _onTouchMove(event) {
    // Prevent scrolling
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.touchStart.x;
      // Use accumulative delta for movement
      const totalDeltaY = touch.clientY - this.touchStartOrigin.y;

      // Update look based on drag (incremental)
      this.look.x -= deltaX * this.lookSensitivity * 2;

      // Simple forward drift based on vertical drag distance from origin
      // If dragging up (negative deltaY), move forward
      const threshold = 50;
      if (totalDeltaY < -threshold) {
        this.move.z = 1;
      } else if (totalDeltaY > threshold) {
        this.move.z = -1;
      } else {
        this.move.z = 0;
      }

      this.touchStart.x = touch.clientX;
      this.touchStart.y = touch.clientY;
    }
  }

  _onTouchEnd(event) {
    this.move.z = 0;
  }
}

export { InputController };
