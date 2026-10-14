// Chirped pulse amplification: stretch, amplify, compress. Peak power per stage on a log scale.
import { h } from '../ui/dom.js';
import { num, si } from '../core/format.js';
import { canvasView, animate, control, readouts, Plot, alpha, supNum } from './kit.js';

export const meta = { titel: 'CPA: strecken, verstärken, komprimieren', kurz: 'Warum der Verstärker den Puls nie in voller Spitzenleistung sieht' };
export const formel = [
  'P_\\mathrm{peak}\\approx\\frac{E_\\mathrm{p}}{\\tau}',
  '\\tau_\\mathrm{str}=S\\,\\tau_0,\\qquad E_\\mathrm{out}=G\\,E_\\mathrm{seed}',
];
export const aufgaben = [
  'Setze den Streckfaktor auf 1 (kein Strecker): Wie hoch ist dann die Spitzenleistung im Verstärker? Vergleiche mit dem gestrichelten Balken.',
  'Erhöhe die Verstärkung 10-fach: Um wie viel muss der Streckfaktor steigen, damit die Spitzenleistung im Verstärker gleich bleibt?',
];

const STAGES = ['Oszillator', 'Strecker', 'Verstärker', 'Kompressor'];

export function mount(root) {
  let tau0 = 200; // fs
  let S = 1e4;
  let G = 1e5;
  let Eseed = 1; // nJ

  const out = readouts();
  const ctrls = [
    control({ label: 'Pulsdauer am Oszillator τ₀', unit: 'fs', min: 30, max: 2000, value: tau0, log: true, onInput: (v) => { tau0 = v; update(); } }),
    control({ label: 'Streckfaktor S', unit: '', min: 1, max: 1e5, value: S, log: true, fmt: (v) => `${num(v, 3)} ×`, onInput: (v) => { S = v; update(); } }),
    control({ label: 'Verstärkung G', unit: '', min: 10, max: 1e7, value: G, log: true, fmt: (v) => `${num(v, 3)} ×`, onInput: (v) => { G = v; update(); } }),
    control({ label: 'Seed-Pulsenergie', unit: 'nJ', min: 0.1, max: 100, value: Eseed, log: true, onInput: (v) => { Eseed = v; update(); } }),
  ];

  const stages = () => {
    const E0 = Eseed * 1e-9;
    const E1 = E0 * G;
    const ts = tau0 * 1e-15 * S;
    const t0 = tau0 * 1e-15;
    return [
      { E: E0, tau: t0, P: E0 / t0 },
      { E: E0, tau: ts, P: E0 / ts },
      { E: E1, tau: ts, P: E1 / ts },
      { E: E1, tau: t0, P: E1 / t0 },
    ];
  };

  let phase = 0;
  const box = h('div', { class: 'sim-canvas-box' });
  const view = canvasView(box, {
    aspect: 0.8,
    draw(ctx, W, H, pal) {
      const st = stages();
      const noCpa = st[3].P; // amplify the short pulse directly: same as compressed peak power
      const slot = (W - 20) / 4;
      // schematic row
      const rowY = 38;
      ctx.lineWidth = 2;
      ctx.strokeStyle = pal.soft;
      ctx.beginPath();
      ctx.moveTo(10, rowY);
      ctx.lineTo(W - 10, rowY);
      ctx.stroke();
      STAGES.forEach((name, i) => {
        const cx = 10 + slot * (i + 0.5);
        ctx.fillStyle = alpha(pal.accent, 0.16);
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 2;
        const bw = Math.min(slot - 10, 96);
        ctx.beginPath();
        ctx.roundRect(cx - bw / 2, rowY - 18, bw, 36, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = pal.text;
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, cx, rowY);
        // pulse shape icon below the box: width ~ log tau
        const w = 6 + 26 * ((Math.log10(st[i].tau) + 15) / 6);
        const hgt = 28;
        ctx.beginPath();
        for (let k = -30; k <= 30; k += 1) {
          const x = cx + (k / 30) * Math.min(slot / 2 - 4, w);
          const y = rowY + 50 - hgt * Math.exp(-((k / 30) ** 2) * 3.2);
          ctx[k === -30 ? 'moveTo' : 'lineTo'](x, y);
        }
        ctx.strokeStyle = pal.laser;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.fillStyle = pal.muted;
        ctx.font = '600 10.5px system-ui, sans-serif';
        ctx.fillText(si(st[i].tau, 's', 2), cx, rowY + 64);
      });
      // traveling pulse
      const px = 10 + (phase % 1) * (W - 20);
      const glow = ctx.createRadialGradient(px, rowY, 0, px, rowY, 16);
      glow.addColorStop(0, alpha(pal.laser, 1));
      glow.addColorStop(1, alpha(pal.laser, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, rowY, 16, 0, Math.PI * 2);
      ctx.fill();

      // bars: peak power per stage, log scale
      const logs = [...st.map((s) => Math.log10(s.P)), Math.log10(noCpa)];
      const lo = Math.floor(Math.min(...logs)) - 1;
      const hi = Math.ceil(Math.max(...logs)) + 1;
      const p = new Plot(ctx, pal, { x: 50, y: rowY + 92, w: W - 64, h: H - rowY - 92 - 36 }, { xmin: 0, xmax: 4, ymin: 10 ** lo, ymax: 10 ** hi, ylog: true });
      p.axes({ ylabel: 'Spitzenleistung in W', xticks: [], yfmt: (vv) => `10${supNum(Math.round(Math.log10(vv)))}`, yticks: Array.from({ length: hi - lo + 1 }, (_, k) => 10 ** (lo + k)).filter((_, k, a) => a.length < 9 || k % 2 === 0) });
      st.forEach((s, i) => {
        const x0 = p.x + (i / 4) * p.w + 8;
        const bw = p.w / 4 - 16;
        const y = p.Y(s.P);
        ctx.fillStyle = i === 2 ? alpha(pal.accent, 0.85) : alpha(pal.laser, 0.85);
        ctx.beginPath();
        ctx.roundRect(x0, y, bw, p.y + p.h - y, [8, 8, 0, 0]);
        ctx.fill();
        ctx.fillStyle = pal.text;
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(si(s.P, 'W', 2), x0 + bw / 2, y - 3);
        ctx.fillStyle = pal.muted;
        ctx.textBaseline = 'top';
        ctx.font = '600 10.5px system-ui, sans-serif';
        ctx.fillText(STAGES[i], x0 + bw / 2, p.y + p.h + 6);
      });
      // what the amplifier would see without stretching
      const yn = p.Y(noCpa);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = pal.bad;
      ctx.lineWidth = 2;
      const xA = p.x + (2 / 4) * p.w + 4;
      ctx.beginPath();
      ctx.moveTo(xA, yn);
      ctx.lineTo(xA + p.w / 4 - 8, yn);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = pal.bad;
      ctx.font = '700 10.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('ohne Strecker', xA + p.w / 8 - 4, yn - 14);
    },
  });
  view.canvas.setAttribute('aria-label', 'Schema der gestreckten Pulsverstärkung mit Spitzenleistung je Stufe');
  animate(view.canvas, (dt) => {
    phase += dt * 0.12;
    view.redraw();
  });

  function update() {
    const st = stages();
    out.update([
      { label: 'Spitzenleistung im Verstärker', value: si(st[2].P, 'W', 3), tone: 'accent' },
      { label: 'Ohne Strecker wären es', value: si(st[3].P, 'W', 3), tone: 'warn' },
      { label: 'Pulsenergie nach Verstärkung', value: si(st[2].E, 'J', 3) },
      { label: 'Gestreckte Pulsdauer', value: si(st[1].tau, 's', 3) },
    ]);
    view.redraw();
  }
  update();

  root.append(box, ...ctrls.map((c) => c.el), out.el, h('p', { class: 'hint sim-note' }, 'Idealisiert: Verluste, Pulsformverzerrungen und die Grenze durch die Zerstörschwelle im Verstärker sind nicht modelliert. Die Zerstörschwelle hängt von Fluenz und Strahlgröße ab, nicht nur von der Spitzenleistung.'));
}
