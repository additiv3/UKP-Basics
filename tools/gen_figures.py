"""Generate the lesson figures as SVG (own graphics, no external sources).

Colors come from CSS custom properties (--fig-*) with fallbacks, so the inlined SVGs follow light/dark mode.
Run: python tools/gen_figures.py
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "figures"

STYLE = """<style>
.fg-line{stroke:var(--fig-line,#3a465f);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fg-soft{stroke:var(--fig-soft,#aab4cb);fill:none;stroke-width:1.5}
.fg-accent{stroke:var(--fig-accent,#0b7e9b);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.fg-warm{stroke:var(--fig-warm,#d9822b);fill:none;stroke-width:2.5;stroke-dasharray:6 5}
.fg-fill{fill:var(--fig-fill,#dcf1f7);stroke:none}
.fg-bar-a{fill:var(--fig-accent,#0b7e9b)}
.fg-bar-w{fill:var(--fig-warm,#d9822b)}
.fg-bar-s{fill:var(--fig-soft,#aab4cb)}
.fg-text{fill:var(--fig-line,#3a465f);font:13px -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.fg-muted{fill:var(--muted,#566078);font:12px -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.fg-bold{font-weight:700}
.fg-pill{fill:var(--fig-fill,#dcf1f7)}
.fg-pilltext{fill:var(--fig-accent,#0b7e9b);font:700 11px -apple-system,system-ui,sans-serif}
.fg-laser{stroke:var(--fig-laser,#ee4f1c);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.fg-laser-f{fill:var(--fig-laser,#ee4f1c)}
.fg-band{fill:var(--fig-accent,#0b7e9b);fill-opacity:.35;stroke:var(--fig-accent,#0b7e9b);stroke-width:2}
.fg-empty{fill:none;stroke:var(--fig-accent,#0b7e9b);stroke-width:2;stroke-dasharray:5 4}
</style>"""


def label(*parts):
    """label('P', ('avg',), ' = E', ('p',), ' · f') -> text with subscripts (dy shifts, robust in Safari)."""
    out = []
    lowered = False
    for part in parts:
        if isinstance(part, tuple):
            out.append(f'<tspan dy="3" font-size="9">{part[0]}</tspan>')
            lowered = True
        elif lowered:
            out.append(f'<tspan dy="-3">{part}</tspan>')
            lowered = False
        else:
            out.append(part)
    return "".join(out)


def svg(width, height, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{STYLE}{body}</svg>\n"
    )


def zeitleiter():
    rows = [
        ("1 fs", "10⁻¹⁵ s", "0,3 µm", "a"),
        ("1 ps", "10⁻¹² s", "0,3 mm", "a"),
        ("1 ns", "10⁻⁹ s", "30 cm", "w"),
        ("1 µs", "10⁻⁶ s", "300 m", "s"),
        ("1 ms", "10⁻³ s", "300 km", "s"),
    ]
    h = 46
    body = ['<text class="fg-muted" x="12" y="20">Zeitspanne</text>', '<text class="fg-muted" x="348" y="20" text-anchor="end">Lichtweg im Vakuum</text>']
    for i, (name, exp, path, kind) in enumerate(rows):
        y = 34 + i * h
        bar = 40 + 62 * i
        body.append(f'<text class="fg-text fg-bold" x="12" y="{y + 14}">{name}</text>')
        body.append(f'<text class="fg-muted" x="52" y="{y + 14}">{exp}</text>')
        body.append(f'<text class="fg-text" x="348" y="{y + 14}" text-anchor="end">≈ {path}</text>')
        body.append(f'<rect class="fg-bar-{kind}" x="12" y="{y + 22}" width="{bar}" height="10" rx="5"/>')
        if i < 2:
            body.append(f'<rect class="fg-pill" x="{12 + bar + 8}" y="{y + 20}" width="40" height="14" rx="7"/>')
            body.append(f'<text class="fg-pilltext" x="{12 + bar + 28}" y="{y + 31}" text-anchor="middle">UKP</text>')
    height = 34 + len(rows) * h + 4
    return svg(360, height, "".join(body), "Zeitleiter von Femtosekunden bis Millisekunden")


def pulszug():
    base = 170
    peak = 56
    sigma = 5.5
    xs = [70, 180, 290]
    parts = []
    parts.append(f'<line class="fg-soft" x1="20" y1="{base}" x2="345" y2="{base}"/>')
    parts.append(f'<path class="fg-soft" d="M338 {base - 4} L346 {base} L338 {base + 4}"/>')
    parts.append(f'<text class="fg-muted" x="345" y="{base + 18}" text-anchor="end">Zeit t</text>')
    parts.append('<text class="fg-muted" x="20" y="22">Leistung P</text>')
    for cx in xs:
        pts = []
        for k in range(-30, 31):
            x = cx + k * 1.0
            y = base - (base - peak) * math.exp(-((x - cx) ** 2) / (2 * sigma**2))
            pts.append(f"{x:.1f},{y:.1f}")
        parts.append(f'<polyline class="fg-accent" points="{" ".join(pts)}"/>')
    avg_y = base - 8
    parts.append(f'<line class="fg-warm" x1="20" y1="{avg_y}" x2="340" y2="{avg_y}"/>')
    parts.append(f'<text class="fg-text" x="22" y="{avg_y - 8}">{label("P", ("avg",), " = E", ("p",), " · f")}</text>')
    # peak annotation
    parts.append(f'<text class="fg-text fg-bold" x="{xs[0] + 14}" y="{peak + 6}">{label("P", ("peak",), " ≈ E", ("p",), " / τ")}</text>')
    # period arrow between pulses 1 and 2
    ay = 118
    parts.append(f'<line class="fg-soft" x1="{xs[0]}" y1="{ay}" x2="{xs[1]}" y2="{ay}"/>')
    parts.append(f'<path class="fg-soft" d="M{xs[0] + 7} {ay - 4} L{xs[0]} {ay} L{xs[0] + 7} {ay + 4} M{xs[1] - 7} {ay - 4} L{xs[1]} {ay} L{xs[1] - 7} {ay + 4}"/>')
    parts.append(f'<text class="fg-muted" x="{(xs[0] + xs[1]) / 2}" y="{ay - 6}" text-anchor="middle">Pulsabstand 1/f</text>')
    parts.append(f'<text class="fg-muted" x="{xs[2]}" y="{base + 18}" text-anchor="middle">Pulsdauer τ (sehr schmal)</text>')
    return svg(360, 196, "".join(parts), "Pulszug mit Spitzenleistung und mittlerer Leistung")


def gauss_profil():
    cx, base, top, w = 180, 190, 48, 62  # w = pixel radius at 1/e^2
    f0 = base - top
    thr = 0.4  # illustrative threshold as fraction of F0

    def y_of(x):
        return base - f0 * math.exp(-2 * ((x - cx) / w) ** 2)

    curve = " ".join(f"{x:.1f},{y_of(x):.1f}" for x in range(30, 331, 3))
    r_thr = w * math.sqrt(-math.log(thr) / 2)
    ty = base - f0 * thr
    fill_pts = [(cx - r_thr, ty)]
    x = cx - r_thr
    while x <= cx + r_thr:
        fill_pts.append((x, y_of(x)))
        x += 2
    fill_pts.append((cx + r_thr, ty))
    fill = " ".join(f"{px:.1f},{py:.1f}" for px, py in fill_pts)
    e2 = base - f0 * math.exp(-2)
    p = []
    p.append(f'<line class="fg-soft" x1="20" y1="{base}" x2="345" y2="{base}"/>')
    p.append(f'<line class="fg-soft" x1="{cx}" y1="{base + 4}" x2="{cx}" y2="30"/>')
    p.append(f'<text class="fg-muted" x="345" y="{base + 18}" text-anchor="end">Radius r</text>')
    p.append('<text class="fg-muted" x="26" y="22">Fluenz F(r)</text>')
    p.append(f'<polygon class="fg-fill" points="{fill}"/>')
    p.append(f'<line class="fg-warm" x1="30" y1="{ty:.1f}" x2="340" y2="{ty:.1f}"/>')
    p.append(f'<text class="fg-text" x="34" y="{ty - 6:.1f}">Schwelle (Beispiel)</text>')
    p.append(f'<polyline class="fg-accent" points="{curve}"/>')
    # F0 marker
    p.append(f'<text class="fg-text fg-bold" x="{cx + 8}" y="{top - 4}">F₀</text>')
    # w0 markers at 1/e^2 level
    for sx in (cx - w, cx + w):
        p.append(f'<line class="fg-soft" x1="{sx}" y1="{e2:.1f}" x2="{sx}" y2="{base}" stroke-dasharray="3 3"/>')
    p.append(f'<line class="fg-soft" x1="{cx - w - 12}" y1="{e2:.1f}" x2="{cx + w + 12}" y2="{e2:.1f}" stroke-dasharray="3 3"/>')
    p.append(f'<text class="fg-text fg-bold" x="{cx + w}" y="{base + 18}" text-anchor="middle">+w₀</text>')
    p.append(f'<text class="fg-text fg-bold" x="{cx - w}" y="{base + 18}" text-anchor="middle">−w₀</text>')
    p.append(f'<text class="fg-muted" x="{cx + w + 16}" y="{e2 - 6:.1f}">F₀/e²</text>')
    p.append(f'<text class="fg-pilltext" x="{cx}" y="{ty + 22:.1f}" text-anchor="middle">Abtrag</text>')
    return svg(360, 216, "".join(p), "Gaußsches Fluenzprofil mit Spitzenfluenz, Strahlradius und Beispielschwelle")


def baender():
    cols = [(70, "Metall"), (180, "Halbleiter"), (290, "Dielektrikum")]
    w = 84
    p = []
    p.append('<text class="fg-muted" x="12" y="18">Energie</text>')
    p.append('<path class="fg-soft" d="M16 200 L16 26 M11 33 L16 24 L21 33"/>')
    # metal: one partly filled band
    cx = cols[0][0]
    p.append(f'<rect class="fg-empty" x="{cx - w / 2}" y="40" width="{w}" height="80" rx="6"/>')
    p.append(f'<rect class="fg-band" x="{cx - w / 2}" y="120" width="{w}" height="80" rx="6"/>')
    p.append(f'<text class="fg-muted" x="{cx}" y="85" text-anchor="middle">frei</text>')
    p.append(f'<text class="fg-muted" x="{cx}" y="165" text-anchor="middle">besetzt</text>')
    p.append(f'<line class="fg-laser" x1="{cx - 22}" y1="170" x2="{cx - 22}" y2="132"/><path class="fg-laser" d="M{cx - 28} 140 L{cx - 22} 130 L{cx - 16} 140"/>')
    # semiconductor
    cx = cols[1][0]
    p.append(f'<rect class="fg-empty" x="{cx - w / 2}" y="40" width="{w}" height="48" rx="6"/>')
    p.append(f'<rect class="fg-band" x="{cx - w / 2}" y="140" width="{w}" height="60" rx="6"/>')
    p.append(f'<text class="fg-pilltext" x="{cx}" y="119" text-anchor="middle">E_g klein</text>')
    p.append(f'<line class="fg-laser" x1="{cx - 22}" y1="138" x2="{cx - 22}" y2="94"/><path class="fg-laser" d="M{cx - 28} 102 L{cx - 22} 92 L{cx - 16} 102"/>')
    # dielectric
    cx = cols[2][0]
    p.append(f'<rect class="fg-empty" x="{cx - w / 2}" y="40" width="{w}" height="36" rx="6"/>')
    p.append(f'<rect class="fg-band" x="{cx - w / 2}" y="158" width="{w}" height="42" rx="6"/>')
    p.append(f'<text class="fg-pilltext" x="{cx}" y="121" text-anchor="middle">E_g groß</text>')
    p.append(f'<line class="fg-laser" x1="{cx - 22}" y1="156" x2="{cx - 22}" y2="118"/><path class="fg-laser" d="M{cx - 28} 126 L{cx - 22} 116 L{cx - 16} 126"/>')
    p.append(f'<text class="fg-laser-f" x="{cx - 22}" y="108" text-anchor="middle" font-size="14" font-weight="700">×</text>')
    for cx, name in cols:
        p.append(f'<text class="fg-text fg-bold" x="{cx}" y="222" text-anchor="middle">{name}</text>')
    p.append('<text class="fg-muted" x="344" y="40" text-anchor="end">Leitungsband</text>')
    p.append('<text class="fg-muted" x="344" y="196" text-anchor="end">Valenzband</text>')
    return svg(360, 232, "".join(p), "Bänderschema für Metall, Halbleiter und Dielektrikum mit unterschiedlicher Bandlücke")


def zeitskalen_prozesse():
    # log time axis: 1 fs ... 1 ns (6 decades)
    x0, per = 30, 50.0
    ticks = [(0, "1 fs"), (1, "10 fs"), (2, "100 fs"), (3, "1 ps"), (4, "10 ps"), (5, "100 ps"), (6, "1 ns")]

    def X(e):
        return x0 + per * e

    rows = [
        ("Laserpuls und Absorption", 0.8, 2.6, "a"),
        ("Elektronen thermalisieren", 1.0, 2.6, "a"),
        ("Energie an das Gitter (Elektron-Phonon)", 2.6, 4.0, "w"),
        ("Wärmeleitung ins Material", 3.2, 6.0, "s"),
        ("Materialabtrag", 3.5, 6.0, "w"),
    ]
    p = []
    top = 24
    for i, (name, a, b, kind) in enumerate(rows):
        y = top + i * 38
        p.append(f'<text class="fg-text" x="{x0}" y="{y + 10}">{name}</text>')
        p.append(f'<rect class="fg-bar-{kind}" x="{X(a):.1f}" y="{y + 16}" width="{X(b) - X(a):.1f}" height="10" rx="5"/>')
    base = top + len(rows) * 38 + 4
    p.append(f'<line class="fg-soft" x1="{x0}" y1="{base}" x2="{X(6) + 10}" y2="{base}"/>')
    for e, lab in ticks:
        p.append(f'<line class="fg-soft" x1="{X(e):.1f}" y1="{base}" x2="{X(e):.1f}" y2="{base + 5}"/>')
        p.append(f'<text class="fg-muted" x="{X(e):.1f}" y="{base + 18}" text-anchor="middle" font-size="10">{lab}</text>')
    p.append(f'<text class="fg-muted" x="{X(6) + 10}" y="{base + 34}" text-anchor="end">Zeit nach dem Puls (logarithmisch)</text>')
    p.append('<text class="fg-pilltext" x="30" y="%d">Größenordnungen, material- und fluenzabhängig</text>' % (base + 34))
    return svg(360, base + 44, "".join(p), "Zeitachse von Femtosekunden bis Nanosekunden mit Balken für Absorption, Elektronenthermalisierung, Elektron-Gitter-Kopplung, Wärmeleitung und Materialabtrag")


def package_querschnitt():
    """Cross-section of a flip-chip BGA (schematic): chip, bumps, underfill, substrate, balls, board."""
    p = []
    L, R = 16, 216
    # underfill fillet, chip and bumps
    p.append('<polygon class="fg-fill" points="40,64 50,50 150,50 160,64" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
    p.append('<rect class="fg-band" x="50" y="20" width="100" height="30" rx="3"/>')
    for i in range(8):
        p.append(f'<circle class="fg-bar-s" cx="{57 + 12.3 * i:.1f}" cy="57" r="4.2"/>')

    def via(x, ya, yb, up=False):
        wa, wb = (2.5, 4.5) if up else (4.5, 2.5)  # wide end faces the laser (top side or bottom side)
        return f'<polygon class="fg-bar-w" points="{x - wa},{ya} {x + wa},{ya} {x + wb},{yb} {x - wb},{yb}" opacity=".9"/>'

    def pad(x0, x1, y):
        return f'<rect class="fg-bar-w" x="{x0:.1f}" y="{y - 1.5}" width="{x1 - x0:.1f}" height="3" opacity=".9"/>'

    cols = [36, 82, 128, 174]
    for y0, down in ((64, True), (130, False)):
        p.append(f'<rect class="fg-fill" x="{L}" y="{y0}" width="{R - L}" height="30" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
        for x in cols:
            xa, xb = (x, x + 14) if down else (x + 14, x)
            outer, inner = (y0, y0 + 30) if down else (y0 + 30, y0)
            mid = y0 + 15
            p.append(pad(xa - 7, xa + 7, outer))
            p.append(pad(min(xa, xb) - 6, max(xa, xb) + 6, mid))
            p.append(pad(xb - 7, xb + 7, inner))
            if down:
                p.append(via(xa, y0, y0 + 15))
                p.append(via(xb, y0 + 15, y0 + 30))
            else:
                p.append(via(xa, y0 + 15, y0 + 30, up=True))
                p.append(via(xb, y0, y0 + 15, up=True))
    p.append(f'<rect class="fg-bar-s" x="{L}" y="94" width="{R - L}" height="36" opacity=".45"/>')
    for x in cols:
        p.append(f'<rect class="fg-bar-w" x="{x + 11}" y="94" width="6" height="36" opacity=".9"/>')
    # solder balls and board
    for i in range(6):
        p.append(f'<circle class="fg-bar-s" cx="{36 + 32 * i}" cy="170" r="9"/>')
    p.append('<rect class="fg-bar-s" x="10" y="179" width="212" height="20" rx="2" opacity=".35"/>')
    p.append('<rect class="fg-soft" x="10" y="179" width="212" height="20" rx="2"/>')
    # labels with leader lines
    labels = [(35, 154, "Chip (Si)", True), (58, 166, "Bumps, Underfill", False), (79, 220, "Aufbaulagen", False),
              (112, 220, "Kern", False), (139, 220, "Aufbaulagen", False), (170, 210, "Lotkugeln (BGA)", False), (189, 226, "Leiterplatte", False)]
    for y, x0, txt, bold in labels:
        p.append(f'<line class="fg-soft" x1="{x0}" y1="{y}" x2="230" y2="{y}" stroke-width="1"/>')
        cls = "fg-text fg-bold" if bold else "fg-text"
        p.append(f'<text class="{cls}" x="234" y="{y + 4}">{txt}</text>')
    p.append('<text class="fg-muted" x="234" y="97" font-size="11">mit Microvias</text>')
    p.append('<text class="fg-muted" x="234" y="155" font-size="11">mit Microvias</text>')
    p.append('<text class="fg-muted" x="10" y="218">Raster von oben nach unten: Bumps, Microvias, Lotkugeln</text>')
    return svg(360, 226, "".join(p), "Schnitt durch ein Flip-Chip-BGA: Chip mit Bumps und Underfill auf einem Substrat aus Kern und Aufbaulagen mit Microvias, darunter Lotkugeln auf der Leiterplatte")


def microvia():
    """Cross-section of a laser-drilled microvia in a filled build-up dielectric down to a copper pad."""
    p = []
    L, R = 16, 236
    top, bot = 74, 144
    xt0, xt1, xb0, xb1 = 101, 151, 110, 142
    cx = (xt0 + xt1) / 2
    # laser cone converging onto the via
    p.append(f'<polygon class="fg-laser-f" points="{cx - 36},8 {cx + 36},8 {xt1 - 6},{top - 2} {xt0 + 6},{top - 2}" opacity=".18"/>')
    p.append(f'<line class="fg-laser" x1="{cx - 36}" y1="8" x2="{xt0 + 6}" y2="{top - 2}"/><line class="fg-laser" x1="{cx + 36}" y1="8" x2="{xt1 - 6}" y2="{top - 2}"/>')
    p.append('<text class="fg-text fg-bold" x="16" y="24">UKP-Pulse</text>')
    # dielectric with the hole
    p.append(f'<polygon class="fg-fill" points="{L},{top} {xt0},{top} {xb0},{bot} {L},{bot}" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
    p.append(f'<polygon class="fg-fill" points="{xt1},{top} {R},{top} {R},{bot} {xb1},{bot}" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
    # filler particles (deterministic pseudo-random positions, linear congruential generator)
    seed = 7
    for _ in range(70):
        seed = (seed * 1103515245 + 12345) % 2**31
        x = L + 4 + seed % (R - L - 8)
        seed = (seed * 1103515245 + 12345) % 2**31
        y = top + 5 + seed % (bot - top - 10)
        frac = (y - top) / (bot - top)
        if xt0 + (xb0 - xt0) * frac - 3 < x < xt1 + (xb1 - xt1) * frac + 3:
            continue
        p.append(f'<circle class="fg-bar-s" cx="{x}" cy="{y}" r="{1.4 + (seed % 3) * 0.6:.1f}"/>')
    # copper pad and layer below
    p.append(f'<rect class="fg-bar-w" x="{cx - 50}" y="{bot}" width="100" height="10" opacity=".9"/>')
    p.append(f'<rect class="fg-fill" x="{L}" y="{bot + 10}" width="{R - L}" height="22" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
    # dimensions
    yt = top - 10
    p.append(f'<line class="fg-line" x1="{xt0}" y1="{yt}" x2="{xt1}" y2="{yt}" stroke-width="1.2"/>')
    p.append(f'<line class="fg-line" x1="{xt0}" y1="{yt - 5}" x2="{xt0}" y2="{yt + 5}" stroke-width="1.2"/><line class="fg-line" x1="{xt1}" y1="{yt - 5}" x2="{xt1}" y2="{yt + 5}" stroke-width="1.2"/>')
    p.append(f'<text class="fg-text" x="{xt0 - 6}" y="{yt + 4}" text-anchor="end">{label("d", ("top",))}</text>')
    yb = bot - 8
    p.append(f'<line class="fg-accent" x1="{xb0 + 1}" y1="{yb}" x2="{xb1 - 1}" y2="{yb}" stroke-width="1.5"/>')
    p.append(f'<text class="fg-text" x="{cx}" y="{yb - 6}" text-anchor="middle">{label("d", ("bot",))}</text>')
    p.append(f'<line class="fg-line" x1="246" y1="{top}" x2="246" y2="{bot}" stroke-width="1.2"/>')
    p.append(f'<line class="fg-line" x1="241" y1="{top}" x2="251" y2="{top}" stroke-width="1.2"/><line class="fg-line" x1="241" y1="{bot}" x2="251" y2="{bot}" stroke-width="1.2"/>')
    p.append(f'<text class="fg-text fg-bold" x="254" y="{(top + bot) // 2 + 4}">h</text>')
    # labels
    p.append(f'<text class="fg-text" x="268" y="{top + 14}">Dielektrikum</text>')
    p.append(f'<text class="fg-muted" x="268" y="{top + 29}" font-size="11">Harz mit</text>')
    p.append(f'<text class="fg-muted" x="268" y="{top + 42}" font-size="11">Füllstoff</text>')
    p.append(f'<line class="fg-soft" x1="{cx + 52}" y1="{bot + 5}" x2="264" y2="{bot + 5}" stroke-width="1"/>')
    p.append(f'<text class="fg-text" x="268" y="{bot + 9}">Kupferpad</text>')
    p.append(f'<text class="fg-muted" x="22" y="{bot + 26}">Lage darunter</text>')
    p.append(f'<text class="fg-muted" x="16" y="{bot + 50}">Taper = d_bot / d_top · Wandwinkel aus (d_top − d_bot) / 2h</text>')
    return svg(360, bot + 58, "".join(p), "Schnitt durch eine Microvia: Laserstrahl von oben, konische Bohrung durch ein gefülltes Dielektrikum bis auf ein Kupferpad, mit oberem Durchmesser, unterem Durchmesser und Tiefe")

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in [("zeitleiter", zeitleiter), ("pulszug", pulszug), ("gauss-profil", gauss_profil), ("baender", baender), ("zeitskalen-prozesse", zeitskalen_prozesse), ("package-querschnitt", package_querschnitt), ("microvia", microvia)]:
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8", newline="\n")
        print("wrote", OUT / f"{name}.svg")
