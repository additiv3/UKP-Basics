// Lesson page: content blocks with inline questions; finish unlocks when every question was answered once.
import { h, append, clear } from '../dom.js';
import { icon } from '../icons.js';
import * as store from '../../core/store.js';
import { completeLesson, lessonDone, levelInfo, totalXp, XP } from '../../core/progress.js';
import { toDay } from '../../core/dates.js';
import { renderBlock } from '../../blocks/registry.js';

const isItem = (b) => b.typ === 'quiz' || b.typ === 'karte';

export async function render({ id, lektion }, app) {
  const { data } = app;
  const chapter = data.chapters.get(id);
  const lesson = chapter?.lektionen.find((l) => l.id === lektion);
  if (!lesson) return h('div', { class: 'page' }, h('a', { class: 'back', href: '#/' }, 'Zurück'), h('p', {}, 'Lektion nicht gefunden.'));

  const idx = chapter.lektionen.indexOf(lesson);
  const next = chapter.lektionen[idx + 1];
  const items = lesson.blocks.filter(isItem);
  const answered = () => items.filter((b) => (store.get().items[b.id]?.seen ?? 0) > 0).length;

  const fill = h('div', { class: 'progress-fill' });
  const label = h('span', { class: 'topbar-count' });
  const finish = h('section', { class: 'finish' });
  const topbar = h('header', { class: 'topbar' }, h('a', { class: 'back', href: `#/kapitel/${id}`, 'aria-label': 'Zurück zum Kapitel', html: icon('back', 22) }), h('div', { class: 'progress grow', role: 'progressbar', 'aria-label': 'Fragen beantwortet' }, fill), label);

  const navLinks = () => [next ? h('a', { class: 'btn btn-primary', href: `#/kapitel/${id}/${next.id}` }, `Weiter: ${next.titel}`) : null, h('a', { class: next ? 'btn btn-ghost' : 'btn btn-primary', href: `#/kapitel/${id}` }, 'Zum Kapitel')];

  function drawFinish() {
    if (lessonDone(store.get(), lesson.id)) {
      finish.replaceChildren(h('p', { class: 'verdict ok' }, 'Lektion abgeschlossen'), h('div', { class: 'quiz-actions' }, navLinks()));
      return;
    }
    const ready = answered() >= items.length;
    finish.replaceChildren(
      h('p', { class: 'hint' }, ready ? 'Alle Fragen beantwortet.' : `Noch ${items.length - answered()} ${items.length - answered() === 1 ? 'Frage' : 'Fragen'} offen.`),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary btn-wide',
          disabled: !ready,
          onClick: () => {
            const before = levelInfo(totalXp(store.get())).level;
            store.mutate((s) => completeLesson(s, lesson.id, toDay()));
            const after = levelInfo(totalXp(store.get()));
            finish.classList.add('celebrate');
            append(clear(finish), [
              h('p', { class: 'verdict ok' }, 'Geschafft!', h('span', { class: 'xp-chip' }, ` +${XP.lesson} XP`)),
              after.level > before ? h('p', { class: 'levelup' }, `Level ${after.level}: ${after.title}`) : null,
              h('p', { class: 'hint' }, 'Deine Fragen und Karten sind jetzt in der Wiederholung.'),
              h('div', { class: 'quiz-actions' }, navLinks()),
            ]);
          },
        },
        'Lektion abschließen',
      ),
    );
  }

  function refresh() {
    const n = answered();
    fill.style.width = items.length ? `${Math.round((n / items.length) * 100)}%` : '100%';
    label.textContent = items.length ? `${n}/${items.length}` : '';
    drawFinish();
  }

  const ctx = { data, mode: 'lesson', onScored: refresh };
  const content = h('div', { class: 'lesson-blocks' });
  for (const block of lesson.blocks) content.append(await renderBlock(block, ctx));
  refresh();

  return h('div', { class: 'page lesson' }, topbar, h('p', { class: 'kicker' }, `${chapter.titel} · Lektion ${idx + 1}`), h('h1', {}, lesson.titel), content, finish);
}
