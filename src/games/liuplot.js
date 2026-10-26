// Game "Liu-Plot": determine beam radius and threshold from measured crater diameters (D² method, Liu 1982).
// D² = 2w0² ln(Ep/Eth): a straight line over ln(Ep). You place the line with two handles; reference is the least-squares fit.
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, Plot, clamp } from '../sims/kit.js';
import { t } from '../core/i18n.js';
import { intro, head, verdict, finishScreen, fill, pick, rand, gauss } from './_common.js';

export const meta = { titel: 'Liu-Plot', kurz: 'Bestimme Strahlradius und Schwelle aus Kraterdurchmessern mit der D²-Methode', max: 9 };

const ROUNDS = 3;

function newRound() {
  const w0 = pick([8, 10, 12, 15, 18, 22]);
  const Eth = pick([0.15, 0.3, 0.5, 0.8, 1.2, 2]);
  const n = 7;
  const lo = Math.log(rand(1.3, 1.8));
  const hi = Math.log(rand(25, 60));
  const pts = Array.from({ length: n }, (_, i) => {
    const E = Eth * Math.exp(lo + ((hi - lo) * i) / (n - 1));
    const D2 = 2 * w0 * w0 * Math.log(E / Eth) * (1 + 0.05 * gauss());
    return [Number(E.toPrecision(3)), Math.max(1, D2)];
  });
  // least-squares line D² = m ln E + b
  const xs = pts.map((p) => Math.log(p[0]));
  const ys = pts.map((p) => p[1]);
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;
  const m = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const b = my - m * mx;
  return { w0, Eth, pts, fit: { w0: Math.sqrt(m / 2), Eth: Math.exp(-b / m) } };
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
    if (round > ROUNDS) return finishScreen(stage, ctx, total, ROUNDS * 3, 'Im halblogarithmischen Liu-Plot ist D² über ln(E_p) eine Gerade. Die Steigung ist 2w₀², der Schnittpunkt mit D² = 0 ist die Schwellenenergie. Daraus folgt F_th = 2E_th/(πw₀²), ohne den Strahl separat vermessen zu müssen.', start);
    r = newRound();
    draw();
  }

  function draw() {
    const xmin = r.Eth * 0.5;
    const xmax = r.pts.at(-1)[0] * 1.6;
    const ymax = Math.ceil((Math.max(...r.pts.map((p) => p[1])) * 1.25) / 100) * 100;
    // handles in data coordinates (deliberately off)
    const hA = { x: r.pts[1][0], y: r.pts[1][1] * 1.6 };
    const hB = { x: r.pts.at(-2)[0], y: r.pts.at(-2)[1] * 0.65 };
    let done = false;
    let plot = null;

    const line = () => {
      const m = (hB.y - hA.y) / (Math.log(hB.x) - Math.log(hA.x));
      const b = hA.y - m * Math.log(hA.x);
      return { m, b, w0: m > 0 ? Math.sqrt(m / 2) : NaN, Eth: m > 0 ? Math.exp(-b / m) : NaN };
    };

    const box = h('div', { class: 'sim-canvas-box plotfig', dataset: { noswipe: '1' } });
    const view = canvasView(box, {
      aspect: 0.7,
      draw(c, W, H, pal) {
        plot = new Plot(c, pal, { x: 52, y: 22, w: W - 64, h: H - 62 }, { xmin, xmax, ymin: 0, ymax, xlog: true });
        plot.axes({ xlabel: 'E_p / µJ (log)', ylabel: 'D² / µm²' });
        const L = line();
        plot.curve((x) => L.m * Math.log(x) + L.b, { color: pal.accent, width: 2.5 });
        if (done) {
          const f = r.fit;
          plot.curve((x) => 2 * f.w0 * f.w0 * Math.log(x / f.Eth), { color: pal.ok, width: 2, dash: [6, 5] });
        }
        for (const [x, y] of r.pts) plot.dot(x, y, { color: pal.warm, r: 4.5 });
        if (L.Eth > xmin && L.Eth < xmax) plot.dot(L.Eth, 0, { color: pal.accent, r: 5 });
        for (const p of [hA, hB]) {
          const px = plot.X(p.x);
          const py = plot.Y(p.y);
          c.save();
          c.fillStyle = pal.surface;
          c.strokeStyle = pal.accent;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(px, py, 11, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.restore();
        }
      },
    });
    view.canvas.setAttribute('aria-label', t('Liu-Plot: D² über der Pulsenergie, mit verschiebbarer Gerade'));
    view.canvas.style.touchAction = 'none';

    let drag = null;
    const toData = (e) => {
      const rc = view.canvas.getBoundingClientRect();
      const px = clamp(e.clientX - rc.left, plot.x, plot.x + plot.w);
      const py = clamp(e.clientY - rc.top, plot.y, plot.y + plot.h);
      return { x: plot.inv(px), y: ((plot.y + plot.h - py) / plot.h) * ymax };
    };
    view.canvas.addEventListener('pointerdown', (e) => {
      if (done || !plot) return;
      const rc = view.canvas.getBoundingClientRect();
      const px = e.clientX - rc.left;
      const py = e.clientY - rc.top;
      const d = (p) => Math.hypot(plot.X(p.x) - px, plot.Y(p.y) - py);
      drag = d(hA) < d(hB) ? hA : hB;
      view.canvas.setPointerCapture(e.pointerId);
      Object.assign(drag, toData(e));
      update();
    });
    view.canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      Object.assign(drag, toData(e));
      update();
    });
    const stop = () => { drag = null; };
    view.canvas.addEventListener('pointerup', stop);
    view.canvas.addEventListener('pointercancel', stop);

    const live = h('div', { class: 'calc-out' });
    function update() {
      const L = line();
      const F = (2 * L.Eth * 1e-6) / (Math.PI * (L.w0 * 1e-4) ** 2);
      live.replaceChildren(
        h('div', { class: 'calc-item' }, h('span', { class: 'calc-item-label' }, t('Steigung 2w₀²')), h('strong', {}, Number.isFinite(L.m) ? `${num(L.m, 3)} µm²` : '–')),
        h('div', { class: 'calc-item' }, h('span', { class: 'calc-item-label' }, 'w₀'), h('strong', {}, Number.isFinite(L.w0) ? `${num(L.w0, 3)} µm` : '–')),
        h('div', { class: 'calc-item' }, h('span', { class: 'calc-item-label' }, 'E_th'), h('strong', {}, Number.isFinite(L.Eth) ? `${num(L.Eth, 3)} µJ` : '–')),
        h('div', { class: 'calc-item' }, h('span', { class: 'calc-item-label' }, 'F_th'), h('strong', {}, Number.isFinite(F) ? `${num(F, 3)} J/cm²` : '–')),
      );
      view.redraw();
    }

    const table = h(
      'details',
      { class: 'sim-tasks' },
      h('summary', {}, t('Messwerte')),
      h('table', { class: 'data-table' }, h('tr', {}, h('th', {}, 'E_p / µJ'), h('th', {}, 'D / µm'), h('th', {}, 'D² / µm²')), r.pts.map(([E, D2]) => h('tr', {}, h('td', {}, num(E, 3)), h('td', {}, num(Math.sqrt(D2), 3)), h('td', {}, num(D2, 3))))),
    );

    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });
    const go = h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: () => {
      if (done) return;
      done = true;
      go.disabled = true;
      const L = line();
      const ew = Math.abs(L.w0 - r.fit.w0) / r.fit.w0;
      const ee = Math.abs(L.Eth - r.fit.Eth) / r.fit.Eth;
      const e = Number.isFinite(ew + ee) ? Math.max(ew, ee) : 1;
      const s = e <= 0.06 ? 3 : e <= 0.15 ? 2 : e <= 0.3 ? 1 : 0;
      total += s;
      const Ff = (2 * r.fit.Eth * 1e-6) / (Math.PI * (r.fit.w0 * 1e-4) ** 2);
      view.redraw();
      fill(result, 
        verdict(s, t('Abweichung zur Ausgleichsgeraden: w₀ {a} %, E_th {b} %', { a: num(ew * 100, 2), b: num(ee * 100, 2) })),
        h('p', { class: 'hint' }, t('Ausgleichsgerade (grün): w₀ = {w} µm, E_th = {e} µJ, F_th = {f} J/cm². Wahre Modellwerte: w₀ = {w0} µm, E_th = {e0} µJ.', { w: num(r.fit.w0, 3), e: num(r.fit.Eth, 3), f: num(Ff, 3), w0: r.w0, e0: num(r.Eth, 3) })),
        h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächste Messreihe')),
      );
    } }, t('Auswerten'));

    fill(stage, head(round, ROUNDS, total), h('p', { class: 'hint' }, t('Ziehe die beiden Griffe, bis die Gerade gut durch die Messpunkte läuft. Der Schnitt mit der x-Achse ist E_th.')), box, live, table, go, result);
    update();
  }

  intro(stage, {
    lead: 'Du hast eine Spotreihe mit steigender Pulsenergie geschossen und die Kraterdurchmesser unter dem Mikroskop vermessen. Jetzt wertest du nach Liu aus.',
    steps: [
      'Spots bei 6 bis 10 Energien setzen (gleiche Pulszahl, gleiche Fokuslage).',
      'Durchmesser D vermessen, Pulsenergie mit dem Leistungsmesser bestimmen (E_p = P/f).',
      'D² über ln(E_p) auftragen und eine Gerade anpassen.',
      'Steigung → w₀, Achsenschnitt → E_th, daraus F_th.',
    ],
    onStart: start,
  });
}
