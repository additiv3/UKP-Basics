// Quiz block. Types (block.art): multiple-choice, zuordnung, luecke, sortieren, zahl, rechenweg.
// Each builder returns a widget: { el, needsCheck, canCheck(), evaluate(), mark(correct) }.
// Phone-first input: tap or drag tiles (zuordnung, rechenweg), tap-to-fill gaps, drag handles for sorting,
// and a pocket calculator wired into number answers.
import { h, shuffled, clear, append } from '../ui/dom.js';
import { rich, inline } from '../core/richtext.js';
import { icon } from '../ui/icons.js';
import { num } from '../core/format.js';
import { t } from '../core/i18n.js';
import { plotFigure } from '../ui/plotfig.js';
import { createBoard, sortable } from '../ui/board.js';
import { openCalculator } from '../ui/calculator.js';
import { scoreQuizAnswer, isKnown } from './scoring.js';

const SUP_DIGITS = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
const SI_PREFIX = { f: -15, p: -12, n: -9, µ: -6, m: -3, k: 3, M: 6, G: 9, T: 12 };

/**
 * Factors by which the stored answer may also be given. A unit like "·10⁻¹⁹ J" or "MW" is convenient to read,
 * but the pocket calculator returns the plain SI value, so that is accepted as well.
 */
export function answerScales(einheit) {
  const out = [1];
  const u = String(einheit ?? '').trim();
  const sci = /^[·×*]\s*10(⁻)?([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/.exec(u);
  if (sci) out.push(10 ** ((sci[1] ? -1 : 1) * Number([...sci[2]].map((c) => SUP_DIGITS[c]).join(''))));
  const pre = /^([fpnµmkMGT])(W|J|m|s|Hz|Pa|rad|eV)$/.exec(u);
  if (pre) out.push(10 ** SI_PREFIX[pre[1]]);
  return out;
}

/** Parse 12,5 | 1.2e13 | 1,2 x 10^13 | 10^13 -> number (NaN if unreadable). */
export function parseNumber(input) {
  const s = String(input).trim().replace(/\s+/g, ' ').replace(',', '.').replace(/−/g, '-');
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
  const el = h('div', {}, multi ? h('p', { class: 'hint' }, t('Mehrere Antworten möglich.')) : null, h('div', { class: 'opts', role: multi ? 'group' : 'radiogroup' }, buttons));
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

/** Matching: drag or tap the answer tiles into the slots next to each term. */
function buildMatch(block, { onChange }) {
  const rights = [...new Set(block.paare.map((p) => p[1]))];
  const tiles = shuffled(rights).map((r) => ({ id: r, html: inline(r) }));
  const board = createBoard({ tiles, slots: block.paare.map((_, i) => `r${i}`), onChange });
  const rows = block.paare.map(([left], i) => ({ el: h('div', { class: 'match-row' }, h('span', { class: 'match-left', html: inline(left) }), board.slot(`r${i}`, 'wide')), i }));
  return {
    el: h('div', { class: 'match board' }, h('p', { class: 'hint' }, t('Tippe eine Kachel an oder ziehe sie in das passende Feld.')), rows.map((r) => r.el), board.pool),
    needsCheck: true,
    canCheck: () => board.full(),
    evaluate: () => block.paare.every((p, i) => board.values()[`r${i}`] === p[1]),
    mark() {
      board.lock();
      const vals = board.values();
      rows.forEach((r, i) => {
        const ok = vals[`r${i}`] === block.paare[i][1];
        board.mark(`r${i}`, ok);
        if (!ok) r.el.append(h('span', { class: 'right-answer' }, t('Richtig: {a}', { a: block.paare[i][1] })));
      });
    },
  };
}

/** Cloze: tap a gap, then tap the word. */
function buildCloze(block, { onChange }) {
  const parts = block.text.split('___');
  const choice = Array(block.luecken.length).fill(null);
  let active = 0;
  let locked = false;
  const gapEls = block.luecken.map((_, i) => h('button', { type: 'button', class: 'gap', onClick: () => { if (!locked) { active = i; draw(); } } }));
  const options = h('div', { class: 'gap-options', role: 'group' });
  function draw() {
    gapEls.forEach((el, i) => {
      el.textContent = choice[i] ?? '…';
      el.classList.toggle('filled', choice[i] != null);
      el.classList.toggle('active', !locked && i === active);
    });
    clear(options);
    if (locked) return;
    block.luecken[active].optionen.forEach((o) =>
      options.append(
        h('button', { type: 'button', class: `chip btn-chip tilebtn ${choice[active] === o ? 'on' : ''}`, onClick: () => {
          choice[active] = o;
          const next = choice.findIndex((c) => c == null);
          if (next >= 0) active = next;
          draw();
          onChange();
        } }, o),
      ),
    );
  }
  draw();
  return {
    el: h('div', { class: 'cloze-wrap' }, h('p', { class: 'cloze' }, parts.flatMap((p, i) => [h('span', { html: inline(p) }), gapEls[i]])), options),
    needsCheck: true,
    canCheck: () => choice.every((c) => c != null),
    evaluate: () => block.luecken.every((g, i) => choice[i] === g.optionen[g.richtig]),
    mark() {
      locked = true;
      block.luecken.forEach((g, i) => {
        const right = g.optionen[g.richtig];
        const ok = choice[i] === right;
        gapEls[i].disabled = true;
        gapEls[i].classList.add(ok ? 'ok' : 'bad');
        if (!ok) gapEls[i].after(h('span', { class: 'right-answer' }, ` → ${right}`));
      });
      draw();
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
  sortable(list, (next) => {
    order = next;
    draw();
  });
  function draw() {
    clear(list);
    order.forEach((idx, pos) => {
      const li = h(
        'li',
        { class: result ? (result[pos] ? 'ok' : 'bad') : null, dataset: { idx } },
        locked ? null : h('span', { class: 'drag-handle', dataset: { handle: '1' }, 'aria-hidden': 'true', html: icon('drag', 20) }),
        h('span', { class: 'sort-label', html: inline(block.items[idx]) }),
        locked
          ? null
          : h(
              'span',
              { class: 'sort-btns' },
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Nach oben'), disabled: pos === 0, onClick: () => move(pos, -1), html: icon('up') }),
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Nach unten'), disabled: pos === n - 1, onClick: () => move(pos, 1), html: icon('down') }),
            ),
      );
      list.append(li);
    });
  }
  draw();
  const el = h('div', { class: 'sort' }, h('p', { class: 'hint' }, t('Ziehe an den Punkten oder nutze die Pfeile.')), block.oben ? h('p', { class: 'sort-end' }, `▲ ${block.oben}`) : null, list, block.unten ? h('p', { class: 'sort-end' }, `▼ ${block.unten}`) : null);
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
        el.append(h('div', { class: 'right-answer block' }, t('Richtige Reihenfolge:'), ' ', h('ol', {}, block.items.map((tx) => h('li', { html: inline(tx) })))));
      }
    },
  };
}

/** Number input with calculator, minus and exponent helpers (iOS decimal pad has neither). */
export function numberField(block, { onChange, submit }) {
  const input = h('input', {
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    class: 'input',
    'aria-label': t('Antwort'),
    placeholder: t('Zahl eingeben'),
    onInput: () => onChange(),
    onKeydown: (e) => {
      if (e.key === 'Enter' && !Number.isNaN(parseNumber(input.value))) submit();
    },
  });
  const insert = (txt) => {
    const a = input.selectionStart ?? input.value.length;
    const b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + txt + input.value.slice(b);
    input.focus();
    input.setSelectionRange(a + txt.length, a + txt.length);
    onChange();
  };
  const tools = h(
    'div',
    { class: 'num-tools' },
    h('button', { type: 'button', class: 'chip btn-chip', 'aria-label': t('Minuszeichen'), onClick: () => insert('-') }, '−'),
    h('button', { type: 'button', class: 'chip btn-chip', 'aria-label': t('Zehnerpotenz'), onClick: () => insert('e') }, '×10ⁿ'),
    h('button', { type: 'button', class: 'chip btn-chip calc-open', onClick: () => openCalculator({ onUse: (v) => { input.value = v; onChange(); } }), html: `${icon('calc', 16)} ${t('Taschenrechner')}` }),
  );
  const tol = block.toleranz ?? 0.05;
  return {
    el: h('div', { class: 'number-field' }, h('div', { class: 'number-answer' }, input, block.einheit ? h('span', { class: 'unit', html: inline(block.einheit) }) : null), tools),
    valid: () => !Number.isNaN(parseNumber(input.value)),
    correct: () => {
      const v = parseNumber(input.value);
      return answerScales(block.einheit).some((f) => Math.abs(v - block.antwort * f) <= tol * Math.abs(block.antwort * f));
    },
    lock(ok) {
      input.disabled = true;
      input.classList.add(ok ? 'ok' : 'bad');
      tools.remove();
    },
    solution: () => t('Richtig: {a}', { a: `${num(block.antwort)}${block.einheit ? ' ' + block.einheit.replace(/\\,|\$/g, ' ').trim() : ''}${tol > 0 ? ` ${t('(Toleranz ±{p} %)', { p: Math.round(tol * 100) })}` : ''}` }),
  };
}

function buildNumber(block, hooks) {
  const field = numberField(block, hooks);
  return {
    el: field.el,
    needsCheck: true,
    canCheck: field.valid,
    evaluate: field.correct,
    mark(correct) {
      field.lock(correct);
      if (!correct) field.el.after(h('p', { class: 'right-answer' }, field.solution()));
    },
  };
}

/* ---------- Rechenweg: build the formula from tiles, then calculate ---------- */

/**
 * Template syntax: text with $latex$, [] = slot, {{ upper // lower }} = stacked fraction.
 * makeSlot(i) returns the element for the i-th slot.
 */
function renderTemplate(src, makeSlot) {
  let n = 0;
  const inlineParts = (text) => {
    const out = [];
    text.split('[]').forEach((seg, i, all) => {
      if (seg) out.push(h('span', { class: 'tpl-text', html: inline(seg) }));
      if (i < all.length - 1) out.push(makeSlot(n++));
    });
    return out;
  };
  const row = h('div', { class: 'tpl' });
  const re = /\{\{(.+?)\/\/(.+?)\}\}/g;
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    row.append(...inlineParts(src.slice(last, m.index)));
    row.append(h('span', { class: 'frac' }, h('span', { class: 'frac-num' }, ...inlineParts(m[1])), h('span', { class: 'frac-den' }, ...inlineParts(m[2]))));
    last = m.index + m[0].length;
  }
  row.append(...inlineParts(src.slice(last)));
  return { el: row, slots: n };
}

function buildFormula(block, hooks) {
  const correct = block.richtig;
  const tiles = shuffled([...correct, ...(block.ablenker ?? [])].map((text, i) => ({ id: `t${i}`, text, html: inline(text) })));
  const textOf = new Map(tiles.map((tl) => [tl.id, tl.text]));
  const slotIds = correct.map((_, i) => `s${i}`);
  const board = createBoard({ tiles, slots: slotIds, onChange: hooks.onChange });
  const tpl = renderTemplate(block.vorlage, (i) => board.slot(`s${i}`));
  const field = block.antwort !== undefined ? numberField(block, hooks) : null;
  const groups = block.tausch ?? [];
  const swapOf = (i) => groups.find((g) => g.includes(i));

  const formulaOk = () => {
    const v = board.values();
    const got = slotIds.map((s) => textOf.get(v[s]));
    return correct.every((c, i) => {
      const g = swapOf(i);
      if (!g) return got[i] === c;
      if (g[0] !== i) return true; // checked together with the group leader
      return [...g.map((j) => correct[j])].sort().join('\u0001') === g.map((j) => got[j]).sort().join('\u0001');
    });
  };

  const el = h(
    'div',
    { class: 'board rechenweg' },
    block.gegeben?.length ? h('div', { class: 'given' }, h('span', { class: 'given-label' }, t('Gegeben')), block.gegeben.map((g) => h('span', { class: 'chip given-chip', html: inline(g) }))) : null,
    h('p', { class: 'hint' }, t('Baue die Formel: Tippe die Bausteine an oder ziehe sie in die Felder.')),
    tpl.el,
    board.pool,
    field ? h('div', { class: 'calc-step' }, h('p', { class: 'hint' }, t('Dann rechnen (mit dem Taschenrechner):')), field.el) : null,
  );
  return {
    el,
    needsCheck: true,
    canCheck: () => board.full() && (!field || field.valid()),
    evaluate: () => formulaOk() && (!field || field.correct()),
    mark() {
      board.lock();
      const okFormula = formulaOk();
      const v = board.values();
      slotIds.forEach((s, i) => {
        const g = swapOf(i);
        const ok = g ? g.map((j) => correct[j]).includes(textOf.get(v[s])) : textOf.get(v[s]) === correct[i];
        board.mark(s, ok);
      });
      if (!okFormula) {
        const solved = renderTemplate(block.vorlage, (i) => h('span', { class: 'slot filled ok' }, h('span', { class: 'tile-chip', html: inline(correct[i]) })));
        el.append(h('div', { class: 'right-answer block' }, t('Richtige Formel:'), solved.el));
      }
      if (field) {
        const okNum = field.correct();
        field.lock(okNum);
        if (!okNum) el.append(h('p', { class: 'right-answer' }, field.solution()));
      }
    },
  };
}

const BUILDERS = { 'multiple-choice': buildMc, zuordnung: buildMatch, luecke: buildCloze, sortieren: buildSort, zahl: buildNumber, rechenweg: buildFormula };

export function render(block, ctx) {
  const build = BUILDERS[block.art];
  if (!build) return h('div', {}, `Unknown quiz type “${block.art}”`);

  const flags = { known: isKnown(block.id), firstCounted: false, retryPaid: false };
  let attempt = 0;
  let widget;
  const question = h('div', { class: 'quiz-q prose', html: rich(block.frage) });
  const holder = h('div');
  const checkBtn = h('button', { type: 'button', class: 'btn btn-primary', onClick: () => submit() }, t('Prüfen'));
  const giveUpBtn = h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => submit(true) }, t('Lösung zeigen'));
  const hintBox = h('div', { class: 'hint-box prose small', hidden: true, html: block.tipp ? rich(block.tipp) : '' });
  const hintBtn = block.tipp
    ? h('button', { type: 'button', class: 'chip btn-chip hint-btn', html: `${icon('bulb', 16)} ${t('Tipp')}`, onClick: () => { hintBox.hidden = !hintBox.hidden; } })
    : null;
  const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
  const tag = block.art === 'rechenweg' || block.art === 'zahl' ? t('Rechnen') : t('Frage');
  const figure = block.plot ? plotFigure(block.plot) : null;
  const root = h('div', { class: `quiz art-${block.art}` }, h('div', { class: 'quiz-top' }, h('span', { class: 'quiz-tag' }, block.plot ? t('Diagramm lesen') : tag), hintBtn), question, figure, hintBox, holder, feedback);

  const refreshCheck = () => {
    checkBtn.disabled = !widget.canCheck();
  };

  function mount() {
    widget = build(block, { onChange: refreshCheck, submit });
    clear(holder).append(widget.el);
    if (widget.needsCheck) {
      holder.append(h('div', { class: 'quiz-actions' }, checkBtn, attempt === 0 || block.art !== 'multiple-choice' ? giveUpBtn : null));
      refreshCheck();
    } else if (block.art === 'multiple-choice') {
      holder.append(h('div', { class: 'quiz-actions' }, giveUpBtn));
    }
    clear(feedback);
  }

  function submit(giveUp = false) {
    if (!giveUp && widget.needsCheck && !widget.canCheck()) return;
    attempt += 1;
    const correct = giveUp ? false : widget.evaluate();
    widget.mark(correct);
    checkBtn.parentElement?.remove();
    holder.querySelector('.quiz-actions')?.remove();
    const res = scoreQuizAnswer(block.id, correct, ctx, attempt, flags);
    const practice = ctx.mode === 'lesson' && flags.known && attempt === 1;
    clear(feedback);
    append(feedback, [
      h('p', { class: `verdict ${correct ? 'ok' : 'bad'}` }, correct ? t('Richtig!') : giveUp ? t('Lösung angezeigt.') : t('Nicht ganz.'), res.xp ? h('span', { class: 'xp-chip' }, ` +${res.xp} XP`) : null),
      practice ? h('p', { class: 'hint' }, t('Übung: Diese Frage ist schon in deiner Wiederholung.')) : null,
      block.erklaerung ? h('div', { class: 'prose small explanation', html: rich(block.erklaerung) }) : null,
    ]);
    const actions = h('div', { class: 'quiz-actions' });
    if (ctx.mode === 'review') {
      actions.append(h('button', { type: 'button', class: 'btn btn-primary', onClick: () => ctx.onNext?.(correct) }, t('Weiter')));
    } else if (!correct) {
      actions.append(h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => mount() }, t('Nochmal versuchen')));
    }
    feedback.append(actions);
    ctx.onScored?.();
  }

  mount();
  return root;
}
