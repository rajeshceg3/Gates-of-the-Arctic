class FootstepSystem {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.context = audioManager.context;
    this.lastStepTime = 0;
    this.stepInterval = 0.5;
    this.isMoving = false;
    this.buffers = {};

    // Pre-generate buffers for variety and performance
    this.initBuffers();
  }

  initBuffers() {
    if (!this.context) return;

    const materials = ['snow', 'sand', 'rock', 'dirt', 'mud', 'cloud'];

    materials.forEach(mat => {
        this.buffers[mat] = [];
        // Create 4 variations per material
        for (let i = 0; i < 4; i++) {
            this.buffers[mat].push(this.createBufferForMaterial(mat));
        }
    });
  }

  createBufferForMaterial(material) {
      // Logic to create a single buffer for a material type
      const duration = 0.2; // Slightly longer to allow envelope to handle decay
      const bufferSize = this.context.sampleRate * duration;
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = buffer.getChannelData(0);

      // Fill with noise
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;

          if (material === 'snow' || material === 'sand') {
             // Pink-ish
             data[i] = (lastOut + (0.02 * white)) / 1.02;
             lastOut = data[i];
             data[i] *= 3.5;
          } else {
             data[i] = white;
          }
      }
      return buffer;
  }

  tick(delta, speed, zoneName) {
    if (!this.context) return;

    // Trigger step
    if (speed > 0.5) {
      this.isMoving = true;
      const now = this.context.currentTime;
      if (now - this.lastStepTime > this.stepInterval) {
        this.playStep(zoneName);
        this.lastStepTime = now;
        // Vary interval: faster speed -> shorter interval (simple inverse)
        this.stepInterval = Math.max(0.3, 0.8 / Math.max(1.0, speed)) + (Math.random() * 0.05);
      }
    } else {
      this.isMoving = false;
    }
  }

  playStep(zoneName) {
    let material = 'dirt';
    switch (zoneName) {
      case 'tundra':
      case 'mountain': material = 'snow'; break;
      case 'desert': material = 'sand'; break;
      case 'canyon': material = 'rock'; break;
      case 'river': material = 'mud'; break;
      case 'forest': material = 'dirt'; break;
      case 'sky': material = 'cloud'; break;
    }

    if (!this.buffers[material] || this.buffers[material].length === 0) return;

    // Pick random variation
    const variations = this.buffers[material];
    const buffer = variations[Math.floor(Math.random() * variations.length)];

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Randomize Pitch (Playback Rate) -> +/- 10%
    source.playbackRate.value = 0.9 + Math.random() * 0.2;

    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    // Configure Tone & Envelope
    const t = this.context.currentTime;

    // Default connection
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioManager.masterGain);

    // Start Gain at 0 to avoid pop
    gain.gain.setValueAtTime(0, t);

    if (material === 'snow') {
      filter.type = 'highpass';
      filter.frequency.value = 600 + Math.random() * 200;

      // Crisp attack, fast decay
      gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    } else if (material === 'sand') {
      filter.type = 'bandpass';
      filter.frequency.value = 500 + Math.random() * 100;
      filter.Q.value = 0.5;

      // Softer attack
      gain.gain.linearRampToValueAtTime(0.04, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    } else if (material === 'rock') {
      filter.type = 'highpass';
      filter.frequency.value = 1000 + Math.random() * 200;

      // Sharp click
      gain.gain.linearRampToValueAtTime(0.08, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    } else if (material === 'mud') {
      filter.type = 'lowpass';
      filter.frequency.value = 300 + Math.random() * 100;
      filter.Q.value = 2;

      // Squelch
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    } else if (material === 'dirt') {
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    } else if (material === 'cloud') {
      filter.type = 'lowpass';
      filter.frequency.value = 150;

      gain.gain.linearRampToValueAtTime(0.02, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
    }

    source.start(t);
  }
}

export { FootstepSystem };
