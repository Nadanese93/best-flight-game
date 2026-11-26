// Synthesised sound only: a WebAudio engine hum, a ring chime and a
// landing thud. No audio files, no network, and nothing plays until the
// player has interacted with the page.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 52;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  setEngine(throttle, speed, flying) {
    if (!this.ctx || !this.engineGain) return;
    const target = this.muted || !flying ? 0 : 0.018 + (throttle / 100) * 0.05;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    this.engineOsc.frequency.setTargetAtTime(46 + throttle * 0.9 + speed * 0.35, this.ctx.currentTime, 0.1);
  }

  chime() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [880, 1318].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.55);
    });
  }

  thud() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.25);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  crashSound() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
