# ADR 0003 · Lokaler Speicher mit Export/Import

**Status:** angenommen

**Kontext:** Kein Backend. iOS kann Website-Speicher räumen (insbesondere wenn die App lange nicht genutzt wird).

**Entscheidung:** Ein versionierter JSON-Zustand (`schema: 1`) in `localStorage` unter `ukp-basics:v1`. Beim Start wird `navigator.storage.persist()` angefragt. Export/Import als JSON-Datei (Umschlag `{app, schema, exportedAt, data}`), Import wahlweise ersetzend oder zusammenführend (je Frage gewinnt der jüngere Stand). Die Einstellungen warnen, wenn der letzte Export länger als 14 Tage zurückliegt. Die Tagesserie wird aus einem Aktivitätslog berechnet, nicht separat gespeichert.

**Alternativen:** IndexedDB: für die Datenmenge nicht nötig.

**Folgen:** Frage-IDs sind stabil und werden nie neu vergeben (`content/id-registry.json`, vom Validator geprüft), sonst gingen Lernstände beim Import verloren.
