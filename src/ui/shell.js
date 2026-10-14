// App frame: scrolling view area, bottom tab bar, update banner.
import { h } from './dom.js';
import { icon } from './icons.js';

const TABS = [
  { id: 'pfad', href: '#/', label: 'Lernpfad', icon: 'path' },
  { id: 'wiederholen', href: '#/wiederholen', label: 'Wiederholen', icon: 'review' },
  { id: 'labor', href: '#/labor', label: 'Labor', icon: 'flask' },
  { id: 'glossar', href: '#/glossar', label: 'Glossar', icon: 'book' },
  { id: 'profil', href: '#/einstellungen', label: 'Profil', icon: 'gear' },
];

export function createShell(root) {
  const view = h('main', { id: 'view', tabindex: '-1' });
  const banner = h('div', { class: 'update-banner', hidden: true, role: 'status' });
  const badge = h('span', { class: 'tab-badge', hidden: true });
  const links = TABS.map((t) =>
    h(
      'a',
      { class: 'tab', href: t.href, dataset: { tab: t.id }, 'aria-label': t.label },
      h('span', { class: 'tab-icon', html: icon(t.icon, 24) }),
      h('span', { class: 'tab-label' }, t.label),
      t.id === 'wiederholen' ? badge : null,
    ),
  );
  const nav = h('nav', { class: 'tabbar', 'aria-label': 'Hauptnavigation' }, links);
  root.replaceChildren(banner, view, nav);

  return {
    view,
    setView(el, tab) {
      view.replaceChildren(el);
      view.scrollTop = 0;
      window.scrollTo(0, 0);
      for (const a of links) {
        const on = a.dataset.tab === tab;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    },
    setDueCount(n) {
      badge.hidden = n <= 0;
      badge.textContent = n > 99 ? '99+' : String(n);
    },
    showUpdate(onApply) {
      banner.hidden = false;
      banner.replaceChildren(h('span', {}, 'Neue Version verfügbar.'), h('button', { type: 'button', class: 'btn btn-small', onClick: onApply }, 'Aktualisieren'));
    },
  };
}
