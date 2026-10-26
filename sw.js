// Service worker: precache app shell and content, serve cache-first (offline-capable).
// VERSION and the PRECACHE block are maintained by tools/release.py - do not edit by hand.
const VERSION = '0.4.0';
const CACHE = `ukp-basics-${VERSION}`;

// BEGIN PRECACHE
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/blocks/beispiel.js',
  'src/blocks/bild.js',
  'src/blocks/formel.js',
  'src/blocks/karte.js',
  'src/blocks/merke.js',
  'src/blocks/quelle.js',
  'src/blocks/quiz.js',
  'src/blocks/rechner.js',
  'src/blocks/registry.js',
  'src/blocks/scoring.js',
  'src/blocks/sim.js',
  'src/blocks/spiel.js',
  'src/blocks/text.js',
  'src/core/calc.js',
  'src/core/content.js',
  'src/core/dates.js',
  'src/core/exportimport.js',
  'src/core/format.js',
  'src/core/i18n.js',
  'src/core/paginate.js',
  'src/core/progress.js',
  'src/core/richtext.js',
  'src/core/router.js',
  'src/core/sm2.js',
  'src/core/storage.js',
  'src/core/store.js',
  'src/games/_common.js',
  'src/games/fokussuche.js',
  'src/games/kompressor.js',
  'src/games/leistung.js',
  'src/games/liuplot.js',
  'src/games/rechenwerkstatt.js',
  'src/games/schwellenjaeger.js',
  'src/games/strahljustage.js',
  'src/games/zahlenblitz.js',
  'src/i18n/en.js',
  'src/main.js',
  'src/sims/absorption.js',
  'src/sims/cpa.js',
  'src/sims/diffusion.js',
  'src/sims/effizienz.js',
  'src/sims/gauss.js',
  'src/sims/inkubation.js',
  'src/sims/kit.js',
  'src/sims/mpa.js',
  'src/sims/puls.js',
  'src/sims/schwelle.js',
  'src/sims/ttm.js',
  'src/sims/ueberlapp.js',
  'src/styles/base.css',
  'src/styles/components.css',
  'src/styles/extras.css',
  'src/styles/home.css',
  'src/styles/lab.css',
  'src/styles/pager.css',
  'src/styles/theme.css',
  'src/styles/tools.css',
  'src/ui/board.js',
  'src/ui/calculator.js',
  'src/ui/dom.js',
  'src/ui/icons.js',
  'src/ui/langswitch.js',
  'src/ui/plotfig.js',
  'src/ui/shell.js',
  'src/ui/swipe.js',
  'src/ui/views/chapter.js',
  'src/ui/views/glossary.js',
  'src/ui/views/home.js',
  'src/ui/views/labor.js',
  'src/ui/views/lesson.js',
  'src/ui/views/review.js',
  'src/ui/views/settings.js',
  'src/ui/views/vocab.js',
  'src/version.js',
  'content/chapters/00-werkzeugkasten.json',
  'content/chapters/01-pulsgroessen.json',
  'content/chapters/02-strahloptik.json',
  'content/chapters/03-licht-materie.json',
  'content/chapters/04-ukp-erzeugen.json',
  'content/chapters/05-zeitskalen-ttm.json',
  'content/chapters/06-nichtlineare-absorption.json',
  'content/chapters/07-ablation-schwelle.json',
  'content/chapters/08-werkstoffe.json',
  'content/chapters/09-prozess-anlage.json',
  'content/chapters/10-sonderverfahren.json',
  'content/chapters/11-messtechnik-normen.json',
  'content/chapters/12-wissenschaftliche-praxis.json',
  'content/chapters/13-englisch.json',
  'content/chapters/14-laboralltag.json',
  'content/en/chapters/00-werkzeugkasten.json',
  'content/en/chapters/01-pulsgroessen.json',
  'content/en/chapters/02-strahloptik.json',
  'content/en/chapters/03-licht-materie.json',
  'content/en/chapters/04-ukp-erzeugen.json',
  'content/en/chapters/05-zeitskalen-ttm.json',
  'content/en/chapters/06-nichtlineare-absorption.json',
  'content/en/chapters/07-ablation-schwelle.json',
  'content/en/chapters/08-werkstoffe.json',
  'content/en/chapters/09-prozess-anlage.json',
  'content/en/chapters/10-sonderverfahren.json',
  'content/en/chapters/11-messtechnik-normen.json',
  'content/en/chapters/12-wissenschaftliche-praxis.json',
  'content/en/chapters/13-englisch.json',
  'content/en/chapters/14-laboralltag.json',
  'content/en/glossar.json',
  'content/en/index.json',
  'content/en/quellen.json',
  'content/en/referenz.json',
  'content/glossar.json',
  'content/id-registry.json',
  'content/index.json',
  'content/labor.json',
  'content/quellen.json',
  'content/referenz.json',
  'assets/brand/mark.svg',
  'assets/figures/baender.svg',
  'assets/figures/gauss-profil.svg',
  'assets/figures/pulszug.svg',
  'assets/figures/zeitleiter.svg',
  'assets/figures/zeitskalen-prozesse.svg',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/icon.svg',
  'vendor/katex/LICENSE',
  'vendor/katex/fonts/KaTeX_AMS-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2',
  'vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2',
  'vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Main-Bold.woff2',
  'vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2',
  'vendor/katex/fonts/KaTeX_Main-Italic.woff2',
  'vendor/katex/fonts/KaTeX_Main-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2',
  'vendor/katex/fonts/KaTeX_Math-Italic.woff2',
  'vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2',
  'vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2',
  'vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Script-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size1-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size2-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size3-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size4-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2',
  'vendor/katex/katex.min.css',
  'vendor/katex/katex.min.js',
];
// END PRECACHE

// Fetch with cache: 'reload' so a new release never precaches stale copies from the browser's HTTP cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map(async (url) => {
          const res = await fetch(new Request(url, { cache: 'reload' }));
          if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
          await cache.put(url, res);
        }),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('ukp-basics-') && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

// The page asks to activate a waiting worker after the user taps "Aktualisieren".
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (req.mode === 'navigate') {
          const shell = await cache.match('./', { ignoreSearch: true });
          if (shell) return shell;
        }
        throw err;
      }
    })(),
  );
});
