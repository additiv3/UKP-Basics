// Data-driven plot for questions ("read the graph"). Spec lives in the content JSON (quiz field "plot"):
//   { x: {label, min, max, log}, y: {...}, kurven: [{f: "expr in x", farbe, label, label_en, gestrichelt}],
//     punkte: [{daten: [[x, y], ...], farbe, label}], linien: [{x | y, label, farbe}], cursor: true, hoehe: 0.62 }
// Curves are evaluated with the calculator parser (no eval). Labels are symbolic, label_en overrides in English.
import { h } from './dom.js';
import { num } from '../core/format.js';
import { evaluate } from '../core/calc.js';
import { getLang } from '../core/i18n.js';
import { canvasView, Plot, alpha, clamp } from '../sims/kit.js';
import { t } from '../core/i18n.js';

const COLORS = { accent: 'accent', laser: 'laser', ok: 'ok', warm: 'warm', muted: 'muted', bright: 'bright', xp: 'xp', bad: 'bad' };
const label = (o) => (getLang() === 'en' && o?.label_en) || o?.label || '';

/** Compile "2*15^2*ln(x/0.5)" into x => value. */
export function compile(expr) {
  return (x) => {
    try {
      const [m, e] = x.toExponential(12).split('e');
      return evaluate(String(expr).replace(/\bx\b/g, `(${m}E${e})`));
    } catch {
      return NaN;
    }
  };
}

export function plotFigure(spec) {
  const curves = (spec.kurven ?? []).map((k) => ({ ...k, fn: compile(k.f) }));
  const box = h('div', { class: 'sim-canvas-box plotfig', dataset: { noswipe: '1' } });
  const readout = h('p', { class: 'plot-readout', 'aria-live': 'polite' });
  let cx = spec.cursor ? (spec.cursor_start ?? (spec.x.log ? Math.sqrt(spec.x.min * spec.x.max) : (spec.x.min + spec.x.max) / 2)) : null;
  let plot = null;

  const view = canvasView(box, {
    aspect: spec.hoehe ?? 0.62,
    draw(c, W, H, pal) {
      const col = (n) => pal[COLORS[n] ?? 'accent'];
      plot = new Plot(c, pal, { x: 52, y: 22, w: W - 66, h: H - 62 }, { xmin: spec.x.min, xmax: spec.x.max, ymin: spec.y.min, ymax: spec.y.max, xlog: !!spec.x.log, ylog: !!spec.y.log });
      plot.axes({ xlabel: label(spec.x), ylabel: label(spec.y) });
      for (const l of spec.linien ?? []) {
        if (l.x != null) plot.vline(l.x, { color: col(l.farbe ?? 'muted'), label: label(l) });
        if (l.y != null) plot.hline(l.y, { color: col(l.farbe ?? 'muted'), label: label(l), labelSide: 'right' });
      }
      curves.forEach((k, i) => plot.curve(k.fn, { color: col(k.farbe ?? (i ? 'laser' : 'accent')), dash: k.gestrichelt ? [7, 5] : undefined }));
      for (const s of spec.punkte ?? []) for (const [x, y] of s.daten) plot.dot(x, y, { color: col(s.farbe ?? 'warm'), r: 4.5 });
      // legend
      const items = [...curves, ...(spec.punkte ?? [])].filter((k) => label(k));
      let lx = plot.x + 8;
      c.font = '600 11px system-ui, sans-serif';
      for (const k of items) {
        const txt = label(k);
        c.fillStyle = col(k.farbe ?? (curves.includes(k) ? (curves.indexOf(k) ? 'laser' : 'accent') : 'warm'));
        c.fillRect(lx, plot.y + 8, 12, 3);
        c.fillStyle = pal.text;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText(txt, lx + 16, plot.y + 10);
        lx += 26 + c.measureText(txt).width;
      }
      if (cx != null) {
        const px = plot.X(cx);
        c.save();
        c.strokeStyle = alpha(pal.text, 0.6);
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(px, plot.y);
        c.lineTo(px, plot.y + plot.h);
        c.stroke();
        c.fillStyle = pal.text;
        c.beginPath();
        c.arc(px, plot.y + plot.h, 6, 0, Math.PI * 2);
        c.fill();
        c.restore();
        curves.forEach((k, i) => {
          const y = k.fn(cx);
          if (Number.isFinite(y) && y >= spec.y.min && y <= spec.y.max) plot.dot(cx, y, { color: col(k.farbe ?? (i ? 'laser' : 'accent')), r: 5 });
        });
        showReadout();
      }
    },
  });
  view.canvas.setAttribute('aria-label', t('Diagramm'));

  function showReadout() {
    if (cx == null) return;
    const parts = [`${spec.x.sym ?? 'x'} = ${num(cx, 3)}`];
    curves.forEach((k) => {
      const y = k.fn(cx);
      if (Number.isFinite(y)) parts.push(`${k.sym ?? label(k) ?? 'y'} = ${num(y, 3)}`);
    });
    readout.textContent = parts.join('   |   ');
  }

  if (cx != null) {
    let dragging = false;
    const move = (e) => {
      if (!plot) return;
      const r = view.canvas.getBoundingClientRect();
      const px = clamp(e.clientX - r.left, plot.x, plot.x + plot.w);
      cx = plot.inv(px);
      view.redraw();
    };
    view.canvas.style.touchAction = 'none';
    view.canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      view.canvas.setPointerCapture(e.pointerId);
      move(e);
    });
    view.canvas.addEventListener('pointermove', (e) => dragging && move(e));
    view.canvas.addEventListener('pointerup', () => (dragging = false));
    view.canvas.addEventListener('pointercancel', () => (dragging = false));
  }

  return h('figure', { class: 'plot-figure' }, box, cx != null ? h('figcaption', {}, h('span', { class: 'hint' }, t('Ziehe im Diagramm, um Werte abzulesen.')), readout) : null);
}
