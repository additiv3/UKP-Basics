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
- [x] GitHub Pages aktiv (https://additiv3.github.io/UKP-Basics/)

## Phase 2 · Inhalte, Labor und Spiele (Version 0.2, erledigt)

- [x] Neues Erscheinungsbild und neues Icon (Kristall mit fokussiertem Pulszug), animierte Startseite, Stufenfarben
- [x] Blocktypen `sim` und `spiel`, Baukasten `src/sims/kit.js` ([ADR 0005](adr/0005-labor-simulationen-spiele.md))
- [x] 11 interaktive Simulationen: Gauß-Strahl, Absorption, Puls und Chirp, CPA, Wärmediffusion, Zwei-Temperatur-Modell, Mehrphotonen und Keldysh, Schwelle (D²-Methode), Effizienz, Inkubation, Überlapp und Hatch
- [x] Labor-Tab mit Formelsammlung (aus den Kapiteln), Konstanten, Faustformeln, Normen und Spielen
- [x] Spiele: Zahlen-Blitz, Schwellenjäger (Bestwerte im Fortschritt, Export/Import)
- [x] Kapitel K02 bis K07, K09 und K11 ausgearbeitet (insgesamt rund 150 Fragen und Karten)

Offen aus Phase 2: Karteikarten-Ansicht pro Kapitel (Blättern ohne SM-2), Statistik-Ansicht, K08/K10/K12.

## Phase 3 · Vertiefung

- Weitere Simulationen: Bessel-Strahl und Filamentation, LIPSS-Periode, Wärmeakkumulation über Pulsfolgen
- Suche über Kapitel, Notizen, Literaturverzeichnis mit Quellenverweisen
- K08 (Werkstoffe), K10 (Sonderverfahren), K12 (wissenschaftliche Praxis)

## Phase 4 · Eigene Literatur und Experimente

- Inhalte aus Zotero-Export, Ergebnisse der ersten Experimente
- Evtl. FSRS als Scheduler-Alternative zu SM-2 (siehe ADR 0004)
