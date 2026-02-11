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
    this.snowVelocities = [];

    // System 2: Diamond Dust / Suspended Particles
    this.dustCount = 1000;
    this.dustParticles = null;
    this.dustGeo = null;
    this.dustMat = null;
    this.dustVelocities = [];

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

      this.snowVelocities.push({
        x: (Math.random() - 0.5) * 0.5,
        y: -1.0 - Math.random(), // Always falling down
        z: (Math.random() - 0.5) * 0.5
      });
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

      this.dustVelocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2, // Float
        z: (Math.random() - 0.5) * 0.2
      });
    }

    this.dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.dustGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const sprite = this.createDiamondDustTexture();

    this.dustMat = new THREE.PointsMaterial({
      size: 0.15, // Smaller
      map: sprite,
      transparent: true,
      opacity: 0.6,
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
        this.dustMat.opacity = 0.6;
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

    // 1. Update Snow
    if (this.snowMat.visible) {
        const positions = this.snowGeo.attributes.position.array;
        for (let i = 0; i < this.snowCount; i++) {
            const i3 = i * 3;

            // Fall down with sway
            positions[i3] += Math.sin(time + i) * 0.05 * speedScale; // Sway X
            positions[i3 + 1] += this.snowVelocities[i].y * speedScale; // Fall Y
            positions[i3 + 2] += Math.cos(time + i) * 0.05 * speedScale; // Sway Z

            this._wrap(positions, i3, cameraPosition);
        }
        this.snowGeo.attributes.position.needsUpdate = true;
    }

    // 2. Update Dust
    if (this.dustMat.visible) {
        const positions = this.dustGeo.attributes.position.array;
        for (let i = 0; i < this.dustCount; i++) {
            const i3 = i * 3;

            // Float / Drift
            positions[i3] += (this.dustVelocities[i].x + Math.sin(time * 0.5 + i) * 0.02) * speedScale;
            positions[i3 + 1] += (this.dustVelocities[i].y + Math.cos(time * 0.3 + i) * 0.02) * speedScale;
            positions[i3 + 2] += (this.dustVelocities[i].z + Math.sin(time * 0.4 + i) * 0.02) * speedScale;

            this._wrap(positions, i3, cameraPosition);
        }
        this.dustGeo.attributes.position.needsUpdate = true;
    }
  }

  _wrap(positions, i3, cameraPosition) {
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
}

export { AtmosphereSystem };
