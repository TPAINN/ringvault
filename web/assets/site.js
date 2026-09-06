/* ═══════════════════════════════════════════════════════════
   RingVault landing — motion layer v2
   GSAP 3.13 + SplitText + ScrollTrigger + Lenis (CDN, UMD)
   Text Reveal 02: [data-reveal-02] splits, fades pieces from opacity .1
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasSplit = hasGsap && typeof window.SplitText !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';

  /* ── Theme switcher (drives CSS vars incl. halos/glows) ── */
  var THEMES = {
    amber: { primary: '#ffb74d', primaryD: '#e09b35', rgb: '255,183,77', accent: '#42a5f5', accentRgb: '66,165,245' },
    blue:  { primary: '#42a5f5', primaryD: '#2196f3', rgb: '66,165,245', accent: '#ffb74d', accentRgb: '255,183,77' },
    green: { primary: '#66bb6a', primaryD: '#4caf50', rgb: '102,187,106', accent: '#42a5f5', accentRgb: '66,165,245' },
    rose:  { primary: '#f06292', primaryD: '#e91e63', rgb: '240,98,146', accent: '#42a5f5', accentRgb: '66,165,245' }
  };
  function applyTheme(name) {
    var t = THEMES[name];
    if (!t) return;
    var s = document.documentElement.style;
    s.setProperty('--primary', t.primary);
    s.setProperty('--primary-d', t.primaryD);
    s.setProperty('--primary-rgb', t.rgb);
    s.setProperty('--accent', t.accent);
    s.setProperty('--accent-rgb', t.accentRgb);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.primary);
    document.querySelectorAll('.theme-dot').forEach(function (d) {
      d.classList.toggle('active', d.dataset.theme === name);
    });
    try { localStorage.setItem('rv-theme', name); } catch (e) {}
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('rv-theme'); } catch (e) {}
    if (saved && THEMES[saved]) applyTheme(saved);
    document.querySelectorAll('.theme-dot').forEach(function (dot) {
      dot.addEventListener('click', function () { applyTheme(dot.dataset.theme); });
    });
  }

  /* ── Custom cursor — viewfinder reticle (pointer:fine, motion-safe) ──
     No dot-and-ring blob: full-viewport crosshair hairlines, a diamond
     marker at the aim point, and corner brackets that snap out to lock
     onto the bounds of whatever you hover — an instrument, not an ornament. */
  function initCursor() {
    if (!finePointer || reduced) return;
    var xline = document.querySelector('.cursor-x');
    var yline = document.querySelector('.cursor-y');
    var mark  = document.querySelector('.cursor-mark');
    var ret   = document.querySelector('.cursor-reticle');
    if (!xline || !yline || !mark || !ret) return;
    document.body.classList.add('has-cursor');

    /* hairlines follow at 0.55 — felt, not chased; the diamond rides the tip */
    var lx = window.gsap.quickTo(xline, 'x', { duration: 0.55, ease: 'power2.out' });
    var ly = window.gsap.quickTo(yline, 'y', { duration: 0.55, ease: 'power2.out' });
    var mx = window.gsap.quickTo(mark, 'x', { duration: 0.12, ease: 'power2.out' });
    var my = window.gsap.quickTo(mark, 'y', { duration: 0.12, ease: 'power2.out' });
    /* reticle is a strict follower — lerped bounds, no easing of its own */
    var rx = window.gsap.quickSetter(ret, 'x', 'px');
    var ry = window.gsap.quickSetter(ret, 'y', 'px');
    var rw = window.gsap.quickSetter(ret, 'width', 'px');
    var rh = window.gsap.quickSetter(ret, 'height', 'px');

    var hx = 0, hy = 0, tx = 0, ty = 0, tw = 0, th = 0, raf = 0;
    function reticleLoop() {
      rx(hx + (tx - hx) * 0.18);
      ry(hy + (ty - hy) * 0.18);
      rw(hx + (tw - hx) * 0.18);
      rh(hy + (th - hy) * 0.18);
      hx = hx + (tx - hx) * 0.18;
      hy = hy + (ty - hy) * 0.18;
      raf = requestAnimationFrame(reticleLoop);
    }
    reticleLoop();

    function lock(el) {
      var r = el.getBoundingClientRect();
      tx = r.left; ty = r.top; tw = r.width; th = r.height;
      ret.classList.add('is-active');
      document.body.classList.add('is-locked');
    }
    function unlock() {
      tx = hx; ty = hy; tw = 0; th = 0;
      ret.classList.remove('is-active');
      document.body.classList.remove('is-locked');
    }

    window.addEventListener('mousemove', function (e) {
      lx(e.clientX); ly(e.clientY); mx(e.clientX); my(e.clientY);
    }, { passive: true });

    document.querySelectorAll('a, button, .f-row, .step').forEach(function (el) {
      el.addEventListener('mouseenter', function () { lock(el); });
      el.addEventListener('mouseleave', unlock);
    });
  }

  /* ── Text Reveal 02 ───────────────────────────────────────
     Contract: SplitText (no masks), opacity 0.1 → 1 on .line/.word/.char,
     per-element data overrides, clamp() scroll starts, scrub + once semantics. */
  function textReveal02(scope, delay, opts) {
    scope = scope || document;
    delay = delay || 0;
    var ignoreManual = !!(opts && opts.ignoreManual);
    var CONFIG = {
      lines: { duration: 0.04, stagger: 0.03, ease: 'power1.out' },
      words: { duration: 0.04, stagger: 0.03, ease: 'power1.out' },
      chars: { duration: 0.04, stagger: 0.03, ease: 'power1.out' },
      scrollStart: 'top 85%',
      scrubStart: 'top 80%',
      scrubEnd: 'top 20%',
      once: true,
      markers: false
    };
    var allSplitEls = scope.querySelectorAll('[data-reveal-02]');
    var autoEls = ignoreManual
      ? Array.prototype.slice.call(allSplitEls)
      : Array.prototype.slice.call(allSplitEls).filter(function (el) { return !el.hasAttribute('data-manual'); });

    window.gsap.set(autoEls, { visibility: 'visible' });

    allSplitEls.forEach(function (el) {
      var splitType = el.getAttribute('data-reveal-02');
      var c = CONFIG[splitType];
      if (!c) return;

      var type, linesClass, wordsClass, charsClass;
      switch (splitType) {
        case 'lines': type = 'lines'; linesClass = 'line'; break;
        case 'words': type = 'words, lines'; wordsClass = 'word'; linesClass = 'line'; break;
        case 'chars': type = 'chars, words, lines'; charsClass = 'char'; wordsClass = 'word'; linesClass = 'line'; break;
        default: return;
      }

      if (!ignoreManual && el.hasAttribute('data-manual')) {
        window.SplitText.create(el, {
          type: type,
          autoSplit: true,
          linesClass: linesClass,
          wordsClass: wordsClass,
          charsClass: charsClass
        });
        return;
      }

      var scrollMode = el.getAttribute('data-scroll');
      var useScroll = el.hasAttribute('data-scroll');
      var useScrub = scrollMode === 'scrub';

      window.SplitText.create(el, {
        type: type,
        autoSplit: true,
        linesClass: linesClass,
        wordsClass: wordsClass,
        charsClass: charsClass,
        onSplit: function (instance) {
          var durationValue = parseFloat(el.dataset.duration);
          var staggerValue = parseFloat(el.dataset.stagger);
          var delayValue = parseFloat(el.dataset.delay);
          var duration = isNaN(durationValue) ? c.duration : durationValue;
          var stagger = isNaN(staggerValue) ? c.stagger : staggerValue;
          var elDelay = isNaN(delayValue) ? 0 : delayValue;
          var ease = el.dataset.ease || c.ease;

          var targets = instance[splitType];
          var once = el.hasAttribute('data-once')
            ? el.getAttribute('data-once') !== 'false'
            : CONFIG.once;

          var tween = {
            opacity: 0.1,
            duration: duration,
            stagger: stagger,
            delay: useScroll ? elDelay : elDelay + delay,
            immediateRender: true,
            ease: ease
          };

          if (useScrub) {
            tween.scrollTrigger = {
              trigger: el,
              start: CONFIG.scrubStart,
              end: CONFIG.scrubEnd,
              scrub: true,
              markers: CONFIG.markers
            };
            if (once) tween.scrollTrigger.onLeave = function (self) { self.kill(false); };
          } else if (useScroll) {
            var start = scrollMode || CONFIG.scrollStart;
            tween.scrollTrigger = {
              trigger: el,
              start: 'clamp(' + start + ')',
              markers: CONFIG.markers
            };
            if (once) tween.scrollTrigger.once = true;
            else tween.scrollTrigger.toggleActions = 'play none none reverse';
          }

          return window.gsap.from(targets, tween);
        }
      });
    });
  }

  /* Fallback: reveal everything without animation */
  function revealAllStatic() {
    document.querySelectorAll('[data-reveal-02]').forEach(function (el) {
      el.style.visibility = 'visible';
    });
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('.stat .num').forEach(function (el) {
      if (el.dataset.final) el.textContent = el.dataset.final;
    });
    document.querySelectorAll('.join').forEach(function (j) { j.style.transform = 'scaleX(1)'; });
  }

  /* ── Lenis smooth scroll (GSAP-ticker driven) ───────────── */
  var lenis = null;
  function initLenis() {
    if (reduced || typeof window.Lenis === 'undefined' || !hasGsap) return null;
    var l = new window.Lenis({ duration: 1.15, smoothWheel: true });
    l.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add(function (time) { l.raf(time * 1000); });
    window.gsap.ticker.lagSmoothing(0);
    return l;
  }

  /* ── Anchor links through Lenis ─────────────────────────── */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.4 });
        else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  /* ── Nav: glass on scroll, hide down / show up ──────────── */
  function initNav() {
    var header = document.querySelector('header.nav');
    if (!header) return;
    var lastY = 0;
    var onScroll = function (y) {
      header.classList.toggle('scrolled', y > 24);
      var down = y > lastY;
      if (y > 140 && down) header.classList.add('nav-hidden');
      else header.classList.remove('nav-hidden');
      lastY = y;
    };
    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
  }

  /* ── Progress bar (compositor-only scaleX) ──────────────── */
  function initProgress() {
    if (!hasST) return;
    window.gsap.to('.scroll-progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
  }

  /* ── Edge scroll rail — the custom minimal scrollbar ──────
     2px track with a 48px amber thumb: wakes on scroll, fades
     when idle, widens on hover, and is draggable to scrub.
     Desktop (pointer:fine) only — touch keeps native overlays. */
  function initScrollRail() {
    if (!finePointer) return;
    var rail = document.querySelector('.scroll-rail');
    var thumb = document.querySelector('.scroll-thumb');
    if (!rail || !thumb) return;

    var max = 1, trackH = 0, y = 0;
    function measure() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      max = docH > 0 ? docH : 1;
      trackH = rail.clientHeight - thumb.offsetHeight;
    }
    measure();

    var hideTimer = 0;
    function show() {
      rail.classList.add('is-on');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { rail.classList.remove('is-on'); }, 900);
    }
    function update(scrollY) {
      if (scrollY > max) measure(); /* doc grew and a re-measure was missed */
      y = Math.min(Math.max(scrollY, 0), max);
      thumb.style.transform = 'translateY(' + (y / max) * trackH + 'px)';
      show();
    }

    /* Lenis drives wheel smoothing; a rAF poll catches every other
       path — keyboard, anchors, find-in-page, coalesced events */
    if (lenis) lenis.on('scroll', function (e) { update(e.scroll); });
    (function poll() {
      if (window.scrollY !== y) update(window.scrollY);
      requestAnimationFrame(poll);
    })();

    /* drag the thumb to scrub the page */
    var dragging = false, startY = 0, startScroll = 0;
    thumb.addEventListener('pointerdown', function (e) {
      dragging = true;
      startY = e.clientY;
      startScroll = y;
      rail.classList.add('is-dragging');
      thumb.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    thumb.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var target = startScroll + ((e.clientY - startY) / trackH) * max;
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else window.scrollTo(0, target);
    });
    function stopDrag(e) {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('is-dragging');
      try { thumb.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    thumb.addEventListener('pointerup', stopDrag);
    thumb.addEventListener('pointercancel', stopDrag);

    window.addEventListener('resize', function () { measure(); update(y); });
    /* content can grow after boot (reveals, fonts) — re-measure on any change */
    if (window.ResizeObserver) new ResizeObserver(function () { measure(); update(y); }).observe(document.documentElement);
    update(window.scrollY);
    /* the custom rail is now the only scrollbar */
    document.documentElement.classList.add('rv-rail');
  }

  /* ── Parallax ───────────────────────────────────────────── */
  function initParallax() {
    if (!hasST || reduced) return;
    var gsap = window.gsap;

    /* Phone: gentle drift + rotation while it crosses the viewport */
    gsap.fromTo('.phone-wrap',
      { y: 70, rotateY: 0, rotateX: 0 },
      {
        y: -70, rotateY: -6, rotateX: 2.5,
        ease: 'none',
        scrollTrigger: { trigger: '.phone-stage', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });

    /* Halo rings drift slightly against the phone */
    gsap.to('.halo', {
      y: 70, rotate: 12,
      ease: 'none',
      scrollTrigger: { trigger: '.phone-stage', start: 'top bottom', end: 'bottom top', scrub: 0.8 }
    });

    /* Feature media inner layers counter-drift */
    document.querySelectorAll('.f-media').forEach(function (media) {
      var layer = media.querySelector('.m-layer');
      if (layer) {
        gsap.fromTo(layer, { y: 36 }, {
          y: -36, ease: 'none',
          scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
        });
      }
      /* 3D tilt on hover (desktop only) */
      if (finePointer) {
        var rx = gsap.quickTo(media, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        var ry = gsap.quickTo(media, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        gsap.set(media, { transformPerspective: 900 });
        media.addEventListener('mousemove', function (e) {
          var r = media.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          ry(x * 5); rx(-y * 5);
        });
        media.addEventListener('mouseleave', function () { rx(0); ry(0); });
      }
    });

    /* Steps: draw the connectors, then stagger the cards in */
    if (document.querySelector('.join')) {
      gsap.to('.join', {
        scaleX: 1,
        duration: 0.7,
        ease: 'power2.inOut',
        stagger: 0.35,
        scrollTrigger: { trigger: '.steps', start: 'clamp(top 80%)', once: true }
      });
    }
    gsap.from('.step', {
      y: 44, opacity: 0, duration: 0.8, stagger: 0.14, ease: 'power3.out',
      scrollTrigger: { trigger: '.steps', start: 'clamp(top 85%)', once: true }
    });
  }

  /* ── Stat count-ups (final values live in HTML for no-JS) ─ */
  function initCounters() {
    document.querySelectorAll('.stat .num').forEach(function (el) { el.dataset.final = el.innerHTML; });
    if (!hasST || reduced) return;
    var gsap = window.gsap;
    document.querySelectorAll('.stat .num').forEach(function (el) {
      var raw = el.textContent;
      var value = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (isNaN(value)) return;
      var decimals = (raw.indexOf('.') > -1) ? 1 : 0;
      var counter = { v: 0 };
      gsap.to(counter, {
        v: value,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'clamp(top 88%)', once: true },
        onUpdate: function () {
          var n = counter.v.toLocaleString('en-US', {
            minimumFractionDigits: decimals, maximumFractionDigits: decimals
          });
          el.innerHTML = n + '<i>' + (el.dataset.suffix || '') + '</i>';
        }
      });
    });
  }

  /* ── Magnetic buttons (quickTo — no CSS transform transition) ── */
  function initMagnet() {
    if (!hasGsap || reduced || !finePointer) return;
    document.querySelectorAll('.btn-primary, .btn-ghost, .nav-cta, .btn-vault').forEach(function (btn) {
      var xTo = window.gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' });
      var yTo = window.gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' });
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.16);
        yTo((e.clientY - r.top - r.height / 2) * 0.26);
      });
      btn.addEventListener('mouseleave', function () {
        window.gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      });
    });
  }

  /* ── Ripple (clientX-based — correct inside SVG children) ── */
  function initRipple() {
    var style = document.createElement('style');
    style.textContent = '@keyframes rippleOut{to{transform:scale(4);opacity:0}}' +
      '.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.28);pointer-events:none}';
    document.head.appendChild(style);
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        ripple.style.animation = 'rippleOut .5s ease-out forwards';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function () { ripple.remove(); });
      });
    });
  }

  /* ── Reveal utility (non-split blocks) ──────────────────── */
  function initReveals() {
    if (!hasST || reduced) return;
    window.ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      once: true,
      onEnter: function (els) {
        els.forEach(function (el, i) {
          setTimeout(function () { el.classList.add('in'); }, i * 80);
        });
      }
    });
  }

  /* ── Boot ───────────────────────────────────────────────── */
  function boot() {
    initTheme();
    initRipple();
    if (!hasGsap || !hasST || !hasSplit) { revealAllStatic(); initAnchors(); initScrollRail(); return; }
    window.gsap.registerPlugin(window.SplitText, window.ScrollTrigger);

    lenis = initLenis();
    initAnchors();
    initNav();
    initProgress();
    initScrollRail();
    initParallax();
    initCounters();
    initMagnet();
    initCursor();
    initReveals();

    var start = function () {
      if (reduced) { revealAllStatic(); return; }
      textReveal02(document, 0.1);   /* hero animates on load; rest via data-scroll */
      window.ScrollTrigger.refresh();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    else start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
