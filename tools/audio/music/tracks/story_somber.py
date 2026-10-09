"""Story underscore - "Ashes of Memory" (somber).

D minor, 60 bpm, 16-bar loop (64 s), quiet. Soft piano arpeggios, string
pads, harp; the Rampart theme slowed to a lament (cellos, then violins).
  1-4   piano + string pad (Dm - Bbmaj7 - Gm6 - Asus4/A)
  5-8   theme bars 1-4 on cellos
  9-12  theme bars 5-8 on violins, harp, cello counterline
  13-16 piano alone with soft strings, horn echo of the head, back to bar 1
"""
from ..score import Score
from .common import prog_apply, chord_tones, root_at, bassline

PROG = (['Dm', 'Bbmaj7', 'Gm6', ('Asus4', 2), ('A', 2)] +
        ['Dm', 'Gm', 'Bb', 'A7'] +
        ['Dm', ('Bb', 3), ('C', 1), ('Gm', 2), ('A', 2), 'Dm'] +
        ['Bbmaj7', 'Gm', 'Dm/F', ('Asus4', 2), ('A', 2)])


def build():
    sc = Score('story_somber', bpm=60, bars=16, loop=True, tail=4.0, lufs=-19.0, seed=101, rt60=3.0,
               master=dict(low_mid_db=-3.0))
    pno = sc.part('pno', 'piano', gain=0.0, hall=0.5, eq=[('highpass', 45, 0.7), ('peak', 220, 0.9, -2.5)])
    vn1 = sc.part('vn1', 'violins', gain=-1.0)
    vn2 = sc.part('vn2', 'violins2', gain=-2.0)
    va = sc.part('va', 'violas', gain=-1.0)
    vc = sc.part('vc', 'cellos', gain=-1.0)
    vcs = sc.part('vcs', 'cellos', gain=1.0, pan=0.25, inst=dict(nv=4))
    cb = sc.part('cb', 'basses', gain=-2.0)
    hp = sc.part('hp', 'harp', gain=-2.0)
    hn = sc.part('hn', 'horn_solo', gain=-6.0, hall=0.7)

    def piano_arp(b, bt, s, bts, vel=0.42):
        r = root_at(s, 'D2')
        tones = chord_tones(s, r + 1, 6)
        seq = [r, tones[1], tones[2], tones[3], tones[4], tones[3], tones[2], tones[1]]
        n = int(bts * 2)
        for k in range(n):
            pos = bt + k * 0.5
            hold = bts - k * 0.5 + 0.25
            v = vel * (0.95 if k == 0 else 0.92 if k % 2 else 1.0)
            pno.note(b, pos, hold, seq[k % 8], v, 'note')

    prog_apply(PROG, 1, piano_arp)
    va.pad(1, PROG, 'D3', 'A4', n=2, vel=0.34, art='sustain')
    vn2.pad(1, PROG, 'A3', 'F5', n=2, vel=0.3, art='sustain', dyn=[(0, 0.3), (32, 0.36), (48, 0.32), (64, 0.3)])
    bassline(cb, 1, PROG, lo='C2', vel=0.36, art='sustain')

    # 5-8: theme (bars 1-4) on cellos, a lament
    vcs.seq(5, "D3:q A3:q. G3:e F3:q | G3:h. A3:q | Bb3:q. A3:e G3:q F3:q | E3:h. A2:q", vel=0.5,
            art='legato', legato=True, dyn=[(0, 0.48), (8, 0.56), (12, 0.52), (16, 0.42)])
    bassline(vc, 5, PROG[5:9], lo='C2', vel=0.34, art='sustain')
    # 9-12: theme (bars 5-8) on violins, harp
    vn1.seq(9, "D5:q A5:q. G5:e F5:q | D6:h. C6:q | Bb5:q A5:q G5:q E5:q | D5:w", vel=0.46, art='legato',
            legato=True, dyn=[(0, 0.44), (5, 0.56), (8, 0.5), (16, 0.36)])
    vcs.seq(9, "F3:h A3:h | Bb3:h. A3:q | G3:h A3:h | F3:w", vel=0.42, art='legato', legato=True)

    def harp_arp(b, bt, s, bts):
        tones = chord_tones(s, 'D4', 5)
        for k in range(int(bts)):
            hp.note(b, bt + k, 1, tones[(k * 2) % 5], 0.4, 'pluck')
    prog_apply(PROG[9:15], 9, harp_arp)
    # 13-16: piano alone + horn echo
    hn.seq(14, "D4:q A4:q. G4:e F4:q", vel=0.36, art='legato', legato=True)
    vn1.seq(15, "A4:w | A4:h G4:q E4:q", vel=0.3, art='sustain', legato=True, check=False)
    sc.cue('lament', sc.t(5))
    sc.cue('violins', sc.t(9))
    sc.cue('coda', sc.t(13))
    return sc
