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

    // Mobile Look Velocity (Joystick Rate)
    this.lookVelocity = { x: 0, y: 0 };

    // Custom Cursor
    this.cursor = document.getElementById('cursor');
    this.cursorFollower = document.getElementById('cursor-follower');
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.followerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this._init();
  }

  tick(delta) {
    if (this.paused) return;

    // 1. Integrate Mobile Look Velocity
    if (this.lookVelocity.x !== 0 || this.lookVelocity.y !== 0) {
      this.look.x -= this.lookVelocity.x * delta;
      this.look.y -= this.lookVelocity.y * delta;

      // Clamp pitch
      this.look.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.look.y));
    }

    // 2. Cursor Follower Lerp (Desktop)
    if (this.cursorFollower && !('ontouchstart' in window)) {
        // Smooth lerp factor
        const lerpFactor = 10.0 * delta;
        this.followerPos.x += (this.mousePos.x - this.followerPos.x) * lerpFactor;
        this.followerPos.y += (this.mousePos.y - this.followerPos.y) * lerpFactor;

        this.cursorFollower.style.transform = `translate3d(${this.followerPos.x}px, ${this.followerPos.y}px, 0) translate(-50%, -50%)`;

        // Hide follower if pointer locked or generic hidden
        if (document.pointerLockElement === document.body || this.cursor.classList.contains('hidden')) {
            this.cursorFollower.style.opacity = '0';
        } else {
            this.cursorFollower.style.opacity = '1';
        }
    }
  }

  setPaused(isPaused) {
    this.paused = isPaused;
    if (isPaused) {
      // Force hide UI on pause
      if (this.ui) {
        if (this.ui.left && this.ui.left.container) this.ui.left.container.classList.remove('visible');
        if (this.ui.right && this.ui.right.container) this.ui.right.container.classList.remove('visible');
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
    document.addEventListener('mousemove', (e) => {
      this._onMouseMove(e);
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;

      // Update custom cursor
      if (this.cursor && document.pointerLockElement !== document.body) {
        this.cursor.classList.remove('hidden');
        // Use translate3d for GPU acceleration, include -50% to center
        this.cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    });

    // Hide cursor on pointer lock
    document.addEventListener('pointerlockchange', () => {
      if (this.cursor) {
        if (document.pointerLockElement === document.body) {
          this.cursor.classList.add('hidden');
        } else {
          this.cursor.classList.remove('hidden');
        }
      }
    });

    // Hover effects for buttons
    const buttons = document.querySelectorAll('button, #settings-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if(this.cursor) this.cursor.classList.add('active');
        if(this.cursorFollower) this.cursorFollower.classList.add('active');
      });
      btn.addEventListener('mouseleave', () => {
        if(this.cursor) this.cursor.classList.remove('active');
        if(this.cursorFollower) this.cursorFollower.classList.remove('active');
      });
    });

    document.addEventListener('click', () => {
      if (!this.paused) document.body.requestPointerLock();
    });

    // Touch (Mobile)
    document.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this._onTouchEnd(e));

    this.touches = new Map(); // identifier -> { startX, startY, type: 'left'|'right' }

    // UI Feedback for Touch
    this.ui = {
      left: {
        container: document.getElementById('touch-left'),
        ring: document.querySelector('#touch-left .ring'),
        dot: document.querySelector('#touch-left .dot')
      },
      right: {
        container: document.getElementById('touch-right'),
        ring: document.querySelector('#touch-right .ring'),
        dot: document.querySelector('#touch-right .dot')
      }
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

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const halfWidth = window.innerWidth / 2;
        const type = touch.clientX < halfWidth ? 'left' : 'right';

        this.touches.set(touch.identifier, {
            startX: touch.clientX,
            startY: touch.clientY,
            type: type
        });

        // UI Feedback
        const ui = type === 'left' ? this.ui.left : this.ui.right;
        if (ui && ui.container) {
            ui.container.classList.remove('hidden');
            // Force reflow
            void ui.container.offsetWidth;
            ui.container.classList.add('visible');
            ui.container.style.left = touch.clientX + 'px';
            ui.container.style.top = touch.clientY + 'px';
            // Reset dot
            if (ui.dot) ui.dot.style.transform = `translate(-50%, -50%)`;
        }
    }
  }

  _onTouchMove(event) {
    event.preventDefault(); // Prevent scrolling
    if (this.paused) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const data = this.touches.get(touch.identifier);

        if (data) {
            const deltaX = touch.clientX - data.startX;
            const deltaY = touch.clientY - data.startY;
            const maxDrag = 100; // Pixels for full speed

            // UI Feedback
            const ui = data.type === 'left' ? this.ui.left : this.ui.right;
            if (ui && ui.dot) {
                // Clamp dot movement to ring radius approx (50px radius for 100px ring)
                const maxDist = 50;
                const dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
                let moveX = deltaX;
                let moveY = deltaY;
                if (dist > maxDist) {
                    moveX = (deltaX / dist) * maxDist;
                    moveY = (deltaY / dist) * maxDist;
                }
                ui.dot.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
            }

            if (data.type === 'left') {
                // Move Joystick
                // Normalize -1 to 1
                const x = Math.max(-1, Math.min(1, deltaX / maxDrag));
                const z = Math.max(-1, Math.min(1, deltaY / maxDrag));

                this.move.x = x;
                this.move.z = -z;

            } else if (data.type === 'right') {
                // Look Joystick (Rate)
                const sensitivity = 2.0;

                // Normalize -1 to 1
                const x = Math.max(-1, Math.min(1, deltaX / maxDrag));
                const y = Math.max(-1, Math.min(1, deltaY / maxDrag));

                // Drag Right (Positive X) -> Turn Right (Negative Rotation usually)
                this.lookVelocity.x = x * sensitivity;

                // Drag Down (Positive Y) -> Look Down (Negative Pitch)
                this.lookVelocity.y = y * sensitivity;
            }
        }
    }
  }

  _onTouchEnd(event) {
     for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const data = this.touches.get(touch.identifier);

        if (data) {
            if (data.type === 'left') {
                this.move.x = 0;
                this.move.z = 0;
            } else if (data.type === 'right') {
                this.lookVelocity.x = 0;
                this.lookVelocity.y = 0;
            }
            this.touches.delete(touch.identifier);

            // Hide UI
            const ui = data.type === 'left' ? this.ui.left : this.ui.right;
            if (ui && ui.container) {
                ui.container.classList.remove('visible');
            }
        }
     }
  }
}

export { InputController };
