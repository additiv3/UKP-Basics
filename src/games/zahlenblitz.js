// Game "Zahlen-Blitz": 60 seconds of mental-math questions about pulse quantities. Everything is derived from definitions.
import { h } from '../ui/dom.js';
import { si, num } from '../core/format.js';

export const meta = { titel: 'Zahlen-Blitz', kurz: '60 Sekunden Kopfrechnen mit UKP-Größen', max: 40 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};
const DURATION = 60;

const PROBLEMS = [
  () => {
    const Ep = pick([2, 5, 10, 20, 50, 100]);
    const f = pick([10, 20, 50, 100, 200, 500, 1000]);
    const P = (Ep * f) / 1000;
    return { q: `Mittlere Leistung: E_p = ${Ep} µJ bei f = ${f} kHz`, hint: 'P = E_p · f', val: P, fmt: (x) => si(x, 'W', 2), distract: [P * 10, P / 10, P * 2, P / 2] };
  },
  () => {
    const Ep = pick([1, 2, 5, 10, 20, 50]);
    const tau = pick([100, 200, 250, 500, 1000]);
    const P = (Ep * 1e-6) / (tau * 1e-15);
    return { q: `Spitzenleistung: E_p = ${Ep} µJ, τ = ${tau} fs`, hint: 'P ≈ E_p / τ', val: P, fmt: (x) => si(x, 'W', 2), distract: [P * 10, P / 10, P * 1000, P / 2] };
  },
  () => {
    const tau = pick([10, 30, 100, 200, 300, 500, 1000, 3000]);
    const s = 3e8 * tau * 1e-15;
    return { q: `Wie weit kommt Licht im Vakuum in ${tau} fs?`, hint: 'Δs = c · τ, c ≈ 3·10⁸ m/s', val: s, fmt: (x) => si(x, 'm', 2), distract: [s * 10, s / 10, s * 1000, s / 1000] };
  },
  () => {
    const lam = pick([343, 355, 515, 532, 800, 1030, 1064]);
    const E = 1239.84 / lam;
    return { q: `Photonenenergie bei λ = ${lam} nm`, hint: 'hν ≈ 1240 eV·nm / λ', val: E, fmt: (x) => `${num(x, 3)} eV`, distract: [E * 2, E / 2, E * 4, E / 3] };
  },
  () => {
    const Ep = pick([5, 10, 20, 40, 100]);
    const w0 = pick([5, 10, 15, 20, 25]);
    const F = (2 * Ep * 1e-6) / (Math.PI * (w0 * 1e-4) ** 2);
    return { q: `Spitzenfluenz: E_p = ${Ep} µJ, w₀ = ${w0} µm`, hint: 'F₀ = 2E_p / (π w₀²)', val: F, fmt: (x) => `${num(x, 2)} J/cm²`, distract: [F * Math.PI, F / 2, F * 10, F / 10] };
  },
];

function makeQuestion() {
  const p = pick(PROBLEMS)();
  const wrong = [];
  for (const d of shuffle(p.distract)) {
    if (wrong.length < 3 && p.fmt(d) !== p.fmt(p.val) && !wrong.some((w) => p.fmt(w) === p.fmt(d))) wrong.push(d);
  }
  return { ...p, options: shuffle([p.val, ...wrong]).map((v) => ({ v, label: p.fmt(v), ok: v === p.val })) };
}

export function mount(root, ctx) {
  const stage = h('div', { class: 'game-stage' });
  root.append(stage);
  let timer = 0;

  function start() {
    let left = DURATION;
    let correct = 0;
    let streak = 0;
    let bestStreak = 0;
    let q = null;
    const timeBar = h('div', { class: 'progress-fill' });
    const clock = h('span', { class: 'chip' }, `${left} s`);
    const score = h('span', { class: 'chip' }, '0 ✓');
    const box = h('div', { class: 'game-q' });
    stage.replaceChildren(h('div', { class: 'game-head' }, clock, score), h('div', { class: 'progress' }, timeBar), box);

    const ask = () => {
      q = makeQuestion();
      box.replaceChildren(
        h('p', { class: 'game-task' }, q.q),
        h('p', { class: 'hint' }, q.hint),
        h(
          'div',
          { class: 'opts' },
          q.options.map((o) =>
            h(
              'button',
              {
                type: 'button',
                class: 'opt',
                onClick: (e) => {
                  const btn = e.currentTarget;
                  box.querySelectorAll('.opt').forEach((b) => (b.disabled = true));
                  if (o.ok) {
                    btn.classList.add('ok');
                    correct += 1;
                    streak += 1;
                    bestStreak = Math.max(bestStreak, streak);
                  } else {
                    btn.classList.add('bad');
                    box.querySelectorAll('.opt').forEach((b, i) => q.options[i].ok && b.classList.add('ok'));
                    streak = 0;
                  }
                  score.textContent = `${correct} ✓${streak >= 3 ? ` · ${streak}er-Serie` : ''}`;
                  setTimeout(ask, o.ok ? 350 : 900);
                },
              },
              o.label,
            ),
          ),
        ),
      );
    };
    ask();

    clearInterval(timer);
    const t0 = performance.now();
    timer = setInterval(() => {
      if (!stage.isConnected) return clearInterval(timer);
      left = Math.max(0, DURATION - Math.floor((performance.now() - t0) / 1000));
      clock.textContent = `${left} s`;
      timeBar.style.width = `${(left / DURATION) * 100}%`;
      if (left <= 0) {
        clearInterval(timer);
        finish(correct, bestStreak);
      }
    }, 200);
    timeBar.style.width = '100%';
  }

  function finish(correct, bestStreak) {
    const points = correct + Math.floor(bestStreak / 5);
    const res = ctx.record(points);
    stage.replaceChildren(
      h(
        'div',
        { class: 'empty' },
        h('h2', {}, `${points} Punkte`),
        h('p', {}, `${correct} richtig, längste Serie ${bestStreak} (Bonus: 1 Punkt je 5er-Serie).`),
        h('p', {}, res.newBest ? 'Neuer Bestwert!' : `Bestwert: ${res.best}`, res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: start }, 'Nochmal'),
      ),
    );
  }

  stage.append(
    h(
      'div',
      { class: 'empty' },
      h('p', {}, 'Du hast 60 Sekunden. Rechne im Kopf (die Formel steht als Hinweis dabei) und tippe die richtige Zahl. Falsche Antworten kosten nichts, brechen aber deine Serie.'),
      h('button', { type: 'button', class: 'btn btn-primary', onClick: start }, 'Los geht’s'),
    ),
  );
}
