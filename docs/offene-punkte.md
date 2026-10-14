# Offene Punkte

## Zu liefern oder zu entscheiden

| Thema | Stand |
|---|---|
| **alp-Logo** | Die Formensprache des Logos der AG alp (facettierter, abgerundeter Kristall in Cyan, Laserstrahl mit Lichtpunkt) diente als Anregung für das neue App-Icon (Version 0.2). Das Original wird nicht verwendet (Marken- und Nutzungsrechte der Hochschule); Kristall, Strahl, Pulse und Plume sind eine eigene Zeichnung (`tools/gen_icons.py`). Wenn die Hochschule eine offizielle Nutzung erlaubt, kann das Original ergänzt werden. |
| **GitHub Pages** | Repo ist öffentlich, Pages aus `main`. Persönliche Projektnotizen (Stelle, Betreuung, Vorwissen) liegen nur lokal und sind nicht im Repo. |
| **Grafiken** | Alle Grafiken entstehen als selbst erzeugte SVGs (`tools/gen_figures.py`) oder Canvas-Simulationen (`src/sims/`). Fotos oder Mikroskopaufnahmen (Ablationsstrukturen, Anlage) brauchen eine klare Lizenz bzw. deine eigenen Bilder. |
| **Kapitel K08, K10, K12** | Noch Gliederung. K08 (Werkstoffe) braucht belegte Materialkennwerte aus der Literatur, deshalb bewusst zurückgestellt. |

## Fachlich zu prüfen

- **Intensität „> 10^15 W/cm²"** im Fachkontext: Für typische Ablation transparenter Werkstoffe liefern Übersichtsarbeiten eher 10^13 bis 10^14 W/cm² (Recherche-Treffer zu Rate-Equation-Modellen, nicht an der Primärquelle geprüft). Im Rechenbeispiel von K01 ergeben sich ~10^13 W/cm². Bitte mit Literatur abgleichen.
- Alle Materialkennwerte (Bandlücken, Schwellfluenzen) sind in den Inhalten als „ungeprüft" markiert oder als frei gewählte Zahlenbeispiele gekennzeichnet.
- **Keldysh-Parameter** (K06): Die Formel für $\gamma$ ist in der in der Literatur üblichen Schreibweise (Keldysh 1965; Schaffer et al. 2001) übernommen, aber noch nicht an der Primärquelle geprüft. Insbesondere der Faktor (Feldamplitude vs. Effektivwert) und der Übergangswert $\gamma\approx1{,}5$ bitte prüfen.
- **Normen** (Labor → Normen): Nummern und Titel sind sinngemäß aufgeführt und tragen das Badge „Titel ungeprüft". Wortlaut und Ausgabestand im Normenverzeichnis der Hochschule prüfen.
- **Mechanismen und Zeitskalen** (K05, K07): Zeitfenster der Prozesse, die Zuordnung der Mechanismen und die Aussagen zum Burst-Mode sind aus Übersichtswissen formuliert und als „ungeprüft" markiert, bis sie mit der Literatur (Rethfeld 2004, Gamaly 2002, Kerse 2016) abgeglichen sind.
- Quellenangaben in `content/quellen.json` (Titel, Autoren, Zeitschrift) bitte beim Übernehmen in die eigene Arbeit gegen Zotero/DOI prüfen; DOIs sind bewusst nicht eingetragen, wo sie nicht geprüft wurden.
