"""World map - "Roads of the Realm".

G mixolydian / G major, 100 bpm, 32-bar loop (76.8 s). A light adventurous
march: pizzicato oom-pah, woodwind melodies, soft snare, glockenspiel, and
the Rampart theme recast in G with a mixolydian F-major turn.
  1-4   pizzicato march, staccato woodwind motif (G-F-C-G)
  5-12  Rampart theme (G) on clarinet + flute
  13-20 theme on oboe + violins, horn countermelody
  21-28 "journey" tune in violins/flute, harp, spiccato strings
  29-32 head-motif fragments passed around the winds -> bar 1
"""
from ..score import Score
from ..score import chord
from .common import prog_apply, root_at, chord_tones, arp

THEME_G = ("G4:q D5:q. C5:e B4:q | C5:h. D5:q | E5:q. D5:e C5:q B4:q | A4:h. D4:q | "
           "G4:q D5:q. C5:e B4:q | G5:h. F5:q | E5:q D5:q C5:q A4:q | G4:w")
THEME_CH = ['G', 'C', 'C', 'D7', 'G', ('Em', 3), ('F', 1), ('C', 2), ('D7', 2), 'G']
HORN_CTR = "B3:h D4:h | E4:w | G4:h E4:h | F#4:w | D4:h G4:h | B4:h. A4:q | G4:h F#4:h | G4:w"
JOURNEY = ("E5:q. F5:e G5:q E5:q | D5:h. B4:q | C5:q. D5:e E5:q A5:q | G5:h. D5:q | "
           "F5:q. E5:e D5:q C5:q | E5:q. D5:e C5:q G4:q | A4:q C5:q F5:q E5:q | D5:w")
JOURNEY_CH = ['C', 'G/B', 'Am', 'G', 'F', 'C/E', 'Dm7', 'D7']


