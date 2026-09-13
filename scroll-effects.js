/* ============================================================
   scroll-effects.js — Minimal safe orchestration (v6)
   ============================================================ */
(function() {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.documentElement.classList.add('no-motion');
    document.querySelectorAll('.reveal, .reveal-mask, .img-reveal, .gallery-item, .feat, .sec-head, .menu-card, .review, .blog-card, .scene-card, .sns-card, .delivery-card, .qa-item')
      .forEach(el => el.classList.add('is-visible'));
    return;
  }

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  /* ==============================
     Aside photo swap (double-buffered)
     ============================== */
  const _aside = { urls: [], current: -1 };
  function ensureAlt() {
    let alt = document.getElementById('asidePhotoAlt');
    if (alt) return alt;
    const base = document.getElementById('asidePhoto');
    if (!base) return null;
    alt = document.createElement('div');
    alt.id = 'asidePhotoAlt';
    alt.className = 'aside-photo aside-photo-alt';
    alt.setAttribute('aria-hidden', 'true');
    alt.dataset.parallax = base.dataset.parallax || '0.35';
    base.parentNode.insertBefore(alt, base.nextSibling);
    return alt;
  }
  window.__setAsidePhoto = function(idx, urls) {
    if (urls && urls.length) _aside.urls = urls;
    if (!_aside.urls.length) return;
    if (_aside.current === idx) return;
    const target = _aside.urls[idx % _aside.urls.length];
    if (!target) return;
    const base = document.getElementById('asidePhoto');
    const alt = ensureAlt();
    if (!base) return;
    _aside.current = idx;
    const img = new Image();
    img.onload = function() {
      if (!alt) {
        base.style.backgroundImage = 'url("' + target + '")';
        base.classList.add('active');
        return;
      }
      const showingAlt = alt.classList.contains('active');
      const front = showingAlt ? base : alt;
      const back  = showingAlt ? alt : base;
      front.style.backgroundImage = 'url("' + target + '")';
      // reflow
      void front.offsetHeight;
      front.classList.add('active');
      back.classList.remove('active');
    };
    img.src = target;
  };

  /* ==============================
     Scroll-linked (rAF throttled)
     ============================== */
  let ticking = false;
  let _sections = [], _nav = null, _parallax = [], _bar = null, _inner = null, _vert = null;
  function cache() {
    _sections = Array.from(document.querySelectorAll('.section[id]'));
    _nav = document.querySelectorAll('.aside-nav a[data-target]');
    _parallax = Array.from(document.querySelectorAll('[data-parallax]')).map(el => ({ el, speed: parseFloat(el.dataset.parallax) || 0.3 }));
    _bar = document.querySelector('.scroll-progress');
    _inner = document.querySelector('.aside-inner');
    _vert = document.querySelector('.aside-vertical');
  }

  function updateFrame() {
    ticking = false;
    const vp = window.innerHeight || 720;
    const sy = window.scrollY || document.documentElement.scrollTop || 0;

    // Progress bar
    if (_bar) {
      const h = document.documentElement.scrollHeight - vp;
      _bar.style.width = (h > 0 ? (sy / h) * 100 : 0).toFixed(2) + '%';
    }
    // Parallax
    for (let i = 0; i < _parallax.length; i++) {
      const o = _parallax[i];
      const r = o.el.getBoundingClientRect();
      const rel = ((r.top + r.height / 2) - vp / 2) / vp;
      o.el.style.setProperty('--parallax-y', (-rel * o.speed * 80).toFixed(1) + 'px');
    }
    // Aside drift
    if (_inner) {
      const t = clamp(sy / (vp * 1.2), 0, 1);
      _inner.style.opacity = (1 - t * 0.65).toFixed(3);
      _inner.style.transform = 'translate3d(0,' + (-t * 34).toFixed(1) + 'px,0)';
    }
    if (_vert) {
      const t = clamp(sy / (vp * 1.1), 0, 1);
      _vert.style.opacity = (1 - t * 0.85).toFixed(3);
    }
    // Section-active + aside photo swap
    if (_sections.length && _nav && _nav.length) {
      let best = -1, bestScore = -Infinity, bestPhoto = 0;
      for (let i = 0; i < _sections.length; i++) {
        const r = _sections[i].getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= vp) continue;
        const sc = -Math.abs((r.top + r.height / 2) - vp * 0.4);
        if (sc > bestScore) {
          bestScore = sc; best = i;
          bestPhoto = parseInt(_sections[i].dataset.photo || '0', 10);
        }
      }
      if (best >= 0) {
        const id = _sections[best].id;
        for (let i = 0; i < _nav.length; i++) {
          const a = _nav[i];
          const should = a.dataset.target === id;
          if (a.classList.contains('active') !== should) a.classList.toggle('active', should);
        }
        if (bestPhoto !== _aside.current) window.__setAsidePhoto(bestPhoto);
      }
    }
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateFrame);
  }

  /* ==============================
     Reveal (IntersectionObserver)
     ============================== */
  let _io = null;
  function bindReveals() {
    if (!_io) {
      _io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const el = e.target;
            el.classList.add('is-visible');
            if (el.dataset.inlineFallback === '1') { el.style.opacity=''; el.style.transform=''; el.style.transition=''; }
            _io.unobserve(el);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    }
    document.querySelectorAll(
      '.reveal:not(.is-visible), .reveal-mask:not(.is-visible), .img-reveal:not(.is-visible), .split-line:not(.is-visible), .sec-head:not(.is-visible), .feat:not(.is-visible), .gallery-item:not(.is-visible)'
    ).forEach(el => _io.observe(el));
    document.querySelectorAll(
      '.menu-card:not(.is-visible), .review:not(.is-visible), .blog-card:not(.is-visible), .scene-card:not(.is-visible), .sns-card:not(.is-visible), .delivery-card:not(.is-visible), .qa-item:not(.is-visible)'
    ).forEach(el => {
      if (!el.dataset.inlineFallback) {
        el.dataset.inlineFallback = '1';
        el.style.opacity = '0';
        el.style.transform = 'translateY(28px)';
        el.style.transition = 'opacity 1.2s cubic-bezier(.22,1,.36,1), transform 1.2s cubic-bezier(.22,1,.36,1)';
      }
      _io.observe(el);
    });
  }

  /* ==============================
     Boot
     ============================== */
  function boot() {
    cache();
    bindReveals();
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => { cache(); schedule(); }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__scrollFx = {
    rebindAll: () => { cache(); bindReveals(); schedule(); },
    forceUpdate: schedule
  };
})();
