// SM-2 spaced repetition (Wozniak), day granularity. See docs/adr/0004-sm2-wiederholung.md.
import { addDays } from './dates.js';

export const EF_START = 2.5;
export const EF_MIN = 1.3;
export const MATURE_DAYS = 21;

/** Quality grades used by the app (SM-2 scale 0..5). */
export const GRADE = { again: 1, hard: 3, good: 4, easy: 5 };

export function newItem(today) {
  return { ef: EF_START, rep: 0, int: 0, due: today, lapses: 0, seen: 0, ok: 0, last: null };
}

/**
 * Apply one review with quality q (0..5). Returns a new item; input is not mutated.
 * q < 3: lapse, the item restarts and is due again today; EF stays unchanged (original SM-2).
 * q >= 3: EF update, then interval 1 -> 6 -> round(previous * EF).
 */
export function review(item, q, today) {
  const it = { ...(item ?? newItem(today)) };
  it.seen += 1;
  it.last = today;
  if (q < 3) {
    it.rep = 0;
    it.int = 0;
    it.due = today;
    it.lapses += 1;
    return it;
  }
  it.ok += 1;
  it.rep += 1;
  it.ef = Math.max(EF_MIN, it.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (it.rep === 1) it.int = 1;
  else if (it.rep === 2) it.int = 6;
  else it.int = Math.max(it.int + 1, Math.round(it.int * it.ef));
  it.due = addDays(today, it.int);
  return it;
}

export const isDue = (item, today) => Boolean(item) && item.due <= today;

/** 'neu' (never answered), 'lernen' (interval < 21 d), 'gefestigt' (interval >= 21 d). */
export function maturity(item) {
  if (!item || item.seen === 0) return 'neu';
  return item.int >= MATURE_DAYS ? 'gefestigt' : 'lernen';
}
