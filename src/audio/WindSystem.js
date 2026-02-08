class WindSystem {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.context = audioManager.context;
    this.nodes = [];
    this.time = 0;
    this.intensity = 0.5; // Base wind intensity
    this.gustTimer = 0;
    this.gustTarget = 0;
  }

  init() {
    this.lowWind = this.createWindLayer('brown', 100, 0.5);
    this.midWind = this.createWindLayer('pink', 400, 0.3);
    this.highWind = this.createWindLayer('white', 1200, 0.1);
  }

  createWindLayer(type, filterFreq, initialGain) {
    const bufferSize = 2 * this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'pink') {
             const b0 = 0.99886 * lastOut + white * 0.0555179;
             data[i] = b0 * 3.5;
             lastOut = b0;
        } else if (type === 'brown') {
             const b0 = (lastOut + (0.02 * white)) / 1.02;
             data[i] = b0 * 3.5;
             lastOut = b0;
        } else {
             data[i] = white;
        }
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gainNode = this.context.createGain();
    gainNode.gain.value = 0; // Start silent, ramp up

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioManager.reverbNode || this.audioManager.masterGain);

    source.start(0);
    this.nodes.push({ source, filter, gainNode, baseFreq: filterFreq, baseGain: initialGain });

    return { source, filter, gainNode, baseFreq: filterFreq, baseGain: initialGain };
  }

  setZone(name) {
    // Adjust base parameters per zone
    // Tundra: Stronger high wind (howling)
    // Desert: Stronger mid wind (hissing)
    // Forest: Balanced
    // Mountain: Strong gusts

    if (!this.lowWind) this.init();

    let lowGain = 0.4, midGain = 0.2, highGain = 0.1;
    let lowFreq = 120, midFreq = 500, highFreq = 1500;

    switch (name) {
      case 'tundra':
        highGain = 0.3; // Whistling
        highFreq = 2000;
        break;
      case 'mountain':
        lowGain = 0.6; // Deep rumble
        midGain = 0.4;
        break;
      case 'desert':
        midGain = 0.4; // Hissing sand
        midFreq = 800;
        break;
      case 'forest':
        midGain = 0.3; // Leaves
        highGain = 0.15;
        break;
      case 'sky':
        lowGain = 0.1;
        midGain = 0.2;
        highGain = 0.4; // Airy
        highFreq = 3000;
        break;
      case 'canyon':
         lowGain = 0.5; // Resonant
         midGain = 0.3;
         midFreq = 400;
         break;
    }

    this.lowWind.baseGain = lowGain;
    this.midWind.baseGain = midGain;
    this.highWind.baseGain = highGain;

    this.lowWind.baseFreq = lowFreq;
    this.midWind.baseFreq = midFreq;
    this.highWind.baseFreq = highFreq;
  }

  tick(delta) {
    if (!this.context) return;
    this.time += delta;

    // Gust logic
    this.gustTimer -= delta;
    if (this.gustTimer <= 0) {
        this.gustTimer = 5 + Math.random() * 10;
        this.gustTarget = Math.random(); // 0 to 1 intensity
    }

    // Smoothly interpolate current intensity towards target
    // We'll modulate the overall intensity slightly
    const noise = Math.sin(this.time * 0.5) * 0.2 + Math.sin(this.time * 0.2) * 0.1;
    const currentIntensity = this.intensity + noise + (this.gustTarget * 0.3);

    // Apply to layers
    if (this.lowWind) {
        this.updateLayer(this.lowWind, currentIntensity, 0.8);
        this.updateLayer(this.midWind, currentIntensity, 1.0);
        this.updateLayer(this.highWind, currentIntensity, 1.2);
    }
  }

  updateLayer(layer, globalIntensity, sensitivity) {
    const targetGain = layer.baseGain * globalIntensity * sensitivity;
    // Smooth ramp
    layer.gainNode.gain.setTargetAtTime(Math.max(0, targetGain), this.context.currentTime, 0.5);

    // Modulate filter frequency slightly for movement
    const freqMod = Math.sin(this.time * 0.5 * sensitivity) * 50;
    layer.filter.frequency.setTargetAtTime(layer.baseFreq + freqMod, this.context.currentTime, 0.5);
  }

  stop() {
    this.nodes.forEach(n => {
        n.source.stop();
        n.source.disconnect();
        n.gainNode.disconnect();
    });
    this.nodes = [];
  }
}

export { WindSystem };
