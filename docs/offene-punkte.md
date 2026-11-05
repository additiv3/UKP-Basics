# Offene Punkte

## Zu liefern oder zu entscheiden

| Thema | Stand |
|---|---|
| **alp-Logo** | Die Formensprache des Logos der AG alp (facettierter, abgerundeter Kristall in Cyan, Laserstrahl mit Lichtpunkt) diente als Anregung für das neue App-Icon (Version 0.2). Das Original wird nicht verwendet (Marken- und Nutzungsrechte der Hochschule); Kristall, Strahl, Pulse und Plume sind eine eigene Zeichnung (`tools/gen_icons.py`). Wenn die Hochschule eine offizielle Nutzung erlaubt, kann das Original ergänzt werden. |
| **GitHub Pages** | Repo ist öffentlich, Pages aus `main`. Persönliche Projektnotizen (Stelle, Betreuung, Vorwissen) liegen nur lokal und sind nicht im Repo. |
| **Grafiken** | Alle Grafiken entstehen als selbst erzeugte SVGs (`tools/gen_figures.py`) oder Canvas-Simulationen (`src/sims/`). Fotos oder Mikroskopaufnahmen (Ablationsstrukturen, Anlage) brauchen eine klare Lizenz bzw. deine eigenen Bilder. |
| **Kapitel K08, K10, K12** | Seit Version 0.3 ausgearbeitet. K08 und K10 nennen Größenordnungen (Bandlücken, LIPSS, SLE-Selektivität, Wellenleiter) aus allgemeiner Literaturkenntnis; alle diese Aussagen tragen das Badge „ungeprüft“ und sollten aus der Literatur belegt werden. Gerechnet wird mit frei gewählten Zahlenbeispielen. |
| **Englische Texte** | Die Übersetzungen sind Fachübersetzungen (Fachbegriffe nach Glossar). Auffällige Formulierungen bitte direkt in `content/en/` korrigieren. |

## Fachlich zu prüfen

- **Stufe F (Halbleiter-Packaging, K15 bis K20):** Die Aussagen stammen aus Übersichtswissen und aus den **Kurzfassungen** der zitierten Arbeiten (Websuche November 2026). Zahlen wie 19,5 % Taper-Reduktion, 16,7 % bzw. 18,2 % kürzere Bohrzeit (Franz et al. 2023 und Folgearbeit), 5000 TGV/s, 10 bis 50 µm und Taper unter 5° (Ostholt et al. 2014) bitte am Volltext prüfen. Die Autorenliste des LAMP-2025-Beitrags P-12 und die genannten Partner (Schmoll Maschinen, Ruhr-Universität Bochum) sind nicht bestätigt. DOIs fehlen bei Lau 2022, Ostholt 2014 und Schönfelder 2007.
- **Rasterangaben** in K16 (Microbumps um 40 µm, Hybrid Bonding ≤ 10 µm) stammen aus der Fachpresse; mit HIR und Lau 2022 abgleichen.
- **Normen** in K17 und K20: SEMI G86 (Ausgabestand G86-0217 laut SEMI-Shop), JEDEC- und IPC-Prüfnormen nur sinngemäß genannt, Nummern bewusst weggelassen.
- **Intensität „> 10^15 W/cm²"** im Fachkontext: Für typische Ablation transparenter Werkstoffe liefern Übersichtsarbeiten eher 10^13 bis 10^14 W/cm² (Recherche-Treffer zu Rate-Equation-Modellen, nicht an der Primärquelle geprüft). Im Rechenbeispiel von K01 ergeben sich ~10^13 W/cm². Bitte mit Literatur abgleichen.
- Alle Materialkennwerte (Bandlücken, Schwellfluenzen) sind in den Inhalten als „ungeprüft" markiert oder als frei gewählte Zahlenbeispiele gekennzeichnet.
- **Keldysh-Parameter** (K06): Die Formel für $\gamma$ ist in der in der Literatur üblichen Schreibweise (Keldysh 1965; Schaffer et al. 2001) übernommen, aber noch nicht an der Primärquelle geprüft. Insbesondere der Faktor (Feldamplitude vs. Effektivwert) und der Übergangswert $\gamma\approx1{,}5$ bitte prüfen.
- **Normen** (Labor → Normen): Nummern und Titel sind sinngemäß aufgeführt und tragen das Badge „Titel ungeprüft". Wortlaut und Ausgabestand im Normenverzeichnis der Hochschule prüfen.
- **Mechanismen und Zeitskalen** (K05, K07): Zeitfenster der Prozesse, die Zuordnung der Mechanismen und die Aussagen zum Burst-Mode sind aus Übersichtswissen formuliert und als „ungeprüft" markiert, bis sie mit der Literatur (Rethfeld 2004, Gamaly 2002, Kerse 2016) abgeglichen sind.
- Quellenangaben in `content/quellen.json` (Titel, Autoren, Zeitschrift) bitte beim Übernehmen in die eigene Arbeit gegen Zotero/DOI prüfen; DOIs sind bewusst nicht eingetragen, wo sie nicht geprüft wurden.
