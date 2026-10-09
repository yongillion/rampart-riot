"""Main title - "The Great Rampart".

D minor, 88 bpm, 32-bar loop (87.3 s):
  1-4   horn call: the head motif sequenced down D-C-Bb-A (i-VII-VI-V)
  5-12  Rampart theme on horns over driving strings, choir 'oh'
  13-20 theme in violins+trumpets, horn countermelody, choir 'ah', taiko
  21-28 lift to F major: the Oath theme, broad (violins + horns 8vb), harp
  29-32 bridge: head motif in low brass, rising string runs, rolls -> bar 1
"""
from ..score import Score
from .common import (RAMPART_MINOR, RAMPART_MINOR_CH, OATH8_F, OATH8_F_CH, drive8, ost16, arp,
                     prog_apply, root_at, bassline)

INTRO = ['Dm', 'C', 'Bb', 'A']
HORN_COUNTER = ("A3:h. D4:q | D4:h Bb3:h | D4:h. F4:q | E4:h C#4:h | D4:h F4:h | F4:h. E4:q | "
                "D4:h C#4:h | D4:w")
ALTO = ("A4:q F5:q. E5:e D5:q | D5:h. F5:q | D5:q. F5:e Eb5:q D5:q | C#5:h. E4:q | "
        "A4:q F5:q. E5:e D5:q | F5:h. E5:q | G5:q F5:q E5:q C#5:q | F4:w")


