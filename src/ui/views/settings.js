// Profile and settings: stats, goals, backup (export/import), storage, version, reset.
import { h, toast } from '../dom.js';
import * as store from '../../core/store.js';
import * as storage from '../../core/storage.js';
import { levelInfo, totalXp, streak } from '../../core/progress.js';
import { buildExport, deliverExport, parseImport, mergeStates } from '../../core/exportimport.js';
import { toDay } from '../../core/dates.js';
import { maturity } from '../../core/sm2.js';
import { APP_VERSION } from '../../version.js';

function select(label, value, options, onChange) {
  return h(
    'label',
    { class: 'setting' },
    h('span', {}, label),
    h('select', { class: 'select', onChange: (e) => onChange(Number(e.target.value)) }, options.map((o) => h('option', { value: o, selected: o === value }, String(o)))),
  );
}

export async function render(_params, app) {
  const state = store.get();
  const today = toDay();
  const lv = levelInfo(totalXp(state));
  const items = Object.values(state.items);
  const mature = items.filter((it) => maturity(it) === 'gefestigt').length;
  const persisted = await (navigator.storage?.persisted?.() ?? Promise.resolve(null)).catch(() => null);

  const stat = (value, label) => h('div', { class: 'stat' }, h('strong', {}, String(value)), h('span', {}, label));
  const importBox = h('div', { class: 'import-box', hidden: true });
  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onChange: async () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      try {
        const incoming = parseImport(await file.text());
        const n = Object.keys(incoming.items).length;
        importBox.hidden = false;
        importBox.replaceChildren(
          h('p', {}, `Datei gelesen: ${n} Fragen/Karten, ${Object.keys(incoming.lessons).length} Lektionen.`),
          h('div', { class: 'quiz-actions' }, [
            h('button', { type: 'button', class: 'btn btn-primary', onClick: () => { store.replace(mergeStates(store.get(), incoming)); toast('Zusammengeführt.'); app.rerender(); } }, 'Zusammenführen'),
            h('button', { type: 'button', class: 'btn btn-danger', onClick: () => { if (confirm('Aktuellen Fortschritt durch die Datei ersetzen?')) { store.replace(incoming); toast('Importiert.'); app.rerender(); } } }, 'Ersetzen'),
            h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { importBox.hidden = true; } }, 'Abbrechen'),
          ]),
        );
      } catch (e) {
        importBox.hidden = false;
        importBox.replaceChildren(h('p', { class: 'verdict bad' }, e.message));
      }
    },
  });

  return h(
    'div',
    { class: 'page' },
    h('h1', {}, 'Profil'),
    h('section', { class: 'stats' }, stat(`Lv ${lv.level}`, lv.title), stat(totalXp(state), 'XP gesamt'), stat(streak(state, today), 'Tage in Folge'), stat(`${mature}/${items.length}`, 'gefestigt')),
    h(
      'section',
      {},
      h('h2', {}, 'Lernen'),
      select('Tagesziel (XP)', state.settings.dailyGoal, [20, 40, 60, 100], (v) => store.mutate((s) => { s.settings.dailyGoal = v; })),
      select('Fragen pro Wiederholungsrunde', state.settings.reviewBatch, [10, 15, 25, 40], (v) => store.mutate((s) => { s.settings.reviewBatch = v; })),
    ),
    h(
      'section',
      {},
      h('h2', {}, 'Datensicherung'),
      h('p', { class: 'hint' }, 'Dein Fortschritt liegt nur in diesem Browser. iOS kann ihn löschen, wenn die App lange ungenutzt bleibt. Sichere ihn deshalb regelmäßig.'),
      h('p', { class: 'hint' }, state.profile.lastExport ? `Letztes Backup: ${state.profile.lastExport}` : 'Noch kein Backup erstellt.'),
      h('div', { class: 'quiz-actions' }, [
        h('button', { type: 'button', class: 'btn btn-primary', onClick: async () => {
          try {
            await deliverExport(buildExport(store.get(), APP_VERSION));
            store.mutate((s) => { s.profile.lastExport = toDay(); });
            toast('Backup erstellt.');
            app.rerender();
          } catch (e) {
            if (e?.name !== 'AbortError') toast('Export fehlgeschlagen.');
          }
        } }, 'Backup exportieren'),
        h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => fileInput.click() }, 'Backup importieren'),
      ]),
      fileInput,
      importBox,
      h('p', { class: 'hint' }, persisted === null ? 'Dauerhafter Speicher: vom Browser nicht gemeldet.' : persisted ? 'Dauerhafter Speicher: aktiv.' : 'Dauerhafter Speicher: nicht zugesagt, daher Backups wichtig.'),
    ),
    h(
      'section',
      {},
      h('h2', {}, 'Über die App'),
      h('p', {}, `UKP-Basics · Version ${APP_VERSION}`),
      h('div', { class: 'quiz-actions' }, [
        h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => app.checkUpdate?.() }, 'Nach Update suchen'),
      ]),
      h('p', { class: 'hint' }, 'Inhalte tragen das Badge „ungeprüft", bis sie mit Primärliteratur belegt sind. Quellen stehen unter den Aussagen.'),
    ),
    h(
      'section',
      {},
      h('h2', {}, 'Zurücksetzen'),
      h('button', { type: 'button', class: 'btn btn-danger', onClick: () => { if (confirm('Wirklich den gesamten Fortschritt löschen? Das lässt sich nicht rückgängig machen. Hast du ein Backup?')) { storage.clear(); store.reset(); toast('Zurückgesetzt.'); app.rerender(); } } }, 'Gesamten Fortschritt löschen'),
    ),
  );
}
