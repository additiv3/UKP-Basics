// Chapter overview: goals, lesson list, soft-gating notice, further reading.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { inline } from '../../core/richtext.js';
import * as store from '../../core/store.js';
import { chapterStatus, chapterStats, lessonDone } from '../../core/progress.js';
import { chapterMeta } from '../../core/content.js';
import { renderBlock } from '../../blocks/registry.js';

const back = () => h('a', { class: 'back', href: '#/' }, h('span', { html: icon('back', 18) }), 'Lernpfad');

export async function render({ id }, app) {
  const { data } = app;
  const meta = chapterMeta(data, id);
  if (!meta) return h('div', { class: 'page' }, back(), h('p', {}, 'Kapitel nicht gefunden.'));
  const chapter = data.chapters.get(id);
  const state = store.get();
  const status = chapterStatus(state, meta, data.chapters);

  if (!chapter) {
    return h(
      'div',
      { class: 'page' },
      back(),
      h('h1', {}, meta.titel),
      h('p', { class: 'lead' }, meta.kurz),
      h('div', { class: 'callout' }, h('strong', { class: 'callout-title' }, 'Bald verfügbar'), h('p', {}, 'Dieses Kapitel ist geplant. Geplante Lektionen:'), h('ul', {}, (meta.lektionen_geplant ?? []).map((t) => h('li', {}, t)))),
      prereqNote(meta, data),
    );
  }

  const stats = chapterStats(state, chapter);
  const locked = status === 'gesperrt';
  const lessons = chapter.lektionen.map((l, i) => {
    const done = lessonDone(state, l.id);
    const row = h(
      locked ? 'div' : 'a',
      { class: `lesson-row ${done ? 'done' : ''} ${locked ? 'disabled' : ''}`, href: locked ? null : `#/kapitel/${id}/${l.id}` },
      h('span', { class: 'node small', html: done ? icon('check', 18) : String(i + 1) }),
      h('span', { class: 'lesson-body' }, h('strong', {}, l.titel), h('small', {}, `ca. ${l.minuten} min`)),
      locked ? null : h('span', { class: 'chev', html: icon('chevron', 18) }),
    );
    return row;
  });

  const unlock = locked
    ? h(
        'div',
        { class: 'callout warn' },
        h('strong', { class: 'callout-title' }, 'Empfohlene Reihenfolge'),
        prereqNote(meta, data),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            onClick: () => {
              store.mutate((s) => {
                if (!s.unlocked.includes(id)) s.unlocked.push(id);
              });
              app.rerender();
            },
          },
          'Trotzdem freischalten',
        ),
      )
    : null;

  const further = chapter.weiterlesen?.length ? await renderBlock({ typ: 'quelle', refs: chapter.weiterlesen }, { data, mode: 'lesson' }) : null;

  return h(
    'div',
    { class: 'page' },
    back(),
    h('p', { class: 'kicker' }, `${meta.id.toUpperCase()} · Stufe ${meta.stufe}`),
    h('h1', {}, chapter.titel),
    h('p', { class: 'lead', html: inline(chapter.einleitung ?? meta.kurz) }),
    h('div', { class: 'chips' }, h('span', { class: 'chip' }, `${stats.done}/${stats.lessons} Lektionen`), h('span', { class: 'chip' }, `${stats.mature}/${stats.items} gefestigt`)),
    unlock,
    h('section', {}, h('h2', {}, 'Lernziele'), h('ul', { class: 'goals' }, chapter.ziele.map((z) => h('li', { html: inline(z) })))),
    h('section', {}, h('h2', {}, 'Lektionen'), h('div', { class: 'lesson-list' }, lessons)),
    further,
  );
}

function prereqNote(meta, data) {
  const pre = (meta.voraussetzungen ?? []).map((pid) => chapterMeta(data, pid)).filter(Boolean);
  if (!pre.length) return null;
  return h('p', { class: 'prereq' }, 'Baut auf auf: ', pre.flatMap((p, i) => [i ? ', ' : '', h('a', { href: `#/kapitel/${p.id}` }, `${p.id.toUpperCase()} ${p.titel}`)]));
}
