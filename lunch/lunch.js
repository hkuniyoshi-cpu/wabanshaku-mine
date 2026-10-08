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
    document.querySelectorAll('.dish, .koda, .koda-photo, .ichiban-v, .ichiban-h, .jushi-photo, .jushi-v, .jushi-h, .drinks, .oshiharai, .annai-list, .annai-links, .yoru-title, .yoru-body, .yoru-link')
      .forEach(function (el) { el.classList.add('rv'); rv.observe(el); });
  }
})();
