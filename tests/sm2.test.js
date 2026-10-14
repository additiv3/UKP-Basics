import { test } from 'node:test';
import assert from 'node:assert/strict';
import { review, newItem, isDue, maturity, EF_MIN, GRADE } from '../src/core/sm2.js';
import { addDays, diffDays, toDay } from '../src/core/dates.js';

const T0 = '2026-10-14';

test('dates: addDays crosses month and year boundaries and leap day', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(diffDays('2026-10-14', '2026-10-21'), 7);
  assert.equal(toDay(new Date(2026, 0, 5)), '2026-01-05');
});

test('first successful reviews give 1, 6, then EF-scaled intervals', () => {
  let it = review(null, GRADE.good, T0);
  assert.equal(it.int, 1);
  assert.equal(it.due, '2026-10-15');
  it = review(it, GRADE.good, '2026-10-15');
  assert.equal(it.int, 6);
  assert.equal(it.due, '2026-10-21');
  it = review(it, GRADE.good, '2026-10-21');
  assert.equal(it.int, 15); // round(6 * 2.5)
  assert.equal(it.ef, 2.5); // q = 4 leaves EF unchanged
});

test('easy raises EF, hard lowers it, EF never below 1.3', () => {
  let it = review(null, GRADE.easy, T0);
  assert.ok(Math.abs(it.ef - 2.6) < 1e-9);
  let h = newItem(T0);
  for (let i = 0; i < 30; i++) h = review(h, GRADE.hard, T0);
  assert.equal(h.ef, EF_MIN);
});

test('lapse resets repetitions, keeps EF, is due today', () => {
  let it = review(null, GRADE.good, T0);
  it = review(it, GRADE.easy, '2026-10-15');
  const efBefore = it.ef;
  it = review(it, GRADE.again, '2026-10-21');
  assert.equal(it.rep, 0);
  assert.equal(it.int, 0);
  assert.equal(it.due, '2026-10-21');
  assert.equal(it.lapses, 1);
  assert.equal(it.ef, efBefore);
  it = review(it, GRADE.good, '2026-10-21');
  assert.equal(it.int, 1);
});

test('review does not mutate its input', () => {
  const a = newItem(T0);
  const snapshot = JSON.stringify(a);
  review(a, GRADE.good, T0);
  assert.equal(JSON.stringify(a), snapshot);
});

test('intervals strictly grow for q >= 3 after the second repetition', () => {
  let it = newItem(T0);
  let day = T0;
  let prev = 0;
  for (let i = 0; i < 8; i++) {
    it = review(it, GRADE.hard, day);
    if (i >= 2) assert.ok(it.int > prev, `interval ${it.int} should exceed ${prev}`);
    prev = it.int;
    day = it.due;
  }
});

test('isDue and maturity', () => {
  let it = review(null, GRADE.good, T0);
  assert.equal(isDue(it, T0), false);
  assert.equal(isDue(it, '2026-10-15'), true);
  assert.equal(isDue(null, T0), false);
  assert.equal(maturity(null), 'neu');
  assert.equal(maturity(it), 'lernen');
  it = { ...it, int: 21 };
  assert.equal(maturity(it), 'gefestigt');
});
