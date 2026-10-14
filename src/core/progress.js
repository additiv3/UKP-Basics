// Pure progress logic (XP, levels, streak, availability). Functions take state explicitly; no DOM.
import { addDays } from './dates.js';
import { review, isDue, maturity } from './sm2.js';

export const XP = { quizFirst: 10, quizRetry: 3, card: 5, lesson: 20, review: 3 };
export const UNLOCK_THRESHOLD = 0.8;

const LEVEL_TITLES = [
  'Photon-Neuling',
  'Pulsbeobachter',
  'Strahlformer',
  'Fluenz-Kenner',
  'Schwellenjäger',
  'Plasma-Pionier',
  'Ablations-Profi',
  'UKP-Meister',
];

export function totalXp(state) {
  return Object.values(state.days).reduce((sum, d) => sum + (d.xp || 0), 0);
}

export const todayXp = (state, today) => state.days[today]?.xp ?? 0;

const xpForLevel = (level) => 40 * (level - 1) ** 2;

export function levelInfo(xp) {
  const level = 1 + Math.floor(Math.sqrt(xp / 40));
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xp,
    cur,
    next,
    fraction: (xp - cur) / (next - cur),
  };
}

/** Consecutive active days ending today, or yesterday if today has no activity yet. */
export function streak(state, today) {
  let day = state.days[today]?.n ? today : addDays(today, -1);
  let count = 0;
  while (state.days[day]?.n) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

export function addXp(state, today, xp, answers = 0) {
  const d = state.days[today] ?? { xp: 0, n: 0 };
  d.xp += xp;
  d.n += answers;
  state.days[today] = d;
}

/** Record a scored answer: update SM-2 state, activity log and XP. Mutates state. */
export function scoreItem(state, id, q, today, xp) {
  state.items[id] = review(state.items[id], q, today);
  addXp(state, today, xp, 1);
}

export function completeLesson(state, lessonId, today) {
  if (state.lessons[lessonId]) return false;
  state.lessons[lessonId] = { done: today };
  addXp(state, today, XP.lesson, 0);
  return true;
}

/**
 * Record a game result. XP are paid only for points above the previous best (no farming by replaying).
 * Returns { best, newBest, xp }. Mutates state.
 */
export function recordGame(state, id, score, today, xpPerPoint = 2) {
  const cur = state.games[id] ?? { best: 0, plays: 0 };
  const newBest = score > cur.best;
  const xp = newBest ? Math.round((score - cur.best) * xpPerPoint) : 0;
  state.games[id] = { best: Math.max(cur.best, score), plays: cur.plays + 1 };
  addXp(state, today, xp, 1);
  return { best: state.games[id].best, newBest, xp };
}

export const lessonDone = (state, lessonId) => Boolean(state.lessons[lessonId]);

export function dueIds(state, today) {
  return Object.entries(state.items)
    .filter(([, it]) => isDue(it, today))
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || b[1].lapses - a[1].lapses)
    .map(([id]) => id);
}

/** Item ids of a chapter: every quiz/karte block in all lessons. */
export function chapterItemIds(chapter) {
  return chapter.lektionen.flatMap((l) => l.blocks.filter((b) => b.typ === 'quiz' || b.typ === 'karte').map((b) => b.id));
}

export function chapterStats(state, chapter) {
  const lessons = chapter.lektionen.length;
  const done = chapter.lektionen.filter((l) => lessonDone(state, l.id)).length;
  const ids = chapterItemIds(chapter);
  const mature = ids.filter((id) => maturity(state.items[id]) === 'gefestigt').length;
  return { lessons, done, fraction: lessons ? done / lessons : 0, items: ids.length, mature };
}

/**
 * Chapter status for the path view.
 * 'geplant' (no content yet), 'gesperrt' (prerequisites open, not unlocked), 'offen', 'laeuft', 'fertig'.
 */
export function chapterStatus(state, meta, chapters) {
  const chapter = chapters.get(meta.id);
  if (!chapter) return 'geplant';
  const { done, lessons } = chapterStats(state, chapter);
  if (lessons > 0 && done === lessons) return 'fertig';
  if (done > 0) return 'laeuft';
  const prereqOk = (meta.voraussetzungen ?? []).every((pid) => {
    const p = chapters.get(pid);
    return p && chapterStats(state, p).fraction >= UNLOCK_THRESHOLD;
  });
  if (prereqOk || state.unlocked.includes(meta.id)) return 'offen';
  return 'gesperrt';
}
