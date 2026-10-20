// DE | EN toggle. Calls app.setLang(lang), which reloads content and re-renders the current view.
import { h } from './dom.js';
import { getLang } from '../core/i18n.js';

export function langSwitch(app, extraClass = '') {
  const cur = getLang();
  const btn = (id, label, aria) => h('button', { type: 'button', class: id === cur ? 'on' : '', 'aria-pressed': String(id === cur), 'aria-label': aria, onClick: () => id !== cur && app.setLang(id) }, label);
  return h('div', { class: `langswitch ${extraClass}`, role: 'group', 'aria-label': 'Language / Sprache' }, btn('de', 'DE', 'Deutsch'), btn('en', 'EN', 'English'));
}
