// Labor: all simulations, the formula sheet (collected from the chapters), constants, standards and games.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { math, inline, rich } from '../../core/richtext.js';
import * as store from '../../core/store.js';
import { simCard } from '../../blocks/sim.js';
import { gameCard } from '../../blocks/spiel.js';
import { supNum } from '../../sims/kit.js';
import { getLang } from '../../core/i18n.js';
import { openCalculator } from '../calculator.js';
import { CONSTANTS, PREFIXES, formatResult } from '../../core/calc.js';
import { t } from '../../core/i18n.js';

const SECTIONS = [
  { id: 'sims', label: 'Simulationen' },
  { id: 'formeln', label: 'Formeln' },
  { id: 'normen', label: 'Normen' },
  { id: 'spiele', label: 'Spiele' },
  { id: 'rechner', label: 'Rechner' },
];

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const referenzCache = {};
async function loadReferenz() {
  const lang = getLang();
  if (!referenzCache[lang]) {
    const load = async (p) => {
      const res = await fetch(p);
      if (!res.ok) throw new Error(p);
      return res.json();
    };
    referenzCache[lang] = lang === 'en' ? await load('content/en/referenz.json').catch(() => load('content/referenz.json')) : await load('content/referenz.json');
  }
  return referenzCache[lang];
}

function header(active) {
  return h(
    'div',
    {},
    h('p', { class: 'kicker' }, t('Labor')),
    h('h1', {}, t('Experimentieren und nachschlagen')),
    h('div', { class: 'segmented wide', role: 'tablist' }, SECTIONS.map((s) => h('a', { class: `seg ${s.id === active ? 'on' : ''}`, href: `#/labor/${s.id}`, role: 'tab', 'aria-selected': s.id === active }, t(s.label)))),
  );
}

/* ---------- Simulationen ---------- */
async function simList(app) {
  const cfg = app.data.labor;
  const tiles = await Promise.all(
    cfg.sims.map(async (s) => {
      const mod = await import(`../../sims/${s.id}.js`);
      const ch = app.data.chapters.get(s.kapitel) ?? null;
      return h(
        'a',
        { class: 'tile', href: `#/labor/sim/${s.id}`, style: `--tile: var(--st-${s.stufe ?? 'a'})` },
        h('span', { class: 'tile-ic', html: icon(s.icon ?? 'bolt', 22) }),
        h('strong', { class: 'tile-title' }, t(mod.meta.titel)),
        h('span', { class: 'tile-kurz' }, t(mod.meta.kurz)),
        h('span', { class: 'tile-foot' }, ch ? t('Kapitel {k}', { k: s.kapitel.toUpperCase() }) : t('Kapitel {k} (bald)', { k: s.kapitel.toUpperCase() })),
      );
    }),
  );
  return h('div', { class: 'tile-grid' }, tiles);
}

export async function renderSimPage({ id }) {
  const back = h('a', { class: 'back', href: '#/labor/sims' }, h('span', { html: icon('back', 18) }), t('Labor'));
  const card = await simCard(id);
  return h('div', { class: 'page' }, back, card);
}

/* ---------- Spiele ---------- */
async function gameList(app) {
  const cfg = app.data.labor;
  const tiles = await Promise.all(
    cfg.spiele.map(async (g) => {
      const mod = await import(`../../games/${g.id}.js`);
      const best = store.get().games[g.id]?.best;
      return h(
        'a',
        { class: 'tile game', href: `#/labor/spiel/${g.id}` },
        h('span', { class: 'tile-ic', html: icon('star', 22) }),
        h('strong', { class: 'tile-title' }, t(mod.meta.titel)),
        h('span', { class: 'tile-kurz' }, t(mod.meta.kurz)),
        h('span', { class: 'tile-foot' }, best ? t('Bestwert {n}', { n: best }) : t('Noch nicht gespielt')),
      );
    }),
  );
  return h('div', { class: 'tile-grid' }, tiles);
}

