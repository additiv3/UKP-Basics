import { h } from '../ui/dom.js';
import { inline } from '../core/richtext.js';

const svgCache = new Map();

async function loadSvg(src) {
  if (!svgCache.has(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(text)) throw new Error('not svg');
    svgCache.set(src, text);
  }
  return svgCache.get(src);
}

// Own SVGs are inlined so they follow the light/dark theme through CSS variables.
export async function render(block) {
  const box = h('div', { class: 'figure-box', role: 'img', 'aria-label': block.alt ?? '' });
  try {
    box.innerHTML = await loadSvg(block.src);
  } catch {
    box.append(h('img', { src: block.src, alt: block.alt ?? '', loading: 'lazy' }));
  }
  return h('figure', {}, box, block.unterschrift ? h('figcaption', { html: inline(block.unterschrift) }) : null);
}
