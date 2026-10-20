// Game "Rechenwerkstatt": randomised calculation tasks for the phone. Pocket calculator built in, formula hint on demand.
// All tasks are definitions of pulse and beam quantities (no material data). 3 points per task, 2 with the formula hint.
import { h } from '../ui/dom.js';
import { math, inline } from '../core/richtext.js';
import { t } from '../core/i18n.js';
import { numberField } from '../blocks/quiz.js';

export const meta = { titel: 'Rechenwerkstatt', kurz: 'Zufällige Rechenaufgaben mit Taschenrechner und Formelhinweis', max: 24 };

const ROUNDS = 8;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fx = (x) => Number(x.toPrecision(3)); // short number for the solution line

/** Each generator returns { q, given[], formula (latex), steps (latex), ans, unit (plain), tol }. */
const TOPICS = {
  power: {
    label: 'Energie und Leistung',
    gens: [
      () => {
        const Ep = pick([2, 5, 10, 20, 50, 100]);
        const f = pick([10, 20, 50, 100, 200, 500, 1000]);
        const ans = (Ep * f) / 1000;
        return { q: 'Wie hoch ist die mittlere Leistung?', given: [`$E_\\mathrm{p}=${Ep}\\,\\mu\\mathrm{J}$`, `$f=${f}\\,\\mathrm{kHz}$`], formula: 'P_\\mathrm{avg}=E_\\mathrm{p}\\cdot f', steps: `P_\\mathrm{avg}=${Ep}\\cdot10^{-6}\\,\\mathrm{J}\\cdot${f}\\cdot10^{3}\\,\\mathrm{s^{-1}}=${fx(ans)}\\,\\mathrm{W}`, ans, unit: 'W' };
      },
      () => {
        const Ep = pick([1, 2, 5, 10, 20, 50, 100]);
        const tau = pick([100, 200, 250, 300, 400, 500, 800]);
        const ans = (Ep * 1e-6) / (tau * 1e-15) / 1e6;
        return { q: 'Wie hoch ist die Spitzenleistung (Näherung)? Antwort in MW.', given: [`$E_\\mathrm{p}=${Ep}\\,\\mu\\mathrm{J}$`, `$\\tau=${tau}\\,\\mathrm{fs}$`], formula: 'P_\\mathrm{peak}\\approx\\frac{E_\\mathrm{p}}{\\tau}', steps: `P_\\mathrm{peak}\\approx\\frac{${Ep}\\cdot10^{-6}\\,\\mathrm{J}}{${tau}\\cdot10^{-15}\\,\\mathrm{s}}=${fx(ans)}\\cdot10^{6}\\,\\mathrm{W}`, ans, unit: 'MW' };
      },
      () => {
        const P = pick([1, 2, 5, 10, 20, 40]);
        const f = pick([50, 100, 200, 400, 500, 1000]);
        const ans = (P / (f * 1e3)) * 1e6;
        return { q: 'Welche Pulsenergie hat der Laser? Antwort in µJ.', given: [`$P_\\mathrm{avg}=${P}\\,\\mathrm{W}$`, `$f=${f}\\,\\mathrm{kHz}$`], formula: 'E_\\mathrm{p}=\\frac{P_\\mathrm{avg}}{f}', steps: `E_\\mathrm{p}=\\frac{${P}\\,\\mathrm{W}}{${f}\\cdot10^{3}\\,\\mathrm{s^{-1}}}=${fx(ans)}\\cdot10^{-6}\\,\\mathrm{J}`, ans, unit: 'µJ' };
      },
      () => {
        const f = pick([10, 20, 50, 100, 200, 500, 1000]);
        const ans = 1000 / f;
        return { q: 'Wie groß ist der zeitliche Abstand zweier Pulse? Antwort in µs.', given: [`$f=${f}\\,\\mathrm{kHz}$`], formula: 'T=\\frac{1}{f}', steps: `T=\\frac{1}{${f}\\cdot10^{3}\\,\\mathrm{s^{-1}}}=${fx(ans)}\\cdot10^{-6}\\,\\mathrm{s}`, ans, unit: 'µs' };
      },
    ],
  },
  fluence: {
    label: 'Fluenz und Intensität',
    gens: [
      () => {
        const Ep = pick([2, 5, 8, 10, 20, 40]);
        const w0 = pick([5, 8, 10, 12, 15, 20, 25]);
        const ans = (2 * Ep * 1e-6) / (Math.PI * (w0 * 1e-4) ** 2);
        return { q: 'Wie hoch ist die Spitzenfluenz eines Gauß-Strahls?', given: [`$E_\\mathrm{p}=${Ep}\\,\\mu\\mathrm{J}$`, `$w_0=${w0}\\,\\mu\\mathrm{m}$`], formula: 'F_0=\\frac{2E_\\mathrm{p}}{\\pi w_0^2}', steps: `F_0=\\frac{2\\cdot${Ep}\\cdot10^{-6}\\,\\mathrm{J}}{\\pi\\,(${w0}\\cdot10^{-4}\\,\\mathrm{cm})^2}=${fx(ans)}\\,\\mathrm{J/cm^2}`, ans, unit: 'J/cm²', tip: 'Rechne w₀ erst in cm um: 1 µm = 10⁻⁴ cm.' };
      },
      () => {
        const F0 = pick([0.5, 1, 2, 3, 5, 8]);
        const tau = pick([100, 200, 300, 500, 1000]);
        const ans = F0 / (tau * 1e-15) / 1e12;
        return { q: 'Wie hoch ist die Spitzenintensität (Näherung)? Antwort in 10¹² W/cm².', given: [`$F_0=${F0}\\,\\mathrm{J/cm^2}$`, `$\\tau=${tau}\\,\\mathrm{fs}$`], formula: 'I_0\\approx\\frac{F_0}{\\tau}', steps: `I_0\\approx\\frac{${F0}\\,\\mathrm{J/cm^2}}{${tau}\\cdot10^{-15}\\,\\mathrm{s}}=${fx(ans)}\\cdot10^{12}\\,\\mathrm{W/cm^2}`, ans, unit: '·10¹² W/cm²' };
      },
      () => {
        const w0 = pick([8, 10, 15, 20, 25]);
        const k = pick([2, 3, 4, 5, 6]);
        const D = w0 * Math.sqrt(2 * Math.log(k));
        return { q: 'Welchen Kraterdurchmesser erzeugt der Puls (Gauß-Strahl, logarithmisches Abtragsgesetz)? Antwort in µm.', given: [`$w_0=${w0}\\,\\mu\\mathrm{m}$`, `$F_0/F_\\mathrm{th}=${k}$`], formula: 'D^2=2w_0^2\\ln\\frac{F_0}{F_\\mathrm{th}}', steps: `D=w_0\\sqrt{2\\ln k}=${w0}\\,\\mu\\mathrm{m}\\cdot\\sqrt{2\\ln ${k}}=${fx(D)}\\,\\mu\\mathrm{m}`, ans: D, unit: 'µm', tip: 'ln ist die ln-Taste des Rechners (natürlicher Logarithmus).' };
      },
    ],
  },
  optics: {
    label: 'Licht und Photonen',
    gens: [
      () => {
        const tau = pick([10, 30, 100, 200, 300, 500, 1000]);
        const ans = (3e8 * tau * 1e-15) / 1e-6;
        return { q: 'Wie lang ist der Puls im Vakuum? Antwort in µm.', given: [`$\\tau=${tau}\\,\\mathrm{fs}$`, `$c\\approx3\\cdot10^{8}\\,\\mathrm{m/s}$`], formula: '\\Delta s=c\\cdot\\tau', steps: `\\Delta s=3\\cdot10^{8}\\,\\mathrm{m/s}\\cdot${tau}\\cdot10^{-15}\\,\\mathrm{s}=${fx(ans)}\\,\\mu\\mathrm{m}`, ans, unit: 'µm' };
      },
      () => {
        const lam = pick([343, 355, 515, 532, 800, 1030, 1064]);
        const ans = 1239.84 / lam;
        return { q: 'Welche Photonenenergie hat das Licht? Antwort in eV.', given: [`$\\lambda=${lam}\\,\\mathrm{nm}$`, `$hc\\approx1239{,}84\\,\\mathrm{eV\\,nm}$`], formula: 'h\\nu=\\frac{hc}{\\lambda}', steps: `h\\nu=\\frac{1239{,}84\\,\\mathrm{eV\\,nm}}{${lam}\\,\\mathrm{nm}}=${fx(ans)}\\,\\mathrm{eV}`, ans, unit: 'eV', tol: 0.02 };
      },
      () => {
        const lam = pick([343, 515, 1030]);
        const Eg = pick([3, 4.5, 6, 7, 8, 9]);
        const E = 1239.84 / lam;
        const ans = Math.ceil(Eg / E);
        return { q: 'Wie viele Photonen braucht es mindestens, um die Bandlücke in einem Schritt zu überwinden? (Ganze Zahl)', given: [`$\\lambda=${lam}\\,\\mathrm{nm}$`, `$E_\\mathrm{g}=${Eg}\\,\\mathrm{eV}$ (${t('frei gewählt')})`], formula: 'n_\\mathrm{min}=\\left\\lceil\\frac{E_\\mathrm{g}}{h\\nu}\\right\\rceil', steps: `h\\nu=${fx(E)}\\,\\mathrm{eV},\\quad \\frac{${Eg}}{${fx(E)}}=${fx(Eg / E)}\\ \\Rightarrow\\ n_\\mathrm{min}=${ans}`, ans, unit: '', tol: 0, tip: 'Immer aufrunden: ein halbes Photon gibt es nicht.' };
      },
      () => {
        const lam = pick([515, 800, 1030, 1064]);
        const w0 = pick([5, 8, 10, 15, 20]);
        const M2 = pick([1, 1.1, 1.2, 1.5]);
        const ans = (Math.PI * w0 * w0) / (M2 * (lam / 1000));
        return { q: 'Wie groß ist die Rayleighlänge? Antwort in µm.', given: [`$\\lambda=${lam}\\,\\mathrm{nm}$`, `$w_0=${w0}\\,\\mu\\mathrm{m}$`, `$M^2=${M2}$`], formula: 'z_\\mathrm{R}=\\frac{\\pi w_0^2}{M^2\\lambda}', steps: `z_\\mathrm{R}=\\frac{\\pi\\,(${w0}\\,\\mu\\mathrm{m})^2}{${M2}\\cdot${lam / 1000}\\,\\mu\\mathrm{m}}=${fx(ans)}\\,\\mu\\mathrm{m}`, ans, unit: 'µm', tip: 'Rechne λ in µm: 1030 nm = 1,03 µm.' };
      },
      () => {
        const tau = pick([30, 50, 100, 200, 300, 500]);
        const ans = 0.441 / (tau * 1e-15) / 1e12;
        return { q: 'Welche spektrale Mindestbreite (Fourier-Limit, Gauß-Puls) hat der Puls? Antwort in THz.', given: [`$\\tau=${tau}\\,\\mathrm{fs}$ (FWHM)`, `$\\tau\\cdot\\Delta\\nu\\ge0{,}441$`], formula: '\\Delta\\nu=\\frac{0{,}441}{\\tau}', steps: `\\Delta\\nu=\\frac{0{,}441}{${tau}\\cdot10^{-15}\\,\\mathrm{s}}=${fx(ans)}\\,\\mathrm{THz}`, ans, unit: 'THz' };
      },
    ],
  },
  process: {
    label: 'Prozess und Scannen',
    gens: [
      () => {
        const v = pick([0.5, 1, 2, 5, 10]);
        const f = pick([50, 100, 200, 500, 1000]);
        const ans = (v / (f * 1e3)) * 1e6;
        return { q: 'Wie groß ist der Pulsabstand auf der Spur? Antwort in µm.', given: [`$v=${v}\\,\\mathrm{m/s}$`, `$f=${f}\\,\\mathrm{kHz}$`], formula: 'd=\\frac{v}{f}', steps: `d=\\frac{${v}\\,\\mathrm{m/s}}{${f}\\cdot10^{3}\\,\\mathrm{s^{-1}}}=${fx(ans)}\\,\\mu\\mathrm{m}`, ans, unit: 'µm' };
      },
      () => {
        const w0 = pick([10, 15, 20, 25]);
        const d = pick([2, 4, 5, 10]);
        const ans = (2 * w0) / d;
        return { q: 'Wie viele Pulse treffen (näherungsweise) einen Punkt der Spur? Die Näherung ist Spotdurchmesser durch Pulsabstand.', given: [`$w_0=${w0}\\,\\mu\\mathrm{m}$`, `$d=${d}\\,\\mu\\mathrm{m}$`], formula: 'N\\approx\\frac{2w_0}{d}', steps: `N\\approx\\frac{2\\cdot${w0}\\,\\mu\\mathrm{m}}{${d}\\,\\mu\\mathrm{m}}=${fx(ans)}`, ans, unit: '' };
      },
      () => {
        const v = pick([1, 2, 5]);
        const h2 = pick([5, 10, 20]);
        const rate = v * 1000 * h2 * 1e-3;
        return { q: 'Wie groß ist die Flächenrate? Antwort in mm²/s.', given: [`$v=${v}\\,\\mathrm{m/s}$`, `$h=${h2}\\,\\mu\\mathrm{m}$`], formula: '\\dot A=v\\cdot h', steps: `\\dot A=${v * 1000}\\,\\mathrm{mm/s}\\cdot${h2 * 1e-3}\\,\\mathrm{mm}=${fx(rate)}\\,\\mathrm{mm^2/s}`, ans: rate, unit: 'mm²/s', tip: 'Beide Längen in mm: 1 m/s = 1000 mm/s und 1 µm = 10⁻³ mm.' };
      },
    ],
  },
};

