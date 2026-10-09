"""Defeat stinger (~6.6 s, played once).

D minor, 60 bpm: a slow descending horn line A-G-F-E over a falling bass
(Dm - Bb - Gm - A7) settling at 4.0 s on a dark D minor chord with a
semitone-clouded b6 (Bb against A), low tam-tam and soft timpani.
"""
from ..score import Score


def build():
    sc = Score('defeat', bpm=60, bars=2, loop=False, tail=1.6, lufs=-15.0, seed=91, rt60=2.9,
               long_rt60=3.4, length_s=5.0)
    vn1 = sc.part('vn1', 'violins', gain=-2.0)
    vn2 = sc.part('vn2', 'violins2', gain=-1.0)
    va = sc.part('va', 'violas', gain=0.0)
    vc = sc.part('vc', 'cellos', gain=0.0)
    cb = sc.part('cb', 'basses', gain=0.0)
    hn = sc.part('hn', 'horn_solo', gain=0.0)
    tbn = sc.part('tbn', 'trombones', gain=-3.0)
    tba = sc.part('tba', 'tuba', gain=-4.0)
    ch = sc.part('ch', 'choir', gain=-4.0)
    ti = sc.part('ti', 'timpani', gain=-3.0)
    tam = sc.part('tam', 'tamtam', gain=-2.0)

    hn.seq(1, "A4:q G4:q F4:q E4:q | D4:h.", vel=0.66, art='legato', legato=True,
           dyn=[(0, 0.7), (3, 0.62), (4, 0.6), (7, 0.4)], check=False)
    vn1.seq(1, "F4:q D4:q D4:q C#4:q | D4:h.", vel=0.45, art='legato', legato=True,
            dyn=[(0, 0.48), (4, 0.42), (7, 0.25)], check=False)
    vn2.seq(1, "D4:q Bb3:q Bb3:q G3:q | A3:h.", vel=0.42, art='legato', legato=True,
            dyn=[(0, 0.45), (4, 0.4), (7, 0.25)], check=False)
    va.seq(1, "A3:q F3:q G3:q A3:q | F3,Bb3:h.", vel=0.45, art='legato', legato=True,
           dyn=[(0, 0.48), (4, 0.45), (7, 0.25)], check=False)
    vc.seq(1, "D3:q Bb2:q G2:q A2:q | D2,A2:h.", vel=0.55, art='legato', legato=True,
           dyn=[(0, 0.56), (4, 0.55), (7, 0.3)], check=False)
    cb.seq(1, "D2:q Bb1:q G1:q A1:q | D1:h.", vel=0.55, art='legato', legato=True,
           dyn=[(0, 0.55), (4, 0.58), (7, 0.3)], check=False)
    tbn.seq(2, "D2,A2:h.", vel=0.5, art='sustain', dyn=[(0, 0.5), (3, 0.25)], check=False)
    tba.seq(2, "D1:h.", vel=0.5, art='sustain', dyn=[(0, 0.5), (3, 0.25)], check=False)
    ch.seq(1, "F3,A3:q D3,G3:q D3,F3:q C#3,E3:q | D3,F3,A3:h.", vel=0.42, legato=True, vowel='u',
           dyn=[(0, 0.4), (4, 0.48), (7, 0.25)], check=False)
    ti.hit(1, 0, pitch='D2', vel=0.45)
    ti.roll(1, 2.5, 1.5, 0.15, 0.4, pitch='A1')
    ti.hit(2, 0, pitch='D2', vel=0.62, human=False)
    tam.hit(2, 0, vel=0.62, human=False)
    sc.cue('descent', 0.0)
    sc.cue('dark_chord', 4.0)
    return sc
