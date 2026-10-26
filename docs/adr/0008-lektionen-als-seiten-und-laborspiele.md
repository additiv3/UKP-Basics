# ADR 0008 · Lektionen als Seiten, Laborspiele und Diagrammfragen

**Status:** angenommen (Version 0.4)

**Kontext:** Lektionen waren eine lange Scrollseite. Am iPhone verliert man darin den Überblick, und Fragen gehen zwischen den Textblöcken unter. Außerdem fehlte ein Gefühl dafür, was man an einer UKP-Anlage tatsächlich tut (justieren, Fokus suchen, Leistung einstellen, Pulsdauer prüfen, Schwelle auswerten), und das Lesen von Diagrammen wurde nicht geübt.

**Entscheidung:**

- **Lektion = Folge von Seiten** (`src/core/paginate.js`): Jede Frage, jede Karteikarte und jede Simulation bzw. jedes Spiel bekommt eine eigene Seite. Lesetexte werden gebündelt (neue Seite bei jedem `text` nach Formeln/Merksätzen, höchstens vier Blöcke). Am Ende steht eine Abschlussseite mit der Übersicht offener Fragen.
- **Blättern** per Wischgeste (`src/ui/swipe.js`, Pointer Events, `touch-action: pan-y`), per Knopf in der unteren Leiste, per Pfeiltaste oder durch Antippen eines Segments in der Fortschrittsleiste. Gesten auf Schiebereglern, Kacheln, Canvas und seitlich scrollenden Formeln werden ignoriert. In Lektionen ist die Tab-Leiste ausgeblendet (`body.immersive`). Die zuletzt offene Seite wird pro Lektion gemerkt (`localStorage`, nur Komfort).
- **Laborspiele** (`src/games/`): Fokussuche, Strahljustage (Beam Walking), Leistung einstellen (λ/2 + Polarisator, träger Messkopf), Pulskompressor mit Autokorrelator, Liu-Plot. Gemeinsame Bausteine in `src/games/_common.js` (Intro mit Sicherheits-Checkliste, Runden, Sterne). Alle Modelle sind physikalische Definitionen mit frei gewählten Zahlen.
- **Neues Kapitel K14 „Laboralltag an der UKP-Anlage“** bündelt die Spiele mit Text und Fragen.
- **Diagrammfragen:** Jede Quizfrage kann ein Feld `plot` tragen (Achsen, Kurven als Ausdruck in `x`, Messpunkte, Hilfslinien, optional ein ziehbarer Ablese-Cursor). Kurven wertet der Taschenrechner-Parser aus (kein `eval`). Achsenbeschriftungen sind symbolisch und sprachneutral, `label_en` überschreibt Legenden im Englischen.

**Alternativen:** Horizontales Scroll-Snapping aller Seiten (Höhe richtet sich nach der längsten Seite, Canvas-Simulationen laufen unsichtbar mit); Diagramme als vorgerenderte SVG-Dateien (nicht interaktiv, kein Ablesen).

**Folgen:** `paginate` und die Plot-Ausdrücke sind unit-getestet (`tests/pager.test.js`). Neue Diagrammfragen brauchen nur JSON.
