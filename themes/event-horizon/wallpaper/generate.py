#!/usr/bin/env python3
"""Generate the Event Horizon wallpaper as SVG.

Usage: python3 generate.py [width] [height] > event-horizon.svg
Deterministic (seeded) so every machine gets the identical image.
"""
import math
import random
import sys

W = int(sys.argv[1]) if len(sys.argv) > 1 else 3840
H = int(sys.argv[2]) if len(sys.argv) > 2 else 2160
rng = random.Random(1915)  # year of general relativity

# Black hole sits right of centre so desktop icons on the left stay readable.
cx, cy = W * 0.62, H * 0.50
r = min(W, H) * 0.16          # shadow radius
disk_rx, disk_ry = r * 3.1, r * 0.62

def stars(n, max_r, alpha_range):
    out = []
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        # keep the shadow itself starless
        if math.hypot(x - cx, (y - cy)) < r * 1.05:
            continue
        rad = rng.uniform(0.4, max_r) * W / 3840
        a = rng.uniform(*alpha_range)
        tint = rng.choice(["#ffffff", "#ffffff", "#cfe3ff", "#ffe8c7", "#d9c8ff"])
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad:.2f}" fill="{tint}" opacity="{a:.2f}"/>')
    return "\n".join(out)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <radialGradient id="space" cx="{cx/W:.3f}" cy="{cy/H:.3f}" r="0.9">
    <stop offset="0" stop-color="#140d24"/>
    <stop offset="0.45" stop-color="#0a0814"/>
    <stop offset="1" stop-color="#030308"/>
  </radialGradient>
  <radialGradient id="nebulaV" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#7c4dff" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#7c4dff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="nebulaC" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#22d3ee" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="disk" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffb347" stop-opacity="0"/>
    <stop offset="0.12" stop-color="#ffd27a" stop-opacity="0.85"/>
    <stop offset="0.35" stop-color="#fff1d0"/>
    <stop offset="0.55" stop-color="#ffb347"/>
    <stop offset="0.8" stop-color="#d9431a" stop-opacity="0.7"/>
    <stop offset="1" stop-color="#9c2a10" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0.3" stop-color="#ff9a3c" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/>
  </radialGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="{r*0.06:.1f}"/>
  </filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="{r*0.015:.1f}"/>
  </filter>
  <clipPath id="front"><path d="M {cx-r*1.0:.1f} {cy:.1f} A {r:.1f} {r:.1f} 0 0 0 {cx+r*1.0:.1f} {cy:.1f} Z"/></clipPath>
</defs>

<rect width="{W}" height="{H}" fill="url(#space)"/>
<ellipse cx="{W*0.22:.0f}" cy="{H*0.30:.0f}" rx="{W*0.30:.0f}" ry="{H*0.35:.0f}" fill="url(#nebulaV)"/>
<ellipse cx="{W*0.85:.0f}" cy="{H*0.85:.0f}" rx="{W*0.25:.0f}" ry="{H*0.30:.0f}" fill="url(#nebulaC)"/>

<g>{stars(1400, 1.6, (0.15, 0.6))}</g>
<g filter="url(#soft)">{stars(60, 3.2, (0.5, 0.95))}</g>

<!-- outer glow -->
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r*3.2:.1f}" fill="url(#glow)"/>

<!-- lensed far side of the disk: bent up over the shadow -->
<g filter="url(#blur)" opacity="0.85">
  <ellipse cx="{cx:.1f}" cy="{cy-r*0.06:.1f}" rx="{r*1.22:.1f}" ry="{r*1.24:.1f}" fill="none" stroke="#ffb347" stroke-width="{r*0.16:.1f}"/>
</g>
<ellipse cx="{cx:.1f}" cy="{cy-r*0.06:.1f}" rx="{r*1.18:.1f}" ry="{r*1.20:.1f}" fill="none" stroke="#ffe2a8" stroke-width="{r*0.03:.1f}" opacity="0.8" filter="url(#soft)"/>

<!-- back half of disk -->
<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{disk_rx:.1f}" ry="{disk_ry:.1f}" fill="none" stroke="url(#disk)" stroke-width="{r*0.34:.1f}" filter="url(#blur)"/>
<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{disk_rx*0.92:.1f}" ry="{disk_ry*0.9:.1f}" fill="none" stroke="#fff1d0" stroke-width="{r*0.025:.1f}" opacity="0.3" filter="url(#soft)"/>

<!-- photon ring + shadow -->
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r*1.04:.1f}" fill="none" stroke="#fff4dc" stroke-width="{r*0.025:.1f}" filter="url(#soft)"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#000"/>

<!-- front half of disk crosses in front of the shadow -->
<g clip-path="url(#front)">
  <ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{disk_rx:.1f}" ry="{disk_ry:.1f}" fill="none" stroke="url(#disk)" stroke-width="{r*0.34:.1f}" filter="url(#blur)"/>
  <ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{disk_rx*0.92:.1f}" ry="{disk_ry*0.9:.1f}" fill="none" stroke="#fff1d0" stroke-width="{r*0.04:.1f}" opacity="0.8" filter="url(#soft)"/>
</g>

<!-- quiet signature, bottom-left -->
<text x="{W*0.04:.0f}" y="{H*0.94:.0f}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="{H*0.014:.0f}" letter-spacing="{H*0.004:.0f}" fill="#8b85a8" opacity="0.55">EVENT HORIZON  ·  1% BETTER EVERY DAY</text>
</svg>
'''
sys.stdout.write(svg)
