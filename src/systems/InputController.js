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
    this.paused = false;

    this._init();
  }

  setPaused(isPaused) {
    this.paused = isPaused;
    if (isPaused) {
      // Force hide UI on pause
      if (this.ui && this.ui.container) {
        this.ui.container.classList.remove('visible');
        if (this.ui.ring) this.ui.ring.style.display = 'none';
        if (this.ui.dot) this.ui.dot.style.display = 'none';
      }
      // Reset move keys to prevent stuck movement
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this._updateMove();
    }
  }

  _init() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));

    // Mouse Look (Desktop)
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    document.addEventListener('click', () => {
      if (!this.paused) document.body.requestPointerLock();
    });

    // Touch (Mobile)
    document.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this._onTouchEnd(e));

    this.touchStart = { x: 0, y: 0 };
    this.touchOriginY = 0;

    // UI Feedback for Touch
    this.ui = {
      container: document.getElementById('touch-indicator'),
      ring: document.querySelector('#touch-indicator .ring'),
      dot: document.querySelector('#touch-indicator .dot')
    };
  }

  _onKeyDown(event) {
    if (this.paused) return;
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
    if (this.paused) return;
    if (document.pointerLockElement === document.body) {
      this.look.x -= event.movementX * this.lookSensitivity;
      this.look.y -= event.movementY * this.lookSensitivity;

      // Clamp pitch
      this.look.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.look.y));
    }
  }

  _onTouchStart(event) {
    if (this.paused) return;
    if (event.touches.length === 1) {
      const x = event.touches[0].clientX;
      const y = event.touches[0].clientY;

      this.touchStart.x = x;
      this.touchStart.y = y;
      this.touchOriginY = y;

      // Show UI
      if (this.ui.container) {
        this.ui.container.classList.add('visible');
        if (this.ui.ring) {
            this.ui.ring.style.display = 'block';
            this.ui.ring.style.left = x + 'px';
            this.ui.ring.style.top = y + 'px';
        }
        if (this.ui.dot) {
            this.ui.dot.style.display = 'block';
            this.ui.dot.style.left = x + 'px';
            this.ui.dot.style.top = y + 'px';
        }
      }
    }
  }

  _onTouchMove(event) {
    // Prevent scrolling
    event.preventDefault();
    if (this.paused) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.touchStart.x;

      // Calculate vertical delta from ORIGIN for movement (accumulated drag)
      const deltaY = touch.clientY - this.touchOriginY;

      // Update look based on incremental horizontal drag
      this.look.x -= deltaX * this.lookSensitivity * 2;

      // Accumulated vertical drag for movement
      // Map deltaY to speed (-1 to 1) with deadzone
      const threshold = 30; // Deadzone in pixels
      const maxDrag = 150; // Pixels for full speed

      if (Math.abs(deltaY) < threshold) {
        this.move.z = 0;
      } else {
        // Normalize speed (0 to 1)
        let speed = (Math.abs(deltaY) - threshold) / (maxDrag - threshold);
        speed = Math.min(speed, 1.0);

        // Direction: Drag Up (negative deltaY) -> Forward (+z for CameraRig logic)
        // Drag Down (positive deltaY) -> Backward (-z)
        if (deltaY < 0) {
            this.move.z = speed;
        } else {
            this.move.z = -speed;
        }
      }

      // Update touchStart for incremental look calculation
      this.touchStart.x = touch.clientX;
      this.touchStart.y = touch.clientY;

      // Update UI Dot Position
      if (this.ui.dot) {
          this.ui.dot.style.left = touch.clientX + 'px';
          this.ui.dot.style.top = touch.clientY + 'px';
      }
    }
  }

  _onTouchEnd(event) {
    this.move.z = 0;

    // Hide UI
    if (this.ui.container) {
        this.ui.container.classList.remove('visible');
        if (this.ui.ring) this.ui.ring.style.display = 'none';
        if (this.ui.dot) this.ui.dot.style.display = 'none';
    }
  }
}

export { InputController };
