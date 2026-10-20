// Start page: greeting hero with week strip, continue card, daily quick actions, lab shortcuts and the learning path as a timeline.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { levelInfo, totalXp, streak, todayXp, dueIds, chapterStatus, chapterStats, lessonDone } from '../../core/progress.js';
import { toDay, diffDays, addDays } from '../../core/dates.js';
import { t, getLang } from '../../core/i18n.js';
import { langSwitch } from '../langswitch.js';
import { openCalculator } from '../calculator.js';
import { APP_VERSION } from '../../version.js';

function goalRing(done, goal) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, goal ? done / goal : 0);
  return h('div', {
    class: 'ring',
    title: t('Tagesziel'),
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

function greeting() {
  const hr = new Date().getHours();
  if (hr < 5) return t('Nachtschicht im Labor');
  if (hr < 11) return t('Guten Morgen');
  if (hr < 17) return t('Hallo');
  return t('Guten Abend');
}

/** Monday-first week with an activity dot per day. */
function weekStrip(state, today) {
  const dow = (new Date().getDay() + 6) % 7; // 0 = Monday
  const monday = addDays(today, -dow);
  const names = getLang() === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
  return h(
    'div',
    { class: 'week', role: 'img', 'aria-label': t('Aktivität dieser Woche') },
    names.map((n, i) => {
      const day = addDays(monday, i);
      const active = Boolean(state.days[day]?.n);
      return h('span', { class: `wd ${active ? 'on' : ''} ${day === today ? 'today' : ''} ${day > today ? 'future' : ''}` }, h('i', { html: active ? icon('check', 13) : '' }), h('small', {}, n));
    }),
  );
}

function chapterNode(meta, data, state, nr) {
  const status = chapterStatus(state, meta, data.chapters);
  const chapter = data.chapters.get(meta.id);
  const stats = chapter ? chapterStats(state, chapter) : null;
  const minutes = chapter ? chapter.lektionen.reduce((a, l) => a + (l.minuten ?? 0), 0) : 0;
  const mark = status === 'fertig' ? icon('check', 20) : status === 'gesperrt' || status === 'geplant' ? icon('lock', 18) : String(nr);
  return h(
    'a',
    { class: `tl-item status-${status}`, href: `#/kapitel/${meta.id}` },
    h('span', { class: 'tl-node', html: mark }),
    h(
      'span',
      { class: 'tl-card' },
      h('span', { class: 'chapter-kicker' }, `${meta.id.toUpperCase()} · ${t(STATUS_LABEL[status])}`),
      h('strong', { class: 'chapter-title' }, meta.titel),
      h('span', { class: 'chapter-kurz' }, meta.kurz),
      stats
        ? h(
            'span',
            { class: 'tl-meta' },
            h('span', { class: 'progress', role: 'progressbar', 'aria-valuenow': Math.round(stats.fraction * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { class: 'progress-fill', style: `width:${Math.round(stats.fraction * 100)}%` })),
            h('small', {}, t('{d}/{n} Lektionen · ca. {m} min', { d: stats.done, n: stats.lessons, m: minutes })),
          )
        : null,
    ),
  );
}

/** First unfinished lesson of the chapter in progress (or the first available chapter). */
function nextLesson(data, state) {
  const order = data.index.kapitel.filter((k) => data.chapters.has(k.id));
  const pick = order.find((k) => chapterStatus(state, k, data.chapters) === 'laeuft') ?? order.find((k) => chapterStatus(state, k, data.chapters) === 'offen');
  if (!pick) return null;
  const chapter = data.chapters.get(pick.id);
  const lesson = chapter.lektionen.find((l) => !lessonDone(state, l.id));
  return lesson ? { chapter, lesson, meta: pick, started: chapterStats(state, chapter).done > 0 } : null;
}

const tile = (href, ic, title, sub, tint, badge) =>
  h('a', { class: 'qa', href, style: `--tile: ${tint}` }, h('span', { class: 'qa-ic', html: icon(ic, 24) }), badge ? h('span', { class: 'qa-badge' }, badge) : null, h('strong', {}, title), h('small', {}, sub));

export async function render(_params, app) {
  const { data } = app;
  const state = store.get();
  const today = toDay();
  const lv = levelInfo(totalXp(state));
  const due = dueIds(state, today).filter((id) => data.items.has(id));
  const dueVocab = due.filter((id) => id.startsWith('v.')).length;
  const days = streak(state, today);
  const hasActivity = Object.keys(state.days).length > 0;
  const lastExport = state.profile.lastExport;
  const exportOverdue = hasActivity && (!lastExport || diffDays(lastExport, today) > 14);

  const top = h(
    'div',
    { class: 'hm-top' },
    h('img', { src: 'assets/brand/mark.svg', alt: '', width: 40, height: 40 }),
    h('div', { class: 'hm-brand' }, h('span', { class: 'brand-name' }, 'UKP', h('b', {}, '-Basics')), h('span', { class: 'brand-sub' }, t('Laserablation harter Werkstoffe'))),
    h('span', { class: 'spacer' }),
    langSwitch(app),
    h('button', { type: 'button', class: 'icon-btn round', 'aria-label': t('Taschenrechner'), onClick: () => openCalculator(), html: icon('calc', 22) }),
  );

  const hero = h(
    'section',
    { class: 'hero hm-hero' },
    h('div', { class: 'hero-scene', html: SCENE }),
    h(
      'div',
      { class: 'hero-main' },
      h('p', { class: 'kicker' }, `${greeting()}, Fabio`),
      h('h1', {}, lv.title),
      h('p', { class: 'hero-lv' }, `Level ${lv.level}`),
      h('div', { class: 'xpbar', role: 'progressbar', 'aria-valuenow': Math.round(lv.fraction * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('div', { class: 'xpbar-fill', style: `width:${Math.round(lv.fraction * 100)}%` })),
      h('p', { class: 'hero-sub' }, t('{xp} XP · noch {rest} bis Level {next}', { xp: lv.xp, rest: lv.next - lv.xp, next: lv.level + 1 })),
      h('span', { class: `streak ${days ? 'on' : ''}` }, h('span', { html: icon('flame', 18) }), days ? t(days === 1 ? '{n} Tag in Folge' : '{n} Tage in Folge', { n: days }) : t('Starte deine Serie heute')),
    ),
    goalRing(todayXp(state, today), state.settings.dailyGoal),
    weekStrip(state, today),
  );

  const nxt = nextLesson(data, state);
  const cont = nxt
    ? h(
        'a',
        { class: 'hm-continue', href: `#/kapitel/${nxt.chapter.id}/${nxt.lesson.id}`, dataset: { stage: nxt.meta.stufe } },
        h('span', { class: 'play', html: icon('play', 22) }),
        h('span', { class: 'continue-body' }, h('small', {}, `${nxt.chapter.id.toUpperCase()} · ${nxt.chapter.titel}`), h('strong', {}, nxt.started ? t('Weiter lernen') : t('Loslegen')), h('small', {}, `${nxt.lesson.titel} · ${t('ca. {m} min', { m: nxt.lesson.minuten })}`)),
        h('span', { class: 'chev', html: icon('chevron', 18) }),
      )
    : null;

  const reminder = exportOverdue
    ? h('a', { class: 'notice', href: '#/einstellungen' }, lastExport ? t('Dein letztes Backup ist über 14 Tage alt.') : t('Du hast noch kein Backup deines Fortschritts.'), ' ', h('strong', {}, t('Jetzt sichern')))
    : null;

  const quick = h(
    'section',
    { class: 'hm-quick' },
    h('h2', {}, t('Heute')),
    h(
      'div',
      { class: 'qa-grid' },
      tile('#/wiederholen', 'review', t('Wiederholen'), due.length ? t('{n} fällig', { n: due.length }) : t('Nichts fällig'), 'var(--accent)', due.length || null),
      tile('#/vokabeln', 'vocab', t('Vokabeln'), dueVocab ? t('{n} fällig', { n: dueVocab }) : t('Englisch trainieren'), 'var(--st-b)', dueVocab || null),
      tile('#/labor/spiel/rechenwerkstatt', 'calc', t('Rechenwerkstatt'), t('Aufgaben mit Taschenrechner'), 'var(--laser)'),
      tile('#/labor', 'flask', t('Labor'), t('Simulationen und Formeln'), 'var(--st-d)'),
    ),
  );

  let nr = 0;
  const stages = data.index.stufen.map((stufe) => {
    const metas = data.index.kapitel.filter((k) => k.stufe === stufe.id);
    return h(
      'section',
      { class: 'stage tl-stage', dataset: { stage: stufe.id } },
      h('div', { class: 'tl-head' }, h('span', { class: 'stage-id' }, stufe.id), h('div', {}, h('h2', {}, stufe.titel), h('p', { class: 'stage-desc' }, stufe.beschreibung))),
      h('div', { class: 'tl-list' }, metas.map((m) => chapterNode(m, data, state, ++nr))),
    );
  });

  return h('div', { class: 'page home' }, top, hero, cont, reminder, quick, h('h2', { class: 'path-title' }, t('Dein Lernpfad')), stages, h('p', { class: 'hint center' }, `UKP-Basics ${APP_VERSION}`));
}
