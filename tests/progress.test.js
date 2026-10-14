import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/core/store.js';
import { addXp, completeLesson, levelInfo, scoreItem, streak, totalXp, dueIds, chapterStatus, XP } from '../src/core/progress.js';
import { buildExport, mergeStates, parseImport } from '../src/core/exportimport.js';

test('level thresholds follow 1 + floor(sqrt(xp/40))', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(39).level, 1);
  assert.equal(levelInfo(40).level, 2);
  assert.equal(levelInfo(160).level, 3);
  assert.ok(levelInfo(100).fraction > 0 && levelInfo(100).fraction < 1);
});

test('streak counts consecutive days, stays alive until the end of today', () => {
  const s = defaultState();
  addXp(s, '2026-10-12', 10, 1);
  addXp(s, '2026-10-13', 10, 1);
  assert.equal(streak(s, '2026-10-13'), 2);
  assert.equal(streak(s, '2026-10-14'), 2); // yesterday active, today not yet
  assert.equal(streak(s, '2026-10-15'), 0); // gap
  addXp(s, '2026-10-14', 5, 1);
  assert.equal(streak(s, '2026-10-14'), 3);
});

test('scoring an item updates SM-2 state and XP; lessons award XP once', () => {
  const s = defaultState();
  scoreItem(s, 'k01.q01', 4, '2026-10-14', XP.quizFirst);
  assert.equal(s.items['k01.q01'].due, '2026-10-15');
  assert.equal(totalXp(s), 10);
  assert.deepEqual(dueIds(s, '2026-10-14'), []);
  assert.deepEqual(dueIds(s, '2026-10-15'), ['k01.q01']);
  assert.equal(completeLesson(s, 'k01.l01', '2026-10-14'), true);
  assert.equal(completeLesson(s, 'k01.l01', '2026-10-14'), false);
  assert.equal(totalXp(s), 10 + XP.lesson);
});

test('chapter status: planned, locked, open, running, done', () => {
  const s = defaultState();
  const ch = (id, lessons) => ({ id, lektionen: lessons.map((l) => ({ id: l, blocks: [] })) });
  const chapters = new Map([
    ['k01', ch('k01', ['k01.l01', 'k01.l02'])],
    ['k02', ch('k02', ['k02.l01'])],
  ]);
  const m1 = { id: 'k01', voraussetzungen: [] };
  const m2 = { id: 'k02', voraussetzungen: ['k01'] };
  assert.equal(chapterStatus(s, { id: 'k03', voraussetzungen: [] }, chapters), 'geplant');
  assert.equal(chapterStatus(s, m1, chapters), 'offen');
  assert.equal(chapterStatus(s, m2, chapters), 'gesperrt');
  completeLesson(s, 'k01.l01', '2026-10-14');
  assert.equal(chapterStatus(s, m1, chapters), 'laeuft');
  assert.equal(chapterStatus(s, m2, chapters), 'gesperrt'); // 50 % < 80 %
  completeLesson(s, 'k01.l02', '2026-10-14');
  assert.equal(chapterStatus(s, m1, chapters), 'fertig');
  assert.equal(chapterStatus(s, m2, chapters), 'offen');
  const s2 = defaultState();
  s2.unlocked.push('k02');
  assert.equal(chapterStatus(s2, m2, chapters), 'offen');
});

test('export round-trips and import rejects foreign or broken files', () => {
  const s = defaultState();
  scoreItem(s, 'k01.q01', 4, '2026-10-14', 10);
  const text = JSON.stringify(buildExport(s, '0.1.0'));
  const back = parseImport(text);
  assert.equal(back.items['k01.q01'].due, '2026-10-15');
  assert.throws(() => parseImport('{nope'), /JSON/);
  assert.throws(() => parseImport(JSON.stringify({ app: 'Other', schema: 1, data: {} })), /UKP-Basics/);
  assert.throws(() => parseImport(JSON.stringify({ app: 'UKP-Basics', schema: 99, data: {} })), /neueren/);
  const bad = JSON.parse(text);
  bad.data.items.broken = { ef: 'x' };
  assert.equal(parseImport(JSON.stringify(bad)).items.broken, undefined);
});

test('merge keeps the more recently reviewed item and the larger day totals', () => {
  const a = defaultState();
  const b = defaultState();
  scoreItem(a, 'q1', 4, '2026-10-10', 10);
  scoreItem(b, 'q1', 5, '2026-10-12', 10);
  scoreItem(b, 'q2', 4, '2026-10-12', 10);
  const m = mergeStates(a, b);
  assert.equal(m.items.q1.last, '2026-10-12');
  assert.ok(m.items.q2);
  assert.equal(m.days['2026-10-10'].xp, 10);
  assert.equal(m.days['2026-10-12'].xp, 20);
});
