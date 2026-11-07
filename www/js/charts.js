/* رسوم بيانية بسيطة (SVG) — الأقدم يميناً والأحدث يساراً بما يناسب العربية. */
(function (App) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const Ch = (App.charts = {});

  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toLocaleString('ar-EG', { maximumFractionDigits: 1 }) + ' مليون';
    if (n >= 1e4) return Math.round(n / 1e3).toLocaleString('ar-EG') + ' ألف';
    if (n >= 1e3) return (n / 1e3).toLocaleString('ar-EG', { maximumFractionDigits: 1 }) + ' ألف';
    return n.toLocaleString('ar-EG');
  }
  Ch.compact = compact;

  /* data: [{ label, count, met, today }]  opts: { goal, values, labelEvery } */
  Ch.bars = function (container, data, opts) {
    opts = opts || {};
    const W = 340, H = 170, top = 18, bottom = 22, side = 4;
    const n = data.length;
    const max = Math.max(1, opts.goal || 0, ...data.map((d) => d.count));
    const slot = (W - side * 2) / n;
    const bw = Math.max(3, Math.min(30, slot * 0.62));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', direction: 'ltr' });
    const y = (v) => top + (H - top - bottom) * (1 - v / max);

    data.forEach((d, i) => {
      const cx = W - side - slot * (i + 0.5); // الأقدم يميناً
      svg.appendChild(el('rect', { class: 'bar-bg', x: cx - bw / 2, y: top, width: bw, height: H - top - bottom, rx: Math.min(6, bw / 2) }));
      if (d.count > 0) {
        const h = Math.max(3, (H - top - bottom) * (d.count / max));
        svg.appendChild(el('rect', {
          class: 'bar' + (d.met ? ' met' : ''), x: cx - bw / 2, y: H - bottom - h, width: bw, height: h, rx: Math.min(6, bw / 2)
        }));
        if (opts.values) svg.appendChild(el('text', { class: 'val', x: cx, y: H - bottom - h - 4, 'text-anchor': 'middle' }, compact(d.count)));
      }
      const every = opts.labelEvery || 1;
      if (d.label && (i % every === 0 || i === n - 1)) {
        svg.appendChild(el('text', { x: cx, y: H - 6, 'text-anchor': 'middle', 'font-weight': d.today ? '700' : '400' }, d.label));
      }
    });

    if (opts.goal > 0) {
      const gy = y(opts.goal);
      svg.appendChild(el('line', { class: 'goal-line', x1: side, x2: W - side, y1: gy, y2: gy }));
      svg.appendChild(el('text', { x: side + 2, y: gy - 4, 'text-anchor': 'start' }, '🎯 ' + compact(opts.goal)));
    }
    container.replaceChildren(svg);
  };

  /* خريطة حرارية لآخر ٥٣ أسبوعاً */
  Ch.heatmap = function (container, s, todayKey, dhikr) {
    const D = App.date;
    const today = D.parseKey(todayKey);
    const end = D.addDays(todayKey, 6 - ((today.getDay() + 1) % 7)); // نهاية الأسبوع (الجمعة)
    const start = D.addDays(end, -7 * 53 + 1);
    const grid = document.createElement('div');
    grid.className = 'heatmap';
    let max = 1;
    const cells = [];
    for (let k = start; k <= end; k = D.addDays(k, 1)) {
      const c = App.dayCount(s, k, dhikr);
      if (c > max) max = c;
      cells.push({ k, c, future: k > todayKey });
    }
    const goal = dhikr === 'istighfar' ? s.goal : 0;
    for (const cell of cells) {
      const i = document.createElement('i');
      if (cell.future) i.className = 'empty';
      else if (cell.c > 0) {
        const r = goal > 0 ? cell.c / goal : cell.c / max;
        i.className = r >= 1 ? 'h4' : r >= 0.6 ? 'h3' : r >= 0.25 ? 'h2' : 'h1';
      }
      i.title = cell.k + ': ' + cell.c;
      grid.appendChild(i);
    }
    container.replaceChildren(grid);
    // أظهر الأحدث (في الاتجاه العربي يكون يساراً)
    requestAnimationFrame(() => { container.scrollLeft = -container.scrollWidth; });
  };
})(window.App = window.App || {});
