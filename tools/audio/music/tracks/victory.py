"""Victory stinger (~7.6 s, played once).

D major, 100 bpm: the Rampart head (major) on horns, a IV-V cadence and a
ringing tutti D major chord at 4.8 s with cymbal, timpani and bells.
"""
from ..score import Score

CHORD_T = 4.8   # downbeat of bar 3


def build():
    sc = Score('victory', bpm=100, bars=3, loop=False, tail=1.6, lufs=-15.0, seed=81, rt60=2.4,
               length_s=6.0)
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-2.0)
    vc = sc.part('vc', 'cellos', gain=-1.0)
    cb = sc.part('cb', 'basses')
    hn = sc.part('hn', 'horns', gain=-2.0)
    tpt = sc.part('tpt', 'trumpets', gain=-5.0)
    tbn = sc.part('tbn', 'trombones', gain=-3.0)
    tba = sc.part('tba', 'tuba', gain=-3.0)
    ch = sc.part('ch', 'choir', gain=-5.0)
    hp = sc.part('hp', 'harp', gain=0.0)
    glk = sc.part('glk', 'glock', gain=-4.0)
    ti = sc.part('ti', 'timpani', gain=-1.0)
    cym = sc.part('cym', 'cymbal', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-3.0)

    hn.seq(1, "D4:q A4:q. G4:e F#4:q | B4:q. A4:e B4:q C#5:q | D5:h", vel=0.86, art='legato', legato=True,
           slur=False, dyn=[(0, 0.84), (8, 0.92)], check=False)
    hn.seq(3, "F#4,A4:h", vel=0.82, art='sustain', check=False)
    tpt.seq(2, "G4:q. F#4:e G4:q A4:q | A4,D5,F#5:h", vel=0.74, art='legato', legato=True, slur=False,
            check=False)
    vn1.seq(1, "D5:s E5:s F#5:s G5:s A5:s B5:s C#6:s D6:s A5:s B5:s C#6:s D6:s E6:s F#6:s G6:s A6:s",
            vel=0.6, art='spiccato', check=False)
    vn1.seq(2, "B5:h C#6:h | D6:h", vel=0.72, art='tremolo', check=False)
    vn2.seq(1, "F#4,A4:w | G4,B4:h A4,C#5:h | F#4,A4,D5:h", vel=0.62, art='sustain', check=False)
    va.seq(1, "D4:w | D4:h E4:h | D4,F#4:h", vel=0.6, art='sustain', check=False)
    vc.seq(1, "D3:q. D3:e A2:q D3:q | G2:h A2:h | D2,A2:h", vel=0.7, art='marcato', check=False)
    cb.seq(1, "D2:q. D2:e A1:q D2:q | G1:h A1:h | D1:h", vel=0.7, art='marcato', check=False)
    tbn.seq(2, "G2,D3:h A2,E3:h | D3,A3:h", vel=0.7, art='marcato', check=False)
    tba.seq(2, "G1:h A1:h | D1:h", vel=0.66, art='sustain', check=False)
    ch.seq(2, "B3,D4,G4:h C#4,E4,A4:h | D3,A3,F#4,A4,D5:h", vel=0.62, vowel='a', check=False)
    hp.seq(2, "r:h D4:s E4:s F#4:s G4:s A4:s B4:s C#5:s D5:s | D2:q", vel=0.62, check=False)
    hp.seq(3, "D3:q A3:q D4:q F#4:q", vel=0.5, check=False)
    glk.seq(3, "D6:h", vel=0.6, check=False)
    glk.seq(3, "A6:q.", vel=0.45, beat=0.5, check=False)
    ti.hit(1, 0, pitch='D3', vel=0.85, human=False)
    ti.hit(1, 2, pitch='A2', vel=0.65)
    ti.roll(2, 2, 2, 0.35, 0.8, pitch='A2')
    ti.hit(3, 0, pitch='D3', vel=1.0, human=False)
    bd.hit(1, 0, vel=0.7, human=False)
    bd.hit(3, 0, vel=0.9, human=False)
    cym.note(2, 2, 2, 60, 0.55, 'swell', human=False)
    cym.hit(3, 0, 'crash', vel=0.9, human=False)
    sc.cue('head', 0.0)
    sc.cue('cadence', sc.t(2))
    sc.cue('final_chord', CHORD_T)
    return sc
