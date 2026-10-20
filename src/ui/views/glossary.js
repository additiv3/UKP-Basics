// Glossary: searchable bilingual list and term detail with links back to chapters.
// Terms show the UI-language name first and the other language in brackets.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { inline, rich } from '../../core/richtext.js';
import { t, getLang } from '../../core/i18n.js';
import { langSwitch } from '../langswitch.js';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function renderList(_params, app) {
  const terms = [...app.data.terms.values()].sort((a, b) => a.name.localeCompare(b.name, getLang()));
  const list = h('div', { class: 'gloss-list' });
  const empty = h('p', { class: 'hint', hidden: true }, t('Kein Begriff gefunden.'));
  const draw = (q) => {
    const nq = norm(q);
    const hits = terms.filter((x) => !nq || norm(`${x.begriff} ${x.englisch ?? ''} ${x.kurz}`).includes(nq));
    list.replaceChildren(
      ...hits.map((x) =>
        h('a', { class: 'gloss-row', href: `#/glossar/${x.id}` }, h('span', { class: 'gloss-body' }, h('strong', {}, x.name), x.alt && x.alt !== x.name ? h('small', {}, ` (${x.alt})`) : null, h('span', { class: 'gloss-short', html: inline(x.kurz) })), h('span', { class: 'chev', html: icon('chevron', 18) })),
      ),
    );
    empty.hidden = hits.length > 0;
  };
  const search = h('input', { type: 'search', class: 'input', placeholder: t('Begriff suchen (DE oder EN)'), 'aria-label': t('Glossar durchsuchen'), autocomplete: 'off', onInput: () => draw(search.value) });
  draw('');
  return h(
    'div',
    { class: 'page' },
    h('div', { class: 'row-between' }, h('h1', {}, t('Glossar')), langSwitch(app)),
    h('p', { class: 'lead' }, t('{n} Begriffe in Deutsch und Englisch, verlinkt aus den Lektionen.', { n: terms.length })),
    search,
    list,
    empty,
    h('a', { class: 'btn btn-ghost btn-wide', href: '#/vokabeln' }, t('Als Vokabelkarten üben')),
  );
}

export async function renderTerm({ id }, app) {
  const x = app.data.terms.get(id);
  const back = h('a', { class: 'back', href: '#/glossar' }, h('span', { html: icon('back', 18) }), t('Glossar'));
  if (!x) return h('div', { class: 'page' }, back, h('p', {}, t('Begriff nicht gefunden.')));
  const chapters = [...(app.data.termChapters.get(id) ?? [])].map((cid) => app.data.chapters.get(cid)).filter(Boolean);
  const see = (x.siehe ?? []).map((sid) => app.data.terms.get(sid)).filter(Boolean);
  return h(
    'div',
    { class: 'page' },
    back,
    h('h1', {}, x.name),
    x.alt && x.alt !== x.name ? h('p', { class: 'kicker' }, `${getLang() === 'en' ? 'DE' : 'EN'}: ${x.alt}`) : null,
    x.verifiziert === false ? h('span', { class: 'badge badge-warn static' }, t('ungeprüft')) : null,
    h('div', { class: 'prose', html: rich(x.definition) }),
    see.length ? h('section', {}, h('h2', {}, t('Siehe auch')), h('div', { class: 'chips' }, see.map((s) => h('a', { class: 'chip link', href: `#/glossar/${s.id}` }, s.name)))) : null,
    chapters.length ? h('section', {}, h('h2', {}, t('Vorkommen in Kapiteln')), h('div', { class: 'chips' }, chapters.map((c) => h('a', { class: 'chip link', href: `#/kapitel/${c.id}` }, `${c.id.toUpperCase()} ${c.titel}`)))) : null,
    x.quelle ? h('p', { class: 'src-note' }, t('Quelle: {s}', { s: app.data.sources.get(x.quelle)?.kurz ?? t(x.quelle) })) : null,
  );
}
