// Multiphoton absorption: photon energy vs band gap (band diagram), and the Keldysh parameter vs intensity.
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, readouts, Plot, alpha } from './kit.js';

export const meta = { titel: 'Mehrphotonen und Keldysh-Parameter', kurz: 'Wie viele Photonen brauchst du für die Bandlücke?' };
export const formel = [
  'n=\\left\\lceil \\frac{E_\\mathrm{g}}{h\\nu}\\right\\rceil,\\quad \\mathrm{Rate}\\propto I^{\\,n}',
  '\\gamma=\\frac{\\omega}{e}\\sqrt{\\frac{m^\\ast c\\,n_0\\varepsilon_0E_\\mathrm{g}}{I}}',
];
export const aufgaben = [
  'Halbiere die Wellenlänge (z. B. 1030 nm → 515 nm): Wie viele Photonen braucht es nun?',
  'Erhöhe die Intensität: Wie verändert sich $\\gamma$, und in welche Richtung geht es (Mehrphotonen → Tunneln)?',
  'Wie stark steigt die Absorptionsrate, wenn du die Intensität verdoppelst und $n=4$ gilt? (Faktor $2^4=16$.)',
];

const HC = 1239.84; // eV*nm
const E_CH = 1.602176634e-19;
const M_E = 9.1093837015e-31;
const EPS0 = 8.8541878128e-12;
const C = 299792458;

