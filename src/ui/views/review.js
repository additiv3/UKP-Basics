// Review session over all due items (SM-2). Items answered wrong come back later in the same session.
import { h, append } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { dueIds, totalXp } from '../../core/progress.js';
import { toDay, diffDays } from '../../core/dates.js';
import { renderBlock } from '../../blocks/registry.js';
import { t } from '../../core/i18n.js';

const MAX_REQUEUE = 2;

/**
 * Run a card/question session in `page`. ids: item ids in order. again(): optional "more" link target after the summary.
 */
export async function runSession(app, page, ids, { backHref = '#/', kicker, moreHref, moreLabel, after } = {}) {
  const { data } = app;
  const today = toDay();
  const queue = [...ids];
  const total = queue.length;
  const xpStart = totalXp(store.get());
  const requeued = new Map();
  let done = 0;
  let correctFirst = 0;
  const firstSeen = new Set();

  const fill = h('div', { class: 'progress-fill' });
  const count = h('span', { class: 'topbar-count' });
  const stage = h('div', { class: 'review-stage' });
  page.append(h('header', { class: 'topbar' }, h('a', { class: 'back', href: backHref, 'aria-label': t('Beenden'), html: icon('back', 22) }), h('div', { class: 'progress grow' }, fill), count), stage);

  async function show() {
    fill.style.width = `${Math.round((done / total) * 100)}%`;
    count.textContent = `${Math.min(done + 1, total)}/${total}`;
    if (!queue.length) return summary();
    const id = queue[0];
    const entry = data.items.get(id);
    const ctx = {
      data,
      mode: 'review',
      onNext: (correct) => {
        queue.shift();
        if (!firstSeen.has(id)) {
          firstSeen.add(id);
          if (correct) correctFirst += 1;
        }
        if (!correct && (requeued.get(id) ?? 0) < MAX_REQUEUE) {
          requeued.set(id, (requeued.get(id) ?? 0) + 1);
          queue.push(id);
        } else {
          done += 1;
        }
        show();
      },
    };
    const meta = h('p', { class: 'kicker' }, kicker ?? `${entry.chapter.titel} · ${entry.lesson.titel}`);
    stage.replaceChildren(meta, await renderBlock(entry.block, ctx));
    window.scrollTo(0, 0);
  }

  function summary() {
    const gained = totalXp(store.get()) - xpStart;
    const more = dueIds(store.get(), today).filter((id) => data.items.has(id)).length;
    fill.style.width = '100%';
    count.textContent = '';
    stage.replaceChildren(
      h(
        'div',
        { class: 'empty' },
        h('span', { class: 'empty-icon', html: icon('star', 40) }),
        h('h2', {}, t('Runde geschafft')),
        h('p', {}, t('{n} von {total} gleich gewusst', { n: correctFirst, total }), h('span', { class: 'xp-chip' }, ` +${gained} XP`)),
        moreHref ? h('a', { class: 'btn btn-primary', href: moreHref, onClick: () => app.rerender() }, moreLabel) : null,
        !moreHref && more ? h('a', { class: 'btn btn-primary', href: '#/wiederholen', onClick: () => app.rerender() }, t('Weitere {n} wiederholen', { n: Math.min(more, store.get().settings.reviewBatch) })) : null,
        h('a', { class: moreHref || more ? 'btn btn-ghost' : 'btn btn-primary', href: backHref }, backHref === '#/' ? t('Zum Lernpfad') : t('Zurück')),
        after,
      ),
    );
  }

  await show();
}

export async function render(_params, app) {
  const { data } = app;
  const today = toDay();
  const state = store.get();
  const valid = dueIds(state, today).filter((id) => data.items.has(id));
  const queue = valid.slice(0, state.settings.reviewBatch);
  const page = h('div', { class: 'page review' });

  if (!queue.length) {
    const future = Object.values(state.items)
      .filter((it) => it.due > today)
      .map((it) => it.due)
      .sort();
    const seenAny = Object.keys(state.items).length > 0;
    const days = future.length ? diffDays(today, future[0]) : 0;
    append(page, [
      h('h1', {}, t('Wiederholen')),
      h(
        'div',
        { class: 'empty' },
        h('span', { class: 'empty-icon', html: icon('check', 40) }),
        h('p', {}, seenAny ? t('Heute ist nichts mehr fällig.') : t('Hier erscheinen deine Fragen und Karten, sobald du Lektionen bearbeitet hast.')),
        future.length ? h('p', { class: 'hint' }, t('Nächste Wiederholung: {when}.', { when: days === 1 ? t('morgen') : t('in {n} Tagen', { n: days }) })) : null,
        h('a', { class: 'btn btn-primary', href: '#/' }, t('Weiter lernen')),
        h('a', { class: 'btn btn-ghost', href: '#/vokabeln' }, t('Vokabeln üben')),
      ),
    ]);
    return page;
  }

  await runSession(app, page, queue);
  return page;
}
