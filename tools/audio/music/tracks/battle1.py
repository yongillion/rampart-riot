"""Chapter I battle - "Greenmarch Stand".

D dorian, 120 bpm, 56-bar loop (112 s). Bright-heroic, steady energy for
gameplay: spiccato pedal ostinato, taiko grooves, horn melodies, the Rampart
head in low brass.
  1-4   rhythmic intro: ostinato, low-brass 3+3+2 stabs, taiko
  5-12  melody A on horns
  13-20 melody A in violins + trumpets, horns in thirds
  21-24 Rampart head in trombones/horns (D dorian / F lydian colour)
  25-32 melody B (lyrical, F-C-G-Am) horns + violins
  33-40 development: woodwind canon on melody A, build-up
  41-48 melody A tutti with choir
  49-56 melody B tutti, low-brass head on Am leads back to bar 1
"""
from ..score import Score
from .common import (ostinato, groove, fill, prog_apply, root_at, bassline)

MA = ("D4:q. E4:e F4:q A4:q | B4:h. A4:q | G4:q. F4:e E4:q D4:q | E4:h. C4:q | "
      "D4:q. E4:e F4:q A4:q | D5:h. B4:q | C5:q A4:q G4:q E4:q | D4:w")
HA = ("A3:q. C4:e D4:q F4:q | G4:h. F4:q | E4:q. D4:e C4:q A3:q | C4:h. G3:q | "
      "A3:q. C4:e D4:q F4:q | B4:h. G4:q | A4:q F4:q E4:q C4:q | A3:w")
MA_CH = ['Dm', 'G', 'Dm', 'C', 'Dm', 'G', ('F', 2), ('C', 2), 'Dm']
MB = ("A4:q. G4:e A4:q C5:q | G4:h E4:h | D4:q. E4:e G4:q B4:q | A4:h. E4:q | "
      "F4:q. G4:e A4:q C5:q | E5:h. D5:q | D5:q B4:q G4:q B4:q | A4:w")
HB = ("F4:q. E4:e F4:q A4:q | E4:h C4:h | B3:q. C4:e D4:q G4:q | E4:h. C4:q | "
      "C4:q. E4:e F4:q A4:q | C5:h. G4:q | B4:q G4:q D4:q G4:q | E4:w")
MB_CH = ['F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am']
HEAD = "D3:q A3:q. G3:e F3:q | G3:h. A3:q | F3:q C4:q. B3:e A3:q | G3:h. E3:q"
HEAD_CH = ['Dm', 'G', 'F', 'C']


