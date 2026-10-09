"""Chapter IV battle - "Heart of Ash".

G minor, 132 bpm, 60-bar loop (109.1 s). Epic and relentless: 16th-note
strings throughout, taiko ensemble, choir, brass fanfares, the Rampart
theme and its head motif thrown between brass sections in canon.
  1-4   intro: taiko ensemble, strings, low-brass stabs
  5-12  "ash march" melody on horns
  13-20 Rampart theme (G minor) in trombones/horns + choir
  21-28 trumpet fanfare over Eb-F-Gm-D
  29-36 male-choir chant + march melody in violins/trumpets
  37-44 head-motif canon over a phrygian Gm-Ab pedal
  45-52 Rampart theme tutti
  53-60 march tutti climax, dominant lead-back to bar 1
"""
from ..score import Score
from .common import (RAMPART_MINOR_CH, ostinato, groove, fill, prog_apply, root_at, tr_chords, bassline)

MF = ("G4:e G4:e D5:q. C5:e Bb4:q | Bb4:q. C5:e G4:h | F4:e F4:e D5:q. C5:e Bb4:q | C5:q. Bb4:e A4:h | "
      "G4:e G4:e D5:q. C5:e Bb4:q | G5:q. F5:e Eb5:h | Eb5:q D5:q C5:q A4:q | G4:h. D4:q")
MF_H = ("D4:e D4:e Bb4:q. A4:e G4:q | G4:q. G4:e Eb4:h | D4:e D4:e Bb4:q. A4:e F4:q | A4:q. G4:e F4:h | "
        "D4:e D4:e Bb4:q. A4:e G4:q | Bb4:q. Bb4:e G4:h | G4:q F4:q Eb4:q F#4:q | D4:h. D4:q")
MF_CH = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', ('Cm', 2), ('D', 2), 'Gm']
RAMP_G = ("G4:q D5:q. C5:e Bb4:q | C5:h. D5:q | Eb5:q. D5:e C5:q Bb4:q | A4:h. D4:q | "
          "G4:q D5:q. C5:e Bb4:q | G5:h. F5:q | Eb5:q D5:q C5:q A4:q | G4:w")
RAMP_G_CH = tr_chords(RAMPART_MINOR_CH, 5)
FANF = ("Bb4:e3 Bb4:e3 Bb4:e3 Eb5:h G4:q | C5:e3 C5:e3 C5:e3 F5:h. | D5:e3 D5:e3 D5:e3 G5:q F5:q D5:q | "
        "F#5:h. D5:q | Bb4:e3 Bb4:e3 Bb4:e3 Eb5:h G5:q | F5:q. Eb5:e D5:q C5:q | D5:q Bb4:q G5:q. F5:e | F#5:w")
FANF_CH = ['Eb', 'F', 'Gm', 'D', 'Eb', 'F', 'Gm', 'D']


