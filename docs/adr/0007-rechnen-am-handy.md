# ADR 0007 · Rechnen am Handy: Taschenrechner, Kacheln, Formelbaukasten

**Status:** angenommen (Version 0.3)

**Kontext:** Zahlenfragen sind am iPhone mühsam: Die Dezimaltastatur kennt weder Minus noch Exponent, und Kopfrechnen mit Zehnerpotenzen ist fehleranfällig.

**Entscheidung:**

- **Taschenrechner** (`src/ui/calculator.js`, Auswertung in `src/core/calc.js`): wissenschaftlicher Rechner als Bottom-Sheet mit EE, Klammern, Potenzen, Wurzeln, ln/log, Winkelfunktionen (DEG/RAD), Konstanten und SI-Vorsätzen. Der Ausdruck wird von einem eigenen Parser ausgewertet (kein `eval`). Erreichbar über den Knopf unten rechts auf Lektions-, Wiederholungs- und Laborseiten, in jedem Zahlenfeld und im Labor-Tab „Rechner“. „Ergebnis übernehmen“ schreibt das Resultat ins Antwortfeld.
- **Zahlenfelder:** Hilfstasten für Minus und ×10ⁿ. Bei Einheiten mit Skalierung (`MW`, `µm`, `·10⁻¹⁹ J`) wird auch der reine SI-Wert akzeptiert, den der Rechner liefert.
- **Neue Quizart `rechenweg`:** Die Formel wird aus Kacheln gebaut (antippen oder ziehen), danach wird gerechnet. Vorlage-Syntax: `[]` = Feld, `{{ oben // unten }}` = Bruch. `tausch` markiert vertauschbare Felder.
- **Zuordnung per Kacheln** (statt Auswahlmenüs), **Lückentext per Antippen**, **Sortieren per Ziehen** am Griff (Pfeiltasten bleiben). Alles mit Pointer Events (Finger und Maus), Tippen ist die Alternative zum Ziehen.
- **Lösung zeigen** bei jeder Frage (zählt als falsch, damit Lektionen nicht blockieren) und optionale **Tipps** (`tipp`).
- **Rechenwerkstatt:** Spiel mit zufälligen Rechenaufgaben (Generatoren aus reinen Definitionen) inklusive Formelhinweis.

**Alternativen:** Nur größere Zahleneingabe (löst das Rechenproblem nicht); iOS-Taschenrechner nutzen (Medienbruch, kein Übernehmen); eine Mathe-Bibliothek wie math.js (Abhängigkeit für wenige Funktionen).

**Folgen:** Der Parser ist unit-getestet (`tests/calc.test.js`). Neue Rechenaufgaben brauchen keinen Code, nur JSON.
