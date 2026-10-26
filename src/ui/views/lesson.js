// Lesson page: the blocks are split into pages (reading, question, card, interactive) that you swipe through.
// Finish unlocks when every question was answered once.
import { h, append, clear } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { completeLesson, lessonDone, levelInfo, totalXp, XP } from '../../core/progress.js';
import { toDay } from '../../core/dates.js';
import { chapterMeta } from '../../core/content.js';
import { renderBlock } from '../../blocks/registry.js';
import { attachSwipe, slide } from '../swipe.js';
import { paginate } from '../../core/paginate.js';
import { t } from '../../core/i18n.js';

const isItem = (b) => b.typ === 'quiz' || b.typ === 'karte';

const posKey = (id) => `ukp.pos.${id}`;
const loadPos = (id) => {
  try {
    return Number(localStorage.getItem(posKey(id))) || 0;
  } catch {
    return 0;
  }
};
const savePos = (id, i) => {
  try {
    localStorage.setItem(posKey(id), String(i));
  } catch {
    /* private mode */
  }
};

export async function render({ id, lektion }, app) {
  const { data } = app;
  const chapter = data.chapters.get(id);
  const lesson = chapter?.lektionen.find((l) => l.id === lektion);
  if (!lesson) return h('div', { class: 'page page-plain' }, h('a', { class: 'back', href: '#/' }, t('Zurück')), h('p', {}, t('Lektion nicht gefunden.')));

  const idx = chapter.lektionen.indexOf(lesson);
  const next = chapter.lektionen[idx + 1];
  const pages = paginate(lesson.blocks);
  pages.push({ kind: 'finish', blocks: [] });
  const items = lesson.blocks.filter(isItem);
  const seen = (b) => (store.get().items[b.id]?.seen ?? 0) > 0;
  const answered = () => items.filter(seen).length;
  const pageDone = (p) => p.kind === 'finish' ? lessonDone(store.get(), lesson.id) : p.blocks.filter(isItem).every(seen);
  const quizNo = new Map(items.map((b, i) => [b.id, i + 1]));

  let cur = Math.min(lessonDone(store.get(), lesson.id) ? 0 : loadPos(lesson.id), pages.length - 1);
  const visited = new Set([cur]);
  const ctx = { data, mode: 'lesson', onScored: () => refresh(true) };

  /* ---------- top bar: close, page segments, counter ---------- */
  const segs = pages.map((p, i) => h('button', { type: 'button', class: `pg-seg pg-${p.kind}`, 'aria-label': t('Seite {n}', { n: i + 1 }), onClick: () => go(i) }));
  const label = h('span', { class: 'topbar-count' });
  const topbar = h(
    'header',
    { class: 'topbar pager-top' },
    h('a', { class: 'back icon-only', href: `#/kapitel/${id}`, 'aria-label': t('Zurück zum Kapitel'), html: icon('close', 22) }),
    h('div', { class: 'pg-segs grow', role: 'progressbar', 'aria-label': t('Fortschritt in der Lektion') }, segs),
    label,
  );

  /* ---------- bottom bar ---------- */
  const prevBtn = h('button', { type: 'button', class: 'pager-btn ghost', 'aria-label': t('Zurück'), html: icon('back', 22), onClick: () => go(cur - 1) });
  const nextBtn = h('button', { type: 'button', class: 'pager-btn primary', onClick: () => go(cur + 1) });
  const hint = h('span', { class: 'pager-hint' });
  const bar = h('nav', { class: 'pager-bar', 'aria-label': t('Seitennavigation') }, prevBtn, hint, nextBtn);

  /* ---------- pages ---------- */
  const stage = h('div', { class: 'pager-stage' });
  const built = new Map();

  async function build(i) {
    if (i < 0 || i >= pages.length) return null;
    if (built.has(i)) return built.get(i);
    const p = pages[i];
    const el = h('section', { class: `pager-page kind-${p.kind}`, 'aria-roledescription': t('Seite') });
    const promise = (async () => {
      if (p.kind === 'finish') {
        el.append(finishPage());
        return el;
      }
      el.append(pageHead(p, i));
      for (const b of p.blocks) el.append(await renderBlock(b, ctx));
      return el;
    })();
    built.set(i, promise);
    return promise;
  }

  function pageHead(p, i) {
    if (i === 0) {
      return h(
        'div',
        { class: 'pager-intro' },
        h('p', { class: 'kicker' }, `${chapter.titel} · ${t('Lektion')} ${idx + 1}`),
        h('h1', {}, lesson.titel),
        h('p', { class: 'pager-meta' }, h('span', { html: icon('book', 16) }), t('{n} Seiten', { n: pages.length }), items.length ? ` · ${t(items.length === 1 ? '{n} Frage' : '{n} Fragen', { n: items.length })}` : '', lesson.minuten ? ` · ≈ ${lesson.minuten} min` : ''),
      );
    }
    const b = p.blocks[0];
    const tag =
      p.kind === 'quiz'
        ? h('span', { class: 'pg-tag t-quiz', html: `${icon('target', 14)} ${t('Frage {i} von {n}', { i: quizNo.get(b.id), n: items.length })}` })
        : p.kind === 'card'
          ? h('span', { class: 'pg-tag t-card', html: `${icon('stack', 14)} ${t('Karteikarte')}` })
          : p.kind === 'lab'
            ? h('span', { class: 'pg-tag t-lab', html: `${icon('bolt', 14)} ${t('Ausprobieren')}` })
            : h('span', { class: 'pg-tag t-read', html: `${icon('book', 14)} ${t('Lesen')}` });
    return h('div', { class: 'pager-head' }, tag, h('span', { class: 'pager-ltitle' }, lesson.titel));
  }

  /* ---------- finish page ---------- */
  const finish = h('div', { class: 'finish-page' });
  const navLinks = () => [next ? h('a', { class: 'btn btn-primary btn-wide', href: `#/kapitel/${id}/${next.id}` }, t('Weiter: {x}', { x: next.titel })) : null, h('a', { class: next ? 'btn btn-ghost btn-wide' : 'btn btn-primary btn-wide', href: `#/kapitel/${id}` }, t('Zum Kapitel'))];

  function finishPage() {
    drawFinish();
    return finish;
  }

  function overview() {
    return h(
      'div',
      { class: 'q-overview' },
      items.map((b) => {
        const pi = pages.findIndex((p) => p.blocks.includes(b));
        return h('button', { type: 'button', class: `q-dot ${seen(b) ? 'done' : ''} ${b.typ === 'karte' ? 'card' : ''}`, onClick: () => go(pi), 'aria-label': t('Zu Frage {n}', { n: quizNo.get(b.id) }) }, seen(b) ? h('span', { html: icon('check', 14) }) : String(quizNo.get(b.id)));
      }),
    );
  }

  function drawFinish() {
    const done = lessonDone(store.get(), lesson.id);
    const open = items.length - answered();
    if (done && !finish.classList.contains('celebrate')) {
      finish.replaceChildren(h('div', { class: 'finish-badge ok', html: icon('check', 34) }), h('h2', {}, t('Lektion abgeschlossen')), overview(), h('div', { class: 'finish-actions' }, navLinks()));
      return;
    }
    if (done) return;
    finish.replaceChildren(
      h('div', { class: `finish-badge ${open ? '' : 'ok'}`, html: icon(open ? 'target' : 'star', 34) }),
      h('h2', {}, open ? t('Fast geschafft') : t('Alles beantwortet')),
      h('p', { class: 'hint' }, open ? t(open === 1 ? 'Noch {n} Frage offen. Tippe darauf, um hinzuspringen.' : 'Noch {n} Fragen offen. Tippe darauf, um hinzuspringen.', { n: open }) : t('Schließe die Lektion ab, damit die Fragen in die Wiederholung kommen.')),
      overview(),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary btn-wide',
          disabled: open > 0,
          onClick: () => {
            const before = levelInfo(totalXp(store.get())).level;
            store.mutate((s) => completeLesson(s, lesson.id, toDay()));
            savePos(lesson.id, 0);
            const after = levelInfo(totalXp(store.get()));
            finish.classList.add('celebrate');
            append(clear(finish), [
              h('div', { class: 'finish-badge ok pop', html: icon('star', 36) }),
              h('h2', {}, t('Geschafft!'), h('span', { class: 'xp-chip' }, ` +${XP.lesson} XP`)),
              after.level > before ? h('p', { class: 'levelup' }, `Level ${after.level}: ${after.title}`) : null,
              h('p', { class: 'hint' }, t('Deine Fragen und Karten sind jetzt in der Wiederholung.')),
              h('div', { class: 'finish-actions' }, navLinks()),
            ]);
            refresh();
          },
        },
        t('Lektion abschließen'),
      ),
    );
  }

  /* ---------- state ---------- */
  function refresh(scored = false) {
    segs.forEach((s, i) => {
      s.classList.toggle('on', i === cur);
      s.classList.toggle('seen', visited.has(i));
      s.classList.toggle('done', pages[i].kind !== 'read' && pages[i].kind !== 'lab' && pageDone(pages[i]));
    });
    label.textContent = `${cur + 1}/${pages.length}`;
    prevBtn.disabled = cur === 0;
    const p = pages[cur];
    const last = cur === pages.length - 1;
    const pending = (p.kind === 'quiz' || p.kind === 'card') && !pageDone(p);
    nextBtn.hidden = last;
    nextBtn.classList.toggle('ghost', pending);
    nextBtn.classList.toggle('primary', !pending);
    nextBtn.innerHTML = `<span>${pending ? t('Überspringen') : cur === pages.length - 2 ? t('Abschluss') : t('Weiter')}</span>${icon('chevron', 20)}`;
    if (scored && !pending) {
      nextBtn.classList.remove('nudge');
      void nextBtn.offsetWidth;
      nextBtn.classList.add('nudge');
    }
    hint.textContent = last ? '' : pending ? t('Erst antworten, dann weiter') : t('Wischen zum Blättern');
    if (pages[cur].kind === 'finish') drawFinish();
  }

  let busy = false;
  async function go(i, { animate = true } = {}) {
    if (busy || i < 0 || i >= pages.length || i === cur && stage.firstChild) return;
    busy = true;
    const dir = i > cur ? 1 : -1;
    const el = await build(i);
    const old = stage.firstElementChild;
    if (old && animate) await slide(old, el, stage, dir);
    else stage.replaceChildren(el);
    cur = i;
    visited.add(i);
    savePos(lesson.id, cur);
    window.scrollTo(0, 0);
    refresh();
    build(i + 1); // prefetch
    busy = false;
  }

  attachSwipe(stage, {
    canLeft: () => cur < pages.length - 1,
    canRight: () => cur > 0,
    onLeft: () => go(cur + 1),
    onRight: () => go(cur - 1),
  });

  const onKey = (e) => {
    if (!stage.isConnected) return document.removeEventListener('keydown', onKey);
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') go(cur + 1);
    else if (e.key === 'ArrowLeft') go(cur - 1);
  };
  document.addEventListener('keydown', onKey);

  stage.replaceChildren(await build(cur));
  refresh();
  build(cur + 1);

  return h('div', { class: 'page lesson pager', dataset: { stage: chapterMeta(data, id)?.stufe ?? 'A' } }, topbar, stage, bar);
}
