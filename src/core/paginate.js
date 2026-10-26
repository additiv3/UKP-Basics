// Split a lesson's blocks into swipeable pages. Pure function (unit-tested).
const isItem = (b) => b.typ === 'quiz' || b.typ === 'karte';
const isLab = (b) => b.typ === 'sim' || b.typ === 'spiel' || b.typ === 'rechner';
const MAX_READ_BLOCKS = 4;

/** Group blocks into pages: every question, card and simulation gets its own page, reading blocks are bundled. */
export function paginate(blocks) {
  const pages = [];
  let read = null;
  for (const b of blocks) {
    if (isItem(b) || isLab(b)) {
      read = null;
      pages.push({ kind: b.typ === 'karte' ? 'card' : b.typ === 'quiz' ? 'quiz' : 'lab', blocks: [b] });
      continue;
    }
    const startsNew = !read || (b.typ === 'text' && read.blocks.some((x) => x.typ !== 'text')) || read.blocks.length >= MAX_READ_BLOCKS;
    if (startsNew) {
      read = { kind: 'read', blocks: [] };
      pages.push(read);
    }
    read.blocks.push(b);
  }
  return pages;
}
