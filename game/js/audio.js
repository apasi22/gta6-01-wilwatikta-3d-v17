// audio.js — procedural sound: a gamelan loop (pentatonic plucks with a
// metallic shimmer), an engine hum that follows speed, and UI blips. No
// audio files; everything is synthesized with WebAudio.

'use strict';

const AudioSys = {
  ctx: null, master: null, musicOn: true, engineOsc: null, engineGain: null,
  step: 0, timer: null,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 320;
      this.engineOsc.connect(filt); filt.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (e) { this.ctx = null; }
  },
  // one bonang-style note: a sine with a bright partial, quick attack, long ring.
  pluck(freq, when, vol) {
    if (!this.ctx || !this.musicOn) return;
    const t = when;
    const o1 = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 2.76;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.25;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this.master);
    o1.start(t); o2.start(t); o1.stop(t + 1.7); o2.stop(t + 1.7);
  },
  // slendro-ish pentatonic cycle, 8 steps a bar, two bars a phrase.
  tick() {
    if (!this.ctx || !this.musicOn) return;
    const scale = [220, 261.6, 293.7, 349.2, 392, 440];
    const melody = [0, 2, 4, 3, 5, 4, 2, 1, 0, 2, 4, 5, 4, 3, 2, 0];
    const t = this.ctx.currentTime + 0.05;
    const n = melody[this.step % melody.length];
    this.pluck(scale[n], t, 0.22);
    if (this.step % 4 === 0) this.pluck(scale[0] / 2, t, 0.3); // gong pulse
    if (this.step % 8 === 4) this.pluck(scale[2] * 2, t, 0.08);
    this.step++;
  },
  startMusic() {
    this.init();
    if (!this.ctx || this.timer) return;
    this.timer = setInterval(() => this.tick(), 420);
  },
  setEngine(speed, maxSpeed) {
    if (!this.ctx) return;
    const f = 45 + (speed / maxSpeed) * 110;
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(speed > 1 ? 0.05 : 0, this.ctx.currentTime, 0.2);
  },
  blip(freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq || 660;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.15);
  },
};
