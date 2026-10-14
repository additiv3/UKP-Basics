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


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in [("zeitleiter", zeitleiter), ("pulszug", pulszug), ("gauss-profil", gauss_profil)]:
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8", newline="\n")
        print("wrote", OUT / f"{name}.svg")
