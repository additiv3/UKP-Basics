// Game "Schwellenjäger": hit a target crater diameter by choosing the pulse energy (log law of ablation).
// Rounds 1-4 show a live preview, rounds 5-8 are blind (you have to calculate).
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, control, alpha } from '../sims/kit.js';
import { t } from '../core/i18n.js';

export const meta = { titel: 'Schwellenjäger', kurz: 'Triff den Kraterdurchmesser mit der richtigen Pulsenergie', max: 24 };

const ROUNDS = 8;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function newRound() {
  const w0 = pick([8, 10, 12, 15, 20, 25, 30]);
  const Fth = pick([0.3, 0.5, 0.8, 1, 1.5, 2, 3]);
  const k = pick([1.5, 2, 2.5, 3, 4, 5, 6, 8]);
  const D = Math.round(w0 * Math.sqrt(2 * Math.log(k)) * 10) / 10;
  return { w0, Fth, D };
}

const craterD = (Ep, w0, Fth) => {
  const F0 = (2 * Ep * 1e-6) / (Math.PI * (w0 * 1e-4) ** 2);
  return F0 > Fth ? w0 * Math.sqrt(2 * Math.log(F0 / Fth)) : 0;
};
const idealEp = (r) => (Math.exp((r.D * r.D) / (2 * r.w0 * r.w0)) * r.Fth * Math.PI * (r.w0 * 1e-4) ** 2) / 2 / 1e-6;

const starsFor = (err) => (err <= 0.02 ? 3 : err <= 0.06 ? 2 : err <= 0.15 ? 1 : 0);

export function mount(root, ctx) {
  let round = 0;
  let total = 0;
  let r = null;
  let Ep = 5;
  let fired = false;

  const stage = h('div', { class: 'game-stage' });
  root.append(stage);

  function start() {
    round = 0;
    total = 0;
    next();
  }

  function next() {
    round += 1;
    if (round > ROUNDS) return finish();
    r = newRound();
    fired = false;
    Ep = 5;
    draw();
  }

  function draw() {
    const blind = round > 4;
    const head = h('div', { class: 'game-head' }, h('span', { class: 'chip' }, t('Runde {r}/{n}', { r: round, n: ROUNDS })), h('span', { class: 'chip' }, `${total} ★`), blind ? h('span', { class: 'chip warn' }, t('Blindflug')) : null);
    const task = h('p', { class: 'game-task' }, t('Erzeuge einen Krater mit'), ' ', h('strong', {}, `D = ${num(r.D, 3)} µm`), '.');
    const given = h('p', { class: 'hint' }, t('Probe: Schwelle F_th = {f} J/cm², Strahlradius w₀ = {w} µm. Es gilt D² = 2w₀² ln(F₀/F_th) mit F₀ = 2E_p/(πw₀²).', { f: num(r.Fth, 3), w: r.w0 }));

    const box = h('div', { class: 'sim-canvas-box' });
    const view = canvasView(box, {
      aspect: 0.55,
      draw(c, W, H, pal) {
        const s = (Math.min(W / 2, H / 2) - 12) / (r.w0 * 1.9);
        const cx = W / 2;
        const cy = H / 2;
        c.save();
        c.strokeStyle = pal.soft;
        c.setLineDash([4, 4]);
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(cx, cy, r.w0 * s, 0, Math.PI * 2);
        c.stroke();
        c.restore();
        c.fillStyle = pal.muted;
        c.font = '600 11px system-ui, sans-serif';
        c.textAlign = 'left';
        c.fillText(t('w₀'), cx + r.w0 * s * 0.72 + 4, cy - r.w0 * s * 0.72 - 4);
        const d = fired || !blind ? craterD(Ep, r.w0, r.Fth) : 0;
        if (d > 0) {
          const grad = c.createRadialGradient(cx, cy, 0, cx, cy, (d / 2) * s);
          grad.addColorStop(0, alpha(pal.laser, 0.95));
          grad.addColorStop(1, alpha(pal.laser, 0.55));
          c.fillStyle = grad;
          c.beginPath();
          c.arc(cx, cy, (d / 2) * s, 0, Math.PI * 2);
          c.fill();
        }
        c.strokeStyle = pal.accent;
        c.lineWidth = 2.5;
        c.setLineDash([8, 5]);
        c.beginPath();
        c.arc(cx, cy, (r.D / 2) * s, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = pal.accent;
        c.font = '700 11.5px system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText(t('Ziel'), cx, cy - (r.D / 2) * s - 6);
        if (blind && !fired) {
          c.fillStyle = pal.muted;
          c.fillText(t('Blindflug: Rechne, dann „Feuer“'), cx, H - 10);
        }
      },
    });
    view.canvas.setAttribute('aria-label', t('Draufsicht auf die Probe mit Zielkreis und erzeugtem Krater'));

    const ctl = control({
      label: 'Pulsenergie E_p',
      unit: 'µJ',
      min: 0.05,
      max: 3000,
      value: Ep,
      log: true,
      onInput: (v) => {
        Ep = v;
        live.textContent = liveText();
        view.redraw();
      },
    });
    const liveText = () => (blind ? t('Kein Live-Feedback in dieser Runde.') : t('F₀/F_th = {x} · aktueller Krater: {c}', { x: num(((2 * Ep * 1e-6) / (Math.PI * (r.w0 * 1e-4) ** 2)) / r.Fth, 3), c: craterD(Ep, r.w0, r.Fth) ? `${num(craterD(Ep, r.w0, r.Fth), 3)} µm` : t('keiner') }));
    const live = h('p', { class: 'game-live' }, liveText());

    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });
    const fire = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary btn-wide',
        onClick: () => {
          fired = true;
          fire.disabled = true;
          ctl.el.querySelector('input').disabled = true;
          const d = craterD(Ep, r.w0, r.Fth);
          const err = d > 0 ? Math.abs(d - r.D) / r.D : 1;
          const stars = starsFor(err);
          total += stars;
          view.redraw();
          result.replaceChildren(
            h('p', { class: `verdict ${stars ? 'ok' : 'bad'}` }, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ` + t('D = {d} µm (Ziel {z} µm, Abweichung {e} %)', { d: d ? num(d, 3) : '0', z: num(r.D, 3), e: num(err * 100, 2) })),
            h('p', { class: 'hint' }, t('Ideal wären E_p ≈ {e} µJ gewesen.', { e: num(idealEp(r), 3) })),
            h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächste Runde')),
          );
        },
      },
      t('Feuer!'),
    );

    stage.replaceChildren(head, task, given, box, ctl.el, live, fire, result);
  }

  function finish() {
    const res = ctx.record(total);
    stage.replaceChildren(
      h(
        'div',
        { class: 'empty' },
        h('h2', {}, t('{a} von {b} Sternen', { a: total, b: ROUNDS * 3 })),
        h('p', {}, res.newBest ? t('Neuer Bestwert!') : t('Bestwert: {n} ★', { n: res.best }), res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
        h('p', { class: 'hint' }, t('Merke: Der Krater wächst nur logarithmisch mit der Pulsenergie. Für doppelte Fläche brauchst du viel mehr als doppelte Energie.')),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: start }, t('Nochmal spielen')),
      ),
    );
  }

  stage.append(
    h(
      'div',
      { class: 'empty' },
      h('p', {}, t('8 Runden. In den ersten vier siehst du den Krater live, danach fliegst du blind. Pro Runde bis zu 3 Sterne.')),
      h('button', { type: 'button', class: 'btn btn-primary', onClick: start }, t('Spiel starten')),
    ),
  );
}