const ALL = Object.values(TOPICS).flatMap((tp) => tp.gens);

function makeTask(topic) {
  const gens = topic === 'mix' ? ALL : TOPICS[topic].gens;
  const g = pick(gens)();
  return { ...g, tol: g.tol ?? 0.03 };
}

export function mount(root, ctx) {
  const stage = h('div', { class: 'game-stage' });
  root.append(stage);
  let topic = 'mix';

  function intro() {
    const chip = (id, label) => h('button', { type: 'button', class: `chip btn-chip ${topic === id ? 'on' : ''}`, onClick: () => { topic = id; intro(); } }, t(label));
    stage.replaceChildren(
      h(
        'div',
        { class: 'empty' },
        h('p', {}, t('8 Aufgaben mit zufälligen Zahlen. Nutze den Taschenrechner (Knopf bei der Antwort) und tippe, wenn du magst, den Formelhinweis an. Drei Punkte pro Aufgabe, zwei mit Hinweis.')),
        h('div', { class: 'chips' }, chip('mix', 'Alles gemischt'), Object.entries(TOPICS).map(([id, tp]) => chip(id, tp.label))),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: () => start() }, t('Los geht’s')),
      ),
    );
  }

  function start() {
    let round = 0;
    let points = 0;
    next();

    function next() {
      round += 1;
      if (round > ROUNDS) return finish(points);
      const task = makeTask(topic);
      let usedHint = false;
      let done = false;
      const hint = h('div', { class: 'hint-box prose small', hidden: true }, h('div', { html: math(task.formula, true) }), task.tip ? h('p', { class: 'hint' }, t(task.tip)) : null);
      const hintBtn = h('button', { type: 'button', class: 'chip btn-chip hint-btn', onClick: () => { usedHint = true; hint.hidden = false; hintBtn.remove(); } }, t('Formelhinweis (−1 Punkt)'));
      const block = { antwort: task.ans, einheit: task.unit, toleranz: task.tol };
      const checkBtn = h('button', { type: 'button', class: 'btn btn-primary', onClick: () => check() }, t('Prüfen'));
      const field = numberField(block, { onChange: () => { checkBtn.disabled = !field.valid(); }, submit: () => check() });
      checkBtn.disabled = true;
      const result = h('div', { class: 'game-result', 'aria-live': 'polite' });

      function check() {
        if (done || !field.valid()) return;
        done = true;
        const ok = field.correct();
        field.lock(ok);
        checkBtn.remove();
        hintBtn.remove();
        hint.hidden = true;
        const gain = ok ? (usedHint ? 2 : 3) : 0;
        points += gain;
        result.replaceChildren(
          h('p', { class: `verdict ${ok ? 'ok' : 'bad'}` }, ok ? t('Richtig!') : t('Nicht ganz.'), gain ? h('span', { class: 'xp-chip' }, ` +${gain}`) : null),
          ok ? null : h('p', { class: 'right-answer' }, field.solution()),
          h('div', { class: 'formula small', html: math(`${task.formula}\\ \\Rightarrow\\ ${task.steps}`, true) }),
          h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächste Aufgabe')),
        );
      }

      stage.replaceChildren(
        h('div', { class: 'game-head' }, h('span', { class: 'chip' }, t('Aufgabe {r}/{n}', { r: round, n: ROUNDS })), h('span', { class: 'chip' }, t('{n} Punkte', { n: points }))),
        h('p', { class: 'game-task' }, t(task.q)),
        h('div', { class: 'given' }, h('span', { class: 'given-label' }, t('Gegeben')), task.given.map((g) => h('span', { class: 'chip given-chip', html: inline(g) }))),
        hintBtn,
        hint,
        field.el,
        h('div', { class: 'quiz-actions' }, checkBtn),
        result,
      );
    }
  }

  function finish(points) {
    const res = ctx.record(points);
    stage.replaceChildren(
      h(
        'div',
        { class: 'empty' },
        h('h2', {}, t('{n} Punkte', { n: points })),
        h('p', {}, t('von {max} möglichen.', { max: ROUNDS * 3 })),
        h('p', {}, res.newBest ? t('Neuer Bestwert!') : t('Bestwert: {n}', { n: res.best }), res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: intro }, t('Nochmal')),
      ),
    );
  }

  intro();
}