def build():
    sc = Score('title', bpm=88, bars=32, loop=True, tail=3.5, lufs=-16.0, seed=11, rt60=2.7)
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas')
    vc = sc.part('vc', 'cellos', gain=-2.0)
    cb = sc.part('cb', 'basses')
    hn = sc.part('hn', 'horns')
    tpt = sc.part('tpt', 'trumpets')
    tbn = sc.part('tbn', 'trombones')
    tba = sc.part('tba', 'tuba')
    ch = sc.part('ch', 'choir', gain=-6.5)
    ti = sc.part('ti', 'timpani')
    bd = sc.part('bd', 'bassdrum')
    tk = sc.part('tk', 'taiko', gain=-5.0)
    cym = sc.part('cym', 'cymbal')
    sn = sc.part('sn', 'snare', gain=-6.0)
    hp = sc.part('hp', 'harp')
    cel = sc.part('cel', 'celesta', gain=2.0)

    # ------------------------------------------------------------ 1-4 intro
    hn.seq(1, "D4:q A4:q. G4:e F4:q | C4:q G4:q. F4:e E4:q | Bb3:q F4:q. Eb4:e D4:q | A3:q E4:q. D4:e C#4:q",
           vel=0.8, art='legato', legato=True, dyn=[(0, 0.8), (16, 0.95)], slur=False)
    tbn.seq(1, "D3:q A3:q. G3:e F3:q | C3:q G3:q. F3:e E3:q | Bb2:q F3:q. Eb3:e D3:q | A2:q E3:q. D3:e C#3:q",
            vel=0.74, art='legato', legato=True, dyn=[(0, 0.76), (16, 0.85)], slur=False)
    for i, s in enumerate(INTRO):
        b = 1 + i
        drive8(vc, b, s, lo='A2', vel=0.66)
        cb.note(b, 0, 2, root_at(s, 'A1'), 0.7, 'marcato')
        cb.note(b, 2, 2, root_at(s, 'A1'), 0.62, 'marcato')
        ost16(va, b, s, 'A3', vel=0.5 + 0.03 * i)
    vn1.pad(1, INTRO, 'A4', 'F5', n=2, vel=0.6, art='tremolo', dyn=[(0, 0.62), (16, 0.72)])
    vn2.pad(1, INTRO, 'D4', 'A4', n=2, vel=0.6, art='tremolo', dyn=[(0, 0.6), (16, 0.7)])
    ch.pad(1, INTRO, 'D3', 'E5', n=4, spread=1, vel=0.7, dyn=[(0, 0.72), (16, 0.75)], vowel='a')
    tba.seq(1, "D2:w | C2:w | Bb1:w | A1:w", vel=0.62, art='sustain', dyn=[(0, 0.62), (16, 0.75)])
    for b, (p1, p2) in enumerate([('D3', 'A2'), ('C3', 'G2'), ('Bb2', 'F2')], start=1):
        ti.hit(b, 0, pitch=p1, vel=0.85)
        ti.hit(b, 2, pitch=p2, vel=0.6)
        ti.hit(b, 3.5, pitch=p1, vel=0.55)
    ti.roll(4, 0, 4, 0.35, 0.95, pitch='A2')
    bd.hit(1, 0, vel=0.95)
    tk.hit(1, 0, 'odaiko', vel=0.9)
    bd.hit(3, 0, vel=0.8)
    cym.hit(1, 0, 'crash', vel=0.85)
    cym.note(4, 0, 4, 60, 0.8, 'swell', human=False)
    sn.roll(4, 0, 4, 0.2, 0.75)

    # ------------------------------------------------------------ 5-12 theme on horns
    hn.seq(5, RAMPART_MINOR, vel=0.85, art='legato', legato=True, slur=False,
           dyn=[(0, 0.82), (12, 0.9), (16, 0.84), (22, 0.96), (28, 0.88), (32, 0.82)])

    def rhythm_section(b, bt, sym, bts, energy):
        drive8(vc, b, sym, lo='A2', vel=0.6 + 0.08 * energy, beats=bts, beat=bt)
        r = root_at(sym, 'A1')
        if bts >= 2:
            for k in range(int(bts // 2)):
                cb.note(b, bt + 2 * k, 2, r, 0.62 + 0.08 * energy, 'marcato')
        else:
            cb.note(b, bt, bts, r, 0.62 + 0.08 * energy, 'marcato')
        ost16(va, b, sym, 'A3', vel=0.48 + 0.06 * energy, beats=bts, beat=bt)

    prog_apply(RAMPART_MINOR_CH, 5, lambda b, bt, s, bts: rhythm_section(b, bt, s, bts, 0))
    vn1.pad(5, RAMPART_MINOR_CH, 'A4', 'A5', n=2, vel=0.42, art='tremolo')
    vn2.pad(5, RAMPART_MINOR_CH, 'D4', 'A4', n=2, vel=0.4, art='tremolo')
    ch.pad(5, RAMPART_MINOR_CH, 'D3', 'E5', n=4, spread=1, vel=0.5, vowel='o', dyn=[(0, 0.5), (20, 0.6), (32, 0.5)])
    bassline(tba, 5, RAMPART_MINOR_CH, lo='A1', vel=0.5, art='sustain')
    for b in range(5, 13):
        ti.hit(b, 0, pitch='D3' if b % 2 else 'A2', vel=0.78)
        if b % 2 == 0:
            ti.hit(b, 3, pitch='A2', vel=0.5)
            ti.hit(b, 3.5, pitch='A2', vel=0.55)
        if b % 2 == 1:
            bd.hit(b, 0, vel=0.7)
    cym.hit(5, 0, 'crash', vel=0.8)
    cym.note(12, 2, 2, 60, 0.6, 'swell', human=False)
    ti.roll(12, 2, 2, 0.4, 0.85, pitch='A2')

    # ------------------------------------------------------------ 13-20 full statement
    vn1.seq(13, RAMPART_MINOR, tr=12, vel=0.82, art='legato', legato=True,
            dyn=[(0, 0.82), (20, 0.95), (32, 0.85)])
    vn2.seq(13, ALTO, vel=0.72, art='legato', legato=True, dyn=[(0, 0.72), (20, 0.85), (32, 0.75)])
    tpt.seq(13, RAMPART_MINOR, vel=0.72, art='legato', legato=True, slur=False,
            dyn=[(0, 0.7), (20, 0.85), (32, 0.75)])
    hn.seq(13, HORN_COUNTER, vel=0.78, art='legato', legato=True, dyn=[(0, 0.78), (20, 0.88), (32, 0.8)])
    prog_apply(RAMPART_MINOR_CH, 13, lambda b, bt, s, bts: rhythm_section(b, bt, s, bts, 1))

    def low_brass(b, bt, sym, bts):
        r = root_at(sym, 'E2')
        tbn.note(b, bt, bts, r, 0.62, 'marcato')
        tbn.note(b, bt, bts, r + 7 if r + 7 <= 57 else r - 5, 0.55, 'marcato')
        tba.note(b, bt, bts, root_at(sym, 'A1'), 0.65, 'sustain')
    prog_apply(RAMPART_MINOR_CH, 13, low_brass)
    ch.pad(13, RAMPART_MINOR_CH, 'D3', 'G5', n=5, spread=2, vel=0.68, vowel='a', dyn=[(0, 0.66), (20, 0.78), (32, 0.7)])
    for b in range(13, 21):
        tk.pattern(b, "X..x..x.X..x.x..", art='chu', vel=0.72)
        tk.hit(b, 0, 'odaiko', vel=0.8)
        ti.pattern(b, "x...x...x...x.x.", art='hit', vel=0.7, pitch='D3' if b % 2 else 'A2')
    cym.hit(13, 0, 'crash', vel=0.9)
    cym.hit(17, 0, 'crash', vel=0.8)
    bd.hit(13, 0, vel=0.9)
    bd.hit(17, 0, vel=0.85)
    cym.note(20, 2, 2, 60, 0.5, 'swell', human=False)

    # ------------------------------------------------------------ 21-28 the Oath, F major
    vn1.seq(21, OATH8_F, vel=0.72, art='legato', legato=True,
            dyn=[(0, 0.7), (12, 0.8), (16, 0.92), (24, 0.82), (32, 0.7)])
    hn.seq(21, OATH8_F, tr=-12, vel=0.72, art='legato', legato=True,
           dyn=[(0, 0.7), (12, 0.8), (16, 0.9), (24, 0.8), (32, 0.7)])
    vn2.pad(21, OATH8_F_CH, 'F4', 'C5', n=2, vel=0.55, art='sustain', dyn=[(0, 0.5), (16, 0.7), (32, 0.55)])
    va.pad(21, OATH8_F_CH, 'C4', 'G4', n=2, vel=0.55, art='sustain', dyn=[(0, 0.5), (16, 0.7), (32, 0.55)])
    vc.seq(21, "F2:w | A2:w | Bb2:w | C3:w | Bb2:w | C3:w | G2:h C3:h | F2:w", vel=0.6, art='legato',
           legato=True, dyn=[(0, 0.58), (16, 0.72), (32, 0.6)])
    cb.seq(21, "F1:w | A1:w | Bb1:w | C2:w | Bb1:w | C2:w | G1:h C2:h | F1:w", vel=0.55, art='sustain')
    ch.pad(21, OATH8_F_CH, 'C3', 'D5', n=4, spread=1, vel=0.55, vowel='a', dyn=[(0, 0.5), (16, 0.72), (32, 0.55)])
    tbn.pad(25, OATH8_F_CH[4:], 'F2', 'D3', n=2, vel=0.45, art='sustain')
    tba.seq(25, "Bb1:w | C2:w | G1:h C2:h | F1:w", vel=0.45, art='sustain')

    def harp_arp(b, bt, sym, bts):
        arp(hp, b, sym, 'F2', (0, 1, 2, 3, 4, 5, 4, 3), step=0.5, vel=0.55, beats=bts, beat=bt)
        arp(cel, b, sym, 'F5', (0, 2, 1, 2), step=1.0, vel=0.45, beats=bts, beat=bt)
    prog_apply(OATH8_F_CH, 21, harp_arp)
    ti.roll(24, 0, 4, 0.25, 0.6, pitch='C3')
    ti.hit(25, 0, pitch='F2', vel=0.65)
    cym.note(24, 0, 4, 60, 0.45, 'swell', human=False)
    cym.hit(25, 0, 'sus', vel=0.6)
    ti.hit(27, 2, pitch='C3', vel=0.5)
    ti.hit(28, 0, pitch='F2', vel=0.55)

    # ------------------------------------------------------------ 29-32 bridge
    tbn.seq(29, "D3:q A3:q. G3:e F3:q | C3:q G3:q. F3:e E3:q | Bb2:q F3:q. Eb3:e D3:q | A2:q E3:q. D3:e C#3:q",
            vel=0.78, art='legato', legato=True, slur=False, dyn=[(0, 0.75), (16, 0.95)])
    tba.seq(29, "D2:w | C2:w | Bb1:w | A1:w", vel=0.6, art='sustain', dyn=[(0, 0.6), (16, 0.85)])
    hn.pad(29, INTRO, 'A3', 'A4', n=3, vel=0.6, art='sustain', dyn=[(0, 0.58), (16, 0.78)])
    runs = ["D5:s E5:s F5:s G5:s A5:s G5:s F5:s E5:s " * 2,
            "C5:s D5:s E5:s F5:s G5:s F5:s E5:s D5:s " * 2,
            "Bb4:s C5:s D5:s Eb5:s F5:s Eb5:s D5:s C5:s " * 2,
            "A4:s B4:s C#5:s D5:s E5:s F5:s G5:s A5:s A5:s B5:s C#6:s D6:s E6:s F6:s G6:s A6:s"]
    for i, r in enumerate(runs):
        vn1.seq(29 + i, r.strip(), vel=0.55 + 0.1 * i, art='spiccato', check=False)
    vn2.pad(29, INTRO, 'D4', 'A4', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.5), (16, 0.85)])
    for i, s in enumerate(INTRO):
        b = 29 + i
        drive8(vc, b, s, lo='A2', vel=0.66 + 0.04 * i)
        cb.note(b, 0, 2, root_at(s, 'A1'), 0.66 + 0.04 * i, 'marcato')
        cb.note(b, 2, 2, root_at(s, 'A1'), 0.62 + 0.04 * i, 'marcato')
        ost16(va, b, s, 'A3', vel=0.52 + 0.04 * i)
        if i < 3:
            ti.hit(b, 0, pitch=['D3', 'C3', 'Bb2'][i], vel=0.8)
            ti.hit(b, 2, pitch=['A2', 'G2', 'F2'][i], vel=0.65)
            tk.pattern(b, "X.......X...x.x.", art='chu', vel=0.7)
    ch.pad(29, INTRO, 'D3', 'E5', n=4, spread=1, vel=0.55, vowel='a', dyn=[(0, 0.58), (16, 0.74)])
    ti.roll(32, 0, 4, 0.4, 0.9, pitch='A2')
    sn.roll(32, 0, 4, 0.2, 0.68)
    cym.note(32, 0, 4, 60, 0.7, 'swell', human=False)
    tk.pattern(32, "x.x.x.x.xxxxXXXX", art='chu', vel=0.6)

    sc.cue('intro', sc.t(1))
    sc.cue('theme', sc.t(5))
    sc.cue('theme_full', sc.t(13))
    sc.cue('oath', sc.t(21))
    sc.cue('bridge', sc.t(29))
    return sc
