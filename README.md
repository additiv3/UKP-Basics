# UKP-Basics

**App öffnen:** https://additiv3.github.io/UKP-Basics/

**Auf dem iPhone installieren:** Link in **Safari** öffnen, auf das Teilen-Symbol tippen, „Zum Home-Bildschirm" wählen. Danach startet die App wie eine normale App und läuft offline. Neue Versionen erscheinen beim Öffnen als Hinweis „Aktualisieren" (oder unter Profil → „Nach Update suchen"). Den Fortschritt unter Profil → „Backup exportieren" regelmäßig sichern.

Persönliche Lern-App für den Einstieg in die **Ultrakurzpuls-(UKP-)Laserablation harter Werkstoffe** (Keramik, Quarzglas, Halbleiter). Statische PWA ohne Backend, offline-fähig, iPhone-first.

- Lernpfad mit aufeinander aufbauenden Kapiteln (K01 bis K07, K09, K11 ausgearbeitet), Lektionen, Quizfragen, Karteikarten und Rechnern
- **Labor-Tab:** 11 interaktive Simulationen (Gauß-Strahl, Zwei-Temperatur-Modell, Keldysh-Parameter, D²-Methode, CPA …), Formelsammlung, Konstanten, Normen und zwei Spiele
- Schlaue Wiederholung nach dem SM-2-Verfahren (Abstände wachsen, wenn du etwas sicher kannst)
- Fortschritt lokal im Browser, Export/Import als JSON
- Inhalte sind reine JSON-Dateien in `content/`; unverifizierte Aussagen tragen das Badge „ungeprüft"

Die App-Version steht unter Profil → Über die App.

Architekturentscheidungen: [docs/adr/](docs/adr/). Autorenleitfaden: [docs/inhalte-schreiben.md](docs/inhalte-schreiben.md). Lernpfad und Kapitelplan: [docs/lernpfad.md](docs/lernpfad.md). Roadmap: [docs/roadmap.md](docs/roadmap.md).

## Lokal starten

```bash
python -m http.server 8080
```

Dann `http://localhost:8080/` öffnen. Mit `?nosw` am URL-Ende läuft die App ohne Service Worker (Entwicklung).

## Tests und Prüfungen

```bash
node --test
python tools/validate_content.py
```

## Release

```bash
python tools/release.py --bump patch
```

Zählt die App-Version hoch, schreibt sie in `src/version.js` und `sw.js` und erzeugt die Precache-Liste. Ohne neue Cache-Version sieht der Homescreen-Install die alte App.

## Deployment

GitHub Pages aus dem Branch `main`, Unterpfad `/UKP-Basics/`. Alle Pfade sind relativ.
