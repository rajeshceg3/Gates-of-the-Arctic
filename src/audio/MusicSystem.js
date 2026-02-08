class MusicSystem {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.context = audioManager.context;
    this.currentScale = [];
    this.nextNoteTime = 0;
    this.active = false;
  }

  setZone(name) {
    // Scales (freq in Hz)
    // Tundra: Minor Pentatonic (C, Eb, F, G, Bb) - Cold
    const tundra = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25];
    // Mountain: Phrygian (E, F, G, A, B, C, D) - Majestic
    const mountain = [164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63];
    // River: Dorian (D, E, F, G, A, B, C) - Flowing
    const river = [293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    // Forest: Major Pentatonic (G, A, B, D, E) - Organic
    const forest = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00];
    // Sky: Lydian (F, G, A, B, C, D, E) - Uplifting
    const sky = [349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25];
    // Desert: Double Harmonic (C, Db, E, F, G, Ab, B) - Exotic
    const desert = [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 493.88];
    // Canyon: Mixolydian (G, A, B, C, D, E, F) - Resonant
    const canyon = [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23];

    switch (name) {
      case 'tundra': this.currentScale = tundra; break;
      case 'mountain': this.currentScale = mountain; break;
      case 'river': this.currentScale = river; break;
      case 'forest': this.currentScale = forest; break;
      case 'sky': this.currentScale = sky; break;
      case 'desert': this.currentScale = desert; break;
      case 'canyon': this.currentScale = canyon; break;
      default: this.currentScale = forest; break;
    }

    this.active = true;
    this.nextNoteTime = this.context.currentTime + 2.0; // Start after delay
  }

  tick(delta) {
    if (!this.active || !this.context) return;

    if (this.context.currentTime >= this.nextNoteTime) {
      this.playRandomNote();
      // Schedule next note randomly between 4 and 10 seconds
      this.nextNoteTime = this.context.currentTime + 4 + Math.random() * 6;
    }
  }

  playRandomNote() {
    if (!this.currentScale.length) return;

    const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)];
    // Octave shift occasionally
    const octave = Math.random() > 0.7 ? 2 : 1;
    const finalFreq = freq / octave;

    const osc = this.context.createOscillator();
    osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
    osc.frequency.value = finalFreq;

    const gain = this.context.createGain();
    const now = this.context.currentTime;

    // Slow attack, long release (pad-like)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 2.0);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 8.0);

    osc.connect(gain);
    gain.connect(this.audioManager.reverbNode || this.audioManager.masterGain);

    osc.start(now);
    osc.stop(now + 8.0);
  }

  stop() {
    this.active = false;
  }
}

export { MusicSystem };
