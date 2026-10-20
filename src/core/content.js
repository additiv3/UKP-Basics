// Loads all content JSON (small, precached by the service worker) and builds lookup tables.
// German files are the source of truth; English lives in content/en/* as overlays that only carry
// translated fields (ids, indices and numbers stay in the German file). Missing overlay entries fall back to German.
import { setGlossary } from './richtext.js';
import { t } from './i18n.js';

// ?nosw (development) bypasses the HTTP cache so edited content shows up immediately
const DEV = typeof location !== 'undefined' && location.search.includes('nosw');

async function getJson(path, optional = false) {
  try {
    const res = await fetch(path, DEV ? { cache: 'no-store' } : undefined);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (optional) return null;
    throw e;
  }
}

let rawCache = null;
const enCache = { loaded: false, index: null, glossar: null, quellen: null, chapters: new Map() };

async function loadRaw() {
  if (rawCache) return rawCache;
  const index = await getJson('content/index.json');
  const [glossar, quellen, labor] = await Promise.all([getJson('content/glossar.json'), getJson('content/quellen.json'), getJson('content/labor.json')]);
  const chapters = new Map();
  await Promise.all(
    index.kapitel
      .filter((k) => k.datei)
      .map(async (k) => {
        chapters.set(k.id, await getJson(`content/${k.datei}`));
      }),
  );
  rawCache = { index, glossar, quellen, labor, chapters };
  return rawCache;
}

async function loadEn(raw) {
  if (enCache.loaded) return enCache;
  enCache.index = await getJson('content/en/index.json', true);
  enCache.glossar = await getJson('content/en/glossar.json', true);
  enCache.quellen = await getJson('content/en/quellen.json', true);
  await Promise.all(
    raw.index.kapitel
      .filter((k) => k.datei)
      .map(async (k) => {
        enCache.chapters.set(k.id, await getJson(`content/en/${k.datei}`, true));
      }),
  );
  enCache.loaded = true;
  return enCache;
}

/** Apply a chapter overlay: chapter text, lesson titles and per-block field overrides. */
function localizeChapter(ch, ov) {
  if (!ov) return ch;
  return {
    ...ch,
    titel: ov.titel ?? ch.titel,
    einleitung: ov.einleitung ?? ch.einleitung,
    ziele: ov.ziele ?? ch.ziele,
    lektionen: ch.lektionen.map((l) => ({
      ...l,
      titel: ov.lektionen?.[l.id] ?? l.titel,
      blocks: l.blocks.map((b) => (ov.blocks?.[b.id] ? { ...b, ...ov.blocks[b.id] } : b)),
    })),
  };
}

function localizeIndex(index, ov) {
  if (!ov) return index;
  return {
    ...index,
    stufen: index.stufen.map((s) => ({ ...s, ...(ov.stufen?.[s.id] ?? {}) })),
    kapitel: index.kapitel.map((k) => ({ ...k, ...(ov.kapitel?.[k.id] ?? {}) })),
  };
}

/** Glossary term with display fields: name (UI language) and alt (the other language's term). */
function localizeTerm(term, ov, lang) {
  const merged = { ...term, ...(ov ?? {}) };
  const en = term.englisch || term.begriff;
  return lang === 'en' ? { ...merged, name: en, alt: term.begriff } : { ...merged, name: term.begriff, alt: term.englisch ?? '' };
}

/** Synthetic flashcards (DE->EN and EN->DE) for every glossary term; ids are v.<term>.de / v.<term>.en. */
function vocabCards(terms) {
  const out = [];
  for (const term of terms.values()) {
    if (!term.englisch) continue;
    out.push(
      {
        id: `v.${term.id}.de`,
        typ: 'karte',
        vok: true,
        term: term.id,
        vorne: `**${term.begriff}**\n\n${t('Wie heißt das auf Englisch?')}`,
        hinten: `**${term.englisch}**\n\n${term.kurz}`,
      },
      {
        id: `v.${term.id}.en`,
        typ: 'karte',
        vok: true,
        term: term.id,
        vorne: `**${term.englisch}**\n\n${t('Was bedeutet das? Wie heißt es auf Deutsch?')}`,
        hinten: `**${term.begriff}**\n\n${term.kurz}`,
      },
    );
  }
  return out;
}

const dataCache = new Map();

export async function loadAll(lang = 'de') {
  if (dataCache.has(lang)) {
    const cached = dataCache.get(lang);
    setGlossary(cached.glossaryNames); // glossary link labels follow the active language
    return cached;
  }
  const raw = await loadRaw();
  const en = lang === 'en' ? await loadEn(raw) : null;

  const index = lang === 'en' ? localizeIndex(raw.index, en.index) : raw.index;
  const chapters = new Map();
  for (const [id, ch] of raw.chapters) chapters.set(id, lang === 'en' ? localizeChapter(ch, en.chapters.get(id)) : ch);

  const terms = new Map(raw.glossar.begriffe.map((b) => [b.id, localizeTerm(b, lang === 'en' ? en.glossar?.[b.id] : null, lang)]));
  const glossaryNames = new Map([...terms.values()].map((b) => [b.id, b.name]));
  setGlossary(glossaryNames);

  const items = new Map(); // quiz/karte id -> { chapter, lesson, block }
  const termChapters = new Map(); // glossary id -> Set(chapter ids)
  for (const chapter of raw.chapters.values()) {
    for (const m of JSON.stringify(chapter).matchAll(/\[\[([a-z0-9-]+)/g)) {
      if (!termChapters.has(m[1])) termChapters.set(m[1], new Set());
      termChapters.get(m[1]).add(chapter.id);
    }
  }
  for (const chapter of chapters.values()) {
    for (const lesson of chapter.lektionen) {
      for (const block of lesson.blocks) {
        if (block.typ === 'quiz' || block.typ === 'karte') items.set(block.id, { chapter, lesson, block });
      }
    }
  }
  const vocabChapter = { id: 'vok', titel: t('Vokabeln'), lektionen: [] };
  const vocabLesson = { id: 'vok.l', titel: t('Fachbegriffe DE ↔ EN') };
  const vocab = vocabCards(terms);
  for (const card of vocab) items.set(card.id, { chapter: vocabChapter, lesson: vocabLesson, block: card });

  const sources = new Map(raw.quellen.quellen.map((q) => [q.id, lang === 'en' ? { ...q, ...(en.quellen?.[q.id] ?? {}) } : q]));
  const data = { lang, index, chapters, items, terms, termChapters, sources, labor: raw.labor, vocab, glossaryNames };
  dataCache.set(lang, data);
  return data;
}

export const chapterMeta = (data, id) => data.index.kapitel.find((k) => k.id === id);
