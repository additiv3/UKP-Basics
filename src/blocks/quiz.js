// Quiz block. Types (block.art): multiple-choice, zuordnung, luecke, sortieren, zahl.
// Each builder returns a widget: { el, needsCheck, canCheck(), evaluate(), mark(correct) }.
import { h, shuffled, clear, append } from '../ui/dom.js';
import { rich, inline } from '../core/richtext.js';
import { icon } from '../ui/icons.js';
import { num } from '../core/format.js';
import { scoreQuizAnswer, isKnown } from './scoring.js';

/** Parse 12,5 | 1.2e13 | 1,2 x 10^13 | 10^13 -> number (NaN if unreadable). */
export function parseNumber(input) {
  const s = String(input).trim().replace(/\s+/g, ' ').replace(',', '.');
  let m = /^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)$/.exec(s);
  if (m) return Number(m[1]);
  m = /^([+-]?\d*\.?\d+)?\s*(?:[x×*·]\s*)?10\s*\^\s*\(?([+-]?\d+)\)?$/.exec(s);
  if (m) return (m[1] === undefined ? 1 : Number(m[1])) * 10 ** Number(m[2]);
  return NaN;
}

function buildMc(block, { onChange, submit }) {
  const multi = Array.isArray(block.richtig);
  const correctSet = new Set(multi ? block.richtig : [block.richtig]);
  const idxs = block.optionen.map((_, i) => i);
  const order = block.fest ? idxs : shuffled(idxs);
  const selected = new Set();
  let locked = false;
  const buttons = order.map((idx) =>
    h(
      'button',
      {
        type: 'button',
        class: 'opt',
        dataset: { idx },
        'aria-pressed': multi ? 'false' : null,
        onClick: (e) => {
          if (locked) return;
          const btn = e.currentTarget;
          if (!multi) {
            selected.add(idx);
            submit();
            return;
          }
          if (selected.has(idx)) selected.delete(idx);
          else selected.add(idx);
          btn.classList.toggle('sel', selected.has(idx));
          btn.setAttribute('aria-pressed', String(selected.has(idx)));
          onChange();
        },
      },
      h('span', { html: inline(block.optionen[idx]) }),
    ),
  );
  const el = h('div', {}, multi ? h('p', { class: 'hint' }, 'Mehrere Antworten möglich.') : null, h('div', { class: 'opts', role: multi ? 'group' : 'radiogroup' }, buttons));
  return {
    el,
    needsCheck: multi,
    canCheck: () => selected.size > 0,
    evaluate: () => selected.size === correctSet.size && [...selected].every((i) => correctSet.has(i)),
    mark() {
      locked = true;
      for (const b of buttons) {
        const i = Number(b.dataset.idx);
        b.disabled = true;
        if (correctSet.has(i)) b.classList.add('ok');
        else if (selected.has(i)) b.classList.add('bad');
      }
    },
  };
}

function buildMatch(block, { onChange }) {
  const rights = shuffled([...new Set(block.paare.map((p) => p[1]))]);
  const rows = block.paare.map(([left, right]) => {
    const sel = h('select', { class: 'select', 'aria-label': left, onChange: () => onChange() }, h('option', { value: '' }, '– wählen –'), rights.map((r) => h('option', { value: r }, r)));
    return { right, sel, el: h('div', { class: 'match-row' }, h('span', { class: 'match-left', html: inline(left) }), sel) };
  });
  return {
    el: h('div', { class: 'match' }, rows.map((r) => r.el)),
    needsCheck: true,
    canCheck: () => rows.every((r) => r.sel.value !== ''),
    evaluate: () => rows.every((r) => r.sel.value === r.right),
    mark() {
      for (const r of rows) {
        const ok = r.sel.value === r.right;
        r.sel.disabled = true;
        r.sel.classList.add(ok ? 'ok' : 'bad');
        if (!ok) r.el.append(h('span', { class: 'right-answer' }, `Richtig: ${r.right}`));
      }
    },
  };
}

function buildCloze(block, { onChange }) {
  const parts = block.text.split('___');
  const gaps = block.luecken.map((g) => ({
    right: g.optionen[g.richtig],
    sel: h('select', { class: 'select inline', onChange: () => onChange() }, h('option', { value: '' }, '…'), shuffled(g.optionen).map((o) => h('option', { value: o }, o))),
  }));
  return {
    el: h('p', { class: 'cloze' }, parts.flatMap((p, i) => [h('span', { html: inline(p) }), gaps[i]?.sel])),
    needsCheck: true,
    canCheck: () => gaps.every((g) => g.sel.value !== ''),
    evaluate: () => gaps.every((g) => g.sel.value === g.right),
    mark() {
      for (const g of gaps) {
        const ok = g.sel.value === g.right;
        g.sel.disabled = true;
        g.sel.classList.add(ok ? 'ok' : 'bad');
        if (!ok) g.sel.after(h('span', { class: 'right-answer' }, ` → ${g.right}`));
      }
    },
  };
}

