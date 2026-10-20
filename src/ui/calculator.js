// Pocket calculator as a bottom sheet. openCalculator({ onUse }) shows "Übernehmen" and hands the result to the caller.
// Scientific keys, physical constants and SI prefixes, so calculation tasks can be solved on the phone.
import { h } from './dom.js';
import { icon } from './icons.js';
import { t, getLang } from '../core/i18n.js';
import { evaluate, formatResult, plainResult, exprResult, CONSTANTS, PREFIXES } from '../core/calc.js';

const state = { expr: '', ans: 0, angle: 'deg', second: false, fresh: false, history: [] };
let sheet = null;
let onUseCb = null;

const dec = () => (getLang() === 'en' ? '.' : ',');
const SYM = Object.fromEntries(CONSTANTS.map((c) => [c.id, c.sym]));

const showExpr = (e) => e.replace(/\{(\w+)\}/g, (_, k) => SYM[k] ?? k).replace(/\./g, dec()).replace(/\*/g, '×');

function current() {
  if (!state.expr) return state.fresh ? state.ans : null;
  try {
    const v = evaluate(state.expr, { angle: state.angle, ans: state.ans });
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const OPS = '+−×÷^';
const lastChar = () => state.expr.slice(-1);

function append(text) {
  if (state.fresh) {
    // after "=": operators continue with the result, everything else starts a new calculation
    state.expr = /^[+−×÷^]/.test(text) ? exprResult(state.ans) : '';
    state.fresh = false;
  }
  state.expr += text;
}

function press(key) {
  const exprLen = state.expr.length;
  switch (key) {
    case 'AC':
      state.expr = '';
      state.fresh = false;
      break;
    case 'DEL':
      if (state.fresh) {
        state.fresh = false;
        state.expr = '';
        break;
      }
      state.expr = state.expr.replace(/(?:asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|ln\(|log\(|exp\(|√\(|Ans|\{\w+\}|.)$/s, '');
      break;
    case '=': {
      const v = current();
      if (v === null) return flash();
      state.history = [v, ...state.history.filter((x) => x !== v)].slice(0, 5);
      state.ans = v;
      state.expr = '';
      state.fresh = true;
      break;
    }
    case '2nd':
      state.second = !state.second;
      break;
    case 'angle':
      state.angle = state.angle === 'deg' ? 'rad' : 'deg';
      break;
    case 'EE':
      if (/\d$/.test(lastChar())) append('E');
      break;
    case 'x²':
      append('^2');
      break;
    case '1/x':
      append('^(−1)');
      break;
    case '±':
      if (state.expr && !state.fresh) state.expr = `−(${state.expr})`;
      else if (state.fresh) {
        state.ans = -state.ans;
      }
      break;
    default: {
      if (OPS.includes(key)) {
        const last = lastChar();
        if (!state.expr && !state.fresh && key !== '−') return;
        if (OPS.includes(last) && !(key === '−' && '×÷^'.includes(last))) {
          state.expr = state.expr.slice(0, -1);
        }
      }
      append(key);
    }
  }
  if (state.expr.length !== exprLen || key === '=') state.second = key === '2nd' ? state.second : false;
  draw();
}

function flash() {
  sheet?.querySelector('.calc-display')?.classList.add('shake');
  setTimeout(() => sheet?.querySelector('.calc-display')?.classList.remove('shake'), 300);
}

const KEYS = (second) => [
  [{ k: '2nd', l: '2nd', cls: second ? 'on' : 'fn' }, { k: 'angle', l: state.angle === 'deg' ? 'DEG' : 'RAD', cls: 'fn' }, { k: '(', l: '(', cls: 'fn' }, { k: ')', l: ')', cls: 'fn' }, { k: 'DEL', l: '⌫', cls: 'fn' }],
  [
    second ? { k: 'asin(', l: 'sin⁻¹', cls: 'fn' } : { k: 'sin(', l: 'sin', cls: 'fn' },
    second ? { k: 'acos(', l: 'cos⁻¹', cls: 'fn' } : { k: 'cos(', l: 'cos', cls: 'fn' },
    second ? { k: 'atan(', l: 'tan⁻¹', cls: 'fn' } : { k: 'tan(', l: 'tan', cls: 'fn' },
    { k: 'π', l: 'π', cls: 'fn' },
    { k: 'AC', l: 'AC', cls: 'clr' },
  ],
  [
    second ? { k: 'e^(', l: 'eˣ', cls: 'fn' } : { k: 'ln(', l: 'ln', cls: 'fn' },
    second ? { k: '10^(', l: '10ˣ', cls: 'fn' } : { k: 'log(', l: 'log', cls: 'fn' },
    { k: '√(', l: '√', cls: 'fn' },
    { k: 'x²', l: 'x²', cls: 'fn' },
    { k: '÷', l: '÷', cls: 'op' },
  ],
  [{ k: '7', l: '7' }, { k: '8', l: '8' }, { k: '9', l: '9' }, { k: '^', l: 'xʸ', cls: 'fn' }, { k: '×', l: '×', cls: 'op' }],
  [{ k: '4', l: '4' }, { k: '5', l: '5' }, { k: '6', l: '6' }, { k: '1/x', l: '1/x', cls: 'fn' }, { k: '−', l: '−', cls: 'op' }],
  [{ k: '1', l: '1' }, { k: '2', l: '2' }, { k: '3', l: '3' }, { k: 'EE', l: 'EE', cls: 'fn' }, { k: '+', l: '+', cls: 'op' }],
  [{ k: '0', l: '0' }, { k: '.', l: dec() }, { k: 'e', l: 'e', cls: 'fn' }, { k: 'Ans', l: 'Ans', cls: 'fn' }, { k: '=', l: '=', cls: 'eq' }],
];

function draw() {
  if (!sheet) return;
  const v = current();
  const exprEl = sheet.querySelector('.calc-expr');
  const resEl = sheet.querySelector('.calc-result');
  exprEl.textContent = state.expr ? showExpr(state.expr) : state.fresh ? '' : '0';
  exprEl.scrollLeft = exprEl.scrollWidth;
  resEl.textContent = v === null ? (state.expr && state.expr.length > 1 ? '' : '') : `${state.fresh ? '' : '= '}${formatResult(v, dec())}`;
  resEl.classList.toggle('final', state.fresh);
  sheet.querySelector('.calc-pad').replaceChildren(
    ...KEYS(state.second).flat().map((key) =>
      h('button', { type: 'button', class: `ckey ${key.cls ?? 'num'}`, onClick: () => press(key.k), 'aria-label': key.l }, key.l),
    ),
  );
  sheet.querySelector('.calc-hist').replaceChildren(
    ...state.history.map((x) => h('button', { type: 'button', class: 'chip btn-chip', onClick: () => { append(exprResult(x)); draw(); } }, formatResult(x, dec()))),
  );
  const use = sheet.querySelector('.calc-use');
  if (use) use.disabled = v === null;
}

function insertConst(c) {
  append(`{${c.id}}`);
  draw();
}

function open() {
  const consts = h(
    'div',
    { class: 'calc-strip' },
    CONSTANTS.map((c) => h('button', { type: 'button', class: 'chip btn-chip', title: t(c.name), onClick: () => insertConst(c) }, c.sym)),
  );
  const prefixes = h(
    'div',
    { class: 'calc-strip' },
    PREFIXES.map(([p, e]) => h('button', { type: 'button', class: 'chip btn-chip', title: `10^${e}`, onClick: () => { append(`×10^(${e})`); draw(); } }, `${p} ·10${e < 0 ? '⁻' : ''}${String(Math.abs(e)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`)),
  );
  sheet = h(
    'div',
    { class: 'calc-backdrop', onClick: (e) => { if (e.target === sheet) close(); } },
    h(
      'div',
      { class: 'calc-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Taschenrechner') },
      h('div', { class: 'calc-head' }, h('strong', {}, t('Taschenrechner')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Schließen'), onClick: close }, '✕')),
      h('div', { class: 'calc-display' }, h('div', { class: 'calc-expr' }), h('div', { class: 'calc-result' })),
      h('div', { class: 'calc-hist' }),
      h('div', { class: 'calc-pad' }),
      h('details', { class: 'calc-more' }, h('summary', {}, t('Konstanten und Vorsätze')), consts, prefixes, h('p', { class: 'hint' }, t('Konstanten: SI-Festlegung 2019 bzw. CODATA 2018.'))),
      onUseCb
        ? h('button', { type: 'button', class: 'btn btn-primary btn-wide calc-use', onClick: () => {
            const v = current();
            if (v === null) return;
            const cb = onUseCb;
            close();
            cb(plainResult(v));
          } }, t('Ergebnis übernehmen'))
        : null,
    ),
  );
  document.body.append(sheet);
  document.body.classList.add('modal-open');
  draw();
  document.addEventListener('keydown', onKey);
}

function onKey(e) {
  if (e.key === 'Escape') close();
}

export function close() {
  sheet?.remove();
  sheet = null;
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', onKey);
}

/** Open the calculator. onUse(resultString) is called when the user taps "Ergebnis übernehmen". */
export function openCalculator({ onUse } = {}) {
  close();
  onUseCb = onUse ?? null;
  open();
}

export const calcButtonIcon = (size = 22) => icon('calc', size);
