// App frame: scrolling view area, bottom tab bar, update banner, calculator button.
import { h } from './dom.js';
import { icon } from './icons.js';
import { t } from '../core/i18n.js';
import { openCalculator } from './calculator.js';

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
  const fab = h('button', { type: 'button', class: 'calc-fab', hidden: true, html: icon('calc', 26), onClick: () => openCalculator() });
  const labels = new Map();
  const links = TABS.map((tab) => {
    const label = h('span', { class: 'tab-label' }, t(tab.label));
    labels.set(tab.id, label);
    return h('a', { class: 'tab', href: tab.href, dataset: { tab: tab.id }, 'aria-label': t(tab.label) }, h('span', { class: 'tab-icon', html: icon(tab.icon, 24) }), label, tab.id === 'wiederholen' ? badge : null);
  });
  const nav = h('nav', { class: 'tabbar', 'aria-label': t('Hauptnavigation') }, links);
  root.replaceChildren(banner, view, nav, fab);
  fab.setAttribute('aria-label', t('Taschenrechner'));

  return {
    view,
    setView(el, tab, { calculator = false, immersive = false } = {}) {
      document.body.classList.toggle('immersive', immersive);
      view.replaceChildren(el);
      view.scrollTop = 0;
      window.scrollTo(0, 0);
      fab.hidden = !calculator;
      for (const a of links) {
        const on = a.dataset.tab === tab;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    },
    /** Re-apply texts after a language change. */
    relabel() {
      for (const tab of TABS) {
        labels.get(tab.id).textContent = t(tab.label);
        links.find((a) => a.dataset.tab === tab.id).setAttribute('aria-label', t(tab.label));
      }
      nav.setAttribute('aria-label', t('Hauptnavigation'));
      fab.setAttribute('aria-label', t('Taschenrechner'));
    },
    setDueCount(n) {
      badge.hidden = n <= 0;
      badge.textContent = n > 99 ? '99+' : String(n);
    },
    showUpdate(onApply) {
      banner.hidden = false;
      banner.replaceChildren(h('span', {}, t('Neue Version verfügbar.')), h('button', { type: 'button', class: 'btn btn-small', onClick: onApply }, t('Aktualisieren')));
    },
  };
}
