# ADR 0005 · Labor, Simulationen und Spiele als Module

**Status:** angenommen (Version 0.2)

**Kontext:** Die App soll visuell und interaktiv lehren: Formeln anfassen, Parameter verändern, Zusammenhänge sehen. Dafür braucht es Diagramme und Simulationen, ohne das Prinzip „Inhalt und Code trennen" und ohne Build-Schritt zu verlassen.

**Entscheidung:**

- Neuer Blocktyp `sim` (`block.modell`) und `spiel` (`block.spiel`). Jede Simulation ist ein Modul `src/sims/<id>.js` mit `meta`, `formel`, `aufgaben` und `mount(root)`. Jedes Spiel ist ein Modul `src/games/<id>.js` mit `meta` und `mount(root, ctx)`.
- Gemeinsamer Baukasten `src/sims/kit.js` (Canvas mit Geräte-Pixelverhältnis und Themenfarben, `Plot` mit Log-Achsen, Schieberegler, Ergebnis-Kacheln, Animationsschleife, die außerhalb des Bildschirms pausiert).
- Neuer Tab **Labor** mit Simulationen, **Formelsammlung** (automatisch aus `formel`-Blöcken mit `sammlung` und `titel` zusammengetragen), Normen und Konstanten (`content/referenz.json`) und Spielen.
- Spielstände (`state.games`: Bestwert und Anzahl der Spiele) liegen im selben Store wie der Lernfortschritt, werden exportiert und beim Zusammenführen per Maximum vereinigt. XP gibt es nur für Punkte über dem bisherigen Bestwert, damit Wiederholen nicht zum XP-Farmen wird.
- Simulationen enthalten **nur Physikdefinitionen mit frei wählbaren Parametern**, keine Materialdaten. Wo ein Modell qualitativ ist (Zwei-Temperatur-Modell, Wärmediffusion), steht das im Hinweistext.

**Alternativen:** Chart-Bibliothek (Chart.js, D3): zusätzliche Abhängigkeit, schwerer offline zu pflegen, und unsere Diagramme brauchen eigene Interaktionen. WebGL/Three.js: für 2D-Physikgrafiken überdimensioniert.

**Folgen:** Eine neue Simulation ist ein Modul plus ein Eintrag in `content/labor.json`; der Validator prüft, dass alle genannten Module existieren. Alle Canvas-Zeichnungen lesen Farben aus den CSS-Variablen (`--fig-*`) und folgen damit Hell/Dunkel. Bei `prefers-reduced-motion` laufen Animationen nicht.
