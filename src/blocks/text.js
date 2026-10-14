import { h } from '../ui/dom.js';
import { rich, inline } from '../core/richtext.js';

export function render(block) {
  return h('div', {}, block.titel ? h('h3', { html: inline(block.titel) }) : null, h('div', { class: 'prose', html: rich(block.inhalt) }));
}
