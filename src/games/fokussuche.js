// Game "Fokussuche": find the focal plane on a freshly mounted sample with a spot row at different z positions.
// Model: Gaussian beam w(z) = w0·sqrt(1+((z−z0)/zR)²), crater D² = 2w² ln(F0/Fth), F0 = 2Ep/(πw²). Freely chosen numbers.
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, Plot, alpha } from '../sims/kit.js';
import { t } from '../core/i18n.js';
import { intro, head, verdict, finishScreen, fill, pick, rand, gauss } from './_common.js';

export const meta = { titel: 'Fokussuche', kurz: 'Finde die Fokuslage mit einer Spotreihe in z, wie beim Einrichten einer neuen Probe', max: 12 };

const ROUNDS = 3;
const SHOTS = 12;
const LAMBDA = 1.03e-3; // mm
const Z_RANGE = 3; // ±mm

function newRound() {
  const w0 = pick([8, 10, 12, 15]); // µm
  const M2 = pick([1.1, 1.2, 1.3]);
  const zR = (Math.PI * (w0 * 1e-3) ** 2) / (M2 * LAMBDA); // mm
  const z0 = Math.round(rand(-2.2, 2.2) * 100) / 100;
  const Fth = pick([0.3, 0.5, 0.8, 1.2]); // J/cm²
  const EthFocus = (Fth * Math.PI * (w0 * 1e-4) ** 2) / 2 / 1e-6; // µJ at the focus
  return { w0, M2, zR, z0, Fth, EthFocus, shots: [] };
}

