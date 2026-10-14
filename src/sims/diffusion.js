// Heat diffusion length vs pulse duration, compared with the optical absorption depth.
import { h } from '../ui/dom.js';
import { num, si } from '../core/format.js';
import { canvasView, control, readouts, Plot, alpha } from './kit.js';

export const meta = { titel: 'Wärmediffusion vs. Pulsdauer', kurz: 'Wann bleibt die Wärme im Absorptionsvolumen?' };
export const formel = 'L_\\mathrm{th}\\approx\\sqrt{D\\,\\tau},\\qquad \\tau^\\ast=\\frac{\\delta^2}{D}';
export const aufgaben = [
  'Welche Pulsdauer $\\tau^\\ast$ trennt „Wärme bleibt im Absorptionsvolumen" von „Wärme diffundiert heraus"? Lies sie ab.',
  'Mache die Absorptionstiefe 10-mal kleiner: Wie verschiebt sich $\\tau^\\ast$? (Faktor 100 kürzer.)',
  'Erhöhe $D$ um den Faktor 100: Wie viel kürzer muss der Puls werden, damit die Wärme dieselbe Strecke nicht verlässt?',
];

export function mount(root) {
  let D = 0.1; // cm²/s
  let delta = 100; // nm
  let tau = 300; // fs

  const out = readouts();
  const ctrls = [
    control({ label: 'Temperaturleitfähigkeit D (frei gewählt)', unit: 'cm²/s', min: 0.001, max: 10, value: D, log: true, onInput: (v) => { D = v; update(); } }),
    control({ label: 'Absorptions- bzw. Eindringtiefe δ (frei gewählt)', unit: 'nm', min: 5, max: 10000, value: delta, log: true, onInput: (v) => { delta = v; update(); } }),
    control({ label: 'Pulsdauer τ', unit: 'fs', min: 1, max: 1e9, value: tau, log: true, fmt: (v) => si(v * 1e-15, 's'), onInput: (v) => { tau = v; update(); } }),
  ];

  const Lth = (tFs) => Math.sqrt(D * 1e-4 * tFs * 1e-15) * 1e9; // nm (D in m²/s)
  const box = h('div', { class: 'sim-canvas-box' });
  const view = canvasView(box, {
    aspect: 0.72,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 50, y: 22, w: W - 66, h: H - 60 }, { xmin: 1, xmax: 1e9, ymin: 0.1, ymax: 1e6, xlog: true, ylog: true });
      p.axes({ xlabel: 'Pulsdauer τ in fs', ylabel: 'Länge in nm', xticks: [1, 1e3, 1e6, 1e9], yticks: [1, 1e2, 1e4, 1e6] });
      // UKP band (1 fs ... 10 ps)
      ctx.save();
      ctx.fillStyle = alpha(pal.accent, 0.1);
      ctx.fillRect(p.X(1), p.y, p.X(1e4) - p.X(1), p.h);
      ctx.restore();
      p.text('UKP', p.X(40), p.y + 14, { color: pal.accent, bold: true, size: 11.5 });
      p.text('ns', p.X(1e6), p.y + 14, { color: pal.muted, bold: true, size: 11.5, align: 'center' });
      p.curve(Lth, { color: pal.laser, width: 3 });
      p.hline(delta, { color: pal.accent, label: 'δ (Absorptionstiefe)', labelSide: 'right' });
      const tStar = (((delta * 1e-9) ** 2) / (D * 1e-4)) / 1e-15; // fs
      if (tStar >= 1 && tStar <= 1e9) p.dot(tStar, delta, { color: pal.ok, r: 6 });
      p.vline(tau, { color: pal.text, dash: [], width: 1.5 });
      p.dot(tau, Lth(tau), { color: pal.laser, r: 6.5 });
      p.text('L_th = √(D·τ)', p.X(3e3), p.Y(Lth(3e3)) + 18, { color: pal.laser, bold: true, size: 12 });
    },
  });
  view.canvas.setAttribute('aria-label', 'Wärmediffusionslänge über der Pulsdauer im Vergleich zur Absorptionstiefe, doppelt logarithmisch');

  const verdict = h('p', { class: 'sim-verdict', 'aria-live': 'polite' });
  function update() {
    const L = Lth(tau);
    const tStar = (((delta * 1e-9) ** 2) / (D * 1e-4)) / 1e-15;
    out.update([
      { label: 'Diffusionslänge L_th bei τ', value: si(L * 1e-9, 'm'), tone: 'warn' },
      { label: 'Absorptionstiefe δ', value: si(delta * 1e-9, 'm') },
      { label: 'Verhältnis L_th / δ', value: num(L / delta, 3), tone: L / delta < 1 ? 'ok' : 'warn' },
      { label: 'Grenzpulsdauer τ*', value: si(tStar * 1e-15, 's'), tone: 'accent' },
    ]);
    verdict.textContent =
      L / delta < 0.5
        ? 'Wärme bleibt im Absorptionsvolumen: Die Energie ist weg, bevor sie abfließen kann (keine nennenswerte Wärmeeinflusszone).'
        : L / delta < 2
          ? 'Grenzbereich: Wärmeleitung und Absorption sind vergleichbar.'
          : 'Wärme diffundiert deutlich über das Absorptionsvolumen hinaus: schmelzdominierter, thermischer Abtrag wird wahrscheinlich.';
    view.redraw();
  }
  update();

  root.append(box, ...ctrls.map((c) => c.el), out.el, verdict, h('p', { class: 'hint sim-note' }, 'Vereinfachung: Die Diffusionslänge hängt von der Definition ab (√(Dτ), √(4Dτ) …), und für Dielektrika ist die Energiekopplung ins Gitter ein eigener Schritt. Gewählte Werte sind keine Materialangaben.'));
}
