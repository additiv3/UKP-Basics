// Gaussian beam: waist, Rayleigh length, divergence and the drop of peak intensity away from the focus.
import { h } from '../ui/dom.js';
import { si, num } from '../core/format.js';
import { canvasView, control, readouts, alpha } from './kit.js';
import { t } from '../core/i18n.js';

export const meta = { titel: 'Gauß-Strahl im Fokus', kurz: 'Taille, Rayleighlänge und Divergenz live verändern' };
export const formel = [
  'w(z)=w_0\\sqrt{1+\\left(\\frac{z}{z_\\mathrm{R}}\\right)^2}',
  'z_\\mathrm{R}=\\frac{\\pi w_0^2}{M^2\\lambda},\\qquad \\theta=\\frac{M^2\\lambda}{\\pi w_0}',
];
export const aufgaben = [
  'Verdopple $w_0$: Wie ändert sich die Rayleighlänge? (Quadratisch: Faktor 4.)',
  'Stelle $M^2$ von 1 auf 3: Was passiert mit Fokusgröße und Schärfentiefe bei gleichem $w_0$?',
  'Wähle eine kurze Wellenlänge (UV) und vergleiche die Rayleighlänge mit der von 1030 nm.',
];

export function mount(root) {
  let lam = 1030;
  let w0 = 10;
  let m2 = 1.2;
  let zr_rel = 1.5; // marker position in units of z_R

  const out = readouts();
  const ctrls = [
    control({ label: 'Wellenlänge λ', unit: 'nm', min: 250, max: 2000, value: lam, log: true, onInput: (v) => { lam = v; update(); } }),
    control({ label: 'Strahltaille w₀ (1/e²-Radius)', unit: 'µm', min: 1, max: 100, value: w0, log: true, onInput: (v) => { w0 = v; update(); } }),
    control({ label: 'Beugungsmaßzahl M²', unit: '', min: 1, max: 4, value: m2, step: 0.05, fmt: (v) => num(v, 3), onInput: (v) => { m2 = v; update(); } }),
    control({ label: 'Position z (in Vielfachen von z_R)', unit: '', min: -3, max: 3, value: zr_rel, step: 0.05, fmt: (v) => `${num(v, 2)} · z_R`, onInput: (v) => { zr_rel = v; update(); } }),
  ];

  const box = h('div', { class: 'sim-canvas-box' });
  const view = canvasView(box, {
    aspect: 0.62,
    draw(ctx, W, H, pal) {
      const padX = 14;
      const cy = H / 2;
      const zmax = 3; // x axis spans +-3 z_R
      const rmax = 3.4; // y axis spans +-3.4 w0
      const X = (z) => padX + ((z + zmax) / (2 * zmax)) * (W - 2 * padX);
      const R = (r) => (r / rmax) * (H / 2 - 18);
      const wz = (z) => Math.sqrt(1 + z * z);

      // beam body
      const grad = ctx.createLinearGradient(0, cy - R(3), 0, cy + R(3));
      grad.addColorStop(0, alpha(pal.bright, 0.1));
      grad.addColorStop(0.5, alpha(pal.laser, 0.55));
      grad.addColorStop(1, alpha(pal.bright, 0.1));
      ctx.beginPath();
      for (let i = 0; i <= 120; i += 1) {
        const z = -zmax + (i / 120) * 2 * zmax;
        ctx[i ? 'lineTo' : 'moveTo'](X(z), cy - R(wz(z)));
      }
      for (let i = 120; i >= 0; i -= 1) {
        const z = -zmax + (i / 120) * 2 * zmax;
        ctx.lineTo(X(z), cy + R(wz(z)));
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // asymptotes (far-field divergence)
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = pal.soft;
      ctx.lineWidth = 1.2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(X(-zmax), cy + s * R(zmax));
        ctx.lineTo(X(zmax), cy - s * R(zmax));
        ctx.stroke();
      }
      ctx.restore();

      // axis
      ctx.strokeStyle = pal.soft;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, cy);
      ctx.lineTo(W - padX, cy);
      ctx.stroke();

      // envelope
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= 120; i += 1) {
          const z = -zmax + (i / 120) * 2 * zmax;
          ctx[i ? 'lineTo' : 'moveTo'](X(z), cy + s * R(wz(z)));
        }
        ctx.stroke();
      }

      // z_R markers
      ctx.fillStyle = pal.muted;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const z of [-1, 1]) {
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = pal.soft;
        ctx.moveTo(X(z), cy - R(wz(z)));
        ctx.lineTo(X(z), cy + R(wz(z)));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(z > 0 ? '+z_R' : '−z_R', X(z), cy + R(wz(z)) + 15);
      }
      ctx.fillText(t('Fokus'), X(0), cy + R(1) + 15);
      ctx.textAlign = 'left';
      ctx.fillText(t('w₀'), X(0) + 5, cy - R(1) - 5);

      // marker with transverse intensity profile
      const mz = zr_rel;
      const mx = X(mz);
      const mw = wz(mz);
      ctx.strokeStyle = pal.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, cy - R(mw) - 6);
      ctx.lineTo(mx, cy + R(mw) + 6);
      ctx.stroke();
      const peak = 1 / (mw * mw); // I(0,z)/I(0,0)
      const amp = Math.min(W * 0.24, 90) * peak;
      ctx.beginPath();
      ctx.moveTo(mx, cy - R(mw * 1.6));
      for (let i = -40; i <= 40; i += 1) {
        const r = (i / 40) * mw * 1.6;
        ctx.lineTo(mx + amp * Math.exp((-2 * r * r) / (mw * mw)), cy + R(r));
      }
      ctx.lineTo(mx, cy + R(mw * 1.6));
      ctx.closePath();
      ctx.fillStyle = alpha(pal.laser, 0.38);
      ctx.fill();
      ctx.strokeStyle = pal.laser;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = pal.text;
      ctx.font = '700 11.5px system-ui, sans-serif';
      ctx.textAlign = mx > W - 70 ? 'right' : 'left';
      ctx.fillText(`w(z)=${num(mw, 3)}·w₀`, mx + (ctx.textAlign === 'left' ? 8 : -8), cy - R(mw) - 10);
    },
  });
  view.canvas.setAttribute('aria-label', t('Strahlverlauf eines Gauß-Strahls mit Taille, Rayleighlänge und Intensitätsprofil an einer wählbaren Position'));

  function update() {
    const w = w0 * 1e-6;
    const l = lam * 1e-9;
    const zR = (Math.PI * w * w) / (m2 * l);
    const theta = (m2 * l) / (Math.PI * w);
    const mw = Math.sqrt(1 + zr_rel * zr_rel);
    out.update([
      { label: 'Rayleighlänge z_R', value: si(zR, 'm') },
      { label: 'Schärfentiefe 2·z_R', value: si(2 * zR, 'm') },
      { label: 'Fokusdurchmesser 2w₀', value: si(2 * w, 'm') },
      { label: 'Divergenz (Halbwinkel) θ', value: `${num(theta * 1e3, 3)} mrad` },
      { label: 'Radius w(z) an der Marke', value: si(w * mw, 'm') },
      { label: 'Spitzenfluenz relativ zum Fokus', value: `${num(100 / (mw * mw), 3)} %`, tone: 'accent' },
    ]);
    view.redraw();
  }
  update();

  root.append(box, ...ctrls.map((c) => c.el), out.el);
}
