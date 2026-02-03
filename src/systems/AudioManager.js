class AudioManager {
  constructor() {
    this.context = null;
    this.gainNode = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);

    // Low volume for ambient
    this.gainNode.gain.setValueAtTime(0.1, this.context.currentTime);

    this._createWind();
    this.isInitialized = true;

    // Resume context if suspended (browser policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  _createWind() {
    // Procedural wind: Pink noise + filters
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        // Simple white noise
        const white = Math.random() * 2 - 1;
        // Pink noise approx (1/f) - not perfect but good for wind
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // Filter to make it sound like wind
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; // Low rumble wind

    noise.connect(filter);
    filter.connect(this.gainNode);
    noise.start(0);

    // Vary filter frequency over time
    this._modulateWind(filter);
  }

  _modulateWind(filter) {
    setInterval(() => {
        // Randomly drift frequency
        const freq = 300 + Math.random() * 300;
        filter.frequency.exponentialRampToValueAtTime(freq, this.context.currentTime + 2);
    }, 2000);
  }
}

// Global variable for pink noise calculation state
let lastOut = 0;

export { AudioManager };
