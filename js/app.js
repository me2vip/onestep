// 主入口：串联场景、音频、控制面板
(function () {
  const $ = function (id) { return document.getElementById(id); };

  const canvas = $('stage');
  const scene = new window.CanvasScene(canvas);
  const audio = new window.AudioController();

  // 当前模式
  let currentMode = 'harsh';
  function applyQuotes(mode) {
    const data = window.QUOTES;
    let list;
    if (mode === 'harsh') list = data.harsh.slice();
    else if (mode === 'true') list = data.true.slice();
    else list = data.harsh.concat(data.true);
    scene.setMode(mode);
    scene.setQuotes(list);
    $('currentQuote').textContent = '— 共 ' + list.length + ' 条 —';
  }

  // 主显语录显示
  const overlay = $('quoteOverlay');
  const tag = $('quoteTag');
  const textEl = $('quoteText');
  const authorEl = $('quoteAuthor');

  function showQuote(quote, mode) {
    if (!quote) return;
    overlay.classList.remove('show');
    // 强制回流以重新播放动画
    void overlay.offsetWidth;
    tag.textContent = (mode === 'harsh') ? '狠话' : (mode === 'true') ? '真心' : '语录';
    textEl.textContent = quote.text;
    authorEl.textContent = '— ' + (quote.author || '网络');
    overlay.classList.remove('mode-true');
    if (mode === 'true') overlay.classList.add('mode-true');
    overlay.classList.add('show');
  }

  scene.onMainQuoteChange = function (q) {
    showQuote(q, currentMode);
  };

  // 面板折叠
  const panel = $('panel');
  $('panelToggle').addEventListener('click', function () {
    panel.classList.toggle('collapsed');
  });

  // 模式切换按钮
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      currentMode = mode;
      panel.classList.remove('mode-harsh', 'mode-true');
      if (mode === 'harsh') panel.classList.add('mode-harsh');
      if (mode === 'true') panel.classList.add('mode-true');
      applyQuotes(mode);
      scene.shuffle();
    });
  });

  // 速度
  $('speedRange').addEventListener('input', function (e) {
    const v = parseFloat(e.target.value);
    scene.speed = v;
    $('speedValue').textContent = v.toFixed(1) + 'x';
  });

  // 特效
  $('fxRange').addEventListener('input', function (e) {
    const v = parseInt(e.target.value, 10);
    scene.fxIntensity = v;
    const label = v < 25 ? '弱' : v < 60 ? '中' : v < 85 ? '强' : '极';
    $('fxValue').textContent = label;
  });

  // 字体大小
  $('sizeRange').addEventListener('input', function (e) {
    const v = parseInt(e.target.value, 10);
    scene.fontSize = v;
    $('sizeValue').textContent = v + 'px';
  });

  // 音乐按钮
  const musicBtn = $('musicBtn');
  const musicBtnText = $('musicBtnText');
  const musicState = $('musicState');
  function updateMusicUI() {
    if (audio.isPlaying) {
      musicBtnText.textContent = '关闭';
      musicState.textContent = '播放中';
    } else {
      musicBtnText.textContent = '开启';
      musicState.textContent = '关闭';
    }
  }
  musicBtn.addEventListener('click', function () {
    audio.toggle();
    updateMusicUI();
  });

  // 音量
  $('volRange').addEventListener('input', function (e) {
    const v = parseInt(e.target.value, 10) / 100;
    audio.setVolume(v);
    $('volValue').textContent = Math.round(v * 100) + '%';
  });

  // 上传音乐
  $('fileInput').addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    audio.loadFile(f);
    if (!audio.isPlaying) {
      audio.toggle();
      updateMusicUI();
    } else {
      musicState.textContent = '外部音源';
    }
  });

  // 随机语录
  $('randomBtn').addEventListener('click', function () {
    const q = scene.highlightRandom();
    if (q) showQuote(q, currentMode);
  });

  $('resetBtn').addEventListener('click', function () {
    scene.offset = 0;
    scene.shuffle();
  });

  // 启动界面
  const starter = $('starter');
  $('startBtn').addEventListener('click', function () {
    starter.classList.add('hidden');
    applyQuotes(currentMode);
    scene.start();
    // 默认开启音乐（合成环境音）
    audio.setVolume(parseInt($('volRange').value, 10) / 100);
    audio.start();
    updateMusicUI();
    setTimeout(function () { starter.style.display = 'none'; }, 900);

    // 显示第一条主显语录
    if (scene.quotes.length) {
      showQuote(scene.quotes[0], currentMode);
    }
  });

  // 初始化显示
  applyQuotes(currentMode);
})();
