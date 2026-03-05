import * as THREE from 'three';

class AtmosphereSystem {
  constructor(scene) {
    this.scene = scene;
    this.range = 100; // Radius around camera
    this.zone = 'tundra'; // Default

    // System 1: Snow / Heavy Particles
    this.snowCount = 2000;
    this.snowParticles = null;
    this.snowGeo = null;
    this.snowMat = null;
    this.snowVelocities = new Float32Array(this.snowCount * 3);

    // System 2: Diamond Dust / Suspended Particles
    this.dustCount = 1000;
    this.dustParticles = null;
    this.dustGeo = null;
    this.dustMat = null;
    this.dustVelocities = new Float32Array(this.dustCount * 3);

    this.init();
  }

  init() {
    this.initSnow();
    this.initDust();
  }

  initSnow() {
    this.snowGeo = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    for (let i = 0; i < this.snowCount; i++) {
      positions.push((Math.random() - 0.5) * this.range * 2);
      positions.push((Math.random() - 0.5) * this.range * 2);
      positions.push((Math.random() - 0.5) * this.range * 2);
      sizes.push(Math.random());

      const i3 = i * 3;
      this.snowVelocities[i3] = (Math.random() - 0.5) * 0.5;
      this.snowVelocities[i3 + 1] = -1.0 - Math.random(); // Always falling down
      this.snowVelocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    this.snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.snowGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const sprite = this.createSnowflakeTexture();

    this.snowMat = new THREE.PointsMaterial({
      size: 0.3,
      map: sprite,
      transparent: true,
      opacity: 0.8,
      vertexColors: false,
      color: 0xffffff,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.snowParticles = new THREE.Points(this.snowGeo, this.snowMat);
    this.snowParticles.frustumCulled = false;
    this.scene.add(this.snowParticles);
  }

  initDust() {
    this.dustGeo = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    for (let i = 0; i < this.dustCount; i++) {
      positions.push((Math.random() - 0.5) * this.range * 2);
      positions.push((Math.random() - 0.5) * this.range * 2);
      positions.push((Math.random() - 0.5) * this.range * 2);
      sizes.push(Math.random());

      const i3 = i * 3;
      this.dustVelocities[i3] = (Math.random() - 0.5) * 0.2;
      this.dustVelocities[i3 + 1] = (Math.random() - 0.5) * 0.2; // Float
      this.dustVelocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    this.dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.dustGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const sprite = this.createDiamondDustTexture();

    this.dustMat = new THREE.PointsMaterial({
      size: 0.25, // Increased for visibility
      map: sprite,
      transparent: true,
      opacity: 0.8, // Increased for visibility
      vertexColors: false,
      color: 0xaaccff, // Icy tint
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.dustParticles = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustParticles.frustumCulled = false;
    this.scene.add(this.dustParticles);
  }

  createSnowflakeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');

    // Soft radial gradient for fluffy snow
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createDiamondDustTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');

    // Sharp cross shape for sparkle
    context.strokeStyle = 'rgba(255, 255, 255, 1)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(16, 4);
    context.lineTo(16, 28);
    context.moveTo(4, 16);
    context.lineTo(28, 16);
    context.stroke();

    // Soft center glow
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 10);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  setZone(name) {
    this.zone = name;

    // Config per zone
    switch (name) {
      case 'tundra':
      case 'mountain':
        // Heavy snow + Diamond dust
        this.snowMat.opacity = 0.8;
        this.snowMat.visible = true;
        this.dustMat.opacity = 0.8; // Increased for visibility
        this.dustMat.visible = true;
        this.dustMat.color.setHex(0xaaccff); // Ice blue
        break;

      case 'river':
        // Light rain/mist (reuse snow as mist)
        this.snowMat.opacity = 0.3; // Faint mist
        this.snowMat.visible = true;
        this.dustMat.opacity = 0.4;
        this.dustMat.visible = true;
        this.dustMat.color.setHex(0xffffff);
        break;

      case 'forest':
        // Pollen (dust) + light falling leaves (snow re-tinted?)
        this.snowMat.visible = false; // Disable heavy snow
        this.dustMat.opacity = 0.5;
        this.dustMat.visible = true;
        this.dustMat.color.setHex(0xd4e157); // Yellow/Green pollen
        break;

      case 'sky':
        // Clear, maybe faint stars (dust)
        this.snowMat.visible = false;
        this.dustMat.opacity = 0.3;
        this.dustMat.visible = true;
        this.dustMat.color.setHex(0xffffff);
        break;

      default:
        this.snowMat.visible = false;
        this.dustMat.visible = false;
        break;
    }
  }

  tick(delta, cameraPosition) {
    const speedScale = delta * 5.0;
    const time = Date.now() * 0.001;

    // Cache variables for wrapping
    const range = this.range;
    const range2 = range * 2;
    const cx = cameraPosition.x;
    const cy = cameraPosition.y;
    const cz = cameraPosition.z;

    // 1. Update Snow
    if (this.snowMat.visible) {
        const positions = this.snowGeo.attributes.position.array;
        for (let i = 0, l = this.snowCount; i < l; i++) {
            const i3 = i * 3;

            // Fall down with sway
            let px = positions[i3] + Math.sin(time + i) * 0.05 * speedScale; // Sway X
            let py = positions[i3 + 1] + this.snowVelocities[i3 + 1] * speedScale; // Fall Y
            let pz = positions[i3 + 2] + Math.cos(time + i) * 0.05 * speedScale; // Sway Z

            // Wrap
            if (px > cx + range) px -= range2;
            else if (px < cx - range) px += range2;

            if (py > cy + range) py -= range2;
            else if (py < cy - range) py += range2;

            if (pz > cz + range) pz -= range2;
            else if (pz < cz - range) pz += range2;

            positions[i3] = px;
            positions[i3 + 1] = py;
            positions[i3 + 2] = pz;
        }
        this.snowGeo.attributes.position.needsUpdate = true;
    }

    // 2. Update Dust
    if (this.dustMat.visible) {
        const positions = this.dustGeo.attributes.position.array;
        for (let i = 0, l = this.dustCount; i < l; i++) {
            const i3 = i * 3;

            // Float / Drift
            let px = positions[i3] + (this.dustVelocities[i3] + Math.sin(time * 0.5 + i) * 0.02) * speedScale;
            let py = positions[i3 + 1] + (this.dustVelocities[i3 + 1] + Math.cos(time * 0.3 + i) * 0.02) * speedScale;
            let pz = positions[i3 + 2] + (this.dustVelocities[i3 + 2] + Math.sin(time * 0.4 + i) * 0.02) * speedScale;

            // Wrap
            if (px > cx + range) px -= range2;
            else if (px < cx - range) px += range2;

            if (py > cy + range) py -= range2;
            else if (py < cy - range) py += range2;

            if (pz > cz + range) pz -= range2;
            else if (pz < cz - range) pz += range2;

            positions[i3] = px;
            positions[i3 + 1] = py;
            positions[i3 + 2] = pz;
        }
        this.dustGeo.attributes.position.needsUpdate = true;
    }
  }
}

export { AtmosphereSystem };
