/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Sound Synthesizer for Vitesse Arcade
class AudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;
  private masterVolume: number = 0.4;

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.engineGain && this.ctx) {
      // Scale idle/running engine vol
      this.engineGain.gain.setValueAtTime(this.masterVolume * 0.15, this.ctx.currentTime);
    }
  }

  // Synthesis for a beep (countdown or menu select)
  playBeep(freq: number = 600, duration: number = 0.1, type: OscillatorType = 'sine') {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  // Synthesize a coin collection sound (Arpeggio!)
  playCoinSound() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.16); // G5
    osc.frequency.setValueAtTime(1046.50, t + 0.24); // C6

    gain.gain.setValueAtTime(this.masterVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // Synthesize dynamic car engine sound that updates real-time frequency
  startEngine() {
    this.init();
    if (!this.ctx || this.isEngineRunning) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const t = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      // Sawtooth gives a nice rumbly car motor sound
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(60, t); // low idle RPM

      // Add a lowpass filter to make engine warmer & deeply bassy
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, t);

      this.engineGain.gain.setValueAtTime(this.masterVolume * 0.15, t);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(t);
      this.isEngineRunning = true;
    } catch (e) {
      console.warn("Failed to start synth engine", e);
    }
  }

  // Update engine pitch/frequency based on relative speed ratio (0 to 1)
  updateEnginePitch(speedRatio: number) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc) return;
    try {
      // map speed ratio 0..1 to oscillator frequency 50Hz..220Hz
      const targetFrequency = 50 + speedRatio * 180;
      this.engineOsc.frequency.setTargetAtTime(targetFrequency, this.ctx.currentTime, 0.05);
    } catch (e) {
      // Ignored
    }
  }

  stopEngine() {
    if (this.engineOsc && this.isEngineRunning) {
      try {
        this.engineOsc.stop();
      } catch (e) {}
      this.engineOsc = null;
      this.engineGain = null;
      this.isEngineRunning = false;
    }
  }

  // Synthesize tire sliding squeal
  playDriftSqueal() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);

    gain.gain.setValueAtTime(this.masterVolume * 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Synthesize metal crash impact
  playCrashSound() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const oscNode = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();

    // Low harsh tone
    oscNode.type = 'sawtooth';
    oscNode.frequency.setValueAtTime(100, t);
    oscNode.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    noiseGain.gain.setValueAtTime(this.masterVolume * 0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    oscNode.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    oscNode.start(t);
    oscNode.stop(t + 0.4);

    // Also inject high-frequency friction crackle to sound like steel scraping/sparking
    try {
      const crackleOsc = this.ctx.createOscillator();
      const crackleGain = this.ctx.createGain();
      crackleOsc.type = 'sine';
      crackleOsc.frequency.setValueAtTime(2000, t);
      crackleOsc.frequency.setValueAtTime(1200, t + 0.1);
      
      crackleGain.gain.setValueAtTime(this.masterVolume * 0.15, t);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      
      crackleOsc.connect(crackleGain);
      crackleGain.connect(this.ctx.destination);
      
      crackleOsc.start(t);
      crackleOsc.stop(t + 0.15);
    } catch (err) {}
  }

  // Synthesize a victory melody
  playVictoryMelody() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const playNote = (freq: number, startTime: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(this.masterVolume * 0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Upbeat progression
    playNote(261.63, t, 0.15);        // C4
    playNote(329.63, t + 0.152, 0.15);  // E4
    playNote(392.00, t + 0.304, 0.15);  // G4
    playNote(523.25, t + 0.456, 0.3);   // C5
    playNote(659.25, t + 0.760, 0.4);   // E5
  }
}

export const audio = new AudioEngine();
