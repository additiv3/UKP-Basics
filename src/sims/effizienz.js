// Logarithmic ablation law and the energy-efficient fluence of a Gaussian beam (maximum at F0 = e² F_th).
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, readouts, Plot, alpha } from './kit.js';
import { t } from '../core/i18n.js';

export const meta = { titel: 'Abtragtiefe und Effizienz', kurz: 'Warum mehr Fluenz nicht mehr Effizienz bedeutet' };
export const formel = [
  '\\delta_0=\\ell\\,\\ln\\frac{F_0}{F_\\mathrm{th}}',
  '\\frac{V}{E_\\mathrm{p}}\\propto\\frac{\\ln^2(F_0/F_\\mathrm{th})}{F_0/F_\\mathrm{th}}\\;\\Rightarrow\\;F_\\mathrm{opt}=e^2F_\\mathrm{th}',
];
export const aufgaben = [
  'Schiebe $F_0/F_\\mathrm{th}$ von 1 nach 100: Die Tiefe wächst nur logarithmisch, die Effizienz fällt jenseits von $e^2\\approx7{,}4$ wieder ab.',
  'Springe zum Optimum und lies ab: Wie viel mehr Energie brauchst du für doppelte Tiefe im Zentrum?',
];

const E2 = Math.E ** 2;
const eta = (x) => (x > 1 ? (Math.log(x) ** 2) / x : 0);
const ETA_MAX = eta(E2);

export function mount(root) {
  let x = 3;
  const out = readouts();
  const ctl = control({ label: 'Spitzenfluenz F₀ / Schwelle F_th', unit: '', min: 1.05, max: 100, value: x, log: true, fmt: (v) => `${num(v, 3)} ×`, onInput: (v) => { x = v; update(); } });

  const boxA = h('div', { class: 'sim-canvas-box' });
  const a = canvasView(boxA, {
    aspect: 0.5,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 46, y: 22, w: W - 62, h: H - 58 }, { xmin: 1, xmax: 100, ymin: 0, ymax: Math.log(100) * 1.05, xlog: true });
      p.axes({ xlabel: 'F₀ / F_th', ylabel: 'Tiefe im Zentrum δ₀ in Einheiten von ℓ', yfmt: (v) => num(v, 2), xfmt: (v) => num(v, 3) });
      p.curve((v) => Math.log(v), { color: pal.accent, width: 3 });
      p.dot(x, Math.log(x), { color: pal.laser, r: 6.5 });
    },
  });
  a.canvas.setAttribute('aria-label', t('Abtragtiefe im Zentrum über dem Fluenzverhältnis, logarithmisch'));

  const boxB = h('div', { class: 'sim-canvas-box' });
  const b = canvasView(boxB, {
    aspect: 0.5,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 46, y: 22, w: W - 62, h: H - 58 }, { xmin: 1, xmax: 100, ymin: 0, ymax: 1.1, xlog: true });
      p.axes({ xlabel: 'F₀ / F_th', ylabel: 'Abtragvolumen pro Energie (normiert)', yfmt: (v) => num(v, 2), xfmt: (v) => num(v, 3) });
      p.curve((v) => eta(v) / ETA_MAX, { color: pal.warm, width: 3 });
      p.areaAbove((v) => eta(v) / ETA_MAX, 0, alpha(pal.warm, 0.12));
      p.vline(E2, { color: pal.ok, label: 'Optimum e² ≈ 7,4', dash: [5, 4] });
      p.dot(x, eta(x) / ETA_MAX, { color: pal.laser, r: 6.5 });
    },
  });
  b.canvas.setAttribute('aria-label', t('Normierte Energieeffizienz über dem Fluenzverhältnis mit Maximum bei e Quadrat'));

  const jump = h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { x = E2; ctl.set(x); update(); } }, 'Zum Optimum springen');

  function update() {
    const rel = eta(x) / ETA_MAX;
    out.update([
      { label: 'Tiefe im Zentrum δ₀/ℓ = ln(F₀/F_th)', value: num(Math.log(x), 3) },
      { label: 'Relative Effizienz', value: `${num(rel * 100, 3)} %`, tone: rel > 0.9 ? 'ok' : '' },
      { label: 'Energie relativ zu F_th', value: `${num(x, 3)} ×` },
      { label: 'Abstand zum Optimum', value: `${num(x / E2, 3)} × F_opt`, tone: 'accent' },
    ]);
    a.redraw();
    b.redraw();
  }
  update();

  root.append(boxA, boxB, ctl.el, h('div', { class: 'quiz-actions' }, jump), out.el);
}
