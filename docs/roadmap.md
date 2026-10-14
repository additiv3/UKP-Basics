# Roadmap

Abweichung vom ursprünglichen Projektentwurf: Die Wiederholungslogik (SM-2) und der Lernpfad mit Spielmechanik ziehen in **Phase 1** vor, weil sie den Kern der App ausmachen. Karteikarten-Ansicht, Mini-Spiele und Diagramme bleiben später.

## Phase 1 · Gerüst und Lernkern (jetzt)

- [x] Repo `UKP-Basics` (privat), Projektdoku, Lernpfad-Plan
- [x] App-Shell: Router (Hash), Tab-Navigation, Hell/Dunkel, Safe-Area
- [x] Store mit Export/Import (JSON), Persistenzanfrage für iOS
- [x] SM-2-Modul mit Tests
- [x] Block-Registry und Blöcke: `text`, `formel`, `bild`, `merke`, `beispiel`, `quiz`, `karte`, `rechner`, `quelle`
- [x] Quizarten: Multiple Choice, Zuordnung, Lückentext, Sortieren, Zahl
- [x] Lernpfad-Startseite, Kapitel- und Lektionsansicht, weiches Freischalten
- [x] Wiederholungssitzung (SM-2), XP, Level, Tagesserie
- [x] Glossar (Start: 14 Begriffe aus dem Fachkontext) mit Verlinkung
- [x] Kapitel K01 komplett, K02 bis K12 als Gliederung
- [x] Icon, Manifest, Service Worker (offline), Release-Skript, Inhaltsvalidierung
- [x] CI-Prüfung (GitHub Actions)
- [ ] GitHub Pages aktivieren (Entscheidung offen, siehe [offene Punkte](offene-punkte.md))

## Phase 2 · Inhalte und Spiele

- K02 bis K05 ausarbeiten, danach nach Lernpfad weiter
- Erste Mini-Spiele (Modul pro Spiel in `src/games/`): Größenordnungen, Begriffe den Mechanismen zuordnen
- Karteikarten-Ansicht pro Kapitel (Blättern ohne SM-2)
- Statistik-Ansicht (Aktivität, gefestigte Fragen je Kapitel)

## Phase 3 · Interaktive Diagramme

- Fluenz-Regler mit Ablationsschwelle und Abtragtiefe
- Wärmediffusionslänge vs. Pulsdauer
- Gauß-Strahl und Spitzenfluenz
- Suche, Notizen, Literaturverzeichnis mit Quellenverweisen

## Phase 4 · Eigene Literatur und Experimente

- Inhalte aus Zotero-Export, Ergebnisse der ersten Experimente
- Evtl. FSRS als Scheduler-Alternative zu SM-2 (siehe ADR 0004)
