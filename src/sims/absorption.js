// Linear vs nonlinear absorption: depth profile (Lambert-Beer vs two-photon) and the radial confinement I^n.
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, readouts, Plot, alpha } from './kit.js';

export const meta = { titel: 'Linear vs. nichtlinear absorbieren', kurz: 'Warum nichtlineare Absorption den Fokus „schärft"' };
export const formel = [
  'I(z)=I_0\\,e^{-z/\\delta}\\ \\text{(linear)}',
  'I(z)=\\frac{I_0}{1+\\beta I_0 z}\\ \\text{(2-Photonen)},\\qquad w_\\mathrm{eff}=\\frac{w_0}{\\sqrt{n}}',
];
export const aufgaben = [
  'Erhöhe die nichtlineare Stärke $a=\\beta I_0\\delta$: Wo wird die Energie bei hoher Intensität absorbiert, an der Oberfläche oder tiefer?',
  'Stelle $n=3$ ein: Um welchen Faktor ist der absorbierende Bereich schmaler als der Strahl?',
  'Warum hilft das, Strukturen kleiner als der Fokusdurchmesser zu erzeugen?',
];

export function mount(root) {
  let a = 5; // beta*I0*delta
  let n = 3;

  const out = readouts();
  const ctrls = [
    control({ label: 'Nichtlineare Stärke a = β·I₀·δ (Zwei-Photonen)', unit: '', min: 0.1, max: 100, value: a, log: true, fmt: (v) => num(v, 3), onInput: (v) => { a = v; update(); } }),
    control({ label: 'Ordnung n der Mehrphotonenabsorption', unit: '', min: 1, max: 8, value: n, step: 1, fmt: (v) => String(Math.round(v)), onInput: (v) => { n = Math.round(v); update(); } }),
  ];

  const depthBox = h('div', { class: 'sim-canvas-box' });
  const depth = canvasView(depthBox, {
    aspect: 0.5,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 46, y: 20, w: W - 62, h: H - 56 }, { xmin: 0, xmax: 5, ymin: 0, ymax: 1.05 });
      p.axes({ xlabel: 'Tiefe z / δ', ylabel: 'Intensität I(z)/I₀', yticks: [0, 0.5, 1], yfmt: (v) => num(v, 2), xfmt: (v) => num(v, 2) });
      p.curve((z) => Math.exp(-z), { color: pal.accent, width: 3 });
      p.curve((z) => 1 / (1 + a * z), { color: pal.laser, width: 3 });
      p.text('linear (Lambert-Beer)', p.X(1.6), p.Y(Math.exp(-1.6)) - 10, { color: pal.accent, bold: true, size: 12 });
      p.text('nichtlinear (2 Photonen)', p.X(1.2), p.Y(1 / (1 + a * 1.2)) - 12, { color: pal.laser, bold: true, size: 12 });
    },
  });
  depth.canvas.setAttribute('aria-label', 'Intensität über der Eindringtiefe: exponentieller Abfall bei linearer, hyperbolischer bei Zwei-Photonen-Absorption');

  const radBox = h('div', { class: 'sim-canvas-box' });
  const rad = canvasView(radBox, {
    aspect: 0.5,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 46, y: 20, w: W - 62, h: H - 56 }, { xmin: -2, xmax: 2, ymin: 0, ymax: 1.05 });
      p.axes({ xlabel: 'Radius r / w₀', ylabel: 'relative Intensität bzw. Absorptionsrate', yticks: [0, 0.5, 1], yfmt: (v) => num(v, 2), xfmt: (v) => num(v, 2) });
      const I = (r) => Math.exp(-2 * r * r);
      p.curve(I, { color: pal.accent, width: 3 });
      p.curve((r) => I(r) ** n, { color: pal.laser, fill: alpha(pal.laser, 0.18) });
      p.curve((r) => I(r) ** n, { color: pal.laser, width: 3 });
      const weff = 1 / Math.sqrt(n);
      p.vline(-weff, { color: pal.ok, dash: [4, 4] });
      p.vline(weff, { color: pal.ok, dash: [4, 4], label: 'w_eff', });
    },
  });
  rad.canvas.setAttribute('aria-label', 'Radiale Intensität des Strahls und Absorptionsrate proportional I hoch n');

  function update() {
    out.update([
      { label: 'Effektiver Radius w_eff = w₀/√n', value: `${num(1 / Math.sqrt(n), 3)} · w₀`, tone: 'accent' },
      { label: 'Rate-Verhältnis Zentrum : Rand bei w₀/2', value: `${num(Math.exp(0.5 * n), 3)} : 1` },
      { label: 'Intensität bei z = δ (nichtlinear)', value: `${num(100 / (1 + a), 3)} %` },
      { label: 'Intensität bei z = δ (linear)', value: `${num(100 * Math.exp(-1), 3)} %` },
    ]);
    depth.redraw();
    rad.redraw();
  }
  update();

  root.append(depthBox, ctrls[0].el, radBox, ctrls[1].el, out.el, h('p', { class: 'hint sim-note' }, 'Vereinfachte Modelle ohne Erschöpfung, Plasmaabschirmung oder Fokusverschiebung. Der Fokuspfeil w_eff = w₀/√n gilt für eine reine I^n-Rate und einen Gauß-Strahl.'));
}
