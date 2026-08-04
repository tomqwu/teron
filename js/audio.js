/* ═══════════════════════════════════════════════════════════
   音频 —— 全部用 WebAudio 现场合成，不加载任何音频文件
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Sfx = {

  ctx: null,
  master: null,
  enabled: true,
  noiseBuf: null,
  ambient: null,

  /** 首次用户交互时调用 */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    // 白噪声缓冲
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.6 : 0;
  },

  get t() { return this.ctx.currentTime; },

  /* ── 基本发声单元 ───────────────────── */

  tone(o) {
    if (!this.ok()) return;
    const t0 = this.t + (o.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 != null) {
      if (o.exp === false) osc.frequency.linearRampToValueAtTime(o.f1, t0 + o.dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
    }
    const peak = o.gain == null ? 0.25 : o.gain;
    const atk = o.attack == null ? 0.006 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);

    let node = osc;
    if (o.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.value = o.filterFreq || 900;
      if (o.q) f.Q.value = o.q;
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  },

  noise(o) {
    if (!this.ok()) return;
    const t0 = this.t + (o.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 != null) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
    f.Q.value = o.q == null ? 1.1 : o.q;
    const g = this.ctx.createGain();
    const peak = o.gain == null ? 0.2 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack == null ? 0.008 : o.attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + o.dur + 0.05);
  },

  ok() { return this.ctx && this.enabled; },

  /* ── 音效 ───────────────────────────── */

  play(name) {
    if (!this.ok()) return;
    const S = this.sounds[name];
    if (S) S.call(this);
  },

  sounds: {
    cast_strike() {
      this.noise({ f0: 2600, f1: 700, dur: 0.16, gain: 0.16, q: .8 });
      this.tone({ type: 'triangle', f0: 220, f1: 90, dur: 0.16, gain: 0.16 });
    },
    cast_lance() {
      this.tone({ type: 'triangle', f0: 980, f1: 250, dur: 0.3, gain: 0.16 });
      this.tone({ type: 'sine', f0: 1500, f1: 420, dur: 0.26, gain: 0.09 });
      this.noise({ f0: 3400, f1: 900, dur: 0.28, gain: 0.09, q: 1.6 });
    },
    cast_chains() {
      [520, 690, 880].forEach((f, i) =>
        this.tone({ type: 'square', f0: f, f1: f * .82, dur: 0.16, gain: 0.075, delay: i * 0.055, filter: 'bandpass', filterFreq: f * 1.4, q: 3 }));
      this.noise({ f0: 5200, f1: 2200, dur: 0.35, gain: 0.075, q: 2.4 });
      this.tone({ type: 'sine', f0: 160, f1: 70, dur: 0.4, gain: 0.14 });
    },
    cast_volley() {
      this.tone({ type: 'sawtooth', f0: 180, f1: 620, dur: 0.34, gain: 0.11, filter: 'lowpass', filterFreq: 2000 });
      this.tone({ type: 'sine', f0: 90, f1: 42, dur: 0.5, gain: 0.22 });
      this.noise({ f0: 900, f1: 4200, dur: 0.3, gain: 0.13, q: .7 });
      this.noise({ f0: 5000, f1: 500, dur: 0.45, gain: 0.1, delay: 0.16, q: 1.1 });
    },
    cast_shield() {
      this.tone({ type: 'sine', f0: 330, f1: 660, dur: 0.42, gain: 0.13 });
      this.tone({ type: 'sine', f0: 495, f1: 990, dur: 0.42, gain: 0.06, delay: 0.04 });
    },
    impact() {
      this.noise({ f0: 1500, f1: 320, dur: 0.13, gain: 0.13, q: 1.2 });
      this.tone({ type: 'sine', f0: 150, f1: 60, dur: 0.14, gain: 0.11 });
    },
    impact_big() {
      this.noise({ f0: 900, f1: 180, dur: 0.28, gain: 0.2, q: .9 });
      this.tone({ type: 'sine', f0: 120, f1: 44, dur: 0.32, gain: 0.2 });
    },
    spawn() {
      this.tone({ type: 'sine', f0: 40, f1: 130, dur: 1.1, gain: 0.25 });
      this.noise({ f0: 200, f1: 2600, dur: 0.9, gain: 0.13, q: .6 });
      [196, 233, 294].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f * 2, f1: f, dur: 0.8, gain: 0.06, delay: i * 0.09 }));
    },
    death() {
      this.tone({ type: 'sawtooth', f0: 340, f1: 60, dur: 0.6, gain: 0.13, filter: 'lowpass', filterFreq: 1400 });
      this.noise({ f0: 2800, f1: 260, dur: 0.7, gain: 0.13, q: .8 });
    },
    playerDeath() {
      this.tone({ type: 'sine', f0: 300, f1: 55, dur: 1.0, gain: 0.2 });
      this.noise({ f0: 1600, f1: 120, dur: 1.2, gain: 0.14, q: .7 });
    },
    tick() { this.tone({ type: 'square', f0: 880, dur: 0.05, gain: 0.05, filter: 'bandpass', filterFreq: 1200, q: 3 }); },
    tickHot() { this.tone({ type: 'square', f0: 1320, dur: 0.07, gain: 0.08, filter: 'bandpass', filterFreq: 1600, q: 3 }); },
    target() { this.tone({ type: 'sine', f0: 1200, f1: 1600, dur: 0.06, gain: 0.05 }); },
    error() {
      this.tone({ type: 'square', f0: 180, dur: 0.08, gain: 0.06, filter: 'lowpass', filterFreq: 700 });
      this.tone({ type: 'square', f0: 140, dur: 0.1, gain: 0.06, delay: 0.09, filter: 'lowpass', filterFreq: 700 });
    },
    win() {
      [392, 494, 587, 784].forEach((f, i) =>
        this.tone({ type: 'triangle', f0: f, dur: 0.9 - i * .1, gain: 0.13, delay: i * 0.13 }));
      this.tone({ type: 'sine', f0: 98, dur: 1.6, gain: 0.16, delay: 0.4 });
    },
    lose() {
      [330, 294, 247, 165].forEach((f, i) =>
        this.tone({ type: 'sawtooth', f0: f, dur: 0.8, gain: 0.09, delay: i * 0.16, filter: 'lowpass', filterFreq: 1100 }));
      this.tone({ type: 'sine', f0: 70, f1: 40, dur: 2.0, gain: 0.2, delay: 0.5 });
    },
    aggro() {
      this.tone({ type: 'sawtooth', f0: 70, f1: 48, dur: 1.6, gain: 0.18, filter: 'lowpass', filterFreq: 500 });
      this.noise({ f0: 320, f1: 90, dur: 1.8, gain: 0.1, q: .5 });
    }
  },

  /* ── 环境低鸣 ───────────────────────── */

  startAmbient() {
    if (!this.ok() || this.ambient) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.11, this.t + 3);
    g.connect(this.master);

    const nodes = [];
    [55, 82.5, 110.3].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const og = this.ctx.createGain();
      og.gain.value = i === 2 ? 0.12 : 0.4;
      // 缓慢起伏
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.031;
      const lg = this.ctx.createGain();
      lg.gain.value = i === 2 ? 0.06 : 0.18;
      lfo.connect(lg); lg.connect(og.gain);
      o.connect(og); og.connect(g);
      o.start(); lfo.start();
      nodes.push(o, lfo);
    });

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf; n.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 190; nf.Q.value = .6;
    const ng = this.ctx.createGain(); ng.gain.value = 0.5;
    n.connect(nf); nf.connect(ng); ng.connect(g);
    n.start();
    nodes.push(n);

    this.ambient = { gain: g, nodes };
  },

  stopAmbient() {
    if (!this.ambient) return;
    const a = this.ambient; this.ambient = null;
    try {
      a.gain.gain.cancelScheduledValues(this.t);
      a.gain.gain.setValueAtTime(a.gain.gain.value, this.t);
      a.gain.gain.linearRampToValueAtTime(0, this.t + 0.6);
      a.nodes.forEach(n => { try { n.stop(this.t + 0.7); } catch (e) {} });
    } catch (e) { /* ignore */ }
  }
};
