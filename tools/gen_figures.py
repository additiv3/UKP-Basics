"""Generate the lesson figures as SVG (own graphics, no external sources).

Colors come from CSS custom properties (--fig-*) with fallbacks, so the inlined SVGs follow light/dark mode.
Every figure is written twice: <name>.svg (German) and <name>.en.svg (English). The English chapter overlays
point their "bild" blocks at the .en.svg file.
Run: python tools/gen_figures.py
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "figures"

LANG = "de"


def L(de, en):
    """Text in the language currently being generated."""
    return en if LANG == "en" else de


STYLE = """<style>
.fg-line{stroke:var(--fig-line,#3a465f);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fg-soft{stroke:var(--fig-soft,#aab4cb);fill:none;stroke-width:1.5}
.fg-accent{stroke:var(--fig-accent,#0b7e9b);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.fg-warm{stroke:var(--fig-warm,#d9822b);fill:none;stroke-width:2.5;stroke-dasharray:6 5}
.fg-warm-s{stroke:var(--fig-warm,#d9822b);fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.fg-fill{fill:var(--fig-fill,#dcf1f7);stroke:none}
.fg-bar-a{fill:var(--fig-accent,#0b7e9b)}
.fg-bar-w{fill:var(--fig-warm,#d9822b)}
.fg-bar-s{fill:var(--fig-soft,#aab4cb)}
.fg-text{fill:var(--fig-line,#3a465f);font:13px -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.fg-muted{fill:var(--muted,#566078);font:12px -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.fg-small{fill:var(--muted,#566078);font:11px -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.fg-bold{font-weight:700}
.fg-pill{fill:var(--fig-fill,#dcf1f7)}
.fg-pilltext{fill:var(--fig-accent,#0b7e9b);font:700 11px -apple-system,system-ui,sans-serif}
.fg-laser{stroke:var(--fig-laser,#ee4f1c);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.fg-laser-f{fill:var(--fig-laser,#ee4f1c)}
.fg-laser-t{fill:var(--fig-laser,#ee4f1c);font:700 12px -apple-system,system-ui,sans-serif}
.fg-band{fill:var(--fig-accent,#0b7e9b);fill-opacity:.35;stroke:var(--fig-accent,#0b7e9b);stroke-width:2}
.fg-empty{fill:none;stroke:var(--fig-accent,#0b7e9b);stroke-width:2;stroke-dasharray:5 4}
.fg-box{fill:var(--fig-fill,#dcf1f7);stroke:var(--fig-accent,#0b7e9b);stroke-width:1.5}
.fg-solid{fill:var(--fig-grid,#dbe3f0);stroke:var(--fig-line,#3a465f);stroke-width:1.5}
.fg-heat{fill:var(--fig-warm,#d9822b);fill-opacity:.28;stroke:none}
.fg-dot-a{fill:var(--fig-accent,#0b7e9b)}
.fg-dot-w{fill:var(--fig-warm,#d9822b)}
.fg-ring{fill:none;stroke:var(--fig-accent,#0b7e9b);stroke-width:1.5}
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


def arrow(x1, y1, x2, y2, cls="fg-line", head=7):
    """Line with an open arrow head at (x2, y2)."""
    a = math.atan2(y2 - y1, x2 - x1)
    l1 = (x2 - head * math.cos(a - 0.45), y2 - head * math.sin(a - 0.45))
    l2 = (x2 - head * math.cos(a + 0.45), y2 - head * math.sin(a + 0.45))
    return (
        f'<line class="{cls}" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>'
        f'<path class="{cls}" d="M{l1[0]:.1f} {l1[1]:.1f} L{x2:.1f} {y2:.1f} L{l2[0]:.1f} {l2[1]:.1f}"/>'
    )


def dim(x1, x2, y, text, cls="fg-soft", tcls="fg-muted"):
    """Horizontal dimension line with arrows at both ends and a centered label above."""
    return arrow(x2, y, x1, y, cls, 6) + arrow(x1, y, x2, y, cls, 6) + f'<text class="{tcls}" x="{(x1 + x2) / 2:.1f}" y="{y - 6}" text-anchor="middle">{text}</text>'


def axes(x0, y0, x1, y1, xlab, ylab):
    """L-shaped axes with arrow heads; origin (x0, y0), ends at x1 (right) and y1 (top)."""
    return (
        arrow(x0, y0, x1, y0, "fg-soft", 6)
        + arrow(x0, y0, x0, y1, "fg-soft", 6)
        + f'<text class="fg-muted" x="{x1}" y="{y0 + 18}" text-anchor="end">{xlab}</text>'
        + f'<text class="fg-muted" x="{x0 + 6}" y="{y1 + 4}">{ylab}</text>'
    )


def gauss_pulse(cx, base, height, sigma, cls="fg-accent", span=4.0):
    pts = []
    n = 40
    for k in range(-n, n + 1):
        x = cx + k * span * sigma / n
        y = base - height * math.exp(-((x - cx) ** 2) / (2 * sigma**2))
        pts.append(f"{x:.1f},{y:.1f}")
    return f'<polyline class="{cls}" points="{" ".join(pts)}"/>'


# ---------------------------------------------------------------- existing figures


def zeitleiter():
    dec = L(",", ".")
    rows = [
        ("1 fs", "10⁻¹⁵ s", f"0{dec}3 µm", "a"),
        ("1 ps", "10⁻¹² s", f"0{dec}3 mm", "a"),
        ("1 ns", "10⁻⁹ s", "30 cm", "w"),
        ("1 µs", "10⁻⁶ s", "300 m", "s"),
        ("1 ms", "10⁻³ s", "300 km", "s"),
    ]
    h = 46
    body = [f'<text class="fg-muted" x="12" y="20">{L("Zeitspanne", "Time span")}</text>', f'<text class="fg-muted" x="348" y="20" text-anchor="end">{L("Lichtweg im Vakuum", "Light path in vacuum")}</text>']
    for i, (name, exp, path, kind) in enumerate(rows):
        y = 34 + i * h
        bar = 40 + 62 * i
        body.append(f'<text class="fg-text fg-bold" x="12" y="{y + 14}">{name}</text>')
        body.append(f'<text class="fg-muted" x="52" y="{y + 14}">{exp}</text>')
        body.append(f'<text class="fg-text" x="348" y="{y + 14}" text-anchor="end">≈ {path}</text>')
        body.append(f'<rect class="fg-bar-{kind}" x="12" y="{y + 22}" width="{bar}" height="10" rx="5"/>')
        if i < 2:
            body.append(f'<rect class="fg-pill" x="{12 + bar + 8}" y="{y + 20}" width="40" height="14" rx="7"/>')
            body.append(f'<text class="fg-pilltext" x="{12 + bar + 28}" y="{y + 31}" text-anchor="middle">{L("UKP", "USP")}</text>')
    height = 34 + len(rows) * h + 4
    return svg(360, height, "".join(body), L("Zeitleiter von Femtosekunden bis Millisekunden", "Time ladder from femtoseconds to milliseconds"))


def pulszug():
    base = 170
    peak = 56
    sigma = 5.5
    xs = [70, 180, 290]
    parts = []
    parts.append(f'<line class="fg-soft" x1="20" y1="{base}" x2="345" y2="{base}"/>')
    parts.append(f'<path class="fg-soft" d="M338 {base - 4} L346 {base} L338 {base + 4}"/>')
    parts.append(f'<text class="fg-muted" x="345" y="{base + 18}" text-anchor="end">{L("Zeit t", "Time t")}</text>')
    parts.append(f'<text class="fg-muted" x="20" y="22">{L("Leistung P", "Power P")}</text>')
    for cx in xs:
        parts.append(gauss_pulse(cx, base, base - peak, sigma, span=30 / sigma))
    avg_y = base - 8
    parts.append(f'<line class="fg-warm" x1="20" y1="{avg_y}" x2="340" y2="{avg_y}"/>')
    parts.append(f'<text class="fg-text" x="22" y="{avg_y - 8}">{label("P", ("avg",), " = E", ("p",), " · f")}</text>')
    parts.append(f'<text class="fg-text fg-bold" x="{xs[0] + 14}" y="{peak + 6}">{label("P", ("peak",), " ≈ E", ("p",), " / τ")}</text>')
    ay = 118
    parts.append(f'<line class="fg-soft" x1="{xs[0]}" y1="{ay}" x2="{xs[1]}" y2="{ay}"/>')
    parts.append(f'<path class="fg-soft" d="M{xs[0] + 7} {ay - 4} L{xs[0]} {ay} L{xs[0] + 7} {ay + 4} M{xs[1] - 7} {ay - 4} L{xs[1]} {ay} L{xs[1] - 7} {ay + 4}"/>')
    parts.append(f'<text class="fg-muted" x="{(xs[0] + xs[1]) / 2}" y="{ay - 6}" text-anchor="middle">{L("Pulsabstand 1/f", "Pulse period 1/f")}</text>')
    parts.append(f'<text class="fg-muted" x="{xs[2]}" y="{base + 18}" text-anchor="middle">{L("Pulsdauer τ (sehr schmal)", "Pulse duration τ (very narrow)")}</text>')
    return svg(360, 196, "".join(parts), L("Pulszug mit Spitzenleistung und mittlerer Leistung", "Pulse train with peak power and average power"))


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
    p.append(f'<text class="fg-muted" x="26" y="22">{L("Fluenz F(r)", "Fluence F(r)")}</text>')
    p.append(f'<polygon class="fg-fill" points="{fill}"/>')
    p.append(f'<line class="fg-warm" x1="30" y1="{ty:.1f}" x2="340" y2="{ty:.1f}"/>')
    p.append(f'<text class="fg-text" x="34" y="{ty - 6:.1f}">{L("Schwelle (Beispiel)", "Threshold (example)")}</text>')
    p.append(f'<polyline class="fg-accent" points="{curve}"/>')
    p.append(f'<text class="fg-text fg-bold" x="{cx + 8}" y="{top - 4}">F₀</text>')
    for sx in (cx - w, cx + w):
        p.append(f'<line class="fg-soft" x1="{sx}" y1="{e2:.1f}" x2="{sx}" y2="{base}" stroke-dasharray="3 3"/>')
    p.append(f'<line class="fg-soft" x1="{cx - w - 12}" y1="{e2:.1f}" x2="{cx + w + 12}" y2="{e2:.1f}" stroke-dasharray="3 3"/>')
    p.append(f'<text class="fg-text fg-bold" x="{cx + w}" y="{base + 18}" text-anchor="middle">+w₀</text>')
    p.append(f'<text class="fg-text fg-bold" x="{cx - w}" y="{base + 18}" text-anchor="middle">−w₀</text>')
    p.append(f'<text class="fg-muted" x="{cx + w + 16}" y="{e2 - 6:.1f}">F₀/e²</text>')
    p.append(f'<text class="fg-pilltext" x="{cx}" y="{ty + 22:.1f}" text-anchor="middle">{L("Abtrag", "Ablation")}</text>')
    return svg(360, 216, "".join(p), L("Gaußsches Fluenzprofil mit Spitzenfluenz, Strahlradius und Beispielschwelle", "Gaussian fluence profile with peak fluence, beam radius and example threshold"))


def baender():
    cols = [(70, L("Metall", "Metal")), (180, L("Halbleiter", "Semiconductor")), (290, L("Dielektrikum", "Dielectric"))]
    w = 84
    p = []
    p.append(f'<text class="fg-muted" x="12" y="18">{L("Energie", "Energy")}</text>')
    p.append('<path class="fg-soft" d="M16 200 L16 26 M11 33 L16 24 L21 33"/>')
    cx = cols[0][0]
    p.append(f'<rect class="fg-empty" x="{cx - w / 2}" y="40" width="{w}" height="80" rx="6"/>')
    p.append(f'<rect class="fg-band" x="{cx - w / 2}" y="120" width="{w}" height="80" rx="6"/>')
    p.append(f'<text class="fg-muted" x="{cx}" y="85" text-anchor="middle">{L("frei", "empty")}</text>')
    p.append(f'<text class="fg-muted" x="{cx}" y="165" text-anchor="middle">{L("besetzt", "filled")}</text>')
    p.append(f'<line class="fg-laser" x1="{cx - 22}" y1="170" x2="{cx - 22}" y2="132"/><path class="fg-laser" d="M{cx - 28} 140 L{cx - 22} 130 L{cx - 16} 140"/>')
    cx = cols[1][0]
    p.append(f'<rect class="fg-empty" x="{cx - w / 2}" y="40" width="{w}" height="48" rx="6"/>')
    p.append(f'<rect class="fg-band" x="{cx - w / 2}" y="140" width="{w}" height="60" rx="6"/>')
    p.append(f'<text class="fg-pilltext" x="{cx}" y="119" text-anchor="middle">{L("E_g klein", "small E_g")}</text>')
    p.append(f'<line class="fg-laser" x1="{cx - 22}" y1="138" x2="{cx - 22}" y2="94"/><path class="fg-laser" d="M{cx - 28} 102 L{cx - 22} 92 L{cx - 16} 102"/>')
    cx = cols[2][0]
    p.append(f'<rect class="fg-empty" x="{cx - w / 2}" y="40" width="{w}" height="36" rx="6"/>')
    p.append(f'<rect class="fg-band" x="{cx - w / 2}" y="158" width="{w}" height="42" rx="6"/>')
    p.append(f'<text class="fg-pilltext" x="{cx}" y="121" text-anchor="middle">{L("E_g groß", "large E_g")}</text>')
    p.append(f'<line class="fg-laser" x1="{cx - 22}" y1="156" x2="{cx - 22}" y2="118"/><path class="fg-laser" d="M{cx - 28} 126 L{cx - 22} 116 L{cx - 16} 126"/>')
    p.append(f'<text class="fg-laser-f" x="{cx - 22}" y="108" text-anchor="middle" font-size="14" font-weight="700">×</text>')
    for cx, name in cols:
        p.append(f'<text class="fg-text fg-bold" x="{cx}" y="222" text-anchor="middle">{name}</text>')
    p.append(f'<text class="fg-muted" x="344" y="40" text-anchor="end">{L("Leitungsband", "Conduction band")}</text>')
    p.append(f'<text class="fg-muted" x="344" y="196" text-anchor="end">{L("Valenzband", "Valence band")}</text>')
    return svg(360, 232, "".join(p), L("Bänderschema für Metall, Halbleiter und Dielektrikum mit unterschiedlicher Bandlücke", "Band diagram for metal, semiconductor and dielectric with different band gaps"))


def zeitskalen_prozesse():
    x0, per = 30, 50.0
    ticks = [(0, "1 fs"), (1, "10 fs"), (2, "100 fs"), (3, "1 ps"), (4, "10 ps"), (5, "100 ps"), (6, "1 ns")]

    def X(e):
        return x0 + per * e

    rows = [
        (L("Laserpuls und Absorption", "Laser pulse and absorption"), 0.8, 2.6, "a"),
        (L("Elektronen thermalisieren", "Electrons thermalize"), 1.0, 2.6, "a"),
        (L("Energie an das Gitter (Elektron-Phonon)", "Energy to the lattice (electron–phonon)"), 2.6, 4.0, "w"),
        (L("Wärmeleitung ins Material", "Heat conduction into the material"), 3.2, 6.0, "s"),
        (L("Materialabtrag", "Material removal"), 3.5, 6.0, "w"),
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
    p.append(f'<text class="fg-muted" x="{X(6) + 10}" y="{base + 34}" text-anchor="end">{L("Zeit nach dem Puls (logarithmisch)", "Time after the pulse (logarithmic)")}</text>')
    p.append('<text class="fg-pilltext" x="30" y="%d">%s</text>' % (base + 52, L("Größenordnungen, material- und fluenzabhängig", "Orders of magnitude; depend on material and fluence")))
    return svg(360, base + 60, "".join(p), L("Zeitachse von Femtosekunden bis Nanosekunden mit Balken für Absorption, Elektronenthermalisierung, Elektron-Gitter-Kopplung, Wärmeleitung und Materialabtrag", "Time axis from femtoseconds to nanoseconds with bars for absorption, electron thermalization, electron–lattice coupling, heat conduction and material removal"))


# ---------------------------------------------------------------- new figures (0.5.0)


def kaustik():
    """Beam caustic w(z) around the waist with Rayleigh length, sqrt2*w0 and divergence."""
    cx, cy = 180, 112
    w0, zr = 22, 70  # pixel
    p = [f'<line class="fg-soft" x1="16" y1="{cy}" x2="344" y2="{cy}" stroke-dasharray="2 4"/>']
    p.append(f'<text class="fg-muted" x="344" y="{cy - 6}" text-anchor="end">z</text>')

    def w(z):
        return w0 * math.sqrt(1 + (z / zr) ** 2)

    zs = range(-160, 161, 4)
    up = " ".join(f"{cx + z:.1f},{cy - w(z):.1f}" for z in zs)
    lo = " ".join(f"{cx + z:.1f},{cy + w(z):.1f}" for z in zs)
    area = " ".join([f"{cx + z:.1f},{cy - w(z):.1f}" for z in zs] + [f"{cx + z:.1f},{cy + w(z):.1f}" for z in reversed(zs)])
    p.append(f'<polygon class="fg-fill" points="{area}"/>')
    # asymptotes (far field): w ~ w0 * z / zr
    for s in (1, -1):
        p.append(f'<line class="fg-warm" x1="{cx - 160}" y1="{cy + s * w0 * 160 / zr:.1f}" x2="{cx + 160}" y2="{cy - s * w0 * 160 / zr:.1f}"/>')
    p.append(f'<polyline class="fg-accent" points="{up}"/><polyline class="fg-accent" points="{lo}"/>')
    # waist
    p.append(arrow(cx, cy, cx, cy - w0, "fg-line", 5))
    p.append(f'<text class="fg-text fg-bold" x="{cx + 5}" y="{cy - w0 / 2 + 4}">w₀</text>')
    # zR markers
    for s in (-1, 1):
        x = cx + s * zr
        p.append(f'<line class="fg-soft" x1="{x}" y1="{cy - w(zr) - 4:.1f}" x2="{x}" y2="{cy + 70}" stroke-dasharray="3 3"/>')
    p.append(arrow(cx + zr, cy, cx + zr, cy - w(zr), "fg-line", 5))
    p.append(f'<text class="fg-text" x="{cx + zr + 5}" y="{cy - w(zr) / 2 + 4:.1f}">√2 w₀</text>')
    p.append(dim(cx, cx + zr, cy + 62, "z_R"))
    p.append(dim(cx - zr, cx + zr, cy + 84, L("Schärfentiefe ≈ 2 z_R", "Depth of focus ≈ 2 z_R")))
    # divergence angle at the right end
    p.append(f'<text class="fg-text fg-bold" x="{cx + 150}" y="{cy - 6}" text-anchor="end">θ</text>')
    p.append(f'<text class="fg-small" x="16" y="20">{L("Strahlradius w(z)", "Beam radius w(z)")}</text>')
    p.append(f'<text class="fg-small" x="16" y="{cy + 108}">{L("gestrichelt: Fernfeld-Asymptoten mit Divergenz θ", "dashed: far-field asymptotes with divergence θ")}</text>')
    return svg(360, cy + 116, "".join(p), L("Strahlkaustik eines Gauß-Strahls mit Taille w0, Rayleighlänge zR und Divergenz", "Caustic of a Gaussian beam with waist w0, Rayleigh length zR and divergence"))


def lambert_beer():
    """Intensity over depth: reflection at the surface, exponential decay, penetration depth delta."""
    x0, base, top = 70, 196, 40
    p = []
    # surface + material
    p.append(f'<rect class="fg-solid" x="{x0}" y="{top - 10}" width="{340 - x0}" height="{base - top + 10}" opacity=".45"/>')
    p.append(f'<text class="fg-small" x="{x0 + 6}" y="{top + 4}">{L("Material", "Material")}</text>')
    p.append(axes(x0, base, 346, 22, L("Tiefe z", "Depth z"), ""))
    p.append(f'<text class="fg-muted" x="8" y="20">{L("Intensität", "Intensity")}</text>')
    # incoming and reflected levels (in air, left of the surface)
    i0 = top + 14
    it = top + 50  # (1-R) I0
    p.append(f'<line class="fg-laser" x1="18" y1="{i0}" x2="{x0}" y2="{i0}"/>')
    p.append(f'<text class="fg-laser-t" x="18" y="{i0 - 6}">I₀</text>')
    p.append(arrow(x0 - 4, i0 + 6, 30, i0 + 30, "fg-warm-s", 6))
    p.append(f'<text class="fg-small" x="20" y="{i0 + 46}">R·I₀</text>')
    span = base - it
    delta = 62
    pts = " ".join(f"{x0 + d:.1f},{base - span * math.exp(-d / delta):.1f}" for d in range(0, 271, 3))
    p.append(f'<polyline class="fg-accent" points="{pts}"/>')
    p.append(f'<text class="fg-text fg-bold" x="{x0 + 8}" y="{it - 6}">(1−R)·I₀</text>')
    ye = base - span / math.e
    p.append(f'<line class="fg-soft" x1="{x0}" y1="{ye:.1f}" x2="{x0 + delta}" y2="{ye:.1f}" stroke-dasharray="3 3"/>')
    p.append(f'<line class="fg-soft" x1="{x0 + delta}" y1="{ye:.1f}" x2="{x0 + delta}" y2="{base}" stroke-dasharray="3 3"/>')
    p.append(f'<text class="fg-muted" x="{x0 + delta + 6}" y="{ye - 4:.1f}">{L("auf 1/e gefallen", "dropped to 1/e")}</text>')
    p.append(f'<rect class="fg-heat" x="{x0}" y="{top - 10}" width="{delta}" height="{base - top + 10}"/>')
    p.append(f'<text class="fg-text fg-bold" x="{x0 + delta}" y="{base + 18}" text-anchor="middle">δ = 1/α</text>')
    p.append(f'<text class="fg-text" x="{x0}" y="{base + 18}" text-anchor="middle">0</text>')
    p.append(f'<text class="fg-small" x="8" y="{base + 40}">{L("orange: Schicht, in der rund 63 % der eindringenden", "orange: layer in which about 63 % of the transmitted")}</text>')
    p.append(f'<text class="fg-small" x="8" y="{base + 54}">{L("Energie absorbiert werden", "energy is absorbed")}</text>')
    return svg(360, base + 62,"".join(p), L("Lambert-Beer: Reflexion an der Oberfläche und exponentieller Abfall der Intensität mit der Eindringtiefe", "Beer–Lambert: reflection at the surface and exponential decay of intensity with penetration depth"))


def cpa_schema():
    """CPA chain: oscillator -> stretcher -> amplifier -> compressor, with pulse sketches."""
    names = [
        (L("Oszillator", "Oscillator"), (L("kurz,", "short,"), L("schwach", "weak"))),
        (L("Strecker", "Stretcher"), (L("lang,", "long,"), L("schwach", "weak"))),
        (L("Verstärker", "Amplifier"), (L("lang,", "long,"), L("energiereich", "energetic"))),
        (L("Kompressor", "Compressor"), (L("kurz, sehr", "short, very"), L("hohe Spitze", "high peak"))),
    ]
    # pulse sketch parameters: (height, sigma)
    shapes = [(14, 3), (7, 16), (40, 16), (88, 3)]
    p = []
    bw, gap, y = 76, 10, 26
    for i, ((name, desc), (hh, sg)) in enumerate(zip(names, shapes)):
        x = 8 + i * (bw + gap)
        p.append(f'<rect class="fg-box" x="{x}" y="{y}" width="{bw}" height="34" rx="9"/>')
        p.append(f'<text class="fg-text fg-bold" x="{x + bw / 2}" y="{y + 21}" text-anchor="middle" style="font-size:11px">{name}</text>')
        if i < 3:
            p.append(arrow(x + bw + 1, y + 17, x + bw + gap - 1, y + 17, "fg-laser", 4))
        base = 196
        p.append(f'<line class="fg-soft" x1="{x + 4}" y1="{base}" x2="{x + bw - 4}" y2="{base}"/>')
        p.append(gauss_pulse(x + bw / 2, base, hh, sg, "fg-accent", span=34 / sg))
        p.append(f'<text class="fg-small" x="{x + bw / 2}" y="{base + 16}" text-anchor="middle">{desc[0]}</text>')
        p.append(f'<text class="fg-small" x="{x + bw / 2}" y="{base + 30}" text-anchor="middle">{desc[1]}</text>')
    p.append(f'<text class="fg-small" x="8" y="{y + 56}">{L("Leistung über der Zeit (schematisch, nicht maßstäblich)", "Power over time (schematic, not to scale)")}</text>')
    p.append(f'<text class="fg-pilltext" x="180" y="250" text-anchor="middle">{L("Im Verstärker bleibt die Spitzenleistung niedrig", "Peak power stays low inside the amplifier")}</text>')
    return svg(360, 258,"".join(p), L("CPA-Kette aus Oszillator, Strecker, Verstärker und Kompressor mit der jeweiligen Pulsform", "CPA chain of oscillator, stretcher, amplifier and compressor with the pulse shape after each stage"))


def mpa_schema():
    """One photon below the gap vs. n photons absorbed at once."""
    p = []
    cb_y, vb_y = 46, 176
    p.append(f'<rect class="fg-empty" x="20" y="16" width="320" height="{cb_y - 16}" rx="6"/>')
    p.append(f'<rect class="fg-band" x="20" y="{vb_y}" width="320" height="34" rx="6"/>')
    p.append(f'<text class="fg-muted" x="334" y="{cb_y - 10}" text-anchor="end">{L("Leitungsband", "Conduction band")}</text>')
    p.append(f'<text class="fg-muted" x="334" y="{vb_y + 22}" text-anchor="end">{L("Valenzband", "Valence band")}</text>')
    # gap marker
    p.append(arrow(44, vb_y - 2, 44, cb_y + 2, "fg-soft", 6) + arrow(44, cb_y + 2, 44, vb_y - 2, "fg-soft", 6))
    p.append(f'<text class="fg-text fg-bold" x="50" y="{(cb_y + vb_y) / 2 + 4}">E_g</text>')
    step = 30
    # single photon (fails)
    x = 104
    p.append(f'<circle class="fg-dot-a" cx="{x}" cy="{vb_y + 6}" r="5"/>')
    p.append(arrow(x, vb_y, x, vb_y - step, "fg-laser", 6))
    p.append(f'<text class="fg-laser-f" x="{x}" y="{vb_y - step - 8}" text-anchor="middle" font-size="16" font-weight="700">×</text>')
    p.append(f'<text class="fg-small" x="{x}" y="226" text-anchor="middle">{L("1 Photon: zu wenig", "1 photon: too little")}</text>')
    # n photons (succeeds)
    x = 230
    n = math.ceil((vb_y - cb_y) / step)
    for k in range(n):
        y1 = vb_y - k * step
        p.append(arrow(x, y1, x, y1 - step + 2, "fg-laser", 6))
    p.append(f'<circle class="fg-dot-a" cx="{x}" cy="{vb_y + 6}" r="5" opacity=".35"/>')
    p.append(f'<circle class="fg-dot-a" cx="{x}" cy="{cb_y - 10}" r="5"/>')
    p.append(f'<text class="fg-text fg-bold" x="{x + 10}" y="{(cb_y + vb_y) / 2 + 4}">n · hν ≥ E_g</text>')
    p.append(f'<text class="fg-small" x="{x}" y="226" text-anchor="middle">{L("n Photonen gleichzeitig", "n photons at once")}</text>')
    return svg(360, 236, "".join(p), L("Bänderschema: Ein Photon reicht nicht über die Bandlücke, n gleichzeitig absorbierte Photonen schon", "Band diagram: one photon cannot bridge the band gap, n photons absorbed at once can"))


def avalanche():
    """Electron multiplication by impact ionization: 1, 2, 4, 8 ..."""
    p = []
    cols = [40, 120, 200, 280]
    counts = [1, 2, 4, 8]
    top, bottom = 34, 186
    prev = []
    for i, (x, c) in enumerate(zip(cols, counts)):
        ys = [top + (bottom - top) * (k + 0.5) / c for k in range(c)]
        if prev:
            for k, y in enumerate(ys):
                py = prev[k // 2]
                p.append(f'<line class="fg-soft" x1="{cols[i - 1] + 7}" y1="{py:.1f}" x2="{x - 7}" y2="{y:.1f}"/>')
        for y in ys:
            p.append(f'<circle class="{"fg-dot-w" if i == 0 else "fg-dot-a"}" cx="{x}" cy="{y:.1f}" r="6"/>')
        p.append(f'<text class="fg-text fg-bold" x="{x}" y="{bottom + 22}" text-anchor="middle">{c}</text>')
        prev = ys
    p.append(f'<text class="fg-small" x="{cols[0]}" y="22" text-anchor="middle">{L("Startelektron", "Seed electron")}</text>')
    p.append(f'<text class="fg-small" x="330" y="{(top + bottom) / 2 + 4}" text-anchor="middle">…</text>')
    p.append(f'<text class="fg-small" x="8" y="{bottom + 44}">{L("Je Schritt: Elektron nimmt Laserenergie auf, Stoß setzt ein weiteres frei", "Each step: an electron gains laser energy, an impact frees another one")}</text>')
    p.append(f'<text class="fg-small" x="8" y="{bottom + 60}">{L("Zahl der freien Elektronen", "Number of free electrons")}: 1 → 2 → 4 → 8 → …</text>')
    return svg(360, bottom + 68, "".join(p), L("Lawinenionisation: Aus einem Startelektron werden durch Stoßionisation 2, 4, 8 Elektronen", "Avalanche ionization: one seed electron becomes 2, 4, 8 electrons by impact ionization"))


def d2_plot():
    """D^2 vs ln(Ep): straight line, slope 2 w0^2, intercept at ln Eth (illustrative data)."""
    x0, y0 = 50, 196
    p = [axes(x0, y0, 346, 22, "ln E_p", "D²")]

    # model: D^2 = k (lnE - lnEth); pixel mapping
    def X(u):  # u = ln(E/Eth) in [0, 2.4]
        return 110 + u * 92

    k = 62  # px per unit
    pts = [0.35, 0.7, 1.05, 1.4, 1.75, 2.1]
    noise = [4, -5, 3, -2, 5, -3]
    p.append(f'<line class="fg-accent" x1="{X(0):.1f}" y1="{y0}" x2="{X(2.4):.1f}" y2="{y0 - k * 2.4:.1f}"/>')
    for u, n in zip(pts, noise):
        p.append(f'<circle class="fg-dot-w" cx="{X(u):.1f}" cy="{y0 - k * u + n:.1f}" r="4.5"/>')
    p.append(f'<circle class="fg-ring" cx="{X(0):.1f}" cy="{y0}" r="6"/>')
    p.append(f'<text class="fg-text fg-bold" x="{X(0):.1f}" y="{y0 + 18}" text-anchor="middle">ln E_th</text>')
    # slope triangle
    ua, ub = 0.9, 1.5
    xa, xb = X(ua), X(ub)
    ya, yb = y0 - k * ua, y0 - k * ub
    p.append(f'<path class="fg-soft" d="M{xa:.1f} {ya:.1f} L{xb:.1f} {ya:.1f} L{xb:.1f} {yb:.1f}"/>')
    p.append(f'<text class="fg-text fg-bold" x="{xb + 8:.1f}" y="{(ya + yb) / 2 + 12:.1f}">{L("Steigung", "slope")} 2w₀²</text>')
    p.append(f'<text class="fg-small" x="{x0 + 8}" y="40">{L("Punkte: Beispieldaten (Krater)", "Dots: example data (craters)")}</text>')
    p.append(f'<text class="fg-small" x="{x0 + 8}" y="56">{L("Gerade: Ausgleichsgerade", "Line: linear fit")}</text>')
    return svg(360, 220, "".join(p), L("D²-Methode: Quadrat des Kraterdurchmessers über ln der Pulsenergie, Steigung 2w0², Schnittpunkt bei der Schwellenenergie", "D² method: squared crater diameter versus ln of pulse energy, slope 2w0², intercept at the threshold energy"))


def scanraster():
    """Two scan lines of spots: pulse spacing d = v/f along the line, hatch h between lines."""
    p = []
    r = 22
    d = 28
    ys = [64, 120]
    x_start = 40
    for y in ys:
        for k in range(9):
            x = x_start + k * d
            p.append(f'<circle class="fg-ring" cx="{x}" cy="{y}" r="{r}" opacity="{0.95 if k in (2, 3) else 0.35}"/>')
            p.append(f'<circle class="fg-dot-a" cx="{x}" cy="{y}" r="2.2"/>')
    p.append(arrow(18, 20, 90, 20, "fg-laser", 6))
    p.append(f'<text class="fg-small" x="96" y="24">{L("Scanrichtung, Geschwindigkeit v", "scan direction, speed v")}</text>')
    yb = ys[1] + r + 22
    xa, xb = x_start + 2 * d, x_start + 3 * d
    for xx in (xa, xb):
        p.append(f'<line class="fg-soft" x1="{xx}" y1="{ys[1]}" x2="{xx}" y2="{yb + 4}" stroke-dasharray="2 3"/>')
    p.append(dim(xa, xb, yb, "d = v/f", "fg-line", "fg-text fg-bold"))
    xc = x_start + 6 * d
    for xx in (xc - r, xc + r):
        p.append(f'<line class="fg-soft" x1="{xx}" y1="{ys[1]}" x2="{xx}" y2="{yb + 4}" stroke-dasharray="2 3"/>')
    p.append(dim(xc - r, xc + r, yb, "2w₀", "fg-line", "fg-text fg-bold"))
    hx = 322
    p.append(arrow(hx, ys[1], hx, ys[0], "fg-line", 6) + arrow(hx, ys[0], hx, ys[1], "fg-line", 6))
    p.append(f'<text class="fg-text fg-bold" x="{hx + 8}" y="{(ys[0] + ys[1]) / 2 + 4}">h</text>')
    p.append(f'<text class="fg-small" x="8" y="{yb + 26}">{L("Pulsabstand d entlang der Spur, Hatch h zwischen den Spuren", "Pulse spacing d along the track, hatch h between tracks")}</text>')
    return svg(360, yb + 34, "".join(p),L("Scanraster mit Pulsabstand d = v/f entlang der Spur und Hatch h zwischen zwei Spuren", "Scan pattern with pulse spacing d = v/f along the track and hatch h between two tracks"))


def sle_ablauf():
    """Selective laser etching: 1) fs focus writes a track inside glass, 2) etching opens the channel."""
    p = []
    gx, gy, gw, gh = 14, 70, 150, 92

    def glass(x):
        return f'<rect class="fg-solid" x="{x}" y="{gy}" width="{gw}" height="{gh}" rx="4" opacity=".55"/>'

    # panel 1
    p.append(glass(gx))
    track = f'M{gx} {gy + 46} L{gx + 70} {gy + 46} L{gx + 100} {gy + 70}'
    p.append(f'<path class="fg-warm" d="{track}"/>')
    fx, fy = gx + 100, gy + 70
    p.append(f'<path class="fg-laser" d="M{fx - 22} 22 L{fx} {fy} L{fx + 22} 22" stroke-width="2"/>')
    p.append(f'<circle class="fg-laser-f" cx="{fx}" cy="{fy}" r="3.5"/>')
    p.append(f'<text class="fg-laser-t" x="{fx + 26}" y="34">{L("fs-Fokus", "fs focus")}</text>')
    p.append(f'<text class="fg-text fg-bold" x="{gx}" y="16">1 {L("Modifizieren", "Modify")}</text>')
    p.append(f'<text class="fg-small" x="{gx}" y="{gy + gh + 18}">{L("Spur muss die Oberfläche erreichen", "track must reach the surface")}</text>')
    # arrow between panels
    p.append(arrow(gx + gw + 6, gy + 46, gx + gw + 30, gy + 46, "fg-line", 6))
    # panel 2
    x2 = gx + gw + 36
    p.append(glass(x2))
    p.append(f'<path d="M{x2} {gy + 40} L{x2 + 72} {gy + 40} L{x2 + 104} {gy + 66} L{x2 + 96} {gy + 74} L{x2 + 66} {gy + 52} L{x2} {gy + 52} Z" fill="var(--bg,#fff)" stroke="var(--fig-line,#3a465f)" stroke-width="1.5"/>')
    p.append(f'<text class="fg-text fg-bold" x="{x2}" y="16">2 {L("Ätzen", "Etch")}</text>')
    p.append(f'<text class="fg-small" x="{x2}" y="34">{L("Ätzbad löst modifiziertes", "etchant removes modified")}</text>')
    p.append(f'<text class="fg-small" x="{x2}" y="48">{L("Glas bevorzugt", "glass preferentially")}</text>')
    p.append(f'<text class="fg-small" x="{x2}" y="{gy + gh + 18}">{L("offener Kanal im Volumen", "open channel inside the volume")}</text>')
    p.append(f'<text class="fg-small" x="{gx}" y="{gy + gh + 40}">{L("schematisch, nicht maßstäblich", "schematic, not to scale")}</text>')
    return svg(360, gy + gh + 48, "".join(p), L("SLE in zwei Schritten: Femtosekundenfokus schreibt eine Spur ins Glas, danach öffnet das Ätzbad den Kanal", "SLE in two steps: a femtosecond focus writes a track into the glass, then the etchant opens the channel"))


def ns_vs_ukp():
    """Schematic crater cross-sections: long pulse (melt, recast, HAZ, cracks) vs. ultrashort pulse."""
    p = []
    top = 60
    w, depth = 150, 96

    def block(x):
        return f'<rect class="fg-solid" x="{x}" y="{top}" width="{w}" height="{depth}" opacity=".35"/>'

    def heat(cx, rx, ry):
        """Heat-affected zone as a half ellipse below the surface."""
        return f'<path class="fg-heat" d="M{cx - rx} {top} A {rx} {ry} 0 0 0 {cx + rx} {top} Z"/>'

    # left: ns
    x = 12
    cx = x + w / 2
    p.append(block(x))
    p.append(heat(cx, 66, 72))
    p.append(f'<path d="M{cx - 34} {top} Q {cx} {top + 66} {cx + 34} {top}" fill="var(--bg,#fff)" stroke="var(--fig-line,#3a465f)" stroke-width="1.5"/>')
    # recast rims
    p.append(f'<path class="fg-dot-w" d="M{cx - 46} {top} q 6 -16 14 0 z M{cx + 32} {top} q 8 -18 14 0 z"/>')
    # droplets
    for dx, dy in ((-60, -20), (52, -30), (-24, -36), (66, -12)):
        p.append(f'<circle class="fg-dot-w" cx="{cx + dx}" cy="{top + dy}" r="3"/>')
    # cracks
    p.append(f'<path class="fg-line" d="M{cx - 20} {top + 44} l -10 16 l 4 10 M{cx + 22} {top + 42} l 12 14 l -2 12" stroke-width="1.3"/>')
    p.append(f'<text class="fg-text fg-bold" x="{cx}" y="22" text-anchor="middle">{L("langer Puls (ns)", "long pulse (ns)")}</text>')
    labels_l = [L("Schmelzauswurf, Grat", "melt ejection, burr"), L("Wärmeeinflusszone", "heat-affected zone"), L("Risse möglich", "cracks possible")]
    for i, t in enumerate(labels_l):
        p.append(f'<text class="fg-small" x="{x}" y="{top + depth + 18 + 14 * i}">· {t}</text>')
    # right: ultrashort
    x = 198
    cx = x + w / 2
    p.append(block(x))
    p.append(heat(cx, 38, 30))
    p.append(f'<path d="M{cx - 32} {top} Q {cx} {top + 50} {cx + 32} {top}" fill="var(--bg,#fff)" stroke="var(--fig-line,#3a465f)" stroke-width="1.5"/>')
    for dx, dy in ((-10, -26), (8, -34), (0, -18)):
        p.append(f'<circle class="fg-dot-a" cx="{cx + dx}" cy="{top + dy}" r="2"/>')
    p.append(f'<text class="fg-text fg-bold" x="{cx}" y="22" text-anchor="middle">{L("Ultrakurzpuls (ps/fs)", "ultrashort pulse (ps/fs)")}</text>')
    labels_r = [L("Dampf, feine Partikel", "vapour, fine particles"), L("scharfe Kante", "sharp edge"), L("kleine Wärmeeinflusszone", "small heat-affected zone")]
    for i, t in enumerate(labels_r):
        p.append(f'<text class="fg-small" x="{x}" y="{top + depth + 18 + 14 * i}">· {t}</text>')
    p.append(f'<text class="fg-pilltext" x="180" y="{top + depth + 66}" text-anchor="middle">{L("schematisch: typische Tendenz, kein Maßstab", "schematic: typical tendency, not to scale")}</text>')
    return svg(360, top + depth + 74, "".join(p), L("Schematischer Kraterquerschnitt: langer Puls mit Schmelze, Wärmeeinflusszone und Rissen, Ultrakurzpuls mit sauberer Kante", "Schematic crater cross-section: long pulse with melt, heat-affected zone and cracks, ultrashort pulse with a clean edge"))


# ---------------------------------------------------------------- packaging figures (0.6.0)


def package_querschnitt():
    """Cross-section of a flip-chip BGA (schematic): chip, bumps, underfill, substrate, balls, board."""
    p = []
    XL, XR = 16, 216
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
        p.append(f'<rect class="fg-fill" x="{XL}" y="{y0}" width="{XR - XL}" height="30" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
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
    p.append(f'<rect class="fg-bar-s" x="{XL}" y="94" width="{XR - XL}" height="36" opacity=".45"/>')
    for x in cols:
        p.append(f'<rect class="fg-bar-w" x="{x + 11}" y="94" width="6" height="36" opacity=".9"/>')
    # solder balls and board
    for i in range(6):
        p.append(f'<circle class="fg-bar-s" cx="{36 + 32 * i}" cy="170" r="9"/>')
    p.append('<rect class="fg-bar-s" x="10" y="179" width="212" height="20" rx="2" opacity=".35"/>')
    p.append('<rect class="fg-soft" x="10" y="179" width="212" height="20" rx="2"/>')
    # labels with leader lines
    labels = [(35, 154, L("Chip (Si)", "Chip (Si)"), True), (58, 166, L("Bumps, Underfill", "Bumps, underfill"), False), (79, 220, L("Aufbaulagen", "Build-up layers"), False),
              (112, 220, L("Kern", "Core"), False), (139, 220, L("Aufbaulagen", "Build-up layers"), False), (170, 210, L("Lotkugeln (BGA)", "Solder balls (BGA)"), False), (189, 226, L("Leiterplatte", "Circuit board"), False)]
    for y, x0, txt, bold in labels:
        p.append(f'<line class="fg-soft" x1="{x0}" y1="{y}" x2="230" y2="{y}" stroke-width="1"/>')
        cls = "fg-text fg-bold" if bold else "fg-text"
        p.append(f'<text class="{cls}" x="234" y="{y + 4}">{txt}</text>')
    p.append(f'<text class="fg-muted" x="234" y="97" font-size="11">{L("mit Microvias", "with microvias")}</text>')
    p.append(f'<text class="fg-muted" x="234" y="155" font-size="11">{L("mit Microvias", "with microvias")}</text>')
    p.append(f'<text class="fg-muted" x="10" y="218">{L("Raster von oben nach unten: Bumps, Microvias, Lotkugeln", "Pitch from top to bottom: bumps, microvias, solder balls")}</text>')
    return svg(360, 226, "".join(p), L("Schnitt durch ein Flip-Chip-BGA: Chip mit Bumps und Underfill auf einem Substrat aus Kern und Aufbaulagen mit Microvias, darunter Lotkugeln auf der Leiterplatte", "Cross-section of a flip-chip BGA: chip with bumps and underfill on a substrate of core and build-up layers with microvias, below it solder balls on the circuit board"))


def microvia():
    """Cross-section of a laser-drilled microvia in a filled build-up dielectric down to a copper pad."""
    p = []
    XL, XR = 16, 236
    top, bot = 74, 144
    xt0, xt1, xb0, xb1 = 101, 151, 110, 142
    cx = (xt0 + xt1) / 2
    # laser cone converging onto the via
    p.append(f'<polygon class="fg-laser-f" points="{cx - 36},8 {cx + 36},8 {xt1 - 6},{top - 2} {xt0 + 6},{top - 2}" opacity=".18"/>')
    p.append(f'<line class="fg-laser" x1="{cx - 36}" y1="8" x2="{xt0 + 6}" y2="{top - 2}"/><line class="fg-laser" x1="{cx + 36}" y1="8" x2="{xt1 - 6}" y2="{top - 2}"/>')
    p.append(f'<text class="fg-text fg-bold" x="16" y="24">{L("UKP-Pulse", "USP pulses")}</text>')
    # dielectric with the hole
    p.append(f'<polygon class="fg-fill" points="{XL},{top} {xt0},{top} {xb0},{bot} {XL},{bot}" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
    p.append(f'<polygon class="fg-fill" points="{xt1},{top} {XR},{top} {XR},{bot} {xb1},{bot}" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
    # filler particles (deterministic pseudo-random positions, linear congruential generator)
    seed = 7
    for _ in range(70):
        seed = (seed * 1103515245 + 12345) % 2**31
        x = XL + 4 + seed % (XR - XL - 8)
        seed = (seed * 1103515245 + 12345) % 2**31
        y = top + 5 + seed % (bot - top - 10)
        frac = (y - top) / (bot - top)
        if xt0 + (xb0 - xt0) * frac - 3 < x < xt1 + (xb1 - xt1) * frac + 3:
            continue
        p.append(f'<circle class="fg-bar-s" cx="{x}" cy="{y}" r="{1.4 + (seed % 3) * 0.6:.1f}"/>')
    # copper pad and layer below
    p.append(f'<rect class="fg-bar-w" x="{cx - 50}" y="{bot}" width="100" height="10" opacity=".9"/>')
    p.append(f'<rect class="fg-fill" x="{XL}" y="{bot + 10}" width="{XR - XL}" height="22" stroke="var(--fig-soft,#aab4cb)" stroke-width="1"/>')
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
    p.append(f'<text class="fg-text" x="268" y="{top + 14}">{L("Dielektrikum", "Dielectric")}</text>')
    p.append(f'<text class="fg-muted" x="268" y="{top + 29}" font-size="11">{L("Harz mit", "resin with")}</text>')
    p.append(f'<text class="fg-muted" x="268" y="{top + 42}" font-size="11">{L("Füllstoff", "filler")}</text>')
    p.append(f'<line class="fg-soft" x1="{cx + 52}" y1="{bot + 5}" x2="264" y2="{bot + 5}" stroke-width="1"/>')
    p.append(f'<text class="fg-text" x="268" y="{bot + 9}">{L("Kupferpad", "Copper pad")}</text>')
    p.append(f'<text class="fg-muted" x="22" y="{bot + 26}">{L("Lage darunter", "layer below")}</text>')
    p.append(f'<text class="fg-muted" x="16" y="{bot + 50}">{L("Taper = d_bot / d_top · Wandwinkel aus (d_top − d_bot) / 2h", "Taper = d_bot / d_top · wall angle from (d_top − d_bot) / 2h")}</text>')
    return svg(360, bot + 58, "".join(p), L("Schnitt durch eine Microvia: Laserstrahl von oben, konische Bohrung durch ein gefülltes Dielektrikum bis auf ein Kupferpad, mit oberem Durchmesser, unterem Durchmesser und Tiefe", "Cross-section of a microvia: laser beam from above, tapered hole through a filled dielectric down to a copper pad, with top diameter, bottom diameter and depth"))

FIGURES = [
    ("zeitleiter", zeitleiter),
    ("pulszug", pulszug),
    ("gauss-profil", gauss_profil),
    ("baender", baender),
    ("zeitskalen-prozesse", zeitskalen_prozesse),
    ("kaustik", kaustik),
    ("lambert-beer", lambert_beer),
    ("cpa-schema", cpa_schema),
    ("mpa-schema", mpa_schema),
    ("avalanche", avalanche),
    ("d2-plot", d2_plot),
    ("scanraster", scanraster),
    ("sle-ablauf", sle_ablauf),
    ("ns-vs-ukp", ns_vs_ukp),
    ("package-querschnitt", package_querschnitt),
    ("microvia", microvia),
]

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("de", "en"):
        LANG = lang
        for name, fn in FIGURES:
            path = OUT / (f"{name}.svg" if lang == "de" else f"{name}.en.svg")
            path.write_text(fn(), encoding="utf-8", newline="\n")
            print("wrote", path.name)
