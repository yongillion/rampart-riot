"""Chapter III battle - "The Drowned Crown".

C minor / C phrygian, 104 bpm, 48-bar loop (110.8 s). Dark and eerie: low
spiccato ostinato with a b2 neighbour, col legno taps, a phrygian chant for
male choir, distant tolling bells, the Rampart theme in C minor.
  1-4   intro: pedal ostinato, col legno, distant bells, choir 'oo' cluster
  5-12  sunken chant (male choir 'oh' + bassoon/clarinet)
  13-20 Rampart theme in C minor on horns, tremolo strings, trombone swells
  21-28 eerie interlude: high tremolo clusters, col legno, viola ostinato
  29-36 chant tutti (SATB 'ah' + horns + trombones), heavier drums
  37-44 Rampart theme climax in low brass + trumpets, choir
  45-48 Db -> G turn-around back to bar 1
"""
from ..score import Score
from .common import (RAMPART_MINOR_CH, ostinato, groove, fill, prog_apply, root_at, tr_chords, bassline)

CHANT = ("C4:h Db4:q C4:q | Bb3:q. C4:e G3:h | Ab3:q Bb3:q C4:q Db4:q | C4:w | "
         "F4:h Eb4:q Db4:q | Eb4:h. C4:q | Db4:q C4:q Bb3:q Ab3:q | G3:w")
CHANT_CH = ['Cm', 'Cm', 'Db', 'Cm', 'Bbm', 'Ab', 'Db', 'G']
CHANT_LO = ("G3:h Ab3:q G3:q | F3:q. Eb3:e D3:h | F3:q F3:q Ab3:q Ab3:q | G3:w | "
            "Db4:h Bb3:q Bb3:q | C4:h. Ab3:q | Ab3:q Ab3:q F3:q F3:q | D3:w")
RAMP_C = ("C4:q G4:q. F4:e Eb4:q | F4:h. G4:q | Ab4:q. G4:e F4:q Eb4:q | D4:h. G3:q | "
          "C4:q G4:q. F4:e Eb4:q | C5:h. Bb4:q | Ab4:q G4:q F4:q D4:q | C4:w")
RAMP_C_CH = tr_chords(RAMPART_MINOR_CH, -2)
TAPS = ["x..x..x.x..x.x..", "x..x..x...x.x.x.", "x.xx..x.x..x..x.", "x..x.xx.x..x.xx."]


