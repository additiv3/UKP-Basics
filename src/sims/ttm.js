// Qualitative two-temperature model (Anisimov 1974): electrons are heated first, the lattice follows via coupling.
// Dimensionless: temperatures in units of the start temperature T0, lattice heat capacity = 1, heat conduction ignored.
import { h } from '../ui/dom.js';
import { num, si } from '../core/format.js';
import { canvasView, control, readouts, Plot, alpha } from './kit.js';
import { t } from '../core/i18n.js';

export const meta = { titel: 'Zwei-Temperatur-Modell', kurz: 'Elektronen heizen sich auf, das Gitter hinkt hinterher' };
export const formel = [
  'C_\\mathrm{e}(T_\\mathrm{e})\\frac{\\partial T_\\mathrm{e}}{\\partial t}=-G\\,(T_\\mathrm{e}-T_\\mathrm{l})+S(t)',
  'C_\\mathrm{l}\\frac{\\partial T_\\mathrm{l}}{\\partial t}=G\\,(T_\\mathrm{e}-T_\\mathrm{l})',
];
export const aufgaben = [
  'Wähle $\\tau$ deutlich kürzer als die Kopplungszeit: Die Elektronen werden viel heißer als das Gitter, bevor sich beide angleichen.',
  'Verlängere den Puls bis in den Bereich der Kopplungszeit: Der Temperaturunterschied bleibt klein, der Prozess wird „thermischer".',
  'Erhöhe die Energie: Die Elektronentemperatur steigt, die Endtemperatur des Gitters ebenfalls.',
];

/** Backward-Euler integration with exact energy conservation (energy ratio u = eps*Te^2/2). */
function simulate({ tau, E, tauEp, eps }) {
  const sigma = (tau * 1e-3) / (2 * Math.sqrt(2 * Math.LN2)); // ps
  const tc = 3.2 * sigma;
  const P = (t) => (E / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((t - tc) ** 2) / (2 * sigma * sigma));
  let t = 0;
  let U = eps / 2;
  let Tl = 1;
  const rows = [{ t: 1e-4, Te: 1, Tl: 1, P: 0 }];
  const tEnd = 300;
  while (t < tEnd) {
    const dt = Math.min(sigma / 8, Math.max(sigma / 40, t * 0.03));
    const Pn = P(t + dt);
    const S = U + Tl + dt * Pn;
    let Un = U;
    for (let i = 0; i < 40; i += 1) {
      const Te = Math.sqrt((2 * Math.max(Un, 1e-12)) / eps);
      const F = Un - U - dt * Pn + (dt / tauEp) * (Te - S + Un);
      const dF = 1 + (dt / tauEp) * (1 / (eps * Te) + 1);
      const step = F / dF;
      Un -= step;
      if (Math.abs(step) < 1e-12 * Math.max(1, Un)) break;
    }
    U = Math.max(Un, 1e-12);
    Tl = S - U;
    t += dt;
    rows.push({ t, Te: Math.sqrt((2 * U) / eps), Tl, P: Pn });
  }
  return { rows, tc, sigma };
}

