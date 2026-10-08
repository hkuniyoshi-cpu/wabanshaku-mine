/* 沖縄そば 嶺 — 巻物スクロール
   横長画面では html が rtl の横スクロール（右端始まり）。
   マウスホイールの縦回転・↓キーを「左へ進む」に読み替えるだけで、スクロール自体はブラウザ標準。 */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var mq = window.matchMedia('(min-width: 900px) and (min-height: 620px)');
  var bar = document.getElementById('progressBar');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function horizontal() { return mq.matches; }
  function go(px) { window.scrollBy({ left: -px, top: 0, behavior: 'instant' }); }

  // 縦ホイール → 左へ（トラックパッドの横スワイプや Ctrl+ホイールの拡大はそのまま）
  window.addEventListener('wheel', function (e) {
    if (!horizontal() || e.ctrlKey) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    var unit = e.deltaMode === 1 ? 40 : (e.deltaMode === 2 ? window.innerWidth : 1);
    go(e.deltaY * unit);
  }, { passive: false });

  // キーボード: ↓ / PageDown / Space = 進む、↑ / PageUp = 戻る
  window.addEventListener('keydown', function (e) {
    if (!horizontal() || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var page = window.innerWidth * 0.8, d = 0;
    if (e.key === 'ArrowDown') d = 120;
    else if (e.key === 'ArrowUp') d = -120;
    else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) d = page;
    else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) d = -page;
    else if (e.key === 'Home') d = -1e7;
    else if (e.key === 'End') d = 1e7;
    if (!d) return;
    if (e.key === ' ' && t && (t.tagName === 'A' || t.tagName === 'BUTTON' || t.tagName === 'SUMMARY')) return;
    e.preventDefault();
    window.scrollBy({ left: -d, top: 0, behavior: reduce ? 'instant' : 'smooth' });
  });

  // 文節改行（BudouX）: 日本語の文章を文節の切れ目でだけ折り返す（縦書きにも効く）
  var bxReady = false;
  try {
    if (window.customElements && customElements.get('budoux-ja')) {
      var bxParser = document.createElement('budoux-ja').parser;
      bxReady = !!bxParser;
      document.querySelectorAll('.makimono h1, .makimono h2, .makimono h3, .makimono p, .makimono dt, .makimono dd, .makimono li, .makimono a, .rail a, .hiru-yoru .hy').forEach(function (el) {
        // 英語・繁体字を含む要素、住所など実用情報（コピーされる文字列）は対象外
        if (el.closest('[lang="en"], [lang="zh-Hant"], .tobira-info, [data-nobx]') || el.querySelector('img, [lang="en"], [lang="zh-Hant"]')) return;
        bxParser.applyToElement(el);
        el.classList.add('bx');
      });
    }
  } catch (e) { /* 改行調整は失敗しても表示に影響させない */ }

  // 文字が1つずつ、ひらりと現れる演出。
  // BudouX が入れた文節の切れ目（ゼロ幅スペース）ごとに「文節の箱」を作り、その中の文字を1つずつ動かす。
  // 文節の箱の途中では折り返さないので、文節改行はそのまま保たれる。
  // 文節の切れ目が入っていない状態で分割すると、長い文が折り返せなくなるので、その場合は演出しない
  var fxEls = [];
  if (!reduce && bxReady) {
    try {
      var FX_SEL = '.tobira-kicker, .tobira-copy, .ichiban-name, .ichiban-v .body-v, .ichiban-v .note-v, .sec-v, .koda-h, .koda .body-v, .dish-name, .dish-v .body-v, .jushi-name, .jushi-v .body-v, .yoru-kicker, .yoru-title, .yoru-body';
      document.querySelectorAll(FX_SEL).forEach(function (el) {
        if (el.querySelector('a, img, [lang]') || !el.classList.contains('bx')) return;
        var plain = el.textContent.replace(/\u200B/g, '').replace(/\s+/g, ' ').trim();
        if (!plain) return;
        var heading = /^H[1-6]$/.test(el.tagName) || el.classList.contains('tobira-copy');
        var count = 0;
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var nodes = [], n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(function (node) {
          var text = node.nodeValue;
          if (!text.replace(/[\s\u200B]/g, '')) return;
          var frag = document.createDocumentFragment();
          text.split('\u200B').forEach(function (phrase) {
            if (!phrase) return;
            var ph = document.createElement('span');
            ph.className = 'ph';
            Array.from(phrase).forEach(function (c) {
              if (c === ' ' || c === '\u3000' || c === '\n') { ph.appendChild(document.createTextNode(c)); return; }
              var ch = document.createElement('span');
              ch.className = 'ch';
              ch.style.setProperty('--i', count++);
              ch.textContent = c;
              ph.appendChild(ch);
            });
            frag.appendChild(ph);
          });
          node.parentNode.replaceChild(frag, node);
        });
        if (!count) return;
        // 読み上げには元の文をそのまま渡し、1文字ずつの箱は読み上げ対象から外す
        var vis = document.createElement('span');
        vis.setAttribute('aria-hidden', 'true');
        while (el.firstChild) vis.appendChild(el.firstChild);
        var sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = plain;
        el.appendChild(sr);
        el.appendChild(vis);
        // 見出しはゆっくり、本文は全体が 1.4 秒ほどで出そろう速さ
        el.style.setProperty('--step', (heading ? 0.07 : Math.min(0.03, 1.4 / count)).toFixed(4) + 's');
        el.classList.add('fx');
        fxEls.push(el);
      });
    } catch (e) { /* 演出は失敗しても文章はそのまま読める */ }
  }

  // 屋号（嶺）を押したら巻物の先頭＝右端へ戻る（縦スクロール時はページ最上部）
  var brand = document.querySelector('.rail-brand');
  if (brand) brand.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ left: 0, top: 0, behavior: reduce ? 'instant' : 'smooth' });
    if (history.replaceState) history.replaceState(history.state, '', location.pathname + location.search);
  });

  // 進み具合
  var ticking = false;
  function progress() {
    ticking = false;
    if (!bar) return;
    var max = root.scrollWidth - window.innerWidth;
    var p = max > 0 ? Math.min(1, Math.abs(window.scrollX) / max) : 0;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(progress); }
  }, { passive: true });
  window.addEventListener('resize', progress);
  // 英語説明の開閉などで巻物の長さが変わったら進み具合を取り直す
  if ('ResizeObserver' in window) new ResizeObserver(progress).observe(document.getElementById('makimono'));
  progress();

  // 目次の現在地 + 登場の動き
  var links = {};
  document.querySelectorAll('.rail-nav a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var owner = { jushi: 'oshinagaki', nomimono: 'hiyashi', yoru: 'annai' };
  var panels = document.querySelectorAll('.panel');
  var here = null; // いま画面中央にある面（縦⇔横の切り替え時に同じ面へ戻すため）
  if ('IntersectionObserver' in window) {
    var cur = null;
    var watch = function () {
      if (cur) cur.disconnect();
      // 画面中央の細い帯と交わった面を現在地とする。横モードは左右、縦モードは上下だけ絞る
      cur = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          here = en.target;
          var id = owner[en.target.id] || en.target.id;
          Object.keys(links).forEach(function (k) {
            var on = k === id;
            links[k].classList.toggle('is-on', on);
            if (on) links[k].setAttribute('aria-current', 'location'); else links[k].removeAttribute('aria-current');
          });
        });
      }, { rootMargin: horizontal() ? '0px -45% 0px -45%' : '-45% 0px -45% 0px' });
      panels.forEach(function (p) { cur.observe(p); });
    };
    watch();
    var onMode = function () {
      var keep = here;
      watch();
      if (keep) requestAnimationFrame(function () { keep.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' }); progress(); });
    };
    if (mq.addEventListener) mq.addEventListener('change', onMode); else if (mq.addListener) mq.addListener(onMode);

    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); } });
    }, { rootMargin: '0px -6% 0px -6%', threshold: 0.08 });
    document.querySelectorAll('.dish-photo, .dish-h, .koda-photo, .ichiban-photo, .ichiban-h, .jushi-photo, .jushi-h, .drinks, .oshiharai, .annai-list, .annai-links, .yoru-link')
      .forEach(function (el) { el.classList.add('rv'); rv.observe(el); });

    // 文字演出の開始: 画面に入ったら .cue を付ける。準備に失敗したら全部すぐ表示する
    try {
      var cue = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('cue'); cue.unobserve(en.target); } });
      }, { rootMargin: '0px -8% 0px -8%', threshold: 0.05 });
      fxEls.forEach(function (el) { cue.observe(el); });
    } catch (e) {
      fxEls.forEach(function (el) { el.classList.add('cue'); });
    }
  } else {
    fxEls.forEach(function (el) { el.classList.add('cue'); });
  }
})();
