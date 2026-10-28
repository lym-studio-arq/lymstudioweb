/* ═══════════════════════════════════════════════════════════
   LYM Studio — interacción y animación compartidas
   Smooth scroll, nav, cursor, preloader, transiciones entre
   páginas, animaciones de scroll y formularios Netlify.
   Cada página define su propio script después de este archivo;
   el arranque ocurre en DOMContentLoaded, cuando el contenido
   dinámico de la página ya está renderizado.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const html = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;
  const animated = !!(gsap && ScrollTrigger) && !reduceMotion;

  const LYM = window.LYM = window.LYM || {};
  LYM.animated = animated;
  LYM.reduceMotion = reduceMotion;

  if (!animated) html.classList.remove('js', 'is-preloading', 'is-entering');
  if (animated) {
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
  }

  /* ── SMOOTH SCROLL ─────────────────────────── */
  let lenis = null;
  if (animated && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: { offset: -90 }
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  LYM.lenis = lenis;

  LYM.scrollTo = function (target, opts) {
    if (lenis) return lenis.scrollTo(target, Object.assign({ offset: -90 }, opts));
    if (typeof target === 'number') return window.scrollTo({ top: target, behavior: 'smooth' });
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  function lockScroll(lock) {
    if (lenis) lock ? lenis.stop() : lenis.start();
    else document.body.style.overflow = lock ? 'hidden' : '';
  }
  LYM.lockScroll = lockScroll;

  /* ── NAV ───────────────────────────────────── */
  function initNav() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const hero = document.querySelector('[data-hero]');

    const update = () => {
      const limit = hero ? Math.max(hero.offsetHeight - nav.offsetHeight, 10) : 10;
      nav.classList.toggle('scrolled', window.scrollY > limit);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    const toggle = document.getElementById('nav-toggle');
    const links = nav.querySelector('.nav-links');
    if (!toggle || !links) return;
    links.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));

    const setMenu = open => {
      toggle.classList.toggle('active', open);
      links.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      lockScroll(open);
    };
    toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) setMenu(false); });
    window.matchMedia('(max-width: 860px)').addEventListener('change', e => { if (!e.matches) setMenu(false); });
  }

  /* ── CURSOR ────────────────────────────────── */
  function initCursor() {
    const dot = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if (!finePointer || !dot || !ring) return;
    html.classList.add('has-cursor');

    const label = document.createElement('span');
    label.className = 'cursor-label';
    ring.appendChild(label);

    let mx = -100, my = -100, rx = -100, ry = -100;
    let first = true;
    dot.classList.add('is-out');
    ring.classList.add('is-out');
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (first) {
        first = false; rx = mx; ry = my;
        dot.classList.remove('is-out'); ring.classList.remove('is-out');
      }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', e => {
      const labelEl = e.target.closest('[data-cursor]');
      const hoverEl = e.target.closest('a, button, [role="button"], select, label');
      ring.classList.remove('is-hover', 'is-label');
      dot.classList.remove('is-hidden');
      if (labelEl) {
        label.textContent = labelEl.dataset.cursor;
        ring.classList.add('is-label');
        dot.classList.add('is-hidden');
      } else if (hoverEl) {
        ring.classList.add('is-hover');
      }
    });
    document.documentElement.addEventListener('mouseleave', () => { dot.classList.add('is-out'); ring.classList.add('is-out'); });
    document.documentElement.addEventListener('mouseenter', () => { dot.classList.remove('is-out'); ring.classList.remove('is-out'); });
  }

  /* ── TRANSICIONES ENTRE PÁGINAS ────────────── */
  const curtain = document.querySelector('.curtain');

  function isInternalLink(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return false;
    const href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return false;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
    return true;
  }

  function initTransitions() {
    if (!animated || !curtain) return;
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a');
      if (!isInternalLink(a)) return;
      e.preventDefault();
      try { sessionStorage.setItem('lym:transition', '1'); } catch (err) { /* modo privado */ }
      lockScroll(true);
      gsap.fromTo(curtain, { y: 0, yPercent: 100, visibility: 'visible' }, {
        yPercent: 0, duration: 0.75, ease: 'expo.inOut',
        onComplete: () => { window.location.href = a.href; }
      });
    });

    // Volver con el botón "atrás" (bfcache): la cortina no debe quedar puesta
    window.addEventListener('pageshow', e => {
      if (!e.persisted) return;
      gsap.set(curtain, { yPercent: 100, visibility: 'hidden' });
      lockScroll(false);
    });
  }

  function enter() {
    if (!animated || !curtain || !html.classList.contains('is-entering')) return Promise.resolve();
    lockScroll(true);
    return new Promise(resolve => {
      gsap.set(curtain, { y: 0, yPercent: 0, visibility: 'visible' });
      gsap.to(curtain, {
        yPercent: -100, duration: 0.95, ease: 'expo.inOut', delay: 0.05,
        onStart: () => setTimeout(resolve, 380),
        onComplete: () => {
          html.classList.remove('is-entering');
          gsap.set(curtain, { visibility: 'hidden', yPercent: 100 });
          lockScroll(false);
        }
      });
    });
  }

  /* ── PRELOADER (primera visita de la sesión) ── */
  function preload() {
    const pre = document.getElementById('preloader');
    if (!pre) return Promise.resolve();
    if (!animated || !html.classList.contains('is-preloading')) { pre.remove(); return Promise.resolve(); }
    try { sessionStorage.setItem('lym:visited', '1'); } catch (err) { /* modo privado */ }
    lockScroll(true);

    const count = pre.querySelector('.preloader-count');
    const bar = pre.querySelector('.preloader-bar span');
    const sources = Array.from(document.querySelectorAll('[data-preload]')).map(el => el.dataset.preload);
    let loaded = 0;
    sources.forEach(src => {
      const img = new Image();
      img.onload = img.onerror = () => { loaded++; };
      img.src = src;
    });

    gsap.fromTo(pre.querySelector('.preloader-iso'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.out' });

    return new Promise(resolve => {
      const start = performance.now();
      const state = { v: 0 };
      let done = false;
      const tick = () => {
        const minTime = Math.min((performance.now() - start) / 1500, 1);
        const real = sources.length ? loaded / sources.length : 1;
        const forced = performance.now() - start > 6000 ? 1 : 0;
        const target = Math.min(minTime, Math.max(real, forced));
        state.v += (target - state.v) * 0.14;
        if (target === 1 && state.v > 0.995) state.v = 1;
        count.textContent = String(Math.round(state.v * 100)).padStart(3, '0');
        bar.style.transform = `scaleX(${state.v})`;
        if (state.v === 1 && !done) { done = true; gsap.ticker.remove(tick); out(); }
      };
      gsap.ticker.add(tick);

      function out() {
        gsap.timeline({
          onComplete: () => { pre.remove(); html.classList.remove('is-preloading'); lockScroll(false); }
        })
          .to(pre.querySelector('.preloader-inner'), { yPercent: -40, autoAlpha: 0, duration: 0.7, ease: 'power3.in' })
          .to(pre.querySelector('.preloader-bottom'), { autoAlpha: 0, duration: 0.4 }, '<')
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
          .add(resolve, '-=0.75');
      }
    });
  }

  /* ── SPLIT TEXT ────────────────────────────── */
  function splitLines(el, vars) {
    if (!SplitText) { gsap.set(el, { visibility: 'visible' }); return gsap.from(el, Object.assign({ autoAlpha: 0, y: 30 }, vars)); }
    let tween;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit(self) {
        gsap.set(el, { visibility: 'visible' });
        tween = gsap.from(self.lines, Object.assign({ yPercent: 110, duration: 1.15, ease: 'expo.out', stagger: 0.09 }, vars));
        return tween;
      }
    });
    return tween;
  }

  /* ── INTRO DEL HERO ────────────────────────── */
  function intro() {
    if (!animated) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    document.querySelectorAll('[data-intro="img"]').forEach(el => {
      tl.fromTo(el, { scale: 1.22 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0);
    });
    document.querySelectorAll('[data-intro="mask"]').forEach(el => {
      tl.fromTo(el, { clipPath: 'inset(100% 0 0 0)', y: 30 }, { clipPath: 'inset(0% 0 0 0)', y: 0, duration: 1.4 }, 0.15);
    });
    document.querySelectorAll('[data-intro="split"]').forEach((el, i) => {
      tl.add(() => splitLines(el, { delay: 0 }), 0.2 + i * 0.12);
    });
    const plain = document.querySelectorAll('[data-intro]:not([data-intro="img"]):not([data-intro="mask"]):not([data-intro="split"])');
    if (plain.length) tl.fromTo(plain, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.45);
  }

  /* ── ANIMACIONES DE SCROLL ─────────────────── */
  function once(el, key) {
    if (el.dataset[key]) return false;
    el.dataset[key] = '1';
    return true;
  }

  LYM.animate = function (root) {
    root = root || document;
    if (!animated) return;

    root.querySelectorAll('[data-split]').forEach(el => {
      if (!once(el, 'lymSplit')) return;
      if (!SplitText) {
        gsap.set(el, { visibility: 'visible' });
        gsap.from(el, { autoAlpha: 0, y: 30, duration: 1, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        return;
      }
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: 110, duration: 1.15, ease: 'expo.out', stagger: 0.09,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
        }
      });
    });

    // Solo opacidad (no visibility): así siguen siendo enfocables con teclado antes de aparecer
    const reveals = Array.from(root.querySelectorAll('[data-reveal]')).filter(el => once(el, 'lymReveal'));
    if (reveals.length) {
      gsap.set(reveals, { opacity: 0, y: 36 });
      ScrollTrigger.batch(reveals, {
        start: 'top 90%', once: true,
        onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true })
      });
    }

    root.querySelectorAll('[data-reveal-img]').forEach(el => {
      if (!once(el, 'lymImg')) return;
      const inner = el.firstElementChild;
      const st = { trigger: el, start: el.dataset.revealStart || 'top 88%', once: true };
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: st });
      if (inner) gsap.fromTo(inner, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: st });
    });

    root.querySelectorAll('[data-line]').forEach(el => {
      if (!once(el, 'lymLine')) return;
      gsap.to(el, { scaleX: 1, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });

    root.querySelectorAll('[data-parallax]').forEach(el => {
      if (!once(el, 'lymParallax')) return;
      const amount = parseFloat(el.dataset.parallax) || 10;
      gsap.fromTo(el, { yPercent: -amount }, {
        yPercent: amount, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    root.querySelectorAll('[data-words]').forEach(el => {
      if (!once(el, 'lymWords')) return;
      if (!SplitText) return;
      SplitText.create(el, {
        type: 'words', autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(self.words, { opacity: 0.14 }, {
            opacity: 1, ease: 'none', stagger: 0.12,
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true }
          });
        }
      });
    });

    if (finePointer) {
      root.querySelectorAll('[data-magnetic]').forEach(el => {
        if (!once(el, 'lymMagnetic')) return;
        const strength = parseFloat(el.dataset.magnetic) || 0.3;
        const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * strength);
          yTo((e.clientY - r.top - r.height / 2) * strength);
        });
        el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    }
  };

  LYM.refresh = () => { if (animated) ScrollTrigger.refresh(); };

  // Navegación con teclado: lo que recibe foco aparece aunque todavía no se haya scrolleado
  if (animated) {
    document.addEventListener('focusin', e => {
      const el = e.target.closest('[data-reveal]');
      if (el && parseFloat(getComputedStyle(el).opacity) < 1) gsap.to(el, { opacity: 1, y: 0, duration: 0.6, overwrite: true });
    });
  }

  /* ── FOOTER ────────────────────────────────── */
  function initFooter() {
    const clock = document.querySelector('[data-clock]');
    if (clock && window.Intl) {
      const fmt = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false
      });
      const tick = () => { clock.textContent = fmt.format(new Date()) + ' GMT-3'; };
      tick();
      setInterval(tick, 20000);
    }
    document.querySelectorAll('[data-top]').forEach(btn => btn.addEventListener('click', () => LYM.scrollTo(0, { offset: 0, duration: 1.6 })));
  }

  /* ── FORMULARIOS (Netlify Forms) ───────────── */
  function initForms() {
    document.querySelectorAll('form[data-netlify]').forEach(form => {
      const success = document.getElementById(form.dataset.success);
      const error = form.querySelector('.form-error');
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (error) error.hidden = true;
        form.classList.add('is-sending');
        try {
          const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          form.hidden = true;
          if (success) {
            success.hidden = false;
            if (animated) gsap.fromTo(success, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' });
          }
          if (form.dataset.resetAfter) {
            setTimeout(() => { form.hidden = false; if (success) success.hidden = true; }, parseInt(form.dataset.resetAfter, 10));
          }
          form.dispatchEvent(new CustomEvent('lym:sent', { bubbles: true }));
        } catch (err) {
          if (error) error.hidden = false;
        } finally {
          form.classList.remove('is-sending');
        }
      });
    });
  }

  /* ── ARRANQUE ──────────────────────────────── */
  function start() {
    initNav();
    initCursor();
    initTransitions();
    initFooter();
    initForms();

    const ready = document.fonts && document.fonts.ready
      ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))])
      : Promise.resolve();

    html.classList.add('anim-ready');
    ready.then(() => Promise.all([preload(), enter()])).then(() => {
      LYM.animate(document);
      intro();
      document.dispatchEvent(new CustomEvent('lym:ready'));
      LYM.isReady = true;
      if (animated) setTimeout(() => ScrollTrigger.refresh(), 400);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
