/* ═══════════════════════════════════════════════════════════
   OPINIONES DE CLIENTES
   Fuente única para la sección "Opiniones" de la home y para
   la cita de cada página de proyecto.

   Textos reales, aprobados en la reunión interna del
   28/10/2026 ("2026-10-28 - notas.docx").

   Campos:
   · cliente / autor → nombre y empresa o profesión.
   · id / proyecto   → solo si el trabajo está en la web: la
     imagen enlaza a proyecto.html?id=... y la cita aparece
     también en esa página. Sin id, la etiqueta muestra el
     servicio y enlaza a servicios.html.
   · publicar: false → queda cargada pero no se muestra.

   Las opiniones que llegan desde el formulario "Dejanos tu
   opinión" quedan en Netlify → Forms → opinion.
   ═══════════════════════════════════════════════════════════ */
window.LYM_OPINIONES = [
  {
    id: 'trelles',
    proyecto: 'Trelles 928',
    cliente: 'Mariano Lopez',
    autor: 'FENAM',
    imagen: 'imagenes/proyecto/trelles/gallery-02.jpg',
    servicios: ['Branding', 'Visualizaciones', 'Brochure'],
    texto: 'Era nuestro primer desarrollo y todavía no teníamos lenguaje de marca. LYM diseñó la línea gráfica del proyecto a partir de nuestro logo, nos hizo los renders y el brochure comercial para salir a vender. Quedó impecable, 10 puntos. Los recomiendo.'
  },
  {
    id: 'olofpalme',
    proyecto: 'Olof Palme',
    cliente: 'Sebastián Erlichman',
    autor: 'hili.ch',
    imagen: 'imagenes/proyecto/hilich/gallery-04.jpg',
    servicios: ['Branding', 'Brochure', 'Interiorismo'],
    texto: 'Les pasé unas ideas de lo que buscaba y resolvieron la identidad de la marca muy bien. Después la llevaron a toda la presentación del proyecto y diseñaron el interiorismo con ese mismo criterio.'
  },
  {
    id: 'atlikum',
    proyecto: 'Atlikum',
    cliente: 'Jorge Metaxas',
    autor: 'Nieto Metaxas',
    imagen: 'imagenes/proyecto/atlikum2/gallery-03.jpg',
    servicios: ['Visualizaciones', 'Brochure', 'Documentación'],
    texto: 'Hicimos con LYM los renders y brochures de varios de nuestros proyectos. Armaron una línea gráfica que después repetimos en otros desarrollos, y sus renders y planos son los que usan las inmobiliarias para publicar.'
  },
  {
    id: 'canaveral',
    proyecto: 'Cañaveral I',
    cliente: 'Ale Toro',
    autor: 'Eco Vision',
    imagen: 'imagenes/proyecto/canaveral/gallery-01.jpg',
    servicios: ['Brochure', 'Visualizaciones', 'Interiorismo'],
    texto: 'Queríamos que el brochure mostrara lo que nos diferencia: sistema SATE, aberturas de PVC y domótica. LYM lo puso en primer plano, nos propuso ideas para los interiores que no se nos habían ocurrido y tuvo paciencia con todos nuestros cambios.'
  },
  {
    cliente: 'Sofia Cicala',
    autor: 'Propuesta para licitación',
    imagen: 'imagenes/servicios/arquitectura.jpg',
    servicios: ['Arquitectura', 'Visualizaciones', 'Presentación'],
    texto: 'Teníamos que presentar una propuesta para una licitación y el plazo ya estaba vencido. En una semana diseñaron un sector importante del local y nos entregaron las plantas, las imágenes y la presentación armada. Ganamos la licitación.'
  },
  {
    cliente: 'Arq. Diana Lanail',
    autor: 'Arquitecta',
    imagen: 'imagenes/servicios/hero.jpg',
    posicion: '42% center',
    servicios: ['Visualizaciones'],
    texto: 'Les paso mi diseño y lo convierten en imágenes que puedo mostrarles a mis clientes. Toman cada ajuste que les pido y el resultado siempre me gustó; en el último proyecto, a mi cliente le encantó. Ya trabajé con ellos en tres proyectos.'
  },
  {
    cliente: 'Arq. Ana Escuder',
    autor: 'Arquitecta',
    imagen: 'imagenes/general/arquitectura.jpg',
    servicios: ['Documentación', 'Visualizaciones'],
    texto: 'Trabajamos juntos en la remodelación completa de una casa: relevamiento, detalles de baños y cocina, planos eléctricos para obra y los renders para que los clientes eligieran. Cuando avanzó la obra, quedó casi idéntico al render. Ya los recomendé.'
  },
  {
    cliente: 'Arq. Pablo Sosa',
    autor: 'Arquitecto',
    imagen: 'imagenes/servicios/arquitectura.jpg',
    posicion: '18% center',
    servicios: ['Arquitectura', 'Visualizaciones'],
    texto: 'Trabajamos con LYM desde 2022 en distintas escalas. Antes de arrancar te preguntan todo lo que no está en los planos y te proponen soluciones para lo que falta definir.'
  },
  {
    // Pendiente: en las notas del 28/10 no tiene la marca de aprobada (✅)
    publicar: false,
    cliente: 'Arq. Ana Ginart',
    autor: 'Arquitecta',
    imagen: 'imagenes/servicios/arquitectura.jpg',
    servicios: ['Arquitectura', 'Visualizaciones'],
    texto: 'Hace años que trabajo con LYM. Me arman el modelado para terminar de definir el diseño, revisan los planos y me marcan lo que no cierra, y los renders salen fieles al proyecto, con medidas y materiales reales. Mis clientes, si no ven imágenes, no entienden nada.'
  }
].filter(r => r.publicar !== false);

