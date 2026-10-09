"""Chapter II battle - "Frostbound Pass".

E minor, 112 bpm, 48-bar loop (102.9 s). Cold and driving: galloping low
strings, steady taiko, icy celesta/glockenspiel arpeggios, high tremolo
strings and low brass.
  1-4   intro: gallop, ice arpeggios, low-brass swells
  5-12  "Frost march" melody on horns
  13-20 Rampart theme in E minor, trombones + tuba + horns
  21-28 soaring violin line over C-D-Bm-Em, women's choir 'oo'
  29-36 march melody in violins + trumpets, syncopated brass stabs
  37-44 Rampart theme tutti, choir
  45-48 dominant (B) pedal build, head motif on B -> bar 1
"""
from ..score import Score
from .common import (RAMPART_MINOR_CH, ostinato, groove, fill, prog_apply, root_at, arp, tr_chords,
                     bassline)

MX = ("E4:q. F#4:e G4:q B4:q | C5:h. B4:e A4:e | A4:q. B4:e C5:q E5:q | D#5:h. B4:q | "
      "E5:q. D5:e B4:q G4:q | A4:h. G4:e F#4:e | E4:q A4:q F#4:q D#4:q | E4:w")
MX_CH = ['Em', 'C', 'Am', 'B', 'Em', 'C', ('Am', 2), ('B7', 2), 'Em']
MX_H = ("B3:q. D4:e E4:q G4:q | G4:h. G4:e E4:e | E4:q. G4:e A4:q C5:q | B4:h. F#4:q | "
        "G4:q. B4:e G4:q E4:q | E4:h. E4:e C4:e | C4:q E4:q D#4:q B3:q | B3:w")
RAMP_E = ("E4:q B4:q. A4:e G4:q | A4:h. B4:q | C5:q. B4:e A4:q G4:q | F#4:h. B3:q | "
          "E4:q B4:q. A4:e G4:q | E5:h. D5:q | C5:q B4:q A4:q F#4:q | E4:w")
RAMP_E_CH = tr_chords(RAMPART_MINOR_CH, 2, sharps=True)
SOAR = ("G5:h. E5:q | F#5:h A5:h | B5:h. F#5:q | G5:w | E5:h. G5:q | A5:q. G5:e F#5:q D5:q | "
        "D#5:h F#5:h | B5:w")
SOAR_CH = ['C', 'D', 'Bm', 'Em', 'C', 'D', 'B', 'B7']


