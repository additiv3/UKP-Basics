// Lernpfad: stats header, review call-to-action, stages with chapter cards.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { levelInfo, totalXp, streak, todayXp, dueIds, chapterStatus, chapterStats } from '../../core/progress.js';
import { toDay, diffDays } from '../../core/dates.js';

function goalRing(done, goal) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, goal ? done / goal : 0);
  return h('div', {
    class: 'ring',
    title: 'Tagesziel',
    html: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 32 32)"/></svg><span class="ring-text"><strong>${done}</strong><small>/${goal} XP</small></span>`,
  });
}

const STATUS_LABEL = { geplant: 'Bald verfügbar', gesperrt: 'Empfohlen: erst Voraussetzungen', offen: 'Bereit', laeuft: 'In Arbeit', fertig: 'Abgeschlossen' };

function chapterCard(meta, data, state, nr) {
  const status = chapterStatus(state, meta, data.chapters);
  const chapter = data.chapters.get(meta.id);
  const stats = chapter ? chapterStats(state, chapter) : null;
  const mark = status === 'fertig' ? icon('check', 22) : status === 'gesperrt' || status === 'geplant' ? icon('lock', 20) : String(nr);
  return h(
    'a',
    { class: `chapter-card status-${status}`, href: `#/kapitel/${meta.id}` },
    h('span', { class: 'node', html: mark }),
    h(
      'span',
      { class: 'chapter-body' },
      h('span', { class: 'chapter-kicker' }, `${meta.id.toUpperCase()} · ${STATUS_LABEL[status]}`),
      h('strong', { class: 'chapter-title' }, meta.titel),
      h('span', { class: 'chapter-kurz' }, meta.kurz),
      stats
        ? h(
            'span',
            { class: 'progress', role: 'progressbar', 'aria-valuenow': Math.round(stats.fraction * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
            h('span', { class: 'progress-fill', style: `width:${Math.round(stats.fraction * 100)}%` }),
          )
        : null,
    ),
    h('span', { class: 'chev', html: icon('chevron', 18) }),
  );
}

export async function render(_params, app) {
  const { data } = app;
  const state = store.get();
  const today = toDay();
  const lv = levelInfo(totalXp(state));
  const due = dueIds(state, today).filter((id) => data.items.has(id)).length;
  const days = streak(state, today);
  const hasActivity = Object.keys(state.days).length > 0;
  const lastExport = state.profile.lastExport;
  const exportOverdue = hasActivity && (!lastExport || diffDays(lastExport, today) > 14);

  const hero = h(
    'section',
    { class: 'hero' },
    h(
      'div',
      { class: 'hero-main' },
      h('p', { class: 'kicker' }, `Level ${lv.level}`),
      h('h1', {}, lv.title),
      h('div', { class: 'xpbar', role: 'progressbar', 'aria-valuenow': Math.round(lv.fraction * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('div', { class: 'xpbar-fill', style: `width:${Math.round(lv.fraction * 100)}%` })),
      h('p', { class: 'hero-sub' }, `${lv.xp} XP · noch ${lv.next - lv.xp} bis Level ${lv.level + 1}`),
      h('span', { class: `streak ${days ? 'on' : ''}` }, h('span', { html: icon('flame', 18) }), days ? `${days} ${days === 1 ? 'Tag' : 'Tage'} in Folge` : 'Starte deine Serie heute'),
    ),
    goalRing(todayXp(state, today), state.settings.dailyGoal),
  );

  const cta = h(
    'a',
    { class: `review-cta ${due ? 'has-due' : ''}`, href: '#/wiederholen' },
    h('span', { class: 'cta-icon', html: icon('review', 26) }),
    h('span', { class: 'cta-text' }, h('strong', {}, due ? `${due} ${due === 1 ? 'Wiederholung' : 'Wiederholungen'} fällig` : 'Nichts fällig'), h('small', {}, due ? 'Kurze Runde, lange Wirkung' : 'Neue Lektionen füllen den Stapel')),
    h('span', { class: 'chev', html: icon('chevron', 18) }),
  );

  const reminder = exportOverdue
    ? h('a', { class: 'notice', href: '#/einstellungen' }, lastExport ? 'Dein letztes Backup ist über 14 Tage alt.' : 'Du hast noch kein Backup deines Fortschritts.', ' ', h('strong', {}, 'Jetzt sichern'))
    : null;

  let nr = 0;
  const stages = data.index.stufen.map((stufe) => {
    const metas = data.index.kapitel.filter((k) => k.stufe === stufe.id);
    return h(
      'section',
      { class: 'stage' },
      h('h2', {}, h('span', { class: 'stage-id' }, stufe.id), stufe.titel),
      h('p', { class: 'stage-desc' }, stufe.beschreibung),
      h('div', { class: 'chapter-list' }, metas.map((m) => chapterCard(m, data, state, ++nr))),
    );
  });

  return h('div', { class: 'page' }, hero, cta, reminder, stages);
}
