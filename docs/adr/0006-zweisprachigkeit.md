# ADR 0006 · Zweisprachigkeit (DE/EN) mit Overlay-Dateien

**Status:** angenommen (Version 0.3)

**Kontext:** Fabio muss das Fachgebiet auf Englisch beherrschen. Die App war rein deutsch. Gefordert: DE/EN-Schalter, alle Inhalte und Begriffe in beiden Sprachen, ohne Build-Schritt und ohne den Lernfortschritt zu zerlegen.

**Entscheidung:**

- **Oberfläche:** `src/core/i18n.js` mit `t('Deutscher Text', {n: 3})`. Der deutsche Text ist zugleich der Schlüssel; `src/i18n/en.js` enthält die englischen Entsprechungen. Fehlt ein Eintrag, erscheint der deutsche Text (kein Absturz). Im Browser listet `window.__missing` im EN-Modus alle fehlenden Schlüssel, so lässt sich die Abdeckung prüfen.
- **Inhalte:** Die deutschen Dateien bleiben die Quelle der Wahrheit. Englisch liegt als **Overlay** in `content/en/` (gleiche Dateinamen). Ein Overlay enthält pro Block-ID nur die übersetzten Felder (Texte, Optionen, Fragen). IDs, Indizes (`richtig`), Zahlen und Antworten bleiben im deutschen File, damit Fragen-IDs und Lernstände stabil sind. `src/core/content.js` legt das Overlay beim Laden über die deutschen Daten; Lücken fallen auf Deutsch zurück.
- **Glossar:** Jeder Begriff hat `begriff` (DE) und `englisch`; `content/en/glossar.json` liefert `kurz` und `definition` auf Englisch. Im EN-Modus ist der englische Begriff der Haupttitel und der deutsche steht in Klammern.
- **Vokabelkarten:** Aus jedem Glossarbegriff entstehen automatisch zwei SM-2-Karten (`v.<begriff>.de`, `v.<begriff>.en`), die in der normalen Wiederholung und im Vokabeltrainer erscheinen. Die IDs stehen in `content/id-registry.json` und sind damit ebenfalls stabil.
- Die Sprache steht in `state.settings.lang` (im Export enthalten). Der Wechsel lädt die Inhalte der anderen Sprache und rendert die Ansicht neu.
- `tools/validate_content.py` prüft die Overlays: unbekannte Block-IDs, abweichende Optionszahl, Struktur von Lückentext und Zuordnung sowie die Abdeckung.

**Alternativen:** Parallele vollständige Dateien je Sprache (doppelte Pflege, IDs können auseinanderlaufen); eine Bibliothek wie i18next (Abhängigkeit, kein Nutzen bei zwei Sprachen); Maschinenübersetzung zur Laufzeit (Fachbegriffe unzuverlässig, offline nicht möglich).

**Folgen:** Neue Inhalte brauchen einen deutschen Block und einen Overlay-Eintrag. Wer nur Deutsch schreibt, erzeugt eine Warnung des Validators, aber keine Fehler in der App.
