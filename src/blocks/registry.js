// Block registry: block type 'foo' is rendered by src/blocks/foo.js exporting render(block, ctx).
// Adding a block type = adding a module. Unknown types render a visible placeholder.
import { h } from '../ui/dom.js';

const RESERVED = new Set(['registry', 'scoring']);
const modules = new Map();

async function moduleFor(typ) {
  if (!/^[a-z]+$/.test(typ) || RESERVED.has(typ)) return null;
  if (!modules.has(typ)) {
    try {
      modules.set(typ, await import(`./${typ}.js`));
    } catch {
      modules.set(typ, null);
    }
  }
  return modules.get(typ);
}

/** "Quelle: ..." text; resolves bibliography ids from content/quellen.json. */
export function sourceText(ref, ctx) {
  const s = ctx?.data?.sources?.get(ref);
  return s ? `${s.kurz}` : ref;
}

/**
 * ctx = { data, mode: 'lesson' | 'review', onScored?, onNext? }
 * Wraps the rendered element: block class, "ungeprüft" badge, source footnote.
 */
export async function renderBlock(block, ctx) {
  const mod = await moduleFor(String(block.typ));
  if (!mod?.render) {
    return h('div', { class: 'block block-unknown' }, `Unbekannter Blocktyp „${block.typ}"`);
  }
  const el = await mod.render(block, ctx);
  el.classList.add('block', `block-${block.typ}`);
  if (block.id) el.dataset.blockId = block.id;
  if (block.verifiziert === false) {
    el.prepend(h('span', { class: 'badge badge-warn', title: 'Noch nicht gegen Literatur geprüft' }, 'ungeprüft'));
  }
  if (block.quelle && block.typ !== 'quelle') {
    el.append(h('p', { class: 'src-note' }, `Quelle: ${sourceText(block.quelle, ctx)}`));
  }
  return el;
}