export async function renderGamePage({ id }) {
  const back = h('a', { class: 'back', href: '#/labor/spiele' }, h('span', { html: icon('back', 18) }), t('Labor'));
  return h('div', { class: 'page' }, back, await gameCard(id));
}

/* ---------- Formeln ---------- */
function collectFormulas(app) {
  const out = [];
  for (const chapter of app.data.chapters.values()) {
    for (const lesson of chapter.lektionen) {
      for (const b of lesson.blocks) {
        if (b.typ === 'formel' && b.sammlung) out.push({ b, chapter, lesson });
      }
    }
  }
  return out;
}

async function formulaSheet(app) {
  const all = collectFormulas(app);
  const ref = await loadReferenz();
  const cats = [...new Set(all.map((f) => f.b.sammlung))];
  let cat = '';
  let q = '';
  const list = h('div', { class: 'formula-list' });
  const chips = h('div', { class: 'chips scroll' });
  const search = h('input', { type: 'search', class: 'input', placeholder: t('Formel oder Größe suchen'), 'aria-label': t('Formeln durchsuchen'), autocomplete: 'off', onInput: () => { q = search.value; draw(); } });

  function draw() {
    chips.replaceChildren(
      h('button', { type: 'button', class: `chip btn-chip ${cat ? '' : 'on'}`, onClick: () => { cat = ''; draw(); } }, t('Alle')),
      ...cats.map((c) => h('button', { type: 'button', class: `chip btn-chip ${cat === c ? 'on' : ''}`, onClick: () => { cat = cat === c ? '' : c; draw(); } }, c)),
    );
    const nq = norm(q);
    const hits = all.filter((f) => (!cat || f.b.sammlung === cat) && (!nq || norm(`${f.b.titel ?? ''} ${f.b.erklaerung ?? ''} ${f.b.latex} ${f.b.sammlung}`).includes(nq)));
    list.replaceChildren(
      ...hits.map((f) =>
        h(
          'article',
          { class: 'fcard' },
          h('div', { class: 'fcard-top' }, h('strong', {}, f.b.titel ?? f.b.sammlung), h('span', { class: 'chip small' }, f.b.sammlung)),
          h('div', { class: 'formula', html: math(f.b.latex, true) }),
          f.b.einheit ? h('p', { class: 'formula-unit' }, t('Einheit:'), ' ', h('span', { html: math(f.b.einheit.includes('\\') ? f.b.einheit : `\\mathrm{${f.b.einheit}}`) })) : null,
          f.b.erklaerung ? h('div', { class: 'prose small', html: rich(f.b.erklaerung) }) : null,
          h('a', { class: 'fcard-src', href: `#/kapitel/${f.chapter.id}/${f.lesson.id}` }, `${f.chapter.id.toUpperCase()} · ${f.lesson.titel}`, h('span', { html: icon('chevron', 14) })),
        ),
      ),
      hits.length ? null : h('p', { class: 'hint' }, t('Keine Formel gefunden.')),
    );
  }
  draw();

  const consts = h(
    'section',
    { class: 'consts' },
    h('h2', {}, t('Konstanten')),
    h('p', { class: 'hint' }, t('Exakte SI-Werte seit 2019 bzw. CODATA 2018 (gerundet dargestellt).')),
    h(
      'div',
      { class: 'const-grid' },
      ref.konstanten.map((k) => h('div', { class: 'const' }, h('span', { class: 'const-sym', html: math(k.symbol) }), h('span', { class: 'const-name' }, k.name), h('strong', { class: 'const-val', html: math(k.wert) }))),
    ),
  );
  const rules = h(
    'section',
    {},
    h('h2', {}, t('Faustformeln')),
    h(
      'div',
      { class: 'formula-list' },
      ref.faustformeln.map((r) => h('article', { class: 'fcard' }, h('strong', {}, r.titel), h('div', { class: 'formula', html: math(r.latex, true) }), r.hinweis ? h('p', { class: 'hint' }, r.hinweis) : null)),
    ),
  );

  return h('div', {}, h('p', { class: 'lead' }, t('{n} Formeln aus den Kapiteln, gesammelt zum Nachschlagen. Tippe auf die Quelle, um zur Herleitung zu springen.', { n: all.length })), search, chips, list, rules, consts);
}

