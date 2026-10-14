// Time-bandwidth product and dispersion (chirp) of a Gaussian pulse.
import { h } from '../ui/dom.js';
import { num, si } from '../core/format.js';
import { canvasView, control, readouts, Plot, segmented, alpha } from './kit.js';

export const meta = { titel: 'Puls, Spektrum und Chirp', kurz: 'Kurze Pulse brauchen Bandbreite; Dispersion zieht sie auseinander' };
export const formel = [
  '\\tau\\,\\Delta\\nu\\ge 0{,}441\\ \\text{(Gauß)}',
  '\\tau_\\mathrm{out}=\\tau_0\\sqrt{1+\\left(\\frac{4\\ln 2\\;\\varphi_2}{\\tau_0^2}\\right)^2}',
];
export const aufgaben = [
  'Halbiere $\\tau_0$: Wie ändert sich die spektrale Breite? (Sie verdoppelt sich.)',
  'Schalte die Dispersion ein und erhöhe die GDD: Was passiert mit der Spitzenleistung? (Sie sinkt im Verhältnis $\\tau_0/\\tau_\\mathrm{out}$.)',
  'Wähle $\\tau_0$ sehr kurz (< 10 fs): Wie viele Schwingungen enthält der Puls noch?',
];

const C = 299792458; // m/s
const TBP = 0.441; // Gaussian time-bandwidth product

