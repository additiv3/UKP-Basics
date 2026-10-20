// Safe expression evaluator for the pocket calculator (no eval). Pure functions, no DOM.
//   numbers: 12  1.5  3E8  2.5E-6      operators: + − - × * · ÷ / ^
//   functions: sin cos tan asin acos atan ln log exp sqrt/√      constants: π pi e
//   implicit multiplication: 2π  3(4+1)  (2)(3)      Ans = previous result
//   Unclosed parentheses are closed automatically so a live preview works while typing.

const FUNCS = {
  sin: (x, c) => Math.sin(c.toRad(x)),
  cos: (x, c) => Math.cos(c.toRad(x)),
  tan: (x, c) => Math.tan(c.toRad(x)),
  asin: (x, c) => c.fromRad(Math.asin(x)),
  acos: (x, c) => c.fromRad(Math.acos(x)),
  atan: (x, c) => c.fromRad(Math.atan(x)),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  exp: (x) => Math.exp(x),
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
};

const CONSTS = { π: Math.PI, pi: Math.PI, e: Math.E };

function tokenize(src) {
  const s = src.replace(/\s+/g, '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    let m;
    if ((m = /^(\d+\.?\d*|\.\d+)(?:E([+\-−]?\d+))?/.exec(s.slice(i)))) {
      out.push({ k: 'num', v: Number(m[1] + (m[2] ? `e${m[2].replace('−', '-')}` : '')) });
      i += m[0].length;
    } else if ((m = /^(asin|acos|atan|sin|cos|tan|ln|log|exp|sqrt|cbrt|Ans|pi)/.exec(s.slice(i)))) {
      out.push({ k: m[1] === 'Ans' ? 'ans' : m[1] === 'pi' ? 'const' : 'fn', v: m[1] });
      i += m[1].length;
    } else if ((m = /^\{(\w+)\}/.exec(s.slice(i)))) {
      const c = CONSTANTS.find((k) => k.id === m[1]);
      if (!c) throw new Error('syntax');
      out.push({ k: 'num', v: Number(c.value) });
      i += m[0].length;
    } else if (ch === 'π' || ch === 'e') {
      out.push({ k: 'const', v: ch });
      i += 1;
    } else if (ch === '√') {
      out.push({ k: 'fn', v: 'sqrt' });
      i += 1;
    } else if ('+-−×*·÷/^()'.includes(ch)) {
      const op = { '-': '−', '*': '×', '·': '×', '/': '÷' }[ch] ?? ch;
      out.push({ k: 'op', v: op });
      i += 1;
    } else if (ch === '²') {
      out.push({ k: 'op', v: '^' }, { k: 'num', v: 2 });
      i += 1;
    } else if (ch === ',') {
      out.push({ k: 'num', v: NaN }); // a stray comma is a syntax error
      i += 1;
    } else {
      throw new Error('syntax');
    }
  }
  return out;
}

/** Append missing ')' for unmatched '(' so partial input can be previewed. */
function balance(tokens) {
  let depth = 0;
  for (const t of tokens) if (t.k === 'op') depth += t.v === '(' ? 1 : t.v === ')' ? -1 : 0;
  if (depth < 0) throw new Error('syntax');
  return tokens.concat(Array.from({ length: depth }, () => ({ k: 'op', v: ')' })));
}

