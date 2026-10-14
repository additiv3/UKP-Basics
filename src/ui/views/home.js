// Lernpfad: brand bar, animated hero with stats, continue card, lab shortcuts, stages with chapter cards.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { levelInfo, totalXp, streak, todayXp, dueIds, chapterStatus, chapterStats, lessonDone } from '../../core/progress.js';
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

/** Decorative scene: crystal hit by an ultrashort pulse train (CSS animated). */
const SCENE = `<svg viewBox="-40 -30 360 250" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="hc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#40d0ff"/><stop offset="1" stop-color="#0868be"/></linearGradient>
<radialGradient id="hg"><stop offset="0" stop-color="#ffd678" stop-opacity=".95"/><stop offset="1" stop-color="#ff6230" stop-opacity="0"/></radialGradient>
</defs>
<polygon points="27,39 114,6 183,51 174,138 81,171 18,114" fill="url(#hc)" stroke="url(#hc)" stroke-width="13" stroke-linejoin="round"/>
<polygon points="27,39 114,6 102,87" fill="#fff" fill-opacity=".34"/>
<polygon points="114,6 183,51 102,87" fill="#fff" fill-opacity=".14"/>
<polygon points="174,138 81,171 102,87" fill="#001e3c" fill-opacity=".26"/>
<polygon points="81,171 18,114 102,87" fill="#001e3c" fill-opacity=".34"/>
<g stroke="#fff" stroke-opacity=".35" stroke-width="1.5"><line x1="102" y1="87" x2="27" y2="39"/><line x1="102" y1="87" x2="114" y2="6"/><line x1="102" y1="87" x2="183" y2="51"/><line x1="102" y1="87" x2="174" y2="138"/><line x1="102" y1="87" x2="81" y2="171"/><line x1="102" y1="87" x2="18" y2="114"/></g>
<polygon points="-60,-40 -30,-70 58,21" fill="#ff6230" fill-opacity=".33"/>
<g stroke-linecap="round" stroke="#fff" stroke-width="6" fill="none">
<line class="hero-pulse" x1="-50" y1="-84" x2="58" y2="21" pathLength="166"/>
<line class="hero-pulse p2" x1="-50" y1="-84" x2="58" y2="21" pathLength="166"/>
<line class="hero-pulse p3" x1="-50" y1="-84" x2="58" y2="21" pathLength="166"/>
</g>
<g class="hero-spark"><circle cx="58" cy="21" r="26" fill="url(#hg)"/><polygon points="58,-4 62,17 83,21 62,25 58,46 54,25 33,21 54,17" fill="#fff"/></g>
<g class="hero-plume"><circle cx="78" cy="2" r="2.6" fill="#ffd678"/><circle cx="92" cy="-14" r="2" fill="#ff6230"/><circle cx="66" cy="-12" r="1.8" fill="#fff"/><circle cx="104" cy="-4" r="2.2" fill="#ff6230" style="animation-delay:-.2s"/><circle cx="84" cy="-26" r="1.6" fill="#ffd678" style="animation-delay:-.4s"/></g>
</svg>`;

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

/** First unfinished lesson of the chapter in progress (or the first available chapter). */
function nextLesson(data, state) {
  const order = data.index.kapitel.filter((k) => data.chapters.has(k.id));
  const pick = order.find((k) => chapterStatus(state, k, data.chapters) === 'laeuft') ?? order.find((k) => chapterStatus(state, k, data.chapters) === 'offen');
  if (!pick) return null;
  const chapter = data.chapters.get(pick.id);
  const lesson = chapter.lektionen.find((l) => !lessonDone(state, l.id));
  return lesson ? { chapter, lesson, started: chapterStats(state, chapter).done > 0 } : null;
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

  const brand = h(
    'div',
    { class: 'brandbar' },
    h('img', { src: 'assets/brand/mark.svg', alt: '', width: 40, height: 40 }),
    h('div', {}, h('span', { class: 'brand-name' }, 'UKP', h('b', {}, '-Basics')), h('span', { class: 'brand-sub' }, 'Laserablation harter Werkstoffe')),
  );

  const hero = h(
    'section',
    { class: 'hero' },
    h('div', { class: 'hero-scene', html: SCENE }),
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

  const nxt = nextLesson(data, state);
  const cont = nxt
    ? h(
        'a',
        { class: 'continue', href: `#/kapitel/${nxt.chapter.id}/${nxt.lesson.id}` },
        h('span', { class: 'play', html: icon('play', 20) }),
        h('span', { class: 'continue-body' }, h('strong', {}, nxt.started ? 'Weiter lernen' : 'Loslegen'), h('small', {}, `${nxt.chapter.id.toUpperCase()} · ${nxt.lesson.titel} · ca. ${nxt.lesson.minuten} min`)),
        h('span', { class: 'chev', html: icon('chevron', 18) }),
      )
    : null;

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

  const lab = h(
    'section',
    {},
    h('h2', {}, 'Im Labor ausprobieren'),
    h(
      'div',
      { class: 'tile-grid' },
      [
        { id: 'gauss', ic: 'beam', t: 'Gauß-Strahl im Fokus', k: 'Taille, Rayleighlänge, Divergenz' },
        { id: 'ttm', ic: 'heat', t: 'Zwei-Temperatur-Modell', k: 'Elektronen vs. Gitter in der Zeit' },
      ].map((s) => h('a', { class: 'tile', href: `#/labor/sim/${s.id}`, style: '--tile: var(--st-a)' }, h('span', { class: 'tile-ic', html: icon(s.ic, 22) }), h('strong', { class: 'tile-title' }, s.t), h('span', { class: 'tile-kurz' }, s.k))),
    ),
    h('p', { class: 'hint' }, h('a', { href: '#/labor' }, 'Alle Simulationen, Formeln, Normen und Spiele'), ' im Labor-Tab.'),
  );

  let nr = 0;
  const stages = data.index.stufen.map((stufe) => {
    const metas = data.index.kapitel.filter((k) => k.stufe === stufe.id);
    return h(
      'section',
      { class: 'stage', dataset: { stage: stufe.id } },
      h('h2', {}, h('span', { class: 'stage-id' }, stufe.id), stufe.titel),
      h('p', { class: 'stage-desc' }, stufe.beschreibung),
      h('div', { class: 'chapter-list' }, metas.map((m) => chapterCard(m, data, state, ++nr))),
    );
  });

  return h('div', { class: 'page' }, brand, hero, cont, cta, reminder, lab, stages);
}
