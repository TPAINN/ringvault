/* ── Minimal custom scroll rail for the app page ──────────────
   Hides the native scrollbar (desktop) and replaces it with a
   2px track + 48px amber thumb on the right edge: wakes on
   scroll, fades when idle, widens on hover, draggable to scrub.
   Desktop (pointer:fine) only — touch keeps native overlays. */
(function () {
  'use strict';
  if (!window.matchMedia('(pointer: fine)').matches) return;

  var rail = document.createElement('div');
  rail.className = 'scroll-rail';
  rail.setAttribute('aria-hidden', 'true');
  var thumb = document.createElement('div');
  thumb.className = 'scroll-thumb';
  rail.appendChild(thumb);
  document.body.appendChild(rail);

  var max = 1, trackH = 0, y = 0, hideTimer = 0;

  function measure() {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    max = docH > 0 ? docH : 1;
    trackH = rail.clientHeight - thumb.offsetHeight;
  }

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

  window.addEventListener('scroll', function () { update(window.scrollY); }, { passive: true });

  /* keyboard, find-in-page and coalesced events — catch them all */
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
    window.scrollTo(0, startScroll + ((e.clientY - startY) / trackH) * max);
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
  /* content can grow after boot (cards, images) — re-measure on any change */
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); update(y); }).observe(document.documentElement);
  measure();
  update(window.scrollY);

  /* the custom rail is now the only scrollbar */
  document.documentElement.classList.add('rv-rail');
})();
