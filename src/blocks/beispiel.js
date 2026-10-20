// Worked example: the task is visible, the solution is revealed on tap (active recall first).
import { h } from '../ui/dom.js';
import { rich, inline } from '../core/richtext.js';
import { t } from '../core/i18n.js';

export function render(block) {
  const solution = h(
    'div',
    { class: 'example-solution', hidden: true },
    h('ol', { class: 'steps' }, (block.schritte ?? []).map((s) => h('li', { html: inline(s) }))),
    block.ergebnis ? h('p', { class: 'example-result', html: inline(block.ergebnis) }) : null,
  );
  const btn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost',
      onClick: () => {
        solution.hidden = !solution.hidden;
        btn.textContent = solution.hidden ? t('Lösung zeigen') : t('Lösung verbergen');
      },
    },
    t('Lösung zeigen'),
  );
  return h('div', {}, h('strong', { class: 'callout-title' }, block.titel ?? t('Rechenbeispiel')), h('div', { class: 'prose', html: rich(block.aufgabe) }), btn, solution);
}
