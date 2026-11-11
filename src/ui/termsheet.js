// Glossary look-up as a bottom sheet: tapping a glossary link in a lesson opens the term on top of the page,
// so closing it returns to exactly the same spot (page, scroll position, answered questions).
// "Siehe auch" and links inside the definition open further terms in the same sheet with a back step.
import { h, append, clear } from './dom.js';
import { icon } from './icons.js';
import { rich, inline } from '../core/richtext.js';
import { t, getLang } from '../core/i18n.js';

let sheet = null;
let body = null;
let backBtn = null;
let stack = [];
let appRef = null;

export const isTermSheetOpen = () => !!sheet;

/** Text block of a term in one language: short form, definition and the optional longer explanation. */
export function termSections(fields) {
  if (!fields) return [];
  return [
    fields.kurz ? h('p', { class: 'term-kurz', html: inline(fields.kurz) }) : null,
    fields.definition ? h('div', { class: 'prose', html: rich(fields.definition) }) : null,
    fields.mehr ? h('div', { class: 'term-more' }, h('strong', { class: 'term-more-title', html: `${icon('bulb', 16)} ${t('Genauer erklärt')}` }), h('div', { class: 'prose', html: rich(fields.mehr) })) : null,
  ];
}

function draw() {
  const id = stack[stack.length - 1];
  const x = appRef.data.terms.get(id);
  backBtn.hidden = stack.length < 2;
  if (!x) {
    body.replaceChildren(h('p', {}, t('Begriff nicht gefunden.')));
    return;
  }
  const en = getLang() === 'en';
  const own = en ? x.en : x.de;
  const other = en ? x.de : x.en;
  const see = (x.siehe ?? []).map((sid) => appRef.data.terms.get(sid)).filter(Boolean);
  clear(body);
  append(
    body,
  [
    h('p', { class: 'kicker' }, t('Nachschlagen')),
    h('h2', { class: 'term-title' }, x.name),
    x.alt && x.alt !== x.name ? h('p', { class: 'term-alt' }, `${en ? 'DE' : 'EN'}: `, h('strong', {}, x.alt)) : null,
    x.verifiziert === false ? h('span', { class: 'badge badge-warn static' }, t('ungeprüft')) : null,
    ...termSections(own),
    x.beispiel ? h('div', { class: 'term-example' }, h('span', { class: 'term-example-label' }, t('Im Satz (Englisch)')), h('p', { html: inline(x.beispiel) })) : null,
    other?.definition ? h('details', { class: 'term-other' }, h('summary', {}, en ? 'Auf Deutsch lesen' : 'Read in English'), ...termSections(other)) : null,
    see.length ? h('div', { class: 'term-see' }, h('strong', {}, t('Siehe auch')), h('div', { class: 'chips' }, see.map((s) => h('button', { type: 'button', class: 'chip link', onClick: () => push(s.id) }, s.name)))) : null,
  ]);
  body.scrollTop = 0;
}

function push(id) {
  stack.push(id);
  draw();
}

function onKey(e) {
  if (e.key === 'Escape') closeTermSheet();
}

export function openTermSheet(id, app) {
  appRef = app;
  if (sheet) {
    push(id);
    return;
  }
  stack = [id];
  body = h('div', { class: 'term-body' });
  backBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Zurück'), html: icon('back', 20), onClick: () => { stack.pop(); draw(); } });
  const full = h('a', { class: 'btn btn-ghost', href: '#', onClick: (e) => { e.preventDefault(); const cur = stack[stack.length - 1]; closeTermSheet(); location.hash = `#/glossar/${cur}`; } }, t('Glossareintrag'));
  sheet = h(
    'div',
    { class: 'sheet-backdrop', onClick: (e) => { if (e.target === sheet) closeTermSheet(); } },
    h(
      'div',
      { class: 'term-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Begriff nachschlagen') },
      h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
      h('div', { class: 'term-head' }, backBtn, h('span', { class: 'grow' }), h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Schließen'), html: icon('close', 20), onClick: closeTermSheet })),
      body,
      h('div', { class: 'term-actions' }, full, h('button', { type: 'button', class: 'btn btn-primary', onClick: closeTermSheet }, t('Zurück zum Text'))),
    ),
  );
  document.body.append(sheet);
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', closeTermSheet, { once: true });
  draw();
}

export function closeTermSheet() {
  if (!sheet) return;
  sheet.remove();
  sheet = null;
  stack = [];
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('hashchange', closeTermSheet);
}
