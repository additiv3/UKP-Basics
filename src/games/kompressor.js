// Game "Pulskompressor": tune the grating compressor for the shortest pulse (max. SHG signal), then measure
// the pulse duration from the autocorrelation trace. Chirp model: τ = τ0·sqrt(1 + (4 ln2 · GDD/τ0²)²).
// Deconvolution factors (intensity autocorrelation): Gauss √2, sech² 1.543. Freely chosen numbers.
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, segmented, Plot, clamp, alpha } from '../sims/kit.js';
import { t } from '../core/i18n.js';
import { intro, head, verdict, finishScreen, fill, pick, rand } from './_common.js';

export const meta = { titel: 'Pulskompressor', kurz: 'Kompressor auf kürzesten Puls einstellen und die Pulsdauer am Autokorrelator messen', max: 12 };

const ROUNDS = 2;
const K = 20000; // fs² per mm grating distance
const FACTOR = { gauss: Math.SQRT2, sech: 1.543 };
const tau = (r, d) => r.t0 * Math.sqrt(1 + ((4 * Math.LN2 * K * (d - r.dOpt)) / (r.t0 * r.t0)) ** 2);
const acShape = (shape, x, fwhm) => (shape === 'gauss' ? Math.exp((-4 * Math.LN2 * x * x) / (fwhm * fwhm)) : 1 / Math.cosh((1.7627 * x) / fwhm) ** 2);

function newRound() {
  return { t0: pick([180, 250, 300, 400, 500]), dOpt: Math.round(rand(12, 28) * 10) / 10, shape: pick(['gauss', 'sech']) };
}

