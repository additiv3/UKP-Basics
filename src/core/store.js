// Single source of truth for learner state. Persisted synchronously on every mutation (small JSON).
import * as storage from './storage.js';
import { toDay } from './dates.js';

export const SCHEMA = 1;

export function defaultState() {
  return {
    schema: SCHEMA,
    profile: { created: toDay(), lastExport: null },
    days: {}, // 'YYYY-MM-DD' -> { xp, n }
    items: {}, // item id -> SM-2 state
    lessons: {}, // lesson id -> { done: 'YYYY-MM-DD' }
    unlocked: [], // chapter ids opened manually
    games: {}, // game id -> { best, plays }
    settings: { dailyGoal: 40, reviewBatch: 15, lang: 'de' },
  };
}

/** Fill gaps in a loaded/imported object so the rest of the app can rely on the shape. */
export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    schema: SCHEMA,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    items: raw.items && typeof raw.items === 'object' ? raw.items : {},
    lessons: raw.lessons && typeof raw.lessons === 'object' ? raw.lessons : {},
    unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : [],
    games: raw.games && typeof raw.games === 'object' ? raw.games : {},
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  };
}

let state = defaultState();
const listeners = new Set();

export function init() {
  state = migrate(storage.load());
  return state;
}

export const get = () => state;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit() {
  storage.save(state);
  listeners.forEach((fn) => fn(state));
}

/** Mutate state in place via fn, then persist and notify. */
export function mutate(fn) {
  fn(state);
  commit();
}

export function replace(next) {
  state = migrate(next);
  commit();
}

export function reset() {
  state = defaultState();
  commit();
}
