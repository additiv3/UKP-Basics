// Game block: block.spiel selects src/games/<spiel>.js (exports meta, mount(root, ctx)).
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import * as store from '../core/store.js';
import { recordGame } from '../core/progress.js';
import { toDay } from '../core/dates.js';
import { t } from '../core/i18n.js';

export async function gameCard(id, { showTitle = true } = {}) {
  if (!/^[a-z0-9-]+$/.test(id)) return h('div', {}, 'Invalid game.');
  let mod;
  try {
    mod = await import(`../games/${id}.js`);
  } catch {
    return h('div', { class: 'hint' }, `Spiel „${id}" konnte nicht geladen werden.`);
  }
  const best = h('span', { class: 'chip' });
  const showBest = () => {
    const b = store.get().games[id]?.best ?? 0;
    best.textContent = b ? t('Bestwert {n}', { n: b }) : t('Noch kein Bestwert');
  };
  showBest();
  const body = h('div', { class: 'game' });
  mod.mount(body, {
    record(score) {
      let res;
      store.mutate((s) => {
        res = recordGame(s, id, score, toDay());
      });
      showBest();
      return res;
    },
  });
  return h('div', { class: 'sim game-card' }, showTitle ? h('div', { class: 'sim-head' }, h('span', { class: 'sim-tag game', html: `${icon('star', 14)} ${t('Spiel')}` }), h('strong', { class: 'sim-title' }, t(mod.meta.titel)), best) : null, body);
}

export async function render(block) {
  return gameCard(block.spiel);
}
