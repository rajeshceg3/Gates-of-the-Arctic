class InputController {
  constructor() {
    this.move = { x: 0, z: 0 }; // Final combined move vector
    this.look = { x: 0, y: 0 }; // x: horizontal look (yaw), y: vertical look (pitch)

    // Internal state for mixing inputs
    this.moveKeys = { x: 0, z: 0 };
    this.moveTouch = { x: 0, z: 0 };

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
    this.touchLookSensitivity = 0.004; // Slightly faster for touch/drag
    this.joystickDeadzone = 0.2; // Generous deadzone (20%)
    this.touchSplitRatio = 0.3; // 30% left for joystick, 70% right for look

    this.paused = false;
    this.isMouseDown = false; // Track mouse button for drag-look fallback

    // Custom Cursor
    this.cursor = document.getElementById('cursor');
    this.cursorFollower = document.getElementById('cursor-follower');
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.followerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this._init();
  }

  tick(delta) {
    if (this.paused) return;

    // Cursor Follower Lerp (Desktop)
    if (this.cursorFollower && !('ontouchstart' in window)) {
        // Smooth lerp factor
        const lerpFactor = 10.0 * delta;
        this.followerPos.x += (this.mousePos.x - this.followerPos.x) * lerpFactor;
        this.followerPos.y += (this.mousePos.y - this.followerPos.y) * lerpFactor;

        this.cursorFollower.style.transform = `translate3d(${this.followerPos.x}px, ${this.followerPos.y}px, 0) translate(-50%, -50%)`;

        // Hide follower if pointer locked or generic hidden
        // Also hide if dragging (fallback mode) to reduce visual clutter
        if (document.pointerLockElement === document.body || this.cursor.classList.contains('hidden') || (this.isMouseDown && !this.paused)) {
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

      this.moveKeys = { x: 0, z: 0 };
      this.moveTouch = { x: 0, z: 0 };
      this._combineInput();

      this.isMouseDown = false;
    }
  }

  _init() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));

    // Mouse Events
    document.addEventListener('mousedown', () => {
        if (!this.paused) this.isMouseDown = true;
        // Hide cursor immediately on drag start
        if (this.cursor && !this.paused) this.cursor.classList.add('hidden');
    });
    document.addEventListener('mouseup', () => {
        this.isMouseDown = false;
        // Show cursor immediately on drag end (if not locked)
        if (this.cursor && document.pointerLockElement !== document.body) {
            this.cursor.classList.remove('hidden');
        }
    });

    // Mouse Look (Desktop)
    document.addEventListener('mousemove', (e) => {
      this._onMouseMove(e);
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;

      // Update custom cursor
      if (this.cursor) {
          // Hide cursor if locked OR if dragging (fallback look)
          if (document.pointerLockElement === document.body || (this.isMouseDown && !this.paused)) {
              this.cursor.classList.add('hidden');
          } else {
              this.cursor.classList.remove('hidden');
              // Use translate3d for GPU acceleration, include -50% to center
              this.cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
          }
      }
    });

    // Handle Pointer Lock Change
    document.addEventListener('pointerlockchange', () => {
      if (this.cursor) {
        if (document.pointerLockElement === document.body) {
          this.cursor.classList.add('hidden');
        } else {
          this.cursor.classList.remove('hidden');
        }
      }
      // Reset mouse down state on lock change to prevent stuck drag
      this.isMouseDown = false;
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

    document.addEventListener('click', (e) => {
      // Only request lock if not clicking a button/UI and not paused
      // Also check if we just finished a drag (mouseup triggers click) - if it was a drag, maybe don't lock immediately?
      // Standard behavior: click to lock.
      if (!this.paused && !e.target.closest('button') && !e.target.closest('#settings-btn')) {
          document.body.requestPointerLock();
      }
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
    // Calculate keyboard contribution
    this.moveKeys.z = Number(this.keys.forward) - Number(this.keys.backward);
    this.moveKeys.x = Number(this.keys.right) - Number(this.keys.left);

    this._combineInput();
  }

  _combineInput() {
    // Sum inputs
    let totalX = this.moveKeys.x + this.moveTouch.x;
    let totalZ = this.moveKeys.z + this.moveTouch.z;

    // Clamp magnitude to 1.0 to prevent super-speed when combining inputs
    const lenSq = totalX*totalX + totalZ*totalZ;
    if (lenSq > 1.0) {
        const len = Math.sqrt(lenSq);
        totalX /= len;
        totalZ /= len;
    }

    this.move.x = totalX;
    this.move.z = totalZ;
  }

  _onMouseMove(event) {
    if (this.paused) return;

    const isLocked = document.pointerLockElement === document.body;

    // Look logic: Either locked OR fallback drag (mouse down + not locked)
    if (isLocked || (this.isMouseDown && !isLocked)) {
      // Use standard look sensitivity for locked, touch sensitivity for drag fallback
      const sensitivity = isLocked ? this.lookSensitivity : this.touchLookSensitivity;

      this.look.x -= event.movementX * sensitivity;
      this.look.y -= event.movementY * sensitivity;

      // Clamp pitch
      this.look.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.look.y));
    }
  }

  _onTouchStart(event) {
    if (this.paused) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        // Split screen: Left 30% for movement, Right 70% for look
        const splitX = window.innerWidth * this.touchSplitRatio;
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

                const len = Math.sqrt(x*x + z*z);

                if (len < this.joystickDeadzone) {
                    x = 0;
                    z = 0;
                } else {
                    // Circular clamp
                    const clampedLen = Math.min(len, 1.0);

                    // Rescale 0..1 to remove deadzone jump
                    const normalizedLen = (clampedLen - this.joystickDeadzone) / (1.0 - this.joystickDeadzone);

                    // Direction
                    const dirX = x / len;
                    const dirZ = z / len;

                    // Apply Quadratic Curve for fine control (non-linear acceleration)
                    const curvedLen = normalizedLen * normalizedLen;

                    x = dirX * curvedLen;
                    z = dirZ * curvedLen;
                }

                // Update touch move vector
                this.moveTouch.x = x;
                this.moveTouch.z = -z;

                // Combine with potential keyboard input
                this._combineInput();

            } else if (data.type === 'right') {
                // Drag Look (Direct Delta)
                // Use touch sensitivity
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
                this.moveTouch.x = 0;
                this.moveTouch.z = 0;
                this._combineInput();
            }
            // No need to reset look for Right side

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
