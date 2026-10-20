import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, formatResult, plainResult } from '../src/core/calc.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('basic arithmetic and precedence', () => {
  assert.equal(evaluate('2+3×4'), 14);
  assert.equal(evaluate('(2+3)×4'), 20);
  assert.equal(evaluate('10÷4'), 2.5);
  assert.equal(evaluate('−2^2'), -4);
  assert.equal(evaluate('2^−3'), 0.125);
  assert.equal(evaluate('2^3^2'), 512);
});

test('scientific input and implicit multiplication', () => {
  assert.equal(evaluate('3E8'), 3e8);
  assert.equal(evaluate('2.5E−6'), 2.5e-6);
  close(evaluate('2π'), 2 * Math.PI);
  assert.equal(evaluate('3(4+1)'), 15);
  close(evaluate('(2)(3)'), 6);
});

test('functions, constants and angle mode', () => {
  close(evaluate('√(16)'), 4);
  close(evaluate('√16'), 4);
  close(evaluate('ln(e)'), 1);
  close(evaluate('log(1000)'), 3);
  close(evaluate('sin(30)', { angle: 'deg' }), 0.5);
  close(evaluate('sin(π÷2)', { angle: 'rad' }), 1);
  close(evaluate('atan(1)', { angle: 'deg' }), 45);
  assert.equal(evaluate('Ans×2', { ans: 21 }), 42);
});

test('unclosed parentheses are closed for live preview', () => {
  assert.equal(evaluate('2×(3+4'), 14);
  assert.equal(evaluate('√(9'), 3);
});

test('syntax errors throw', () => {
  for (const bad of ['2+', '×3', '(', ')', '2++', '1,5', 'abc', '']) {
    assert.throws(() => evaluate(bad), undefined, bad);
  }
});

test('physics example: peak fluence', () => {
  // F0 = 2 Ep / (pi w0^2), Ep = 5 uJ, w0 = 10 um = 1e-3 cm
  close(evaluate('2×5E−6÷(π×(1E−3)^2)'), 3.1830988618, 1e-9);
});

test('formatting', () => {
  assert.equal(formatResult(14), '14');
  assert.equal(formatResult(0.1 + 0.2), '0.3');
  assert.equal(formatResult(2.5, ','), '2,5');
  assert.equal(formatResult(3.3e7), '3.3 × 10⁷');
  assert.equal(formatResult(1.5e-5, ','), '1,5 × 10⁻⁵');
  assert.equal(formatResult(Infinity), 'Error');
  assert.equal(plainResult(1.5e-5), '0.000015');
  assert.equal(plainResult(3e-7), '3e-7');
});

test('exp result for expressions', async () => {
  const { exprResult } = await import('../src/core/calc.js');
  assert.equal(exprResult(14), '14');
  assert.equal(exprResult(3e-7), '3E-7');
  assert.equal(evaluate(exprResult(1.5e12)), 1.5e12);
});
