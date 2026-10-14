// "Weiterlesen": list of bibliography entries (ids from content/quellen.json).
import { h } from '../ui/dom.js';
import { esc } from '../core/richtext.js';

export function render(block, ctx) {
  const entries = (block.refs ?? []).map((id) => ctx.data.sources.get(id)).filter(Boolean);
  return h(
    'div',
    {},
    h('strong', { class: 'callout-title' }, block.titel ?? 'Weiterlesen'),
    h(
      'ul',
      { class: 'sources' },
      entries.map((s) =>
        h('li', { html: `${esc(s.autoren)} (${esc(s.jahr)}): <em>${esc(s.titel)}</em>. ${esc(s.ort ?? '')}${s.doi ? ` · <a href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener">DOI</a>` : ''}` }),
      ),
    ),
    h('p', { class: 'src-note' }, 'Bibliografische Angaben per Websuche bestätigt, Details bitte in der Originalquelle prüfen.'),
  );
}
