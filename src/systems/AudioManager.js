import { Vector3 } from 'three';
import { FootstepSystem } from '../audio/FootstepSystem.js';
import { WindSystem } from '../audio/WindSystem.js';
import { MusicSystem } from '../audio/MusicSystem.js';

class AudioManager {
  constructor(camera) {
    this.camera = camera;
    this.context = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.isInitialized = false;
    this.currentTheme = null;
    this.activeNodes = []; // Track active oscillators/nodes to stop them
    this.activeIntervals = []; // Track intervals for random events

    // Subsystems
    this.footstepSystem = null;
    this.windSystem = null;
    this.musicSystem = null;

    // Movement tracking
    this.lastPosition = new Vector3();
    this.currentSpeed = 0;
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
    const impulse = this._createImpulseResponse(2.5, 2.0);
    this.reverbNode.buffer = impulse;
    this.reverbNode.connect(this.masterGain);

    // Initialize Subsystems
    this.footstepSystem = new FootstepSystem(this);
    this.windSystem = new WindSystem(this);
    this.musicSystem = new MusicSystem(this);

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

  toggleMute() {
    if (!this.masterGain) return false;
    if (this.masterGain.gain.value > 0.01) {
      this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
      return true; // isMuted
    } else {
      this.masterGain.gain.setTargetAtTime(0.5, this.context.currentTime, 0.1);
      return false; // !isMuted
    }
  }

  tick(delta) {
    if (!this.isInitialized) return;

    // Calculate speed
    if (this.camera) {
        const distance = this.camera.position.distanceTo(this.lastPosition);
        this.currentSpeed = distance / delta;
        this.lastPosition.copy(this.camera.position);
    }

    // Update Systems
    if (this.footstepSystem) this.footstepSystem.tick(delta, this.currentSpeed, this.currentTheme);
    if (this.windSystem) this.windSystem.tick(delta);
    if (this.musicSystem) this.musicSystem.tick(delta);
  }

  _createImpulseResponse(duration, decay) {
    const rate = this.context.sampleRate;
    const length = rate * duration;
    const impulse = this.context.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
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

    // Update Subsystems
    this.windSystem.setZone(name);
    this.musicSystem.setZone(name);

    // Legacy/Extra Ambience layers (Water, Birds)
    switch (name) {
      case 'mountain':
        this._startRandomEvent(() => this._playBird('eagle'), 8000, 20000);
        break;

      case 'river':
        this._playWater({ gain: 0.6 });
        this._startRandomEvent(() => this._playBird('chirp'), 3000, 10000);
        break;

      case 'forest':
        this._startRandomEvent(() => this._playBird('chirp'), 2000, 8000);
        this._startRandomEvent(() => this._playBird('trill'), 5000, 15000);
        break;

      case 'canyon':
        // No extra birds needed, music/wind handle it
        break;
    }
  }

  _stopCurrentTheme() {
    this.activeNodes.forEach(item => {
        try {
            if (item.source) {
                item.source.stop(this.context.currentTime + 0.1);
            }
            setTimeout(() => {
                if (item.source) item.source.disconnect();
                if (item.nodes) item.nodes.forEach(n => n.disconnect());
            }, 200);
        } catch (e) { console.warn(e); }
    });
    this.activeNodes = [];

    this.activeIntervals.forEach(id => clearTimeout(id));
    this.activeIntervals = [];

    if (this.windSystem) this.windSystem.stop();
    if (this.musicSystem) this.musicSystem.stop();
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

  // Helper to create basic noise buffer (used by Water)
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
             data[i] *= 3.5;
        } else if (type === 'brown') {
             const b0 = (lastOut + (0.02 * white)) / 1.02;
             data[i] = b0;
             lastOut = b0;
             data[i] *= 3.5;
        } else {
             data[i] = white;
        }
    }
    return buffer;
  }

  _playWater({ gain = 0.5 }) {
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
    gainNode.connect(this.masterGain);

    source.start(0);
    this.activeNodes.push({ source, nodes: [filter, gainNode] });
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
