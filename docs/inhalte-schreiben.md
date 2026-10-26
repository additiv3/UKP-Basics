# Inhalte schreiben

Die App ist zweisprachig. **Deutsch ist die Quelle** (`content/*.json`), **Englisch ein Overlay** in `content/en/` mit gleichen Dateinamen (siehe [ADR 0006](adr/0006-zweisprachigkeit.md)). Zu jedem neuen Block gehört also ein Eintrag im Overlay.

Inhalte sind reine JSON-Dateien in `content/`. Für neue Kapitel ist keine Codeänderung nötig. Nach jeder Änderung:

```bash
python tools/validate_content.py --update   # prüft und registriert neue Frage-IDs
python tools/release.py --bump patch         # neue Cache-Version, sonst sieht der Homescreen die alte App
```

## Englisches Overlay

`content/en/chapters/<datei>.json`:

```json
{
  "titel": "…", "einleitung": "…", "ziele": ["…"],
  "lektionen": { "k01.l01": "Lesson title" },
  "blocks": { "k01.q02": { "frage": "…", "optionen": ["…", "…"], "erklaerung": "…" } }
}
```

Übersetzbare Felder: `inhalt`, `titel`, `erklaerung`, `alt`, `unterschrift`, `aufgabe`, `schritte`, `ergebnis`, `frage`, `optionen`, `paare`, `text`, `luecken`, `items`, `oben`, `unten`, `vorne`, `hinten`, `tipp`, `gegeben`, `sammlung` sowie bei `rechenweg` auch `vorlage`, `richtig`, `ablenker`. Reihenfolge und Anzahl von `optionen`, `items`, `paare`, `luecken` müssen dem deutschen Block entsprechen (der Validator prüft das). Dezimalzahlen schreibst du im Englischen mit Punkt (`0.3`, in LaTeX ohne `{,}`).

`content/en/index.json` übersetzt Stufen und Kapiteltitel, `content/en/glossar.json` die Begriffe (`kurz`, `definition`), `content/en/referenz.json` Konstanten, Faustformeln und Normen. UI-Texte stehen in `src/i18n/en.js` (Schlüssel ist der deutsche Text).

## Kapitel anlegen

1. Eintrag in `content/index.json` (`datei` setzen; `lektionen_geplant` entfällt dann).
2. Datei `content/chapters/NN-name.json` mit `id`, `titel`, `einleitung`, `ziele[]`, optional `weiterlesen[]` (Quellen-IDs) und `lektionen[]`.
3. Jede Lektion: `id` (z. B. `k02.l01`), `titel`, `minuten`, `blocks[]`.

Jeder Block braucht eine **global eindeutige `id`** und einen `typ`. Frage- und Karten-IDs (`quiz`, `karte`) sind **stabil**: nie umbenennen oder löschen, sonst gehen Lernstände verloren (der Validator prüft das über `content/id-registry.json`).

## Textauszeichnung

`**fett**`, `*kursiv*`, `$latex$` (KaTeX), `[[glossar-id]]` oder `[[glossar-id|Anzeigetext]]`. Leerzeile = neuer Absatz, Zeilen mit `- ` = Liste, `1. ` = nummerierte Liste. Texte dürfen ein String oder ein Array von Absätzen sein. Im JSON müssen Backslashes verdoppelt werden (`"\\frac{a}{b}"`).

## Blocktypen

| typ | Felder |
|---|---|
| `text` | `inhalt`, optional `titel` |
| `formel` | `latex`, optional `einheit` (LaTeX), `erklaerung`; mit `sammlung` (Kategorie) und `titel` landet die Formel in der Formelsammlung im Labor-Tab |
| `bild` | `src` (SVG unter `assets/`), `alt`, optional `unterschrift` |
| `merke` | `inhalt`, optional `titel` |
| `beispiel` | `aufgabe`, `schritte[]`, `ergebnis`; Lösung wird erst auf Tippen gezeigt |
| `rechner` | `modell` (`fluenz`, `photon`), optional `titel` |
| `sim` | `modell` = Dateiname in `src/sims/` (z. B. `gauss`, `ttm`), optional `titel`; Formel und „Experimentier-Aufgaben“ kommen aus dem Modul |
| `spiel` | `spiel` = Dateiname in `src/games/` |
| `quiz` | `art` und Felder siehe unten, immer `frage` und `erklaerung` |
| `karte` | `vorne`, `hinten` |
| `quiz` mit `art: "rechenweg"` | siehe unten |
| `quelle` | `refs[]` (Quellen-IDs aus `content/quellen.json`) |

