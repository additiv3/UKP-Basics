// Glossary: searchable list and term detail with links back to chapters.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { inline, rich } from '../../core/richtext.js';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function renderList(_params, app) {
  const terms = [...app.data.terms.values()].sort((a, b) => a.begriff.localeCompare(b.begriff, 'de'));
  const list = h('div', { class: 'gloss-list' });
  const empty = h('p', { class: 'hint', hidden: true }, 'Kein Begriff gefunden.');
  const draw = (q) => {
    const nq = norm(q);
    const hits = terms.filter((t) => !nq || norm(`${t.begriff} ${t.englisch ?? ''} ${t.kurz}`).includes(nq));
    list.replaceChildren(
      ...hits.map((t) =>
        h('a', { class: 'gloss-row', href: `#/glossar/${t.id}` }, h('span', { class: 'gloss-body' }, h('strong', {}, t.begriff), t.englisch ? h('small', {}, ` (${t.englisch})`) : null, h('span', { class: 'gloss-short', html: inline(t.kurz) })), h('span', { class: 'chev', html: icon('chevron', 18) })),
      ),
    );
    empty.hidden = hits.length > 0;
  };
  const search = h('input', { type: 'search', class: 'input', placeholder: 'Begriff suchen', 'aria-label': 'Glossar durchsuchen', autocomplete: 'off', onInput: () => draw(search.value) });
  draw('');
  return h('div', { class: 'page' }, h('h1', {}, 'Glossar'), h('p', { class: 'lead' }, `${terms.length} Begriffe, verlinkt aus den Lektionen.`), search, list, empty);
}

export async function renderTerm({ id }, app) {
  const t = app.data.terms.get(id);
  const back = h('a', { class: 'back', href: '#/glossar' }, h('span', { html: icon('back', 18) }), 'Glossar');
  if (!t) return h('div', { class: 'page' }, back, h('p', {}, 'Begriff nicht gefunden.'));
  const chapters = [...(app.data.termChapters.get(id) ?? [])].map((cid) => app.data.chapters.get(cid)).filter(Boolean);
  const see = (t.siehe ?? []).map((sid) => app.data.terms.get(sid)).filter(Boolean);
  return h(
    'div',
    { class: 'page' },
    back,
    h('h1', {}, t.begriff),
    t.englisch ? h('p', { class: 'kicker' }, t.englisch) : null,
    t.verifiziert === false ? h('span', { class: 'badge badge-warn static' }, 'ungeprüft') : null,
    h('div', { class: 'prose', html: rich(t.definition) }),
    see.length ? h('section', {}, h('h2', {}, 'Siehe auch'), h('div', { class: 'chips' }, see.map((s) => h('a', { class: 'chip link', href: `#/glossar/${s.id}` }, s.begriff)))) : null,
    chapters.length ? h('section', {}, h('h2', {}, 'Vorkommen in Kapiteln'), h('div', { class: 'chips' }, chapters.map((c) => h('a', { class: 'chip link', href: `#/kapitel/${c.id}` }, `${c.id.toUpperCase()} ${c.titel}`)))) : null,
    t.quelle ? h('p', { class: 'src-note' }, `Quelle: ${app.data.sources.get(t.quelle)?.kurz ?? t.quelle}`) : null,
  );
}
