// Service worker: precache app shell and content, serve cache-first (offline-capable).
// VERSION and the PRECACHE block are maintained by tools/release.py - do not edit by hand.
const VERSION = '0.1.0';
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
  'src/blocks/text.js',
  'src/core/content.js',
  'src/core/dates.js',
  'src/core/exportimport.js',
  'src/core/format.js',
  'src/core/progress.js',
  'src/core/richtext.js',
  'src/core/router.js',
  'src/core/sm2.js',
  'src/core/storage.js',
  'src/core/store.js',
  'src/main.js',
  'src/styles/base.css',
  'src/styles/components.css',
  'src/styles/theme.css',
  'src/ui/dom.js',
  'src/ui/icons.js',
  'src/ui/shell.js',
  'src/ui/views/chapter.js',
  'src/ui/views/glossary.js',
  'src/ui/views/home.js',
  'src/ui/views/lesson.js',
  'src/ui/views/review.js',
  'src/ui/views/settings.js',
  'src/version.js',
  'content/chapters/01-pulsgroessen.json',
  'content/glossar.json',
  'content/id-registry.json',
  'content/index.json',
  'content/quellen.json',
  'assets/figures/gauss-profil.svg',
  'assets/figures/pulszug.svg',
  'assets/figures/zeitleiter.svg',
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

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
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