def build():
    sc = Score('battle2', bpm=112, bars=48, loop=True, tail=3.0, lufs=-16.0, seed=31, rt60=2.5,
               master=dict(level=True))
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-3.0)
    vc = sc.part('vc', 'cellos', gain=-1.5)
    cb = sc.part('cb', 'basses', gain=-1.0)
    hn = sc.part('hn', 'horns', gain=-3.0)
    tpt = sc.part('tpt', 'trumpets', gain=-6.5)
    tbn = sc.part('tbn', 'trombones', gain=-2.0)
    tba = sc.part('tba', 'tuba', gain=-2.0)
    ch = sc.part('ch', 'choir', gain=-7.0)
    cel = sc.part('cel', 'celesta', gain=-1.0)
    glk = sc.part('glk', 'glock', gain=-4.0)
    fl = sc.part('fl', 'flute', gain=-2.0)
    tk = sc.part('tk', 'taiko', gain=-5.0)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-4.0)
    sn = sc.part('sn', 'snare', gain=-6.0)
    cym = sc.part('cym', 'cymbal', gain=-3.0)

    def gallop(bar, chs, vel=0.62, cello=True, viola=False, kind=4, bass=True):
        def f(b, bt, s, bts):
            if cello:
                ostinato(vc, b, s, 'C2', vel=vel, beats=bts, beat=bt, kind=kind, accents=(0, 4, 8, 12))
            if viola:
                ostinato(va, b, s, 'B2', vel=vel * 0.8, beats=bts, beat=bt, kind=kind, accents=(0, 4, 8, 12))
            if bass:
                r = root_at(s, 'B0') if root_at(s, 'B0') >= 28 else root_at(s, 'B0') + 12
                for k in range(int(bts)):
                    cb.note(b, bt + k, 0.5, r, vel * (1.05 if k % 2 == 0 else 0.9), 'staccato')
        prog_apply(chs, bar, f)

    def ice(bar, chs, vel=0.5, lo='E5', pat=(0, 2, 1, 2, 3, 2, 1, 2), glock=False):
        def f(b, bt, s, bts):
            arp(cel, b, s, lo, pat, step=0.5, vel=vel, beats=bts, beat=bt)
            if glock:
                arp(glk, b, s, 'E6', (2, 0), step=2.0, vel=vel * 0.8, beats=bts, beat=bt)
        prog_apply(chs, bar, f)

    # ------------------------------------------------------------ 1-4 intro
    INTRO = ['Em', 'Em', 'C', 'B']
    gallop(1, INTRO, 0.7, viola=True)
    ch.pad(1, INTRO, 'E3', 'G5', n=4, spread=1, vel=0.6, vowel='a')
    ice(1, INTRO, 0.5, glock=True)
    vn1.pad(1, INTRO, 'E5', 'C6', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.5), (16, 0.6)])
    vn2.pad(1, INTRO, 'G4', 'E5', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.5), (16, 0.6)])
    tbn.seq(1, "E2,B2:h. r:q | E2,B2:h. r:q | C2,G2:h. r:q | B1,F#2:h. r:q", vel=0.7, art='swell')
    tba.seq(1, "E1:h. r:q | E1:h. r:q | C1:h. r:q | B0:h. r:q", vel=0.6, art='swell')
    hn.pad(1, INTRO, 'B3', 'B4', n=2, vel=0.72, art='sustain')
    groove(tk, 1, 'A2', vel=0.82, bars=4)
    bd.hit(1, 0, vel=0.85)
    cym.hit(1, 0, 'crash', vel=0.7)
    ti.pattern(1, "X.......X.......", pitch='E3', vel=0.8)
    ti.pattern(3, "X.......X.......", pitch='C3', vel=0.75)
    ti.roll(4, 2, 2, 0.4, 0.8, pitch='B2')

    # ------------------------------------------------------------ 5-12 frost march on horns
    hn.seq(5, MX, vel=0.8, art='legato', legato=True, slur=False,
           dyn=[(0, 0.78), (12, 0.86), (16, 0.82), (24, 0.88), (32, 0.8)])
    tbn.seq(9, "G3:q. B3:e G3:q E3:q | E3:h. E3:e C3:e | C3:q E3:q D#3:q B2:q | B2:w", vel=0.6,
            art='legato', legato=True)
    gallop(5, MX_CH, 0.62, viola=False)
    prog_apply(MX_CH, 5, lambda b, bt, s, bts: ostinato(va, b, s, 'B3', vel=0.45, beats=bts, beat=bt,
                                                          kind=1, step=0.5, accents=(0, 8)))
    ice(5, MX_CH, 0.42)
    vn1.pad(5, MX_CH, 'E5', 'C6', n=2, vel=0.4, art='tremolo')
    for b in range(5, 13):
        groove(tk, b, 'A', vel=0.78)
        if b % 2 == 1:
            bd.hit(b, 0, vel=0.65)
    bassline(tba, 5, MX_CH, lo='B0', vel=0.45, art='sustain')

    # ------------------------------------------------------------ 13-20 Rampart theme, low brass
    tbn.seq(13, RAMP_E, tr=-12, vel=0.82, art='legato', legato=True, slur=False,
            dyn=[(0, 0.8), (20, 0.9), (32, 0.84)])
    hn.seq(13, RAMP_E, vel=0.78, art='legato', legato=True, slur=False, dyn=[(0, 0.76), (20, 0.86), (32, 0.8)])
    bassline(tba, 13, RAMP_E_CH, lo='B0', vel=0.62, art='sustain')
    gallop(13, RAMP_E_CH, 0.64, viola=True)
    vn1.pad(13, RAMP_E_CH, 'E5', 'D6', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.48), (20, 0.66), (32, 0.55)])
    vn2.pad(13, RAMP_E_CH, 'G4', 'E5', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.48), (20, 0.62), (32, 0.55)])
    ice(13, RAMP_E_CH, 0.45, lo='B5', glock=True)
    for b in range(13, 21):
        groove(tk, b, 'A2', vel=0.82)
        bd.hit(b, 0, vel=0.7 if b % 2 else 0.55)
        ti.pattern(b, "X.......x.......", pitch='E3' if b % 2 else 'B2', vel=0.72)
    cym.hit(13, 0, 'crash', vel=0.8)
    cym.hit(17, 0, 'crash', vel=0.65)

    # ------------------------------------------------------------ 21-28 soaring violins
    vn1.seq(21, SOAR, vel=0.72, art='legato', legato=True, dyn=[(0, 0.68), (12, 0.8), (16, 0.76), (28, 0.86),
                                                                 (32, 0.8)])
    fl.seq(21, SOAR, vel=0.55, legato=True)
    vn2.pad(21, SOAR_CH, 'B3', 'G4', n=2, vel=0.5, art='tremolo')
    prog_apply(SOAR_CH, 21, lambda b, bt, s, bts: ostinato(va, b, s, 'B2', vel=0.48, beats=bts, beat=bt, kind=0))
    gallop(21, SOAR_CH, 0.56, kind=5)
    ch.pad(21, SOAR_CH, 'F#4', 'F#5', n=3, vel=0.5, vowel='u', dyn=[(0, 0.45), (28, 0.65), (32, 0.55)])
    hn.pad(25, SOAR_CH[4:], 'B3', 'B4', n=3, vel=0.5, art='sustain', dyn=[(0, 0.5), (16, 0.7)])
    ice(21, SOAR_CH, 0.42, lo='D5', pat=(0, 1, 2, 3, 2, 1, 2, 1))
    for b in range(21, 29):
        groove(tk, b, 'C', vel=0.74)
    cym.hit(21, 0, 'sus', vel=0.55)
    ti.roll(28, 0, 4, 0.3, 0.8, pitch='B2')
    sn.roll(28, 2, 2, 0.2, 0.6)

    # ------------------------------------------------------------ 29-36 march in violins/trumpets + stabs
    vn1.seq(29, MX, tr=12, vel=0.76, art='legato', legato=True, dyn=[(0, 0.74), (20, 0.84), (32, 0.78)])
    tpt.seq(29, MX, vel=0.66, art='legato', legato=True, slur=False)
    vn2.seq(29, MX_H, tr=12, vel=0.6, art='legato', legato=True)
    prog_apply(MX_CH, 29, lambda b, bt, s, bts: ostinato(va, b, s, 'B3', vel=0.52, beats=bts, beat=bt, kind=0))
    gallop(29, MX_CH, 0.66)

    def stabs(b, bt, s, bts):
        r = root_at(s, 'E3')
        for pos in (0.0, 0.75, 1.5, 2.5, 3.0):
            if pos < bts:
                hn.note(b, bt + pos, 0.5, r, 0.62, 'stab')
                hn.note(b, bt + pos, 0.5, r + 7 if r + 7 < 64 else r - 5, 0.58, 'stab')
                tbn.note(b, bt + pos, 0.5, root_at(s, 'E2'), 0.66, 'stab')
    prog_apply(MX_CH, 29, stabs)
    ch.pad(29, MX_CH, 'B4', 'G5', n=2, vel=0.45, vowel='u')
    for b in range(29, 37):
        groove(tk, b, 'B', vel=0.8)
        bd.hit(b, 0, vel=0.7)
    cym.hit(29, 0, 'crash', vel=0.8)
    glk.seq(29, "E6:h B6:h | C7:h. B6:q | A6:h C7:h | B6:w", vel=0.5)

    # ------------------------------------------------------------ 37-44 Rampart theme tutti
    vn1.seq(37, RAMP_E, tr=12, vel=0.82, art='legato', legato=True, dyn=[(0, 0.8), (20, 0.9), (32, 0.84)])
    hn.seq(37, RAMP_E, vel=0.84, art='legato', legato=True, slur=False, dyn=[(0, 0.82), (20, 0.9), (32, 0.84)])
    tpt.seq(37, RAMP_E, vel=0.66, art='legato', legato=True, slur=False)
    tbn.seq(37, RAMP_E, tr=-12, vel=0.75, art='legato', legato=True, slur=False)
    bassline(tba, 37, RAMP_E_CH, lo='B0', vel=0.66, art='sustain')
    vn2.pad(37, RAMP_E_CH, 'G4', 'E5', n=2, vel=0.58, art='tremolo')
    gallop(37, RAMP_E_CH, 0.68, viola=True)
    ch.pad(37, RAMP_E_CH, 'E3', 'G5', n=4, spread=1, vel=0.62, vowel='a')
    ice(37, RAMP_E_CH, 0.48, lo='B5', glock=True)
    for b in range(37, 45):
        groove(tk, b, 'B', vel=0.86)
        bd.hit(b, 0, vel=0.75)
        ti.pattern(b, "X...x...X...x.x.", pitch='E3' if b % 2 else 'B2', vel=0.68)
    cym.hit(37, 0, 'crash', vel=0.9)
    cym.hit(41, 0, 'crash', vel=0.75)

    # ------------------------------------------------------------ 45-48 dominant build -> bar 1
    OUT = ['B', 'B', 'C', 'B7']
    tbn.seq(45, "B2:q F#3:q. E3:e D#3:q | E3:h. F#3:q | C3:q G3:q. F#3:e E3:q | D#3:h. F#3:q", vel=0.84,
            art='legato', legato=True, slur=False, dyn=[(0, 0.76), (16, 0.84)])
    hn.seq(45, "B3:q F#4:q. E4:e D#4:q | E4:h. F#4:q | C4:q G4:q. F#4:e E4:q | D#4:h. F#4:q", vel=0.8,
           art='legato', legato=True, slur=False, dyn=[(0, 0.74), (16, 0.82)])
    tba.seq(45, "B0:w | B0:w | C1:w | B0:w", vel=0.66, art='sustain')
    gallop(45, OUT, 0.7, viola=True)
    vn1.pad(45, OUT, 'D#5', 'C6', n=2, vel=0.55, art='tremolo', dyn=[(0, 0.55), (16, 0.8)])
    vn2.pad(45, OUT, 'F#4', 'D#5', n=2, vel=0.55, art='tremolo', dyn=[(0, 0.55), (16, 0.78)])
    ch.pad(45, OUT, 'D#4', 'B4', n=3, vel=0.5, vowel='a', dyn=[(0, 0.5), (16, 0.72)])
    ice(45, OUT, 0.5, glock=True)
    groove(tk, 45, 'A2', vel=0.8, bars=3)
    fill(tk, 48, vel=0.72)
    ti.roll(48, 0, 4, 0.3, 0.68, pitch='B2')
    cym.note(48, 0, 4, 60, 0.42, 'swell', human=False)

    for name, b in [('intro', 1), ('march', 5), ('rampart', 13), ('soar', 21), ('march2', 29),
                    ('rampart_tutti', 37), ('build', 45)]:
        sc.cue(name, sc.t(b))
    return sc