def build():
    sc = Score('battle4', bpm=132, bars=60, loop=True, tail=3.0, lufs=-16.0, seed=51, rt60=2.4,
               master=dict(level=True))
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-3.0)
    vc = sc.part('vc', 'cellos', gain=-1.5)
    cb = sc.part('cb', 'basses', gain=-1.0)
    hn = sc.part('hn', 'horns', gain=-3.0)
    tpt = sc.part('tpt', 'trumpets', gain=-6.0)
    tbn = sc.part('tbn', 'trombones', gain=-2.5)
    tba = sc.part('tba', 'tuba', gain=-2.0)
    ch = sc.part('ch', 'choir', gain=-6.0)
    chm = sc.part('chm', 'choir', gain=-4.0, width=0.9)
    tk = sc.part('tk', 'taiko', gain=-5.0)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-3.0)
    sn = sc.part('sn', 'snare', gain=-6.0)
    cym = sc.part('cym', 'cymbal', gain=-2.5)

    def strings16(bar, chs, vel=0.62, kind_lo=0, kind_hi=1, violins=False, vel_vn=0.5):
        def f(b, bt, s, bts):
            ostinato(vc, b, s, 'C2', vel=vel, beats=bts, beat=bt, kind=kind_lo)
            ostinato(va, b, s, 'C3', vel=vel * 0.85, beats=bts, beat=bt, kind=kind_hi)
            r = root_at(s, 'C1')
            r = r + 12 if r < 28 else r
            for k in range(int(bts)):
                cb.note(b, bt + k, 0.5, r, vel * (1.1 if k == 0 else 0.9), 'staccato')
                cb.note(b, bt + k + 0.5, 0.5, r, vel * 0.8, 'staccato')
            if violins:
                ostinato(vn2, b, s, 'G4', vel=vel_vn, beats=bts, beat=bt, kind=1)
        prog_apply(chs, bar, f)

    def lowbrass(b, bt, s, bts, vel=0.6):
        r = root_at(s, 'E2')
        tbn.note(b, bt, bts, r, vel, 'marcato')
        tbn.note(b, bt, bts, r + 7, vel * 0.9, 'marcato')
        tba.note(b, bt, bts, root_at(s, 'G0') if root_at(s, 'G0') >= 26 else root_at(s, 'G0') + 12, vel, 'sustain')

    # ------------------------------------------------------------ 1-4 intro
    INTRO = ['Gm', 'Gm', 'Eb', 'D']
    strings16(1, INTRO, 0.68, violins=True, vel_vn=0.48)
    for i, s in enumerate(INTRO):
        r = root_at(s, 'D2')
        for pos in (0.0, 1.5, 3.0):
            tbn.note(1 + i, pos, 0.5, r, 0.74, 'stab')
            tbn.note(1 + i, pos, 0.5, r + 7, 0.7, 'stab')
            hn.note(1 + i, pos, 0.5, r + 12, 0.74, 'stab')
            tpt.note(1 + i, pos, 0.5, r + 19, 0.6, 'stab')
        tba.note(1 + i, 0, 4, root_at(s, 'G0') + (12 if root_at(s, 'G0') < 26 else 0), 0.64, 'sustain')
    groove(tk, 1, 'D', vel=0.86, bars=4)
    bd.hit(1, 0, vel=0.9)
    bd.hit(3, 0, vel=0.8)
    cym.hit(1, 0, 'crash', vel=0.85)
    ti.pattern(1, "X..x..x.X..x..x.", pitch='G2', vel=0.75)
    ti.pattern(2, "X..x..x.X..x..x.", pitch='D3', vel=0.75)
    ti.roll(4, 0, 4, 0.4, 0.85, pitch='D3')
    ch.pad(1, INTRO, 'D3', 'D5', n=4, spread=1, vel=0.68, vowel='a', dyn=[(0, 0.68), (16, 0.72)])

    # ------------------------------------------------------------ 5-12 ash march (horns)
    hn.seq(5, MF, vel=0.82, art='legato', legato=True, slur=False, dyn=[(0, 0.8), (20, 0.88), (32, 0.82)])
    strings16(5, MF_CH, 0.64)
    vn1.pad(5, MF_CH, 'D5', 'Bb5', n=2, vel=0.45, art='tremolo')
    prog_apply(MF_CH, 5, lambda b, bt, s, bts: lowbrass(b, bt, s, bts, 0.5))
    for b in range(5, 13):
        groove(tk, b, 'B', vel=0.82)
        bd.hit(b, 0, vel=0.7 if b % 2 else 0.6)
    cym.hit(5, 0, 'crash', vel=0.7)
    fill(tk, 12, vel=0.8, beat=2, beats=2)

    # ------------------------------------------------------------ 13-20 Rampart theme + choir
    tbn.seq(13, RAMP_G, tr=-12, vel=0.84, art='legato', legato=True, slur=False,
            dyn=[(0, 0.82), (20, 0.9), (32, 0.84)])
    hn.seq(13, RAMP_G, tr=-12, vel=0.82, art='legato', legato=True, slur=False)
    bassline(tba, 13, RAMP_G_CH, lo='G0', vel=0.62, art='sustain')
    strings16(13, RAMP_G_CH, 0.66, violins=True, vel_vn=0.5)
    vn1.pad(13, RAMP_G_CH, 'D5', 'C6', n=2, vel=0.52, art='tremolo')
    ch.pad(13, RAMP_G_CH, 'D3', 'G5', n=5, spread=1, vel=0.62, vowel='a', dyn=[(0, 0.6), (20, 0.72), (32, 0.64)])
    for b in range(13, 21):
        groove(tk, b, 'D', vel=0.84)
        bd.hit(b, 0, vel=0.72)
        ti.pattern(b, "X.......X...x.x.", pitch='G2' if b % 2 else 'D3', vel=0.72)
    cym.hit(13, 0, 'crash', vel=0.85)
    cym.hit(17, 0, 'crash', vel=0.7)

    # ------------------------------------------------------------ 21-28 trumpet fanfare
    tpt.seq(21, FANF, vel=0.76, art='legato', legato=True, slur=False, dyn=[(0, 0.74), (20, 0.84), (32, 0.8)])
    hn.seq(21, "G4:w | A4:w | Bb4:w | A4:w | G4:w | A4:w | Bb4:w | A4:w", vel=0.62, art='sustain', legato=True)
    hn.seq(21, "Eb4:w | F4:w | D4:w | F#4:w | Eb4:w | F4:w | G4:w | F#4:w", vel=0.6, art='sustain', legato=True)
    vn1.seq(21, FANF, tr=12, vel=0.62, art='legato', legato=True)
    strings16(21, FANF_CH, 0.64, kind_hi=0)
    prog_apply(FANF_CH, 21, lambda b, bt, s, bts: lowbrass(b, bt, s, bts, 0.55))
    ch.pad(21, FANF_CH, 'Bb3', 'D5', n=3, vel=0.5, vowel='o')
    for b in range(21, 29):
        groove(tk, b, 'B', vel=0.8)
        bd.hit(b, 0, vel=0.68)
        sn.pattern(b, "....x.......x..x", vel=0.55)
    cym.hit(21, 0, 'crash', vel=0.8)
    sn.roll(28, 0, 4, 0.25, 0.75)
    cym.note(28, 2, 2, 60, 0.55, 'swell', human=False)

    # ------------------------------------------------------------ 29-36 chant + march in violins
    for i, s in enumerate(MF_CH[:6] + ['Cm', 'D']):
        sym = s if isinstance(s, str) else s[0]
        b = 29 + i
        r = root_at(sym, 'G3')
        third = r + (3 if sym.endswith('m') else 4)
        line = [r, r, third, r, r + 7, third, r, r - 5]
        for k, p in enumerate(line):
            chm.note(b, k * 0.5, 0.5, p, 0.7 if k % 4 == 0 else 0.6, 'stacc', vtype='t', vowel='a')
            chm.note(b, k * 0.5, 0.5, p - 12, 0.66 if k % 4 == 0 else 0.56, 'stacc', vtype='b', vowel='a')
        chm.note(b, 0, 0.5, r - 12, 0.85, 'shout', vtype='b', vowel='a')
    vn1.seq(29, MF, tr=12, vel=0.78, art='legato', legato=True, dyn=[(0, 0.76), (20, 0.86), (32, 0.8)])
    tpt.seq(29, MF, vel=0.68, art='legato', legato=True, slur=False)
    vn2.seq(29, MF_H, tr=12, vel=0.6, art='legato', legato=True)
    strings16(29, MF_CH, 0.68)
    prog_apply(MF_CH, 29, lambda b, bt, s, bts: lowbrass(b, bt, s, bts, 0.58))
    for b in range(29, 37):
        groove(tk, b, 'D', vel=0.86)
        bd.hit(b, 0, vel=0.75)
    cym.hit(29, 0, 'crash', vel=0.85)

    # ------------------------------------------------------------ 37-44 head-motif canon
    CAN = ['Gm', 'Ab', 'Gm', 'Ab', 'Eb', 'D', 'Cm', 'D']
    hn.seq(37, "G3:q D4:q. C4:e Bb3:q", vel=0.84, art='legato', legato=True, slur=False)
    tbn.seq(38, "Ab2:q Eb3:q. Db3:e C3:q", vel=0.86, art='legato', legato=True, slur=False)
    tpt.seq(39, "G4:q D5:q. C5:e Bb4:q", vel=0.76, art='legato', legato=True, slur=False)
    hn.seq(40, "Ab3:q Eb4:q. Db4:e C4:q", vel=0.84, art='legato', legato=True, slur=False)
    tbn.seq(41, "Eb3:q Bb3:q. Ab3:e G3:q", vel=0.86, art='legato', legato=True, slur=False)
    tpt.seq(42, "D5:q A5:q. G5:e F#5:q", vel=0.76, art='legato', legato=True, slur=False)
    hn.seq(43, "C4:q G4:q. F4:e Eb4:q | D4:q A4:q. G4:e F#4:q", vel=0.86, art='legato', legato=True, slur=False)
    tbn.seq(43, "C3:q G3:q. F3:e Eb3:q | D3:q A3:q. G3:e F#3:q", vel=0.86, art='legato', legato=True,
            slur=False)
    tpt.seq(44, "D5:q A5:q. G5:e F#5:q", vel=0.74, art='legato', legato=True, slur=False)
    strings16(37, CAN, 0.7, kind_lo=3, kind_hi=1, violins=True, vel_vn=0.52)
    vn1.pad(37, CAN, 'D5', 'C6', n=2, vel=0.5, art='tremolo', dyn=[(0, 0.5), (32, 0.75)])
    tba.seq(37, "G0:w | Ab0:w | G0:w | Ab0:w | Eb1:w | D1:w | C1:w | D1:w", vel=0.6, art='sustain')
    ch.pad(37, CAN, 'D3', 'Eb5', n=4, spread=1, vel=0.55, vowel='o', dyn=[(0, 0.5), (32, 0.72)])
    for b in range(37, 45):
        groove(tk, b, 'B', vel=0.84)
        ti.pattern(b, "X.....x.X.......", pitch='G2' if b % 2 else 'D3', vel=0.72)
    tk.hit(37, 0, 'odaiko', vel=1.0)
    ti.roll(44, 0, 4, 0.35, 0.9, pitch='D3')
    cym.note(44, 0, 4, 60, 0.7, 'swell', human=False)
    sn.roll(44, 0, 4, 0.2, 0.7)

    # ------------------------------------------------------------ 45-52 Rampart theme tutti
    vn1.seq(45, RAMP_G, vel=0.84, art='legato', legato=True, dyn=[(0, 0.82), (20, 0.92), (32, 0.86)])
    tpt.seq(45, RAMP_G, vel=0.72, art='legato', legato=True, slur=False)
    hn.seq(45, RAMP_G, tr=-12, vel=0.86, art='legato', legato=True, slur=False)
    tbn.seq(45, RAMP_G, tr=-12, vel=0.74, art='legato', legato=True, slur=False)
    bassline(tba, 45, RAMP_G_CH, lo='G0', vel=0.68, art='sustain')
    strings16(45, RAMP_G_CH, 0.7, violins=True, vel_vn=0.55)
    ch.pad(45, RAMP_G_CH, 'D3', 'G5', n=5, spread=1, vel=0.68, vowel='a')
    for b in range(45, 53):
        groove(tk, b, 'D', vel=0.88)
        bd.hit(b, 0, vel=0.78)
        ti.pattern(b, "X...x...X...x.x.", pitch='G2' if b % 2 else 'D3', vel=0.7)
    cym.hit(45, 0, 'crash', vel=0.95)
    cym.hit(49, 0, 'crash', vel=0.8)

    # ------------------------------------------------------------ 53-60 march tutti -> lead back
    vn1.seq(53, MF, tr=12, vel=0.84, art='legato', legato=True, dyn=[(0, 0.82), (20, 0.9), (32, 0.84)])
    hn.seq(53, MF, vel=0.84, art='legato', legato=True, slur=False)
    tpt.seq(53, MF, vel=0.7, art='legato', legato=True, slur=False)
    vn2.seq(53, MF_H, tr=12, vel=0.64, art='legato', legato=True)
    strings16(53, MF_CH, 0.72)
    prog_apply(MF_CH, 53, lambda b, bt, s, bts: lowbrass(b, bt, s, bts, 0.62))
    ch.pad(53, MF_CH, 'D3', 'G5', n=5, spread=1, vel=0.66, vowel='a')
    for b in range(53, 60):
        groove(tk, b, 'D', vel=0.88)
        bd.hit(b, 0, vel=0.76)
    cym.hit(53, 0, 'crash', vel=0.9)
    cym.hit(57, 0, 'crash', vel=0.75)
    fill(tk, 60, vel=0.74)
    ti.roll(60, 0, 4, 0.35, 0.72, pitch='D3')
    cym.note(60, 2, 2, 60, 0.42, 'swell', human=False)

    for name, b in [('intro', 1), ('march', 5), ('rampart', 13), ('fanfare', 21), ('chant', 29),
                    ('canon', 37), ('rampart_tutti', 45), ('march_tutti', 53)]:
        sc.cue(name, sc.t(b))
    return sc
