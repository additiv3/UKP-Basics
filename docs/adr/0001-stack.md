# ADR 0001 · Stack: Vanilla JS mit ES-Modulen, kein Build

**Status:** angenommen

**Kontext:** Statische PWA auf GitHub Pages, eine Nutzerperson, langfristig wartbar, Inhalte wachsen als Datenfiles.

**Entscheidung:** Vanilla JavaScript mit ES-Modulen, kein Framework, kein Build-Schritt. KaTeX (0.16.11) lokal unter `vendor/katex/`, nur `katex.min.js`, CSS und woff2-Fonts. Blöcke werden per dynamischem `import()` aus `src/blocks/<typ>.js` geladen. Hilfsskripte (Release, Validierung, Grafiken) in Python unter `tools/`, Tests mit `node --test`.

**Alternativen:** Framework (Preact/Svelte) mit Vite: mehr Komfort, aber Build-Kette und Abhängigkeiten ohne echten Gewinn bei dieser Größe.

**Folgen:** Kein Bundling, daher viele kleine Dateien; der Service Worker precached sie per generierter Liste (`tools/release.py`). Neue Blocktypen sind ein neues Modul ohne Kernänderung.
