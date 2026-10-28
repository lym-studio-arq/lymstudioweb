/* ==========================================================================
   TRELLES 928 — Brochure digital
   GSAP + ScrollTrigger + SplitText + Lenis
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DESKTOP = '(min-width: 961px)';
  const isDesktop = () => matchMedia(DESKTOP).matches;

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
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.15 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const lock = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    else document.body.style.overflow = on ? 'hidden' : '';
  };

  function scrollToTarget(target, { offset = 0, duration = 1.9, onComplete } = {}) {
    if (lenis) {
      lenis.scrollTo(target, { offset, duration, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete });
      return;
    }
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + offset;
    scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
    if (onComplete) setTimeout(onComplete, REDUCED ? 30 : 900);
  }

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // Ajusta el cuerpo de un texto para que ocupe exactamente el ancho de su caja.
  function fit(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    el.style.fontSize = '100px';
    const w = range.getBoundingClientRect().width;
    if (w) el.style.fontSize = (100 * el.clientWidth / w) * 0.995 + 'px';
  }
  const fitAll = () => $$('[data-fit]').forEach(fit);

  function countUp(scope, delay = 0.35) {
    $$('[data-count-to]', scope).forEach((el, i) => {
      const to = +el.dataset.countTo;
      const o = { v: 0 };
      gsap.to(o, {
        v: to,
        duration: 1.9,
        delay: delay + i * 0.12,
        ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(o.v); },
      });
    });
  }

  // Durante el refresh de ScrollTrigger las páginas apiladas dejan de ser
  // sticky, así las posiciones se miden sobre el flujo real del documento.
  ScrollTrigger.addEventListener('refreshInit', () => {
    root.classList.add('st-refresh');
    fitAll();
  });
  ScrollTrigger.addEventListener('refresh', () => root.classList.remove('st-refresh'));

  /* ------------------------------------------------------------------------
     Loader (pág. 1: logos)
     ------------------------------------------------------------------------ */
  function runLoader(ready) {
    const el = $('.loader');
    const count = $('[data-count]', el);
    const bar = $('.loader__bar span', el);
    const logos = $$('.loader__logo', el);

    if (REDUCED) {
      return ready.then(() => {
        gsap.to(el, { autoAlpha: 0, duration: 0.3, onComplete: () => gsap.set(el, { display: 'none' }) });
      });
    }

    gsap.fromTo(logos,
      { '--ct': '100%', yPercent: 35 },
      { '--ct': '0%', yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.1 });

    const jobs = [ready, wait(1600)];
    let done = 0;
    jobs.forEach((j) => j.then(() => { done += 1; }, () => { done += 1; }));

    return new Promise((resolve) => {
      const shown = { v: 0 };
      const start = performance.now();
      const tick = () => {
        const target = performance.now() - start > 8000 ? 1 : (done + 0.15) / (jobs.length + 0.15);
        shown.v += (target - shown.v) * 0.07;
        if (done === jobs.length && shown.v > 0.995) shown.v = 1;
        count.textContent = Math.round(shown.v * 100);
        bar.style.transform = `scaleX(${shown.v})`;
        if (shown.v === 1) {
          gsap.ticker.remove(tick);
          resolve();
        }
      };
      gsap.ticker.add(tick);
    }).then(() => new Promise((resolve) => {
      gsap.timeline()
        .to(logos, { yPercent: -40, autoAlpha: 0, duration: 0.75, ease: 'power3.in', stagger: 0.06 })
        .to('.loader__foot, .loader__bar', { autoAlpha: 0, duration: 0.4 }, '<')
        .to(el, { '--cb': '100%', duration: 1.2, ease: 'expo.inOut' }, '-=0.2')
        .call(resolve, null, '<0.15')
        .set(el, { display: 'none' });
    }));
  }

  /* ------------------------------------------------------------------------
     Revelados de texto
     ------------------------------------------------------------------------ */
  function setupReveals() {
    $$('[data-reveal="chars"]').forEach((el) => {
      const split = SplitText.create(el, { type: 'words,chars', mask: 'chars', charsClass: 'char' });
      if (REDUCED) return;
      gsap.from(split.chars, {
        yPercent: 118,
        duration: 1.5,
        ease: 'expo.out',
        stagger: 0.04,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      });
    });

    $$('[data-reveal="lines"]').forEach((el) => {
      if (REDUCED) return;
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });

    $$('[data-reveal="fade"]').forEach((el) => {
      if (REDUCED) return;
      gsap.from(el, {
        autoAlpha: 0,
        y: 26,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });

    // pág. 6: la frase se "enciende" palabra por palabra con el scroll
    const statement = $('[data-words]');
    if (statement) {
      const split = SplitText.create(statement, { type: 'words', wordsClass: 'w' });
      if (!REDUCED) {
        gsap.fromTo(split.words, { opacity: 0.14 }, {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: true },
        });
      }
    }
  }

  /* ------------------------------------------------------------------------
     Portada (págs. 2, 4 y 5): la ventana se abre y la cámara baja por la fachada
     ------------------------------------------------------------------------ */
  let nameSplit = null;

  function setupCover() {
    const cover = $('.cover');
    const head = $('.cover__head', cover);
    const title = $('.cover__title', cover);
    const media = $('.cover__media', cover);
    const pan = $('.cover__pan', cover);
    const cue = $('.cover__cue', cover);
    const spots = $$('.hotspot', cover);

    nameSplit = SplitText.create('.cover__name', { type: 'chars', mask: 'chars', charsClass: 'char' });
    fit($('.cover__name'));

    spots.forEach((s) => s.addEventListener('click', () => s.classList.toggle('is-open')));

    const panH = () => Math.max(innerWidth * 2160 / 1920, innerHeight * 1.3);
    const setPan = () => { pan.style.height = Math.round(panH()) + 'px'; };
    setPan();
    ScrollTrigger.addEventListener('refreshInit', setPan);

    if (REDUCED) return;

    // Ventana inicial: justo debajo del título, con los márgenes de la grilla
    const gutter = () => parseFloat(getComputedStyle(head).paddingLeft) || 24;
    const clipFrom = {
      '--ct': () => clamp((title.offsetTop + title.offsetHeight + innerHeight * 0.035) / innerHeight * 100, 30, 84) + '%',
      '--cr': () => (gutter() / innerWidth) * 100 + '%',
      '--cb': () => (gutter() / innerHeight) * 100 + '%',
      '--cl': () => (gutter() / innerWidth) * 100 + '%',
      '--crad': () => Math.round(Math.min(gutter() * 0.5, 24)) + 'px',
    };
    const clipOpen = { '--ct': '0%', '--cr': '0%', '--cb': '0%', '--cl': '0%', '--crad': '0px' };

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: cover,
        start: 'top top',
        end: () => '+=' + Math.round(innerHeight * 2.6),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(media, clipFrom, { ...clipOpen, duration: 1, ease: 'power2.inOut' }, 0)
      .fromTo(pan, { scale: 1.12 }, { scale: 1, duration: 1.1, ease: 'power2.out' }, 0)
      .to(head, { yPercent: -22, autoAlpha: 0, duration: 0.7, ease: 'power1.in' }, 0)
      .to(cue, { autoAlpha: 0, duration: 0.15 }, 0)
      .to(pan, { y: () => -(panH() - innerHeight), duration: 1.6, ease: 'power1.inOut' }, 1);

    // Cada hotspot aparece cuando su punto de la fachada entra en cuadro
    const travel = Math.max(panH() - innerHeight, 1);
    spots.forEach((s) => {
      const y = (parseFloat(s.style.getPropertyValue('--y')) / 100) * panH();
      const at = Math.max(0.78, 1 + 1.6 * clamp((y - innerHeight * 0.72) / travel, 0, 1));
      const left = s.classList.contains('hotspot--left') ? 1 : -1;
      tl.fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, at)
        .fromTo($('.hotspot__dot', s), { scale: 0 }, { scale: 1, duration: 0.16, ease: 'back.out(2.5)' }, at)
        .fromTo($('.hotspot__line', s), { scaleX: 0, transformOrigin: left > 0 ? '100% 50%' : '0% 50%' }, { scaleX: 1, duration: 0.14 }, at + 0.06)
        .fromTo($('.hotspot__card', s), { autoAlpha: 0, x: 14 * left }, { autoAlpha: 1, x: 0, duration: 0.18, ease: 'power2.out' }, at + 0.1);
    });
    tl.to({}, { duration: 0.25 });
  }

  function coverIntro() {
    if (REDUCED) return;
    gsap.timeline()
      .fromTo('.cover__curtain', { '--ct': '100%' }, { '--ct': '0%', duration: 1.9, ease: 'expo.inOut' }, 0)
      .from('.cover__pan img', { scale: 1.25, duration: 2.6, ease: 'expo.out' }, 0.2)
      .from(nameSplit.chars, { yPercent: 112, duration: 1.7, ease: 'expo.out', stagger: 0.05 }, 0.15)
      .from($$('.cover [data-intro]'), { autoAlpha: 0, y: 18, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 0.4)
      .from('.cover__cue', { autoAlpha: 0, y: 10, duration: 1 }, 1.2);
  }

  /* ------------------------------------------------------------------------
     Mapa (pág. 8)
     ------------------------------------------------------------------------ */
  let focusPoi = () => {};

  function setupMap() {
    const sec = $('.mapa');
    if (!sec) return;
    const frame = $('.mapa__frame', sec);
    const canvas = $('.mapa__canvas', sec);
    const pins = $$('.mapa__pin', sec);
    const home = $('.mapa__home', sec);
    const streets = $$('.mapa__streets text', sec);
    const list = $('.poi-list', sec);
    const items = $$('button', list);

    const RATIO = 2403 / 2144;
    const coord = (el) => [parseFloat(el.style.getPropertyValue('--x')) / 100, parseFloat(el.style.getPropertyValue('--y')) / 100];
    const HOME = coord(home);
    const overview = () => (isDesktop() ? { x: 0.548, y: 0.565, s: 1.2 } : { x: 0.55, y: 0.56, s: 1.6 });
    const focusScale = () => (isDesktop() ? 2.1 : 2.4);

    const cam = REDUCED ? { ...overview() } : { x: HOME[0], y: HOME[1], s: 2.7 };
    let fw = 0, fh = 0, cw = 0, ch = 0;

    const render = () => {
      const s = cam.s;
      const tx = clamp(fw / 2 - cam.x * cw * s, fw - cw * s, 0);
      const ty = clamp(fh / 2 - cam.y * ch * s, fh - ch * s, 0);
      canvas.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      canvas.style.setProperty('--inv', (1 / s).toFixed(4));
    };
    const measure = () => {
      fw = frame.clientWidth;
      fh = frame.clientHeight;
      cw = Math.max(fw, fh / RATIO);
      ch = cw * RATIO;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      render();
    };
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    const go = (t, duration = 1.4) => gsap.to(cam, { x: t.x, y: t.y, s: t.s, duration, ease: 'power3.inOut', overwrite: true, onUpdate: render });

    let active = null;
    let resetTimer = 0;
    const setActive = (n) => {
      active = n;
      pins.forEach((p) => p.classList.toggle('is-active', p.dataset.poi === n));
      items.forEach((b) => b.classList.toggle('is-active', b.dataset.poi === n));
      list.classList.toggle('has-active', n !== null);
    };
    const focus = (n) => {
      clearTimeout(resetTimer);
      const pin = pins.find((p) => p.dataset.poi === String(n));
      if (!pin) return;
      const [x, y] = coord(pin);
      setActive(String(n));
      go({ x, y, s: focusScale() });
    };
    const reset = () => {
      setActive(null);
      go(overview(), 1.6);
    };
    focusPoi = focus;

    items.forEach((b) => {
      b.addEventListener('mouseenter', () => { if (FINE) focus(b.dataset.poi); });
      b.addEventListener('focus', () => focus(b.dataset.poi));
      b.addEventListener('click', () => (active === b.dataset.poi && !FINE ? reset() : focus(b.dataset.poi)));
    });
    list.addEventListener('mouseleave', () => { resetTimer = setTimeout(reset, 900); });
    list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget)) resetTimer = setTimeout(reset, 900); });

    pins.forEach((p) => {
      p.addEventListener('mouseenter', () => { if (FINE && active !== p.dataset.poi) { clearTimeout(resetTimer); setActive(p.dataset.poi); } });
      p.addEventListener('mouseleave', () => { if (FINE) resetTimer = setTimeout(reset, 900); });
      p.addEventListener('click', (e) => { e.stopPropagation(); focus(p.dataset.poi); });
    });
    frame.addEventListener('click', () => { if (active) reset(); });

    if (REDUCED) return;

    // Entrada: la cámara se aleja desde Trelles 928 y aparecen los puntos
    gsap.set(pins, { scale: 0 });
    gsap.set(streets, { autoAlpha: 0 });
    gsap.set(home, { scale: 0 });
    const intro = gsap.timeline({ paused: true });
    intro
      .to(home, { scale: 1, duration: 0.9, ease: 'back.out(2)' }, 0)
      .to(cam, { ...overview(), duration: 2.6, ease: 'expo.inOut', onUpdate: render }, 0.25)
      .to(streets, { autoAlpha: 1, duration: 1.2, stagger: 0.12 }, 1.1)
      .to(pins, { scale: 1, duration: 0.8, ease: 'back.out(2.4)', stagger: 0.08 }, 1.25)
      .from(items, { autoAlpha: 0, x: 26, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.4)
      .from('.mapa__heading, .mapa__hint', { autoAlpha: 0, y: 14, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.2);
    ScrollTrigger.create({ trigger: frame, start: 'top 72%', once: true, onEnter: () => intro.play() });
  }

  /* ------------------------------------------------------------------------
     Diagrama de entorno (pág. 9)
     ------------------------------------------------------------------------ */
  const CATS = {
    deportes: { title: 'Deportes', places: [[2, 'Club Ferrocarril Oeste']] },
    gastronomia: { title: 'Gastronomía', places: [[8, 'Havanna'], [9, 'Restaurante “La Tranquerita”']] },
    verdes: { title: 'Espacios verdes', places: [[1, 'Plaza Irlanda'], [3, 'Plaza del Ángel Gris']] },
    transporte: { title: 'Transporte público', places: [[0, 'Ferrocarril Sarmiento'], [0, 'Subte Línea A']] },
  };
  const ORDER = ['deportes', 'gastronomia', 'verdes', 'transporte'];
  // Desvío angular (grados) de cada categoría respecto de Trelles 928, que está a las 9 en punto.
  // Positivo = sentido horario (arco por arriba), negativo = antihorario (arco por abajo).
  const OFFSET = { deportes: 45, gastronomia: 135, verdes: -135, transporte: -45 };

  function setupDiagram() {
    const sec = $('.entorno');
    if (!sec) return;
    const svg = $('.diagram', sec);
    const ring = $('.dg-ring', svg);
    const arc = $('.dg-arc', svg);
    const head = $('.dg-head', svg);
    const sub = $('[data-dg-sub]', svg);
    const nodes = $$('.dg-node', svg);
    const swap = $('.entorno__swap', sec);
    const titleEl = $('[data-cat-title]', sec);
    const iconEl = $('[data-cat-icon]', sec);
    const placesEl = $('[data-cat-places]', sec);
    const dots = $$('.entorno__dots button', sec);

    const C = { x: 960, y: 540, r: 237.5 };
    const CYCLE = 4;
    const t = { d: 0 };
    let current = null;
    let idx = -1;
    let auto = null;
    let lightCall = null;
    let inView = false;
    let hold = false;
    let holdTimer = 0;

    const point = (deg) => {
      const r = (deg * Math.PI) / 180;
      return [C.x + C.r * Math.cos(r), C.y + C.r * Math.sin(r)];
    };
    // Arco desde Trelles 928 (180°) hasta 180° + d
    const draw = () => {
      const [x0, y0] = point(180);
      const [x1, y1] = point(180 + t.d);
      arc.setAttribute('d', Math.abs(t.d) < 0.2 ? '' : `M${x0.toFixed(2)} ${y0.toFixed(2)}A${C.r} ${C.r} 0 ${Math.abs(t.d) > 180 ? 1 : 0} ${t.d > 0 ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`);
      head.setAttribute('cx', x1.toFixed(2));
      head.setAttribute('cy', y1.toFixed(2));
    };

    const fill = (cat) => {
      titleEl.textContent = CATS[cat].title;
      iconEl.setAttribute('href', '#ico-' + cat);
      placesEl.innerHTML = CATS[cat].places.map(([n, name]) => (n
        ? `<li><button class="entorno__place" type="button" data-goto-poi="${n}"><span class="poi-list__n">${n}</span>${name}<em>Ver en el mapa →</em></button></li>`
        : `<li><span class="entorno__place"><span class="poi-list__n is-empty"></span>${name}</span></li>`)).join('');
    };

    const light = (cat) => nodes.forEach((n) => n.classList.toggle('is-lit', n.dataset.cat === cat));

    const activate = (cat, byUser) => {
      if (cat === current) return;
      const first = current === null;
      current = cat;
      idx = ORDER.indexOf(cat);

      nodes.forEach((n) => n.classList.toggle('is-active', n.dataset.cat === cat));
      dots.forEach((d) => {
        const on = d.dataset.cat === cat;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', String(on));
        gsap.killTweensOf(d.firstElementChild);
        gsap.set(d.firstElementChild, { scaleX: on ? (REDUCED || byUser ? 1 : 0) : 0 });
        if (on && !REDUCED && !byUser) gsap.to(d.firstElementChild, { scaleX: 1, duration: CYCLE, ease: 'none' });
      });

      // El arco se retrae y se extiende hasta la nueva categoría; el nodo se enciende al llegar
      if (lightCall) lightCall.kill();
      light(null);
      if (REDUCED) {
        t.d = OFFSET[cat];
        draw();
        light(cat);
      } else {
        const dur = first ? 1.2 : 1.35;
        gsap.to(t, { d: OFFSET[cat], duration: dur, ease: 'power3.inOut', overwrite: true, onUpdate: draw });
        lightCall = gsap.delayedCall(dur * 0.82, () => light(cat));
      }

      if (first || REDUCED) {
        fill(cat);
        sub.textContent = CATS[cat].title.toUpperCase();
        return;
      }
      gsap.to(sub, { autoAlpha: 0, duration: 0.25, overwrite: true, onComplete: () => {
        sub.textContent = CATS[cat].title.toUpperCase();
        gsap.to(sub, { autoAlpha: 1, duration: 0.5 });
      } });
      gsap.to(swap, {
        autoAlpha: 0, y: -12, duration: 0.3, ease: 'power2.in', overwrite: true,
        onComplete: () => {
          fill(cat);
          gsap.fromTo(swap, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' });
          gsap.from($$('li', placesEl), { autoAlpha: 0, x: -14, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.05 });
        },
      });
    };

    const schedule = () => {
      if (auto) auto.kill();
      if (REDUCED || !inView || hold || current === null) return;
      auto = gsap.delayedCall(CYCLE, () => {
        activate(ORDER[(idx + 1) % ORDER.length], false);
        schedule();
      });
    };
    const holdFor = (ms) => {
      hold = true;
      if (auto) auto.kill();
      clearTimeout(holdTimer);
      if (ms) holdTimer = setTimeout(() => { hold = false; schedule(); }, ms);
    };

    nodes.forEach((n) => {
      n.addEventListener('mouseenter', () => { holdFor(0); activate(n.dataset.cat, true); });
      n.addEventListener('click', () => { holdFor(9000); activate(n.dataset.cat, true); });
      n.addEventListener('focus', () => { holdFor(9000); activate(n.dataset.cat, true); });
      n.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); holdFor(9000); activate(n.dataset.cat, true); }
      });
    });
    svg.addEventListener('mouseleave', () => holdFor(2600));
    dots.forEach((d) => d.addEventListener('click', () => { holdFor(9000); activate(d.dataset.cat, true); }));

    // "Ver en el mapa": vuelve al mapa y enfoca el punto
    placesEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-goto-poi]');
      if (!b) return;
      const n = b.dataset.gotoPoi;
      scrollToTarget($('#mapa'), { duration: 1.6, onComplete: () => focusPoi(n) });
    });

    fill('deportes');
    draw();

    ScrollTrigger.create({
      trigger: sec,
      start: 'top 70%',
      end: 'bottom 30%',
      refreshPriority: -1,
      onToggle: (self) => { inView = self.isActive; if (inView) schedule(); else if (auto) auto.kill(); },
    });

    if (REDUCED) {
      activate('deportes', true);
      return;
    }

    // Entrada: el círculo se traza desde Trelles 928 y cada categoría aparece cuando la línea la alcanza
    const homeIn = $('.dg-home__in', svg);
    const nodeIns = nodes.map((n) => $('.dg-node__in', n));
    const icons = nodes.map((n) => $('.dg-icon', n));
    const labels = $$('.dg-label', svg);
    const RING = 2.4;
    // Tiempo en el que power2.inOut alcanza la fracción p (inversa de la curva)
    const when = (p) => (p < 0.5 ? Math.sqrt(p / 2) : 1 - Math.sqrt((1 - p) / 2));

    gsap.set(ring, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set([homeIn, ...nodeIns], { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(icons, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set([...labels, head], { autoAlpha: 0 });
    gsap.set(['.dg-center', sub], { autoAlpha: 0, y: 12 });

    const intro = gsap.timeline({ paused: true, onComplete: () => { activate('deportes', false); schedule(); } });
    intro
      .to(homeIn, { scale: 1, duration: 0.9, ease: 'back.out(2)' }, 0)
      .to(ring, { strokeDashoffset: 0, duration: RING, ease: 'power2.inOut' }, 0.2)
      .to('.dg-center', { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0.9)
      .to(sub, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' }, 1.3)
      .from(swap, { autoAlpha: 0, y: 18, duration: 1, ease: 'expo.out' }, 1.2)
      .from(dots, { autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 1.4)
      .to(head, { autoAlpha: 1, duration: 0.3 }, 2.5);
    ORDER.forEach((cat, i) => {
      const off = OFFSET[cat];
      const at = 0.2 + RING * when(((off + 360) % 360) / 360);
      const n = nodes.findIndex((el) => el.dataset.cat === cat);
      intro
        .to(nodeIns[n], { scale: 1, duration: 0.8, ease: 'back.out(2.2)' }, at - 0.05)
        .to(icons[n], { strokeDashoffset: 0, duration: 1, ease: 'power2.out' }, at + 0.15)
        .to(labels[n], { autoAlpha: 1, duration: 0.8 }, at + 0.1);
    });
    ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => intro.play() });
  }

  /* ------------------------------------------------------------------------
     El proyecto (pág. 10): la ventana se expande y el título cambia de tono
     ------------------------------------------------------------------------ */
  function setupProyecto() {
    const sec = $('.proyecto');
    if (!sec || REDUCED) return;
    const win = $('.proyecto__window', sec);
    const img = $('img', win);
    const titles = $$('.proyecto__title', sec);
    const side = () => (isDesktop() ? 36.5 : 16) + '%';
    const top = () => (isDesktop() ? 19 : 25) + '%';
    const clipFrom = { '--ct': top, '--cb': top, '--cr': side, '--cl': side, '--crad': () => (isDesktop() ? 24 : 18) + 'px' };

    gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: () => '+=' + Math.round(innerHeight * 1.6),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })
      .fromTo(win, clipFrom, { '--ct': '0%', '--cb': '0%', '--cr': '0%', '--cl': '0%', '--crad': '0px', duration: 1, ease: 'power2.inOut' }, 0)
      .fromTo(img, { scale: 1.32 }, { scale: 1.02, duration: 1.1, ease: 'power2.out' }, 0)
      .fromTo(titles, { letterSpacing: '0.14em' }, { letterSpacing: '0.01em', duration: 1, ease: 'power2.inOut' }, 0)
      .to({}, { duration: 0.25 });
  }

  /* ------------------------------------------------------------------------
     Paneles oscuros (págs. 11, 13, 16, 20 y 22) con contadores
     ------------------------------------------------------------------------ */
  function setupPanels() {
    $$('[data-panel]').forEach((panel) => {
      if (REDUCED) return;
      $$('[data-count-to]', panel).forEach((c) => { c.textContent = '0'; });
      const trigger = panel.closest('.page') || panel.closest('section');
      const desk = isDesktop();
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(panel, desk ? { xPercent: 104 } : { yPercent: 24, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, autoAlpha: 1, duration: 1.6, ease: 'expo.out' })
        .from(panel.children, { autoAlpha: 0, y: 26, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.35)
        .add(() => countUp(panel), 0.4);
      ScrollTrigger.create({
        trigger: desk ? trigger : panel,
        start: desk ? 'top 55%' : 'top 85%',
        once: true,
        onEnter: () => tl.play(),
      });
    });
  }

  /* ------------------------------------------------------------------------
     Marquee con velocidad según el scroll
     ------------------------------------------------------------------------ */
  function setupMarquee() {
    const track = $('.marquee__track');
    if (!track || REDUCED) return;
    let x = 0;
    let dir = -1;
    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(track);
    gsap.ticker.add((time, dt) => {
      if (!visible) return;
      const v = lenis ? lenis.velocity : 0;
      if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
      x += dir * (0.6 + Math.min(Math.abs(v) * 0.32, 16)) * (dt / 16.667);
      const half = track.scrollWidth / 2;
      if (x <= -half) x += half;
      else if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  }

  /* ------------------------------------------------------------------------
     Residencias: páginas apiladas, plantas, renders
     ------------------------------------------------------------------------ */
  function setupStacks() {
    if (REDUCED) return;
    $$('.stack').forEach((stack) => {
      const pages = $$(':scope > .page', stack);
      pages.forEach((page, i) => {
        const next = pages[i + 1];
        const shade = $('.page__shade', page);
        if (!next || !shade) return;
        gsap.timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } })
          .to($('.page__inner', page), { scale: 0.94, ease: 'none' }, 0)
          .to(shade, { opacity: 0.38, ease: 'none' }, 0);
      });
    });
  }

  function setupPlans() {
    $$('.page--plan').forEach((page) => {
      if (REDUCED) return;
      const img = $('.plan img', page);
      const scan = $('.plan__scan', page);
      const hint = $('.plan__hint', page);
      const caption = $('.plan-area .uf-line', page);
      const tl = gsap.timeline({ paused: true });
      gsap.set(img, { '--cr': '100%' });
      tl.to(img, { '--cr': '0%', duration: 1.9, ease: 'power3.inOut' }, 0.1)
        .fromTo(scan, { left: '0%', autoAlpha: 1 }, { left: '100%', duration: 1.9, ease: 'power3.inOut' }, 0.1)
        .to(scan, { autoAlpha: 0, duration: 0.3 }, '>-0.1')
        .from(caption, { autoAlpha: 0, y: 10, duration: 1, ease: 'expo.out' }, 0)
        .from(hint, { autoAlpha: 0, duration: 1 }, 1.6);
      ScrollTrigger.create({ trigger: page, start: 'top 55%', once: true, onEnter: () => tl.play() });
    });

    // Lupa sobre la planta
    if (!FINE) return;
    $$('[data-plan]').forEach((fig) => {
      const img = $('img', fig);
      const lens = $('.loupe', fig);
      const Z = 2.6;
      const move = (e) => {
        const fr = fig.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        const L = lens.offsetWidth;
        lens.style.left = e.clientX - fr.left + 'px';
        lens.style.top = e.clientY - fr.top + 'px';
        lens.style.backgroundSize = `${ir.width * Z}px ${ir.height * Z}px`;
        lens.style.backgroundPosition = `${-((e.clientX - ir.left) * Z - L / 2)}px ${-((e.clientY - ir.top) * Z - L / 2)}px`;
      };
      fig.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
        lens.classList.add('is-on');
        move(e);
      });
      fig.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') move(e); });
      fig.addEventListener('pointerleave', () => lens.classList.remove('is-on'));
    });
    // Al scrollear, el cursor deja de estar sobre la planta aunque no se mueva
    const hideLoupes = () => $$('.loupe.is-on').forEach((l) => l.classList.remove('is-on'));
    if (lenis) lenis.on('scroll', hideLoupes);
    else addEventListener('scroll', hideLoupes, { passive: true });
  }

  function setupRenders() {
    if (REDUCED) return;
    $$('.page--render').forEach((page) => {
      const img = $('.render img', page);
      if ($('.render--pan', page)) {
        // Panorámica: recorrido lateral mientras la página atraviesa la pantalla
        gsap.fromTo(img, { x: 0 }, {
          x: () => -Math.max(0, img.offsetWidth - page.offsetWidth),
          ease: 'none',
          scrollTrigger: { trigger: page, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        });
      } else {
        gsap.fromTo(img, { scale: 1.22 }, {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: page, start: 'top bottom', end: 'top top', scrub: true },
        });
      }
    });
  }

  function setupHGallery(mm) {
    const sec = $('.hgallery');
    if (!sec) return;
    const track = $('.hgallery__track', sec);
    const bar = $('.hgallery__bar', sec);

    mm.add(DESKTOP, () => {
      if (REDUCED) return undefined;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: () => '+=' + dist(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => bar.style.setProperty('--p', self.progress.toFixed(3)),
        },
      });
      $$('.hgallery__item', sec).forEach((item) => {
        gsap.fromTo($('img', item), { xPercent: -5 }, {
          xPercent: 5,
          ease: 'none',
          scrollTrigger: { trigger: item, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      });
      return undefined;
    });

    mm.add('(max-width: 960px)', () => {
      const onScroll = () => bar.style.setProperty('--p', (sec.scrollLeft / Math.max(1, sec.scrollWidth - sec.clientWidth)).toFixed(3));
      sec.addEventListener('scroll', onScroll, { passive: true });
      return () => sec.removeEventListener('scroll', onScroll);
    });
  }

  /* ------------------------------------------------------------------------
     Local comercial (págs. 25 y 26): barrido entre las dos vistas
     ------------------------------------------------------------------------ */
  function setupLocal() {
    const sec = $('.local-wipe');
    if (!sec || REDUCED) return;
    const a = $('.local-wipe__img--a img', sec);
    const bFig = $('.local-wipe__img--b', sec);
    const b = $('img', bFig);
    const divider = $('.local-wipe__divider', sec);

    gsap.fromTo(a, { scale: 1.2 }, {
      scale: 1.04,
      ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: true },
    });

    gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: () => '+=' + Math.round(innerHeight * 1.5),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })
      .to({}, { duration: 0.2 })
      .fromTo(bFig, { '--cl': '100%' }, { '--cl': '0%', duration: 1 })
      .fromTo(b, { scale: 1.2, xPercent: 6 }, { scale: 1, xPercent: 0, duration: 1 }, '<')
      .fromTo(divider, { left: '100%' }, { left: '0%', duration: 1 }, '<')
      .to(a, { xPercent: -6, duration: 1 }, '<')
      .to({}, { duration: 0.25 });
  }

  /* ------------------------------------------------------------------------
     Contacto
     ------------------------------------------------------------------------ */
  function setupFooter() {
    if (!REDUCED) {
      gsap.fromTo('.footer__giant', { yPercent: 55 }, {
        yPercent: 16,
        ease: 'none',
        scrollTrigger: { trigger: '.contacto', start: 'top bottom', end: 'bottom bottom', scrub: true },
      });
    }
    $$('[data-copy]').forEach((b) => {
      const label = b.textContent;
      b.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy);
          b.textContent = 'Copiado ✓';
          setTimeout(() => { b.textContent = label; }, 2200);
        } catch (err) {
          location.href = 'mailto:' + b.dataset.copy;
        }
      });
    });
    $$('[data-top]').forEach((b) => b.addEventListener('click', () => scrollToTarget(0, { duration: 2.4 })));
  }

  /* ------------------------------------------------------------------------
     Header, menú, progreso y tono según el fondo
     ------------------------------------------------------------------------ */
  let menuOpen = false;

  function setupChrome() {
    const header = $('.header');
    const progress = $('.progress');
    const parts = [...$$('[data-theme]', header).filter((p) => p !== header), progress];
    const navLinks = $$('[data-nav]');
    const pNum = $('[data-progress-num]');
    const pLabel = $('[data-progress-label]');
    const menuBtn = $('.header__menu');
    const menu = $('#menu');
    const UI = '.header, .progress, .cursor, .unit-tabs, .menu, .loader, .lightbox, .planview';

    // Tono de cada pieza del header según lo que tiene debajo
    const surfaceAt = (x, y) => {
      for (const el of document.elementsFromPoint(x, y)) {
        if (el.closest(UI)) continue;
        const s = el.closest('[data-surface]');
        return s ? s.dataset.surface : 'light';
      }
      return 'light';
    };
    let frame = 0;
    gsap.ticker.add(() => {
      frame += 1;
      if (frame % 3) return;
      parts.forEach((p) => {
        let theme = 'dark';
        if (!menuOpen) {
          const r = p.getBoundingClientRect();
          if (!r.width || r.bottom < 0) return;
          theme = surfaceAt(r.left + r.width / 2, r.top + r.height / 2);
        }
        if (p.dataset.theme !== theme) p.dataset.theme = theme;
      });
    });

    // Ocultar al bajar, mostrar al subir
    let lastY = 0;
    const onScroll = (y, direction) => {
      if (menuOpen) return;
      const dir = direction || Math.sign(y - lastY);
      if (y > innerHeight * 0.5 && dir > 0) header.classList.add('is-hidden');
      else if (dir < 0 || y < 80) header.classList.remove('is-hidden');
      lastY = y;
    };
    if (lenis) lenis.on('scroll', (l) => onScroll(l.scroll, l.direction));
    else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

    // Capítulos: nav activa y progreso lateral
    $$('.chapter').forEach((ch) => {
      ScrollTrigger.create({
        trigger: ch,
        start: 'top 50%',
        end: 'bottom 50%',
        refreshPriority: -1,
        onToggle: (self) => {
          if (!self.isActive) return;
          pNum.textContent = ch.dataset.chapter;
          pLabel.textContent = ch.dataset.title;
          navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === ch.id));
        },
      });
    });
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => progress.style.setProperty('--p', self.progress.toFixed(4)),
    });

    // Menú móvil
    const setMenu = (on) => {
      menuOpen = on;
      menu.classList.toggle('is-open', on);
      menu.setAttribute('aria-hidden', String(!on));
      menuBtn.setAttribute('aria-expanded', String(on));
      menuBtn.textContent = on ? 'Cerrar' : 'Menú';
      header.classList.remove('is-hidden');
      lock(on);
      if (on && !REDUCED) {
        gsap.fromTo($$('li, .menu__foot', menu), { yPercent: 50, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.3 });
      }
    };
    menuBtn.addEventListener('click', () => setMenu(!menuOpen));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

    // Anclas internas con scroll suave
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id.length > 1 && document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      const wasOpen = menuOpen;
      if (menuOpen) setMenu(false);
      setTimeout(() => scrollToTarget(id === '#inicio' ? 0 : target, { duration: 2 }), wasOpen ? 350 : 0);
    });

    progress.classList.add('is-ready');
  }

  /* ------------------------------------------------------------------------
     Pestañas de tipologías
     ------------------------------------------------------------------------ */
  function setupUnitTabs() {
    const tabs = $('.unit-tabs');
    if (!tabs) return;
    const blob = $('.unit-tabs__blob', tabs);
    const btns = $$('button', tabs);
    const moveBlob = (b) => {
      blob.style.width = b.offsetWidth + 'px';
      blob.style.transform = `translateX(${b.offsetLeft}px)`;
    };
    const setActive = (id) => {
      tabs.classList.toggle('has-active', btns.some((b) => b.dataset.unitTarget === id));
      btns.forEach((b) => {
        const on = b.dataset.unitTarget === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-current', on ? 'true' : 'false');
        if (on) {
          moveBlob(b);
          if (tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: b.offsetLeft - (tabs.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
        }
      });
    };
    ScrollTrigger.create({
      trigger: '#residencias',
      start: 'top 65%',
      end: 'bottom 35%',
      refreshPriority: -1,
      onToggle: (self) => tabs.classList.toggle('is-visible', self.isActive),
    });
    // Ojo: sólo los <article>; .unit también es la clase del "m2" de los paneles
    $$('article.unit').forEach((u) => {
      ScrollTrigger.create({
        trigger: u,
        start: 'top 55%',
        end: 'bottom 55%',
        refreshPriority: -1, // se mide después del pin de la galería horizontal
        onToggle: (self) => { if (self.isActive) setActive(u.id); },
      });
    });
    btns.forEach((b) => b.addEventListener('click', () => scrollToTarget(document.getElementById(b.dataset.unitTarget), { duration: 1.8 })));
    addEventListener('resize', () => {
      const a = btns.find((b) => b.classList.contains('is-active'));
      if (a) moveBlob(a);
    });
  }

  /* ------------------------------------------------------------------------
     Cursor contextual
     ------------------------------------------------------------------------ */
  function setupCursor() {
    if (!FINE) return;
    const cur = $('.cursor');
    const bubble = $('.cursor__bubble', cur);
    gsap.set(cur, { x: -300, y: -300 });
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    let last = null;
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t === last) return;
      last = t;
      if (t) {
        bubble.textContent = t.dataset.cursor;
        cur.classList.toggle('is-light', !!t.closest('[data-surface="dark"]'));
        cur.classList.add('is-active');
      } else {
        cur.classList.remove('is-active');
      }
    });
    root.addEventListener('mouseleave', () => { last = null; cur.classList.remove('is-active'); });
  }

  /* ------------------------------------------------------------------------
     Galería de renders
     ------------------------------------------------------------------------ */
  function setupLightbox() {
    const box = $('.lightbox');
    const img = $('[data-lb-img]', box);
    const cap = $('[data-lb-caption]', box);
    const idxEl = $('[data-lb-index]', box);
    const items = $$('[data-gallery]');
    $('[data-lb-total]', box).textContent = pad(items.length);
    let i = 0;
    let isOpen = false;
    let lastFocus = null;

    const show = (n, dir = 0) => {
      i = (n + items.length) % items.length;
      const src = $('img', items[i]);
      gsap.to(img, {
        autoAlpha: 0, x: dir * -40, duration: dir ? 0.25 : 0.01, overwrite: true,
        onComplete: () => {
          img.src = src.currentSrc || src.src;
          img.alt = src.alt;
          cap.textContent = items[i].dataset.caption || '';
          idxEl.textContent = pad(i + 1);
          decode(img).then(() => gsap.fromTo(img, { autoAlpha: 0, x: dir * 40, scale: dir ? 1 : 0.96 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: 'expo.out' }));
        },
      });
    };
    const open = (n) => {
      lastFocus = document.activeElement;
      isOpen = true;
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      lock(true);
      show(n);
      $('[data-lb-close]', box).focus({ preventScroll: true });
    };
    const close = () => {
      isOpen = false;
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      lock(false);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    items.forEach((fig, n) => {
      fig.tabIndex = 0;
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'Ampliar imagen: ' + (fig.dataset.caption || ''));
      fig.addEventListener('click', () => open(n));
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(n); } });
    });
    $('[data-lb-close]', box).addEventListener('click', close);
    $('[data-lb-prev]', box).addEventListener('click', () => show(i - 1, -1));
    $('[data-lb-next]', box).addEventListener('click', () => show(i + 1, 1));
    addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(i + 1, 1);
      if (e.key === 'ArrowLeft') show(i - 1, -1);
    });
    let sx = null;
    const stage = $('.lb-stage', box);
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  }

  /* ------------------------------------------------------------------------
     Visor de plantas con zoom
     ------------------------------------------------------------------------ */
  function setupPlanViewer() {
    const box = $('.planview');
    const stage = $('[data-pv-stage]', box);
    const img = $('[data-pv-img]', box);
    const cap = $('[data-pv-caption]', box);
    const zoomEl = $('[data-pv-zoom]', box);
    const st = { s: 1, x: 0, y: 0 };
    let isOpen = false;
    let lastFocus = null;

    const apply = () => {
      img.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.s})`;
      zoomEl.textContent = Math.round(st.s * 100) + '%';
    };
    const zoomAt = (ns, px = 0, py = 0) => {
      ns = clamp(ns, 1, 5);
      st.x = px - ((px - st.x) * ns) / st.s;
      st.y = py - ((py - st.y) * ns) / st.s;
      st.s = ns;
      if (ns === 1) { st.x = 0; st.y = 0; }
      apply();
    };
    const rel = (x, y) => {
      const r = stage.getBoundingClientRect();
      return [x - r.left - r.width / 2, y - r.top - r.height / 2];
    };
    const open = (fig) => {
      const src = $('img', fig);
      lastFocus = document.activeElement;
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = fig.dataset.caption || '';
      st.s = 1; st.x = 0; st.y = 0;
      apply();
      isOpen = true;
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      lock(true);
      gsap.fromTo(img, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out', delay: 0.1 });
      $('[data-pv-close]', box).focus({ preventScroll: true });
    };
    const close = () => {
      isOpen = false;
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      lock(false);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    $$('[data-plan]').forEach((fig) => {
      fig.tabIndex = 0;
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'Ampliar planta: ' + (fig.dataset.caption || ''));
      fig.addEventListener('click', () => open(fig));
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(fig); } });
    });

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomAt(st.s * Math.exp(-e.deltaY * 0.0018), ...rel(e.clientX, e.clientY));
    }, { passive: false });

    const pts = new Map();
    let pinch = null;
    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stage.classList.add('is-dragging');
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: st.s };
      }
    });
    stage.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pts.set(e.pointerId, cur);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        zoomAt(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), ...rel((a.x + b.x) / 2, (a.y + b.y) / 2));
      } else if (pts.size === 1 && st.s > 1) {
        st.x += cur.x - prev.x;
        st.y += cur.y - prev.y;
        apply();
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) stage.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('dblclick', (e) => zoomAt(st.s > 1.5 ? 1 : 2.5, ...rel(e.clientX, e.clientY)));

    $('[data-pv-in]', box).addEventListener('click', () => zoomAt(st.s * 1.45));
    $('[data-pv-out]', box).addEventListener('click', () => zoomAt(st.s / 1.45));
    $('[data-pv-close]', box).addEventListener('click', close);
    addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === '+' || e.key === '=') zoomAt(st.s * 1.45);
      if (e.key === '-') zoomAt(st.s / 1.45);
    });
  }

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */
  const mm = gsap.matchMedia();

  function init() {
    fitAll();
    setupCover();
    setupReveals();
    setupMap();
    setupDiagram();
    setupProyecto();
    setupPanels();
    setupMarquee();
    setupStacks();
    setupPlans();
    setupRenders();
    setupHGallery(mm);
    setupLocal();
    setupFooter();
    setupChrome();
    setupUnitTabs();
    setupCursor();
    setupLightbox();
    setupPlanViewer();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }

  window.scrollTo(0, 0);
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const ready = Promise.race([
    Promise.all([fontsReady, decode($('.cover__pan img'))]),
    wait(6000),
  ]).then(() => { init(); });

  runLoader(ready).then(() => {
    document.body.classList.remove('is-loading');
    coverIntro();
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
  });
})();
