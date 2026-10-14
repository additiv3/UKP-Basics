// Labor: all simulations, the formula sheet (collected from the chapters), constants, standards and games.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { math, inline, rich } from '../../core/richtext.js';
import * as store from '../../core/store.js';
import { simCard } from '../../blocks/sim.js';
import { gameCard } from '../../blocks/spiel.js';

const SECTIONS = [
  { id: 'sims', label: 'Simulationen' },
  { id: 'formeln', label: 'Formeln' },
  { id: 'normen', label: 'Normen' },
  { id: 'spiele', label: 'Spiele' },
];

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let referenz = null;
async function loadReferenz() {
  if (!referenz) referenz = await (await fetch('content/referenz.json')).json();
  return referenz;
}

function header(active) {
  return h(
    'div',
    {},
    h('p', { class: 'kicker' }, 'Labor'),
    h('h1', {}, 'Experimentieren und nachschlagen'),
    h('div', { class: 'segmented wide', role: 'tablist' }, SECTIONS.map((s) => h('a', { class: `seg ${s.id === active ? 'on' : ''}`, href: `#/labor/${s.id}`, role: 'tab', 'aria-selected': s.id === active }, s.label))),
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
        h('strong', { class: 'tile-title' }, mod.meta.titel),
        h('span', { class: 'tile-kurz' }, mod.meta.kurz),
        h('span', { class: 'tile-foot' }, ch ? `Kapitel ${s.kapitel.toUpperCase()}` : `Kapitel ${s.kapitel.toUpperCase()} (bald)`),
      );
    }),
  );
  return h('div', { class: 'tile-grid' }, tiles);
}

export async function renderSimPage({ id }) {
  const back = h('a', { class: 'back', href: '#/labor/sims' }, h('span', { html: icon('back', 18) }), 'Labor');
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
        h('strong', { class: 'tile-title' }, mod.meta.titel),
        h('span', { class: 'tile-kurz' }, mod.meta.kurz),
        h('span', { class: 'tile-foot' }, best ? `Bestwert ${best}` : 'Noch nicht gespielt'),
      );
    }),
  );
  return h('div', { class: 'tile-grid' }, tiles);
}

export async function renderGamePage({ id }) {
  const back = h('a', { class: 'back', href: '#/labor/spiele' }, h('span', { html: icon('back', 18) }), 'Labor');
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
  const search = h('input', { type: 'search', class: 'input', placeholder: 'Formel oder Größe suchen', 'aria-label': 'Formeln durchsuchen', autocomplete: 'off', onInput: () => { q = search.value; draw(); } });

  function draw() {
    chips.replaceChildren(
      h('button', { type: 'button', class: `chip btn-chip ${cat ? '' : 'on'}`, onClick: () => { cat = ''; draw(); } }, 'Alle'),
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
          f.b.einheit ? h('p', { class: 'formula-unit' }, 'Einheit: ', h('span', { html: math(f.b.einheit.includes('\\') ? f.b.einheit : `\\mathrm{${f.b.einheit}}`) })) : null,
          f.b.erklaerung ? h('div', { class: 'prose small', html: rich(f.b.erklaerung) }) : null,
          h('a', { class: 'fcard-src', href: `#/kapitel/${f.chapter.id}/${f.lesson.id}` }, `${f.chapter.id.toUpperCase()} · ${f.lesson.titel}`, h('span', { html: icon('chevron', 14) })),
        ),
      ),
      hits.length ? null : h('p', { class: 'hint' }, 'Keine Formel gefunden.'),
    );
  }
  draw();

  const consts = h(
    'section',
    { class: 'consts' },
    h('h2', {}, 'Konstanten'),
    h('p', { class: 'hint' }, 'Exakte SI-Werte seit 2019 bzw. CODATA 2018 (gerundet dargestellt).'),
    h(
      'div',
      { class: 'const-grid' },
      ref.konstanten.map((k) => h('div', { class: 'const' }, h('span', { class: 'const-sym', html: math(k.symbol) }), h('span', { class: 'const-name' }, k.name), h('strong', { class: 'const-val', html: math(k.wert) }))),
    ),
  );
  const rules = h(
    'section',
    {},
    h('h2', {}, 'Faustformeln'),
    h(
      'div',
      { class: 'formula-list' },
      ref.faustformeln.map((r) => h('article', { class: 'fcard' }, h('strong', {}, r.titel), h('div', { class: 'formula', html: math(r.latex, true) }), r.hinweis ? h('p', { class: 'hint' }, r.hinweis) : null)),
    ),
  );

  return h('div', {}, h('p', { class: 'lead' }, `${all.length} Formeln aus den Kapiteln, gesammelt zum Nachschlagen. Tippe auf die Quelle, um zur Herleitung zu springen.`), search, chips, list, rules, consts);
}

/* ---------- Normen ---------- */
async function standards(app) {
  const ref = await loadReferenz();
  let q = '';
  const list = h('div', { class: 'std-list' });
  const search = h('input', { type: 'search', class: 'input', placeholder: 'Norm oder Thema suchen', 'aria-label': 'Normen durchsuchen', autocomplete: 'off', onInput: () => { q = search.value; draw(); } });
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
          h('span', { class: 'badge badge-warn' }, 'Titel ungeprüft'),
        ),
      ),
      hits.length ? null : h('p', { class: 'hint' }, 'Keine Norm gefunden.'),
    );
  }
  draw();
  return h(
    'div',
    {},
    h('p', { class: 'lead' }, 'Normen, die dir in der Laserbearbeitung und Messtechnik ständig begegnen. Titel sind sinngemäß wiedergegeben: Wortlaut und Ausgabestand bitte im Normenverzeichnis der Hochschule prüfen.'),
    search,
    list,
    h('p', { class: 'hint' }, 'Normen sind urheberrechtlich geschützt; hier steht nur eine kurze Einordnung in eigenen Worten.'),
  );
}

export async function render({ bereich }, app) {
  const section = SECTIONS.some((s) => s.id === bereich) ? bereich : 'sims';
  const body =
    section === 'sims' ? await simList(app) : section === 'spiele' ? await gameList(app) : section === 'formeln' ? await formulaSheet(app) : await standards(app);
  return h('div', { class: 'page' }, header(section), h('div', { class: 'labor-body' }, body));
}
