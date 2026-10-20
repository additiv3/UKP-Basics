"""Validate content/*.json: structure, references, stable IDs and the 'quantity needs a source' rule.

  python tools/validate_content.py            # check (exit 1 on errors)
  python tools/validate_content.py --update   # also append new quiz/karte IDs to content/id-registry.json

Question/card IDs are stable and never reassigned (Projektregel): every ID that was ever registered must still exist.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
BLOCKS = ROOT / "src" / "blocks"
SIMS = ROOT / "src" / "sims"
GAMES = ROOT / "src" / "games"

QUIZ_ARTEN = {"multiple-choice", "zuordnung", "luecke", "sortieren", "zahl", "rechenweg"}
# fields of a block that an English overlay may translate (everything else stays in the German file)
TRANSLATABLE = {"inhalt", "titel", "erklaerung", "alt", "unterschrift", "aufgabe", "schritte", "ergebnis", "frage", "optionen", "paare", "text", "luecken", "items", "oben", "unten", "vorne", "hinten", "tipp", "gegeben", "sammlung", "vorlage", "richtig", "ablenker"}
# Unit-bearing numbers that must carry a source or verifiziert flag (heuristic).
QUANTITY_RE = re.compile(r"\d[\d.,]*\s*(?:fs|ps|ns|µs|ms|µm|nm|mm|eV|J/cm|W/cm|MW|GW|kW|TW|GHz|MHz|kHz|%)(?![A-Za-z])")
TEXT_FIELDS = ("inhalt", "vorne", "hinten", "erklaerung", "aufgabe", "ergebnis", "frage")

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(f"{path.relative_to(ROOT)}: invalid JSON ({e})")
        return None


def load_opt(path):
    return load(path) if path.exists() else None


def strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from strings(v)


def check_quiz(b, where):
    art = b.get("art")
    if art not in QUIZ_ARTEN:
        return err(f"{where}: unknown quiz art {art!r}")
    if "frage" not in b:
        err(f"{where}: missing 'frage'")
    if art == "multiple-choice":
        opts, ok = b.get("optionen", []), b.get("richtig")
        if len(opts) < 2:
            err(f"{where}: needs >= 2 options")
        idx = ok if isinstance(ok, list) else [ok]
        if not idx or not all(isinstance(i, int) and 0 <= i < len(opts) for i in idx):
            err(f"{where}: 'richtig' out of range")
    elif art == "zuordnung":
        paare = b.get("paare", [])
        if len(paare) < 2 or not all(isinstance(p, list) and len(p) == 2 for p in paare):
            err(f"{where}: 'paare' must be a list of >= 2 [left, right] pairs")
        elif len({p[1] for p in paare}) != len(paare):
            err(f"{where}: right-hand values must be unique")
    elif art == "luecke":
        gaps = b.get("luecken", [])
        if b.get("text", "").count("___") != len(gaps):
            err(f"{where}: number of '___' does not match 'luecken'")
        for g in gaps:
            if not (0 <= g.get("richtig", -1) < len(g.get("optionen", []))):
                err(f"{where}: gap 'richtig' out of range")
    elif art == "sortieren":
        if len(b.get("items", [])) < 2:
            err(f"{where}: needs >= 2 items")
    elif art == "zahl":
        if not isinstance(b.get("antwort"), (int, float)):
            err(f"{where}: 'antwort' must be a number")
    elif art == "rechenweg":
        vorlage, richtig = b.get("vorlage", ""), b.get("richtig", [])
        if vorlage.count("[]") != len(richtig) or not richtig:
            err(f"{where}: number of [] slots in 'vorlage' ({vorlage.count('[]')}) must equal len(richtig) ({len(richtig)})")
        for grp in b.get("tausch", []):
            if not all(isinstance(i, int) and 0 <= i < len(richtig) for i in grp):
                err(f"{where}: 'tausch' index out of range")
        if "antwort" in b and not isinstance(b["antwort"], (int, float)):
            err(f"{where}: 'antwort' must be a number")


def check_english(index, chapters_data, glossar):
    """English overlays (content/en): ids must exist and structure (option counts, pair counts) must match the German file."""
    en_dir = CONTENT / "en"
    if not en_dir.exists():
        return
    translatable_types = {"text", "merke", "formel", "bild", "beispiel", "rechner", "sim", "quiz", "karte"}
    total = missing = 0
    for cid, (k, ch) in chapters_data.items():
        ov = load_opt(en_dir / k["datei"])
        if ov is None:
            warnings.append(f"{cid}: no English overlay content/en/{k['datei']}")
            continue
        blocks = {b["id"]: b for l in ch["lektionen"] for b in l["blocks"]}
        for bid, fields in ov.get("blocks", {}).items():
            if bid not in blocks:
                err(f"en/{k['datei']}: unknown block id {bid}")
                continue
            de = blocks[bid]
            for f, v in fields.items():
                if f not in TRANSLATABLE:
                    err(f"en/{bid}: field {f!r} must not be translated (stays in the German file)")
                    continue
                if f in ("optionen", "items") and isinstance(v, list) and len(v) != len(de.get(f, [])):
                    err(f"en/{bid}: {f} has {len(v)} entries, German has {len(de.get(f, []))}")
                if f == "paare" and len(v) != len(de.get("paare", [])):
                    err(f"en/{bid}: paare count differs")
                if f == "luecken":
                    if len(v) != len(de["luecken"]) or any(len(a["optionen"]) != len(b["optionen"]) or a["richtig"] != b["richtig"] for a, b in zip(v, de["luecken"])):
                        err(f"en/{bid}: luecken structure (options, richtig) differs from the German file")
                if f == "text" and de.get("art") == "luecke" and v.count("___") != de["text"].count("___"):
                    err(f"en/{bid}: number of ___ differs")
                if f == "vorlage" and v.count("[]") != de["vorlage"].count("[]"):
                    err(f"en/{bid}: number of [] slots in vorlage differs")
                if f in ("richtig", "ablenker") and de.get("art") != "rechenweg":
                    err(f"en/{bid}: {f} may only be translated for rechenweg tiles (indices must stay German)")
                if f in ("richtig", "ablenker") and len(v) != len(de.get(f, [])):
                    err(f"en/{bid}: {f} has {len(v)} entries, German has {len(de.get(f, []))}")
        for l in ch["lektionen"]:
            if l["id"] not in ov.get("lektionen", {}):
                warnings.append(f"en/{k['datei']}: lesson title {l['id']} not translated")
            for b in l["blocks"]:
                if b["typ"] in translatable_types and b["typ"] not in ("rechner", "sim", "bild", "formel"):
                    total += 1
                    if b["id"] not in ov.get("blocks", {}):
                        missing += 1
                        warnings.append(f"en/{k['datei']}: block {b['id']} has no English translation")
        for key in ("titel", "einleitung", "ziele"):
            if key not in ov:
                warnings.append(f"en/{k['datei']}: chapter {key} not translated")
    en_idx = load_opt(en_dir / "index.json")
    if en_idx is None:
        warnings.append("content/en/index.json missing")
    else:
        for kid in en_idx.get("kapitel", {}):
            if kid not in {x["id"] for x in index["kapitel"]}:
                err(f"en/index.json: unknown chapter {kid}")
    en_g = load_opt(en_dir / "glossar.json")
    if en_g is None:
        warnings.append("content/en/glossar.json missing")
    else:
        for t in glossar["begriffe"]:
            if t["id"] not in en_g:
                warnings.append(f"glossary term {t['id']} has no English definition")
        for tid in en_g:
            if tid not in {t["id"] for t in glossar["begriffe"]}:
                err(f"en/glossar.json: unknown term {tid}")
    print(f"English coverage: {total - missing}/{total} translatable blocks")


def main():
    update = "--update" in sys.argv
    index = load(CONTENT / "index.json")
    glossar = load(CONTENT / "glossar.json")
    quellen = load(CONTENT / "quellen.json")
    if not (index and glossar and quellen):
        return finish()

    block_modules = {p.stem for p in BLOCKS.glob("*.js")} - {"registry", "scoring"}
    rechner_src = (BLOCKS / "rechner.js").read_text(encoding="utf-8")
    rechner_models = set(re.findall(r"^  (\w+): \{\n    titel:", rechner_src, re.M))

    stufen = {s["id"] for s in index["stufen"]}
    ids = [k["id"] for k in index["kapitel"]]
    if len(ids) != len(set(ids)):
        err("index.json: duplicate chapter ids")
    graph = {}
    for k in index["kapitel"]:
        graph[k["id"]] = k.get("voraussetzungen", [])
        if k["stufe"] not in stufen:
            err(f"{k['id']}: unknown stufe {k['stufe']}")
        for p in graph[k["id"]]:
            if p not in ids:
                err(f"{k['id']}: unknown prerequisite {p}")
        if "datei" in k:
            if not (CONTENT / k["datei"]).exists():
                err(f"{k['id']}: file {k['datei']} missing")
        elif not k.get("lektionen_geplant"):
            err(f"{k['id']}: planned chapter needs 'lektionen_geplant'")

    # prerequisite graph must be acyclic
    state = {}

    def visit(n, path):
        if state.get(n) == 1:
            err("prerequisite cycle: " + " -> ".join(path + [n]))
            return
        if state.get(n) == 2:
            return
        state[n] = 1
        for m in graph.get(n, []):
            visit(m, path + [n])
        state[n] = 2

    for n in graph:
        visit(n, [])

    term_ids = [t["id"] for t in glossar["begriffe"]]
    if len(term_ids) != len(set(term_ids)):
        err("glossar.json: duplicate term ids")
    source_ids = {q["id"] for q in quellen["quellen"]}
    for t in glossar["begriffe"]:
        for s in t.get("siehe", []):
            if s not in term_ids:
                err(f"glossar {t['id']}: unknown 'siehe' {s}")
        if t.get("verifiziert") is not True and t.get("verifiziert") is not False:
            err(f"glossar {t['id']}: needs 'verifiziert' true/false")

    seen_blocks, item_ids, texts = set(), [], list(strings(glossar))
    chapters_data = {}
    for k in index["kapitel"]:
        if "datei" not in k:
            continue
        ch = load(CONTENT / k["datei"])
        if not ch:
            continue
        chapters_data[k["id"]] = (k, ch)
        if ch.get("id") != k["id"]:
            err(f"{k['datei']}: id {ch.get('id')} != index id {k['id']}")
        for ref in ch.get("weiterlesen", []):
            if ref not in source_ids:
                err(f"{k['id']}: unknown source in weiterlesen: {ref}")
        lesson_ids = set()
        for lesson in ch["lektionen"]:
            if lesson["id"] in lesson_ids:
                err(f"{k['id']}: duplicate lesson id {lesson['id']}")
            lesson_ids.add(lesson["id"])
            for b in lesson["blocks"]:
                where = f"{lesson['id']}/{b.get('id')}"
                bid = b.get("id")
                if not bid:
                    err(f"{where}: block without id")
                elif bid in seen_blocks:
                    err(f"{where}: duplicate block id")
                seen_blocks.add(bid)
                typ = b.get("typ")
                if typ not in block_modules:
                    err(f"{where}: unknown block type {typ!r}")
                    continue
                if typ == "quiz":
                    check_quiz(b, where)
                    item_ids.append(bid)
                elif typ == "karte":
                    item_ids.append(bid)
                    if "vorne" not in b or "hinten" not in b:
                        err(f"{where}: karte needs 'vorne' and 'hinten'")
                elif typ == "bild":
                    if not (ROOT / b.get("src", "")).exists():
                        err(f"{where}: image {b.get('src')} missing")
                    if not b.get("alt"):
                        err(f"{where}: image needs 'alt'")
                elif typ == "rechner" and b.get("modell") not in rechner_models:
                    err(f"{where}: unknown calculator model {b.get('modell')!r}")
                elif typ == "sim" and not (SIMS / f"{b.get('modell')}.js").exists():
                    err(f"{where}: unknown simulation {b.get('modell')!r}")
                elif typ == "spiel" and not (GAMES / f"{b.get('spiel')}.js").exists():
                    err(f"{where}: unknown game {b.get('spiel')!r}")
                elif typ == "formel" and b.get("sammlung") and not b.get("titel"):
                    err(f"{where}: formula in the collection needs a 'titel'")
                elif typ == "quelle":
                    for ref in b.get("refs", []):
                        if ref not in source_ids:
                            err(f"{where}: unknown source {ref}")
                if "verifiziert" in b and not isinstance(b["verifiziert"], bool):
                    err(f"{where}: 'verifiziert' must be true/false")
                if b.get("quelle") in source_ids:
                    pass
                # Rule: quantities need a source or an explicit verifiziert flag.
                if typ in {"text", "merke", "karte"} and "verifiziert" not in b and "quelle" not in b:
                    if any(QUANTITY_RE.search(b.get(f, "") if isinstance(b.get(f, ""), str) else " ".join(b.get(f, []))) for f in TEXT_FIELDS):
                        err(f"{where}: quantity without 'quelle' or 'verifiziert'")
        texts.extend(strings(ch))

    check_english(index, chapters_data, glossar)

    # lab configuration: every listed simulation / game must exist, every sim needs a chapter
    labor = load(CONTENT / "labor.json") or {"sims": [], "spiele": []}
    for sim in labor["sims"]:
        if not (SIMS / f"{sim['id']}.js").exists():
            err(f"labor.json: simulation {sim['id']} missing in src/sims")
        if sim["kapitel"] not in ids:
            err(f"labor.json: unknown chapter {sim['kapitel']}")
    for g in labor["spiele"]:
        if not (GAMES / f"{g['id']}.js").exists():
            err(f"labor.json: game {g['id']} missing in src/games")
    listed = {s["id"] for s in labor["sims"]}
    for f in SIMS.glob("*.js"):
        if f.stem != "kit" and f.stem not in listed:
            warnings.append(f"simulation {f.stem} is not listed in labor.json")
    referenz = load(CONTENT / "referenz.json")
    if referenz:
        for n in referenz.get("normen", []):
            for key in ("nummer", "titel", "bereich", "wozu"):
                if not n.get(key):
                    err(f"referenz.json: standard missing '{key}': {n}")

    # glossary references
    for t in texts:
        for ref in re.findall(r"\[\[([a-z0-9-]+)", t):
            if ref not in term_ids:
                err(f"unknown glossary reference [[{ref}]]")

    # vocabulary cards are generated from the glossary (v.<term>.de / v.<term>.en)
    for t in glossar["begriffe"]:
        if t.get("englisch"):
            item_ids += [f"v.{t['id']}.de", f"v.{t['id']}.en"]

    # stable IDs
    reg_path = CONTENT / "id-registry.json"
    registry = json.loads(reg_path.read_text(encoding="utf-8"))["ids"] if reg_path.exists() else []
    for rid in registry:
        if rid not in item_ids:
            err(f"registered ID {rid} no longer exists (IDs are stable and must never be removed or renamed)")
    new = [i for i in item_ids if i not in registry]
    if new and update:
        reg_path.write_text(json.dumps({"ids": registry + new}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        print(f"registered {len(new)} new IDs")
    elif new:
        warnings.append(f"{len(new)} IDs not yet in id-registry.json (run with --update): {', '.join(new[:5])}{' ...' if len(new) > 5 else ''}")

    print(f"{len(seen_blocks)} blocks, {len(item_ids)} quiz/card items, {len(term_ids)} glossary terms")
    finish()


def finish():
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    print("content OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
