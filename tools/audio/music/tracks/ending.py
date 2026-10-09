"""Ending movie score - "A New Star" (played once, exact timing).

72 bpm, 4/4, bar = 3.333 s, D major. Section map (seconds):
    0.0  Ash snow     quiet string pad (D add9), harp + celesta, no melody   (bars 1-4)
   13.3  The walk     Rampart theme (major) on solo flute, then oboe        (bars 5-12)
   40.0  Sacrifice    swell, choir enters, timpani roll crescendo           (bars 13-14)
   46.7  CLIMAX       bright tutti hit + cymbal - the star ascends          (bar 15)
   46.7  Dawn         broad theme on horns, violin countermelody, choir     (bars 15-22)
   73.3  Years later  harp + flute + soft strings: the Oath theme           (bars 23-30)
  100.0  Her name     head motif on celesta over soft choir                 (bars 31-34)
  106.7  final D major add9 chord, natural decay to ~120 s
"""
from ..score import Score
from .common import (RAMPART_MAJOR, RAMPART_MAJOR_CH, OATH8_F, OATH8_F_CH, tr_chords, prog_apply,
                     chord_tones, root_at, bassline)

ASH = ['Dadd9', 'Gadd9', 'Bm7', ('Asus4', 2), ('A', 2)]
DAWN_CTR = "F#5:h A5:h | B5:w | D6:h. B5:q | C#6:h A5:h | D6:h A5:h | F#6:h. E6:q | D6:h C#6:h | A5:w"
OATH8_D = OATH8_F
OATH8_D_CH = tr_chords(OATH8_F_CH, -3, sharps=True)


