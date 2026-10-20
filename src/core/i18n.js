// UI language (de | en). t('Deutscher Text', {n: 3}) returns the English dictionary entry in EN mode
// and the key itself otherwise, so a missing translation degrades to German instead of breaking.
// Content translations live in content/en/*.json (see content.js), not here.
import EN from '../i18n/en.js';

let lang = 'de';
const listeners = new Set();
export const missing = new Set(); // keys requested in EN mode without a translation (dev aid: window.__missing)

export const getLang = () => lang;
export const isEn = () => lang === 'en';

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'de';
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  for (const fn of listeners) fn(lang);
}

export function onLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const fill = (s, params) => (params ? s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`)) : s);

export function t(key, params) {
  if (lang === 'en') {
    const hit = EN[key];
    if (hit === undefined) {
      missing.add(key);
      return fill(key, params);
    }
    return fill(hit, params);
  }
  return fill(key, params);
}

/** Pick by language for content that is stored as a pair. */
export const pick = (de, en) => (lang === 'en' && en != null ? en : de);

/** Locale for number formatting. */
export const locale = () => (lang === 'en' ? 'en-US' : 'de-DE');

if (typeof window !== 'undefined') window.__missing = missing;
