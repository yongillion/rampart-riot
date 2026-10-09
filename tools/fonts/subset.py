#!/usr/bin/env python3
"""Rampart Riot - build the bundled web fonts.

Subsets Noto Sans CJK KR / Noto Serif CJK KR (SIL Open Font License 1.1) down to the characters the game
actually uses (every string in js/), plus ASCII and common punctuation, and writes WOFF files to assets/fonts/.
Re-run after changing any text:  python3 tools/fonts/subset.py
"""
import os, re, glob
from fontTools.ttLib import TTCollection
from fontTools import subset

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = '/usr/share/fonts/opentype/noto'
FONTS = [  # (source collection, output name, new family name, style)
    ('NotoSansCJK-Bold.ttc', 'rr-sans-bold.woff', 'RR Sans', 'Bold'),
    ('NotoSansCJK-Black.ttc', 'rr-sans-black.woff', 'RR Sans', 'Black'),
    ('NotoSerifCJK-SemiBold.ttc', 'rr-serif.woff', 'RR Serif', 'SemiBold'),
    ('NotoSerifCJK-Black.ttc', 'rr-display.woff', 'RR Display', 'Black'),
]

def used_chars():
    chars = set(chr(c) for c in range(0x20, 0x7F))
    chars |= set('—–…·•“”‘’«»°×÷±←→↑↓▸▾▴◂★☆♥♪「」『』《》〈〉、。！？：；（）～ⅠⅡⅢⅣⅤ')
    for f in glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True):
        with open(f, encoding='utf-8') as fh:
            for ch in fh.read():
                if ord(ch) > 0x7F:
                    chars.add(ch)
    return chars

def kr_font(path):
    coll = TTCollection(path)
    for font in coll.fonts:
        name = font['name'].getDebugName(1) or ''
        if ' KR' in name or name.endswith('KR'):
            return font
    raise SystemExit('no KR face in ' + path)

def main():
    chars = used_chars()
    text = ''.join(sorted(chars))
    print(f'{len(chars)} distinct characters')
    os.makedirs(os.path.join(ROOT, 'assets', 'fonts'), exist_ok=True)
    notices = set()
    for src, out, fam, style in FONTS:
        font = kr_font(os.path.join(SRC, src))
        notices.add(font['name'].getDebugName(0) or '')
        opts = subset.Options()
        opts.flavor = 'woff'
        opts.with_zopfli = False
        opts.hinting = False
        opts.desubroutinize = True
        opts.layout_features = ['kern', 'liga', 'calt', 'locl', 'ccmp', 'palt', 'vert']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        sub = subset.Subsetter(options=opts)
        sub.populate(text=text)
        sub.subset(font)
        # a Modified Version under the OFL: give it its own names (no Reserved Font Name)
        nm = font['name']
        for rec in list(nm.names):
            if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 21, 22):
                nm.removeNames(nameID=rec.nameID)
        full = f'{fam} {style}'
        for nid, val in ((1, fam), (2, 'Regular' if style not in ('Bold',) else 'Bold'), (3, f'RampartRiot:{fam.replace(" ", "")}-{style}'), (4, full), (6, f'{fam.replace(" ", "")}-{style}'), (16, fam), (17, style)):
            nm.setName(val, nid, 3, 1, 0x409)
        dst = os.path.join(ROOT, 'assets', 'fonts', out)
        font.flavor = 'woff'
        font.save(dst)
        print(f'{out}: {os.path.getsize(dst) // 1024} KB')
    print('source copyright notices:'); [print('  ', n) for n in sorted(notices)]

if __name__ == '__main__':
    main()
