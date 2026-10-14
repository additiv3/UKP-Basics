// Loads all content JSON (small, precached by the service worker) and builds lookup tables.
import { setGlossary } from './richtext.js';

async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

let cache = null;

export async function loadAll() {
  if (cache) return cache;
  const index = await getJson('content/index.json');
  const [glossar, quellen] = await Promise.all([getJson('content/glossar.json'), getJson('content/quellen.json')]);
  const chapters = new Map();
  await Promise.all(
    index.kapitel
      .filter((k) => k.datei)
      .map(async (k) => {
        chapters.set(k.id, await getJson(`content/${k.datei}`));
      }),
  );

  const items = new Map(); // quiz/karte id -> { chapter, lesson, block }
  const termChapters = new Map(); // glossary id -> Set(chapter ids)
  for (const chapter of chapters.values()) {
    for (const lesson of chapter.lektionen) {
      for (const block of lesson.blocks) {
        if (block.typ === 'quiz' || block.typ === 'karte') items.set(block.id, { chapter, lesson, block });
      }
    }
    for (const m of JSON.stringify(chapter).matchAll(/\[\[([a-z0-9-]+)/g)) {
      if (!termChapters.has(m[1])) termChapters.set(m[1], new Set());
      termChapters.get(m[1]).add(chapter.id);
    }
  }

  const terms = new Map(glossar.begriffe.map((b) => [b.id, b]));
  setGlossary(new Map(glossar.begriffe.map((b) => [b.id, b.begriff])));
  const sources = new Map(quellen.quellen.map((q) => [q.id, q]));
  cache = { index, chapters, items, terms, termChapters, sources };
  return cache;
}

export const chapterMeta = (data, id) => data.index.kapitel.find((k) => k.id === id);
