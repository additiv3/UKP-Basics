"""Generate the app icon (own design): a Gaussian laser pulse as an alpine peak, hit by a beam.

Writes assets/icons/icon.svg and the PNG sizes (192, 512, maskable 512, apple-touch 180).
Run: python tools/gen_icons.py   (needs Pillow)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "icons"
N = 1024
BG_TOP, BG_BOT = (23, 56, 107), (6, 10, 22)
PEAK_TOP, PEAK_BOT = (110, 226, 247), (11, 60, 92)
RIDGE1_TOP, RIDGE2_TOP = (38, 96, 150), (26, 70, 118)
AMBER = (255, 194, 74)

# (center x, height above ground, sigma, ground y)
MAIN = (512, 480, 150, 800)
LEFT = (290, 200, 85, 810)
RIGHT = (770, 260, 105, 810)
APEX = (512, MAIN[3] - MAIN[1])  # (512, 320)
SPARKS = [(440, 262, 11), (592, 244, 9), (470, 214, 6), (578, 292, 6), (402, 300, 5)]


def y_at(peak, x):
    cx, h, s, ground = peak
    return ground - h * math.exp(-((x - cx) ** 2) / (2 * s**2))


def outline(peak, step=8):
    pts = [(x, y_at(peak, x)) for x in range(0, N + 1, step)]
    return pts + [(N, N), (0, N)]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vgradient(size, top, bot, y0=0, y1=None):
    w, h = size
    y1 = h if y1 is None else y1
    img = Image.new("RGB", size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        d.line([(0, y), (w, y)], fill=lerp(top, bot, t))
    return img


def art(scale_up=2):
    """Transparent art layer (mountains, beam, sparks) at N*scale_up px."""
    S = N * scale_up
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for peak, top in ((LEFT, RIDGE1_TOP), (RIGHT, RIDGE2_TOP), (MAIN, PEAK_TOP)):
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).polygon([(x * scale_up, y * scale_up) for x, y in outline(peak)], fill=255)
        top_y = (peak[3] - peak[1]) * scale_up
        bot = PEAK_BOT if peak is MAIN else BG_BOT
        grad = vgradient((S, S), top, bot if peak is MAIN else lerp(top, BG_BOT, 0.8), y0=top_y, y1=N * scale_up)
        layer.paste(grad, (0, 0), mask)
    # beam with glow
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    ax, ay = APEX[0] * scale_up, APEX[1] * scale_up
    gd.line([(ax, 40 * scale_up), (ax, ay)], fill=(140, 235, 255, 255), width=46 * scale_up)
    r = 70 * scale_up
    gd.ellipse([ax - r, ay - r, ax + r, ay + r], fill=(160, 240, 255, 255))
    glow = glow.filter(ImageFilter.GaussianBlur(26 * scale_up))
    layer = Image.alpha_composite(layer, glow)
    d = ImageDraw.Draw(layer)
    d.line([(ax, 60 * scale_up), (ax, ay)], fill=(255, 255, 255, 255), width=14 * scale_up)
    r = 26 * scale_up
    d.ellipse([ax - r, ay - r, ax + r, ay + r], fill=(255, 255, 255, 255))
    for sx, sy, sr in SPARKS:
        d.ellipse([(sx - sr) * scale_up, (sy - sr) * scale_up, (sx + sr) * scale_up, (sy + sr) * scale_up], fill=AMBER + (255,))
    return layer


def render(size, content_scale=1.0):
    bg = vgradient((N * 2, N * 2), BG_TOP, BG_BOT).convert("RGBA")
    layer = art(2)
    if content_scale != 1.0:
        k = int(N * 2 * content_scale)
        layer = layer.resize((k, k), Image.LANCZOS)
        full = Image.new("RGBA", (N * 2, N * 2), (0, 0, 0, 0))
        off = (N * 2 - k) // 2
        full.paste(layer, (off, off))
        layer = full
    out = Image.alpha_composite(bg, layer).convert("RGB")
    return out.resize((size, size), Image.LANCZOS)


def svg():
    def path(peak):
        pts = " L".join(f"{x},{y_at(peak, x):.1f}" for x in range(0, N + 1, 16))
        return f"M{pts} L{N},{N} L0,{N} Z"

    ax, ay = APEX
    sparks = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="rgb{AMBER}"/>' for x, y, r in SPARKS)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb{BG_TOP}"/><stop offset="1" stop-color="rgb{BG_BOT}"/></linearGradient>
<linearGradient id="pk" x1="0" y1="{APEX[1]}" x2="0" y2="{N}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="rgb{PEAK_TOP}"/><stop offset="1" stop-color="rgb{PEAK_BOT}"/></linearGradient>
<linearGradient id="r1" x1="0" y1="{LEFT[3] - LEFT[1]}" x2="0" y2="{N}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="rgb{RIDGE1_TOP}"/><stop offset="1" stop-color="rgb{BG_BOT}"/></linearGradient>
<linearGradient id="r2" x1="0" y1="{RIGHT[3] - RIGHT[1]}" x2="0" y2="{N}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="rgb{RIDGE2_TOP}"/><stop offset="1" stop-color="rgb{BG_BOT}"/></linearGradient>
<filter id="glow" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="26"/></filter>
</defs>
<rect width="{N}" height="{N}" fill="url(#bg)"/>
<path d="{path(LEFT)}" fill="url(#r1)"/>
<path d="{path(RIGHT)}" fill="url(#r2)"/>
<path d="{path(MAIN)}" fill="url(#pk)"/>
<g filter="url(#glow)" fill="rgb(160,240,255)" stroke="rgb(140,235,255)"><line x1="{ax}" y1="40" x2="{ax}" y2="{ay}" stroke-width="46"/><circle cx="{ax}" cy="{ay}" r="70" stroke="none"/></g>
<line x1="{ax}" y1="60" x2="{ax}" y2="{ay}" stroke="#fff" stroke-width="14"/>
<circle cx="{ax}" cy="{ay}" r="26" fill="#fff"/>
{sparks}
</svg>
"""


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(svg(), encoding="utf-8", newline="\n")
    render(192).save(OUT / "icon-192.png", optimize=True)
    render(512).save(OUT / "icon-512.png", optimize=True)
    render(180).save(OUT / "apple-touch-icon.png", optimize=True)
    render(512, 0.78).save(OUT / "icon-maskable-512.png", optimize=True)
    print("icons written to", OUT)
