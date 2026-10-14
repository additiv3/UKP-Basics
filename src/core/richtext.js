// Mini markup for content strings -> safe HTML.
//   **fett**   *kursiv*   $latex$ (KaTeX)   [[glossar-id]] / [[glossar-id|Anzeigetext]]
//   Blank line = new paragraph; lines starting with "- " = list; "1. " = numbered list.
let glossaryTerms = new Map(); // id -> display name

export function setGlossary(map) {
  glossaryTerms = map;
}

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function math(latex, display = false) {
  try {
    if (globalThis.katex) {
      return globalThis.katex.renderToString(latex, { displayMode: display, throwOnError: false, output: 'html' });
    }
  } catch {
    /* fall through to plain code */
  }
  return `<code>${esc(latex)}</code>`;
}

function plain(segment) {
  let t = esc(segment);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  t = t.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
    const name = label ?? esc(glossaryTerms.get(id) ?? id);
    return `<a class="gl" href="#/glossar/${id}">${name}</a>`;
  });
  return t;
}

/** One line of text (no paragraph wrapping). */
export function inline(str) {
  return String(str)
    .split(/\$([^$]+)\$/)
    .map((part, i) => (i % 2 ? math(part) : plain(part)))
    .join('');
}

/** Paragraphs and lists. Accepts a string or an array of paragraph strings. */
export function rich(input) {
  const text = Array.isArray(input) ? input.join('\n\n') : String(input ?? '');
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^- /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      if (lines.every((l) => /^\d+\. /.test(l)))
        return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
      return `<p>${inline(lines.join(' '))}</p>`;
    })
    .join('');
}
