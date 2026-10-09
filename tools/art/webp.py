#!/usr/bin/env python3
"""Rampart Riot - make WebP copies of every sprite atlas page (assets/sprites/*.png -> *.webp).
The game loads the .webp pages when the browser can decode WebP (all current browsers) and falls back to PNG.
Run after any `node tools/art/export.mjs ...`:  python3 tools/art/webp.py [set ...]"""
import os, sys, glob
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sets = sys.argv[1:]
tot0 = tot1 = 0
for src in sorted(glob.glob(os.path.join(ROOT, 'assets', 'sprites', '*.png'))):
    base = os.path.basename(src)[:-4]
    if sets and base.rsplit('_', 1)[0] not in sets:
        continue
    dst = src[:-4] + '.webp'
    Image.open(src).save(dst, 'WEBP', quality=88, method=6, alpha_quality=90)
    a, b = os.path.getsize(src), os.path.getsize(dst)
    tot0 += a; tot1 += b
    print(f'{base}: {a // 1024} KB -> {b // 1024} KB')
print(f'total {tot0 // 1024} KB -> {tot1 // 1024} KB')
