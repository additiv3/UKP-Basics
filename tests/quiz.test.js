import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber } from '../src/blocks/quiz.js';

test('parseNumber accepts german and english notations', () => {
  assert.equal(parseNumber('12,5'), 12.5);
  assert.equal(parseNumber('1.2e13'), 1.2e13);
  assert.equal(parseNumber('3.857176422e-19'), 3.857176422e-19);
  assert.equal(parseNumber('1,2 x 10^13'), 1.2e13);
  assert.equal(parseNumber('−5'), -5);
  assert.ok(Number.isNaN(parseNumber('abc')));
});

test('answerScales: scaled and prefixed units also accept the plain SI value', async () => {
  const { answerScales } = await import('../src/blocks/quiz.js');
  assert.deepEqual(answerScales('J/cm²'), [1]);
  assert.deepEqual(answerScales('MW'), [1, 1e6]);
  assert.deepEqual(answerScales('µm'), [1, 1e-6]);
  assert.deepEqual(answerScales('·10⁻¹⁹ J'), [1, 1e-19]);
  assert.deepEqual(answerScales('·10¹² W/cm²'), [1, 1e12]);
  assert.deepEqual(answerScales('mm'), [1, 1e-3]);
  assert.deepEqual(answerScales(''), [1]);
});
