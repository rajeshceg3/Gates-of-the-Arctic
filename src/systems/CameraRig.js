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
    this.smoothing = 2.0; // Lower = more inertia (calm)

    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;

    this.currentHeight = 1.7;

    // Head Bob & Breathing
    this.headBobTimer = 0;
    this.breathingTimer = 0;
  }

  tick(delta) {
    // 1. Rotation (Smooth look)
    const targetPitch = this.input.look.y;
    const targetYaw = this.input.look.x;

    // Lerp for smoothness
    const lookSmoothness = 10.0;

    // Calculate delta for roll before updating yaw
    const yawDiff = targetYaw - this.yaw;

    this.pitch += (targetPitch - this.pitch) * lookSmoothness * delta;
    this.yaw += yawDiff * lookSmoothness * delta;

    // Roll (Bank into turn)
    // Turning Left (Yaw increasing) -> Roll Left (Positive Z)
    const targetRoll = yawDiff * 10.0; // Exaggerate slightly for effect
    // Clamp roll
    const maxRoll = 0.05; // ~3 degrees
    const clampedRoll = Math.max(-maxRoll, Math.min(maxRoll, targetRoll));

    this.roll += (clampedRoll - this.roll) * 5.0 * delta;

    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.z = this.roll;

    // 2. Movement
    const moveForward = this.input.move.z;
    const moveRight = this.input.move.x;

    const forwardDir = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), this.yaw);
    const rightDir = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), this.yaw);

    const targetVelocity = new Vector3();
    targetVelocity.addScaledVector(forwardDir, moveForward);
    targetVelocity.addScaledVector(rightDir, moveRight);

    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize();
    }

    targetVelocity.multiplyScalar(this.maxSpeed);

    this.velocity.lerp(targetVelocity, this.smoothing * delta);

    // Update Timers
    const speed = this.velocity.length();
    // Bob frequency increases with speed
    this.headBobTimer += delta * 10.0 * (speed / this.maxSpeed);
    this.breathingTimer += delta * 0.5;

    // Calculate Offsets
    // Bob: Sin wave on Y
    // Only bob when moving
    const bobY = Math.sin(this.headBobTimer) * 0.05 * Math.min(speed, 1.0);

    // Breathing: Slow Sin on Y and Z (forward/back drift)
    const breathY = Math.sin(this.breathingTimer) * 0.005;
    // Breathing doesn't affect Z position directly as it fights movement,
    // better to affect position only when idle?
    // Let's just do Y for breathing to be safe and simple.

    this.camera.position.x += this.velocity.x * delta;
    this.camera.position.z += this.velocity.z * delta;

    // 3. Ground Clamping
    if (this.scene) {
        const rayOrigin = new Vector3(this.camera.position.x, 1000, this.camera.position.z);
        this.raycaster.ray.origin.copy(rayOrigin);

        // Optimization: In a real app we'd cache the terrain object.
        // For now, this is acceptable for MVP.
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let groundHeight = 0;
        let found = false;

        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.name === 'terrain') {
                groundHeight = intersects[i].point.y;
                found = true;
                break;
            }
        }

        if (found) {
             const targetHeight = groundHeight + 1.7;
             const heightSmoothing = 5.0;
             this.currentHeight += (targetHeight - this.currentHeight) * heightSmoothing * delta;
        }

        // Combine all Y modifiers
        this.camera.position.y = this.currentHeight + bobY + breathY;
    }
  }
}

export { CameraRig };
