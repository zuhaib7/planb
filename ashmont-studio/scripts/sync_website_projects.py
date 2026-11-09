#!/usr/bin/env python3
"""
Sync portfolio data from ashmont.com.sa into the app.

Reads every page under /projects, extracts the published fields (programme,
services, built-up area, land area, location) and the introduction, and
downloads the hero and gallery images as optimised WebP.

Writes:
  src/content/projects.website.json      (generated; do not edit by hand)
  src/assets/images/projects/<slug>/*.webp

Deliberately NOT imported (see docs/open-items.md):
  - "Construction Date": several dates conflict with the project drive
    (postponed projects still show future or past dates).
  - Award claims in introductions: need evidence on file before publishing.

Usage (from ashmont-studio/):  python3 -I scripts/sync_website_projects.py
Requires: Pillow.
"""
from __future__ import annotations

import io
import json
import re
import sys
import time
import urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image

BASE = "https://ashmont.com.sa"
UA = "AshmontStudioSync/1.0 (+https://www.ashmont.com.sa)"
ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "src/content/projects.website.json"
OUT_IMG = ROOT / "src/assets/images/projects"

HERO_W, THUMB_W, GALLERY_W = 1600, 640, 1280
MAX_GALLERY = 6
QUALITY = 70

# Image classes on the project template that belong to THIS project.
OWN_IMAGE_CLASSES = ("project_hero_image", "project_photo_1", "photo_trio_large", "photo_trio_small", "gallery_image")

# Sentences that make claims we may not publish without evidence.
CLAIM_PATTERNS = [re.compile(p, re.I) for p in (r"award", r"top three", r"recogni[sz]ed as")]

FIELD_LABELS = {
    "Programme:": "programme",
    "Services:": "services",
    "Built-Up Area:": "builtUpArea",
    "Land Area:": "landArea",
    "Location:": "location",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception:  # noqa: BLE001 - retry any network error
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


class TextAndImages(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.text: list[str] = []
        self.images: list[tuple[str, str]] = []  # (class, src)
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style", "noscript", "svg"):
            self._skip += 1
        if tag == "img" and a.get("src"):
            self.images.append((a.get("class") or "", a["src"]))

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip and data.strip() and data.strip() != "‍":
            self.text.append(data.strip())


def parse_area(value: str) -> int | None:
    digits = re.sub(r"[^\d]", "", value)
    return int(digits) if digits else None


def clean_intro(parts: list[str]) -> str:
    text = " ".join(parts)
    text = re.sub(r"\s+([,.;:])", r"\1", re.sub(r"\s+", " ", text)).strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    kept = [s for s in sentences if not any(p.search(s) for p in CLAIM_PATTERNS)]
    # Keep the introduction short: the first two sentences that survive.
    return " ".join(kept[:2]).strip()


def save_webp(data: bytes, dest: Path, width: int) -> int:
    with Image.open(io.BytesIO(data)) as im:
        im = im.convert("RGB")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, "WEBP", quality=QUALITY, method=6)
        return dest.stat().st_size


def main() -> int:
    listing = fetch(f"{BASE}/projects").decode("utf-8")
    slugs = sorted(set(re.findall(r'href="/projects/([a-z0-9-]+)"', listing)))
    if not slugs:
        print("No projects found; the site structure may have changed.", file=sys.stderr)
        return 1

    projects = []
    total_bytes = 0
    for slug in slugs:
        page = TextAndImages()
        page.feed(fetch(f"{BASE}/projects/{slug}").decode("utf-8"))
        t = page.text
        if "Introduction" not in t or "Programme:" not in t:
            print(f"skip {slug}: template not recognised", file=sys.stderr)
            continue
        intro_at = len(t) - 1 - t[::-1].index("Introduction")
        fields = {key: t[t.index(label) + 1] for label, key in FIELD_LABELS.items() if label in t}

        own = []
        for cls, src in page.images:
            if any(c in cls.split() for c in OWN_IMAGE_CLASSES) and src not in own:
                own.append(src)
        if not own:
            print(f"skip {slug}: no images", file=sys.stderr)
            continue

        img_dir = OUT_IMG / slug
        for old in img_dir.glob("*.webp") if img_dir.exists() else []:
            old.unlink()
        hero_bytes = fetch(own[0])
        total_bytes += save_webp(hero_bytes, img_dir / "hero.webp", HERO_W)
        total_bytes += save_webp(hero_bytes, img_dir / "thumb.webp", THUMB_W)
        gallery = []
        for i, src in enumerate(own[1 : MAX_GALLERY + 1], start=1):
            name = f"gallery-{i}.webp"
            total_bytes += save_webp(fetch(src), img_dir / name, GALLERY_W)
            gallery.append(name)

        projects.append(
            {
                "slug": slug,
                "name": t[intro_at - 2],
                "location": fields.get("location", t[intro_at - 1]),
                "programme": fields.get("programme", ""),
                "services": fields.get("services", ""),
                "builtUpArea": parse_area(fields.get("builtUpArea", "")),
                "landArea": parse_area(fields.get("landArea", "")),
                "summary": clean_intro(t[intro_at + 1 : t.index("Programme:")]),
                "gallery": gallery,
                "sourceUrl": f"{BASE}/projects/{slug}",
            }
        )
        print(f"ok   {slug}: {1 + len(gallery)} images")

    OUT_JSON.write_text(
        json.dumps({"source": BASE, "syncedOn": date.today().isoformat(), "projects": projects}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\n{len(projects)} projects, images {total_bytes / 1_048_576:.1f} MB -> {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
