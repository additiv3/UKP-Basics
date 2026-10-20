// Vocabulary trainer: every glossary term becomes two flashcards (DE -> EN and EN -> DE) with SM-2 repetition.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { dueIds } from '../../core/progress.js';
import { toDay } from '../../core/dates.js';
import { shuffled } from '../dom.js';
import { t } from '../../core/i18n.js';
import { runSession } from './review.js';
import { langSwitch } from '../langswitch.js';

const DIRS = [
  { id: 'both', label: 'Beide' },
  { id: 'de', label: 'DE → EN' },
  { id: 'en', label: 'EN → DE' },
];
const NEW_PER_ROUND = 10;

const dirOk = (id, dir) => dir === 'both' || id.endsWith(`.${dir}`);

export async function render(_params, app) {
  const { data } = app;
  const state = store.get();
  const dir = state.settings.vokDir ?? 'both';
  const today = toDay();
  const cards = data.vocab.filter((c) => dirOk(c.id, dir));
  const known = cards.filter((c) => state.items[c.id]);
  const due = dueIds(state, today).filter((id) => id.startsWith('v.') && data.items.has(id) && dirOk(id, dir));
  const fresh = shuffled(cards.filter((c) => !state.items[c.id])).slice(0, NEW_PER_ROUND).map((c) => c.id);

  const page = h('div', { class: 'page vocab' });
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const mode = params.get('start');

  if (mode) {
    const ids = mode === 'due' ? due.slice(0, 20) : mode === 'new' ? fresh : [...due.slice(0, 10), ...fresh].slice(0, 20);
    if (ids.length) {
      await runSession(app, page, ids, { backHref: '#/vokabeln', kicker: t('Vokabeln'), moreHref: '#/vokabeln', moreLabel: t('Zur Vokabelübersicht') });
      return page;
    }
  }

  const stat = (v, l) => h('div', { class: 'stat' }, h('strong', {}, String(v)), h('span', {}, l));
  const start = (m) => () => {
    location.hash = `#/vokabeln?start=${m}`;
  };

  return h(
    'div',
    { class: 'page vocab' },
    h('div', { class: 'row-between' }, h('div', {}, h('p', { class: 'kicker' }, 'Vocabulary'), h('h1', {}, t('Vokabeln'))), langSwitch(app)),
    h('p', { class: 'lead' }, t('Alle Fachbegriffe des Glossars als Karteikarten in beide Richtungen. Du musst die Begriffe auf Englisch sicher benennen und verstehen können.')),
    h('section', { class: 'stats three' }, stat(cards.length, t('Karten')), stat(known.length, t('begonnen')), stat(due.length, t('fällig'))),
    h(
      'div',
      { class: 'segmented wide', role: 'group' },
      DIRS.map((d) => h('button', { type: 'button', class: `seg ${d.id === dir ? 'on' : ''}`, onClick: () => { store.mutate((s) => { s.settings.vokDir = d.id; }); app.rerender(); } }, t(d.label))),
    ),
    h(
      'div',
      { class: 'quiz-actions col' },
      h('button', { type: 'button', class: 'btn btn-primary btn-wide', disabled: !due.length, onClick: start('due') }, t('Fällige üben ({n})', { n: due.length })),
      h('button', { type: 'button', class: 'btn btn-wide', disabled: !fresh.length, onClick: start('new') }, t('{n} neue Karten lernen', { n: fresh.length })),
      h('button', { type: 'button', class: 'btn btn-ghost btn-wide', disabled: !due.length && !fresh.length, onClick: start('mix') }, t('Gemischte Runde')),
    ),
    h('p', { class: 'hint' }, t('Tipp: Sprich das englische Wort laut aus, bevor du die Karte aufdeckst. Die Karten erscheinen auch in der normalen Wiederholung.')),
    h('a', { class: 'continue', href: '#/glossar' }, h('span', { class: 'play', html: icon('book', 22) }), h('span', { class: 'continue-body' }, h('strong', {}, t('Glossar durchsuchen')), h('small', {}, t('Begriffe nachschlagen, Definitionen auf Deutsch und Englisch'))), h('span', { class: 'chev', html: icon('chevron', 18) })),
  );
}
