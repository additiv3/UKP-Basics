// Game "Leistung einstellen": set the average power for a target fluence with a λ/2 plate in front of a polarizer.
// P(θ) = Pmax·cos²(2(θ − θ0)); a thermal power meter follows with a time constant (it lags behind).
// Target: P = F0·πw0²/2 · f / T (T = transmission from the measuring point to the workpiece). Freely chosen numbers.
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, animate, alpha, reducedMotion } from '../sims/kit.js';
import { t } from '../core/i18n.js';
import { intro, head, verdict, finishScreen, fill, pick, rand, holdButton } from './_common.js';

export const meta = { titel: 'Leistung einstellen', kurz: 'Ziel-Fluenz in Leistung umrechnen und mit λ/2-Platte und Leistungsmesser einstellen', max: 9 };

const ROUNDS = 3;
const TAU_METER = 1.4; // s, thermal sensor

function newRound() {
  for (;;) {
    const r = {
      Pmax: pick([4, 6, 10, 15, 20]),
      th0: rand(5, 40),
      F0: pick([0.5, 1, 1.5, 2, 3, 4]),
      w0: pick([10, 12, 15, 20, 25]),
      f: pick([50, 100, 200, 400, 600, 1000]),
      T: pick([0.82, 0.85, 0.88, 0.9, 0.92]),
    };
    r.Ep = (r.F0 * Math.PI * (r.w0 * 1e-4) ** 2) / 2; // J
    r.P = (r.Ep * r.f * 1e3) / r.T; // W at the meter
    if (r.P > 0.08 * r.Pmax && r.P < 0.85 * r.Pmax) return r;
  }
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
    if (round > ROUNDS) return finishScreen(stage, ctx, total, ROUNDS * 3, 'Fluenz → Pulsenergie → mittlere Leistung: E_p = F₀πw₀²/2, P = E_p·f. Verluste zwischen Messort und Werkstück (Transmission T) musst du vorhalten. Thermische Messköpfe sind träge: Erst ablesen, wenn der Wert steht.', start);
    r = newRound();
    draw();
  }

  function draw() {
    let th = 0;
    let done = false;
    const power = () => r.Pmax * Math.cos((2 * (th - r.th0) * Math.PI) / 180) ** 2;
    let shown = power();

    const task = h(
      'div',
      { class: 'given' },
      h('span', { class: 'given-label' }, t('Gegeben')),
      h('span', { class: 'chip given-chip' }, `F₀ = ${num(r.F0, 3)} J/cm²`),
      h('span', { class: 'chip given-chip' }, `w₀ = ${r.w0} µm`),
      h('span', { class: 'chip given-chip' }, `f = ${r.f} kHz`),
      h('span', { class: 'chip given-chip' }, `T = ${num(r.T * 100, 3)} %`),
    );

    const box = h('div', { class: 'sim-canvas-box' });
    const view = canvasView(box, {
      aspect: 0.5,
      draw(c, W, H, pal) {
        // power meter display
        const cx = W * 0.32;
        const cy = H * 0.86;
        const R = Math.min(W * 0.28, H * 0.74);
        c.lineWidth = 12;
        c.lineCap = 'round';
        c.strokeStyle = pal.surface2;
        c.beginPath();
        c.arc(cx, cy, R, Math.PI, 2 * Math.PI);
        c.stroke();
        const frac = Math.min(1, shown / r.Pmax);
        c.strokeStyle = pal.accent;
        c.beginPath();
        c.arc(cx, cy, R, Math.PI, Math.PI + frac * Math.PI);
        c.stroke();
        c.fillStyle = pal.text;
        c.textAlign = 'center';
        c.font = '700 22px system-ui, sans-serif';
        c.fillText(`${num(shown, 3)} W`, cx, cy - R * 0.25);
        c.fillStyle = pal.muted;
        c.font = '600 11px system-ui, sans-serif';
        c.fillText(t('Leistungsmesser (thermisch)'), cx, cy - R * 0.25 - 28);
        const settling = Math.abs(shown - power()) > 0.01 * Math.max(power(), 0.05);
        c.fillStyle = settling ? pal.xp : pal.ok;
        c.fillText(settling ? t('schwingt ein …') : t('stabil'), cx, cy - 2);
        // waveplate sketch
        const wx = W * 0.78;
        const wy = H * 0.46;
        const wr = Math.min(W * 0.16, H * 0.36);
        c.lineWidth = 2;
        c.strokeStyle = pal.soft;
        c.fillStyle = alpha(pal.accent, 0.12);
        c.beginPath();
        c.arc(wx, wy, wr, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        const a = (-th * Math.PI) / 180 - Math.PI / 2;
        c.strokeStyle = pal.accent;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(wx - Math.cos(a) * wr, wy - Math.sin(a) * wr);
        c.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
        c.stroke();
        c.fillStyle = pal.muted;
        c.fillText(`λ/2: ${num(th, 3)}°`, wx, wy + wr + 16);
      },
    });
    view.canvas.setAttribute('aria-label', t('Leistungsmesser und λ/2-Platte'));
    animate(view.canvas, (dt) => {
      const target = power();
      shown += (target - shown) * (1 - Math.exp(-dt / TAU_METER));
      view.redraw();
    });

    const still = () => {
      if (!reducedMotion()) return;
      shown = power(); // no animation: the meter jumps
      view.redraw();
    };
    const ctl = control({ label: 'Drehwinkel λ/2-Platte', unit: '°', min: 0, max: 90, step: 0.1, value: th, onInput: (v) => { th = v; still(); } });
    const nudge = (d) => () => {
      if (done) return;
      th = Math.min(90, Math.max(0, Math.round((th + d) * 10) / 10));
      ctl.set(th);
      still();
    };
    const fine = h('div', { class: 'quiz-actions', dataset: { noswipe: '1' } }, holdButton({ class: 'btn btn-small' }, '−0,1°', nudge(-0.1)), holdButton({ class: 'btn btn-small' }, '+0,1°', nudge(0.1)));

    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });
    const go = h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: () => {
      if (done) return;
      done = true;
      go.disabled = true;
      ctl.el.querySelector('input').disabled = true;
      const P = power();
      const e = Math.abs(P - r.P) / r.P;
      const s = e <= 0.02 ? 3 : e <= 0.05 ? 2 : e <= 0.1 ? 1 : 0;
      total += s;
      const unsettled = Math.abs(shown - P) > 0.01 * P;
      fill(result, 
        verdict(s, t('Eingestellt {a} W, nötig {b} W ({e} % daneben).', { a: num(P, 3), b: num(r.P, 3), e: num(e * 100, 2) })),
        unsettled ? h('p', { class: 'hint' }, t('Der Messkopf war noch nicht eingeschwungen, als du bestätigt hast.')) : null,
        h('p', { class: 'hint' }, t('E_p = F₀πw₀²/2 = {e} µJ, am Werkstück E_p·f = {pw} W, am Messort ÷ T = {p} W.', { e: num(r.Ep * 1e6, 3), pw: num(r.P * r.T, 3), p: num(r.P, 3) })),
        h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächster Auftrag')),
      );
    } }, t('Leistung übernehmen'));

    fill(stage, 
      head(round, ROUNDS, total),
      h('p', { class: 'game-task' }, t('Stelle am Messort (vor Scanner und Objektiv) die mittlere Leistung ein, die am Werkstück die Spitzenfluenz F₀ ergibt.')),
      task,
      box,
      ctl.el,
      fine,
      h('details', { class: 'sim-tasks' }, h('summary', {}, t('Tipp')), h('p', { class: 'small' }, t('Rechne zuerst E_p aus (w₀ in cm), dann P = E_p·f, dann durch T teilen. Den Taschenrechner erreichst du unten rechts.'))),
      go,
      result,
    );
  }

  intro(stage, {
    lead: 'Vor jeder Parameterstudie stellst du die Leistung ein. Die Leistung regelst du nicht am Laser, sondern mit einer λ/2-Platte vor einem Polarisator: Die Pulsform bleibt so unverändert.',
    steps: [
      'Ziel-Fluenz in Pulsenergie und mittlere Leistung umrechnen.',
      'Leistungsmesser in den Strahl, λ/2-Platte drehen.',
      'Warten, bis der thermische Messkopf stabil anzeigt.',
      'Verluste der folgenden Optiken (Transmission T) einrechnen.',
    ],
    checklist: ['Laserschutzbrille für die Wellenlänge aufgesetzt', 'Messkopf für die Leistung ausgelegt, Strahl trifft die Mitte'],
    onStart: start,
  });
}
