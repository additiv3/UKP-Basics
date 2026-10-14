# ADR 0002 · Hash-Routing

**Status:** angenommen

**Kontext:** GitHub Pages hat keinen Rewrite auf `index.html`; die App liegt unter `/UKP-Basics/`.

**Entscheidung:** Routen als `#/…` (`#/`, `#/kapitel/k01`, `#/kapitel/k01/k01.l02`, `#/wiederholen`, `#/glossar/<id>`, `#/einstellungen`). Alle Asset-Pfade relativ.

**Folgen:** Funktioniert unter jedem Unterpfad und offline ohne Serverlogik. Links sind vom Homescreen-Start aus stabil.
