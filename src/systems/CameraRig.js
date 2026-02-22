import { Vector3, Raycaster } from 'three';

class CameraRig {
  constructor(camera, input, scene) {
    this.camera = camera;
    this.input = input;
    this.scene = scene;

    this.raycaster = new Raycaster();
    this.raycaster.ray.direction.set(0, -1, 0);

    // Physics/Movement params
    this.velocity = new Vector3();
    this.maxSpeed = 1.8; // slow walking speed (1.8m/s)
    this.accelerationSmoothing = 2.0; // Lower = more inertia (calm start)
    this.dampingSmoothing = 4.0; // Higher = quicker stop (responsive)

    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;

    // Physics State
    this.currentHeight = 1.7;
    this.verticalVelocity = 0;
    this.isGrounded = false;

    // Constants
    this.JUMP_FORCE = 5.0;
    this.GRAVITY = -15.0; // Slightly stronger gravity for snappier feel
    this.SPRINT_MULTIPLIER = 2.5; // Distinct sprint

    // Head Bob & Breathing
    this.headBobTimer = 0;
    this.breathingTimer = 0;

    // Physical Presence
    this.landingOffset = 0;
    this.lastGroundY = 0;
    this.sway = 0;
  }

  tick(delta) {
    // 1. Rotation (Smooth look)
    const targetPitch = this.input.look.y;
    const targetYaw = this.input.look.x;

    const lookSmoothness = 10.0;
    const yawDiff = targetYaw - this.yaw;

    this.pitch += (targetPitch - this.pitch) * lookSmoothness * delta;
    this.yaw += yawDiff * lookSmoothness * delta;

    // Roll (Bank into turn)
    const targetRoll = yawDiff * 10.0;
    const maxRoll = 0.05;
    const clampedRoll = Math.max(-maxRoll, Math.min(maxRoll, targetRoll));

    this.roll += (clampedRoll - this.roll) * 5.0 * delta;
    this.sway += (yawDiff * -5.0 - this.sway) * 2.0 * delta;

    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.z = this.roll + this.sway * 0.5;

    // 2. Movement
    const moveForward = this.input.move.z;
    const moveRight = this.input.move.x;

    // Sprint logic
    const currentMaxSpeed = this.maxSpeed * (this.input.keys.sprint ? this.SPRINT_MULTIPLIER : 1.0);

    const forwardDir = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), this.yaw);
    const rightDir = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), this.yaw);

    const targetVelocity = new Vector3();
    targetVelocity.addScaledVector(forwardDir, moveForward);
    targetVelocity.addScaledVector(rightDir, moveRight);

    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize();
    }

    targetVelocity.multiplyScalar(currentMaxSpeed);

    // Apply different smoothing for starting vs stopping
    const isStopping = targetVelocity.lengthSq() < 0.001;
    const smoothFactor = isStopping ? this.dampingSmoothing : this.accelerationSmoothing;

    this.velocity.lerp(targetVelocity, smoothFactor * delta);

    // Update Timers
    const speed = this.velocity.length();
    // Only bob if grounded
    if (this.isGrounded) {
        this.headBobTimer += delta * 10.0 * (speed / this.maxSpeed);
    }
    this.breathingTimer += delta * 0.5;

    // Calculate Offsets
    const bobY = this.isGrounded ? Math.sin(this.headBobTimer) * 0.05 * Math.min(speed, 1.0) : 0;
    const breathY = Math.sin(this.breathingTimer) * 0.005;

    this.camera.position.x += this.velocity.x * delta;
    this.camera.position.z += this.velocity.z * delta;

    // 3. Vertical Physics (Jump & Gravity)
    if (this.input.keys.jump && this.isGrounded) {
        this.verticalVelocity = this.JUMP_FORCE;
        this.isGrounded = false;
    }

    // Apply Gravity
    this.verticalVelocity += this.GRAVITY * delta;

    // Apply Vertical Velocity to Height (virtual position)
    this.currentHeight += this.verticalVelocity * delta;

    // 4. Ground Collision
    if (this.scene) {
        const rayOrigin = new Vector3(this.camera.position.x, 1000, this.camera.position.z);
        this.raycaster.ray.origin.copy(rayOrigin);

        // Check for terrain
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let groundHeight = -1000; // Default low
        let found = false;

        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.name === 'terrain') {
                groundHeight = intersects[i].point.y;
                found = true;
                break;
            }
        }

        if (found) {
             const targetFloor = groundHeight + 1.7;

             // Check if we hit the ground while falling
             if (this.verticalVelocity <= 0 && this.currentHeight <= targetFloor) {
                 // Land
                 if (!this.isGrounded && this.verticalVelocity < -2.0) {
                    this.landingOffset = -0.2 * Math.min(Math.abs(this.verticalVelocity) / 5.0, 1.0);
                 }
                 this.currentHeight = targetFloor;
                 this.verticalVelocity = 0;
                 this.isGrounded = true;
             } else {
                 // We are above target floor
                 if (this.isGrounded) {
                     // Sticky feet: if we are close enough, snap down (slope)
                     // Snap distance = 0.6m
                     if (this.currentHeight - targetFloor < 0.6) {
                         this.currentHeight = targetFloor;
                         this.verticalVelocity = 0;
                     } else {
                         // Walked off ledge
                         this.isGrounded = false;
                     }
                 } else {
                    // Already airborn (jumping or falling)
                 }
             }
        } else {
            this.isGrounded = false;
        }

        // Recover Landing Offset
        this.landingOffset += (0 - this.landingOffset) * 5.0 * delta;

        // Final Y Position
        this.camera.position.y = this.currentHeight + bobY + breathY + this.landingOffset;
    }
  }
}

export { CameraRig };