export function mount(root) {
  let tau0 = 100; // fs
  let lam0 = 1030; // nm
  let chirp = false;
  let gdd = 1e5; // fs²

  const out = readouts();
  const cTau = control({ label: 'Pulsdauer τ₀ (Fourier-Limit, FWHM)', unit: 'fs', min: 4, max: 10000, value: tau0, log: true, onInput: (v) => { tau0 = v; update(); } });
  const cLam = control({ label: 'Zentralwellenlänge λ₀', unit: 'nm', min: 400, max: 2000, value: lam0, log: true, onInput: (v) => { lam0 = v; update(); } });
  const cGdd = control({ label: 'Dispersion (GDD φ₂)', unit: 'fs²', min: 100, max: 1e8, value: gdd, log: true, fmt: (v) => `${num(v, 3)} fs²`, onInput: (v) => { gdd = v; update(); } });
  const mode = segmented([{ id: 'off', label: 'ohne Dispersion' }, { id: 'on', label: 'mit Dispersion' }], 'off', (id) => { chirp = id === 'on'; cGdd.el.hidden = !chirp; update(); });
  cGdd.el.hidden = true;

  const state = () => {
    const t0sq = (tau0 * tau0) / (4 * Math.LN2); // fs²
    const tauOut = chirp ? tau0 * Math.sqrt(1 + ((4 * Math.LN2 * gdd) / (tau0 * tau0)) ** 2) : tau0;
    const nu0 = C / (lam0 * 1e-9);
    const dnu = TBP / (tau0 * 1e-15);
    const dlam = (((lam0 * 1e-9) ** 2 * dnu) / C) * 1e9; // nm
    const T = (lam0 * 1e-9) / C / 1e-15; // fs
    const b = chirp ? gdd / (2 * (t0sq * t0sq + gdd * gdd)) : 0; // rad/fs²
    return { t0sq, tauOut, nu0, dnu, dlam, T, b };
  };

  const timeBox = h('div', { class: 'sim-canvas-box' });
  const timeView = canvasView(timeBox, {
    aspect: 0.55,
    draw(ctx, W, H, pal) {
      const s = state();
      const half = 2.3 * s.tauOut; // fs
      let unit = 'fs';
      let div = 1;
      if (half > 3e6) { unit = 'ns'; div = 1e6; } else if (half > 3000) { unit = 'ps'; div = 1e3; }
      const p = new Plot(ctx, pal, { x: 46, y: 22, w: W - 62, h: H - 58 }, { xmin: -half / div, xmax: half / div, ymin: -1.1, ymax: 1.1 });
      p.axes({ xlabel: `Zeit t in ${unit}`, ylabel: 'Feld E(t), Intensität I(t)', yticks: [-1, -0.5, 0, 0.5, 1], yfmt: (v) => num(v, 2), xfmt: (v) => num(v, 3) });
      const env = (t, tauW, peak) => peak * Math.exp((-4 * Math.LN2 * t * t) / (tauW * tauW));
      const peakOut = tau0 / s.tauOut;
      if (chirp) {
        p.curve((t) => env(t * div, tau0, 1), { color: pal.soft, width: 1.8, dash: [5, 4] });
        p.text('Eingang', p.X(0), p.Y(1) - 4, { color: pal.muted, size: 11.5, align: 'center' });
      }
      p.curve((t) => env(t * div, s.tauOut, peakOut), { color: pal.laser, fill: alpha(pal.laser, 0.2) });
      p.curve((t) => env(t * div, s.tauOut, peakOut), { color: pal.laser, width: 2.4 });
      const cyclesInView = (2 * half) / s.T;
      if (cyclesInView <= (W - 62) / 3.2) {
        // real carrier wave
        const omega = (2 * Math.PI) / s.T; // rad/fs
        p.curve(
          (t) => {
            const tf = t * div;
            return Math.sqrt(env(tf, s.tauOut, peakOut)) * Math.cos(omega * tf + s.b * tf * tf);
          },
          { color: pal.accent, width: 1.7, steps: Math.min(4000, Math.round(W * 3)) },
        );
        p.text(`${num(cyclesInView, 3)} Schwingungen im Fenster`, p.X(-half / div) + 6, p.Y(-0.9), { color: pal.muted, size: 11 });
      } else {
        p.text(`Trägerwelle nicht aufgelöst (${num(tau0 / s.T, 3)} Zyklen im Puls)`, p.X(-half / div) + 6, p.Y(-0.9), { color: pal.muted, size: 11 });
      }
    },
  });
  timeView.canvas.setAttribute('aria-label', 'Zeitverlauf des Laserpulses mit Einhüllender und Trägerwelle, bei Dispersion verbreitert');

  const specBox = h('div', { class: 'sim-canvas-box' });
  const specView = canvasView(specBox, {
    aspect: 0.42,
    draw(ctx, W, H, pal) {
      const s = state();
      const span = 4 * s.dlam;
      const p = new Plot(ctx, pal, { x: 46, y: 18, w: W - 62, h: H - 54 }, { xmin: lam0 - span, xmax: lam0 + span, ymin: 0, ymax: 1.15 });
      p.axes({ xlabel: 'Wellenlänge λ in nm', ylabel: 'Spektrum', yticks: [0, 0.5, 1], yfmt: (v) => num(v, 2), xfmt: (v) => num(v, 4) });
      const I = (l) => Math.exp((-4 * Math.LN2 * (l - lam0) ** 2) / (s.dlam * s.dlam));
      p.curve(I, { color: pal.accent, fill: alpha(pal.accent, 0.18) });
      p.curve(I, { color: pal.accent, width: 2.4 });
      p.hline(0.5, { color: pal.soft, dash: [3, 4] });
      p.text(`Δλ = ${num(s.dlam, 3)} nm`, p.X(lam0), p.Y(0.5) - 6, { color: pal.text, bold: true, align: 'center' });
    },
  });
  specView.canvas.setAttribute('aria-label', 'Spektrum des Pulses als Funktion der Wellenlänge');

  function update() {
    const s = state();
    out.update([
      { label: 'Spektrale Breite Δν', value: si(s.dnu, 'Hz') },
      { label: 'Spektrale Breite Δλ', value: `${num(s.dlam, 3)} nm`, tone: 'accent' },
      { label: 'Optische Periode T', value: `${num(s.T, 3)} fs` },
      { label: 'Zyklen im Puls τ₀/T', value: num(tau0 / s.T, 3) },
      { label: 'Pulsdauer nach Dispersion', value: si(s.tauOut * 1e-15, 's') },
      { label: 'Spitzenleistung relativ', value: `${num((tau0 / s.tauOut) * 100, 3)} %`, tone: tau0 / s.tauOut < 0.5 ? 'warn' : '' },
    ]);
    timeView.redraw();
    specView.redraw();
  }
  update();

  root.append(timeBox, cTau.el, cLam.el, mode, cGdd.el, specBox, out.el);
}