def build():
    sc = Score('ending', bpm=72, bars=34, loop=False, tail=6.67, lufs=-17.0, seed=141, rt60=3.0,
               long_rt60=3.4, length_s=34 * 4 * 60 / 72)
    T = sc.t
    fl = sc.part('fl', 'flute', gain=-1.0)
    ob = sc.part('ob', 'oboe', gain=-2.0)
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-1.0)
    vc = sc.part('vc', 'cellos', gain=-1.0)
    cb = sc.part('cb', 'basses', gain=-1.0)
    hn = sc.part('hn', 'horns', gain=-2.0)
    tpt = sc.part('tpt', 'trumpets', gain=-7.0)
    tbn = sc.part('tbn', 'trombones', gain=-4.0)
    tba = sc.part('tba', 'tuba', gain=-5.0)
    ch = sc.part('ch', 'choir', gain=-4.0)
    hp = sc.part('hp', 'harp', gain=0.0)
    cel = sc.part('cel', 'celesta', gain=0.0)
    glk = sc.part('glk', 'glock', gain=-4.0)
    bel = sc.part('bel', 'bells', gain=-6.0, long=0.8)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-4.0)
    cym = sc.part('cym', 'cymbal', gain=-2.0)

    def harp_arp(bar, chs, lo='D2', vel=0.42, idx=(0, 1, 2, 3, 4, 3, 2, 1), step=0.5):
        def f(b, bt, s, bts):
            tones = chord_tones(s, lo, max(idx) + 1)
            for k in range(int(round(bts / step))):
                hp.note(b, bt + k * step, step, tones[idx[k % len(idx)]], vel * (1.1 if k == 0 else 1.0), 'pluck')
        prog_apply(chs, bar, f)

    # ================================================================ Ash snow (1-4)
    sc.cue('ash_snow', 0.0)
    vn2.pad(1, ASH, 'A3', 'E5', n=3, vel=0.3, art='sustain', dyn=[(0, 0.26), (16, 0.34)])
    va.pad(1, ASH, 'D3', 'A4', n=2, vel=0.3, art='sustain', dyn=[(0, 0.26), (16, 0.34)])
    vc.seq(1, "D3:w | D3:w | D3:w | D3:h C#3:h", vel=0.3, art='sustain', legato=True)
    cb.seq(1, "D2:w | D2:w | B1:w | A1:w", vel=0.28, art='sustain', legato=True)
    vn1.seq(1, "A5,E6:w | B5,F#6:w | A5,D6:w | A5,E6:w", vel=0.22, art='sustain', legato=True)
    harp_arp(1, ASH, 'D3', 0.38, idx=(0, 2, 4, 5, 4, 2), step=0.667)
    snow = [(1, 1.5, 'E6'), (1, 3.0, 'A5'), (2, 0.5, 'F#6'), (2, 2.5, 'D6'), (3, 1.0, 'B5'), (3, 2.5, 'F#6'),
            (3, 3.5, 'A5'), (4, 1.0, 'E6'), (4, 2.75, 'C#6')]
    for b, bt, p in snow:
        cel.note(b, bt, 1, p, 0.36, 'hit')

    # ================================================================ The walk (5-12)
    sc.cue('the_walk', T(5))
    fl.seq(5, "D5:q A5:q. G5:e F#5:q | G5:h. A5:q | B5:q. A5:e G5:q F#5:q | E5:h. A4:q", vel=0.5,
           legato=True, dyn=[(0, 0.48), (8, 0.56), (12, 0.54), (16, 0.48)])
    ob.seq(9, "D4:q A4:q. G4:e F#4:q | D5:h. C#5:q | B4:q A4:q G4:q E4:q | D4:w", vel=0.52, legato=True,
           dyn=[(0, 0.5), (5, 0.6), (12, 0.56), (16, 0.48)])
    WALK = RAMPART_MAJOR_CH
    vn2.pad(5, WALK, 'F#3', 'D5', n=3, vel=0.32, art='sustain', dyn=[(0, 0.3), (16, 0.38), (32, 0.48)])
    va.pad(5, WALK, 'A3', 'F#4', n=1, vel=0.3, art='sustain', dyn=[(0, 0.3), (32, 0.42)])
    bassline(cb, 5, WALK, lo='C2', vel=0.32, art='sustain')
    vc.seq(5, "D3:w | B2:w | G2:w | A2:w", vel=0.34, art='sustain', legato=True)
    vc.seq(9, "F#3:h A3:h | B3:h. A3:q | G3:h E3:h | F#3:w", vel=0.42, art='legato', legato=True)
    harp_arp(5, WALK, 'D2', 0.38)
    hn.seq(11, "B3:w | A3:w", vel=0.36, art='sustain', legato=True)

    # ================================================================ Sacrifice (13-14)
    sc.cue('sacrifice', T(13))
    SAC = [('Bm', 2), ('G', 2), ('Gm', 2), ('A7', 2)]
    vn1.seq(13, "F#5:h G5:h | Bb5:h A5:h", vel=0.45, art='legato', legato=True, dyn=[(0, 0.42), (8, 0.9)])
    vn2.pad(13, SAC, 'D4', 'D5', n=2, vel=0.4, art='tremolo', dyn=[(0, 0.4), (8, 0.86)])
    va.pad(13, SAC, 'F#3', 'D4', n=2, vel=0.4, art='tremolo', dyn=[(0, 0.4), (8, 0.84)])
    vc.seq(13, "B2:h G2:h | G2:h A2:h", vel=0.45, art='sustain', legato=True, dyn=[(0, 0.44), (8, 0.88)])
    cb.seq(13, "B1:h G1:h | G1:h A1:h", vel=0.45, art='sustain', legato=True, dyn=[(0, 0.44), (8, 0.86)])
    ch.pad(13, SAC, 'D3', 'E5', n=4, spread=1, vel=0.3, vowel='a', dyn=[(0, 0.28), (8, 0.86)])
    hn.pad(13, SAC, 'D3', 'D4', n=3, vel=0.3, art='swell', legato=False)
    tbn.pad(14, SAC[2:], 'D2', 'A3', n=2, vel=0.5, art='swell', legato=False)
    ti.roll(13, 0, 8, 0.15, 0.95, pitch='A2')
    cym.note(14, 0, 4, 60, 0.6, 'swell', human=False)
    harp_arp(13, SAC, 'D3', 0.45, step=0.25)

    # ================================================================ CLIMAX + Dawn (15-22)
    tc = T(15)
    sc.cue('climax', tc)
    sc.cue('dawn', tc)
    cym.at(tc, 1.0, 60, 0.95, 'crash')
    ti.at(tc, 0.5, 'D3', 1.0, 'hit')
    bd.at(tc, 0.5, 60, 0.85, 'hit')
    glk.at(tc, 0.5, 'D7', 0.75, 'hit')
    glk.at(tc + 0.12, 0.5, 'A6', 0.6, 'hit')
    bel.at(tc, 0.5, 'D5', 0.75, 'hit')
    bel.at(tc, 0.5, 'A5', 0.6, 'hit')
    for p in ('F#5', 'A5', 'D6'):
        tpt.at(tc, 1.6, p, 0.82, 'marcato', vel_end=0.35)
    hn.seq(15, RAMPART_MAJOR, vel=0.8, art='legato', legato=True,
           dyn=[(0, 0.86), (2, 0.78), (16, 0.84), (24, 0.88), (32, 0.78)], human=False)
    vn1.seq(15, DAWN_CTR, vel=0.78, art='legato', legato=True, dyn=[(0, 0.86), (2, 0.74), (24, 0.84), (32, 0.7)],
            human=False)
    DAWN = RAMPART_MAJOR_CH
    vn2.pad(15, DAWN, 'D4', 'A5', n=3, vel=0.6, art='sustain', dyn=[(0, 0.7), (4, 0.58), (24, 0.66), (32, 0.55)],
            human=False)
    va.pad(15, DAWN, 'F#3', 'D4', n=2, vel=0.56, art='sustain', human=False)
    bassline(vc, 15, DAWN, lo='D2', vel=0.6, art='sustain')
    bassline(cb, 15, DAWN, lo='C2', vel=0.6, art='sustain')
    bassline(tba, 15, DAWN, lo='C1', vel=0.42, art='sustain')
    tbn.pad(15, DAWN, 'D2', 'D3', n=2, vel=0.42, art='sustain', human=False)
    ch.pad(15, DAWN, 'D3', 'G5', n=5, spread=1, vel=0.62, vowel='a', dyn=[(0, 0.7), (4, 0.6), (24, 0.68), (32, 0.55)],
           human=False)
    tpt.seq(19, "D4:q A4:q. G4:e F#4:q | D5:h. C#5:q | B4:q A4:q G4:q E4:q | D4:w", vel=0.56, art='legato',
            legato=True, check=False)
    harp_arp(15, DAWN, 'D2', 0.5)
    for b in (15, 17, 19, 21):
        if b > 15:
            ti.hit(b, 0, pitch='D3', vel=0.6)
    cym.note(18, 2, 2, 60, 0.4, 'swell', human=False)
    cym.hit(19, 0, 'sus', vel=0.55)
    ti.roll(22, 0, 4, 0.4, 0.15, pitch='D3')

    # ================================================================ Years later (23-30): the Oath
    sc.cue('years_later', T(23))
    fl.seq(23, OATH8_D, tr=-3, vel=0.5, legato=True,
           dyn=[(0, 0.46), (12, 0.54), (16, 0.58), (24, 0.5), (32, 0.42)])
    harp_arp(23, OATH8_D_CH, 'D2', 0.4)
    vn2.pad(23, OATH8_D_CH, 'A3', 'F#5', n=2, vel=0.3, art='sustain', dyn=[(0, 0.3), (16, 0.36), (32, 0.28)])
    va.pad(23, OATH8_D_CH, 'D3', 'A4', n=2, vel=0.3, art='sustain')
    vc.seq(23, "D3:h F#3:h | C#3:h A2:h | G2:h B2:h | A2:h C#3:h | G2:h B2:h | A2:w | E2:h A2:h | D3:w",
           vel=0.36, art='legato', legato=True)
    bassline(cb, 23, OATH8_D_CH, lo='C2', vel=0.26, art='sustain')
    cel.seq(27, "D6:h F#6:h | A6:w", vel=0.34, check=False)

    # ================================================================ Her name (31-34)
    sc.cue('her_name', T(31))
    cel.seq(31, "D5:q A5:q. G5:e F#5:q | G5:h. A5:q", vel=0.5)
    ch.seq(31, "D4,F#4,A4:w | D4,G4,B4:h D4,E4,A4:h", vel=0.34, legato=True, vowel='u',
           dyn=[(0, 0.32), (8, 0.36)])
    vn2.seq(31, "F#4:w | G4:h E4:h", vel=0.24, art='sustain', legato=True)
    vc.seq(31, "D3:w | B2:h A2:h", vel=0.26, art='sustain', legato=True)
    cb.seq(31, "D2:w | G1:h A1:h", vel=0.22, art='sustain', legato=True)
    tf = T(33)
    sc.cue('final_chord', tf)
    d = 2 * sc.bar_s - 0.3
    for p, v in (('D3', 0.36), ('A3', 0.34), ('E4', 0.32), ('F#4', 0.34), ('A4', 0.32), ('D5', 0.3)):
        ch.at(tf, d, p, v, 'sustain', vel_end=0.1, vowel='u')
    for p in ('F#4', 'A4', 'E5'):
        vn2.at(tf, d, p, 0.26, 'sustain', vel_end=0.08)
    for p in ('A5', 'E6'):
        vn1.at(tf, d, p, 0.2, 'sustain', vel_end=0.06)
    va.at(tf, d, 'D4', 0.26, 'sustain', vel_end=0.08)
    vc.at(tf, d, 'D3', 0.28, 'sustain', vel_end=0.08)
    vc.at(tf, d, 'A2', 0.26, 'sustain', vel_end=0.08)
    cb.at(tf, d, 'D2', 0.26, 'sustain', vel_end=0.08)
    for k, p in enumerate(['D2', 'A2', 'D3', 'F#3', 'A3', 'E4', 'F#4', 'A4', 'D5']):
        hp.at(tf + 0.12 * k, 0.5, p, 0.42, 'pluck')
    cel.at(tf + 1.2, 0.5, 'E6', 0.34, 'hit')
    cel.at(tf + 2.0, 0.5, 'A6', 0.3, 'hit')
    cel.at(tf + 3.4, 0.5, 'D6', 0.26, 'hit')
    sc.cue('end', 120.0)
    return sc


def verify(y, sc):
    import numpy as np
    from .common import stem_onsets
    from ..dsp import SR
    out = stem_onsets(sc, ('bd', 'glk', 'bel'), ['climax'])   # the timpani roll leads into it
    m = y.mean(axis=0).astype(np.float64)
    out['last_0.5s_dbfs'] = round(float(20 * np.log10(np.sqrt(np.mean(m[-int(0.5 * SR):] ** 2)) + 1e-9)), 1)
    return out
