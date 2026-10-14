// Interactive simulation block. block.modell selects src/sims/<modell>.js (exports meta, formel, aufgaben, mount).
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { math, inline } from '../core/richtext.js';

export async function loadSim(modell) {
  if (!/^[a-z0-9-]+$/.test(modell) || modell === 'kit') throw new Error('invalid model');
  return import(`../sims/${modell}.js`);
}

/** Full simulation card: title, formula, canvas + controls, experiment tasks. */
export async function simCard(modell, { titel, showTitle = true } = {}) {
  let mod;
  try {
    mod = await loadSim(modell);
  } catch {
    return h('div', { class: 'hint' }, `Simulation „${modell}" konnte nicht geladen werden.`);
  }
  const body = h('div', { class: 'sim-body' });
  mod.mount(body);
  return h(
    'div',
    { class: 'sim' },
    showTitle ? h('div', { class: 'sim-head' }, h('span', { class: 'sim-tag', html: `${icon('bolt', 14)} Interaktiv` }), h('strong', { class: 'sim-title' }, titel ?? mod.meta.titel)) : null,
    ...[].concat(mod.formel ?? []).map((f) => h('div', { class: 'formula small', html: math(f, true) })),
    body,
    mod.aufgaben?.length
      ? h(
          'details',
          { class: 'sim-tasks' },
          h('summary', {}, 'Experimentier-Aufgaben'),
          h('ul', {}, mod.aufgaben.map((a) => h('li', { html: inline(a) }))),
        )
      : null,
  );
}

export async function render(block) {
  return simCard(block.modell, { titel: block.titel });
}