const wAt = (r, z) => r.w0 * Math.sqrt(1 + ((z - r.z0) / r.zR) ** 2);
function crater(r, z, Ep) {
  const w = wAt(r, z);
  const F0 = (2 * Ep * 1e-6) / (Math.PI * (w * 1e-4) ** 2);
  return F0 > r.Fth ? w * Math.sqrt(2 * Math.log(F0 / r.Fth)) : 0;
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
    if (round > ROUNDS) return finishScreen(stage, ctx, total, ROUNDS * 4, 'Mit viel Energie ist der Krater im Fokus am kleinsten, weit außerhalb verschwindet er. Knapp über der Schwelle entsteht nur noch im Fokus ein Krater. Zwei symmetrische Punkte gleicher Breite liefern die Mitte genauer als der eine kleinste Punkt, weil die Kurve um den Fokus flach ist.', start);
    r = newRound();
    draw();
  }

  function draw() {
    let z = 0;
    let Ep = Math.round(r.EthFocus * 8 * 10) / 10;
    let done = false;

    const info = h('p', { class: 'hint' }, t('Strahlradius im Fokus w₀ ≈ {w} µm (Datenblatt), Fokuslage unbekannt: irgendwo zwischen −{z} und +{z} mm. {n} Spots auf der Probe frei.', { w: r.w0, z: Z_RANGE, n: SHOTS }));

    // microscope: spot row
    const micBox = h('div', { class: 'sim-canvas-box' });
    const mic = canvasView(micBox, {
      aspect: 0.32,
      draw(c, W, H, pal) {
        c.fillStyle = pal.surface2;
        c.fillRect(0, 0, W, H);
        c.fillStyle = pal.muted;
        c.font = '600 11px system-ui, sans-serif';
        c.textAlign = 'left';
        c.fillText(t('Mikroskop: Spotreihe'), 8, 14);
        const n = SHOTS;
        const gap = W / (n + 1);
        const scale = (gap * 0.9) / 80; // 80 µm fits into a slot
        r.shots.forEach((s, i) => {
          const x = gap * (i + 1);
          const y = H / 2 + 4;
          if (s.D > 0) {
            const g = c.createRadialGradient(x, y, 0, x, y, (s.Dm / 2) * scale);
            g.addColorStop(0, alpha(pal.text, 0.85));
            g.addColorStop(0.8, alpha(pal.text, 0.5));
            g.addColorStop(1, alpha(pal.text, 0.1));
            c.fillStyle = g;
            c.beginPath();
            c.arc(x, y, Math.max(1, (s.Dm / 2) * scale), 0, Math.PI * 2);
            c.fill();
          } else {
            c.strokeStyle = alpha(pal.muted, 0.6);
            c.setLineDash([2, 3]);
            c.beginPath();
            c.arc(x, y, 4, 0, Math.PI * 2);
            c.stroke();
            c.setLineDash([]);
          }
          c.fillStyle = pal.muted;
          c.textAlign = 'center';
          c.font = '10px system-ui, sans-serif';
          c.fillText(num(s.z, 2), x, H - 6);
        });
      },
    });
    mic.canvas.setAttribute('aria-label', t('Mikroskopbild der Spotreihe'));

    // D(z) plot
    const plotBox = h('div', { class: 'sim-canvas-box' });
    const fig = canvasView(plotBox, {
      aspect: 0.62,
      draw(c, W, H, pal) {
        const maxD = Math.max(40, ...r.shots.map((s) => s.Dm * 1.2));
        const p = new Plot(c, pal, { x: 46, y: 22, w: W - 58, h: H - 60 }, { xmin: -Z_RANGE, xmax: Z_RANGE, ymin: 0, ymax: maxD });
        p.axes({ xlabel: 'z / mm', ylabel: 'D / µm' });
        if (done) p.curve((zz) => crater(r, zz, Ep), { color: pal.accent, width: 2 });
        if (done) p.vline(r.z0, { color: pal.ok, label: t('wahrer Fokus') });
        p.vline(z, { color: pal.laser, dash: [3, 4], label: done ? t('deine Wahl') : t('Tisch'), labelBelow: true });
        for (const s of r.shots) p.dot(s.z, s.Dm, { color: s.D > 0 ? pal.warm : pal.muted, r: 4.5 });
      },
    });
    fig.canvas.setAttribute('aria-label', t('Kraterdurchmesser über der z-Position'));

    const zCtl = control({ label: 'z-Position', unit: 'mm', min: -Z_RANGE, max: Z_RANGE, step: 0.01, value: z, onInput: (v) => { z = Math.round(v * 100) / 100; fig.redraw(); } });
    const eCtl = control({ label: 'Pulsenergie E_p', unit: 'µJ', min: Math.max(0.05, r.EthFocus * 0.5), max: r.EthFocus * 60, log: true, value: Ep, onInput: (v) => { Ep = v; } });
    const left = h('span', { class: 'chip' });
    const showLeft = () => { left.textContent = t('{n} Spots übrig', { n: SHOTS - r.shots.length }); };
    showLeft();

    const shoot = h('button', { type: 'button', class: 'btn btn-primary', onClick: () => {
      if (r.shots.length >= SHOTS || done) return;
      const D = crater(r, z, Ep);
      r.shots.push({ z, D, Dm: D > 0 ? Math.max(0, D * (1 + 0.03 * gauss())) : 0 });
      showLeft();
      shoot.disabled = r.shots.length >= SHOTS;
      mic.redraw();
      fig.redraw();
      last.textContent = D > 0 ? t('Spot bei z = {z} mm: D = {d} µm', { z: num(z, 3), d: num(r.shots.at(-1).Dm, 3) }) : t('Spot bei z = {z} mm: kein Abtrag (Fluenz unter der Schwelle)', { z: num(z, 3) });
    } }, t('Spot setzen'));
    const last = h('p', { class: 'game-live', 'aria-live': 'polite' }, t('Setze den Tisch auf eine z-Position und schieße einen Spot.'));
    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });
    const commit = h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => {
      if (done || !r.shots.length) return;
      done = true;
      shoot.disabled = true;
      commit.disabled = true;
      const err = Math.abs(z - r.z0) / r.zR;
      const s = err <= 0.25 ? 3 : err <= 0.5 ? 2 : err <= 1 ? 1 : 0;
      const bonus = s > 0 && r.shots.length <= 9 ? 1 : 0;
      total += s + bonus;
      fig.redraw();
      fill(result, 
        verdict(s, t('Abweichung {d} mm = {k} Rayleigh-Längen', { d: num(Math.abs(z - r.z0), 2), k: num(err, 2) })),
        bonus ? h('p', { class: 'hint' }, t('+1 ★ Bonus: mit höchstens 9 Spots gefunden.')) : null,
        h('p', { class: 'hint' }, t('Fokus bei z₀ = {z} mm, Rayleigh-Länge z_R = {r} mm (w₀ = {w} µm, M² = {m}).', { z: num(r.z0, 3), r: num(r.zR, 2), w: r.w0, m: num(r.M2, 2) })),
        h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächste Probe')),
      );
    } }, t('Fokus hier festlegen'));

    fill(stage, head(round, ROUNDS, total, left), info, micBox, plotBox, zCtl.el, eCtl.el, h('div', { class: 'quiz-actions' }, shoot, commit), last, result);
  }

  intro(stage, {
    lead: 'Neue Probe eingespannt, die Oberfläche liegt nicht genau in der Fokusebene. Bevor du Parameterstudien machst, musst du die Fokuslage finden.',
    steps: [
      'z-Tisch auf eine Startposition fahren, Spot schießen.',
      'In Schritten durch z fahren und eine Spotreihe auf die Probe setzen.',
      'Spots unter dem Mikroskop vermessen und den Durchmesser über z auftragen.',
      'Fokus = Mitte der Kurve; dort den Tisch nullen.',
    ],
    checklist: ['Laserschutzbrille für die Wellenlänge aufgesetzt', 'Schutzgehäuse geschlossen, Absaugung an'],
    onStart: start,
  });
}
