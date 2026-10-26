import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { paginate } from '../src/core/paginate.js';
import { compile } from '../src/ui/plotfig.js';

const b = (typ, id = typ) => ({ typ, id });

test('paginate: questions, cards and simulations get their own page', () => {
  const pages = paginate([b('text', 't1'), b('formel'), b('merke'), b('quiz', 'q1'), b('quiz', 'q2'), b('sim'), b('karte', 'c1')]);
  assert.deepEqual(pages.map((p) => p.kind), ['read', 'quiz', 'quiz', 'lab', 'card']);
  assert.equal(pages[0].blocks.length, 3);
});

test('paginate: a new text after non-text blocks starts a new reading page, long pages are split', () => {
  const pages = paginate([b('text', 'a'), b('formel', 'f'), b('text', 'b'), b('text', 'c'), b('formel'), b('formel'), b('formel'), b('formel')]);
  assert.deepEqual(pages.map((p) => p.blocks.length), [2, 4, 2]);
});

test('paginate: every block of every chapter lands on exactly one page', () => {
  for (const f of readdirSync('content/chapters')) {
    const ch = JSON.parse(readFileSync(`content/chapters/${f}`, 'utf8'));
    for (const l of ch.lektionen) {
      const pages = paginate(l.blocks);
      assert.equal(pages.flatMap((p) => p.blocks).length, l.blocks.length, l.id);
      assert.ok(pages.every((p) => p.blocks.length > 0), l.id);
    }
  }
});

test('plot curves compile with the calculator parser', () => {
  assert.ok(Math.abs(compile('15*sqrt(1+(x/0.6)^2)')(0.6) - 15 * Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(compile('288*ln(x/0.4)')(4) - 288 * Math.log(10)) < 1e-9);
  assert.ok(Math.abs(compile('(x/1E12)^3')(2e12) - 8) < 1e-9);
  assert.ok(Number.isNaN(compile('foo(x)')(1)));
});

test('all plots in the content evaluate to finite numbers', () => {
  for (const f of readdirSync('content/chapters')) {
    const ch = JSON.parse(readFileSync(`content/chapters/${f}`, 'utf8'));
    for (const l of ch.lektionen) {
      for (const blk of l.blocks) {
        if (!blk.plot) continue;
        const { x } = blk.plot;
        for (const k of blk.plot.kurven ?? []) {
          const fn = compile(k.f);
          for (const v of [x.min, x.log ? Math.sqrt(x.min * x.max) : (x.min + x.max) / 2, x.max]) assert.ok(Number.isFinite(fn(v)), `${blk.id}: ${k.f} at ${v}`);
        }
      }
    }
  }
});
