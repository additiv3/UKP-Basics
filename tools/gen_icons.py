"""Generate the app icon and the brand mark (own design).

Concept: a faceted, rounded crystal block (hard material: ceramic, quartz, semiconductor) in laser-physics cyan,
hit by a focused train of ultrashort pulses. The beam converges to a point, a starburst marks the ablation spot,
and a plume of particles leaves the surface. The faceted crystal is a nod to the working group's mark;
the geometry and the beam are an own drawing.

Writes assets/icons/icon.svg, the PNG sizes (192, 512, maskable 512, apple-touch 180)
and assets/brand/mark.svg (transparent background, used in the app header).
Run: python tools/gen_icons.py   (needs Pillow)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"
BRAND = ROOT / "assets" / "brand"
N = 1024

BG_TOP, BG_BOT = (16, 38, 82), (4, 8, 20)
CRY_TOP, CRY_BOT = (64, 208, 255), (8, 104, 190)
LASER = (255, 98, 48)
LASER_HOT = (255, 214, 120)

OX, OY = 70, 100  # shift of the crystal so the beam has room
VERTS = [(270 + OX, 360 + OY), (560 + OX, 250 + OY), (790 + OX, 400 + OY), (760 + OX, 690 + OY), (450 + OX, 800 + OY), (240 + OX, 610 + OY)]  # A..F
CENTER = (520 + OX, 520 + OY)
EDGE_W = 44  # round-join stroke width that rounds the corners
# facet overlays per triangle (vertex i, vertex i+1, center): (white|black, alpha)
FACETS = [("w", 0.34), ("w", 0.14), ("w", 0.0), ("b", 0.16), ("b", 0.30), ("b", 0.10)]
IMPACT = (372 + OX, 300 + OY)
START = (-80, -110)
BEAM_W0 = 300  # beam width at the start (focused down to the impact point)
CORE_W0 = 84
PULSES = [(0.30, 150), (0.52, 120), (0.72, 92), (0.88, 60)]  # (position along beam, length)
PLUME = [  # (angle deg, distance, radius, kind)
    (-86, 120, 15, "hot"), (-70, 200, 11, "laser"), (-58, 150, 9, "white"), (-96, 230, 8, "laser"),
    (-48, 250, 12, "hot"), (-34, 170, 8, "laser"), (-76, 300, 7, "white"), (-24, 260, 7, "laser"),
    (-104, 140, 6, "white"), (-62, 340, 6, "hot"),
]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def unit(dx, dy):
    d = math.hypot(dx, dy)
    return dx / d, dy / d


DIR = unit(IMPACT[0] - START[0], IMPACT[1] - START[1])
NORM = (-DIR[1], DIR[0])


def along(t):
    return START[0] + (IMPACT[0] - START[0]) * t, START[1] + (IMPACT[1] - START[1]) * t


def cone(width0, t0=0.0):
    """Polygon of a converging beam from t0 to the impact point."""
    p0 = along(t0)
    w = width0 * (1 - t0) / 2
    return [(p0[0] + NORM[0] * w, p0[1] + NORM[1] * w), (p0[0] - NORM[0] * w, p0[1] - NORM[1] * w), IMPACT]


def pulse_ends(t, length):
    c = along(t)
    return (c[0] - DIR[0] * length / 2, c[1] - DIR[1] * length / 2), (c[0] + DIR[0] * length / 2, c[1] + DIR[1] * length / 2)


def pulse_width(t):
    return 22 + 120 * (1 - t)


def plume_points():
    out = []
    for ang, dist, r, kind in PLUME:
        a = math.radians(ang)
        out.append((IMPACT[0] + math.cos(a) * dist, IMPACT[1] + math.sin(a) * dist, r, kind))
    return out


def star_path(cx, cy, long_r=118, short_r=74):
    """Four long rays plus four short diagonal rays as one polygon."""
    pts = []
    for i in range(16):
        ang = math.radians(i * 22.5 - 90)
        r = long_r if i % 4 == 0 else short_r if i % 2 == 0 else 20
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


def rgb(c):
    return f"rgb({c[0]},{c[1]},{c[2]})"


KIND_COLOR = {"hot": LASER_HOT, "laser": LASER, "white": (255, 255, 255)}


def vgradient(size, top, bot, y0, y1):
    w, h = size
    img = Image.new("RGB", size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        d.line([(0, y), (w, y)], fill=lerp(top, bot, t))
    return img


def diag_gradient(size, top, bot, p0, p1):
    """Linear gradient along the vector p0 -> p1 (pixel coordinates)."""
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    vx, vy = p1[0] - p0[0], p1[1] - p0[1]
    vv = vx * vx + vy * vy
    for y in range(h):
        for x in range(w):
            t = ((x - p0[0]) * vx + (y - p0[1]) * vy) / vv
            px[x, y] = lerp(top, bot, min(1, max(0, t)))
    return img


def draw_art(S, with_bg):
    """Render the artwork at N*S pixels. Returns an RGBA image."""
    size = N * S
    k = S
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if with_bg:
        bg = vgradient((size, size), BG_TOP, BG_BOT, 0, size).convert("RGBA")
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        cx, cy, r = (560 + OX) * k, (560 + OY) * k, 420 * k
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(30, 110, 200, 120))
        glow = glow.filter(ImageFilter.GaussianBlur(120 * k))
        layer = Image.alpha_composite(bg, glow)

    # crystal body (polygon + round-join stroke), gradient fill via mask
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    pts = [(x * k, y * k) for x, y in VERTS]
    md.polygon(pts, fill=255)
    for i in range(len(pts)):
        md.line([pts[i], pts[(i + 1) % len(pts)]], fill=255, width=int(EDGE_W * k))
        md.ellipse([pts[i][0] - EDGE_W * k / 2, pts[i][1] - EDGE_W * k / 2, pts[i][0] + EDGE_W * k / 2, pts[i][1] + EDGE_W * k / 2], fill=255)
    body = diag_gradient((size, size), CRY_TOP, CRY_BOT, ((300 + OX) * k, (240 + OY) * k), ((700 + OX) * k, (800 + OY) * k))
    # soft shadow below the crystal
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sm = Image.new("L", (size, size), 0)
    sm.paste(mask.transform(mask.size, Image.AFFINE, (1, 0, 0, 0, 1, -26 * k)), (0, 0))
    shadow.paste((0, 8, 30, 150), (0, 0), sm.filter(ImageFilter.GaussianBlur(26 * k)))
    layer = Image.alpha_composite(layer, shadow)
    layer.paste(body, (0, 0), mask)

    # facets
    ov = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    c = (CENTER[0] * k, CENTER[1] * k)
    for i, (kind, a) in enumerate(FACETS):
        if a <= 0:
            continue
        tri = [pts[i], pts[(i + 1) % len(pts)], c]
        od.polygon(tri, fill=((255, 255, 255, int(255 * a)) if kind == "w" else (0, 20, 60, int(255 * a))))
    for p in pts:
        od.line([c, p], fill=(255, 255, 255, 90), width=int(5 * k))
    layer = Image.alpha_composite(layer, ov)

    # beam glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.polygon([(x * k, y * k) for x, y in cone(BEAM_W0)], fill=LASER + (255,))
    for t, ln in PULSES:
        a, b = pulse_ends(t, ln)
        gd.line([(a[0] * k, a[1] * k), (b[0] * k, b[1] * k)], fill=LASER_HOT + (255,), width=int(pulse_width(t) * 1.6 * k))
    r = 90 * k
    gd.ellipse([IMPACT[0] * k - r, IMPACT[1] * k - r, IMPACT[0] * k + r, IMPACT[1] * k + r], fill=LASER_HOT + (255,))
    glow = glow.filter(ImageFilter.GaussianBlur(34 * k))
    layer = Image.alpha_composite(layer, glow)

    d = ImageDraw.Draw(layer)
    # translucent beam body
    body_beam = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body_beam)
    bd.polygon([(x * k, y * k) for x, y in cone(BEAM_W0)], fill=LASER + (92,))
    bd.polygon([(x * k, y * k) for x, y in cone(CORE_W0)], fill=LASER_HOT + (230,))
    layer = Image.alpha_composite(layer, body_beam)
    d = ImageDraw.Draw(layer)
    # pulses (bright capsules)
    for t, ln in PULSES:
        a, b = pulse_ends(t, ln)
        w = pulse_width(t) * k
        d.line([(a[0] * k, a[1] * k), (b[0] * k, b[1] * k)], fill=(255, 255, 255, 255), width=int(w))
        for p in (a, b):
            d.ellipse([p[0] * k - w / 2, p[1] * k - w / 2, p[0] * k + w / 2, p[1] * k + w / 2], fill=(255, 255, 255, 255))
    # plume
    for x, y, r, kind in plume_points():
        col = KIND_COLOR[kind]
        d.ellipse([(x - r) * k, (y - r) * k, (x + r) * k, (y + r) * k], fill=col + (255,))
    # starburst
    star = [(x * k, y * k) for x, y in star_path(*IMPACT)]
    d.polygon(star, fill=(255, 255, 255, 255))
    r = 30 * k
    d.ellipse([IMPACT[0] * k - r, IMPACT[1] * k - r, IMPACT[0] * k + r, IMPACT[1] * k + r], fill=(255, 255, 255, 255))
    return layer


def render(size, content_scale=1.0, with_bg=True):
    S = 2
    art = draw_art(S, with_bg)
    if content_scale != 1.0:
        k = int(N * S * content_scale)
        art = art.resize((k, k), Image.LANCZOS)
        bg = vgradient((N * S, N * S), BG_TOP, BG_BOT, 0, N * S).convert("RGBA")
        off = (N * S - k) // 2
        bg.alpha_composite(art, (off, off))
        art = bg
    out = art if not with_bg and content_scale == 1.0 else art.convert("RGB") if with_bg else art
    return out.resize((size, size), Image.LANCZOS)


def svg(with_bg=True):
    pts = " ".join(f"{x},{y}" for x, y in VERTS)
    facets = ""
    for i, (kind, a) in enumerate(FACETS):
        if a <= 0:
            continue
        tri = f"{VERTS[i][0]},{VERTS[i][1]} {VERTS[(i + 1) % len(VERTS)][0]},{VERTS[(i + 1) % len(VERTS)][1]} {CENTER[0]},{CENTER[1]}"
        fill = "#fff" if kind == "w" else "#001e3c"
        facets += f'<polygon points="{tri}" fill="{fill}" fill-opacity="{a}"/>'
    lines = "".join(f'<line x1="{CENTER[0]}" y1="{CENTER[1]}" x2="{x}" y2="{y}"/>' for x, y in VERTS)
    cone_pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in cone(BEAM_W0))
    core_pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in cone(CORE_W0))
    pulses = ""
    for t, ln in PULSES:
        a, b = pulse_ends(t, ln)
        pulses += f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke-width="{pulse_width(t):.1f}"/>'
    plume = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{rgb(KIND_COLOR[kind])}"/>' for x, y, r, kind in plume_points())
    star = " ".join(f"{x:.1f},{y:.1f}" for x, y in star_path(*IMPACT))
    bg = (
        f'<rect width="{N}" height="{N}" fill="url(#bg)"/><circle cx="{560+OX}" cy="{560+OY}" r="420" fill="rgb(30,110,200)" fill-opacity=".47" filter="url(#soft)"/>'
        if with_bg
        else ""
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" style="overflow:hidden">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{rgb(BG_TOP)}"/><stop offset="1" stop-color="{rgb(BG_BOT)}"/></linearGradient>
<linearGradient id="cr" gradientUnits="userSpaceOnUse" x1="{300+OX}" y1="{240+OY}" x2="{700+OX}" y2="{800+OY}"><stop offset="0" stop-color="{rgb(CRY_TOP)}"/><stop offset="1" stop-color="{rgb(CRY_BOT)}"/></linearGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="120"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>
</defs>
{bg}
<g filter="url(#shadow)" transform="translate(0,26)" opacity=".6"><polygon points="{pts}" fill="#001e3c" stroke="#001e3c" stroke-width="{EDGE_W}" stroke-linejoin="round"/></g>
<polygon points="{pts}" fill="url(#cr)" stroke="url(#cr)" stroke-width="{EDGE_W}" stroke-linejoin="round"/>
{facets}
<g stroke="#fff" stroke-opacity=".35" stroke-width="5">{lines}</g>
<g filter="url(#glow)" fill="{rgb(LASER)}" stroke="{rgb(LASER_HOT)}" stroke-linecap="round"><polygon points="{cone_pts}" stroke="none"/><g>{pulses}</g><circle cx="{IMPACT[0]}" cy="{IMPACT[1]}" r="90" fill="{rgb(LASER_HOT)}" stroke="none"/></g>
<polygon points="{cone_pts}" fill="{rgb(LASER)}" fill-opacity=".36"/>
<polygon points="{core_pts}" fill="{rgb(LASER_HOT)}" fill-opacity=".9"/>
<g stroke="#fff" stroke-linecap="round">{pulses}</g>
{plume}
<polygon points="{star}" fill="#fff"/>
<circle cx="{IMPACT[0]}" cy="{IMPACT[1]}" r="30" fill="#fff"/>
</svg>
"""


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(svg(True), encoding="utf-8", newline="\n")
    (BRAND / "mark.svg").write_text(svg(False), encoding="utf-8", newline="\n")
    render(192).save(OUT / "icon-192.png", optimize=True)
    render(512).save(OUT / "icon-512.png", optimize=True)
    render(180).save(OUT / "apple-touch-icon.png", optimize=True)
    render(512, 0.78).save(OUT / "icon-maskable-512.png", optimize=True)
    print("icons written to", OUT)
