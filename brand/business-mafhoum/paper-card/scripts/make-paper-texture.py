#!/usr/bin/env python3
"""Generate the master wrinkled-paper texture for بيزنس مفهوم.

Crumpled-then-flattened paper = a height field built from
  1. long fold facets  (|d| ramps  -> broad light/shade planes),
  2. short sharp creases (tapered ridge/valley lines),
  3. low-frequency undulation (the sheet never lies perfectly flat),
  4. fine fibre grain,
then lit from the top-left (matches the shadow falling down) and tinted to
Cream #F5F0E8. Seeded, so the texture is byte-stable: every template that
reuses assets/paper-texture.jpg gets the exact same sheet.

Output is 2x the card's CSS size (900 x 1000 -> 1800 x 2000) so the 4K
(2160x3840, DPR 2) render stays sharp.

Usage: python3 scripts/make-paper-texture.py [--seed 7] [--out assets/paper-texture.jpg]
"""

import argparse

import numpy as np
from PIL import Image

W, H = 1800, 2000
CREAM = np.array([0xF5, 0xF0, 0xE8], dtype=np.float64)


def value_noise(rng, h, w, cell):
    """Smooth value noise: random grid, bicubic-upsampled."""
    gh, gw = h // cell + 3, w // cell + 3
    grid = rng.standard_normal((gh, gw)).astype(np.float32)
    img = Image.fromarray(grid, mode="F").resize((gw * cell, gh * cell), Image.BICUBIC)
    return np.asarray(img, dtype=np.float64)[cell : cell + h, cell : cell + w]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="assets/paper-texture.jpg")
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    hgt = np.zeros((H, W))

    # 1. Fold facets: lines crossing the whole sheet; |d| makes a crease with
    #    a plane tilted each side. Small amplitude = "flattened afterwards".
    for _ in range(14):
        cx, cy = rng.uniform(0, W), rng.uniform(0, H)
        ang = rng.uniform(0, np.pi)
        nx, ny = np.cos(ang), np.sin(ang)
        d = (xx - cx) * nx + (yy - cy) * ny
        amp = rng.uniform(0.014, 0.034) * rng.choice([-1, 1])
        hgt += amp * np.abs(d)

    # 2. Short creases: tapered ridges/valleys along random segments.
    for _ in range(120):
        cx, cy = rng.uniform(-100, W + 100), rng.uniform(-100, H + 100)
        ang = rng.uniform(0, np.pi)
        nx, ny = np.cos(ang), np.sin(ang)
        t = (xx - cx) * -ny + (yy - cy) * nx  # along the crease
        half = rng.uniform(80, 520)
        bend = rng.uniform(-1, 1) / (half * 14)  # creases are never ruler-straight
        d = (xx - cx) * nx + (yy - cy) * ny + bend * t * t  # across the crease
        taper = np.clip(1 - (t / half) ** 2, 0, 1) ** 1.5
        width = rng.uniform(2.5, 12)
        amp = rng.uniform(1.5, 7.0) * rng.choice([-1, 1])
        # asymmetric profile: sharp on one side, soft on the other (real paper)
        soft = width * rng.uniform(1.8, 3.5)
        prof = np.exp(-np.where(d > 0, d / width, -d / soft).clip(0, 50))
        hgt += amp * prof * taper

    # 2b. Crumple micro-network: ridged noise (1 - |n|) draws an organic web
    #     of small wrinkles between the big creases.
    for cell, amp in ((70, 1.1), (30, 0.5)):
        n = value_noise(rng, H, W, cell)
        n /= np.abs(n).max()
        hgt += amp * (1 - np.abs(n)) ** 3

    # 3. Low-frequency undulation.
    hgt += 9.0 * value_noise(rng, H, W, 420)
    hgt += 3.0 * value_noise(rng, H, W, 140)

    # Lighting from top-left, slightly raking.
    gy, gx = np.gradient(hgt)
    nz = np.ones_like(hgt)
    norm = np.sqrt(gx * gx + gy * gy + nz * nz)
    L = np.array([-0.55, -0.65, 0.52])
    L /= np.linalg.norm(L)
    shade = (-gx * L[0] - gy * L[1] + nz * L[2]) / norm
    shade = shade - np.median(shade)
    shade = np.tanh(shade * 3.0) * 0.16  # +/-16% brightness, soft-clipped

    # 4. Fibre grain (fine, very subtle) + edge falloff.
    grain = 0.012 * value_noise(rng, H, W, 3) + 0.008 * rng.standard_normal((H, W))
    ex = np.minimum(xx, W - 1 - xx) / 60.0
    ey = np.minimum(yy, H - 1 - yy) / 60.0
    edge = -0.035 * np.exp(-np.minimum(ex, ey))

    lum = 1.0 + shade + grain + edge
    # Shadows go slightly warm-grey, never yellow: blend toward a neutral grey
    # instead of scaling the cream's chroma.
    rgb = CREAM[None, None, :] * lum[..., None]
    grey = np.array([0xE6, 0xE2, 0xDC], dtype=np.float64)
    dark = np.clip(-shade * 4, 0, 1)[..., None] * 0.12
    rgb = rgb * (1 - dark) + grey * lum[..., None] * dark
    # Lock the tone: the median pixel of the sheet is exactly Cream #F5F0E8,
    # so crease shading reads as light and shadow, never as a darker paper.
    rgb = rgb * (CREAM / np.median(rgb.reshape(-1, 3), axis=0))[None, None, :]
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)

    Image.fromarray(rgb, "RGB").save(args.out, quality=86, subsampling=0, optimize=True)
    mean = rgb.reshape(-1, 3).mean(axis=0)
    print(f"wrote {args.out} {W}x{H}  mean RGB = {mean.round(1)} (target F5F0E8 = 245,240,232)")


if __name__ == "__main__":
    main()
