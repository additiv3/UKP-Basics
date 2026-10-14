// Pulse spacing, overlap and hatch: top view of the spots on the workpiece.
import { h } from '../ui/dom.js';
import { num, si } from '../core/format.js';
import { canvasView, control, readouts, alpha } from './kit.js';

export const meta = { titel: 'Pulsabstand, Überlapp und Hatch', kurz: 'Scangeschwindigkeit, Repetitionsrate und Spurabstand zusammen denken' };
export const formel = [
  'd=\\frac{v}{f},\\qquad O=1-\\frac{d}{2w_0}',
  'N_\\mathrm{Spur}\\approx\\frac{2w_0}{d},\\quad N_\\mathrm{Fl}\\approx\\frac{\\pi w_0^2}{d\\,h},\\quad \\dot A=v\\cdot h',
];
export const aufgaben = [
  'Verdopple die Scangeschwindigkeit: Wie ändern sich Pulsabstand und Überlapp?',
  'Welche Geschwindigkeit brauchst du bei 500 kHz für 90 % Überlapp, wenn $w_0=10\\,\\mu\\mathrm{m}$ ist?',
  'Vergrößere den Spurabstand $h$ über den Spotdurchmesser: Was bleibt dazwischen stehen?',
];

export function mount(root) {
  let v = 1; // m/s
  let f = 200; // kHz
  let w0 = 10; // µm
  let hatch = 8; // µm

  const out = readouts();
  const ctrls = [
    control({ label: 'Scangeschwindigkeit v', unit: 'm/s', min: 0.01, max: 20, value: v, log: true, onInput: (x) => { v = x; update(); } }),
    control({ label: 'Repetitionsrate f', unit: 'kHz', min: 1, max: 5000, value: f, log: true, onInput: (x) => { f = x; update(); } }),
    control({ label: 'Strahlradius w₀', unit: 'µm', min: 2, max: 50, value: w0, log: true, onInput: (x) => { w0 = x; update(); } }),
    control({ label: 'Spurabstand (Hatch) h', unit: 'µm', min: 1, max: 100, value: hatch, log: true, onInput: (x) => { hatch = x; update(); } }),
  ];

  const calc = () => {
    const d = (v / (f * 1e3)) * 1e6; // µm
    const D = 2 * w0;
    const oLine = Math.max(0, 1 - d / D);
    const oHatch = Math.max(0, 1 - hatch / D);
    const nLine = Math.max(1, D / d);
    const nArea = Math.max(1, (Math.PI * w0 * w0) / (d * hatch));
    return { d, D, oLine, oHatch, nLine, nArea, rate: v * 1e3 * hatch * 1e-3 }; // mm/s * mm = mm²/s
  };

  const box = h('div', { class: 'sim-canvas-box' });
  const view = canvasView(box, {
    aspect: 0.62,
    draw(ctx, W, H, pal) {
      const c = calc();
      // window: show about 6 spot diameters or 7 pulse spacings, whichever is larger (in µm)
      const winW = Math.max(7 * c.D, Math.min(7 * c.d, 60 * c.D)) * 0.9;
      const s = W / winW; // px per µm
      const lines = Math.max(2, Math.min(7, Math.floor(H / (hatch * s)) + 1));
      const cy0 = H / 2 - ((lines - 1) * hatch * s) / 2;
      const maxCircles = 900;
      const step = Math.max(1, Math.ceil((winW / c.d) / maxCircles));
      ctx.save();
      for (let li = 0; li < lines; li += 1) {
        const y = cy0 + li * hatch * s;
        for (let x = c.d * 0.5 * (li % 2 ? 0 : 0); x <= winW + c.D; x += c.d * step) {
          ctx.beginPath();
          ctx.arc(x * s, y, w0 * s, 0, Math.PI * 2);
          ctx.fillStyle = alpha(pal.laser, Math.min(0.22, 0.05 + 0.5 / Math.max(1, c.nLine * 1.4)));
          ctx.fill();
          if (c.d * step * s > 3) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = alpha(pal.laser, 0.55);
            ctx.stroke();
          }
        }
        ctx.strokeStyle = alpha(pal.accent, 0.5);
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // dimension labels
      ctx.fillStyle = pal.text;
      ctx.font = '700 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      const y1 = cy0 - w0 * s - 8;
      ctx.fillText(`Pulsabstand d = ${num(c.d, 3)} µm`, 10, Math.max(16, y1));
      ctx.restore();
      // scale bar
      const bar = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((b) => b * s > W * 0.14) ?? 1000;
      ctx.fillStyle = pal.muted;
      ctx.fillRect(W - 12 - bar * s, H - 16, bar * s, 3);
      ctx.textAlign = 'right';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(`${bar} µm`, W - 12, H - 22);
    },
  });
  view.canvas.setAttribute('aria-label', 'Draufsicht: Laserspots entlang mehrerer Scanspuren mit Pulsabstand und Spurabstand');

  function update() {
    const c = calc();
    out.update([
      { label: 'Pulsabstand d = v/f', value: si(c.d * 1e-6, 'm'), tone: 'accent' },
      { label: 'Überlapp in der Spur', value: `${num(c.oLine * 100, 3)} %` },
      { label: 'Pulse pro Punkt (Spur)', value: num(c.nLine, 3) },
      { label: 'Überlapp zwischen Spuren', value: `${num(c.oHatch * 100, 3)} %` },
      { label: 'Pulse pro Punkt (Fläche)', value: num(c.nArea, 3), tone: 'warn' },
      { label: 'Flächenrate v·h', value: `${num(c.rate, 3)} mm²/s` },
    ]);
    view.redraw();
  }
  update();

  root.append(box, ...ctrls.map((x) => x.el), out.el, h('p', { class: 'hint sim-note' }, 'Der Spotdurchmesser 2w₀ ist der 1/e²-Durchmesser des Strahls. Der tatsächlich abgetragene Durchmesser ist kleiner (er hängt von der Fluenz und der Schwelle ab), also ist auch der effektive Überlapp kleiner als hier gezeigt.'));
}