/* ---------- Rechner ---------- */
async function calcTab() {
  return h(
    'div',
    {},
    h('p', { class: 'lead' }, t('Wissenschaftlicher Taschenrechner mit Konstanten und SI-Vorsätzen, auch offline. In Rechenaufgaben übernimmst du das Ergebnis direkt in die Antwort.')),
    h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: () => openCalculator(), html: `${icon('calc', 20)} ${t('Taschenrechner öffnen')}` }),
    h('h2', {}, t('Konstanten im Rechner')),
    h('div', { class: 'const-grid' }, CONSTANTS.map((c) => h('div', { class: 'const' }, h('span', { class: 'const-sym' }, c.sym), h('span', { class: 'const-name' }, t(c.name)), h('strong', { class: 'const-val' }, formatResult(Number(c.value), getLang() === 'en' ? '.' : ','))))),
    h('h2', {}, t('SI-Vorsätze')),
    h('div', { class: 'chips' }, PREFIXES.map(([p, e]) => h('span', { class: 'chip' }, `${p} = 10${supNum(e)}`))),
    h('p', { class: 'hint' }, t('Tipp: Rechenaufgaben findest du in jedem Kapitel; zum Üben gibt es die Rechenwerkstatt unter Spiele.')),
  );
}

/* ---------- Normen ---------- */
async function standards(app) {
  const ref = await loadReferenz();
  let q = '';
  const list = h('div', { class: 'std-list' });
  const search = h('input', { type: 'search', class: 'input', placeholder: t('Norm oder Thema suchen'), 'aria-label': t('Normen durchsuchen'), autocomplete: 'off', onInput: () => { q = search.value; draw(); } });
  function draw() {
    const nq = norm(q);
    const hits = ref.normen.filter((n) => !nq || norm(`${n.nummer} ${n.titel} ${n.bereich} ${n.wozu}`).includes(nq));
    list.replaceChildren(
      ...hits.map((n) =>
        h(
          'article',
          { class: 'std' },
          h('div', { class: 'std-top' }, h('strong', { class: 'std-num' }, n.nummer), h('span', { class: 'chip small' }, n.bereich)),
          h('p', { class: 'std-title' }, n.titel),
          h('p', { class: 'small', html: inline(n.wozu) }),
          h('span', { class: 'badge badge-warn' }, t('Titel ungeprüft')),
        ),
      ),
      hits.length ? null : h('p', { class: 'hint' }, t('Keine Norm gefunden.')),
    );
  }
  draw();
  return h(
    'div',
    {},
    h('p', { class: 'lead' }, t('Normen, die dir in der Laserbearbeitung und Messtechnik ständig begegnen. Titel sind sinngemäß wiedergegeben: Wortlaut und Ausgabestand bitte im Normenverzeichnis der Hochschule prüfen.')),
    search,
    list,
    h('p', { class: 'hint' }, t('Normen sind urheberrechtlich geschützt; hier steht nur eine kurze Einordnung in eigenen Worten.')),
  );
}

export async function render({ bereich }, app) {
  const section = SECTIONS.some((s) => s.id === bereich) ? bereich : 'sims';
  const body =
    section === 'sims' ? await simList(app) : section === 'spiele' ? await gameList(app) : section === 'formeln' ? await formulaSheet(app) : section === 'rechner' ? await calcTab() : await standards(app);
  return h('div', { class: 'page' }, header(section), h('div', { class: 'labor-body' }, body));
}
