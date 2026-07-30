#!/usr/bin/env python3
"""Build LoansFlow option-D production assets from docs/logo-options/option-d.png."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "logo-options" / "option-d.png"
OUT = ROOT / "public" / "img"


def fit_square(im: Image.Image, size: int, bg=(7, 16, 24, 255)) -> Image.Image:
    """Center-crop to square then resize (keeps wordmark centered)."""
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = im.crop((left, top, left + side, top + side))
    if cropped.mode != "RGBA":
        cropped = cropped.convert("RGBA")
    out = Image.new("RGBA", (size, size), bg)
    resized = cropped.resize((size, size), Image.Resampling.LANCZOS)
    out.paste(resized, (0, 0), resized)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGBA")
    print(f"source: {SRC} {im.size} {im.mode}")

    # Full wordmark PNG (dark ink bg) for og / general use
    # Trim excessive empty margins while keeping some padding
    w, h = im.size
    # Keep as-is but optimize; also produce a tighter crop around content
    bbox = im.getbbox()
    if bbox:
        pad = 48
        l, t, r, b = bbox
        l = max(0, l - pad)
        t = max(0, t - pad)
        r = min(w, r + pad)
        b = min(h, b + pad)
        tight = im.crop((l, t, r, b))
    else:
        tight = im

    logo = tight.copy()
    # Cap width ~960 for web
    if logo.width > 960:
        ratio = 960 / logo.width
        logo = logo.resize((960, max(1, int(logo.height * ratio))), Image.Resampling.LANCZOS)
    logo_path = OUT / "logo.png"
    logo.save(logo_path, "PNG", optimize=True)
    print(f"wrote {logo_path} {logo.size}")

    # Nav-sized PNG (~240w)
    nav = logo.copy()
    nav_w = 240
    nav = nav.resize((nav_w, max(1, int(nav.height * (nav_w / nav.width)))), Image.Resampling.LANCZOS)
    nav_path = OUT / "logo-nav.png"
    nav.save(nav_path, "PNG", optimize=True)
    print(f"wrote {nav_path} {nav.size}")

    fav32 = fit_square(im, 32)
    fav32.save(OUT / "favicon-32.png", "PNG", optimize=True)
    print(f"wrote favicon-32 {fav32.size}")

    apple = fit_square(im, 180)
    apple.save(OUT / "apple-touch-180.png", "PNG", optimize=True)
    print(f"wrote apple-touch-180 {apple.size}")

    # Also write root-friendly copies under public/
    pub = ROOT / "public"
    fav32.save(pub / "favicon-32.png", "PNG", optimize=True)
    apple.save(pub / "apple-touch-icon.png", "PNG", optimize=True)
    print("done")


if __name__ == "__main__":
    main()
