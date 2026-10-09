"""Boss battle - "The Ashen Champion".

D minor / D phrygian, 140 bpm, 52-bar loop (89.1 s). Syncopated 3+3+2 brass
stabs, the Rampart head in low brass (also augmented), male-choir "HA!"
shouts, heavy taiko + bass drum + snare, phrygian string ostinato.
  1-4   stabs + drums + shouts
  5-12  ostinato, Rampart head in trombones/tuba, shouts
  13-20 boss motif (horns + trumpets)
  21-28 Rampart theme augmented under fortissimo choir
  29-36 build: drums, runs, low-brass swells
  37-44 head-motif canon, stabs, shouts
  45-52 boss motif tutti, fill back to bar 1
"""
from ..score import Score
from .common import ostinato, groove, fill, prog_apply, root_at, bassline

BOSS = ("D5:e D5:e D5:e Eb5:e D5:q A4:q | Bb4:q. C5:e Bb4:q G4:q | A4:e A4:e A4:e Bb4:e A4:q F4:q | "
        "E4:h C#5:h | D5:e D5:e D5:e Eb5:e D5:q A5:q | G5:q. F5:e D5:q Bb4:q | C5:q Bb4:q A4:q C#5:q | D5:w")
BOSS_CH = ['Dm', 'Eb', 'Dm', 'A', 'Dm', 'Bb', ('Gm', 2), ('A', 2), 'Dm']
AUG = "D4:h A4:h | G4:h F4:h | G4:w | A4:w | Bb4:h A4:h | G4:h F4:h | E4:w | A3:w"
AUG_CH = ['Dm', 'Dm', 'Gm', 'A', 'Bb', 'Gm', 'A7', 'A']
STABS = {
    '332': (0.0, 1.5, 3.0),
    'syn': (0.0, 0.75, 1.5, 2.5, 3.0),
    'off': (0.5, 1.5, 2.0, 3.5),
    'push': (0.0, 1.5, 2.5, 3.5),
}