export function mount(root, ctx) {
  let round = 0;
  let total = 0;
  let r = null;
  const stage = h('div', { class: 'game-stage' });
  root.append(stage);

  const start = () => {
    round = 0;
    total = 0;
    next();
  };
  function next() {
    round += 1;
    if (round > ROUNDS) return finishScreen(stage, ctx, total, ROUNDS * 6, 'Am kürzesten Puls ist die Spitzenintensität am größten, deshalb maximiert man das SHG-Signal des Autokorrelators. Die Breite der Autokorrelation ist nicht die Pulsdauer: Du musst durch den Formfaktor teilen (Gauß √2, sech² 1,543), und dafür die Pulsform kennen oder annehmen.', start);
    r = newRound();
    tune();
  }

  function tune() {
    let d = clamp(r.dOpt + (Math.random() < 0.5 ? -1 : 1) * rand(4, 9), 2, 38);
    const meter = h('div', { class: 'meter' }, h('div', { class: 'meter-fill' }));
    const meterVal = h('strong', { class: 'meter-val' });
    const box = h('div', { class: 'sim-canvas-box' });
    const view = canvasView(box, {
      aspect: 0.55,
      draw(c, W, H, pal) {
        const tc = tau(r, d);
        const span = 4 * r.t0 * 3;
        const p = new Plot(c, pal, { x: 46, y: 22, w: W - 58, h: H - 60 }, { xmin: -span / 2, xmax: span / 2, ymin: 0, ymax: 1.1 });
        p.axes({ xlabel: 't / fs', ylabel: t('Intensität (rel.)'), noYTicks: true });
        // peak power scales with 1/τ for fixed energy
        const peak = r.t0 / tc;
        p.curve((x) => peak * acShape('gauss', x, tc), { color: pal.laser, fill: alpha(pal.laser, 0.18) });
        p.curve((x) => peak * acShape('gauss', x, tc), { color: pal.laser });
      },
    });
    view.canvas.setAttribute('aria-label', t('Pulsform in der Zeit'));
    const show = () => {
      const s = r.t0 / tau(r, d);
      meter.firstChild.style.width = `${Math.round(s * 100)}%`;
      meterVal.textContent = `${num(s * 1000, 3)} mV`;
      view.redraw();
    };
    const ctl = control({ label: 'Gitterabstand', unit: 'mm', min: 0, max: 40, step: 0.05, value: d, onInput: (v) => { d = v; show(); } });
    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });
    const fix = h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: () => {
      fix.disabled = true;
      ctl.el.querySelector('input').disabled = true;
      const q = tau(r, d) / r.t0;
      const s = q <= 1.03 ? 3 : q <= 1.1 ? 2 : q <= 1.3 ? 1 : 0;
      total += s;
      fill(result, 
        verdict(s, t('Pulsdauer {a} fs, kürzestmöglich wären {b} fs.', { a: num(tau(r, d), 3), b: r.t0 })),
        h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: () => measure(d) }, t('Weiter: Pulsdauer messen')),
      );
    } }, t('Kompressor fixieren'));
    fill(stage, 
      head(round, ROUNDS, total, h('span', { class: 'chip' }, t('Teil 1: Kompressor'))),
      h('p', { class: 'hint' }, t('Verstelle den Gitterabstand, bis das SHG-Signal des Autokorrelators maximal ist. Das Signal wächst mit der Spitzenintensität, also mit 1/τ.')),
      h('div', { class: 'meter-row' }, h('span', { class: 'calc-label' }, t('SHG-Signal')), meter, meterVal),
      box,
      ctl.el,
      fix,
      result,
    );
    show();
  }

  function measure(d) {
    const tc = tau(r, d);
    const fw = FACTOR[r.shape] * tc;
    const span = fw * 3.2;
    let a = -fw * 0.9;
    let b = fw * 0.25;
    let shape = 'gauss';
    let plot = null;
    let done = false;
    const box = h('div', { class: 'sim-canvas-box plotfig', dataset: { noswipe: '1' } });
    const view = canvasView(box, {
      aspect: 0.62,
      draw(c, W, H, pal) {
        plot = new Plot(c, pal, { x: 46, y: 22, w: W - 58, h: H - 60 }, { xmin: -span / 2, xmax: span / 2, ymin: 0, ymax: 1.1 });
        plot.axes({ xlabel: t('Verzögerung Δt / fs'), ylabel: t('SHG-Signal (rel.)') });
        plot.hline(0.5, { color: pal.muted, label: '50 %', labelSide: 'right' });
        plot.curve((x) => acShape(r.shape, x, fw), { color: pal.accent });
        for (const x of [a, b]) plot.vline(x, { color: pal.laser, dash: [], width: 2 });
        const y = plot.y + plot.h + 2;
        c.fillStyle = pal.laser;
        for (const x of [a, b]) {
          c.beginPath();
          c.moveTo(plot.X(x), y - 10);
          c.lineTo(plot.X(x) - 8, y + 4);
          c.lineTo(plot.X(x) + 8, y + 4);
          c.closePath();
          c.fill();
        }
      },
    });
    view.canvas.setAttribute('aria-label', t('Autokorrelationsspur mit zwei Cursorn'));
    view.canvas.style.touchAction = 'none';
    let drag = null;
    const toX = (e) => plot.inv(clamp(e.clientX - view.canvas.getBoundingClientRect().left, plot.x, plot.x + plot.w));
    view.canvas.addEventListener('pointerdown', (e) => {
      if (done || !plot) return;
      const x = toX(e);
      drag = Math.abs(x - a) < Math.abs(x - b) ? 'a' : 'b';
      view.canvas.setPointerCapture(e.pointerId);
      move(e);
    });
    const move = (e) => {
      if (!drag) return;
      if (drag === 'a') a = toX(e);
      else b = toX(e);
      upd();
    };
    view.canvas.addEventListener('pointermove', move);
    view.canvas.addEventListener('pointerup', () => { drag = null; });
    view.canvas.addEventListener('pointercancel', () => { drag = null; });

    const out = h('div', { class: 'calc-out' });
    const upd = () => {
      const w = Math.abs(b - a);
      out.replaceChildren(
        h('div', { class: 'calc-item' }, h('span', { class: 'calc-item-label' }, t('Breite der Autokorrelation')), h('strong', {}, `${num(w, 3)} fs`)),
        h('div', { class: 'calc-item' }, h('span', { class: 'calc-item-label' }, t('Pulsdauer τ')), h('strong', {}, `${num(w / FACTOR[shape], 3)} fs`)),
      );
      view.redraw();
    };
    const seg = segmented([{ id: 'gauss', label: 'Gauß (÷1,414)' }, { id: 'sech', label: 'sech² (÷1,543)' }], shape, (id) => { shape = id; upd(); });
    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });
    const go = h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: () => {
      done = true;
      go.disabled = true;
      const est = Math.abs(b - a) / FACTOR[shape];
      const e = Math.abs(est - tc) / tc;
      const s = e <= 0.04 ? 3 : e <= 0.1 ? 2 : e <= 0.2 ? 1 : 0;
      total += s;
      fill(result, 
        verdict(s, t('Gemessen {a} fs, wahr {b} fs ({e} % daneben).', { a: num(est, 3), b: num(tc, 3), e: num(e * 100, 2) })),
        shape !== r.shape ? h('p', { class: 'hint' }, t('Achtung: falscher Formfaktor gewählt.')) : null,
        h('p', { class: 'hint' }, t('Autokorrelationsbreite {w} fs ÷ {f} = {t} fs.', { w: num(fw, 3), f: num(FACTOR[r.shape], 4), t: num(tc, 3) })),
        h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächster Laser')),
      );
    } }, t('Messung übernehmen'));
    fill(stage, 
      head(round, ROUNDS, total, h('span', { class: 'chip' }, t('Teil 2: Messen'))),
      h('p', { class: 'hint' }, r.shape === 'sech' ? t('Der Laser liefert sech²-förmige Pulse (typisch für solitonische Modenkopplung). Setze die beiden Cursor auf die halbe Höhe der Spur.') : t('Nimm gaußförmige Pulse an. Setze die beiden Cursor auf die halbe Höhe der Spur.')),
      box,
      seg,
      out,
      go,
      result,
    );
    upd();
  }

  intro(stage, {
    lead: 'Morgens am UKP-Laser: Nach dem Aufwärmen prüfst du, ob der Puls wirklich kurz ist. Ein falsch eingestellter Kompressor lässt den Puls gechirpt und länger, die Spitzenintensität sinkt.',
    steps: [
      'Strahlanteil auf den Autokorrelator auskoppeln.',
      'Kompressor (Gitterabstand) auf maximales SHG-Signal einstellen.',
      'Autokorrelationsspur aufnehmen, Halbwertsbreite ablesen.',
      'Durch den Formfaktor der Pulsform teilen: Ergebnis ist die Pulsdauer.',
    ],
    checklist: ['Laserschutzbrille für die Wellenlänge aufgesetzt'],
    onStart: start,
  });
}