export function evaluate(src, { angle = 'rad', ans = 0 } = {}) {
  const ctx = { toRad: (x) => (angle === 'deg' ? (x * Math.PI) / 180 : x), fromRad: (x) => (angle === 'deg' ? (x * 180) / Math.PI : x) };
  const toks = balance(tokenize(src));
  if (!toks.length) throw new Error('empty');
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v) => peek()?.k === 'op' && peek().v === v;

  const startsPrimary = () => {
    const t = peek();
    return t && (t.k === 'num' || t.k === 'const' || t.k === 'fn' || t.k === 'ans' || (t.k === 'op' && t.v === '('));
  };

  function expr() {
    let v = term();
    while (isOp('+') || isOp('−')) {
      const op = toks[p++].v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      if (isOp('×') || isOp('÷')) {
        const op = toks[p++].v;
        const r = unary();
        v = op === '×' ? v * r : v / r;
      } else if (startsPrimary()) {
        v *= unary(); // implicit multiplication
      } else {
        return v;
      }
    }
  }
  function unary() {
    if (isOp('−')) {
      p += 1;
      return -unary();
    }
    if (isOp('+')) {
      p += 1;
      return unary();
    }
    return power();
  }
  function power() {
    const base = primary();
    if (isOp('^')) {
      p += 1;
      return base ** unary();
    }
    return base;
  }
  function primary() {
    const t = toks[p++];
    if (!t) throw new Error('syntax');
    if (t.k === 'num') {
      if (Number.isNaN(t.v)) throw new Error('syntax');
      return t.v;
    }
    if (t.k === 'const') return CONSTS[t.v];
    if (t.k === 'ans') return ans;
    if (t.k === 'fn') {
      // sqrt 9 without parentheses is allowed for the √ key
      let arg;
      if (isOp('(')) {
        p += 1;
        arg = expr();
        if (!isOp(')')) throw new Error('syntax');
        p += 1;
      } else {
        arg = power();
      }
      return FUNCS[t.v](arg, ctx);
    }
    if (t.k === 'op' && t.v === '(') {
      const v = expr();
      if (!isOp(')')) throw new Error('syntax');
      p += 1;
      return v;
    }
    throw new Error('syntax');
  }

  const result = expr();
  if (p < toks.length) throw new Error('syntax');
  return result;
}

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };

/** Display string: 10 significant digits, scientific outside [1e-3, 1e7). */
export function formatResult(x, decimal = '.') {
  if (!Number.isFinite(x)) return 'Error';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e7) return String(Number(x.toPrecision(10))).replace('.', decimal);
  const [m, e] = x.toExponential(9).split('e');
  const mant = String(Number(m)).replace('.', decimal);
  return `${mant} × 10${String(Number(e)).replace(/[0-9-]/g, (c) => SUP[c])}`;
}

/** Plain machine string for pasting into an answer field (1.2346e-5). */
export function plainResult(x) {
  return String(Number(x.toPrecision(10)));
}

/** Physical constants offered as keys: SI exact values and CODATA 2018 (rounded as published). */
export const CONSTANTS = [
  { id: 'c', sym: 'c', name: 'Lichtgeschwindigkeit', value: '299792458' },
  { id: 'h', sym: 'h', name: 'Planck-Konstante', value: '6.62607015e-34' },
  { id: 'hbar', sym: 'ħ', name: 'reduzierte Planck-Konstante', value: '1.054571817e-34' },
  { id: 'qe', sym: 'e₀', name: 'Elementarladung', value: '1.602176634e-19' },
  { id: 'kB', sym: 'kB', name: 'Boltzmann-Konstante', value: '1.380649e-23' },
  { id: 'NA', sym: 'NA', name: 'Avogadro-Konstante', value: '6.02214076e23' },
  { id: 'eps0', sym: 'ε₀', name: 'elektrische Feldkonstante', value: '8.8541878128e-12' },
  { id: 'me', sym: 'mₑ', name: 'Elektronenmasse', value: '9.1093837015e-31' },
];

/** SI prefix factors as insertable text. */
export const PREFIXES = [
  ['f', -15],
  ['p', -12],
  ['n', -9],
  ['µ', -6],
  ['m', -3],
  ['k', 3],
  ['M', 6],
  ['G', 9],
  ['T', 12],
];

/** Expression-safe text of a result (uses E notation the tokenizer understands). */
export function exprResult(x) {
  const a = Math.abs(x);
  if (x === 0 || (a >= 1e-3 && a < 1e7)) return String(Number(x.toPrecision(10)));
  return Number(x.toPrecision(10)).toExponential().replace('e+', 'E').replace('e', 'E');
}
