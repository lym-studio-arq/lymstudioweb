/* ==========================================================================
   CAÑAVERAL I — Brochure digital
   GSAP + ScrollTrigger + SplitText + Lenis
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isDesktop = () => matchMedia('(min-width: 961px)').matches;

  if (REDUCED) root.classList.add('is-reduced');
  if (FINE) root.classList.add('has-cursor');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------------------------
     Scroll suave
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (!REDUCED) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.15 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const lock = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };

  function scrollToTarget(target, { offset = 0, duration = 1.8 } = {}) {
    if (lenis) {
      lenis.scrollTo(target, { offset, duration, easing: (t) => 1 - Math.pow(1 - t, 4) });
      return;
    }
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + offset;
    scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  function decode(img) {
    if (!img) return Promise.resolve();
    const loaded = img.complete
      ? Promise.resolve()
      : new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
        });
    return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : null));
  }

  const fmtCache = {};
  function fmt(v, dec = 0, group = false) {
    const k = dec + '|' + group;
    fmtCache[k] = fmtCache[k] || new Intl.NumberFormat('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: group });
    return fmtCache[k].format(v);
  }

  function countUp(scope, delay = 0.2) {
    const els = scope.matches && scope.matches('[data-count-to]') ? [scope] : $$('[data-count-to]', scope);
    els.forEach((el, i) => {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const to = parseFloat(el.dataset.countTo);
      const dec = +(el.dataset.decimals || 0);
      const group = el.dataset.format === 'thousands';
      if (REDUCED) { el.textContent = fmt(to, dec, group); return; }
      const o = { v: 0 };
      gsap.to(o, {
        v: to, duration: 1.8, delay: delay + i * 0.1, ease: 'power3.out',
        onUpdate: () => { el.textContent = fmt(dec ? o.v : Math.round(o.v), dec, group); },
      });
    });
  }

  /* ------------------------------------------------------------------------
     Loader (pág. 1 del brochure)
     ------------------------------------------------------------------------ */
  function runLoader(ready) {
    const el = $('.loader');
    const count = $('[data-count]', el);
    const bar = $('.loader__bar span', el);
    const canes = $$('.loader__canes path', el);
    const glyphs = $$('.loader__word path', el);
    const sub = $('.loader__sub', el);

    if (REDUCED) {
      return ready.then(() => gsap.to(el, { autoAlpha: 0, duration: 0.3, onComplete: () => gsap.set(el, { display: 'none' }) }));
    }

    // Las cañas crecen segmento a segmento, de abajo hacia arriba
    const byBottom = canes.slice().sort((a, b) => b.getBBox().y - a.getBBox().y);
    gsap.set(byBottom, { scaleY: 0 });
    gsap.set(glyphs, { yPercent: 115 });
    gsap.set(sub, { autoAlpha: 0, y: 8 });

    gsap.timeline({ delay: 0.15 })
      .to(byBottom, { scaleY: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06 })
      .to(glyphs, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035 }, 0.25)
      .to(sub, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.8);

    const jobs = [ready, wait(1900)];
    let done = 0;
    jobs.forEach((j) => j.then(() => { done += 1; }, () => { done += 1; }));

    return new Promise((resolve) => {
      const shown = { v: 0 };
      const start = performance.now();
      const tick = () => {
        const target = performance.now() - start > 8000 ? 1 : (done + 0.15) / (jobs.length + 0.15);
        shown.v += (target - shown.v) * 0.06;
        if (done === jobs.length && shown.v > 0.995) shown.v = 1;
        count.textContent = pad(Math.round(shown.v * 100), 3);
        bar.style.transform = `scaleX(${shown.v})`;
        if (shown.v === 1) { gsap.ticker.remove(tick); resolve(); }
      };
      gsap.ticker.add(tick);
    }).then(() => new Promise((resolve) => {
      gsap.timeline()
        .to(glyphs, { yPercent: -115, duration: 0.6, ease: 'power3.in', stagger: 0.02 })
        .to(byBottom.slice().reverse(), { scaleY: 0, duration: 0.5, ease: 'power3.in', stagger: 0.025 }, 0)
        .to([sub, '.loader__foot', '.loader__bar'], { autoAlpha: 0, duration: 0.4 }, 0)
        .to(el, { '--cb': '100%', duration: 1.15, ease: 'expo.inOut' }, '-=0.15')
        .call(resolve, null, '<0.2')
        .set(el, { display: 'none' });
    }));
  }

  /* ------------------------------------------------------------------------
     Revelados de texto
     ------------------------------------------------------------------------ */
  function setupReveals() {
    $$('[data-reveal="chars"]').forEach((el) => {
      const split = SplitText.create(el, { type: 'lines,words,chars', mask: 'lines', linesClass: 'line', charsClass: 'char' });
      if (REDUCED) return;
      gsap.from(split.chars, {
        yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.03,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      });
    });

    $$('[data-reveal="lines"]').forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit: (self) => {
          if (REDUCED) return null;
          return gsap.from(self.lines, {
            yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.08,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        },
      });
      return split;
    });

    $$('[data-reveal="fade"]').forEach((el) => {
      if (REDUCED) return;
      gsap.from(el, {
        y: 26, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });

    // Contadores sueltos
    $$('[data-count-to]').forEach((el) => {
      if (el.closest('.dato, .sate__metric')) return;
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el, 0.1) });
    });
  }

  /* ------------------------------------------------------------------------
     Portada (págs. 1 y 2)
     ------------------------------------------------------------------------ */
  let heroProgress = 0;

  function heroIntro() {
    const hero = $('.hero');
    const cells = $$('.cell', hero);
    const spots = $$('.hotspot', hero);

    if (REDUCED) return;

    const tl = gsap.timeline();
    tl.fromTo('.hero__media .cover', { '--zoom': 1.22 }, { '--zoom': 1.08, duration: 2.4, ease: 'expo.out' }, 0)
      .fromTo('.select', { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.45)
      .from('.hero__title .tag', { y: 14, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 1.2)
      .from('.hero .facts', { yPercent: 100, duration: 1.1, ease: 'expo.out' }, 0.7)
      .from(cells, { autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.95)
      .from(spots, { scale: 0, duration: 0.7, ease: 'back.out(2.4)', stagger: 0.1 }, 1.4)
      .from('.hero__cue', { autoAlpha: 0, duration: 0.8 }, 1.6);

    // Muestra cada hotspot una vez, como un recorrido de la fachada
    if (isDesktop()) {
      spots.forEach((s, i) => {
        gsap.delayedCall(2.4 + i * 1.5, () => { if (heroProgress < 0.05) s.classList.add('is-on'); });
        gsap.delayedCall(3.7 + i * 1.5, () => s.classList.remove('is-on'));
      });
    }
  }

  function setupHero() {
    const hero = $('.hero');
    const frame = $('.hero__frame', hero);
    const cover = $('.hero__media .cover', hero);
    if (REDUCED) { gsap.set(frame, { '--k': 0 }); gsap.set(cover, { '--zoom': 1 }); return; }

    gsap.set(cover, { '--zoom': 1.08 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6,
        onUpdate: (self) => { heroProgress = self.progress; },
      },
    });
    tl.fromTo(frame, { '--k': 1 }, { '--k': 0, duration: 0.42, ease: 'power2.inOut' }, 0)
      .fromTo(cover, { '--zoom': 1.08 }, { '--zoom': 1, duration: 0.42 }, 0)
      .to('.hero__cue', { autoAlpha: 0, duration: 0.1 }, 0)
      .to('.hero .facts', { yPercent: 100, duration: 0.25, ease: 'power2.in' }, 0.32)
      .to('.hero__title', { y: -60, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0.38)
      .to('.hero .hotspots', { autoAlpha: 0, duration: 0.15 }, 0.36)
      .fromTo(cover, { '--zoom': 1 }, { '--zoom': 1.7, duration: 0.58, ease: 'power2.in', immediateRender: false }, 0.42)
      .to('.hero__fog', { opacity: 1, duration: 0.4, ease: 'power1.in' }, 0.6);
  }

  /* ------------------------------------------------------------------------
     Tema del header y navegación
     ------------------------------------------------------------------------ */
  function setupChrome() {
    const header = $('.header');
    const navLinks = $$('[data-nav]');
    const NAV = { '01': 'ubicacion', '02': 'proyecto', '03': 'residencias', '04': 'local', '05': 'inversion', '06': 'contacto' };
    const SKIP = '.header, .menu, .unit-tabs, .cursor, .viewer';
    let lastSec = '';

    const topOf = (x, y) => {
      for (const el of document.elementsFromPoint(x, y)) {
        if (!el.closest(SKIP)) return el;
      }
      return null;
    };

    let queued = false;
    const update = () => {
      queued = false;
      const el = topOf(innerWidth * 0.5, (header.offsetHeight || 60) * 0.5);
      const zone = el && el.closest('[data-theme]');
      let theme = zone ? zone.dataset.theme : 'dark';
      if (zone && zone.classList.contains('hero') && heroProgress > 0.78) theme = 'light';
      if (header.dataset.theme !== theme) header.dataset.theme = theme;

      const mid = topOf(innerWidth * 0.5, innerHeight * 0.5);
      const sec = mid && mid.closest('[data-sec]');
      if (sec) {
        const num = sec.dataset.sec;
        if (num !== lastSec) {
          lastSec = num;
          const id = NAV[num];
          navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === id));
        }
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    if (lenis) lenis.on('scroll', queue);
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();

    // Enlaces internos con scroll suave
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#inicio' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });

    // Menú móvil
    const menu = $('.menu');
    const btn = $('.header__menu');
    function closeMenu() {
      if (!menu.classList.contains('is-open')) return;
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Menú';
      lock(false);
    }
    btn.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) return closeMenu();
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = 'Cerrar';
      lock(true);
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    $('[data-top]').addEventListener('click', () => scrollToTarget(0, { duration: 2.4 }));
  }

  /* ------------------------------------------------------------------------
     Cursor
     ------------------------------------------------------------------------ */
  function setupCursor() {
    if (!FINE) return;
    const cur = $('.cursor');
    const label = $('.cursor__label', cur);
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3.out' });
    addEventListener('pointermove', (e) => {
      xTo(e.clientX); yTo(e.clientY);
      const t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) {
        if (label.textContent !== t.dataset.cursor) label.textContent = t.dataset.cursor;
        cur.classList.add('is-label');
      } else cur.classList.remove('is-label');
      cur.classList.toggle('is-hidden', !!(e.target.closest && e.target.closest('.plan.is-loupe')));
    }, { passive: true });
    document.addEventListener('mouseleave', () => gsap.to(cur, { autoAlpha: 0, duration: 0.2 }));
    document.addEventListener('mouseenter', () => gsap.to(cur, { autoAlpha: 1, duration: 0.2 }));
  }

  /* ------------------------------------------------------------------------
     Concepto: frase que se enciende y diagrama de nodos (pág. 3)
     ------------------------------------------------------------------------ */
  function setupConcepto() {
    const st = $('[data-words]');
    const split = SplitText.create(st, { type: 'words', wordsClass: 'word' });
    const words = split.words;
    if (REDUCED) words.forEach((w) => w.classList.add('is-lit'));
    else {
      ScrollTrigger.create({
        trigger: st, start: 'top 78%', end: 'bottom 42%', scrub: true,
        onUpdate: (self) => {
          const n = Math.round(self.progress * words.length);
          words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
        },
      });
      gsap.fromTo('.concepto__img', { '--ct': '100%' }, { '--ct': '0%', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: '.concepto__img', start: 'top 85%', once: true } });
      gsap.fromTo('.concepto__img img', { '--s': 1.25 }, { '--s': 1, ease: 'none', scrollTrigger: { trigger: '.concepto__img', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    // Nodos
    const box = $('[data-nodes]');
    const wires = $$('.wire', box);
    const nodes = $$('.node', box);
    const chipLabel = $('[data-chip-label]', box);
    const defLabel = chipLabel.textContent;
    wires.forEach((w, i) => {
      w.style.setProperty('--d', (2.6 + (i % 4) * 0.45).toFixed(2) + 's');
      w.style.setProperty('--dl', (-(i * 0.73) % 3).toFixed(2) + 's');
    });

    let hot = -1, auto = null, hovering = false;
    const setHot = (i) => {
      hot = i;
      wires.forEach((w, k) => w.classList.toggle('is-hot', k === i));
      nodes.forEach((n, k) => n.classList.toggle('is-hot', k === i));
      chipLabel.textContent = i < 0 ? defLabel : $('span', nodes[i]).textContent;
    };
    const startAuto = () => {
      if (auto || REDUCED || !isDesktop()) return;
      auto = setInterval(() => { if (!hovering) setHot((hot + 1) % nodes.length); }, 1800);
    };
    const stopAuto = () => { clearInterval(auto); auto = null; setHot(-1); };
    nodes.forEach((n, i) => {
      n.addEventListener('mouseenter', () => { hovering = true; setHot(i); });
      n.addEventListener('mouseleave', () => { hovering = false; });
    });

    if (REDUCED) { box.classList.add('is-on'); return; }
    gsap.set($$('.wire__line', box), { '--draw': 1 });
    ScrollTrigger.create({
      trigger: box, start: 'top 72%', once: true,
      onEnter: () => {
        gsap.timeline()
          .from('.chip', { scale: 0.6, autoAlpha: 0, duration: 1, ease: 'expo.out' })
          .to($$('.wire__line', box), { '--draw': 0, duration: 1.3, ease: 'power2.inOut', stagger: 0.06 }, 0.2)
          .from(nodes, { autoAlpha: 0, scale: 0.85, duration: 0.7, ease: 'back.out(2)', stagger: 0.07 }, 0.7)
          .from('.nodes__ends circle', { scale: 0, transformOrigin: 'center', duration: 0.4, stagger: 0.04 }, 1.1)
          .add(() => box.classList.add('is-on'), 1.2);
      },
    });
    ScrollTrigger.create({ trigger: box, start: 'top 60%', end: 'bottom 30%', onToggle: (s) => (s.isActive ? startAuto() : stopAuto()) });
  }

  /* ------------------------------------------------------------------------
     Fachada: el visor se abre antes de la envolvente S.A.T.E. (pág. 2)
     ------------------------------------------------------------------------ */
  function setupFachada() {
    const sec = $('.fachada');
    const frame = $('.fachada__frame', sec);
    const cover = $('.cover', frame);
    const spots = $$('.hotspot', sec);
    const cells = $$('.cell', sec);
    if (REDUCED) return;

    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top 70%', end: 'bottom bottom', scrub: 0.6 },
    })
      .fromTo(frame, { '--ct': '22%', '--cb': '22%', '--cl': '26%', '--cr': '26%', '--crad': '22px' }, { '--ct': '0%', '--cb': '0%', '--cl': '0%', '--cr': '0%', '--crad': '0px', duration: 0.45, ease: 'power2.inOut' }, 0)
      .fromTo(cover, { '--zoom': 1.3 }, { '--zoom': 1.02, duration: 0.6, ease: 'power1.out' }, 0)
      .fromTo('.fachada__title', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.14 }, 0.44)
      .fromTo('.fachada .facts', { yPercent: 100 }, { yPercent: 0, duration: 0.14 }, 0.5)
      .fromTo(cells, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, stagger: 0.015 }, 0.56)
      .fromTo(spots, { scale: 0 }, { scale: 1, duration: 0.06, stagger: 0.03 }, 0.62)
      .to({}, { duration: 0.2 });
  }

  /* ------------------------------------------------------------------------
     S.A.T.E.: capas que se separan (pág. 4)
     ------------------------------------------------------------------------ */
  function setupSate() {
    const svg = $('.sate__diagram svg');
    const layers = $$('.layer', svg);
    const legend = $$('[data-layer-label]');
    const callG = $('.callouts', svg);
    const heatG = $('.heat', svg);
    const NS = 'http://www.w3.org/2000/svg';
    const T = layers.map((l) => +getComputedStyle(l).getPropertyValue('--t'));
    const H = 300, Y0 = 190, DX = 150, DY = -96, GAP = 48, VW = 760;

    // Llamadas numeradas sobre cada capa
    const calls = layers.map((l, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'callout' + (i === 2 ? ' callout--eps' : ''));
      g.innerHTML = `<line/><circle r="12"/><text>${pad(i + 1)}</text>`;
      callG.appendChild(g);
      return g;
    });
    const sideTxt = (txt, anchor) => {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('class', 'side-label');
      t.setAttribute('text-anchor', anchor);
      t.textContent = txt;
      callG.appendChild(t);
      return t;
    };
    const tIn = sideTxt('Interior', 'end');
    const tOut = sideTxt('Exterior', 'start');

    // Partículas de calor que se frenan contra la placa aislante
    const heat = document.createElementNS(NS, 'g');
    heatG.appendChild(heat);
    [0.12, 0.3, 0.48, 0.66, 0.84].forEach((f, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'heat__g');
      g.style.setProperty('--hd', (i * 0.47).toFixed(2) + 's');
      const y = Y0 + DY + H * f;
      g.innerHTML = `<path class="heat__p" d="M30 ${y} H4 M10 ${y - 5} L4 ${y} L10 ${y + 5}"/>`;
      heat.appendChild(g);
    });

    const pts = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    let lastHot = -2;
    function draw(p) {
      const gap = GAP * p;
      const width = T.reduce((a, b) => a + b, 0) + gap * (T.length - 1) + DX;
      const x0 = (VW - width) / 2 - 10;
      let x = x0;
      let epsRight = 0;
      layers.forEach((l, i) => {
        const t = T[i];
        const [top, side, front] = $$('polygon', l);
        front.setAttribute('points', pts([[x, Y0], [x + t, Y0], [x + t, Y0 + H], [x, Y0 + H]]));
        top.setAttribute('points', pts([[x, Y0], [x + DX, Y0 + DY], [x + t + DX, Y0 + DY], [x + t, Y0]]));
        side.setAttribute('points', pts([[x + t, Y0], [x + t + DX, Y0 + DY], [x + t + DX, Y0 + H + DY], [x + t, Y0 + H]]));
        const cx = x + t / 2 + DX / 2;
        const cy = Y0 + DY / 2;
        const ly = 34;
        const [line, circ, text] = calls[i].children;
        line.setAttribute('x1', cx); line.setAttribute('y1', cy);
        line.setAttribute('x2', cx); line.setAttribute('y2', ly + 12);
        circ.setAttribute('cx', cx); circ.setAttribute('cy', ly);
        text.setAttribute('x', cx); text.setAttribute('y', ly + 0.5);
        if (i === T.length - 1) epsRight = x + t;
        x += t + gap;
      });
      calls.forEach((c, i) => { c.style.opacity = clamp((p - 0.15 - i * 0.08) / 0.25, 0, 1); });
      tIn.setAttribute('x', x0 - 14); tIn.setAttribute('y', Y0 + H + 4);
      tOut.setAttribute('x', epsRight + 18); tOut.setAttribute('y', Y0 + H + 4);
      heat.setAttribute('transform', `translate(${epsRight + DX + 6} 0)`);
      heatG.style.opacity = clamp((p - 0.55) / 0.3, 0, 1);

      const hotIdx = p < 0.12 ? -1 : Math.min(T.length - 1, Math.floor((p - 0.12) / 0.16));
      if (hotIdx !== lastHot) {
        lastHot = hotIdx;
        layers.forEach((l, i) => l.classList.toggle('is-hot', i === hotIdx));
        legend.forEach((li, i) => li.classList.toggle('is-on', i <= hotIdx));
      }
    }

    if (REDUCED || !isDesktop()) {
      draw(1);
      if (!REDUCED && !isDesktop()) {
        ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => {
          const o = { p: 0 };
          gsap.to(o, { p: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: () => draw(o.p) });
        } });
        draw(0);
      }
    } else {
      draw(0);
      ScrollTrigger.create({
        trigger: '.sate__track', start: 'top top', end: 'bottom bottom', scrub: 0.5,
        onUpdate: (self) => draw(clamp(self.progress / 0.75, 0, 1)),
      });
    }

    ScrollTrigger.create({ trigger: '.sate__metric', start: 'top 85%', once: true, onEnter: () => countUp($('.sate__metric'), 0.2) });
    if (!REDUCED) {
      gsap.from('.sate__intro > *:not(.sate__title)', { y: 24, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.sate__intro', start: 'top 75%', once: true } });
    }
  }

  /* ------------------------------------------------------------------------
     Índices de capítulo (págs. 5, 6, 9, 16)
     ------------------------------------------------------------------------ */
  function setupIndexes() {
    $$('.index').forEach((idx) => {
      const k = +idx.dataset.index - 1;
      const list = $('.index__list', idx);
      const items = $$('li', list);
      const spark = $('.index__spark', idx);
      let centers = [];
      const measure = () => {
        centers = items.map((li) => li.offsetTop + li.offsetHeight / 2);
      };
      measure();
      const centerOf = (i) => (i >= 0 ? centers[i] : centers[0] - (centers[1] - centers[0]));
      const apply = (p) => {
        const e = gsap.parseEase('power3.inOut')(p);
        const y = -lerp(centerOf(k - 1), centerOf(k), e);
        list.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
        const active = p > 0.45 ? k : k - 1;
        items.forEach((li, i) => li.classList.toggle('is-active', i === active));
        spark.style.transform = `rotate(${(k * 90 + e * 90).toFixed(1)}deg)`;
      };
      if (REDUCED) { apply(1); return; }
      apply(0);
      ScrollTrigger.create({
        trigger: idx, start: 'top 65%', end: 'top top', scrub: 0.4,
        onRefresh: (self) => { measure(); apply(self.progress); },
        onUpdate: (self) => apply(self.progress),
      });
    });
  }

  /* ------------------------------------------------------------------------
     Ubicación: mapa de cercanía con cámara (pág. 5)
     ------------------------------------------------------------------------ */
  function setupGeo() {
    const sec = $('[data-geo]');
    const [S, W, N, E] = sec.dataset.bbox.split(',').map(Number);
    const [hLat, hLon] = sec.dataset.home.split(',').map(Number);
    const view = $('.geo__view', sec);
    const layer = $('.geo__layer', sec);
    const img = $('.geo__img', sec);
    const rings = $('.geo__rings', sec);
    const marks = $('.geo__marks', sec);
    const homeEl = $('.geo__home', sec);
    const scaleBar = $('[data-scale-bar]', sec);
    const scaleTxt = $('[data-scale]', sec);
    const cards = $$('.geo-card', sec);

    const AR = +img.getAttribute('width') / +img.getAttribute('height');
    const KX = 111.32 * Math.cos(((S + N) / 2) * Math.PI / 180);
    const KY = 110.95;
    const wKm = (E - W) * KX;
    const hKm = (N - S) * KY;
    const fx = (lon) => (lon - W) / (E - W);
    const fy = (lat) => (N - lat) / (N - S);
    const dist = (lat, lon) => Math.hypot((lon - hLon) * KX, (lat - hLat) * KY);
    const home = { x: fx(hLon), y: fy(hLat) };

    // Anillos de distancia (el SVG mide en km)
    const RINGS = [1, 2, 3, 4, 5, 6];
    rings.setAttribute('viewBox', `0 0 ${wKm.toFixed(3)} ${hKm.toFixed(3)}`);
    rings.setAttribute('preserveAspectRatio', 'none');
    rings.innerHTML = RINGS.map((k) => `<circle cx="${(home.x * wKm).toFixed(3)}" cy="${(home.y * hKm).toFixed(3)}" r="${k}"/>`).join('');
    const ang = (38 * Math.PI) / 180;
    const ringLabels = RINGS.map((k) => {
      const el = document.createElement('div');
      el.className = 'geo__rl';
      el.innerHTML = `<span>${k} km</span>`;
      marks.appendChild(el);
      return { el, x: home.x + (k * Math.sin(ang)) / wKm, y: home.y - (k * Math.cos(ang)) / hKm };
    });

    // Puntos de interés
    const pois = $$('.poi', sec).map((el) => {
      const lat = +el.dataset.lat, lon = +el.dataset.lon;
      let x = fx(lon), y = fy(lat);
      if (el.hasAttribute('data-edge')) {
        const dx = x - home.x, dy = y - home.y;
        let t = 1;
        if (x < 0.03) t = Math.min(t, (0.03 - home.x) / dx);
        if (x > 0.97) t = Math.min(t, (0.97 - home.x) / dx);
        if (y < 0.08) t = Math.min(t, (0.08 - home.y) / dy);
        if (y > 0.92) t = Math.min(t, (0.92 - home.y) / dy);
        x = home.x + dx * t; y = home.y + dy * t;
        el.style.setProperty('--rot', (Math.atan2(dy * hKm, dx * wKm) * 180 / Math.PI - 180).toFixed(1) + 'deg');
      }
      const small = $('small', el);
      if (small && !small.textContent) {
        const d = dist(lat, lon);
        small.textContent = d < 1 ? Math.max(10, Math.round(d * 100) * 10) + ' m' : fmt(d, 1) + ' km';
      }
      return { el, x, y, cat: el.dataset.cat, edge: el.hasAttribute('data-edge'), left: el.classList.contains('poi--l'), down: el.classList.contains('poi--down') };
    });

    // Cámara
    let vw = 0, vh = 0, Lw = 0, Lh = 0;
    const cam = { s: 1, cx: home.x, cy: home.y };
    const area = () => (isDesktop()
      ? { x0: 0, x1: vw - Math.min(440, vw * 0.36) - 60, y0: vh * 0.16, y1: vh * 0.86 }
      : { x0: 0, x1: vw, y0: vh * 0.1, y1: vh * 0.42 });

    function place(el, x, y, tx, ty) {
      el.style.transform = `translate3d(${(tx + x * Lw * cam.s).toFixed(1)}px, ${(ty + y * Lh * cam.s).toFixed(1)}px, 0)`;
    }
    function apply() {
      const a = area();
      const fxp = (a.x0 + a.x1) / 2, fyp = (a.y0 + a.y1) / 2;
      let tx = fxp - cam.cx * Lw * cam.s;
      let ty = fyp - cam.cy * Lh * cam.s;
      const W2 = Lw * cam.s, H2 = Lh * cam.s;
      tx = W2 >= vw ? clamp(tx, vw - W2, 0) : clamp(tx, 0, vw - W2);
      ty = H2 >= vh ? clamp(ty, vh - H2, 0) : clamp(ty, 0, vh - H2);
      layer.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${cam.s.toFixed(4)})`;
      place(homeEl, home.x, home.y, tx, ty);
      pois.forEach((p) => {
        place(p.el, p.x, p.y, tx, ty);
        const px = tx + p.x * W2;
        if (!p.down) p.el.classList.toggle('poi--l', p.left || px > a.x1 - 240);
      });
      ringLabels.forEach((r) => place(r.el, r.x, r.y, tx, ty));
      const pxKm = (Lw * cam.s) / wKm;
      const km = pxKm > 170 ? 0.5 : pxKm < 55 ? 2 : 1;
      scaleBar.style.width = (pxKm * km).toFixed(1) + 'px';
      scaleTxt.textContent = km < 1 ? '500 m' : km + ' km';
    }
    function layout() {
      vw = view.clientWidth; vh = view.clientHeight;
      Lw = Math.max(vw, vh * AR); Lh = Lw / AR;
      layer.style.width = Lw + 'px';
      layer.style.height = Lh + 'px';
      apply();
    }

    function target(cat) {
      const pts = pois.filter((p) => (cat === 'all' ? !p.edge : p.cat === cat)).concat([{ x: home.x, y: home.y }]);
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const a = area();
      const bw = Math.max(x1 - x0, 0.02) * Lw, bh = Math.max(y1 - y0, 0.02) * Lh;
      const s = clamp(Math.min(((a.x1 - a.x0) * 0.8) / bw, ((a.y1 - a.y0) * 0.8) / bh), isDesktop() ? 0.7 : 0.26, 3);
      return { s, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    }

    let current = null;
    function setCat(cat, instant) {
      if (cat === current) return;
      current = cat;
      sec.classList.toggle('is-all', cat === 'all');
      sec.classList.toggle('has-cat', cat !== 'all');
      pois.forEach((p) => p.el.classList.toggle('is-on', p.cat === cat));
      cards.forEach((c) => c.classList.toggle('is-on', c.dataset.cat === cat));
      const t = target(cat);
      gsap.to(cam, { ...t, duration: instant || REDUCED ? 0 : 1.6, ease: 'power3.inOut', onUpdate: apply, overwrite: true });
    }

    layout();
    Object.assign(cam, target('all'));
    apply();
    setCat('all', true);
    addEventListener('resize', () => { layout(); const t = target(current || 'all'); Object.assign(cam, t); apply(); });

    const [st0, st1] = isDesktop() ? ['top 64%', 'bottom 36%'] : ['top 86%', 'top 44%'];
    cards.forEach((c) => {
      ScrollTrigger.create({ trigger: c, start: st0, end: st1, onToggle: (st) => { if (st.isActive) setCat(c.dataset.cat); } });
      c.addEventListener('pointerenter', () => setCat(c.dataset.cat));
    });
    ScrollTrigger.create({ trigger: cards[0], start: st0, onLeaveBack: () => setCat('all') });
    ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'top top', onLeaveBack: () => setCat('all') });

    if (!REDUCED) {
      gsap.from(cards, { y: 60, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.geo__cards', start: 'top 80%', once: true } });
      gsap.from('.geo__hud > *', { autoAlpha: 0, y: 10, duration: 0.8, stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 60%', once: true } });
      gsap.from(homeEl, { scale: 0, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: sec, start: 'top 55%', once: true } });
    }
  }

  /* ------------------------------------------------------------------------
     Datos (pág. 7)
     ------------------------------------------------------------------------ */
  function setupDatos() {
    const rows = $$('.dato');
    rows.forEach((row, i) => {
      const cells = [...row.children];
      const num = $('.dato__num', row);
      ScrollTrigger.create({ trigger: num, start: 'top 85%', once: true, onEnter: () => {
        countUp(num, 0.15);
        if (REDUCED) return;
        gsap.from(cells, { autoAlpha: 0, y: 30, duration: 1.1, ease: 'power3.out', stagger: 0.08 });
      } });
    });
    if (!REDUCED) gsap.from('.datos__tag', { '--cr': '100%', clipPath: 'inset(0 100% 0 0)', duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: '.datos', start: 'top 70%', once: true } });
  }

  /* ------------------------------------------------------------------------
     Terraza: la ventana se abre (pág. 8)
     ------------------------------------------------------------------------ */
  function setupTerraza() {
    const sec = $('.terraza');
    const win = $('.terraza__window', sec);
    const cover = $('.cover', win);
    const glass = $$('.glass', sec);
    const spots = $$('.hotspot', sec);
    if (REDUCED) { gsap.set(cover, { '--zoom': 1 }); return; }
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    });
    tl.fromTo(win, { '--ct': '16%', '--cb': '16%', '--cl': '24%', '--cr': '24%', '--crad': '18px' }, { '--ct': '0%', '--cb': '0%', '--cl': '0%', '--cr': '0%', '--crad': '0px', duration: 0.45, ease: 'power2.inOut' }, 0)
      .fromTo(cover, { '--zoom': 1.25 }, { '--zoom': 1, duration: 0.6 }, 0)
      .from('.terraza__copy', { y: 40, autoAlpha: 0, duration: 0.15 }, 0.3)
      .from(glass, { y: 40, autoAlpha: 0, duration: 0.12, stagger: 0.05 }, 0.42)
      .from(spots, { scale: 0, autoAlpha: 0, duration: 0.08, stagger: 0.04 }, 0.55)
      .to({}, { duration: 0.2 });
  }

  /* ------------------------------------------------------------------------
     Residencias y local: plantas, lupa y renders (págs. 10 a 17)
     ------------------------------------------------------------------------ */
  function setupPlans() {
    $$('[data-plan]').forEach((fig) => {
      const img = $('img', fig);
      const loupe = $('.loupe', fig);
      const corners = $$('.plan__corner', fig);
      const sheet = fig.closest('.sheet');
      const spec = sheet && $('.spec', sheet);

      if (!REDUCED) {
        gsap.set(img, { clipPath: 'inset(0 100% 0 0)' });
        ScrollTrigger.create({
          trigger: fig, start: 'top 75%', once: true,
          onEnter: () => {
            const o = { p: 0 };
            gsap.timeline()
              .to(o, { p: 1, duration: 1.7, ease: 'power2.inOut', onUpdate: () => {
                img.style.clipPath = `inset(0 ${(100 - o.p * 100).toFixed(2)}% 0 0)`;
              } })
              .from(corners, { scale: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.05 }, 0.2);
            if (spec) {
              gsap.from(spec.children, { y: 30, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.2 });
              countUp(spec, 0.4);
            }
          },
        });
      } else if (spec) countUp(spec, 0);

      // Lupa
      if (FINE) {
        fig.addEventListener('pointerenter', () => {
          loupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
          fig.classList.add('is-loupe');
        });
        fig.addEventListener('pointerleave', () => fig.classList.remove('is-loupe'));
        fig.addEventListener('pointermove', (e) => {
          const r = fig.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          const Z = 2.6;
          const s = loupe.offsetWidth;
          loupe.style.transform = `translate(${x - s / 2}px, ${y - s / 2}px)`;
          loupe.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
          loupe.style.backgroundPosition = `${-(x * Z - s / 2)}px ${-(y * Z - s / 2)}px`;
        });
      }
      fig.addEventListener('click', () => viewer.openPlan(img, fig.dataset.caption));
      const btn = sheet && $('[data-open-plan]', sheet);
      if (btn) btn.addEventListener('click', () => viewer.openPlan(img, fig.dataset.caption));
    });

    // Renders: la ventana se expande hasta ocupar toda la pantalla
    $$('.dive').forEach((fig) => {
      const win = $('.dive__window', fig);
      const img = $('img', win);
      if (REDUCED) return;
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
      })
        .fromTo(win, { '--ct': '18%', '--cb': '18%', '--cl': '22%', '--cr': '22%', '--crad': '18px' }, { '--ct': '0%', '--cb': '0%', '--cl': '0%', '--cr': '0%', '--crad': '0px', duration: 0.7, ease: 'power2.inOut' }, 0.15)
        .fromTo(img, { '--zoom': 1.22 }, { '--zoom': 1, duration: 0.85 }, 0.15)
        .fromTo(fig, { '--capo': 0 }, { '--capo': 1, duration: 0.1 }, 0.8);
    });

    // Selector de unidades
    const tabs = $('.unit-tabs');
    const blob = $('.unit-tabs__blob', tabs);
    const btns = $$('button', tabs);
    const units = $$('.residencias .unit');
    const setActive = (i) => {
      btns.forEach((b, k) => b.classList.toggle('is-active', k === i));
      const b = btns[i];
      if (b) { blob.style.width = b.offsetWidth + 'px'; blob.style.transform = `translateX(${b.offsetLeft}px)`; }
    };
    setActive(0);
    ScrollTrigger.create({ trigger: '.residencias', start: 'top 40%', end: 'bottom 70%', onToggle: (s) => tabs.classList.toggle('is-visible', s.isActive) });
    units.forEach((u, i) => ScrollTrigger.create({ trigger: u, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) setActive(i); } }));
    btns.forEach((b) => b.addEventListener('click', () => scrollToTarget($('#' + b.dataset.unitTarget))));
    addEventListener('resize', () => { const i = btns.findIndex((b) => b.classList.contains('is-active')); setActive(Math.max(0, i)); });
  }

  /* ------------------------------------------------------------------------
     Inversión (pág. 18)
     ------------------------------------------------------------------------ */
  function setupInversion() {
    const ticks = $('.ticks');
    const meter = $('.meter span');
    const tl = $('.timeline');
    if (REDUCED) { ticks.classList.add('is-on'); return; }
    $$('i', ticks).forEach((t, i) => { t.style.animationDelay = (i * 0.045).toFixed(3) + 's'; });
    gsap.set(meter, { scaleX: 0 });
    gsap.set(tl, { '--tl': 0 });
    ScrollTrigger.create({ trigger: '.plans', start: 'top 70%', once: true, onEnter: () => {
      ticks.classList.add('is-on');
      gsap.to(meter, { scaleX: 1, duration: 1.4, ease: 'expo.out', delay: 0.3 });
      gsap.to(tl, { '--tl': 1, duration: 1.4, ease: 'power2.inOut', delay: 0.2 });
      gsap.from($$('li', tl), { x: -12, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15, delay: 0.3 });
    } });
  }

  /* ------------------------------------------------------------------------
     Contacto
     ------------------------------------------------------------------------ */
  function setupContacto() {
    $$('[data-copy]').forEach((b) => {
      const label = b.textContent;
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copiado ✓'; }
        catch (e) { b.textContent = b.dataset.copy; }
        setTimeout(() => { b.textContent = label; }, 2200);
      });
    });
    if (REDUCED) return;
    gsap.from('.footer__canes', { yPercent: 40, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer__mark', start: 'top 92%', once: true } });
    gsap.fromTo('.footer__word', { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 1.6, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: '.footer__mark', start: 'top 92%', once: true } });
  }

  /* ------------------------------------------------------------------------
     Visor de renders y plantas
     ------------------------------------------------------------------------ */
  const viewer = (() => {
    const el = $('.viewer');
    const img = $('[data-v-img]', el);
    const stage = $('[data-v-stage]', el);
    const cap = $('[data-v-caption]', el);
    const idx = $('[data-v-index]', el);
    const tot = $('[data-v-total]', el);
    const zoomTxt = $('[data-v-zoom]', el);
    const items = $$('[data-gallery]');
    let i = 0, mode = 'gallery', z = 1, px = 0, py = 0, lastFocus = null;

    const apply = () => {
      img.style.transform = `translate(${px}px, ${py}px) scale(${z})`;
      zoomTxt.textContent = Math.round(z * 100) + '%';
    };
    const setZoom = (nz) => {
      z = clamp(nz, 1, 5);
      if (z === 1) { px = 0; py = 0; }
      apply();
    };
    const show = (k) => {
      i = (k + items.length) % items.length;
      const src = $('img', items[i]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = items[i].dataset.caption || '';
      idx.textContent = pad(i + 1);
      gsap.fromTo(img, { autoAlpha: 0, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' });
    };
    const open = () => {
      lastFocus = document.activeElement;
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      lock(true);
      $('[data-v-close]', el).focus({ preventScroll: true });
    };
    const close = () => {
      el.classList.remove('is-open', 'is-plan');
      el.setAttribute('aria-hidden', 'true');
      lock(false);
      z = 1; px = 0; py = 0; apply();
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    tot.textContent = pad(items.length);
    items.forEach((it, k) => it.addEventListener('click', () => {
      mode = 'gallery';
      el.classList.remove('is-plan');
      z = 1; px = 0; py = 0; apply();
      show(k); open();
    }));
    $('[data-v-close]', el).addEventListener('click', close);
    $('[data-v-prev]', el).addEventListener('click', () => show(i - 1));
    $('[data-v-next]', el).addEventListener('click', () => show(i + 1));
    $('[data-v-in]', el).addEventListener('click', () => setZoom(z * 1.5));
    $('[data-v-out]', el).addEventListener('click', () => setZoom(z / 1.5));
    addEventListener('keydown', (e) => {
      if (!el.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (mode === 'gallery' && e.key === 'ArrowRight') show(i + 1);
      if (mode === 'gallery' && e.key === 'ArrowLeft') show(i - 1);
      if (mode === 'plan' && (e.key === '+' || e.key === '=')) setZoom(z * 1.5);
      if (mode === 'plan' && e.key === '-') setZoom(z / 1.5);
    });

    // Zoom con rueda, arrastre y doble toque en plantas
    stage.addEventListener('wheel', (e) => {
      if (mode !== 'plan') return;
      e.preventDefault();
      setZoom(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    }, { passive: false });
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      if (mode !== 'plan' || z === 1) return;
      drag = { x: e.clientX - px, y: e.clientY - py };
      stage.classList.add('is-dragging');
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      px = e.clientX - drag.x; py = e.clientY - drag.y; apply();
    });
    const end = () => { drag = null; stage.classList.remove('is-dragging'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('dblclick', () => { if (mode === 'plan') setZoom(z > 1 ? 1 : 2.4); });
    stage.addEventListener('click', (e) => { if (mode === 'gallery' && e.target === stage) close(); });

    return {
      openPlan(src, caption) {
        mode = 'plan';
        el.classList.add('is-plan');
        img.src = src.currentSrc || src.src;
        img.alt = src.alt;
        cap.textContent = caption || '';
        z = 1; px = 0; py = 0; apply();
        gsap.fromTo(img, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
        open();
      },
    };
  })();

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */
  const heroImg = $('.hero__media img');
  const ready = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    decode(heroImg),
  ]);

  setupChrome();
  setupCursor();
  setupHero();
  setupFachada();
  setupSate();
  setupIndexes();
  setupGeo();
  setupDatos();
  setupTerraza();
  setupPlans();
  setupInversion();
  setupContacto();

  ready.then(() => {
    setupConcepto();
    setupReveals();
    ScrollTrigger.refresh();
  });

  runLoader(ready).then(() => {
    document.body.classList.remove('is-loading');
    scrollTo(0, 0);
    if (lenis) lenis.start();
    heroIntro();
  });

  let rw = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === rw) return;
    rw = innerWidth;
    ScrollTrigger.refresh();
  });
})();