def build():
    sc = Score('battle3', bpm=104, bars=48, loop=True, tail=3.5, lufs=-16.0, seed=41, rt60=2.8,
               long_rt60=3.4, master=dict(level=True))
    vn1 = sc.part('vn1', 'violins', gain=-3.0)
    vn2 = sc.part('vn2', 'violins2')
    cl_vn = sc.part('colleg', 'violins', gain=1.0, pan=-0.35, hall=0.5)
    va = sc.part('va', 'violas', gain=-3.0)
    vc = sc.part('vc', 'cellos', gain=-1.5)
    cb = sc.part('cb', 'basses', gain=-1.0)
    hn = sc.part('hn', 'horns', gain=-3.0)
    tpt = sc.part('tpt', 'trumpets', gain=-7.0)
    tbn = sc.part('tbn', 'trombones', gain=-2.0)
    tba = sc.part('tba', 'tuba', gain=-2.0)
    ch = sc.part('ch', 'choir', gain=-5.0)
    chm = sc.part('chm', 'choir', gain=-2.5, width=0.8)
    bsn = sc.part('bsn', 'bassoon', gain=-1.0)
    cla = sc.part('cla', 'clarinet', gain=-2.0)
    bel = sc.part('bel', 'bells', gain=-9.0, dry=0.45, hall=0.15, long=0.9,
                  eq=[('highpass', 120, 0.7), ('lowpass', 4500, 0.7)])
    tk = sc.part('tk', 'taiko', gain=-5.0)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-3.0)
    tam = sc.part('tam', 'tamtam', gain=-6.0)
    cym = sc.part('cym', 'cymbal', gain=-5.0)

    def low_ost(bar, chs, vel=0.62, viola=False, kind=3):
        def f(b, bt, s, bts):
            ostinato(vc, b, s, 'C2', vel=vel, beats=bts, beat=bt, kind=kind, accents=(0, 6, 10))
            if viola:
                ostinato(va, b, s, 'C3', vel=vel * 0.8, beats=bts, beat=bt, kind=kind, accents=(0, 6, 10))
            r = root_at(s, 'C1')
            r = r + 12 if r < 28 else r
            for k in range(int(bts)):
                cb.note(b, bt + k, 0.5 if k % 2 else 1.0, r, vel * (1.1 if k == 0 else 0.85),
                        'staccato' if k % 2 else 'marcato')
        prog_apply(chs, bar, f)

    def taps(bar, nbars, sym_pitches=('G5', 'C6'), vel=0.6, var=0):
        for i in range(nbars):
            pat = TAPS[(i + var) % len(TAPS)]
            for k, chh in enumerate(pat):
                if chh == 'x':
                    p = sym_pitches[(k // 3) % len(sym_pitches)]
                    cl_vn.note(bar + i, k * 0.25, 0.25, p, vel * (1.15 if k == 0 else 1.0), 'colLegno')

    def tolls(bar, nbars, pitch='C3', vel=0.55, every=2):
        for b in range(bar, bar + nbars, every):
            bel.hit(b, 0, 'hit', vel=vel, pitch=pitch)

    # ------------------------------------------------------------ 1-4 intro
    low_ost(1, ['Cm', 'Cm', 'Db', 'Cm'], 0.64)
    taps(1, 4, vel=0.58)
    tolls(1, 4, 'C3', 0.6)
    ch.seq(1, "C4,Eb4,G4,D5:w | C4,Eb4,G4,D5:w | Db4,F4,Ab4,C5:w | C4,Eb4,G4,D5:w", vel=0.62, legato=True,
           vowel='u', dyn=[(0, 0.62), (16, 0.66)])
    hn.seq(1, "C3,G3:w | C3,G3:w | Db3,Ab3:w | C3,G3:w", vel=0.62, art='sustain', legato=True)
    ti.pattern(1, "X.....x...x.....", pitch='C3', vel=0.7)
    ti.pattern(3, "X.....x...x.....", pitch='C3', vel=0.7)
    tbn.seq(1, "C2,G2:w | C2,G2:h. r:q | Db2,Ab2:w | C2,G2:h. r:q", vel=0.7, art='swell')
    tba.seq(1, "C1:w | C1:h. r:q | Db1:w | C1:h. r:q", vel=0.55, art='swell')
    vn1.pad(1, ['Cm', 'Cm', 'Db', 'Cm'], 'G5', 'Eb6', n=2, vel=0.38, art='tremolo')
    for b in range(1, 5):
        tk.pattern(b, "X.....x...x.....", art='odaiko', vel=0.78)
        tk.pattern(b, "....x.......x.x.", art='chu', vel=0.6, pan_off=0.25)
    tam.hit(1, 0, vel=0.6)
    bd.hit(1, 0, vel=0.8)

    # ------------------------------------------------------------ 5-12 sunken chant
    chm.seq(5, CHANT, tr=-12, vel=0.68, legato=True, vowel='o', vtype='b',
            dyn=[(0, 0.64), (16, 0.72), (24, 0.8), (32, 0.7)])
    chm.seq(5, CHANT, vel=0.6, legato=True, vowel='o', vtype='t', dyn=[(0, 0.56), (16, 0.64), (24, 0.72), (32, 0.62)])
    bsn.seq(5, CHANT, tr=-12, vel=0.6, legato=True)
    cla.seq(9, "F4:h Eb4:q Db4:q | Eb4:h. C4:q | Db4:q C4:q Bb3:q Ab3:q | G3:w", vel=0.55, legato=True)
    low_ost(5, CHANT_CH, 0.62, viola=True)
    taps(5, 8, ('Eb5', 'G5', 'C6'), vel=0.5, var=1)
    tolls(5, 8, 'C3', 0.5, every=4)
    tolls(7, 4, 'G2', 0.45, every=4)
    vn2.pad(5, CHANT_CH, 'C5', 'Ab5', n=2, vel=0.35, art='tremolo')
    for b in range(5, 13):
        tk.pattern(b, "X.....x...x.....", art='odaiko', vel=0.78)
        tk.pattern(b, "....x..x....x.xx", art='chu', vel=0.62, pan_off=0.25)
    ti.roll(12, 0, 4, 0.3, 0.75, pitch='G2')

    # ------------------------------------------------------------ 13-20 Rampart theme, C minor
    hn.seq(13, RAMP_C, vel=0.76, art='legato', legato=True, slur=False,
           dyn=[(0, 0.72), (20, 0.84), (32, 0.76)])
    cla.seq(13, RAMP_C, tr=-12, vel=0.5, legato=True)
    vn1.pad(13, RAMP_C_CH, 'G4', 'Eb5', n=2, vel=0.5, art='tremolo')
    vn2.pad(13, RAMP_C_CH, 'C4', 'G4', n=2, vel=0.48, art='tremolo')
    low_ost(13, RAMP_C_CH, 0.6, kind=3)
    bassline(tba, 13, RAMP_C_CH, lo='G0', vel=0.5, art='swell')
    tbn.pad(13, RAMP_C_CH, 'C2', 'G3', n=2, vel=0.45, art='swell', legato=False)
    ch.pad(13, RAMP_C_CH, 'G3', 'Eb5', n=3, vel=0.42, vowel='u')
    tolls(13, 8, 'C3', 0.5, every=4)
    for b in range(13, 21):
        groove(tk, b, 'A', vel=0.76)
        if b % 2 == 1:
            bd.hit(b, 0, vel=0.65)
    cym.hit(13, 0, 'sus', vel=0.6)
    tam.hit(17, 0, vel=0.5)

    # ------------------------------------------------------------ 21-28 eerie interlude
    EER = ['Cm', 'Db', 'Cm', 'Gb', 'Cm', 'Db', 'Ab', 'G']
    vn1.seq(21, "G6,Ab6:w | Ab6,Bb6:w | G6,Ab6:w | Gb6,Bb6:w | G6,C7:w | Ab6,C7:w | Ab6,Eb7:w | G6,B6:w",
            vel=0.4, art='tremolo', legato=True)
    vn2.pad(21, EER, 'C5', 'Bb5', n=2, vel=0.38, art='tremolo')
    prog_apply(EER, 21, lambda b, bt, s, bts: ostinato(va, b, s, 'C3', vel=0.55, beats=bts, beat=bt, kind=3))
    vc.seq(21, "C2:w | Db2:w | C2:w | Gb2:w | C2:w | Db2:w | Ab2:w | G2:w", vel=0.5, art='sustain', legato=True)
    cb.seq(21, "C2:h C2:h | Db2:h Db2:h | C2:h C2:h | Gb1:h Gb1:h | C2:h C2:h | Db2:h Db2:h | Ab1:h Ab1:h | "
               "G1:h G1:h", vel=0.6, art='marcato')
    taps(21, 8, ('C6', 'G5', 'Db6'), vel=0.62, var=2)
    ch.pad(21, EER, 'C4', 'Bb4', n=3, vel=0.48, vowel='u', dyn=[(0, 0.45), (24, 0.6), (32, 0.55)])
    cla.seq(21, "C4:h. Db4:q | C4:w | Eb4:h. Db4:q | Bb3:w | C4:h G3:h | Ab3:w | C4:h Eb4:h | D4:w", vel=0.52,
            legato=True)
    tolls(21, 8, 'C3', 0.55, every=2)
    tolls(24, 1, 'Gb2', 0.5)
    for b in range(21, 29):
        tk.pattern(b, "X.......X..x....", art='odaiko', vel=0.72)
        tk.pattern(b, "x.x.x.x.x.x.xxxx" if b == 28 else "x.x.x.x.x.x.x.x.", art='shime', vel=0.38,
                   pan_off=-0.25)
    tam.hit(21, 0, vel=0.45)
    ti.roll(28, 0, 4, 0.3, 0.85, pitch='G2')
    cym.note(28, 0, 4, 60, 0.55, 'swell', human=False)

    # ------------------------------------------------------------ 29-36 chant tutti
    ch.seq(29, CHANT, tr=12, vel=0.62, legato=True, vowel='a', dyn=[(0, 0.6), (24, 0.74), (32, 0.66)])
    ch.seq(29, CHANT_LO, tr=12, vel=0.56, legato=True, vowel='a')
    chm.seq(29, CHANT, vel=0.72, legato=True, vowel='a', vtype='t', dyn=[(0, 0.7), (24, 0.82), (32, 0.74)])
    chm.seq(29, CHANT, tr=-12, vel=0.72, legato=True, vowel='a', vtype='b')
    hn.seq(29, CHANT, vel=0.74, art='legato', legato=True, slur=False)
    tbn.seq(29, CHANT_LO, tr=-12, vel=0.64, art='legato', legato=True)
    bassline(tba, 29, CHANT_CH, lo='G0', vel=0.6, art='sustain')
    low_ost(29, CHANT_CH, 0.68, viola=True)
    vn1.pad(29, CHANT_CH, 'C5', 'Ab5', n=2, vel=0.5, art='tremolo')
    taps(29, 8, ('G5', 'C6'), vel=0.55, var=3)
    for b in range(29, 37):
        groove(tk, b, 'B', vel=0.82)
        bd.hit(b, 0, vel=0.72)
        ti.pattern(b, "X.....x...x.....", pitch='C3' if b % 2 else 'G2', vel=0.7)
    tam.hit(29, 0, vel=0.65)
    tolls(29, 8, 'C3', 0.6, every=4)

    # ------------------------------------------------------------ 37-44 Rampart theme climax
    tbn.seq(37, RAMP_C, tr=-12, vel=0.84, art='legato', legato=True, slur=False,
            dyn=[(0, 0.82), (20, 0.92), (32, 0.86)])
    hn.seq(37, RAMP_C, vel=0.84, art='legato', legato=True, slur=False, dyn=[(0, 0.82), (20, 0.9), (32, 0.84)])
    tpt.seq(37, RAMP_C, vel=0.66, art='legato', legato=True, slur=False)
    vn1.seq(37, RAMP_C, tr=12, vel=0.74, art='legato', legato=True)
    bassline(tba, 37, RAMP_C_CH, lo='G0', vel=0.66, art='sustain')
    low_ost(37, RAMP_C_CH, 0.7, viola=True, kind=3)
    vn2.pad(37, RAMP_C_CH, 'G4', 'Eb5', n=2, vel=0.55, art='tremolo')
    ch.pad(37, RAMP_C_CH, 'C3', 'G5', n=5, spread=1, vel=0.6, vowel='a')
    for b in range(37, 45):
        groove(tk, b, 'B', vel=0.86)
        bd.hit(b, 0, vel=0.75)
        ti.pattern(b, "X...x...X...x.x.", pitch='C3' if b % 2 else 'G2', vel=0.7)
    cym.hit(37, 0, 'crash', vel=0.85)
    cym.hit(41, 0, 'crash', vel=0.7)
    tolls(37, 8, 'C3', 0.65, every=2)

    # ------------------------------------------------------------ 45-48 turn-around
    TURN = ['Db', 'Db', 'G', 'G']
    hn.seq(45, "Db4:q Ab4:q. Gb4:e F4:q | Eb4:h. F4:q | G4:q D4:q. C4:e B3:q | D4:h. B3:q", vel=0.72,
           art='legato', legato=True, slur=False, dyn=[(0, 0.72), (16, 0.8)])
    tbn.seq(45, "Db2,Ab2:w | Db2,Ab2:w | G1,D2:w | G1,D2:w", vel=0.66, art='swell')
    tba.seq(45, "Db1:w | Db1:w | G0:w | G0:w", vel=0.6, art='sustain')
    low_ost(45, TURN, 0.68, viola=True, kind=3)
    ch.pad(45, TURN, 'Ab3', 'F4', n=3, vel=0.55, vowel='o', dyn=[(0, 0.52), (16, 0.7)])
    vn1.pad(45, TURN, 'Ab5', 'F6', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.5), (16, 0.72)])
    taps(45, 4, ('Ab5', 'Db6'), vel=0.58)
    groove(tk, 45, 'A2', vel=0.8, bars=3)
    fill(tk, 48, vel=0.7)
    ti.roll(48, 0, 4, 0.3, 0.68, pitch='G2')
    cym.note(48, 0, 4, 60, 0.4, 'swell', human=False)
    tolls(45, 2, 'Db3', 0.55)

    for name, b in [('intro', 1), ('chant', 5), ('rampart', 13), ('eerie', 21), ('chant_tutti', 29),
                    ('rampart_climax', 37), ('turnaround', 45)]:
        sc.cue(name, sc.t(b))
    return sc
