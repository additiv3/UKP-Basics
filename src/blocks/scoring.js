// Shared scoring rules for quiz and karte blocks (SM-2 + XP). See docs/lernpfad.md section 3.
import * as store from '../core/store.js';
import { scoreItem, addXp, XP } from '../core/progress.js';
import { GRADE } from '../core/sm2.js';
import { toDay } from '../core/dates.js';

export const isKnown = (id) => (store.get().items[id]?.seen ?? 0) > 0;

/**
 * Score a quiz answer. Lesson mode: only the first attempt of a new item counts for SM-2;
 * a correct retry after a counted miss gives a small XP bonus once. Review mode: always counts.
 * flags: per-block-instance object { known, firstCounted, retryPaid } (mutated).
 */
export function scoreQuizAnswer(id, correct, ctx, attempt, flags) {
  const today = toDay();
  if (ctx.mode === 'review') {
    const xp = correct ? XP.review : 0;
    store.mutate((s) => scoreItem(s, id, correct ? GRADE.good : GRADE.again, today, xp));
    return { xp, counted: true };
  }
  if (attempt === 1 && !flags.known) {
    const xp = correct ? XP.quizFirst : 0;
    store.mutate((s) => scoreItem(s, id, correct ? GRADE.good : GRADE.again, today, xp));
    flags.firstCounted = true;
    return { xp, counted: true };
  }
  if (attempt > 1 && correct && flags.firstCounted && !flags.retryPaid) {
    store.mutate((s) => addXp(s, today, XP.quizRetry, 0));
    flags.retryPaid = true;
    return { xp: XP.quizRetry, counted: false };
  }
  return { xp: 0, counted: false };
}

/** Score a flashcard grade (SM-2 quality 1/3/4/5). Returns { xp, counted }. */
export function scoreCard(id, grade, ctx, flags) {
  const today = toDay();
  if (ctx.mode === 'review') {
    const xp = grade >= 3 ? XP.review : 0;
    store.mutate((s) => scoreItem(s, id, grade, today, xp));
    return { xp, counted: true };
  }
  if (!flags.known) {
    store.mutate((s) => scoreItem(s, id, grade, today, XP.card));
    return { xp: XP.card, counted: true };
  }
  return { xp: 0, counted: false };
}
