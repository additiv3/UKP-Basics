import { h } from '../ui/dom.js';
import { math, rich } from '../core/richtext.js';
import { t } from '../core/i18n.js';

export function render(block) {
  return h(
    'div',
    {},
    h('div', { class: 'formula', html: math(block.latex, true), role: 'math' }),
    block.einheit ? h('p', { class: 'formula-unit' }, t('Einheit:'), ' ', h('span', { html: math(block.einheit.includes('\\') ? block.einheit : `\\mathrm{${block.einheit}}`) })) : null,
    block.erklaerung ? h('div', { class: 'prose small', html: rich(block.erklaerung) }) : null,
  );
}
