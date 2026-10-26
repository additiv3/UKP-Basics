// Shared pieces for the lab games: intro with checklist, round header, star verdict, final screen.
// (Underscore name: not loadable as a game id.)
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { t } from '../core/i18n.js';

/** replaceChildren that skips null/false (conditional children). */
export const fill = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));

export const stars = (n, max = 3) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, max - n))}`;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);
export const gauss = () => {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

/**
 * Intro card: scenario text, "so läuft es im Labor" steps and an optional safety checklist that
 * must be ticked before the start button unlocks.
 */
export function intro(stage, { lead, steps = [], checklist = [], onStart }) {
  const startBtn = h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: onStart }, t('Los geht’s'));
  const ticks = checklist.map((c) => {
    const box = h('button', { type: 'button', class: 'check-item', 'aria-pressed': 'false' }, h('span', { class: 'check-box', html: icon('check', 16) }), h('span', {}, t(c)));
    box.addEventListener('click', () => {
      box.classList.toggle('on');
      box.setAttribute('aria-pressed', String(box.classList.contains('on')));
      startBtn.disabled = ticks.some((b) => !b.classList.contains('on'));
    });
    return box;
  });
  startBtn.disabled = ticks.length > 0;
  stage.replaceChildren(
    h(
      'div',
      { class: 'game-intro' },
      h('p', { class: 'lead' }, t(lead)),
      steps.length ? h('div', { class: 'lab-steps' }, h('strong', {}, t('So läuft es im Labor')), h('ol', {}, steps.map((s) => h('li', {}, t(s))))) : null,
      ticks.length ? h('div', { class: 'checklist' }, h('strong', { html: `${icon('lock', 16)} ${t('Sicherheitscheck vor dem Einschalten')}` }), ticks) : null,
      startBtn,
    ),
  );
}

export function head(round, rounds, total, ...extra) {
  return h('div', { class: 'game-head' }, h('span', { class: 'chip' }, t('Runde {r}/{n}', { r: round, n: rounds })), h('span', { class: 'chip' }, `${total} ★`), ...extra);
}

export function verdict(n, text) {
  return h('p', { class: `verdict ${n ? 'ok' : 'bad'}` }, `${stars(n)}  ${text}`);
}

export function finishScreen(stage, ctx, total, max, lesson, onRestart) {
  const res = ctx.record(total);
  stage.replaceChildren(
    h(
      'div',
      { class: 'empty' },
      h('h2', {}, t('{a} von {b} Sternen', { a: total, b: max })),
      h('p', {}, res.newBest ? t('Neuer Bestwert!') : t('Bestwert: {n} ★', { n: res.best }), res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
      h('div', { class: 'callout' }, h('strong', { class: 'callout-title' }, t('Merke')), h('p', {}, t(lesson))),
      h('button', { type: 'button', class: 'btn btn-primary', onClick: onRestart }, t('Nochmal spielen')),
    ),
  );
}

/** Button that repeats while held (for knobs). */
export function holdButton(attrs, label, fn) {
  let timer = 0;
  let delay = 0;
  const stop = () => {
    clearTimeout(timer);
    timer = 0;
  };
  const tick = () => {
    fn();
    delay = Math.max(45, delay * 0.8);
    timer = setTimeout(tick, delay);
  };
  const b = h('button', { type: 'button', ...attrs }, label);
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stop();
    fn();
    delay = 260;
    timer = setTimeout(tick, delay);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
  b.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  });
  return b;
}
