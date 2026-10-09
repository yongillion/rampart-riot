"""Story underscore - "The Rampart Cracks" (tension).

D phrygian, 90 bpm, 20-bar loop (53.3 s). Low D drone, ticking string
pulse, heartbeat timpani, semitone tremolo clusters that creep upward,
low-brass swells and a distant muted echo of the head motif.
  1-4   drone + pulse + col legno ticks
  5-8   tremolo cluster (D-Eb) creeps in, heartbeat
  9-12  distant horn head motif, cluster rises (Eb-E, E-F)
  13-16 intensify: 16th pulse, low brass + choir swells
  17-20 recede to the pulse, lead back to bar 1
"""
from ..score import Score


def build():
    sc = Score('story_tension', bpm=90, bars=20, loop=True, tail=4.0, lufs=-19.0, seed=111, rt60=2.9,
               long_rt60=3.4)
    vn1 = sc.part('vn1', 'violins', gain=-1.0)
    vn2 = sc.part('vn2', 'violins2', gain=-1.0)
    va = sc.part('va', 'violas', gain=-1.0)
    vc = sc.part('vc', 'cellos', gain=0.0)
    vcp = sc.part('vcp', 'cellos', gain=0.0, pan=0.2)
    cb = sc.part('cb', 'basses', gain=0.0)
    tick = sc.part('tick', 'violins', gain=-3.0, pan=-0.4, hall=0.5)
    hn = sc.part('hn', 'horn_solo', gain=-5.0, hall=0.75, dry=0.6, eq=[('highpass', 120, 0.7), ('lowpass', 3500, 0.7)])
    tbn = sc.part('tbn', 'trombones', gain=-3.0)
    tba = sc.part('tba', 'tuba', gain=-4.0)
    ch = sc.part('ch', 'choir', gain=-6.0)
    ti = sc.part('ti', 'timpani', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-6.0)
    tam = sc.part('tam', 'tamtam', gain=-8.0)

    # drone: basses + cellos, slow swells across 4-bar spans
    for b in range(1, 21, 4):
        cb.note(b, 0, 16, 'D2', 0.42, 'sustain', vel_end=0.5)
        vc.note(b, 0, 16, 'D3', 0.32, 'sustain', vel_end=0.4)
    # ticking pulse: cellos staccato 8ths (16ths in 13-16), always present
    for b in range(1, 21):
        dense = 13 <= b <= 16
        step = 0.25 if dense else 0.5
        n = int(4 / step)
        for k in range(n):
            p = 'D3' if k % 4 != 3 else ('Eb3' if b % 2 else 'D3')
            v = 0.42 + (0.1 if k % (4 if dense else 2) == 0 else 0.0) + (0.06 if dense else 0.0)
            vcp.note(b, k * step, step, p, v, 'spiccato')
    # col legno ticks (clock-like), sparse
    for b in range(1, 21):
        for pos in (0.5, 2.5) if b % 2 else (0.5, 1.5, 2.5, 3.25):
            tick.note(b, pos, 0.25, 'A5' if pos < 2 else 'Bb5', 0.45, 'colLegno')
    # heartbeat timpani (lub-dub) from bar 5
    for b in range(5, 21):
        if b >= 17 and b % 2 == 0:
            continue
        ti.hit(b, 0, pitch='D2', vel=0.55 if b < 13 else 0.68)
        ti.hit(b, 0.42, pitch='D2', vel=0.4 if b < 13 else 0.5)
    # tremolo clusters creeping up
    vn1.seq(1, "D5,Eb5:w | D5,Eb5:w | D5,Eb5:w | D5,Eb5:w | "
               "D5,Eb5:w | D5,Eb5:w | D5,Eb5:w | Eb5,E5:w | Eb5,E5:w | E5,F5:w | E5,F5:w | F5,Gb5:w | "
               "F5,Gb5:w | Gb5,G5:w | G5,Ab5:w | G5,Ab5:w | Eb5,D5:w | D5,Eb5:w | D5,Eb5:w | D5,Eb5:w",
            vel=0.22, art='tremolo', legato=True,
            dyn=[(0, 0.22), (16, 0.3), (32, 0.42), (48, 0.48), (64, 0.62), (68, 0.48), (76, 0.3), (80, 0.22)])
    vn2.seq(5, "A4:w | A4:w | Bb4:w | Bb4:w | A4:w | Bb4:w | B4:w | C5:w | C5:w | Db5:w | D5:w | Eb5:w | "
               "A4:w | A4:w | Bb4:w | A4:w", vel=0.3, art='tremolo', legato=True,
            dyn=[(0, 0.24), (32, 0.42), (48, 0.56), (56, 0.4), (64, 0.18)])
    va.seq(9, "D4:w | Eb4:w | D4:w | Eb4:w | F4:w | Eb4:w | E4:w | Eb4:w | D4:w | D4:w | D4:w | D4:w",
           vel=0.34, art='tremolo', legato=True, dyn=[(0, 0.3), (16, 0.48), (32, 0.36), (48, 0.3)])
    # distant horn head motif
    hn.seq(9, "D4:q A4:q. G4:e F4:q | Eb4:w", vel=0.42, art='legato', legato=True)
    hn.seq(11, "D4:q A4:q. G4:e Ab4:q | G4:w", vel=0.46, art='legato', legato=True)
    # low brass + choir swells in the intense section
    tbn.seq(13, "D2,Eb2:w | D2,A2:w | Eb2,Bb2:w | D2,A2:w", vel=0.52, art='swell')
    tba.seq(13, "D1:w | D1:w | Eb1:w | D1:w", vel=0.5, art='swell')
    ch.seq(13, "D4,Eb4,A4:w | D4,F4,A4:w | Eb4,G4,Bb4:w | D4,Eb4,A4:w", vel=0.5, legato=True, vowel='u',
           dyn=[(0, 0.42), (12, 0.6), (16, 0.48)])
    bd.hit(13, 0, vel=0.6)
    bd.hit(15, 0, vel=0.65)
    tam.hit(13, 0, vel=0.45)
    sc.cue('heartbeat', sc.t(5))
    sc.cue('horn_echo', sc.t(9))
    sc.cue('intensify', sc.t(13))
    sc.cue('recede', sc.t(17))
    return sc
