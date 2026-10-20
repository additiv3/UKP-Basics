// Ablation threshold and the D² method (Liu 1982): crater diameter vs pulse energy gives w0 and F_th.
import { h } from '../ui/dom.js';
import { num, si } from '../core/format.js';
import { canvasView, control, readouts, Plot, alpha } from './kit.js';
import { t } from '../core/i18n.js';

export const meta = { titel: 'Ablationsschwelle und D²-Methode', kurz: 'Krater vermessen, Schwelle und Strahlradius bestimmen' };
export const formel = [
  'D^2=2w_0^2\\,\\ln\\frac{F_0}{F_\\mathrm{th}}',
  'F_0=\\frac{2E_\\mathrm{p}}{\\pi w_0^2}',
];
export const aufgaben = [
  'Setze mehrere Messpunkte bei verschiedenen Pulsenergien: Die Punkte liegen auf einer Geraden im $D^2$–$\\ln E_\\mathrm{p}$-Diagramm.',
  'Wo schneidet die Gerade die Achse $D^2=0$? Das ist die Schwellenenergie.',
  'Ändere die Schwelle $F_\\mathrm{th}$ und miss erneut: Die Steigung bleibt gleich, die Gerade verschiebt sich.',
];

export function mount(root) {
  let Ep = 6; // µJ
  let w0 = 15; // µm
  let Fth = 1; // J/cm²
  let pts = []; // { Ep, D2 } with D2 in µm²

  const calc = () => {
    const F0 = (2 * Ep * 1e-6) / (Math.PI * (w0 * 1e-4) ** 2);
    const ratio = F0 / Fth;
    const D2 = ratio > 1 ? 2 * w0 * w0 * Math.log(ratio) : 0;
    return { F0, ratio, D2, D: Math.sqrt(D2) };
  };

  const out = readouts();
  const msg = h('p', { class: 'hint sim-note', 'aria-live': 'polite' });
  const ctrls = [
    control({ label: 'Pulsenergie E_p', unit: 'µJ', min: 0.2, max: 200, value: Ep, log: true, onInput: (v) => { Ep = v; update(); } }),
    control({ label: 'Strahlradius w₀ (wahr, zu bestimmen)', unit: 'µm', min: 5, max: 50, value: w0, log: true, onInput: (v) => { w0 = v; pts = []; update(); } }),
    control({ label: 'Schwellfluenz F_th (frei gewählt)', unit: 'J/cm²', min: 0.1, max: 5, value: Fth, log: true, onInput: (v) => { Fth = v; pts = []; update(); } }),
  ];

  const profBox = h('div', { class: 'sim-canvas-box' });
  const prof = canvasView(profBox, {
    aspect: 0.5,
    draw(ctx, W, H, pal) {
      const { F0, D } = calc();
      const rmax = 2.2 * w0;
      const ymax = Math.max(F0 * 1.15, Fth * 1.6);
      const p = new Plot(ctx, pal, { x: 44, y: 22, w: W - 58, h: H - 58 }, { xmin: -rmax, xmax: rmax, ymin: 0, ymax });
      p.axes({ xlabel: 'Radius r in µm', ylabel: 'Fluenz F(r) in J/cm²', xticks: [-2, -1, 0, 1, 2].map((k) => k * w0), xfmt: (v) => num(v, 2) });
      const F = (r) => F0 * Math.exp((-2 * r * r) / (w0 * w0));
      p.areaAbove(F, Fth, alpha(pal.laser, 0.4));
      p.curve(F, { color: pal.accent, width: 3 });
      p.hline(Fth, { color: pal.warm, label: 'F_th', labelSide: 'right' });
      if (D > 0) {
        const y = p.Y(Fth);
        ctx.save();
        ctx.strokeStyle = pal.text;
        ctx.fillStyle = pal.text;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.X(-D / 2), y + 12);
        ctx.lineTo(p.X(D / 2), y + 12);
        ctx.moveTo(p.X(-D / 2), y + 7);
        ctx.lineTo(p.X(-D / 2), y + 17);
        ctx.moveTo(p.X(D / 2), y + 7);
        ctx.lineTo(p.X(D / 2), y + 17);
        ctx.stroke();
        ctx.font = '700 11.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('Kraterdurchmesser D = {d} µm', { d: num(D, 3) }), p.X(0), y + 32);
        ctx.restore();
      } else {
        p.text('unter der Schwelle: kein Abtrag', p.X(0), p.Y(Fth) + 28, { color: pal.muted, align: 'center', bold: true });
      }
    },
  });
  prof.canvas.setAttribute('aria-label', t('Gaußsches Fluenzprofil mit Schwelle und Kraterdurchmesser'));

  const fitBox = h('div', { class: 'sim-canvas-box' });
  const fitView = canvasView(fitBox, {
    aspect: 0.62,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 52, y: 22, w: W - 68, h: H - 62 }, { xmin: 0.2, xmax: 200, ymin: 0, ymax: 2 * 50 * 50 * Math.log(60) * 0.55, xlog: true });
      p.ymax = Math.max(400, ...pts.map((q) => q.D2 * 1.15));
      p.axes({ xlabel: 'Pulsenergie E_p in µJ', ylabel: 'D² in µm²', yfmt: (v) => num(v, 3) });
      const fit = regress();
      if (fit) {
        p.curve((E) => fit.a * Math.log(E) + fit.b, { color: pal.accent, width: 2.5, dash: [7, 5] });
        p.dot(fit.Eth, 0, { color: pal.warm, r: 6 });
        p.text(`E_th ≈ ${num(fit.Eth, 3)} µJ`, p.X(fit.Eth) + 10, p.Y(0) - 8, { color: pal.warm, bold: true });
      }
      pts.forEach((q) => p.dot(q.Ep, q.D2, { color: pal.laser, r: 5 }));
      const cur = calc();
      if (cur.D2 > 0) p.dot(Ep, cur.D2, { color: pal.text, r: 4, ring: true });
      if (!pts.length) p.text('Setze Messpunkte, indem du Krater „schießt"', p.X(0.3), p.Y(p.ymax * 0.55), { color: pal.muted, size: 12.5 });
    },
  });
  fitView.canvas.setAttribute('aria-label', t('Quadrat des Kraterdurchmessers über der Pulsenergie, logarithmische x-Achse, mit linearer Anpassung'));

  function regress() {
    if (pts.length < 2) return null;
    const xs = pts.map((q) => Math.log(q.Ep));
    const ys = pts.map((q) => q.D2);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    if (sxx < 1e-9) return null;
    const a = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx;
    const b = my - a * mx;
    if (a <= 0) return null;
    const Eth = Math.exp(-b / a);
    const w0fit = Math.sqrt(a / 2);
    const Fthfit = (2 * Eth * 1e-6) / (Math.PI * (w0fit * 1e-4) ** 2);
    return { a, b, Eth, w0fit, Fthfit };
  }

  function shoot(E) {
    const F0 = (2 * E * 1e-6) / (Math.PI * (w0 * 1e-4) ** 2);
    if (F0 <= Fth) {
      msg.textContent = t('Unter der Schwelle: Hier entsteht kein Krater, also auch kein Messpunkt.');
      return;
    }
    const D2 = 2 * w0 * w0 * Math.log(F0 / Fth) * (1 + (Math.random() - 0.5) * 0.08); // measurement noise on D²
    pts.push({ Ep: E, D2 });
    msg.textContent = '';
  }

  const addOne = h('button', { type: 'button', class: 'btn btn-primary', onClick: () => { shoot(Ep); update(); } }, 'Krater schießen');
  const addSeries = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost',
      onClick: () => {
        const Eth = (Fth * Math.PI * (w0 * 1e-4) ** 2) / 2 / 1e-6;
        for (let k = 0; k < 7; k += 1) shoot(Eth * 1.3 * 2.2 ** k);
        update();
      },
    },
    'Messreihe automatisch',
  );
  const clear = h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { pts = []; msg.textContent = ''; update(); } }, t('Löschen'));

  function update() {
    const c = calc();
    const fit = regress();
    out.update([
      { label: 'Spitzenfluenz F₀', value: `${num(c.F0, 3)} J/cm²` },
      { label: 'F₀ / F_th', value: num(c.ratio, 3), tone: c.ratio > 1 ? 'ok' : 'warn' },
      { label: 'Kraterdurchmesser D', value: c.D2 > 0 ? si(c.D * 1e-6, 'm') : 'kein Abtrag' },
      { label: 'Messpunkte', value: String(pts.length) },
      { label: 'Aus Fit: w₀', value: fit ? t('{a} µm (wahr: {b})', { a: num(fit.w0fit, 3), b: num(w0, 3) }) : '–' },
      { label: 'Aus Fit: F_th', value: fit ? t('{a} J/cm² (wahr: {b})', { a: num(fit.Fthfit, 3), b: num(Fth, 3) }) : '–', tone: 'accent' },
    ]);
    prof.redraw();
    fitView.redraw();
  }
  update();

  root.append(profBox, ...ctrls.map((c) => c.el), h('div', { class: 'quiz-actions' }, addOne, addSeries, clear), msg, fitBox, out.el);
}
