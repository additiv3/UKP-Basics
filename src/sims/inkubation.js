// Incubation: the ablation threshold drops with the number of pulses, F_th(N) = F_th(1) * N^(S-1).
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, readouts, Plot } from './kit.js';

export const meta = { titel: 'Inkubation: Schwelle sinkt mit Pulszahl', kurz: 'Wie viele Pulse braucht es unterhalb der Einzelpuls-Schwelle?' };
export const formel = [
  'F_\\mathrm{th}(N)=F_\\mathrm{th}(1)\\,N^{\\,S-1}',
  'N^\\ast=\\left(\\frac{F_\\mathrm{th}(1)}{F_0}\\right)^{\\frac{1}{S-1}}\\quad(F_0<F_\\mathrm{th}(1),\\ S<1)',
];
export const aufgaben = [
  'Stelle $S=1$ ein: Die Schwelle bleibt konstant, es gibt keine Inkubation.',
  'Setze $F_0=0{,}5\\,F_\\mathrm{th}(1)$ und senke $S$: Wie viele Pulse braucht es, bis Abtrag einsetzt?',
  'Warum ist das für Flächenbearbeitung mit hohem Überlapp wichtig? (Jede Stelle bekommt viele Pulse.)',
];

export function mount(root) {
  let S = 0.85;
  let ratio = 0.6; // F0 / Fth(1)

  const out = readouts();
  const ctrls = [
    control({ label: 'Inkubationskoeffizient S (frei gewählt)', unit: '', min: 0.5, max: 1, value: S, step: 0.01, fmt: (v) => num(v, 3), onInput: (v) => { S = v; update(); } }),
    control({ label: 'Fluenz F₀ relativ zur Einzelpuls-Schwelle', unit: '', min: 0.2, max: 1.5, value: ratio, step: 0.01, fmt: (v) => `${num(v, 3)} · F_th(1)`, onInput: (v) => { ratio = v; update(); } }),
  ];

  const th = (N) => N ** (S - 1);
  const nStar = () => (ratio >= 1 ? 1 : S >= 1 ? Infinity : (1 / ratio) ** (1 / (1 - S)));

  const box = h('div', { class: 'sim-canvas-box' });
  const view = canvasView(box, {
    aspect: 0.62,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 50, y: 22, w: W - 66, h: H - 60 }, { xmin: 1, xmax: 1e5, ymin: 0.05, ymax: 1.5, xlog: true, ylog: true });
      p.axes({ xlabel: 'Pulszahl N', ylabel: 'F_th(N) / F_th(1)', yticks: [0.1, 1], yfmt: (v) => num(v, 2) });
      p.curve(th, { color: pal.accent, width: 3 });
      p.hline(ratio, { color: pal.laser, label: 'F₀', labelSide: 'right' });
      const ns = nStar();
      if (Number.isFinite(ns) && ns <= 1e5) {
        p.vline(ns, { color: pal.ok, label: 'N*', dash: [4, 4] });
        p.dot(ns, ratio, { color: pal.ok, r: 6 });
      }
      p.text('Abtrag', p.X(2e4), p.Y(ratio) + 16, { color: pal.muted, size: 11.5, bold: true, align: 'center' });
      p.text('kein Abtrag', p.X(3), p.Y(ratio) - 8, { color: pal.muted, size: 11.5, bold: true });
    },
  });
  view.canvas.setAttribute('aria-label', 'Normierte Schwelle über der Pulszahl, doppelt logarithmisch, mit Fluenzlinie und Schnittpunkt N*');

  function update() {
    const ns = nStar();
    out.update([
      { label: 'Schwelle nach 10 Pulsen', value: `${num(th(10) * 100, 3)} %` },
      { label: 'Schwelle nach 100 Pulsen', value: `${num(th(100) * 100, 3)} %` },
      { label: 'Schwelle nach 1000 Pulsen', value: `${num(th(1000) * 100, 3)} %` },
      { label: 'Pulse bis Abtrag beginnt (N*)', value: ratio >= 1 ? 'sofort (1)' : Number.isFinite(ns) ? num(Math.ceil(ns), 3) : 'nie (S = 1)', tone: 'accent' },
    ]);
    view.redraw();
  }
  update();

  root.append(box, ...ctrls.map((c) => c.el), out.el, h('p', { class: 'hint sim-note' }, 'Das Potenzgesetz ist ein empirisches Modell. S ist hier frei gewählt, keine Materialangabe.'));
}
