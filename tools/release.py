"""Release helper: bump the app version and regenerate the service worker precache list.

  python tools/release.py --bump patch     # 0.1.0 -> 0.1.1, updates src/version.js and sw.js
  python tools/release.py                  # keep version, refresh the precache list
  python tools/release.py --check          # exit 1 if version.js / sw.js / precache list are out of sync (CI)

Without a new cache version the installed home-screen app keeps serving the old files.
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_JS = ROOT / "src" / "version.js"
SW_JS = ROOT / "sw.js"

PRECACHE_DIRS = ["src", "content", "assets", "vendor"]
PRECACHE_FILES = ["index.html", "manifest.webmanifest"]
SKIP_DIRS = {"referenz"}  # reference material that is not part of the app
SKIP_NAMES = {".DS_Store", "Thumbs.db"}

VERSION_RE = re.compile(r"APP_VERSION = '(\d+)\.(\d+)\.(\d+)'")
SW_VERSION_RE = re.compile(r"const VERSION = '[^']*';")
BLOCK_RE = re.compile(r"// BEGIN PRECACHE\n.*?// END PRECACHE", re.S)


def read_version():
    m = VERSION_RE.search(VERSION_JS.read_text(encoding="utf-8"))
    if not m:
        sys.exit("APP_VERSION not found in src/version.js")
    return tuple(int(x) for x in m.groups())


def precache_list():
    files = ["./"] + PRECACHE_FILES
    for d in PRECACHE_DIRS:
        for p in sorted((ROOT / d).rglob("*")):
            if p.is_file() and p.name not in SKIP_NAMES and not (set(p.relative_to(ROOT).parts) & SKIP_DIRS):
                files.append(p.relative_to(ROOT).as_posix())
    return files


def render_block(files):
    body = ",\n".join(f"  '{f}'" for f in files)
    return f"// BEGIN PRECACHE\nconst PRECACHE = [\n{body},\n];\n// END PRECACHE"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bump", choices=["major", "minor", "patch"])
    ap.add_argument("--set", dest="set_version", metavar="X.Y.Z")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    major, minor, patch = read_version()
    version = f"{major}.{minor}.{patch}"
    if args.set_version:
        version = args.set_version
    elif args.bump == "major":
        version = f"{major + 1}.0.0"
    elif args.bump == "minor":
        version = f"{major}.{minor + 1}.0"
    elif args.bump == "patch":
        version = f"{major}.{minor}.{patch + 1}"

    sw = SW_JS.read_text(encoding="utf-8")
    block = render_block(precache_list())

    if args.check:
        ok = True
        js_version = ".".join(map(str, read_version()))
        m = re.search(r"const VERSION = '([^']*)';", sw)
        if not m or m.group(1) != js_version:
            print(f"version mismatch: version.js={js_version}, sw.js={m.group(1) if m else None}")
            ok = False
        cur = BLOCK_RE.search(sw)
        if not cur or cur.group(0) != block:
            print("sw.js precache list is out of date: run python tools/release.py")
            ok = False
        sys.exit(0 if ok else 1)

    VERSION_JS.write_text(VERSION_RE.sub(f"APP_VERSION = '{version}'", VERSION_JS.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")
    sw = SW_VERSION_RE.sub(f"const VERSION = '{version}';", sw)
    sw = BLOCK_RE.sub(lambda _m: block, sw)
    SW_JS.write_text(sw, encoding="utf-8", newline="\n")
    print(f"version {version}, {len(precache_list())} files in precache list")


if __name__ == "__main__":
    main()