def build():
    sc = Score('worldmap', bpm=100, bars=32, loop=True, tail=3.0, lufs=-16.0, seed=71, rt60=2.2,
               master=dict(level=dict(thr_down=1.5, ratio_down=2.0, thr_up=-2.0, ratio_up=2.0)))
    vn1 = sc.part('vn1', 'violins', gain=-1.0)
    vn2 = sc.part('vn2', 'violins2', gain=1.0)
    va = sc.part('va', 'violas', gain=0.0)
    vc = sc.part('vc', 'cellos', gain=1.0)
    cb = sc.part('cb', 'basses', gain=0.0)
    fl = sc.part('fl', 'flute', gain=-1.0)
    ob = sc.part('ob', 'oboe', gain=-1.0)
    cl = sc.part('cl', 'clarinet', gain=-1.0)
    bsn = sc.part('bsn', 'bassoon', gain=0.0)
    hn = sc.part('hn', 'horns', gain=-4.0)
    tpt = sc.part('tpt', 'trumpets', gain=-8.0)
    hp = sc.part('hp', 'harp', gain=-1.0)
    glk = sc.part('glk', 'glock', gain=-3.0)
    sn = sc.part('sn', 'snare', gain=-5.0)
    ti = sc.part('ti', 'timpani', gain=-5.0)
    cym = sc.part('cym', 'cymbal', gain=-8.0)

    def oompah(bar, chs, vel=0.6, offbeat_8th=False):
        def f(b, bt, s, bts):
            r = root_at(s, 'G1')
            fifth = r + 7
            for k in range(int(bts)):
                beat = bt + k
                if k % 2 == 0:
                    p = r if (k // 2) % 2 == 0 else fifth
                    cb.note(b, beat, 1, p - 12 if p - 12 >= 28 else p, vel * 1.05, 'pizz')
                    vc.note(b, beat, 1, p, vel, 'pizz')
                else:
                    tones = chord_tones(s, 'B3', 3)
                    for q in tones[:2]:
                        va.note(b, beat, 0.5, q, vel * 0.8, 'pizz')
                    for q in chord_tones(s, 'G4', 2):
                        vn2.note(b, beat, 0.5, q, vel * 0.72, 'pizz')
                    if offbeat_8th:
                        for q in chord_tones(s, 'G4', 2):
                            vn2.note(b, beat + 0.5, 0.5, q, vel * 0.55, 'pizz')
        prog_apply(chs, bar, f)

    def snare_march(bar, nbars, vel=0.4):
        pats = ["x..x..x.x...x.x.", "x..x..x.x.x.x.xx"]
        for i in range(nbars):
            sn.pattern(bar + i, pats[i % 2], vel=vel, vmap={'x': 0.8, 'X': 1.0})

    # ------------------------------------------------------------ 1-4 intro
    INTRO = ['G', 'F', 'C', 'G']
    oompah(1, INTRO, 0.7, offbeat_8th=True)
    hn.pad(1, INTRO, 'G3', 'G4', n=3, vel=0.5, art='sustain')
    vn1.seq(1, "G5:e* B5:e* D6:e* G6:e* F6:q* D6:q* | C6:e* E6:e* G6:e* E6:e* D6:h", vel=0.45, art='staccato')
    ti.hit(1, 0, pitch='G2', vel=0.6)
    ti.hit(3, 0, pitch='C3', vel=0.55)
    cl.seq(1, "G4:e* B4:e* D5:e* G5:e* F5:q* D5:q* | C5:e* E5:e* G5:e* E5:e* D5:h", vel=0.6)
    bsn.seq(3, "C3:e* E3:e* G3:e* E3:e* D3:q* B2:q* | G2:e* A2:e* B2:e* D3:e* G3:h", vel=0.62)
    fl.seq(3, "r:h G5:q* E5:q* | r:h B5:q* D6:q*", vel=0.5)
    snare_march(1, 4, 0.36)
    glk.hit(1, 0, pitch='G6', vel=0.5)
    glk.hit(3, 0, pitch='C7', vel=0.45)

    # ------------------------------------------------------------ 5-12 theme on clarinet + flute
    cl.seq(5, THEME_G, tr=-12, vel=0.66, legato=True, dyn=[(0, 0.62), (20, 0.72), (32, 0.64)])
    fl.seq(5, THEME_G, vel=0.6, legato=True, dyn=[(0, 0.56), (20, 0.66), (32, 0.6)])
    oompah(5, THEME_CH, 0.6)
    bsn.seq(5, "G2:h B2:h | C3:h E3:h | C3:h G2:h | D3:h F#2:h | G2:h B2:h | E2:h. F2:q | C3:h D3:h | G2:w",
            vel=0.5, art='sustain', legato=True)
    snare_march(5, 8, 0.34)
    for b, p in zip(range(5, 13, 2), ['G6', 'E6', 'D6', 'E6']):
        glk.hit(b, 0, pitch=p, vel=0.45)

    # ------------------------------------------------------------ 13-20 oboe + violins, horns
    ob.seq(13, THEME_G, vel=0.66, legato=True, dyn=[(0, 0.62), (20, 0.72), (32, 0.64)])
    vn1.seq(13, THEME_G, vel=0.55, art='legato', legato=True, dyn=[(0, 0.52), (20, 0.64), (32, 0.56)])
    hn.seq(13, HORN_CTR, vel=0.6, art='legato', legato=True)
    oompah(13, THEME_CH, 0.62, offbeat_8th=True)
    cl.seq(13, "D4:h G4:h | G4:w | C5:h G4:h | A4:w | G4:h D5:h | E5:h. F5:q | E5:h D5:h | D5:w", vel=0.5,
           legato=True)
    snare_march(13, 8, 0.38)
    for b in range(13, 21):
        ti.hit(b, 0, pitch='G2' if b % 2 else 'D3', vel=0.55)
    cym.hit(13, 0, 'sus', vel=0.45)

    # ------------------------------------------------------------ 21-28 journey tune
    vn1.seq(21, JOURNEY, vel=0.62, art='legato', legato=True, dyn=[(0, 0.6), (16, 0.7), (28, 0.66), (32, 0.6)])
    fl.seq(21, JOURNEY, tr=12, vel=0.5, legato=True)
    hn.pad(21, JOURNEY_CH, 'G3', 'G4', n=3, vel=0.45, art='sustain')

    def strings_8ths(b, bt, s, bts):
        tones = chord_tones(s, 'G3', 4)
        for k in range(int(bts * 2)):
            va.note(b, bt + k * 0.5, 0.5, tones[[0, 2, 1, 2][k % 4]], 0.5, 'spiccato')
        r = root_at(s, 'C2')
        for k in range(int(bts)):
            vc.note(b, bt + k, 1.0, r, 0.52 if k % 2 == 0 else 0.45, 'staccato')
            if k % 2 == 0:
                cb.note(b, bt + k, 1.0, r - 12 if r - 12 >= 28 else r, 0.55, 'pizz')
    prog_apply(JOURNEY_CH, 21, strings_8ths)
    vn2.pad(21, JOURNEY_CH, 'B3', 'G4', n=2, vel=0.42, art='sustain')
    prog_apply(JOURNEY_CH, 21, lambda b, bt, s, bts: arp(hp, b, s, 'C3', (0, 1, 2, 3, 4, 3, 2, 1), step=0.5,
                                                          vel=0.5, beats=bts, beat=bt))
    for b in range(21, 29):
        sn.pattern(b, "x.......x...x...", vel=0.3)
        if b % 2 == 1:
            ti.hit(b, 0, pitch='G2', vel=0.5)
    tpt.seq(25, "r:h C5:q. D5:e | E5:h. C5:q | r:h F5:q. E5:e | D5:w", vel=0.5, legato=True, check=False)
    glk.seq(25, "F6:h C7:h | E6:h G6:h | F6:h A6:h | F#6:w", vel=0.4)

    # ------------------------------------------------------------ 29-32 head fragments -> bar 1
    TR = ['G', 'F', 'C', 'D7']
    oompah(29, TR, 0.66, offbeat_8th=True)
    hn.pad(29, TR, 'G3', 'A4', n=3, vel=0.42, art='sustain')
    fl.seq(29, "G5:q D6:q. C6:e B5:q", vel=0.62, legato=True)
    cl.seq(30, "F4:q C5:q. Bb4:e A4:q", vel=0.64, legato=True)
    ob.seq(31, "C5:q G5:q. F5:e E5:q", vel=0.64, legato=True)
    hn.seq(32, "D4:q A4:q. G4:e F#4:q", vel=0.62, art='legato', legato=True, slur=False)
    bsn.seq(29, "G2:h. r:q | F2:h. r:q | C3:h. r:q | D3:h C3:q A2:q", vel=0.5)
    snare_march(29, 3, 0.38)
    sn.roll(32, 2, 2, 0.15, 0.45)
    glk.hit(29, 0, pitch='G6', vel=0.45)

    for name, b in [('intro', 1), ('theme', 5), ('theme2', 13), ('journey', 21), ('turn', 29)]:
        sc.cue(name, sc.t(b))
    return sc
