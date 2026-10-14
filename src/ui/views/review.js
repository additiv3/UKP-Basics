// Review session over all due items (SM-2). Items answered wrong come back later in the same session.
import { h, append } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { dueIds, totalXp } from '../../core/progress.js';
import { toDay, diffDays } from '../../core/dates.js';
import { renderBlock } from '../../blocks/registry.js';

const MAX_REQUEUE = 2;

export async function render(_params, app) {
  const { data } = app;
  const today = toDay();
  const state = store.get();
  const valid = dueIds(state, today).filter((id) => data.items.has(id));
  const batch = state.settings.reviewBatch;
  const queue = valid.slice(0, batch);
  const total = queue.length;

  const page = h('div', { class: 'page review' });

  if (!total) {
    const future = Object.values(state.items)
      .filter((it) => it.due > today)
      .map((it) => it.due)
      .sort();
    const seenAny = Object.keys(state.items).length > 0;
    append(page, [
      h('h1', {}, 'Wiederholen'),
      h(
        'div',
        { class: 'empty' },
        h('span', { class: 'empty-icon', html: icon('check', 40) }),
        h('p', {}, seenAny ? 'Heute ist nichts mehr fällig.' : 'Hier erscheinen deine Fragen und Karten, sobald du Lektionen bearbeitet hast.'),
        future.length ? h('p', { class: 'hint' }, `Nächste Wiederholung: ${diffDays(today, future[0]) === 1 ? 'morgen' : `in ${diffDays(today, future[0])} Tagen`}.`) : null,
        h('a', { class: 'btn btn-primary', href: '#/' }, 'Weiter lernen'),
      ),
    ]);
    return page;
  }

  const xpStart = totalXp(state);
  const requeued = new Map();
  let done = 0;
  let correctFirst = 0;
  const firstSeen = new Set();

  const fill = h('div', { class: 'progress-fill' });
  const count = h('span', { class: 'topbar-count' });
  const stage = h('div', { class: 'review-stage' });
  page.append(h('header', { class: 'topbar' }, h('a', { class: 'back', href: '#/', 'aria-label': 'Beenden', html: icon('back', 22) }), h('div', { class: 'progress grow' }, fill), count), stage);

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
    const meta = h('p', { class: 'kicker' }, `${entry.chapter.titel} · ${entry.lesson.titel}`);
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
        h('h2', {}, 'Runde geschafft'),
        h('p', {}, `${correctFirst} von ${total} gleich gewusst`, h('span', { class: 'xp-chip' }, ` +${gained} XP`)),
        more ? h('a', { class: 'btn btn-primary', href: '#/wiederholen', onClick: () => app.rerender() }, `Weitere ${Math.min(more, batch)} wiederholen`) : null,
        h('a', { class: more ? 'btn btn-ghost' : 'btn btn-primary', href: '#/' }, 'Zum Lernpfad'),
      ),
    );
  }

  await show();
  return page;
}