def build():
    sc = Score('battle1', bpm=120, bars=56, loop=True, tail=3.0, lufs=-16.0, seed=21, rt60=2.3,
               master=dict(level=True))
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-3.0)
    vc = sc.part('vc', 'cellos', gain=-2.0)
    cb = sc.part('cb', 'basses')
    hn = sc.part('hn', 'horns', gain=-3.5)
    tpt = sc.part('tpt', 'trumpets', gain=-6.0)
    tbn = sc.part('tbn', 'trombones', gain=-3.0)
    tba = sc.part('tba', 'tuba')
    fl = sc.part('fl', 'flute')
    ob = sc.part('ob', 'oboe')
    cl = sc.part('cl', 'clarinet')
    ch = sc.part('ch', 'choir', gain=-8.0)
    tk = sc.part('tk', 'taiko', gain=-5.0)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-3.0)
    sn = sc.part('sn', 'snare', gain=-5.0)
    cym = sc.part('cym', 'cymbal', gain=-2.0)
    glk = sc.part('glk', 'glock', gain=-6.0)

    def strings_ost(bar, chs, vel_vc=0.62, vel_va=0.5, kind=0, va_on=True, vc_on=True):
        def f(b, bt, s, bts):
            if vc_on:
                ostinato(vc, b, s, 'A2', vel=vel_vc, beats=bts, beat=bt, kind=kind)
            if va_on:
                ostinato(va, b, s, 'A3', vel=vel_va, beats=bts, beat=bt, kind=kind)
        prog_apply(chs, bar, f)

    def basses(bar, chs, vel=0.62, rhythm='q8'):
        def f(b, bt, s, bts):
            r = root_at(s, 'A1')
            for k in range(int(bts)):
                if rhythm == 'q8':
                    cb.note(b, bt + k, 0.5, r, vel * (1.1 if k == 0 else 0.92), 'staccato')
                    if k % 2 == 1:
                        cb.note(b, bt + k + 0.5, 0.5, r, vel * 0.85, 'staccato')
                else:
                    cb.note(b, bt + k, 1.0, r, vel, 'marcato')
        prog_apply(chs, bar, f)

    def stabs332(bar, sym, vel=0.75, brass=True):
        # 3+3+2 eighth-note stabs in low brass
        r = root_at(sym, 'D3')
        for pos in (0.0, 1.5, 3.0):
            if brass:
                tbn.note(bar, pos, 0.5, r - 12, vel, 'stab')
                tbn.note(bar, pos, 0.5, r - 5, vel * 0.9, 'stab')
                tba.note(bar, pos, 0.5, root_at(sym, 'A1'), vel * 0.85, 'staccato')

    # ------------------------------------------------------------ 1-4 intro
    INTRO = ['Dm', 'Dm', 'C', 'Dm']
    strings_ost(1, INTRO, 0.68, 0.55)
    basses(1, INTRO, 0.66)
    for i, s in enumerate(INTRO):
        stabs332(1 + i, s, vel=0.72 + 0.03 * i)
        groove(tk, 1 + i, 'A2', vel=0.82)
    hn.pad(1, INTRO, 'A3', 'A4', n=2, vel=0.7, art='sustain', dyn=[(0, 0.72), (16, 0.78)])
    vn2.pad(1, INTRO, 'A4', 'F5', n=2, vel=0.6, art='tremolo', dyn=[(0, 0.62), (16, 0.68)])
    ch.pad(1, INTRO, 'D3', 'E5', n=4, spread=1, vel=0.62, vowel='a')
    for i, s in enumerate(INTRO):
        for pos in (0.0, 1.5, 3.0):
            tpt.note(1 + i, pos, 0.5, root_at(s, 'D4') + 7, 0.6, 'stab')
            tpt.note(1 + i, pos, 0.5, root_at(s, 'D4'), 0.58, 'stab')
    bd.hit(1, 0, vel=0.85)
    bd.hit(3, 0, vel=0.75)
    cym.hit(1, 0, 'crash', vel=0.75)
    ti.pattern(1, "X.......X.......", pitch='D3', vel=0.8)
    ti.pattern(2, "X.......X...x.x.", pitch='A2', vel=0.75)
    ti.pattern(3, "X.......X.......", pitch='C3', vel=0.75)
    ti.roll(4, 2, 2, 0.4, 0.8, pitch='A2')

    # ------------------------------------------------------------ 5-12 melody A (horns)
    hn.seq(5, MA, vel=0.78, art='legato', legato=True, slur=False,
           dyn=[(0, 0.76), (12, 0.84), (20, 0.82), (28, 0.86), (32, 0.78)])
    strings_ost(5, MA_CH, 0.6, 0.48)
    basses(5, MA_CH, 0.6)
    vn2.pad(5, MA_CH, 'A4', 'G5', n=2, vel=0.42, art='tremolo')
    for b in range(5, 13):
        groove(tk, b, 'A', vel=0.75)
        if b % 2 == 1:
            bd.hit(b, 0, vel=0.65)
    bassline(tba, 5, MA_CH, lo='A1', vel=0.45, art='sustain')

    # ------------------------------------------------------------ 13-20 melody A in violins/trumpets
    vn1.seq(13, MA, tr=12, vel=0.74, art='legato', legato=True, dyn=[(0, 0.72), (20, 0.82), (32, 0.75)])
    tpt.seq(13, MA, vel=0.68, art='legato', legato=True, slur=False, dyn=[(0, 0.66), (20, 0.76), (32, 0.7)])
    hn.seq(13, HA, vel=0.68, art='legato', legato=True, dyn=[(0, 0.66), (20, 0.76), (32, 0.7)])
    strings_ost(13, MA_CH, 0.64, 0.52)
    basses(13, MA_CH, 0.64)
    vn2.seq(13, HA, tr=12, vel=0.6, art='legato', legato=True)
    for b in range(13, 21):
        groove(tk, b, 'A2', vel=0.8)
        bd.hit(b, 0, vel=0.7 if b % 2 else 0.55)
    cym.hit(13, 0, 'crash', vel=0.75)
    sn.pattern(16, "....x.......x.xx", vel=0.55)
    sn.pattern(20, "x.x.x.x.xxxxxxxx", vel=0.6)
    glk.seq(13, "D6:h A6:h | B6:h. A6:q | G6:h D6:h | E6:h. C6:q", vel=0.5)

    # ------------------------------------------------------------ 21-24 Rampart head, low brass
    tbn.seq(21, HEAD, vel=0.84, art='legato', legato=True, slur=False, dyn=[(0, 0.82), (16, 0.9)])
    hn.seq(21, HEAD, tr=12, vel=0.8, art='legato', legato=True, slur=False)
    tba.seq(21, "D2:w | G1:w | F1:w | C2:w", vel=0.62, art='sustain')
    strings_ost(21, HEAD_CH, 0.66, 0.54)
    basses(21, HEAD_CH, 0.66)
    vn1.pad(21, HEAD_CH, 'D5', 'B5', n=2, vel=0.55, art='tremolo', dyn=[(0, 0.55), (16, 0.7)])
    vn2.pad(21, HEAD_CH, 'A4', 'E5', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.5), (16, 0.65)])
    for b in range(21, 25):
        groove(tk, b, 'B', vel=0.82)
        ti.pattern(b, "X.......X.......", pitch='D3' if b % 2 else 'A2', vel=0.8)
    cym.hit(21, 0, 'crash', vel=0.85)
    bd.hit(21, 0, vel=0.9)
    bd.hit(23, 0, vel=0.8)
    fill(tk, 24, vel=0.75, beat=2, beats=2)

    # ------------------------------------------------------------ 25-32 melody B
    hn.seq(25, MB, vel=0.76, art='legato', legato=True, dyn=[(0, 0.74), (20, 0.84), (32, 0.76)])
    vn1.seq(25, MB, tr=12, vel=0.68, art='legato', legato=True, dyn=[(0, 0.66), (20, 0.78), (32, 0.7)])
    vn2.seq(25, HB, tr=12, vel=0.56, art='legato', legato=True)
    strings_ost(25, MB_CH, 0.6, 0.48, kind=1, va_on=True, vc_on=False)

    def cello_line(b, bt, s, bts):
        r = root_at(s, 'C2')
        for k in range(int(bts)):
            vc.note(b, bt + k, 0.5, r, 0.62 if k % 2 == 0 else 0.55, 'staccato')
            vc.note(b, bt + k + 0.5, 0.5, r + 12 if k % 2 == 0 else r + 7, 0.5, 'staccato')
    prog_apply(MB_CH, 25, cello_line)
    basses(25, MB_CH, 0.58, rhythm='q')
    ch.pad(25, MB_CH, 'C3', 'D5', n=4, spread=1, vel=0.5, vowel='o')
    for b in range(25, 33):
        groove(tk, b, 'C', vel=0.72)
        if b % 2 == 1:
            bd.hit(b, 0, vel=0.6)
    cym.hit(25, 0, 'sus', vel=0.6)
    fl.seq(29, "r:h A5:q C6:q | E6:h. D6:q | D6:q B5:q G5:q B5:q | A5:w", vel=0.55, legato=True, check=False)

    # ------------------------------------------------------------ 33-40 development
    DEV = ['Dm', 'G', 'Dm', 'G', 'Dm', 'G', 'Am', 'C']
    for i, s in enumerate(DEV):
        b = 33 + i
        ostinato(va, b, s, 'A3', vel=0.52 + 0.02 * i, kind=0)
        if i >= 4:
            ostinato(vc, b, s, 'A2', vel=0.5 + 0.03 * i, kind=0)
        groove(tk, b, 'S' if i < 4 else 'A2', vel=0.6 + 0.03 * i)
    vc.seq(33, "D3:w | D3:w | D3:w | D3:w", vel=0.5, art='sustain')
    cb.seq(33, "D2:w | D2:w | D2:w | D2:w | D2:h D2:h | G1:h G1:h | A1:h A1:h | C2:h C2:h", vel=0.55,
           art='marcato')
    fl.seq(33, "D5:q. E5:e F5:q A5:q | B5:h. A5:q", vel=0.62, legato=True)
    ob.seq(35, "D5:q. E5:e F5:q A5:q | B5:h. A5:q", vel=0.62, legato=True)
    cl.seq(34, "A4:q. G4:e F4:q E4:q | D4:h. E4:q | F4:q. G4:e A4:q C5:q | B4:h. G4:q", vel=0.6, legato=True)
    fl.seq(37, "D6:q. E6:e F6:q A6:q | G6:h. E6:q | E6:q C6:q A5:q G5:q | E5:h. G5:q", vel=0.66, legato=True)
    ob.seq(37, "A5:h F5:h | D5:h. B4:q | C5:h A4:h | C5:h. E5:q", vel=0.6, legato=True)
    vn1.pad(33, DEV, 'A4', 'E5', n=2, vel=0.4, art='tremolo', dyn=[(0, 0.38), (16, 0.45), (32, 0.75)])
    vn2.pad(33, DEV, 'D4', 'A4', n=2, vel=0.4, art='tremolo', dyn=[(0, 0.38), (16, 0.45), (32, 0.7)])
    hn.pad(37, DEV[4:], 'A3', 'A4', n=3, vel=0.5, art='sustain', dyn=[(0, 0.5), (16, 0.8)])
    tbn.pad(39, DEV[6:], 'A2', 'E3', n=2, vel=0.5, art='swell')
    bd.hit(33, 0, vel=0.7)
    bd.hit(37, 0, vel=0.75)
    ti.roll(39, 0, 8, 0.25, 0.9, pitch='A2')
    sn.roll(40, 0, 4, 0.2, 0.75)
    cym.note(40, 0, 4, 60, 0.75, 'swell', human=False)
    fill(tk, 40, vel=0.85)

    # ------------------------------------------------------------ 41-48 melody A tutti
    vn1.seq(41, MA, tr=12, vel=0.8, art='legato', legato=True, dyn=[(0, 0.8), (20, 0.88), (32, 0.82)])
    hn.seq(41, MA, vel=0.82, art='legato', legato=True, slur=False, dyn=[(0, 0.8), (20, 0.88), (32, 0.82)])
    tpt.seq(41, MA, vel=0.7, art='legato', legato=True, slur=False)
    vn2.seq(41, HA, tr=12, vel=0.66, art='legato', legato=True)
    strings_ost(41, MA_CH, 0.68, 0.56)
    basses(41, MA_CH, 0.68)

    def lowbrass(b, bt, s, bts):
        r = root_at(s, 'E2')
        tbn.note(b, bt, bts, r, 0.58, 'marcato')
        tbn.note(b, bt, bts, r + 7, 0.52, 'marcato')
        tba.note(b, bt, bts, root_at(s, 'A1'), 0.6, 'sustain')
    prog_apply(MA_CH, 41, lowbrass)
    ch.pad(41, MA_CH, 'D3', 'E5', n=4, spread=1, vel=0.6, vowel='a')
    for b in range(41, 49):
        groove(tk, b, 'B', vel=0.85)
        bd.hit(b, 0, vel=0.75)
        ti.pattern(b, "X...x...X...x.x.", pitch='D3' if b % 2 else 'A2', vel=0.7)
    cym.hit(41, 0, 'crash', vel=0.9)
    cym.hit(45, 0, 'crash', vel=0.75)

    # ------------------------------------------------------------ 49-56 melody B tutti -> lead back
    vn1.seq(49, MB, tr=12, vel=0.8, art='legato', legato=True, dyn=[(0, 0.8), (20, 0.9), (32, 0.84)])
    hn.seq(49, MB, vel=0.8, art='legato', legato=True, dyn=[(0, 0.8), (20, 0.88), (32, 0.82)])
    tpt.seq(49, "A4:q. G4:e A4:q C5:q | G4:h E4:h | D4:q. E4:e G4:q B4:q | A4:h. E4:q | "
                "F4:q. G4:e A4:q C5:q | E5:h. D5:q", vel=0.68, art='legato', legato=True, slur=False)
    vn2.seq(49, HB, tr=12, vel=0.64, art='legato', legato=True)
    strings_ost(49, MB_CH, 0.68, 0.56, kind=0)
    basses(49, MB_CH, 0.68)
    prog_apply(MB_CH[:6], 49, lowbrass)
    tbn.seq(55, "G2:q D3:q. C3:e B2:q | A2:q E3:q. D3:e C3:q", vel=0.85, art='legato', legato=True, slur=False)
    tba.seq(55, "G1:w | A1:w", vel=0.65, art='sustain')
    ch.pad(49, MB_CH, 'C3', 'E5', n=4, spread=1, vel=0.62, vowel='a')
    for b in range(49, 56):
        groove(tk, b, 'B', vel=0.8)
        bd.hit(b, 0, vel=0.72)
    cym.hit(49, 0, 'crash', vel=0.85)
    fill(tk, 56, vel=0.74)
    ti.roll(56, 0, 4, 0.35, 0.7, pitch='A2')
    sn.roll(56, 2, 2, 0.25, 0.55)
    cym.note(56, 2, 2, 60, 0.42, 'swell', human=False)

    for name, b in [('intro', 1), ('melodyA', 5), ('melodyA2', 13), ('rampart', 21), ('melodyB', 25),
                    ('development', 33), ('tuttiA', 41), ('tuttiB', 49)]:
        sc.cue(name, sc.t(b))
    return sc
