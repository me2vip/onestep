// 背景音乐控制器：支持外部文件 + Web Audio API 合成环境音
(function (global) {
  function AudioController() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.volume = 0.6;

    // 外部 <audio> 元素（用户上传文件时使用）
    this.audioEl = null;
    this.externalSourceNode = null;

    // 合成环境音节点引用
    this.synthNodes = null;
    this.synthGain = null;

    // 当前音源类型: 'synth' | 'external'
    this.sourceType = 'synth';
  }

  AudioController.prototype._ensureCtx = function () {
    if (!this.audioCtx) {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return false;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return true;
  };

  // 合成一段柔和的环境音（低频正弦 + 轻微调制）
  AudioController.prototype._startSynth = function () {
    if (!this._ensureCtx()) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(this.volume * 0.35, now + 2.5);
    master.connect(ctx.destination);
    this.synthGain = master;

    // 三个和弦音构成柔和铺底
    const freqs = [110, 164.81, 220]; // A2, E3, A3
    const oscs = [];
    freqs.forEach(function (f, i) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.18 + i * 0.04;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08 + i * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      o.connect(g);
      g.connect(master);
      o.start(now);
      lfo.start(now);
      oscs.push(o, lfo);
    });

    // 添加一些白噪音（柔和呼吸感）
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 600;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    oscs.push(noise);

    this.synthNodes = oscs;
    this.sourceType = 'synth';
  };

  AudioController.prototype._stopSynth = function () {
    const ctx = this.audioCtx;
    if (!ctx || !this.synthNodes) return;
    const now = ctx.currentTime;
    if (this.synthGain) {
      this.synthGain.gain.cancelScheduledValues(now);
      this.synthGain.gain.setValueAtTime(this.synthGain.gain.value, now);
      this.synthGain.gain.linearRampToValueAtTime(0, now + 0.6);
    }
    const nodes = this.synthNodes;
    const gain = this.synthGain;
    setTimeout(function () {
      try {
        nodes.forEach(function (n) { n.stop && n.stop(); n.disconnect && n.disconnect(); });
        if (gain) gain.disconnect();
      } catch (e) {}
    }, 700);
    this.synthNodes = null;
    this.synthGain = null;
  };

  // 外部 <audio>
  AudioController.prototype._startExternal = function () {
    if (!this.audioEl || !this._ensureCtx()) return;
    const ctx = this.audioCtx;
    const el = this.audioEl;
    if (!this.externalSourceNode) {
      this.externalSourceNode = ctx.createMediaElementSource(el);
      const g = ctx.createGain();
      g.gain.value = this.volume;
      this.externalGain = g;
      this.externalSourceNode.connect(g);
      g.connect(ctx.destination);
    }
    el.volume = 1;
    el.loop = true;
    try { el.play(); } catch (e) {}
    this.sourceType = 'external';
  };

  AudioController.prototype._stopExternal = function () {
    if (this.audioEl) {
      try { this.audioEl.pause(); } catch (e) {}
    }
  };

  // 公共 API
  AudioController.prototype.start = function () {
    if (this.isPlaying) return;
    if (this.audioEl && this.audioEl.src) {
      this._startExternal();
    } else {
      this._startSynth();
    }
    this.isPlaying = true;
  };

  AudioController.prototype.stop = function () {
    if (!this.isPlaying) return;
    this._stopSynth();
    this._stopExternal();
    this.isPlaying = false;
  };

  AudioController.prototype.toggle = function () {
    this.isPlaying ? this.stop() : this.start();
    return this.isPlaying;
  };

  AudioController.prototype.setVolume = function (v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audioCtx && this.synthGain) {
      try {
        this.synthGain.gain.linearRampToValueAtTime(this.volume * 0.35, this.audioCtx.currentTime + 0.3);
      } catch (e) {}
    }
    if (this.externalGain && this.audioCtx) {
      try {
        this.externalGain.gain.linearRampToValueAtTime(this.volume, this.audioCtx.currentTime + 0.2);
      } catch (e) {}
    }
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
  };

  // 传入用户上传的 File 对象
  AudioController.prototype.loadFile = function (file) {
    if (!this.audioEl) {
      this.audioEl = new Audio();
    }
    const url = URL.createObjectURL(file);
    this.audioEl.src = url;
    this.audioEl.loop = true;
    // 如果正在播放，则切换到外部音源
    if (this.isPlaying) {
      this._stopSynth();
      this._startExternal();
    }
  };

  global.AudioController = AudioController;
})(window);
