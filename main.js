(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header state + active section ---------- */
  const nav = document.getElementById('top-nav');
  const hero = document.querySelector('.hero');
  const links = [...document.querySelectorAll('[data-nav]')];

  new IntersectionObserver(([e]) => {
    nav.classList.toggle('is-scrolled', !e.isIntersecting);
  }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > .section').forEach((s) => sectionObs.observe(s));
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.remove('is-active'));
  }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.section__head, .section__lede, .soon, .poster');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (el.classList.contains('poster') ? (i % 2) * 120 : 0) + 'ms';
      ro.observe(el);
    });
  }

  /* ---------- Parallax hero ---------- */
  const layers = [...document.querySelectorAll('.hero__layers [data-depth]')];
  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);

  if (!reduceMotion && layers.length) {
    // Pointer offset (-0.5..0.5) is eased, then scaled per layer by its depth:
    // the stage barely moves, the blurred front crowd moves the most.
    const SHIFT_X = 46, SHIFT_Y = 22;
    let px = 0, py = 0, tx = 0, ty = 0, sy = window.scrollY, ticking = false, ambient = false;

    const render = (t) => {
      ticking = false;
      if (!heroVisible) return;
      if (ambient) { // touch screens: a slow sway stands in for the mouse
        tx = Math.sin(t / 3200) * 0.4;
        ty = Math.cos(t / 4100) * 0.3;
      }
      px += (tx - px) * 0.07;
      py += (ty - py) * 0.07;
      for (const l of layers) {
        const d = +l.dataset.depth;
        const x = px * d * SHIFT_X;
        const y = sy * (1 - d) * 0.45 + py * d * SHIFT_Y;
        l.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      if (ambient || Math.abs(tx - px) > 0.001 || Math.abs(ty - py) > 0.001) request();
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };

    addEventListener('scroll', () => { sy = window.scrollY; request(); }, { passive: true });
    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        request();
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; request(); });
    } else {
      ambient = true;
    }
    new IntersectionObserver(([e]) => { if (e.isIntersecting) request(); }).observe(hero);
    request();
  }

  /* ---------- Particles: small drifting gold dots ---------- */
  // One canvas inside the hero (between stage and crowd), one fixed behind the
  // rest of the page. Each only animates while its area is on screen.
  const particles = (canvas, { density, max, min }) => {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, dots = [], running = false, raf = 0;

    const make = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: Math.random() * 1.4 + 0.4,
      vy: -(Math.random() * 0.25 + 0.06),
      vx: (Math.random() - 0.5) * 0.12,
      a: Math.random() * Math.PI * 2,
      tw: Math.random() * 0.02 + 0.006,
      hue: Math.random() < 0.8 ? '255,214,140' : '255,245,225'
    });

    const draw = (move) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of dots) {
        if (move) {
          p.x += p.vx; p.y += p.vy; p.a += p.tw;
          if (p.y < -10 || p.x < -10 || p.x > w + 10) Object.assign(p, make(false));
        }
        const alpha = 0.35 + Math.sin(p.a) * 0.3 + 0.3;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.hue},${alpha.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.r > 1.4) { // a soft halo on the larger dots only
          ctx.beginPath();
          ctx.fillStyle = `rgba(${p.hue},${(alpha * 0.15).toFixed(3)})`;
          ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const widthChanged = Math.abs(r.width - w) > 1;
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Keep existing dots when only the height changes (mobile address bar).
      if (widthChanged || !dots.length) {
        const count = Math.round(Math.min(max, Math.max(min, (w * h) / density)));
        dots = Array.from({ length: count }, () => make(true));
      }
      draw(false);
    };

    const loop = () => { draw(true); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduceMotion && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    return { start, stop };
  };

  if (document.createElement('canvas').getContext) {
    const heroCanvas = document.getElementById('particles');
    const pageCanvas = document.getElementById('page-particles');
    const heroFx = heroCanvas && particles(heroCanvas, { density: 14000, max: 90, min: 28 });
    const pageFx = pageCanvas && particles(pageCanvas, { density: 16000, max: 80, min: 26 });

    let heroOn = false;
    const pageVisible = new Set();
    const sync = () => {
      heroOn ? heroFx?.start() : heroFx?.stop();
      pageVisible.size ? pageFx?.start() : pageFx?.stop();
    };
    new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; sync(); }).observe(hero);
    const pageObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? pageVisible.add(e.target) : pageVisible.delete(e.target)));
      sync();
    });
    document.querySelectorAll('main > .section, .footer').forEach((el) => pageObs.observe(el));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { heroFx?.stop(); pageFx?.stop(); } else sync();
    });
  }

  /* ---------- Card hover: pointer spotlight + poster tilt ---------- */
  if (finePointer) {
    document.querySelectorAll('.glow-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });

    document.querySelectorAll('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        if (!reduceMotion) {
          el.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
          el.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
        }
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Poster lightbox ---------- */
  const box = document.getElementById('lightbox');
  const boxImg = document.getElementById('lightbox-img');
  if (box && typeof box.showModal === 'function') {
    document.querySelectorAll('.poster__frame').forEach((btn) => {
      btn.addEventListener('click', () => {
        boxImg.src = btn.dataset.full;
        boxImg.alt = btn.querySelector('img').alt;
        box.setAttribute('aria-label', btn.dataset.title);
        box.showModal();
      });
    });
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  }
})();
