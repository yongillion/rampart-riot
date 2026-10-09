"""Story underscore - "The Oath" (hopeful; also the credits roll).

F major, 72 bpm, 20-bar loop (66.7 s). Warm strings, harp and the full
16-bar Oath theme: flute for the antecedent, violins + horn for the
consequent, a soft women's choir, then a two-bar turn back to bar 1.
"""
from ..score import Score
from .common import OATH_F, OATH_F_CH, prog_apply, chord_tones, root_at, bassline, arp

ANTE = OATH_F.split('|')
ANTECEDENT = '|'.join(ANTE[:8])
CONSEQUENT = '|'.join(ANTE[8:])
INTRO = ['F', 'Bb/F']
TURN = ['Bb', 'C7sus4']
CELLO_CTR = ("F3:h A3:h | E3:h A3:h | Bb3:h D4:h | A3:h F3:h | Bb3:h. D4:q | C4:h A3:h | "
             "Bb3:h E3:h | F3:w")


def build():
    sc = Score('story_hope', bpm=72, bars=20, loop=True, tail=4.0, lufs=-19.0, seed=121, rt60=2.9)
    fl = sc.part('fl', 'flute', gain=-1.0)
    ob = sc.part('ob', 'oboe', gain=-3.0)
    vn1 = sc.part('vn1', 'violins', gain=-1.0)
    vn2 = sc.part('vn2', 'violins2', gain=-1.0)
    va = sc.part('va', 'violas', gain=-1.0)
    vc = sc.part('vc', 'cellos', gain=-1.0)
    cb = sc.part('cb', 'basses', gain=-2.0)
    hn = sc.part('hn', 'horns', gain=-4.0, inst=dict(nv=2))
    hp = sc.part('hp', 'harp', gain=-1.0)
    cel = sc.part('cel', 'celesta', gain=-3.0)
    ch = sc.part('ch', 'choir', gain=-5.0)

    PROG = INTRO + OATH_F_CH + TURN

    def harp(b, bt, s, bts, vel=0.42):
        arp(hp, b, s, 'F2', (0, 2, 4, 5, 3, 1), step=0.5, vel=vel, beats=bts, beat=bt)
    prog_apply(PROG, 1, harp)
    vn2.pad(1, PROG, 'A3', 'F5', n=2, vel=0.36, art='sustain',
            dyn=[(0, 0.34), (40, 0.4), (64, 0.48), (72, 0.4), (80, 0.34)])
    va.pad(1, PROG, 'C3', 'A4', n=2, vel=0.36, art='sustain',
           dyn=[(0, 0.34), (40, 0.4), (64, 0.48), (72, 0.4), (80, 0.34)])
    bassline(vc, 1, PROG[:11], lo='C2', vel=0.38, art='sustain')
    bassline(cb, 1, PROG, lo='C2', vel=0.34, art='sustain')

    # antecedent (bars 3-10): flute, oboe echo
    fl.seq(3, ANTECEDENT, vel=0.56, legato=True, dyn=[(0, 0.52), (12, 0.6), (20, 0.62), (32, 0.5)])
    ob.seq(9, "r:h G4:q A4:q | Bb4:h. A4:q", vel=0.42, legato=True, check=False)
    cel.seq(3, "C6:h F6:h | E6:w | D6:h F6:h | E6:w", vel=0.4)
    # consequent (bars 11-18): violins + horn, choir, cello counterline
    vn1.seq(11, CONSEQUENT, vel=0.56, art='legato', legato=True,
            dyn=[(0, 0.54), (12, 0.64), (18, 0.7), (24, 0.62), (32, 0.5)])
    hn.seq(11, CONSEQUENT, tr=-12, vel=0.5, art='legato', legato=True,
           dyn=[(0, 0.48), (16, 0.58), (24, 0.52), (32, 0.42)])
    vc.seq(11, CELLO_CTR, vel=0.46, art='legato', legato=True, dyn=[(0, 0.44), (18, 0.56), (32, 0.42)])
    ch.pad(11, OATH_F_CH[9:], 'A3', 'F5', n=3, vel=0.38, vowel='u', dyn=[(0, 0.34), (18, 0.48), (32, 0.36)])
    cel.seq(15, "D6:h F6:h | F6:h E6:h | C6:w", vel=0.42, check=False)
    # turn (bars 19-20)
    fl.seq(19, "D5:h C5:h | Bb4:h. C5:q", vel=0.36, legato=True, dyn=[(0, 0.38), (8, 0.3)])
    vn1.seq(19, "F4:w | G4:w", vel=0.26, art='sustain', legato=True)
    cel.seq(1, "C6:h F6:h | D6:w", vel=0.36)
    vn1.seq(1, "A4:w | Bb4:w", vel=0.24, art='sustain', legato=True)
    sc.cue('oath_flute', sc.t(3))
    sc.cue('oath_strings', sc.t(11))
    sc.cue('turn', sc.t(19))
    return sc