Quizarten:

- `multiple-choice`: `optionen[]`, `richtig` (Index oder Array für Mehrfachauswahl), optional `fest: true` (Reihenfolge nicht mischen)
- `zuordnung`: `paare[[links, rechts], ...]` (rechte Werte eindeutig, nur Klartext, keine Formeln)
- `luecke`: `text` mit `___` je Lücke, `luecken[{optionen[], richtig}]`
- `sortieren`: `items[]` in richtiger Reihenfolge, optional `oben`, `unten` (Beschriftung der Enden)
- `zahl`: `antwort` (Zahl), `einheit`, `toleranz` (relativ, Standard 0,05; 0 = exakt). Eingaben wie `12,5`, `1.2e13`, `1,2 x 10^13` werden akzeptiert. Bei Einheiten wie `MW`, `µm` oder `·10⁻¹⁹ J` gilt auch der reine SI-Wert als richtig. Das Antwortfeld hat einen Taschenrechner-Knopf.
- `rechenweg`: Formel aus Kacheln bauen, optional danach rechnen. Felder: `vorlage` (`[]` = Feld, `{{ oben // unten }}` = Bruch, `$latex$` erlaubt), `richtig` (Kacheltexte in Feldreihenfolge), `ablenker` (falsche Kacheln), `tausch` (Gruppen vertauschbarer Felder, z. B. `[[0,1]]`), `gegeben` (Liste angezeigter Größen), optional `antwort`, `einheit`, `toleranz` für den Zahlenteil.
- Diagrammfrage: Jede Quizart kann ein Feld `plot` haben: `{"x": {"label": "z / mm", "min": -2, "max": 2, "log": false, "sym": "z"}, "y": {…}, "kurven": [{"f": "15*sqrt(1+(x/0.6)^2)", "label": "w(z)", "sym": "w", "farbe": "accent", "gestrichelt": false}], "punkte": [{"daten": [[x, y], …], "label": "Messung", "label_en": "measured"}], "linien": [{"y": 0.5, "label": "50 %"}], "cursor": true, "cursor_start": 1}`. Kurven sind Ausdrücke in `x` mit der Syntax des Taschenrechners (`ln`, `exp`, `sqrt`, `^`, `pi`, Zahlen wie `5E11`). Beschriftungen symbolisch halten, dann braucht es keine Übersetzung.
- Für alle Arten: optional `tipp` (Hinweis, einblendbar). „Lösung zeigen“ ist immer vorhanden.

## Faktenregel (wichtig)

Jede quantitative Aussage braucht `"quelle"` oder `"verifiziert": false`. Der Validator prüft das für `text`, `merke` und `karte`. `verifiziert: false` zeigt das Badge „ungeprüft". Für Rechnungen aus Definitionen reicht `"verifiziert": true` mit `"quelle": "Herleitung"`. Im Zweifel `false` setzen, nie Zahlen raten. Wenn Literatur eine Aussage bestätigt: Quelle in `content/quellen.json` eintragen, im Block `"quelle": "<id>"` setzen und `verifiziert` entfernen oder auf `true` stellen.

## Grafiken

SVGs entstehen per Skript (`tools/gen_figures.py`) und nutzen die CSS-Variablen `--fig-*`, damit sie Hell/Dunkel folgen. Fotos oder Fremdgrafiken nur mit klarer Lizenz und Quellenangabe.

## Labor, Simulationen und Spiele

Neue Simulation: Modul `src/sims/<id>.js` (siehe `kit.js` und eine vorhandene Simulation als Vorlage), Eintrag in `content/labor.json` (`id`, `kapitel`, `stufe`, `icon`), dann in einer Lektion als `{"typ": "sim", "modell": "<id>"}` einbinden. Parameter sind frei wählbar, es dürfen keine Materialdaten ohne Quelle hinein.
Normen, Konstanten und Faustformeln stehen in `content/referenz.json`.

## Glossar

`content/glossar.json`, je Begriff `id` (nur `a-z`, `0-9`, `-`), `begriff`, `englisch`, `kurz`, `definition`, `siehe[]`, `verifiziert`, `quelle`.
