import { h } from '../ui/dom.js';
import { rich } from '../core/richtext.js';

export function render(block) {
  return h('aside', { class: 'callout' }, h('strong', { class: 'callout-title' }, block.titel ?? 'Merke'), h('div', { class: 'prose', html: rich(block.inhalt) }));
}
