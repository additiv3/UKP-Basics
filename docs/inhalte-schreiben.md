# Inhalte schreiben

Inhalte sind reine JSON-Dateien in `content/`. Für neue Kapitel ist keine Codeänderung nötig. Nach jeder Änderung:

```bash
python tools/validate_content.py --update   # prüft und registriert neue Frage-IDs
python tools/release.py --bump patch         # neue Cache-Version, sonst sieht der Homescreen die alte App
```

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
| `quelle` | `refs[]` (Quellen-IDs aus `content/quellen.json`) |

Quizarten:

- `multiple-choice`: `optionen[]`, `richtig` (Index oder Array für Mehrfachauswahl), optional `fest: true` (Reihenfolge nicht mischen)
- `zuordnung`: `paare[[links, rechts], ...]` (rechte Werte eindeutig, nur Klartext, keine Formeln)
- `luecke`: `text` mit `___` je Lücke, `luecken[{optionen[], richtig}]`
- `sortieren`: `items[]` in richtiger Reihenfolge, optional `oben`, `unten` (Beschriftung der Enden)
- `zahl`: `antwort` (Zahl), `einheit`, `toleranz` (relativ, Standard 0,05; 0 = exakt). Eingaben wie `12,5`, `1.2e13`, `1,2 x 10^13` werden akzeptiert

## Faktenregel (wichtig)

Jede quantitative Aussage braucht `"quelle"` oder `"verifiziert": false`. Der Validator prüft das für `text`, `merke` und `karte`. `verifiziert: false` zeigt das Badge „ungeprüft". Für Rechnungen aus Definitionen reicht `"verifiziert": true` mit `"quelle": "Herleitung"`. Im Zweifel `false` setzen, nie Zahlen raten. Wenn Literatur eine Aussage bestätigt: Quelle in `content/quellen.json` eintragen, im Block `"quelle": "<id>"` setzen und `verifiziert` entfernen oder auf `true` stellen.

## Grafiken

SVGs entstehen per Skript (`tools/gen_figures.py`) und nutzen die CSS-Variablen `--fig-*`, damit sie Hell/Dunkel folgen. Fotos oder Fremdgrafiken nur mit klarer Lizenz und Quellenangabe.

## Labor, Simulationen und Spiele

Neue Simulation: Modul `src/sims/<id>.js` (siehe `kit.js` und eine vorhandene Simulation als Vorlage), Eintrag in `content/labor.json` (`id`, `kapitel`, `stufe`, `icon`), dann in einer Lektion als `{"typ": "sim", "modell": "<id>"}` einbinden. Parameter sind frei wählbar, es dürfen keine Materialdaten ohne Quelle hinein.
Normen, Konstanten und Faustformeln stehen in `content/referenz.json`.

## Glossar

`content/glossar.json`, je Begriff `id` (nur `a-z`, `0-9`, `-`), `begriff`, `englisch`, `kurz`, `definition`, `siehe[]`, `verifiziert`, `quelle`.