function buildSort(block) {
  const n = block.items.length;
  let order = shuffled(block.items.map((_, i) => i));
  while (n > 1 && order.every((v, i) => v === i)) order = shuffled(order);
  let locked = false;
  const list = h('ol', { class: 'sortlist' });
  let result = null; // per-position correctness after marking
  const move = (pos, d) => {
    [order[pos], order[pos + d]] = [order[pos + d], order[pos]];
    draw();
  };
  function draw() {
    clear(list);
    order.forEach((idx, pos) => {
      const li = h(
        'li',
        { class: result ? (result[pos] ? 'ok' : 'bad') : null },
        h('span', { class: 'sort-label', html: inline(block.items[idx]) }),
        locked
          ? null
          : h(
              'span',
              { class: 'sort-btns' },
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nach oben', disabled: pos === 0, onClick: () => move(pos, -1), html: icon('up') }),
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nach unten', disabled: pos === n - 1, onClick: () => move(pos, 1), html: icon('down') }),
            ),
      );
      list.append(li);
    });
  }
  draw();
  const el = h('div', { class: 'sort' }, block.oben ? h('p', { class: 'sort-end' }, `▲ ${block.oben}`) : null, list, block.unten ? h('p', { class: 'sort-end' }, `▼ ${block.unten}`) : null);
  return {
    el,
    needsCheck: true,
    canCheck: () => true,
    evaluate: () => order.every((v, i) => v === i),
    mark() {
      locked = true;
      result = order.map((v, i) => v === i);
      draw();
      if (!result.every(Boolean)) {
        el.append(h('div', { class: 'right-answer block' }, 'Richtige Reihenfolge: ', h('ol', {}, block.items.map((t) => h('li', { html: inline(t) })))));
      }
    },
  };
}

function buildNumber(block, { onChange, submit }) {
  const input = h('input', {
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    class: 'input',
    'aria-label': 'Antwort',
    placeholder: 'Zahl eingeben',
    onInput: () => onChange(),
    onKeydown: (e) => {
      if (e.key === 'Enter' && !Number.isNaN(parseNumber(input.value))) submit();
    },
  });
  const tol = block.toleranz ?? 0.05;
  return {
    el: h('div', { class: 'number-answer' }, input, block.einheit ? h('span', { class: 'unit', html: inline(block.einheit) }) : null),
    needsCheck: true,
    canCheck: () => !Number.isNaN(parseNumber(input.value)),
    evaluate: () => Math.abs(parseNumber(input.value) - block.antwort) <= tol * Math.abs(block.antwort),
    mark(correct) {
      input.disabled = true;
      input.classList.add(correct ? 'ok' : 'bad');
      if (!correct) input.parentElement.after(h('p', { class: 'right-answer' }, `Richtig: ${num(block.antwort)}${block.einheit ? ' ' + block.einheit.replace(/\\,|\$/g, ' ').trim() : ''}${tol > 0 ? ` (Toleranz ±${Math.round(tol * 100)} %)` : ''}`));
    },
  };
}

const BUILDERS = { 'multiple-choice': buildMc, zuordnung: buildMatch, luecke: buildCloze, sortieren: buildSort, zahl: buildNumber };

export function render(block, ctx) {
  const build = BUILDERS[block.art];
  if (!build) return h('div', {}, `Unbekannte Quizart „${block.art}"`);

  const flags = { known: isKnown(block.id), firstCounted: false, retryPaid: false };
  let attempt = 0;
  let widget;
  const question = h('div', { class: 'quiz-q prose', html: rich(block.frage) });
  const holder = h('div');
  const checkBtn = h('button', { type: 'button', class: 'btn btn-primary', onClick: () => submit() }, 'Prüfen');
  const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
  const root = h('div', { class: 'quiz' }, h('span', { class: 'quiz-tag' }, 'Frage'), question, holder, feedback);

  const refreshCheck = () => {
    checkBtn.disabled = !widget.canCheck();
  };

  function mount() {
    widget = build(block, { onChange: refreshCheck, submit });
    clear(holder).append(widget.el);
    if (widget.needsCheck) {
      holder.append(h('div', { class: 'quiz-actions' }, checkBtn));
      refreshCheck();
    }
    clear(feedback);
  }

  function submit() {
    if (widget.needsCheck && !widget.canCheck()) return;
    attempt += 1;
    const correct = widget.evaluate();
    widget.mark(correct);
    checkBtn.parentElement?.remove();
    const res = scoreQuizAnswer(block.id, correct, ctx, attempt, flags);
    const practice = ctx.mode === 'lesson' && flags.known && attempt === 1;
    clear(feedback);
    append(feedback, [
      h('p', { class: `verdict ${correct ? 'ok' : 'bad'}` }, correct ? 'Richtig!' : 'Nicht ganz.', res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
      practice ? h('p', { class: 'hint' }, 'Übung: Diese Frage ist schon in deiner Wiederholung.') : null,
      block.erklaerung ? h('div', { class: 'prose small explanation', html: rich(block.erklaerung) }) : null,
    ]);
    const actions = h('div', { class: 'quiz-actions' });
    if (ctx.mode === 'review') {
      actions.append(h('button', { type: 'button', class: 'btn btn-primary', onClick: () => ctx.onNext?.(correct) }, 'Weiter'));
    } else if (!correct) {
      actions.append(h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => mount() }, 'Nochmal versuchen'));
    }
    feedback.append(actions);
    ctx.onScored?.();
  }

  mount();
  return root;
}
