import { Vector3 } from 'three';

class CameraRig {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;

    // Physics/Movement params
    this.velocity = new Vector3();
    this.maxSpeed = 3.0; // slow walking speed
    this.smoothing = 2.0; // Lower = more inertia (calm)

    this.pitch = 0;
    this.yaw = 0;

    // Initial position
    this.camera.position.set(0, 1.7, 0); // 1.7m eye height
    this.camera.rotation.order = 'YXZ'; // Yaw (Y) then Pitch (X)
  }

  tick(delta) {
    // 1. Rotation (Smooth look)
    const targetPitch = this.input.look.y;
    const targetYaw = this.input.look.x;

    // Lerp for smoothness
    // Using a factor relative to delta, e.g. 10.0 * delta.
    // If delta is 0.016 (60fps), factor is 0.16.
    const lookSmoothness = 10.0;
    this.pitch += (targetPitch - this.pitch) * lookSmoothness * delta;
    this.yaw += (targetYaw - this.yaw) * lookSmoothness * delta;

    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;

    // 2. Movement
    // Use input directly
    // z is Forward/Back in input (-1 to 1)?
    // In InputController:
    // move.z = forward(1) - backward(1). So Forward is +1?
    // Wait, usually forward is -z in Three.js.
    // Let's check InputController again.
    // KeyW -> forward=true. updateMove -> move.z = forward(1) - backward(0) = 1.
    // So +1 is Forward.

    const moveForward = this.input.move.z;
    const moveRight = this.input.move.x;

    // Calculate direction relative to camera yaw (but flat on ground)
    const forwardDir = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), this.yaw);
    const rightDir = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), this.yaw);

    const targetVelocity = new Vector3();
    targetVelocity.addScaledVector(forwardDir, moveForward);
    targetVelocity.addScaledVector(rightDir, moveRight);

    // Normalize if moving diagonally to avoid faster speed
    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize();
    }

    targetVelocity.multiplyScalar(this.maxSpeed);

    // Lerp velocity for smooth acceleration/deceleration
    this.velocity.lerp(targetVelocity, this.smoothing * delta);

    // Apply position
    this.camera.position.addScaledVector(this.velocity, delta);

    // Constraint: Grounded
    // TODO: Raycast to terrain
    // For now, simple floor at y=0, eye height 1.7
    this.camera.position.y = 1.7;
  }
}

export { CameraRig };
