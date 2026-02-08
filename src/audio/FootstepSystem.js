class FootstepSystem {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.context = audioManager.context;
    this.lastStepTime = 0;
    this.stepInterval = 0.5; // Seconds between steps
    this.isMoving = false;
  }

  tick(delta, speed, zoneName) {
    if (!this.context) return;

    if (speed > 0.5) {
      this.isMoving = true;
      const now = this.context.currentTime;
      if (now - this.lastStepTime > this.stepInterval) {
        this.playStep(zoneName);
        this.lastStepTime = now;
        // Vary interval slightly for natural feel
        this.stepInterval = 0.45 + Math.random() * 0.1;
      }
    } else {
      this.isMoving = false;
    }
  }

  playStep(zoneName) {
    // Determine material type based on zone
    let material = 'dirt';
    switch (zoneName) {
      case 'tundra':
      case 'mountain': // High peaks often have snow
        material = 'snow';
        break;
      case 'desert':
        material = 'sand';
        break;
      case 'canyon':
        material = 'rock'; // Or gravel
        break;
      case 'river':
        material = 'mud'; // Near water
        break;
      case 'forest':
        material = 'dirt'; // Leaves/forest floor
        break;
      case 'sky':
        material = 'cloud'; // Maybe distinct soft sound
        break;
    }

    // Generate sound
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    // Noise buffer logic
    const bufferSize = this.context.sampleRate * 0.1; // 100ms is enough for a step
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioManager.masterGain);

    // Configure based on material
    if (material === 'snow') {
      // Crunchy high frequency
      filter.type = 'highpass';
      filter.frequency.value = 800;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    } else if (material === 'sand') {
      // Softer, gritty
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 1;
      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    } else if (material === 'rock') {
      // Sharp click/thud
      filter.type = 'highpass';
      filter.frequency.value = 1200;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    } else if (material === 'mud') {
      // Wet, squelchy (lower freq + higher resonance)
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 5;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    } else if (material === 'dirt') {
      // Generic thud
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    } else if (material === 'cloud') {
       // Very soft, airy
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
    }

    source.start(t);
    source.stop(t + 0.2);
  }
}

export { FootstepSystem };
