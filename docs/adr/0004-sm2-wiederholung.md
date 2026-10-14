# ADR 0004 · Wiederholungslogik SM-2

**Status:** angenommen

**Kontext:** Karteikarten und Quizfragen sollen in sinnvollen Abständen wiederkehren. Gewünscht war ein feineres Verfahren als einfache Leitner-Boxen.

**Entscheidung:** SM-2 nach Wozniak mit Tagesgranularität (Datum als `YYYY-MM-DD`, keine Uhrzeiten, keine Zeitzonenprobleme).

- Start: Leichtigkeitsfaktor EF = 2,5; Untergrenze 1,3.
- Bewertung q (0 bis 5). Karten haben vier Tasten: Nochmal = 1, Schwer = 3, Gut = 4, Leicht = 5 (wie Anki). Quizfragen: falsch = 1, richtig = 4.
- q < 3: Wiederholungszähler auf 0, Frage ist heute wieder fällig, **EF bleibt unverändert** (so im Original; verhindert „Ease Hell").
- q ≥ 3: Abstand 1 Tag, dann 6 Tage, danach `round(Abstand × EF)`; EF-Update `EF + 0,1 − (5−q)·(0,08 + (5−q)·0,02)`.
- „Gefestigt" ab Abstand ≥ 21 Tage (Anki-Konvention „mature").
- Eine Sitzung zeigt höchstens 15 fällige Elemente, danach „Weitere 15".

**Alternativen:** FSRS (modernes Gedächtnismodell, besser kalibriert, aber mehr Parameter und Datenbedarf); als Option für Phase 4 notiert. Leitner: zu grob.

**Folgen:** Reine Funktionen in `src/core/sm2.js`, getestet in `tests/sm2.test.js`; austauschbar, weil der Store nur `{ef, rep, int, due}` pro Frage-ID speichert.