def build():
    sc = Score('boss', bpm=140, bars=52, loop=True, tail=3.0, lufs=-16.0, seed=61, rt60=2.3,
               master=dict(level=True))
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-3.0)
    vc = sc.part('vc', 'cellos', gain=-1.0)
    cb = sc.part('cb', 'basses', gain=-0.5)
    hn = sc.part('hn', 'horns', gain=-2.5)
    tpt = sc.part('tpt', 'trumpets', gain=-5.5)
    tbn = sc.part('tbn', 'trombones', gain=-1.5)
    tba = sc.part('tba', 'tuba', gain=-1.5)
    ch = sc.part('ch', 'choir', gain=-6.0)
    sh = sc.part('sh', 'choir', gain=-1.0, width=1.0, hall=0.4)
    tk = sc.part('tk', 'taiko', gain=-4.5)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-2.0)
    sn = sc.part('sn', 'snare', gain=-4.0)
    cym = sc.part('cym', 'cymbal', gain=-2.5)
    fx = sc.part('fx', 'fx', gain=-4.0)

    def ost(bar, chs, vel=0.66, kind=3, viola=True):
        def f(b, bt, s, bts):
            ostinato(vc, b, s, 'C2', vel=vel, beats=bts, beat=bt, kind=kind, accents=(0, 3, 6, 10, 12))
            if viola:
                ostinato(va, b, s, 'C3', vel=vel * 0.82, beats=bts, beat=bt, kind=kind, accents=(0, 3, 6, 10, 12))
            r = root_at(s, 'C1')
            r = r + 12 if r < 28 else r
            for k in range(int(bts * 2)):
                cb.note(b, bt + k * 0.5, 0.5, r, vel * (1.12 if k % 4 == 0 else 0.86), 'staccato')
        prog_apply(chs, bar, f)

    def stabs(bar, sym, kind='332', vel=0.8, tpts=True, low=True):
        r = root_at(sym, 'D4')
        third = r + (3 if sym.endswith('m') else 4)
        for pos in STABS[kind]:
            hn.note(bar, pos, 0.5, r, vel * 0.9, 'stab')
            hn.note(bar, pos, 0.5, third, vel * 0.85, 'stab')
            if tpts:
                tpt.note(bar, pos, 0.5, third + 12 if third + 12 <= 79 else third, vel * 0.85, 'stab')
                tpt.note(bar, pos, 0.5, r + 7, vel * 0.8, 'stab')
            if low:
                tbn.note(bar, pos, 0.5, root_at(sym, 'D2'), vel, 'stab')
                tbn.note(bar, pos, 0.5, root_at(sym, 'D2') + 7, vel * 0.9, 'stab')

    def shouts(bar, positions, vel=0.9, pitch='D3'):
        for pos in positions:
            sh.note(bar, pos, 0.5, pitch, vel, 'shout', vtype='b', vowel='a')
            sh.note(bar, pos, 0.5, pitch, vel * 0.92, 'shout', vtype='t', vowel='a')

    def drums(bar, kind='D', vel=0.88, snare=True):
        groove(tk, bar, kind, vel=vel)
        bd.hit(bar, 0, vel=0.85)
        bd.hit(bar, 2, vel=0.7)
        if snare:
            sn.pattern(bar, "....X.......X..x", vel=0.7)

    # ------------------------------------------------------------ 1-4 stabs + drums
    OPEN = ['Dm', 'Eb', 'Dm', 'Eb']
    for i, s in enumerate(OPEN):
        stabs(1 + i, s, '332' if i % 2 == 0 else 'syn', vel=0.84)
        drums(1 + i, 'D', 0.88)
        shouts(1 + i, (0.0,) if i % 2 == 0 else (1.5, 3.0), 0.9)
    ost(1, OPEN, 0.68)
    tba.seq(1, "D1:w | Eb1:w | D1:w | Eb1:w", vel=0.66, art='sustain')
    vn1.pad(1, OPEN, 'D5', 'Bb5', n=2, vel=0.55, art='tremolo')
    vn2.pad(1, OPEN, 'F4', 'D5', n=2, vel=0.55, art='tremolo')
    cym.hit(1, 0, 'crash', vel=0.9)
    fx.hit(1, 0, 'boom', vel=0.7)
    ti.pattern(1, "X..X..X.X..X..X.", pitch='D3', vel=0.78)
    ti.pattern(3, "X..X..X.X..X..X.", pitch='D3', vel=0.78)

    # ------------------------------------------------------------ 5-12 Rampart head in low brass
    HEADS = ['Dm', 'Dm', 'Gm', 'A', 'Dm', 'Dm', 'Bb', 'A']
    tbn.seq(5, "D3:q A3:q. G3:e F3:q | G3:h. A3:q | Bb3:q. A3:e G3:q F3:q | E3:h. A2:q | "
               "D3:q A3:q. G3:e F3:q | D4:h. C4:q | Bb3:q A3:q G3:q E3:q | D3:h. A2:q",
            vel=0.86, art='legato', legato=True, slur=False, dyn=[(0, 0.84), (32, 0.92)])
    tba.seq(5, "D1:q A1:q. G1:e F1:q | G1:h. A1:q | Bb1:q. A1:e G1:q F1:q | E1:h. A0:q | "
               "D1:q A1:q. G1:e F1:q | D2:h. C2:q | Bb1:q A1:q G1:q E1:q | D1:h. A0:q",
            vel=0.74, art='legato', legato=True, slur=False)
    ost(5, HEADS, 0.66)
    vn1.pad(5, HEADS, 'D5', 'C6', n=2, vel=0.5, art='tremolo')
    for i in range(8):
        b = 5 + i
        drums(b, 'B' if i < 4 else 'D', 0.84)
        shouts(b, (0.0, 2.5) if i % 2 == 0 else (1.5,), 0.86)
        if i % 2 == 1:
            stabs(b, HEADS[i], 'off', vel=0.66, low=False)
    cym.hit(5, 0, 'crash', vel=0.8)
    cym.hit(9, 0, 'crash', vel=0.7)

    # ------------------------------------------------------------ 13-20 boss motif
    hn.seq(13, BOSS, tr=-12, vel=0.86, art='legato', legato=True, slur=False,
           dyn=[(0, 0.84), (20, 0.92), (32, 0.86)])
    tpt.seq(13, BOSS, vel=0.74, art='legato', legato=True, slur=False, dyn=[(0, 0.72), (20, 0.82), (32, 0.76)])
    vn1.seq(13, BOSS, vel=0.72, art='legato', legato=True)
    ost(13, BOSS_CH, 0.68)

    def lowpulse(b, bt, s, bts):
        r = root_at(s, 'D2')
        for k in range(int(bts)):
            tbn.note(b, bt + k, 0.5, r, 0.66, 'staccato')
            tbn.note(b, bt + k, 0.5, r + 7, 0.6, 'staccato')
        tba.note(b, bt, bts, root_at(s, 'A0') + (12 if root_at(s, 'A0') < 26 else 0), 0.62, 'sustain')
    prog_apply(BOSS_CH, 13, lowpulse)
    ch.pad(13, BOSS_CH, 'D3', 'A4', n=4, spread=1, vel=0.6, vowel='a')
    for b in range(13, 21):
        drums(b, 'D', 0.86)
        if b % 2 == 0:
            shouts(b, (3.0,), 0.85)
    cym.hit(13, 0, 'crash', vel=0.9)
    cym.hit(17, 0, 'crash', vel=0.75)

    # ------------------------------------------------------------ 21-28 augmented theme + choir ff
    ch.seq(21, AUG, vel=0.8, legato=True, vowel='a', dyn=[(0, 0.78), (16, 0.88), (32, 0.82)])
    ch.seq(21, AUG, tr=-12, vel=0.8, legato=True, vowel='a', vtype='t')
    ch.pad(21, AUG_CH, 'D3', 'F4', n=3, vel=0.66, vowel='a')
    hn.seq(21, AUG, vel=0.84, art='legato', legato=True, slur=False)
    tbn.seq(21, AUG, tr=-12, vel=0.82, art='legato', legato=True, slur=False)
    bassline(tba, 21, AUG_CH, lo='A0', vel=0.68, art='sustain')
    ost(21, AUG_CH, 0.7)
    vn1.pad(21, AUG_CH, 'D5', 'D6', n=2, vel=0.6, art='tremolo')
    vn2.pad(21, AUG_CH, 'A4', 'F5', n=2, vel=0.58, art='tremolo')
    for i in range(8):
        b = 21 + i
        stabs(b, AUG_CH[i], 'push', vel=0.66, low=False)
        drums(b, 'D', 0.88)
    cym.hit(21, 0, 'crash', vel=0.95)
    cym.hit(25, 0, 'crash', vel=0.8)
    fx.hit(21, 0, 'boom', vel=0.65)

    # ------------------------------------------------------------ 29-36 build
    BLD = ['Dm', 'Eb', 'Dm', 'Eb', 'Bb', 'C', 'Gm', 'A']
    ost(29, BLD, 0.66, viola=True)
    runs = {0: "D5:s E5:s F5:s G5:s A5:s Bb5:s A5:s G5:s " * 2, 1: "Eb5:s F5:s G5:s Ab5:s Bb5:s C6:s Bb5:s Ab5:s " * 2}
    for i in range(8):
        vn1.seq(29 + i, runs[i % 2].strip(), vel=0.5 + 0.03 * i, art='spiccato', check=False)
    tbn.seq(29, "D2,A2:w | Eb2,Bb2:w | D2,A2:w | Eb2,Bb2:w | Bb1,F2:w | C2,G2:w | G1,D2:w | A1,E2:w", vel=0.7,
            art='swell')
    tba.seq(29, "D1:w | Eb1:w | D1:w | Eb1:w | Bb0:w | C1:w | G0:w | A0:w", vel=0.62, art='swell')
    hn.pad(33, BLD[4:], 'A3', 'A4', n=3, vel=0.6, art='swell', legato=False)
    for i in range(8):
        b = 29 + i
        groove(tk, b, 'C' if i < 4 else 'B', vel=0.78 + 0.02 * i)
        bd.hit(b, 0, vel=0.75)
        if i >= 4:
            sn.pattern(b, "....x.......x.x.", vel=0.55 + 0.04 * i)
    shouts(32, (3.0,), 0.85)
    shouts(36, (1.5, 3.0), 0.9)
    ti.roll(35, 0, 8, 0.3, 0.95, pitch='A2')
    cym.note(36, 0, 4, 60, 0.7, 'swell', human=False)

    # ------------------------------------------------------------ 37-44 head canon + stabs
    CAN = ['Dm', 'Eb', 'Dm', 'Eb', 'Bb', 'A', 'Gm', 'A']
    tbn.seq(37, "D3:q A3:q. G3:e F3:q", vel=0.88, art='legato', legato=True, slur=False)
    hn.seq(38, "Eb4:q Bb4:q. Ab4:e G4:q", vel=0.86, art='legato', legato=True, slur=False)
    tpt.seq(39, "D5:q A5:q. G5:e F5:q", vel=0.78, art='legato', legato=True, slur=False)
    tbn.seq(40, "Eb3:q Bb3:q. Ab3:e G3:q", vel=0.88, art='legato', legato=True, slur=False)
    hn.seq(41, "Bb3:q F4:q. Eb4:e D4:q", vel=0.86, art='legato', legato=True, slur=False)
    tpt.seq(42, "A4:q E5:q. D5:e C#5:q", vel=0.78, art='legato', legato=True, slur=False)
    tbn.seq(43, "G2:q D3:q. C3:e Bb2:q | A2:h. A2:q", vel=0.9, art='legato', legato=True, slur=False)
    hn.seq(43, "G3:q D4:q. C4:e Bb3:q | A3:h. C#4:q", vel=0.88, art='legato', legato=True, slur=False)
    tba.seq(37, "D1:w | Eb1:w | D1:w | Eb1:w | Bb0:w | A0:w | G0:w | A0:w", vel=0.66, art='sustain')
    ost(37, CAN, 0.7)
    vn2.pad(37, CAN, 'A4', 'G5', n=2, vel=0.58, art='tremolo')
    ch.pad(37, CAN, 'D3', 'Bb4', n=4, spread=1, vel=0.62, vowel='o')
    for i in range(8):
        b = 37 + i
        drums(b, 'D', 0.9)
        shouts(b, (0.0, 1.5) if i % 2 else (3.0,), 0.9)
        stabs(b, CAN[i], 'syn' if i % 2 else '332', vel=0.6, low=False, tpts=(i % 3 != 2))
    cym.hit(37, 0, 'crash', vel=0.95)
    fx.hit(37, 0, 'boom', vel=0.75)
    cym.hit(41, 0, 'crash', vel=0.8)

    # ------------------------------------------------------------ 45-52 boss motif tutti -> bar 1
    vn1.seq(45, BOSS, tr=12, vel=0.82, art='legato', legato=True)
    vn2.seq(45, BOSS, vel=0.72, art='legato', legato=True)
    hn.seq(45, BOSS, tr=-12, vel=0.88, art='legato', legato=True, slur=False)
    tpt.seq(45, BOSS, vel=0.76, art='legato', legato=True, slur=False)
    ost(45, BOSS_CH, 0.72)
    prog_apply(BOSS_CH, 45, lowpulse)
    ch.pad(45, BOSS_CH, 'D3', 'A5', n=5, spread=1, vel=0.7, vowel='a')
    for b in range(45, 52):
        drums(b, 'D', 0.9)
        if b % 2 == 1:
            shouts(b, (0.0,), 0.9)
    cym.hit(45, 0, 'crash', vel=0.95)
    cym.hit(49, 0, 'crash', vel=0.8)
    fill(tk, 52, vel=0.8)
    sn.roll(52, 0, 4, 0.3, 0.7)
    ti.roll(52, 0, 4, 0.35, 0.8, pitch='A2')
    shouts(52, (3.0, 3.5), 0.95, pitch='A2')
    cym.note(52, 0, 4, 60, 0.7, 'swell', human=False)
    fx.note(51, 0, 8, 'A3', 0.55, 'riser', human=False)

    for name, b in [('stabs', 1), ('head', 5), ('boss_motif', 13), ('choir', 21), ('build', 29),
                    ('canon', 37), ('tutti', 45)]:
        sc.cue(name, sc.t(b))
    return sc