export function mount(root) {
  let tau = 100; // fs
  let E = 10; // absorbed energy relative to C_l*T0
  let tauEp = 1; // ps, coupling time
  let eps = 0.01; // electronic heat capacity per Te relative to lattice

  const out = readouts();
  const ctrls = [
    control({ label: 'Pulsdauer τ', unit: 'fs', min: 10, max: 20000, value: tau, log: true, onInput: (v) => { tau = v; update(); } }),
    control({ label: 'Absorbierte Energie (relativ zu C_l·T₀)', unit: '', min: 0.5, max: 100, value: E, log: true, fmt: (v) => `${num(v, 3)} ×`, onInput: (v) => { E = v; update(); } }),
    control({ label: 'Kopplungszeit τ_ep (frei gewählt)', unit: 'ps', min: 0.05, max: 30, value: tauEp, log: true, onInput: (v) => { tauEp = v; update(); } }),
    control({ label: 'Elektronische Wärmekapazität ε (frei gewählt)', unit: '', min: 0.001, max: 0.1, value: eps, log: true, fmt: (v) => num(v, 2), onInput: (v) => { eps = v; update(); } }),
  ];

  let sim = simulate({ tau, E, tauEp, eps });
  const box = h('div', { class: 'sim-canvas-box' });
  const view = canvasView(box, {
    aspect: 0.7,
    draw(ctx, W, H, pal) {
      const peak = Math.max(...sim.rows.map((r) => r.Te));
      const p = new Plot(ctx, pal, { x: 48, y: 22, w: W - 64, h: H - 60 }, { xmin: 1e-3, xmax: 300, ymin: 0.8, ymax: Math.max(peak * 1.5, 3), xlog: true, ylog: true });
      p.axes({ xlabel: 'Zeit t in ps', ylabel: 'Temperatur T / T₀', xfmt: (v) => num(v, 3), yfmt: (v) => num(v, 3), xticks: [1e-3, 1e-2, 1e-1, 1, 10, 100], yticks: [1, 10, 100, 1000].filter((v) => v <= Math.max(peak * 1.5, 3)) });
      // pulse envelope as band at the bottom
      const pmax = Math.max(...sim.rows.map((r) => r.P));
      p.clip(() => {
        ctx.beginPath();
        ctx.moveTo(p.X(1e-3), p.y + p.h);
        for (const r of sim.rows) ctx.lineTo(p.X(Math.max(r.t, 1e-3)), p.y + p.h - (r.P / pmax) * p.h * 0.18);
        ctx.lineTo(p.X(300), p.y + p.h);
        ctx.closePath();
        ctx.fillStyle = alpha(pal.xp, 0.35);
        ctx.fill();
      });
      const pts = (key) => sim.rows.map((r) => [r.t, r[key]]);
      const line = (key, color) => {
        p.clip(() => {
          ctx.beginPath();
          pts(key).forEach(([t, v], i) => ctx[i ? 'lineTo' : 'moveTo'](p.X(Math.max(t, 1e-3)), p.Y(Math.max(v, 0.8))));
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.stroke();
        });
      };
      line('Te', pal.laser);
      line('Tl', pal.accent);
      p.text('Elektronen T_e', p.X(2e-3), p.Y(peak * 1.15), { color: pal.laser, bold: true, size: 12 });
      p.text('Gitter T_l', p.X(60), p.Y(sim.rows[sim.rows.length - 1].Tl) - 8, { color: pal.accent, bold: true, size: 12, align: 'center' });
      p.text('Laserpuls', p.X(1.3e-3), p.y + p.h - 8, { color: pal.xp, size: 11, bold: true });
      const teq = equil();
      if (teq) p.vline(teq, { color: pal.ok, label: 'Angleichung', dash: [4, 4], labelBelow: true });
    },
  });
  view.canvas.setAttribute('aria-label', t('Zeitverlauf von Elektronen- und Gittertemperatur auf logarithmischer Zeitachse'));

  function equil() {
    const tail = sim.rows.filter((r) => r.t > sim.tc);
    const hit = tail.find((r) => r.Te - r.Tl < 0.1 * r.Tl);
    return hit?.t;
  }

  function update() {
    sim = simulate({ tau, E, tauEp, eps });
    const peak = Math.max(...sim.rows.map((r) => r.Te));
    const last = sim.rows[sim.rows.length - 1];
    const teq = equil();
    const ratio = (tau * 1e-3) / tauEp;
    out.update([
      { label: 'Maximale Elektronentemperatur', value: `${num(peak, 3)} · T₀`, tone: 'warn' },
      { label: 'Gittertemperatur am Ende', value: `${num(last.Tl, 3)} · T₀`, tone: 'accent' },
      { label: 'Angleichung nach', value: teq ? si(teq * 1e-12, 's') : '> 300 ps' },
      { label: 'Pulsdauer / Kopplungszeit', value: num(ratio, 3) },
    ]);
    view.redraw();
    verdict.textContent =
      ratio < 0.1
        ? t('Der Puls ist viel kürzer als die Kopplungszeit: Erst heizen sich die Elektronen auf, danach erst reagiert das Gitter.')
        : ratio < 1
          ? t('Übergangsbereich: Elektronen und Gitter laufen teilweise auseinander.')
          : t('Der Puls ist länger als die Kopplungszeit: Elektronen und Gitter bleiben nahezu im Gleichgewicht, es wird thermisch.');
  }
  const verdict = h('p', { class: 'sim-verdict', 'aria-live': 'polite' });
  update();

  root.append(box, ...ctrls.map((c) => c.el), out.el, verdict, h('p', { class: 'hint sim-note' }, t('Qualitatives Modell: Parameter sind frei gewählt, es sind keine Materialwerte. Wärmeleitung, Temperaturabhängigkeit der Kopplung und Phasenübergänge sind ignoriert.')));
}
