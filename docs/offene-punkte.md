# Offene Punkte

## Zu liefern oder zu entscheiden

| Thema | Stand |
|---|---|
| **alp-Logo** | Die Formensprache des Logos der AG alp (facettierter, abgerundeter Kristall in Cyan, Laserstrahl mit Lichtpunkt) diente als Anregung für das neue App-Icon (Version 0.2). Das Original wird nicht verwendet (Marken- und Nutzungsrechte der Hochschule); Kristall, Strahl, Pulse und Plume sind eine eigene Zeichnung (`tools/gen_icons.py`). Wenn die Hochschule eine offizielle Nutzung erlaubt, kann das Original ergänzt werden. |
| **GitHub Pages** | Repo ist öffentlich, Pages aus `main`. Persönliche Projektnotizen (Stelle, Betreuung, Vorwissen) liegen nur lokal und sind nicht im Repo. |
| **Grafiken** | Alle Grafiken entstehen als selbst erzeugte SVGs (`tools/gen_figures.py`) oder Canvas-Simulationen (`src/sims/`). Fotos oder Mikroskopaufnahmen (Ablationsstrukturen, Anlage) brauchen eine klare Lizenz bzw. deine eigenen Bilder. |
| **Kapitel K08, K10, K12** | Seit Version 0.3 ausgearbeitet. K08 und K10 nennen Größenordnungen (Bandlücken, LIPSS, SLE-Selektivität, Wellenleiter) aus allgemeiner Literaturkenntnis; alle diese Aussagen tragen das Badge „ungeprüft“ und sollten aus der Literatur belegt werden. Gerechnet wird mit frei gewählten Zahlenbeispielen. |
| **Englische Texte** | Die Übersetzungen sind Fachübersetzungen (Fachbegriffe nach Glossar). Auffällige Formulierungen bitte direkt in `content/en/` korrigieren. |

## Stand der Faktenprüfung (Version 0.8, November 2026)

**Was „geprüft“ in der App bedeutet.** Ein Block ohne Badge „ungeprüft“ ist entweder eine Herleitung aus Definitionen oder an der genannten Primärquelle bestätigt, und zwar an deren **Kurzfassung oder Volltext**. Im Volltext gelesen wurde bisher nur Bischoff et al. 2022 (COC). Alle anderen Literaturzahlen sind an den Kurzfassungen geprüft; die Versuchsbedingungen dahinter stehen nur im Volltext. Vor dem Zitieren in der eigenen Arbeit also immer den Volltext lesen.

**Geprüft und bestätigt**

- Bibliografische Angaben der Quellenliste (Autoren, Zeitschrift, Band, Seiten, Jahr) per Crossref; DOIs sind eingetragen, wo Crossref einen liefert. Korrigiert: Seitenbereich Stuart 1996, Autoren Kerse 2016 und Schönfelder 2007, DOI und Tagungsband Ostholt 2014, Autorenliste des LAMP-2025-Beitrags (Franz, Schuster, Schwarz, Rung, Esen, Hellmann laut Publikationsserver der TH Aschaffenburg).
- Franz et al. 2022 und 2023 (FR-4, ABF): 2 ps günstig, 19,5 % Taper-Reduktion, 16,7 % kürzere Bohrzeit. Die 18,2 % (Top-Hat plus Burst) stammen aus einer zweiten Arbeit mit UV-ps-Pulsen (Publikationsserver der TH Aschaffenburg, Dokument 2243); Zeitschrift und DOI dieser Arbeit sind noch nachzutragen.
- Ostholt et al. 2014: rund 5000 TGV/s, Glasdicken 50 bis 200 µm, Durchmesser 10 bis 50 µm, Taper unter 5°.
- Jee et al. 1988: Das Potenzgesetz der Inkubation wurde an Metall-Einkristallen mit 10-ns-Pulsen aufgestellt (S ≈ 0,92). In K07 ist das jetzt so eingeordnet; für Dielektrika gilt eher ein Verlauf mit Sättigung (Ashkenasi et al. 1999).
- Burst-Mode: Kerse et al. 2016 sowie die Arbeiten der AG alp an Quarzglas (Schwarz et al. 2021, Yang et al. 2023).
- LIPSS auf Quarzglas liegen parallel zur Polarisation (Höhm et al. 2012).
- Keldysh-Rechenbeispiel in K06 nachgerechnet (γ ≈ 1,8 bei 10¹³ W/cm²).
- ISO 21254-1 liegt seit 2025 in zweiter Ausgabe vor.

**Korrigiert**

- K14: Die Kurve des Abschwächers aus λ/2-Platte und Polarisator wiederholt sich alle 90° Plattendrehung, nicht alle 45° (45° liegen zwischen Maximum und Minimum).
- K01: Intensität „> 10¹⁵ W/cm²“ aus den Projektnotizen ist für die Materialbearbeitung zu hoch; realistisch sind rund 10¹³ W/cm², mehr als 10¹⁴ W/cm² nur mit Pulsen unter 10 fs (Lenzner et al. 1998).
- Glossar „Burst-Mode“: Die pauschale Aussage aus den Projektnotizen ist durch belegte Befunde ersetzt.

**Weiter offen (Badge „ungeprüft“)**

- **Bandlücken** (Quarzglas und Saphir etwa 9 eV, Si₃N₄, SiC, Si) und **Datenblattwerte** (Quarzglas, Borofloat 33) in K01, K08 und K23: gängige Literatur- bzw. Herstellerwerte, nicht an einer Primärquelle geprüft. Für die eigenen Proben das Datenblatt der tatsächlichen Sorte verwenden.
- **Keldysh-Parameter** (K06): Formel in der Schreibweise von Schaffer et al. 2001; Vorfaktor und Übergangswert γ ≈ 1,5 am Volltext prüfen.
- **Sättigungsmodell der Inkubation** und **kritische Leistung der Selbstfokussierung** (K23): Gleichungen aus allgemeiner Literaturkenntnis, Ashkenasi et al. 1999 bzw. Marburger 1975 zugeschrieben; am Volltext prüfen.
- **SLE-Selektivität** bis etwa 1400 (Hermans et al. 2014): Zahl aus einer Sekundärangabe.
- **Bischoff et al. 2022** nennt für 1030 nm sechs Photonen; aus der dort angegebenen Bandlücke von etwa 4 eV folgen rechnerisch vier (K23, Frage k23.q02). In der Gruppe klären.
- **Stand der Glaskern-Substrate 2026** (K18): aus der Fachpresse.
- **Mechanismen und Zeitskalen** (K05, K07): Zeitfenster der Prozesse und Zuordnung der Mechanismen aus Übersichtswissen, noch nicht mit Rethfeld 2004 und Gamaly 2002 abgeglichen.
- **Stufe Packaging (K15 bis K20):** Übersichtswissen; Rasterangaben in K16 aus der Fachpresse, Normen in K17 und K20 nur sinngemäß genannt.
- **Normen** (Labor → Normen): Titel sinngemäß, Ausgabestände im Normenverzeichnis der Hochschule prüfen.
- **Partner der AG alp** (K20): Die Autorenliste ist bestätigt, die Zuordnung zu Einrichtungen nicht.
- **K23 kennt das Labor nicht:** Welche Laser, Wellenlängen, Glassorten und COC-Typen verfügbar sind, ist in der ersten Woche zu klären und dann einzutragen.