/* Marcas de la cinta "Confiaron en nosotros" */
window.LYM_CLIENTES = ['FENAM', 'hili.ch', 'Nieto Metaxas', 'Eco Vision', 'El Cazal', 'Honda'];

(function () {
  'use strict';

  const DATA = window.LYM_OPINIONES || [];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Cada palabra en su propia máscara, para la animación en cascada
  const words = text => esc(text).split(/\s+/).map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');

  /* ── SLIDER (home) ─────────────────────────── */
  function renderSlider(root) {
    if (!DATA.length) { root.hidden = true; return; }
    const total = DATA.length;


    const media = root.querySelector('.reviews-media');
    media.insertAdjacentHTML('afterbegin', DATA.map(r =>
      `<div class="reviews-img" style="background-image:url('${r.imagen}')${r.posicion ? `;background-position:${r.posicion}` : ''}" role="img" aria-label="${r.id ? `Proyecto ${esc(r.proyecto)}` : esc(r.servicios[0])}"></div>`
    ).join(''));
    root.querySelector('.reviews-quotes').innerHTML = DATA.map(r =>
      `<blockquote class="reviews-quote">${words(r.texto)}</blockquote>`
    ).join('');
    root.querySelector('.reviews-author').innerHTML = DATA.map(r => `
      <div class="reviews-author-item">
        <p class="reviews-author-name">${esc(r.cliente)}</p>
        <p class="reviews-author-role">${esc(r.autor)}${r.id ? ` · Proyecto ${esc(r.proyecto)}` : ''}</p>
        <div class="reviews-services">${r.servicios.map(s => `<span class="reviews-pill">${esc(s)}</span>`).join('')}</div>
      </div>`).join('');

    // Marquee de clientes (dos grupos idénticos para el loop infinito)
    const marquee = root.querySelector('.marquee');
    if (marquee) {
      const names = window.LYM_CLIENTES || [];
      const group = `<div class="marquee-group">${names.map(n => `<span class="marquee-item">${esc(n)}</span>`).join('')}</div>`;
      marquee.innerHTML = group + group.replace('class="marquee-group"', 'class="marquee-group" aria-hidden="true"');
    }

    const imgs = media.querySelectorAll('.reviews-img');
    const quotes = root.querySelectorAll('.reviews-quote');
    const authors = root.querySelectorAll('.reviews-author-item');
    const tagKind = root.querySelector('[data-reviews-kind]');
    const tag = root.querySelector('[data-reviews-project]');
    const bar = root.querySelector('.reviews-progress span');
    const DURATION = 8000;
    let index = -1;
    let timer = null;
    let startedAt = 0;
    let remaining = DURATION;
    let paused = false;
    let inView = false;

    function go(next) {
      next = (next + total) % total;
      if (next === index) return;
      const prev = index;
      index = next;
      imgs.forEach((el, i) => {
        el.classList.toggle('is-active', i === next);
        el.classList.toggle('is-leaving', i === prev);
      });
      quotes.forEach((el, i) => {
        el.classList.toggle('is-leaving', i === prev);
        el.classList.toggle('is-active', i === next);
        el.setAttribute('aria-hidden', String(i !== next));
      });
      if (prev >= 0) setTimeout(() => quotes[prev] && quotes[prev].classList.remove('is-leaving'), 700);
      authors.forEach((el, i) => el.classList.toggle('is-active', i === next));
      const r = DATA[next];
      media.href = r.id ? `proyecto.html?id=${r.id}` : 'servicios.html';
      media.dataset.cursor = r.id ? 'Ver proyecto' : 'Ver servicios';
      tagKind.textContent = r.id ? 'Proyecto' : 'Servicio';
      tag.textContent = r.id ? r.proyecto : r.servicios[0];
      restart();
    }

    function restart() {
      remaining = DURATION;
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      bar.style.transition = 'none';
      const progress = 1 - remaining / DURATION;
      bar.style.transform = `scaleX(${progress})`;
      if (paused || !inView) return;
      void bar.offsetWidth;
      bar.style.transition = `transform ${remaining}ms linear`;
      bar.style.transform = 'scaleX(1)';
      startedAt = performance.now();
      timer = setTimeout(() => go(index + 1), remaining);
    }

    function pause() {
      if (paused) return;
      paused = true;
      if (inView) remaining = Math.max(remaining - (performance.now() - startedAt), 0);
      schedule();
    }

    function resume() {
      if (!paused) return;
      paused = false;
      schedule();
    }

    root.querySelector('[data-reviews-prev]').addEventListener('click', () => go(index - 1));
    root.querySelector('[data-reviews-next]').addEventListener('click', () => go(index + 1));

    // Solo se frena al navegar con teclado: el mouse encima no detiene el autoplay
    const stage = root.querySelector('.reviews-stage');
    stage.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) pause(); });
    stage.addEventListener('focusout', resume);

    // Swipe en pantallas táctiles
    let x0 = null;
    stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    // Autoplay solo mientras la sección está en pantalla
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const was = inView;
        inView = entry.isIntersecting;
        if (was && !inView) remaining = Math.max(remaining - (performance.now() - startedAt), 0);
        schedule();
      });
    }, { threshold: 0.35 }).observe(stage);

    go(0);
  }

  /* ── OPINIÓN INDIVIDUAL (proyecto) ─────────── */
  function renderSingle(root) {
    const review = DATA.find(r => r.id && r.id === root.dataset.reviewSingle);
    if (!review) { root.hidden = true; return; }
    root.hidden = false;
    root.querySelector('.review-single-quote').textContent = review.texto;
    root.querySelector('.review-single-name').textContent = review.cliente;
    root.querySelector('.review-single-role').textContent = review.autor;
  }

  /* ── FORMULARIO "DEJANOS TU OPINIÓN" ───────── */
  function initDialog() {
    const dialog = document.getElementById('review-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const form = dialog.querySelector('form');
    const success = document.getElementById(form.dataset.success);
    const open = () => {
      form.hidden = false;
      if (success) success.hidden = true;
      dialog.showModal();
      window.LYM && window.LYM.lockScroll && window.LYM.lockScroll(true);
    };
    document.querySelectorAll('[data-open-review]').forEach(btn => btn.addEventListener('click', open));
    dialog.querySelectorAll('[data-close-review]').forEach(btn => btn.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => window.LYM && window.LYM.lockScroll && window.LYM.lockScroll(false));
  }

  /* ── CONTADOR ("+40 clientes satisfechos") ── */
  function initCounter(el) {
    const to = parseInt(el.dataset.countTo, 10);
    if (!to || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), DUR = 1800;
      const tick = now => {
        const p = Math.min((now - t0) / DUR, 1);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
  }

  function init() {
    document.querySelectorAll('[data-count-to]').forEach(initCounter);
    document.querySelectorAll('[data-reviews]').forEach(renderSlider);
    document.querySelectorAll('[data-review-single]').forEach(renderSingle);
    initDialog();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
