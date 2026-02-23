class InputController {
  constructor() {
    this.move = { x: 0, z: 0 }; // x: left/right, z: forward/backward
    this.look = { x: 0, y: 0 }; // x: horizontal look (yaw), y: vertical look (pitch)

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false
    };

    // Configuration
    this.lookSensitivity = 0.002;
    this.touchLookSensitivity = 0.004; // Slightly faster for touch
    this.paused = false;

    // Custom Cursor
    this.cursor = document.getElementById('cursor');
    this.cursorFollower = document.getElementById('cursor-follower');
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.followerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this._init();
  }

  tick(delta) {
    if (this.paused) return;

    // Note: Touch look is now direct drag, so no velocity integration needed here.

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
      this.keys.jump = false;
      this.keys.sprint = false;
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

    this.touches = new Map(); // identifier -> { startX, startY, lastX, lastY, type: 'left'|'right' }

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
      case 'Space': this.keys.jump = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.sprint = true; break;
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
      case 'Space': this.keys.jump = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.sprint = false; break;
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
        // Split screen: Left 30% for movement, Right 70% for look
        const splitX = window.innerWidth * 0.3;
        const type = touch.clientX < splitX ? 'left' : 'right';

        this.touches.set(touch.identifier, {
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastY: touch.clientY,
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
            // Delta for Drag (Right side)
            const moveDeltaX = touch.clientX - data.lastX;
            const moveDeltaY = touch.clientY - data.lastY;
            data.lastX = touch.clientX;
            data.lastY = touch.clientY;

            // Delta for Joystick (Left side - from start)
            const deltaX = touch.clientX - data.startX;
            const deltaY = touch.clientY - data.startY;

            // UI Feedback
            const ui = data.type === 'left' ? this.ui.left : this.ui.right;
            if (ui && ui.dot) {
                // For Left Joystick: Clamp to ring
                // For Right Drag: Also clamp for visual feedback, though input is unbound
                const maxDist = 50;
                const dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
                let moveX = deltaX;
                let moveY = deltaY;

                // Visual clamping for UI
                if (dist > maxDist) {
                    moveX = (deltaX / dist) * maxDist;
                    moveY = (deltaY / dist) * maxDist;
                }
                ui.dot.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
            }

            if (data.type === 'left') {
                // Move Joystick
                const maxDrag = 100;
                let x = deltaX / maxDrag;
                let z = deltaY / maxDrag;

                // Deadzone and Curve
                const deadzone = 0.15;
                const len = Math.sqrt(x*x + z*z);

                if (len < deadzone) {
                    x = 0;
                    z = 0;
                } else {
                    // Circular clamp
                    const clampedLen = Math.min(len, 1.0);

                    // Rescale 0..1 to remove deadzone jump
                    const normalizedLen = (clampedLen - deadzone) / (1.0 - deadzone);

                    // Direction
                    const dirX = x / len;
                    const dirZ = z / len;

                    // Apply Quadratic Curve for fine control
                    const curvedLen = normalizedLen * normalizedLen;

                    x = dirX * curvedLen;
                    z = dirZ * curvedLen;
                }

                this.move.x = x;
                this.move.z = -z;

            } else if (data.type === 'right') {
                // Drag Look (Direct Delta)
                // Drag Right (Positive X) -> Turn Right (Negative Yaw usually, but CameraRig adds.
                // Wait, _onMouseMove uses: look.x -= movementX. So positive movementX (Right) -> subtract -> Look Left?
                // Standard FPS: Mouse Right -> Rotate Right.
                // In CameraRig: camera.rotation.y = this.yaw.
                // If yaw increases, camera rotates left (CCW around Y)?
                // Three.js: Positive rotation around Y is CCW.
                // So to turn Right (CW), we need Decreasing Yaw.
                // So Mouse Right (+X) should Decrease Yaw.
                // _onMouseMove: look.x -= movementX. Correct.

                this.look.x -= moveDeltaX * this.touchLookSensitivity;
                this.look.y -= moveDeltaY * this.touchLookSensitivity;

                // Clamp pitch
                this.look.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.look.y));
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
            }
            // No need to reset look for Right side as it's not velocity based anymore

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
