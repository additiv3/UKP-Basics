// German number formatting for physics values.
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
const sup = (n) => String(n).replace(/[0-9-]/g, (c) => SUP[c]);

/** Plain number with significant digits, de-DE separators. */
export function plainNum(x, sig = 3) {
  return Number(x).toLocaleString('de-DE', { maximumSignificantDigits: sig });
}

/** Scientific notation: 9,43 · 10¹³ */
export function sci(x, sig = 3) {
  if (!Number.isFinite(x) || x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${plainNum(m, sig)} · 10${sup(e)}`;
}

/** Plain number for moderate magnitudes, scientific otherwise. */
export function num(x, sig = 3) {
  if (!Number.isFinite(x)) return '–';
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e6 || a < 1e-3)) return sci(x, sig);
  return plainNum(x, sig);
}

const PREFIXES = { '-15': 'f', '-12': 'p', '-9': 'n', '-6': 'µ', '-3': 'm', 0: '', 3: 'k', 6: 'M', 9: 'G', 12: 'T' };

/** Value with SI prefix: si(3.3e7, 'W') -> '33 MW' */
export function si(x, unit, sig = 3) {
  if (!Number.isFinite(x) || x === 0) return `0 ${unit}`;
  let e3 = Math.floor(Math.log10(Math.abs(x)) / 3) * 3;
  e3 = Math.max(-15, Math.min(12, e3));
  return `${plainNum(x / 10 ** e3, sig)} ${PREFIXES[e3]}${unit}`;
}
