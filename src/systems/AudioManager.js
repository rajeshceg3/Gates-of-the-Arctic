class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.isInitialized = false;
    this.currentTheme = null;
    this.activeNodes = []; // Track active oscillators/nodes to stop them
    this.activeIntervals = []; // Track intervals for random events
  }

  async init() {
    if (this.isInitialized) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext();

    // Master Gain
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.setValueAtTime(0.5, this.context.currentTime);

    // Reverb
    this.reverbNode = this.context.createConvolver();
    // Generate a default impulse response (can be overridden per theme if needed, but keeping simple for now)
    const impulse = this._createImpulseResponse(2.5, 2.0);
    this.reverbNode.buffer = impulse;
    this.reverbNode.connect(this.masterGain);

    this.isInitialized = true;

    if (this.currentTheme) {
      const theme = this.currentTheme;
      this.currentTheme = null;
      this.setTheme(theme);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  _createImpulseResponse(duration, decay) {
    const rate = this.context.sampleRate;
    const length = rate * duration;
    const impulse = this.context.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        // Exponential decay noise
        const n = i / length;
        const noise = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        left[i] = noise;
        right[i] = noise;
    }
    return impulse;
  }

  setTheme(name) {
    if (!this.isInitialized) {
      this.currentTheme = name;
      return;
    }
    if (this.currentTheme === name) return;

    console.log(`AudioManager: Switching to soundscape: ${name}`);

    this._stopCurrentTheme();
    this.currentTheme = name;

    // Cross-fade could be implemented here, but hard stop is safer for now to avoid leak
    // "Ultrathink": We need immersive soundscapes.

    switch (name) {
      case 'tundra':
        // Cold, howling wind. Deep and isolating.
        this._playWind({ type: 'pink', filterFreq: 250, q: 1, gain: 0.4 });
        this._playWind({ type: 'pink', filterFreq: 400, q: 5, gain: 0.1, modulate: true }); // Whistling
        break;

      case 'mountain':
        // Strong, buffeting wind. Echoey.
        this._playWind({ type: 'pink', filterFreq: 300, q: 2, gain: 0.5, modulate: true });
        // Occasional eagle/bird
        this._startRandomEvent(() => this._playBird('eagle'), 8000, 20000);
        break;

      case 'river':
        // Rushing water.
        this._playWater({ gain: 0.6 });
        // Gentle breeze
        this._playWind({ type: 'pink', filterFreq: 600, q: 0.5, gain: 0.2 });
        this._startRandomEvent(() => this._playBird('chirp'), 3000, 10000);
        break;

      case 'forest':
        // Rustling leaves (High pass noise)
        this._playWind({ type: 'pink', filterFreq: 1200, q: 0.5, gain: 0.15 }); // Leaves
        this._playWind({ type: 'brown', filterFreq: 150, q: 0, gain: 0.2 }); // Background rumble
        // Active wildlife
        this._startRandomEvent(() => this._playBird('chirp'), 2000, 8000);
        this._startRandomEvent(() => this._playBird('trill'), 5000, 15000);
        break;

      case 'sky':
        // Ethereal drone.
        this._playDrone(220, 'sine', 0.15); // A3
        this._playDrone(330, 'sine', 0.1);  // E4
        this._playWind({ type: 'white', filterFreq: 800, q: 1, gain: 0.05, modulate: true }); // High altitude air
        break;

      case 'desert':
        // Dry, hissing wind.
        this._playWind({ type: 'white', filterFreq: 600, q: 0.5, gain: 0.15 });
        this._playDrone(60, 'triangle', 0.05); // Low heat shimmer drone
        break;

      case 'canyon':
        // Resonant wind through rocks.
        this._playWind({ type: 'pink', filterFreq: 300, q: 8, gain: 0.3, modulate: true }); // Resonant
        this._playWind({ type: 'brown', filterFreq: 100, q: 0, gain: 0.4 }); // Base
        break;

      default:
        // Fallback
        this._playWind({ type: 'pink', filterFreq: 300, q: 1, gain: 0.2 });
        break;
    }
  }

  _stopCurrentTheme() {
    this.activeNodes.forEach(item => {
        try {
            // Stop oscillators/sources
            if (item.source) {
                item.source.stop(this.context.currentTime + 0.1); // Slight fade out
            }
            // Disconnect nodes to free graph
            setTimeout(() => {
                if (item.source) item.source.disconnect();
                if (item.nodes) item.nodes.forEach(n => n.disconnect());
            }, 200);
        } catch (e) { console.warn(e); }
    });
    this.activeNodes = [];

    this.activeIntervals.forEach(id => clearTimeout(id));
    this.activeIntervals = [];
  }

  _startRandomEvent(callback, minTime, maxTime) {
    const scheduleNext = () => {
      const delay = minTime + Math.random() * (maxTime - minTime);
      const id = setTimeout(() => {
        if (this.context.state === 'running') callback();
        scheduleNext();
      }, delay);
      this.activeIntervals.push(id);
    };
    scheduleNext();
  }

  // --- Generators ---

  _createBuffer(type) {
    const bufferSize = 2 * this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'pink') {
             const b0 = 0.99886 * lastOut + white * 0.0555179;
             data[i] = b0;
             lastOut = b0;
             data[i] *= 3.5; // Compensate gain
        } else if (type === 'brown') {
             const b0 = (lastOut + (0.02 * white)) / 1.02;
             data[i] = b0;
             lastOut = b0;
             data[i] *= 3.5;
        } else {
             data[i] = white; // White
        }
    }
    return buffer;
  }

  _playWind({ type = 'pink', filterFreq = 400, q = 1, gain = 0.1, modulate = false }) {
    const buffer = this._createBuffer(type);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    if (q > 2) filter.type = 'bandpass'; // High Q usually means we want a tone
    filter.frequency.value = filterFreq;
    filter.Q.value = q;

    const gainNode = this.context.createGain();
    gainNode.gain.value = gain;

    // Connect: Source -> Filter -> Gain -> Reverb -> Master
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.reverbNode); // Wind gets reverb for space

    source.start(0);

    const nodes = [filter, gainNode];
    this.activeNodes.push({ source, nodes });

    if (modulate) {
      this._modulateFilter(filter, filterFreq);
    }
  }

  _modulateFilter(filter, baseFreq) {
    const interval = setInterval(() => {
       if (this.context.state !== 'running') return;
       const randomOffset = (Math.random() - 0.5) * baseFreq * 0.5;
       const target = baseFreq + randomOffset;
       filter.frequency.exponentialRampToValueAtTime(target, this.context.currentTime + 3);
    }, 4000);
    this.activeIntervals.push(interval);
  }

  _playWater({ gain = 0.5 }) {
    // Water is essentially brown noise
    const buffer = this._createBuffer('brown');
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gainNode = this.context.createGain();
    gainNode.gain.value = gain;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain); // Direct to master, less reverb for water generally unless in cave

    source.start(0);
    this.activeNodes.push({ source, nodes: [filter, gainNode] });
  }

  _playDrone(freq, type = 'sine', gain = 0.1) {
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gainNode = this.context.createGain();
    gainNode.gain.value = gain;

    // LFO for subtle movement
    const lfo = this.context.createOscillator();
    lfo.frequency.value = 0.1; // Slow
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 2.0; // +/- 2Hz detune

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    osc.connect(gainNode);
    gainNode.connect(this.reverbNode); // Drones love reverb

    osc.start();
    this.activeNodes.push({ source: osc, nodes: [gainNode, lfo, lfoGain] });
    // Note: stopping osc stops lfo implicitly? No, need to track.
    // Fixed in _stopCurrentTheme to generic stop
  }

  _playBird(type) {
    if (this.context.state !== 'running') return;

    const osc = this.context.createOscillator();
    const gainNode = this.context.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.reverbNode);

    const now = this.context.currentTime;

    if (type === 'eagle') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.8);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.start(now);
        osc.stop(now + 1.0);
    } else if (type === 'chirp') {
        osc.type = 'sine';
        const startFreq = 2000 + Math.random() * 1000;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + 0.1);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'trill') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3000, now);

        // FM modulation for trill
        const mod = this.context.createOscillator();
        mod.frequency.value = 15;
        const modGain = this.context.createGain();
        modGain.gain.value = 500;
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        mod.start(now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.6);
        mod.stop(now + 0.6);
    }
  }
}

export { AudioManager };
