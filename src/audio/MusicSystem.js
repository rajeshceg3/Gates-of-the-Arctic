class DroneLayer {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.osc = null;
    this.filter = null;
    this.gain = null;
    this.lfo = null;
    this.lfoGain = null;
    this.baseFreq = 65.41;
  }

  get context() {
      return this.audioManager.context;
  }

  get destination() {
      return this.audioManager.reverbNode || this.audioManager.masterGain;
  }

  start(freq) {
    if (!this.context) return;
    this.stop();
    this.baseFreq = freq;
    const now = this.context.currentTime;

    // Oscillator 1 (Base)
    this.osc = this.context.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = this.baseFreq;

    // Oscillator 2 (Detuned for Binaural Beat / Thickness)
    this.osc2 = this.context.createOscillator();
    this.osc2.type = 'sawtooth';
    this.osc2.frequency.value = this.baseFreq;
    this.osc2.detune.value = 4; // 4 cents detune for slow beating

    // Filter
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 180; // Slightly lower for warmth
    this.filter.Q.value = 1;

    // LFO
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.05; // Slower modulation (20s cycle)

    this.lfoGain = this.context.createGain();
    this.lfoGain.gain.value = 80;

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    // Main Gain
    this.gain = this.context.createGain();
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(0.1, now + 4.0);

    // Connect
    this.osc.connect(this.filter);
    this.osc2.connect(this.filter); // Mix both into filter
    this.filter.connect(this.gain);
    this.gain.connect(this.destination);

    this.osc.start(now);
    this.osc2.start(now);
    this.lfo.start(now);
  }

  stop() {
    if (this.osc && this.context) {
      const now = this.context.currentTime;
      try {
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setTargetAtTime(0, now, 0.5);
        this.osc.stop(now + 2.0);
        if (this.osc2) this.osc2.stop(now + 2.0);
        this.lfo.stop(now + 2.0);

        // Cache nodes to disconnect later
        const nodes = [this.osc, this.osc2, this.lfo, this.filter, this.gain, this.lfoGain];
        setTimeout(() => {
            nodes.forEach(n => { try { if (n) n.disconnect(); } catch(e){} });
        }, 2500);
      } catch (e) { }
      this.osc = null;
      this.osc2 = null;
    }
  }
}

class MusicSystem {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.currentScale = [];
    this.nextNoteTime = 0;
    this.active = false;
    this.drone = new DroneLayer(audioManager);
  }

  get context() {
      return this.audioManager.context;
  }

  setZone(name) {
    // Scales (freq in Hz)
    const tundra = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25]; // C Minor Pent
    const tundraRoot = 65.41; // C2

    const mountain = [164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63]; // E Phrygian
    const mountainRoot = 82.41; // E2

    const river = [293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // D Dorian
    const riverRoot = 73.42; // D2

    const forest = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00]; // G Major Pent
    const forestRoot = 98.00; // G2

    const sky = [349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25]; // F Lydian
    const skyRoot = 87.31; // F2

    let rootFreq = tundraRoot;

    switch (name) {
      case 'tundra':
          this.currentScale = tundra;
          rootFreq = tundraRoot;
          break;
      case 'mountain':
          this.currentScale = mountain;
          rootFreq = mountainRoot;
          break;
      case 'river':
          this.currentScale = river;
          rootFreq = riverRoot;
          break;
      case 'forest':
          this.currentScale = forest;
          rootFreq = forestRoot;
          break;
      case 'sky':
          this.currentScale = sky;
          rootFreq = skyRoot;
          break;
      default:
          this.currentScale = forest;
          rootFreq = forestRoot;
          break;
    }

    this.active = true;

    // Only schedule next note if not already running (or if context just started)
    if (this.context && this.nextNoteTime < this.context.currentTime) {
        this.nextNoteTime = this.context.currentTime + 2.0;
    }

    // Update Drone
    if (this.context) {
        this.drone.start(rootFreq);
    }
  }

  tick(delta) {
    if (!this.active || !this.context) return;

    // If drone isn't playing but should be (e.g. context just resumed)
    if (!this.drone.osc && this.active) {
        // We'd need to know the current root freq to restart it...
        // For now, let's just rely on setZone being called or context being ready.
        // Actually, if context starts late, setZone might have run when context was null.
        // But AudioManager calls setTheme() inside init(), which calls setZone().
        // So this should be fine.
    }

    if (this.context.currentTime >= this.nextNoteTime) {
      this.playRandomNote();
      this.nextNoteTime = this.context.currentTime + 4 + Math.random() * 6;
    }
  }

  playRandomNote() {
    if (!this.currentScale.length) return;

    const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)];
    const r = Math.random();
    let octave = 1;
    if (r > 0.8) octave = 0.5; // Up octave (freq * 0.5 is DOWN octave? No, 1/2 wavelength? Freq / 2 is down. Freq * 2 is up.)
    // Wait, freq / octave.
    // If octave is 2, freq/2 is lower.
    // If octave is 0.5, freq/0.5 = freq*2 is higher.

    if (r > 0.8) octave = 0.5; // Higher
    if (r < 0.2) octave = 2;   // Lower

    const finalFreq = freq / octave;

    const osc = this.context.createOscillator();
    osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
    osc.frequency.value = finalFreq;

    const gain = this.context.createGain();
    const now = this.context.currentTime;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 2.0);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 10.0);

    const panner = this.context.createStereoPanner();
    panner.pan.value = (Math.random() * 2 - 1) * 0.5;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.audioManager.reverbNode || this.audioManager.masterGain);

    osc.start(now);
    osc.stop(now + 10.0);
  }

  stop() {
    this.active = false;
    this.drone.stop();
  }
}

export { MusicSystem };
