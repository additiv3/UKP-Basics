// Entry point: load state + content, register routes, start router and service worker.
import * as store from './core/store.js';
import * as storage from './core/storage.js';
import { loadAll } from './core/content.js';
import { setLang, t } from './core/i18n.js';
import { route, start, match, currentPath } from './core/router.js';
import { dueIds } from './core/progress.js';
import { toDay } from './core/dates.js';
import { h, toast } from './ui/dom.js';
import { createShell } from './ui/shell.js';
import * as home from './ui/views/home.js';
import * as chapter from './ui/views/chapter.js';
import * as lesson from './ui/views/lesson.js';
import * as review from './ui/views/review.js';
import * as vocab from './ui/views/vocab.js';
import * as glossary from './ui/views/glossary.js';
import * as settings from './ui/views/settings.js';
import * as labor from './ui/views/labor.js';

const root = document.getElementById('app');

// calculator button on pages where people calculate
const WITH_CALCULATOR = /^\/(kapitel\/[^/]+\/[^/]+|wiederholen|vokabeln|labor.*)$/;

async function boot() {
  store.init();
  storage.requestPersist();
  setLang(store.get().settings.lang);

  let data;
  try {
    data = await loadAll(store.get().settings.lang);
  } catch (e) {
    console.error(e);
    root.replaceChildren(
      h('div', { class: 'page' }, h('h1', {}, 'Inhalte konnten nicht geladen werden / Content could not be loaded'), h('p', {}, 'Bitte einmal mit Internetverbindung öffnen, danach funktioniert die App offline. / Open once with an internet connection; afterwards it works offline.'), h('button', { class: 'btn btn-primary', type: 'button', onClick: () => location.reload() }, 'Neu laden / Reload')),
    );
    return;
  }

  const shell = createShell(root);
  const app = {
    data,
    shell,
    rerender: () => show(match(currentPath())),
    checkUpdate: null,
    async setLang(lang) {
      store.mutate((s) => {
        s.settings.lang = lang;
      });
      setLang(lang);
      app.data = await loadAll(lang);
      shell.relabel();
      updateBadge();
      app.rerender();
      toast(lang === 'en' ? 'Language: English' : 'Sprache: Deutsch');
    },
  };

  route('/', home.render, 'pfad');
  route('/kapitel/:id', chapter.render, 'pfad');
  route('/kapitel/:id/:lektion', lesson.render, 'pfad');
  route('/wiederholen', review.render, 'wiederholen');
  route('/vokabeln', vocab.render, 'wiederholen');
  route('/labor', labor.render, 'labor');
  route('/labor/sim/:id', labor.renderSimPage, 'labor');
  route('/labor/spiel/:id', labor.renderGamePage, 'labor');
  route('/labor/:bereich', labor.render, 'labor');
  route('/glossar', glossary.renderList, 'glossar');
  route('/glossar/:id', glossary.renderTerm, 'glossar');
  route('/einstellungen', settings.render, 'profil');

  let token = 0;
  async function show(m) {
    const tk = ++token;
    let el;
    try {
      el = m ? await m.view(m.params, app) : h('div', { class: 'page' }, h('h1', {}, t('Seite nicht gefunden')), h('a', { class: 'btn btn-primary', href: '#/' }, t('Zum Lernpfad')));
    } catch (e) {
      console.error(e);
      el = h('div', { class: 'page' }, h('h1', {}, t('Da ist etwas schiefgelaufen')), h('p', { class: 'hint' }, String(e?.message ?? e)), h('a', { class: 'btn btn-primary', href: '#/' }, t('Zum Lernpfad')));
    }
    if (tk === token) shell.setView(el, m?.tab, { calculator: WITH_CALCULATOR.test(currentPath()) });
  }

  const updateBadge = () => shell.setDueCount(dueIds(store.get(), toDay()).filter((id) => app.data.items.has(id)).length);
  store.subscribe(updateBadge);
  updateBadge();

  start((m) => show(m));
  registerServiceWorker(app);
}

async function registerServiceWorker(app) {
  if (!('serviceWorker' in navigator)) return;
  if (location.search.includes('nosw')) {
    // Development: drop service workers and caches so edits show up immediately.
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
    return;
  }
  let applying = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying) location.reload();
  });
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    const offer = (worker) =>
      app.shell.showUpdate(() => {
        applying = true;
        worker.postMessage('SKIP_WAITING');
      });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
    app.checkUpdate = async () => {
      await reg.update();
      if (!reg.waiting && !reg.installing) toast(t('Du hast die neueste Version.'));
    };
  } catch (e) {
    console.warn('Service worker registration failed', e);
  }
}

boot();
