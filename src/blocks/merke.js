import { h } from '../ui/dom.js';
import { rich } from '../core/richtext.js';
import { t } from '../core/i18n.js';

export function render(block) {
  return h('aside', { class: 'callout' }, h('strong', { class: 'callout-title' }, block.titel ?? t('Merke')), h('div', { class: 'prose', html: rich(block.inhalt) }));
}
