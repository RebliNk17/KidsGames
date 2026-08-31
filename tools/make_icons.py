#!/usr/bin/env python3
"""יצירת אייקוני ה-PWA (PNG) בלי שום ספרייה חיצונית - רק stdlib.
מריצים מתיקיית השורש:  python3 tools/make_icons.py
העיצוב תואם ל-icons/favicon.svg: רקע גרדיאנט, כוכב זהב ופלוס סגול.
"""
import zlib, struct, math, os

# צבעים
BG1 = (0x8A, 0x5C, 0xFF)   # סגול
BG2 = (0xFF, 0x6F, 0xB0)   # ורוד
STAR = (0xFF, 0xD2, 0x3F)  # זהב
EDGE = (0xE8, 0x89, 0x0C)  # כתום כהה (מסגרת הכוכב)
PLUS = (0x6B, 0x21, 0xA8)  # סגול כהה

SS = 3  # דגימת-יתר להחלקת קצוות


def star_points(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def in_poly(x, y, pts):
    inside = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xin = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xin:
                inside = not inside
    return inside


def in_rrect(x, y, cx, cy, hw, hh, r):
    dx = abs(x - cx) - (hw - r)
    dy = abs(y - cy) - (hh - r)
    if dx <= 0 and abs(y - cy) <= hh:
        return abs(x - cx) <= hw
    if dy <= 0 and abs(x - cx) <= hw:
        return abs(y - cy) <= hh
    if dx > 0 and dy > 0:
        return dx * dx + dy * dy <= r * r
    return False


def render(size, rounded_corners, content_scale):
    star_o = star_points(0.5, 0.47, 0.38, 0.19)
    star_e = star_points(0.5, 0.47, 0.425, 0.225)
    corner_r = 0.21

    def sample(u, v):
        # רקע מעוגל-פינות (שקוף בפינות באייקונים רגילים)
        if rounded_corners and not in_rrect(u, v, 0.5, 0.5, 0.5, 0.5, corner_r):
            return None
        t = (u + v) / 2
        col = [round(BG1[i] + (BG2[i] - BG1[i]) * t) for i in range(3)]
        # תוכן מוקטן (לאייקון maskable יש שוליים בטוחים)
        cu = (u - 0.5) / content_scale + 0.5
        cv = (v - 0.5) / content_scale + 0.5
        if in_poly(cu, cv, star_e):
            col = list(EDGE)
        if in_poly(cu, cv, star_o):
            col = list(STAR)
        if in_rrect(cu, cv, 0.5, 0.49, 0.05, 0.14, 0.045) or \
           in_rrect(cu, cv, 0.5, 0.49, 0.14, 0.05, 0.045):
            col = list(PLUS)
        return col

    rows = []
    step = 1.0 / (size * SS)
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                for sx in range(SS):
                    u = (px * SS + sx + 0.5) * step
                    v = (py * SS + sy + 0.5) * step
                    c = sample(u, v)
                    if c is not None:
                        r += c[0]; g += c[1]; b += c[2]; a += 255
            n = SS * SS
            row += bytes((r // n, g // n, b // n, a // n))
        rows.append(row)
    return rows


def write_png(path, size, rows):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    print(f'  ✓ {path} ({size}x{size})')


def main():
    out = os.path.join(os.path.dirname(__file__), '..', 'icons')
    os.makedirs(out, exist_ok=True)
    jobs = [
        ('icon-512.png', 512, True, 1.0),
        ('icon-192.png', 192, True, 1.0),
        ('icon-maskable-512.png', 512, False, 0.72),
        ('apple-touch-icon.png', 180, False, 0.86),
    ]
    print('יוצר אייקונים...')
    for name, size, rounded, scale in jobs:
        rows = render(size, rounded, scale)
        write_png(os.path.join(out, name), size, rows)
    print('סיום!')


if __name__ == '__main__':
    main()
