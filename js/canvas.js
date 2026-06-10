// Canvas 场景：绘制"一级台阶" + 文字 + 粒子特效
(function (global) {
  const TAU = Math.PI * 2;

  function CanvasScene(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 状态
    this.mode = 'harsh';            // harsh | true | mix
    this.quotes = [];
    this.speed = 1.0;                // 滚动速度
    this.fxIntensity = 50;           // 特效强度 0-100
    this.fontSize = 16;              // 台阶文字大小
    this.offset = 0;                 // 滚动累计偏移（像素）
    this.running = false;

    // 颜色方案
    this.colorSchemes = {
      harsh: {
        top: '#ff6fae',
        topGlow: 'rgba(255, 46, 156, 0.85)',
        front: '#3a1a3a',
        edge: '#ff2e9c',
        edgeSoft: 'rgba(255, 46, 156, 0.45)',
        text: '#ffd8ec',
        textDim: 'rgba(255, 216, 236, 0.65)',
        particle: ['#ff2e9c', '#ff6fae', '#ffb3d6', '#00e5ff']
      },
      true: {
        top: '#ffe4a3',
        topGlow: 'rgba(255, 216, 107, 0.85)',
        front: '#2a2014',
        edge: '#ffd86b',
        edgeSoft: 'rgba(255, 216, 107, 0.45)',
        text: '#fff7dd',
        textDim: 'rgba(255, 247, 221, 0.65)',
        particle: ['#ffd86b', '#ffe4a3', '#ffb347', '#ffffff']
      },
      mix: {
        top: '#a6c7ff',
        topGlow: 'rgba(0, 229, 255, 0.75)',
        front: '#1a1e3a',
        edge: '#00e5ff',
        edgeSoft: 'rgba(0, 229, 255, 0.45)',
        text: '#e8f1ff',
        textDim: 'rgba(232, 241, 255, 0.65)',
        particle: ['#00e5ff', '#ff2e9c', '#ffd86b', '#ffffff']
      }
    };

    // 粒子数组
    this.particles = [];
    this._targetParticleCount = 40;

    // 尺寸
    this.width = 0;
    this.height = 0;

    // 观察者回调
    this.onMainQuoteChange = null;

    // 主显高亮引用
    this.highlightIndex = -1;

    this._bindResize();
    this.resize();
  }

  CanvasScene.prototype._bindResize = function () {
    const self = this;
    global.addEventListener('resize', function () { self.resize(); });
  };

  CanvasScene.prototype.resize = function () {
    const w = this.canvas.clientWidth || global.innerWidth;
    const h = this.canvas.clientHeight || global.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
  };

  CanvasScene.prototype.setMode = function (mode) {
    this.mode = mode;
  };

  CanvasScene.prototype.setQuotes = function (arr) {
    this.quotes = arr || [];
    // 打乱顺序
    for (let i = this.quotes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = this.quotes[i]; this.quotes[i] = this.quotes[j]; this.quotes[j] = t;
    }
  };

  CanvasScene.prototype.shuffle = function () {
    this.setQuotes(this.quotes.slice());
    this.offset = 0;
  };

  CanvasScene.prototype.highlightRandom = function () {
    if (!this.quotes.length) return null;
    const idx = Math.floor(Math.random() * this.quotes.length);
    this.highlightIndex = idx;
    // 2.5秒后取消高亮
    const self = this;
    clearTimeout(this._highlightTimer);
    this._highlightTimer = setTimeout(function () {
      self.highlightIndex = -1;
    }, 3800);
    return this.quotes[idx];
  };

  CanvasScene.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now();
    const self = this;
    function frame(t) {
      if (!self.running) return;
      const dt = Math.min(0.05, (t - self._lastTime) / 1000);
      self._lastTime = t;
      self.update(dt);
      self.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  CanvasScene.prototype.stop = function () {
    this.running = false;
  };

  CanvasScene.prototype.update = function (dt) {
    // 台阶向上滚动（offset增加，视觉上文字上移）
    const stepHeight = this._stepHeight();
    this.offset += stepHeight * 0.12 * this.speed * dt * 60;

    // 更新粒子数量
    const target = Math.floor((this.fxIntensity / 100) * 90) + 10;
    this._targetParticleCount = target;
    while (this.particles.length < target) {
      this.particles.push(this._createParticle());
    }
    if (this.particles.length > target + 6) {
      this.particles.length = target;
    }
    // 更新粒子
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.y += p.vy * dt * 60;
      p.x += p.vx * dt * 60;
      p.life += dt;
      p.alpha = Math.max(0, Math.min(1, 1 - p.life / p.maxLife));
      if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > this.width + 20) {
        this.particles[i] = this._createParticle();
      }
    }
  };

  CanvasScene.prototype._stepHeight = function () {
    return Math.max(34, this.fontSize * 2.2);
  };

  CanvasScene.prototype._createParticle = function () {
    const colors = this.colorSchemes[this.mode].particle;
    return {
      x: Math.random() * this.width,
      y: this.height + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.3 - Math.random() * 0.7,
      r: 0.8 + Math.random() * 2.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: 3 + Math.random() * 4,
      alpha: 0.5 + Math.random() * 0.5,
      twinkle: Math.random() * TAU
    };
  };

  CanvasScene.prototype._scheme = function () {
    return this.colorSchemes[this.mode] || this.colorSchemes.mix;
  };

  CanvasScene.prototype.draw = function () {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    const scheme = this._scheme();

    // 清屏（带淡淡的拖影，形成流动感）
    ctx.fillStyle = 'rgba(10, 6, 24, 0.35)';
    ctx.fillRect(0, 0, W, H);

    // 背景径向光晕
    const bgGrad = ctx.createRadialGradient(W * 0.7, H * 1.05, 60, W * 0.5, H * 0.5, Math.max(W, H));
    bgGrad.addColorStop(0, scheme.edgeSoft);
    bgGrad.addColorStop(0.4, 'rgba(26, 11, 46, 0.1)');
    bgGrad.addColorStop(1, 'rgba(10, 6, 24, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 画粒子（在台阶背后，有轻微闪烁）
    this._drawParticles(ctx, scheme);

    // 画台阶
    this._drawStairs(ctx, scheme);
  };

  CanvasScene.prototype._drawParticles = function (ctx, scheme) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const tw = 0.6 + 0.4 * Math.sin(p.life * 3 + p.twinkle);
      ctx.globalAlpha = p.alpha * tw;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  CanvasScene.prototype._drawStairs = function (ctx, scheme) {
    const W = this.width, H = this.height;
    const stepH = this._stepHeight();
    const stepDepth = stepH * 0.6;       // 顶面宽度（水平）
    const stepRise = stepH * 0.45;       // 立面高度（垂直）
    const startY = H - 40;                // 最底部一级台阶的上缘
    const leftX = W * 0.08;
    const rightBase = W * 0.92;

    // 决定主显语录的台阶索引（屏幕中部）
    let mainIndex = -1;
    let mainCenterY = Infinity;

    // 画若干级台阶，从底向上
    const maxSteps = Math.ceil(H / stepH) + 4;
    const offset = this.offset % stepH;

    // 字体
    ctx.font = `${this.fontSize}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textBaseline = 'middle';

    // 主显台阶段：最大的字体（在 overlay 里显示，这里台阶里只是罗列）
    for (let i = 0; i < maxSteps; i++) {
      // 相对位置：i=0 是屏幕最下方可见一级，然后 i 越大越往上
      // 加上 offset 让台阶滚动
      const cy = startY - i * stepH + offset;
      if (cy < -stepH * 2 || cy > H + stepH) continue;

      // 计算语录索引
      // 让屏幕中央附近的索引稳定变化
      let quoteIdx;
      if (this.mode === 'mix') {
        quoteIdx = Math.floor(i + this.offset / stepH);
      } else {
        quoteIdx = Math.floor(i + this.offset / stepH);
      }
      quoteIdx = ((quoteIdx % this.quotes.length) + this.quotes.length) % this.quotes.length;
      const quote = this.quotes[quoteIdx] || { text: '', author: '' };

      // 透视缩小：越往上越小
      const scale = Math.max(0.35, 1 - (startY - cy) / H * 1.1);
      const depth = stepDepth * scale;
      const rise = stepRise * scale;

      // 右侧收窄：形成透视
      const rightX = rightBase - (startY - cy) * 0.18;
      const xL = leftX;
      const xR = Math.max(xL + 60, rightX);

      // 顶面四个点
      const topY = cy - rise;
      const frontTopY = cy;
      const frontBottomY = cy + 4 * scale;

      // 颜色渐变：顶面亮，前方暗
      const topGrad = ctx.createLinearGradient(xL, topY, xR, topY);
      topGrad.addColorStop(0, scheme.front);
      topGrad.addColorStop(0.5, scheme.top);
      topGrad.addColorStop(1, scheme.front);

      // 顶面
      ctx.beginPath();
      ctx.moveTo(xL, frontTopY);
      ctx.lineTo(xL - depth, topY);
      ctx.lineTo(xR - depth, topY - (xR - xL) * 0.02);
      ctx.lineTo(xR, frontTopY - (xR - xL) * 0.00);
      ctx.closePath();
      const topFill = ctx.createLinearGradient(xL, topY, xR, frontTopY);
      topFill.addColorStop(0, scheme.front);
      topFill.addColorStop(0.5, scheme.top);
      topFill.addColorStop(1, scheme.front);
      ctx.fillStyle = topFill;
      ctx.shadowColor = scheme.topGlow;
      ctx.shadowBlur = 20 * scale;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 立面（前方）
      ctx.beginPath();
      ctx.moveTo(xL, frontTopY);
      ctx.lineTo(xR, frontTopY);
      ctx.lineTo(xR, frontBottomY);
      ctx.lineTo(xL, frontBottomY);
      ctx.closePath();
      const frontGrad = ctx.createLinearGradient(0, frontTopY, 0, frontBottomY);
      frontGrad.addColorStop(0, scheme.front);
      frontGrad.addColorStop(1, '#000');
      ctx.fillStyle = frontGrad;
      ctx.fill();

      // 棱边发光线
      ctx.strokeStyle = scheme.edge;
      ctx.lineWidth = 1.2 * scale;
      ctx.shadowColor = scheme.edgeSoft;
      ctx.shadowBlur = 14 * scale;
      ctx.beginPath();
      ctx.moveTo(xL, frontTopY);
      ctx.lineTo(xR, frontTopY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 文字：放在顶面中间（随台阶倾斜）
      const text = quote.text;
      const fontSize = Math.max(10, this.fontSize * scale * 0.85);
      ctx.font = `${fontSize}px ${getComputedStyle(document.body).fontFamily}`;
      const maxTextW = (xR - xL) * 0.85;
      const displayText = this._truncateText(ctx, text, maxTextW);
      const textW = ctx.measureText(displayText).width;

      // 文本位置：顶面中央
      const tx = xL + (xR - xL) / 2 - textW / 2;
      const ty = (frontTopY + topY) / 2;

      // 淡入淡出：距离屏幕中央越近越清晰
      const centerDist = Math.abs(cy - H * 0.55) / (H * 0.5);
      const alpha = Math.max(0, Math.min(1, 1 - centerDist * 1.2));

      // 高亮处理
      if (this.highlightIndex === quoteIdx && scale > 0.6) {
        ctx.shadowColor = scheme.edge;
        ctx.shadowBlur = 24;
        ctx.fillStyle = scheme.text;
        ctx.globalAlpha = 1;
        ctx.fillText(displayText, tx, ty);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = (scale > 0.7) ? scheme.text : scheme.textDim;
        ctx.globalAlpha = alpha;
        ctx.fillText(displayText, tx, ty);
      }
      ctx.globalAlpha = 1;

      // 主显语录：挑出最靠近 H*0.45 的一级
      const d = Math.abs(cy - H * 0.45);
      if (d < mainCenterY) {
        mainCenterY = d;
        mainIndex = quoteIdx;
      }
    }

    // 回调：切换主显语录
    if (mainIndex !== -1 && mainIndex !== this._lastMainIndex) {
      this._lastMainIndex = mainIndex;
      if (typeof this.onMainQuoteChange === 'function') {
        this.onMainQuoteChange(this.quotes[mainIndex], mainIndex);
      }
    }
  };

  CanvasScene.prototype._truncateText = function (ctx, text, maxW) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxW) return text;
    const ellipsis = '…';
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const sub = text.slice(0, mid) + ellipsis;
      if (ctx.measureText(sub).width <= maxW) lo = mid; else hi = mid - 1;
    }
    return text.slice(0, lo) + ellipsis;
  };

  global.CanvasScene = CanvasScene;
})(window);
