// Flashcard with SM-2 grading: Nochmal / Schwer / Gut / Leicht (quality 1/3/4/5).
import { h } from '../ui/dom.js';
import { rich } from '../core/richtext.js';
import * as store from '../core/store.js';
import { review, GRADE } from '../core/sm2.js';
import { toDay } from '../core/dates.js';
import { scoreCard, isKnown } from './scoring.js';

const GRADES = [
  ['Nochmal', GRADE.again],
  ['Schwer', GRADE.hard],
  ['Gut', GRADE.good],
  ['Leicht', GRADE.easy],
];

export const intervalText = (days) => (days <= 0 ? 'heute' : days === 1 ? '1 Tag' : `${days} Tage`);

export function render(block, ctx) {
  const flags = { known: isKnown(block.id) };
  const today = toDay();
  const back = h('div', { class: 'fc-back', hidden: true }, h('div', { class: 'prose', html: rich(block.hinten) }));
  const controls = h('div', { class: 'fc-controls' });
  const revealBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-primary',
      onClick: () => {
        back.hidden = false;
        revealBtn.remove();
        showGrades();
      },
    },
    'Antwort zeigen',
  );

  function showGrades() {
    if (ctx.mode === 'lesson' && flags.known) {
      controls.append(h('p', { class: 'hint' }, 'Übung: Diese Karte ist schon in deiner Wiederholung.'));
      return;
    }
    const current = store.get().items[block.id] ?? null;
    controls.append(
      h(
        'div',
        { class: 'grades' },
        GRADES.map(([label, q]) =>
          h(
            'button',
            {
              type: 'button',
              class: `btn grade grade-${q}`,
              onClick: () => {
                const res = scoreCard(block.id, q, ctx, flags);
                const it = store.get().items[block.id];
                if (ctx.mode === 'review') {
                  ctx.onNext?.(q >= 3);
                  return;
                }
                controls.replaceChildren(
                  h('p', { class: 'verdict ok' }, `Nächste Wiederholung: ${it ? (it.int === 0 ? 'heute' : 'in ' + intervalText(it.int)) : '–'}`, res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
                );
                ctx.onScored?.();
              },
            },
            h('span', { class: 'grade-label' }, label),
            h('span', { class: 'grade-int' }, intervalText(review(current, q, today).int)),
          ),
        ),
      ),
    );
  }

  return h('div', { class: 'flashcard' }, h('span', { class: 'quiz-tag' }, 'Karte'), h('div', { class: 'fc-front prose', html: rich(block.vorne) }), back, revealBtn, controls);
}
