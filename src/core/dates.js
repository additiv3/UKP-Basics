// Day-granular dates as 'YYYY-MM-DD' in local time (no time-of-day, no timezone drift).

const pad = (n) => String(n).padStart(2, '0');

export function toDay(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parts(day) {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m - 1, d];
}

export function addDays(day, n) {
  const [y, m, d] = parts(day);
  return toDay(new Date(y, m, d + n));
}

/** Whole days from a to b (positive if b is later). */
export function diffDays(a, b) {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm, bd) - Date.UTC(ay, am, ad)) / 86400000);
}

export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
