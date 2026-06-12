"""Dev-only icon generator for Squinks Arcade.

Writes the PWA PNG icons with nothing but the Python standard library
(no Pillow needed). Re-run from the project root to regenerate:

    python tools/make-icons.py

Produces icons/icon-192.png, icons/icon-512.png, icons/apple-touch-icon-180.png.
The design is a neon "arcade button": full-bleed dark background (so it is
safe as a maskable icon) with concentric magenta/cyan rings kept inside the
central safe zone. Not used at runtime; the app ships the generated PNGs.
"""

import os
import struct
import zlib

BG = (13, 11, 30)        # deep neon navy, full bleed
RING = (255, 46, 151)    # magenta
INNER = (45, 226, 230)   # cyan
HILITE = (240, 240, 255)  # small specular dot


def _chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path, size):
    cx = cy = (size - 1) / 2.0
    r_ring = 0.30 * size
    r_ring_in = 0.235 * size
    r_inner = 0.165 * size
    r_hi = 0.05 * size
    hi_cx, hi_cy = cx - 0.07 * size, cy - 0.07 * size

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            dx, dy = x - cx, y - cy
            d2 = dx * dx + dy * dy
            r, g, b = BG
            if d2 <= r_ring * r_ring:
                r, g, b = RING
            if d2 <= r_ring_in * r_ring_in:
                r, g, b = BG
            if d2 <= r_inner * r_inner:
                r, g, b = INNER
            hdx, hdy = x - hi_cx, y - hi_cy
            if hdx * hdx + hdy * hdy <= r_hi * r_hi:
                r, g, b = HILITE
            raw += bytes((r, g, b, 255))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", idat) + _chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size, "x", size)


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(here, "icons")
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, "icon-192.png"), 192)
    write_png(os.path.join(out, "icon-512.png"), 512)
    write_png(os.path.join(out, "apple-touch-icon-180.png"), 180)


if __name__ == "__main__":
    main()