export function mount(root) {
  let lam = 1030;
  let Eg = 5;
  let I = 1e13; // W/cm²
  let mred = 0.5;
  let n0 = 1.5;

  const out = readouts();
  const ctrls = [
    control({ label: 'Wellenlänge λ', unit: 'nm', min: 250, max: 2500, value: lam, log: true, onInput: (v) => { lam = v; update(); } }),
    control({ label: 'Bandlücke E_g (frei gewählt)', unit: 'eV', min: 1, max: 12, value: Eg, step: 0.1, fmt: (v) => `${num(v, 3)} eV`, onInput: (v) => { Eg = v; update(); } }),
    control({ label: 'Intensität I', unit: 'W/cm²', min: 1e10, max: 1e15, value: I, log: true, onInput: (v) => { I = v; update(); } }),
    control({ label: 'Reduzierte Masse m* (relativ zu mₑ, frei gewählt)', unit: '', min: 0.1, max: 1, value: mred, step: 0.05, fmt: (v) => num(v, 2), onInput: (v) => { mred = v; update(); } }),
    control({ label: 'Brechungsindex n₀ (frei gewählt)', unit: '', min: 1, max: 3, value: n0, step: 0.05, fmt: (v) => num(v, 3), onInput: (v) => { n0 = v; update(); } }),
  ];

  const hv = () => HC / lam;
  const nPh = () => Math.ceil(Eg / hv() - 1e-9);
  const gamma = (Iw = I) => {
    const omega = (2 * Math.PI * C) / (lam * 1e-9);
    return (omega / E_CH) * Math.sqrt((mred * M_E * C * n0 * EPS0 * Eg * E_CH) / (Iw * 1e4));
  };

  const bandBox = h('div', { class: 'sim-canvas-box' });
  const band = canvasView(bandBox, {
    aspect: 0.7,
    draw(ctx, W, H, pal) {
      const n = nPh();
      const e = hv();
      const top = 20;
      const bottom = H - 22;
      const eMax = Math.max(Eg + 1.6, n * e + 0.6);
      const Y = (E) => bottom - (E / eMax) * (bottom - top - 18);
      const x0 = 52;
      const x1 = W - 20;
      // bands
      ctx.fillStyle = alpha(pal.accent, 0.22);
      ctx.fillRect(x0, Y(0), x1 - x0, bottom - Y(0));
      ctx.fillStyle = alpha(pal.accent, 0.22);
      ctx.fillRect(x0, top, x1 - x0, Y(Eg) - top);
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0, Y(0));
      ctx.lineTo(x1, Y(0));
      ctx.moveTo(x0, Y(Eg));
      ctx.lineTo(x1, Y(Eg));
      ctx.stroke();
      ctx.fillStyle = pal.muted;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Valenzband', x0 + 8, bottom - 8);
      ctx.fillText('Leitungsband', x0 + 8, top + 16);
      ctx.textAlign = 'right';
      ctx.fillText('Bandlücke', x1 - 8, (Y(0) + Y(Eg)) / 2 - 4);
      // gap bracket
      ctx.strokeStyle = pal.soft;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0 - 12, Y(0));
      ctx.lineTo(x0 - 12, Y(Eg));
      ctx.stroke();
      ctx.save();
      ctx.translate(x0 - 20, (Y(0) + Y(Eg)) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = pal.text;
      ctx.font = '700 11.5px system-ui, sans-serif';
      ctx.fillText(`E_g = ${num(Eg, 3)} eV`, 0, 0);
      ctx.restore();
      // stacked photons
      const slotW = Math.min(46, (x1 - x0 - 130) / Math.max(1, n));
      for (let i = 0; i < n; i += 1) {
        const xa = x0 + 80 + i * slotW + slotW / 2;
        const y0 = Y(i * e);
        const y1 = Y(Math.min((i + 1) * e, eMax));
        ctx.strokeStyle = pal.laser;
        ctx.fillStyle = pal.laser;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xa, y0);
        ctx.lineTo(xa, y1 + 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xa, y1);
        ctx.lineTo(xa - 6, y1 + 10);
        ctx.lineTo(xa + 6, y1 + 10);
        ctx.closePath();
        ctx.fill();
        if (i < n - 1) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = alpha(pal.laser, 0.5);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(xa, y1);
          ctx.lineTo(xa + slotW, y1);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.fillStyle = pal.text;
      ctx.font = '700 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${n} × hν (${num(e, 3)} eV) = ${num(n * e, 3)} eV ≥ E_g`, x0 + 8, top + 38);
    },
  });
  band.canvas.setAttribute('aria-label', 'Banddiagramm mit gestapelten Photonen, die zusammen die Bandlücke überwinden');

  const gBox = h('div', { class: 'sim-canvas-box' });
  const gView = canvasView(gBox, {
    aspect: 0.5,
    draw(ctx, W, H, pal) {
      const p = new Plot(ctx, pal, { x: 46, y: 20, w: W - 62, h: H - 56 }, { xmin: 1e10, xmax: 1e15, ymin: 0.05, ymax: 50, xlog: true, ylog: true });
      p.axes({ xlabel: 'Intensität in W/cm²', ylabel: 'Keldysh-Parameter γ', yticks: [0.1, 1, 10], yfmt: (v) => num(v, 2) });
      ctx.save();
      ctx.fillStyle = alpha(pal.laser, 0.08);
      ctx.fillRect(p.x, p.Y(1.5), p.w, p.y + p.h - p.Y(1.5));
      ctx.fillStyle = alpha(pal.accent, 0.08);
      ctx.fillRect(p.x, p.y, p.w, p.Y(1.5) - p.y);
      ctx.restore();
      p.text('Mehrphotonen (γ ≫ 1)', p.x + 8, p.y + 16, { color: pal.accent, bold: true, size: 11.5 });
      p.text('Tunneln (γ ≪ 1)', p.x + p.w - 8, p.y + p.h - 8, { color: pal.laser, bold: true, size: 11.5, align: 'right' });
      p.hline(1.5, { color: pal.muted, label: 'γ ≈ 1,5 (Übergang)', labelSide: 'right', dash: [4, 4] });
      p.curve((Iw) => gamma(Iw), { color: pal.text, width: 3 });
      p.dot(I, gamma(), { color: pal.laser, r: 6.5 });
    },
  });
  gView.canvas.setAttribute('aria-label', 'Keldysh-Parameter über der Intensität, logarithmisch');

  function update() {
    const g = gamma();
    const n = nPh();
    out.update([
      { label: 'Photonenenergie hν', value: `${num(hv(), 3)} eV` },
      { label: 'Mindestzahl Photonen n', value: String(n), tone: 'accent' },
      { label: 'Rate bei doppelter Intensität', value: `× ${num(2 ** n, 3)}` },
      { label: 'Keldysh-Parameter γ', value: num(g, 3), tone: g > 1.5 ? 'ok' : 'warn' },
      { label: 'Einordnung', value: g > 2.5 ? 'Mehrphotonen' : g < 0.8 ? 'Tunneln' : 'Übergang' },
    ]);
    band.redraw();
    gView.redraw();
  }
  update();

  root.append(bandBox, ...ctrls.map((c) => c.el), out.el, gBox, h('p', { class: 'hint sim-note' }, 'Die Formel für γ folgt der in der Literatur üblichen Schreibweise (Keldysh 1965; Schaffer et al. 2001) und ist hier noch nicht an der Primärquelle geprüft. Alle Eingabewerte sind frei gewählt.'));
}
