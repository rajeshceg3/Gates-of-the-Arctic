import * as THREE from 'three';

class AtmosphereSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = 2000;
    this.range = 100; // Radius around camera
    this.particles = null;
    this.geometry = null;
    this.material = null;
    this.velocities = [];
    this.zone = 'tundra'; // Default

    this.init();
  }

  init() {
    this.geometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    for (let i = 0; i < this.count; i++) {
      positions.push((Math.random() - 0.5) * this.range * 2);
      positions.push((Math.random() - 0.5) * this.range * 2);
      positions.push((Math.random() - 0.5) * this.range * 2);
      sizes.push(Math.random());

      // Initial random velocities
      this.velocities.push({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.5
      });
    }

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Simple PointsMaterial for performance and "sparkle" look
    // Using a texture would be better but procedurally drawing a circle on canvas is easiest
    const sprite = this.createParticleTexture();

    this.material = new THREE.PointsMaterial({
      size: 0.2,
      map: sprite,
      transparent: true,
      opacity: 0.6,
      vertexColors: false,
      color: 0xffffff,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.particles.frustumCulled = false; // Always render
    this.scene.add(this.particles);
  }

  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  setZone(name) {
    this.zone = name;

    // Animate color transition (simple switch for MVP)
    switch (name) {
      case 'tundra':
      case 'mountain':
        this.material.color.setHex(0xffffff); // Snow
        this.material.opacity = 0.8;
        this.material.size = 0.3;
        break;
      case 'desert':
        this.material.color.setHex(0xe6c288); // Sand
        this.material.opacity = 0.5;
        this.material.size = 0.2;
        break;
      case 'canyon':
        this.material.color.setHex(0xd68d6e); // Red dust
        this.material.opacity = 0.4;
        this.material.size = 0.2;
        break;
      case 'forest':
        this.material.color.setHex(0xd4e157); // Pollen/spores
        this.material.opacity = 0.4;
        this.material.size = 0.25;
        break;
      case 'river':
        this.material.color.setHex(0xa0d8ef); // Mist
        this.material.opacity = 0.3;
        this.material.size = 0.4;
        break;
      case 'sky':
        this.material.color.setHex(0xffffff); // Cloud wisps
        this.material.opacity = 0.2;
        this.material.size = 0.5;
        break;
    }
  }

  tick(delta, cameraPosition) {
    const positions = this.geometry.attributes.position.array;
    const speedScale = delta * 5.0;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      // Update position based on zone logic
      let vx = this.velocities[i].x;
      let vy = this.velocities[i].y;
      let vz = this.velocities[i].z;

      if (this.zone === 'tundra' || this.zone === 'mountain') {
        // Falling snow with swirl
        vy = -1.0 - Math.random(); // Always down
        vx += Math.sin(Date.now() * 0.001 + i) * 0.05;
        vz += Math.cos(Date.now() * 0.001 + i) * 0.05;
      } else if (this.zone === 'desert' || this.zone === 'canyon') {
        // Horizontal drift
        vx = 2.0 + Math.random(); // Wind direction
        vy = Math.sin(Date.now() * 0.002 + i) * 0.2; // Bob
      } else if (this.zone === 'forest') {
        // Gentle float
        vy = Math.sin(Date.now() * 0.001 + i) * 0.2;
        vx = Math.cos(Date.now() * 0.001 + i) * 0.2;
        vz = Math.sin(Date.now() * 0.002 + i) * 0.2;
      }

      positions[i3] += vx * speedScale;
      positions[i3 + 1] += vy * speedScale;
      positions[i3 + 2] += vz * speedScale;

      // Wrap around camera
      const range = this.range;

      // X wrap
      if (positions[i3] > cameraPosition.x + range) positions[i3] -= range * 2;
      if (positions[i3] < cameraPosition.x - range) positions[i3] += range * 2;

      // Y wrap
      if (positions[i3 + 1] > cameraPosition.y + range) positions[i3 + 1] -= range * 2;
      if (positions[i3 + 1] < cameraPosition.y - range) positions[i3 + 1] += range * 2;

      // Z wrap
      if (positions[i3 + 2] > cameraPosition.z + range) positions[i3 + 2] -= range * 2;
      if (positions[i3 + 2] < cameraPosition.z - range) positions[i3 + 2] += range * 2;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // Ensure the container moves generally with the camera to avoid precision issues far from origin?
    // Actually, we are wrapping positions relative to world space, but centered on camera.
    // The logic above keeps particles within [camera-range, camera+range].
  }
}

export { AtmosphereSystem };
