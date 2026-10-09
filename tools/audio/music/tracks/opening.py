"""Opening movie score - "The Cinder Heart" (played once, exact timing).

96 bpm, 4/4, bar = 2.5 s. Section map (seconds):
   0.0  Void        low D drone, soft choir 'oh', high bell at 2.0, air
   7.5  IMPACT      boom + taiko + timpani + low-brass cluster, choir cluster swell to 10.0
  10.0  Ashen Host  low strings 16ths D-D-D-Eb, war drums, low brass
  20.0  The Wall    Rampart theme on horns, building; big chord at 37.5
  40.0  Forgotten   harp/celesta theme fragment in F major
  50.0  Beacons     tremolo crescendo, heartbeat timpani; 8 beacon hits 55.0..63.75 (every 1.25 s)
  65.0  BREACH      massive hit, chaotic brass stabs to 67.5
  67.5  Warden's call: solo horn D4-A4-G4-F4 (to 70.0)
  70.0  snare roll + cymbal swell + riser, cut at 72.2, near-silence
  72.5  TITLE SLAM  tutti theme head (leitmotif bars 1-4) to 82.5
  82.5  final D major (Picardy) chord, decaying to ~90 s
"""
import numpy as np

from ..score import Score, pm
from .common import (RAMPART_MINOR, RAMPART_MINOR_A, RAMPART_MINOR_CH, prog_apply, root_at, ost16,
                     chord_tones)

BEACONS = [55.0 + 1.25 * i for i in range(8)]
BEACON_TIMP = ['D2', 'E2', 'F2', 'G2', 'A2', 'Bb2', 'C3', 'D3']
BEACON_BRASS = [('D2', 'A2'), ('E2', 'Bb2'), ('F2', 'C3'), ('G2', 'D3'), ('A2', 'E3'), ('Bb2', 'F3'),
                ('C3', 'G3'), ('D3', 'A3')]
BEACON_GLOCK = ['A5', 'Bb5', 'C6', 'D6', 'E6', 'F6', 'G6', 'A6']
STAB_TIMES = [65.0 + k * 0.15625 for k in (0, 2, 3, 6, 9, 10, 13, 14)]


def build():
    sc = Score('opening', bpm=96, bars=36, loop=False, tail=3.0, lufs=-16.0, seed=131, rt60=2.8,
               long_rt60=3.4, length_s=88.0)
    T = sc.t
    vn1 = sc.part('vn1', 'violins')
    vn2 = sc.part('vn2', 'violins2')
    va = sc.part('va', 'violas', gain=-2.0)
    vc = sc.part('vc', 'cellos', gain=-1.0)
    cb = sc.part('cb', 'basses', gain=0.0)
    hn = sc.part('hn', 'horns', gain=-2.0)
    hns = sc.part('hns', 'horn_solo', gain=0.0, hall=0.6)
    tpt = sc.part('tpt', 'trumpets', gain=-5.0)
    tbn = sc.part('tbn', 'trombones', gain=-2.0)
    tba = sc.part('tba', 'tuba', gain=-2.0)
    ch = sc.part('ch', 'choir', gain=-4.0)
    bel = sc.part('bel', 'bells', gain=-6.0, long=0.8)
    glk = sc.part('glk', 'glock', gain=-6.0, hall=0.55)
    hp = sc.part('hp', 'harp', gain=0.0)
    cel = sc.part('cel', 'celesta', gain=0.0)
    fl = sc.part('fl', 'flute', gain=-2.0)
    ti = sc.part('ti', 'timpani', gain=0.0)
    tk = sc.part('tk', 'taiko', gain=-2.0)
    bd = sc.part('bd', 'bassdrum', gain=-2.0)
    tam = sc.part('tam', 'tamtam', gain=-2.0)
    cym = sc.part('cym', 'cymbal', gain=-2.0)
    fx = sc.part('fx', 'fx', gain=-2.0)
    # dry-ish parts for the 70-72.2 s build so the 72.2-72.5 gap stays nearly silent
    sn_b = sc.part('sn_b', 'snare', gain=-1.0, hall=0.06)
    cym_b = sc.part('cym_b', 'cymbal', gain=-3.0, hall=0.06)
    fx_b = sc.part('fx_b', 'fx', gain=-3.0, hall=0.04)
    ti_b = sc.part('ti_b', 'timpani', gain=-3.0, hall=0.06)

    def hit_all(t, vel=1.0, timp='D2', boom=True, crash=True, tamtam=True):
        if boom:
            fx.at(t, 1.0, 60, vel, 'boom')
        tk.at(t, 0.5, 60, vel, 'odaiko')
        tk.at(t, 0.5, 60, vel * 0.85, 'odaiko', pan_off=-0.3)
        tk.at(t, 0.5, 60, vel * 0.8, 'chu', pan_off=0.3)
        ti.at(t, 0.5, timp, vel, 'hit')
        bd.at(t, 0.5, 60, vel, 'hit')
        if tamtam:
            tam.at(t, 0.5, 60, vel * 0.85, 'hit')
        if crash:
            cym.at(t, 0.5, 60, vel * 0.9, 'crash')

    # ================================================================ Void 0-7.5
    cb.at(0.0, 7.45, 'D2', 0.26, 'sustain', vel_end=0.42)
    vc.at(0.0, 7.45, 'D2', 0.22, 'sustain', vel_end=0.36)
    vc.at(0.6, 6.85, 'A2', 0.18, 'sustain', vel_end=0.3)
    ch.at(1.0, 6.45, 'D3', 0.26, 'sustain', vel_end=0.36, vowel='o')
    ch.at(1.2, 6.25, 'A3', 0.24, 'sustain', vel_end=0.34, vowel='o')
    ch.at(2.6, 4.85, 'D4', 0.2, 'sustain', vel_end=0.3, vowel='o')
    bel.at(2.0, 0.5, 'A5', 0.55, 'hit')
    fx.at(0.0, 7.6, 60, 0.6, 'wind')
    fx.at(5.5, 2.0, 60, 0.55, 'reverse')
    sc.cue('void', 0.0)
    sc.cue('bell', 2.0)

    # ================================================================ IMPACT 7.5
    hit_all(7.5, 1.0, 'D2')
    for p in ('D2', 'Eb2', 'A2'):
        tbn.at(7.5, 2.4, p, 0.95, 'marcato', vel_end=0.45)
    tba.at(7.5, 2.4, 'D1', 0.95, 'marcato', vel_end=0.5)
    hn.at(7.5, 2.4, 'D3', 0.85, 'marcato', vel_end=0.4)
    hn.at(7.5, 2.4, 'Eb3', 0.8, 'marcato', vel_end=0.4)
    cb.at(7.5, 2.45, 'D2', 0.85, 'marcato', vel_end=0.5)
    vc.at(7.5, 2.45, 'D2', 0.85, 'marcato', vel_end=0.5)
    for p, v in (('D4', 0.35), ('Eb4', 0.33), ('F4', 0.33), ('A4', 0.32), ('Bb4', 0.3)):
        ch.at(7.55, 2.4, p, v, 'sustain', vel_end=v + 0.45, vowel='a')
    sc.cue('impact', 7.5)

    # ================================================================ Ashen Host 10-20 (bars 5-8)
    sc.cue('ashen_host', 10.0)
    for b in range(5, 9):
        for beat in range(4):
            for k, p in enumerate(('D', 'D', 'D', 'Eb')):
                acc = 1.15 if k == 0 else 0.95
                v = (0.55 + 0.05 * (b - 5)) * acc
                vc.note(b, beat + k * 0.25, 0.25, p + '3', v, 'spiccato', human=False)
                cb.note(b, beat + k * 0.25, 0.25, p + '2', v, 'spiccato', human=False)
        tk.hit(b, 0, 'odaiko', vel=0.85, human=False)
        tk.hit(b, 2, 'odaiko', vel=0.75, human=False)
        tk.hit(b, 1, 'chu', vel=0.65, pan_off=0.25, human=False)
        tk.hit(b, 3, 'chu', vel=0.68, pan_off=0.25, human=False)
        tk.hit(b, 3.5, 'chu', vel=0.55, pan_off=-0.25, human=False)
        ti.hit(b, 0, pitch='D2', vel=0.7, human=False)
        bd.hit(b, 0, vel=0.6, human=False)
    tbn.seq(5, "D2,A2:w | D2,A2:h Eb2,Bb2:h | D2,A2:w | Eb2,Bb2:h D2,A2:h", vel=0.6, art='swell')
    tba.seq(5, "D1:w | D1:h Eb1:h | D1:w | Eb1:h D1:h", vel=0.6, art='swell')
    hn.seq(7, "D3:q Eb3:q D3:h | A2:q Bb2:q A2:h", vel=0.66, art='legato', legato=True, slur=False)
    va.seq(5, "D4,Eb4:w | D4,Eb4:w | D4,Eb4:w | D4,Eb4:w", vel=0.4, art='tremolo', legato=True,
           dyn=[(0, 0.32), (16, 0.6)])
    ti.roll(8, 2, 2, 0.35, 0.8, pitch='A2')
    cym.note(8, 2, 2, 60, 0.5, 'swell', human=False)

    # ================================================================ The Wall 20-40 (bars 9-16)
    sc.cue('the_wall', 20.0)
    hn.seq(9, RAMPART_MINOR, vel=0.8, art='legato', legato=True, slur=False,
           dyn=[(0, 0.76), (16, 0.84), (24, 0.9), (32, 0.95)])
    for i, s in enumerate(RAMPART_MINOR_CH[:4]):
        b = 9 + i
        for beat in range(4):
            r = root_at(s, 'C2')
            for k in range(4):
                vc.note(b, beat + k * 0.25, 0.25, r if k != 2 else r + 7, 0.56 * (1.12 if k == 0 else 0.92),
                        'spiccato')
            cb.note(b, beat, 1, root_at(s, 'C2'), 0.6 if beat in (0, 2) else 0.5, 'staccato')
        ost16(va, b, s, 'A3', vel=0.46 + 0.02 * i)
        ti.hit(b, 0, pitch='D3' if i % 2 == 0 else 'A2', vel=0.72)
    vn1.pad(9, RAMPART_MINOR_CH[:4], 'A4', 'F5', n=2, vel=0.42, art='tremolo', dyn=[(0, 0.4), (16, 0.6)])
    vn2.pad(9, RAMPART_MINOR_CH[:4], 'D4', 'A4', n=2, vel=0.42, art='tremolo', dyn=[(0, 0.4), (16, 0.58)])
    tba.seq(9, "D1:w | G1:w | Bb1:w | A1:w", vel=0.5, art='sustain')
    ch.pad(9, RAMPART_MINOR_CH[:4], 'D3', 'E5', n=4, spread=1, vel=0.4, vowel='o', dyn=[(0, 0.38), (16, 0.55)])
    # bars 13-16: violins + trumpets join, full
    vn1.seq(13, "D5:q A5:q. G5:e F5:q | D6:h. C6:q | Bb5:q A5:q G5:q E5:q | D5:w", vel=0.84, art='legato',
            legato=True, check=False)
    tpt.seq(13, "D4:q A4:q. G4:e F4:q | D5:h. C5:q | Bb4:q A4:q G4:q E4:q | D4:w", vel=0.74, art='legato',
            legato=True, slur=False, check=False)
    vn2.seq(13, "A4:q F5:q. E5:e D5:q | F5:h. E5:q | G5:q F5:q E5:q C#5:q", vel=0.7, art='legato',
            legato=True, check=False)
    tbn.seq(13, "D3:h A2:h | Bb2:h. C3:q | G2:h A2:h", vel=0.72, art='marcato', check=False)
    tba.seq(13, "D1:w | Bb0:h. C1:q | G0:h A0:h", vel=0.62, art='sustain', check=False)
    TAIL4 = RAMPART_MINOR_CH[4:9]
    prog_apply(TAIL4, 13, lambda b, bt, s, bts: ost16(va, b, s, 'A3', vel=0.55, beats=bts, beat=bt))

    def low_drive(b, bt, s, bts):
        r = root_at(s, 'C2')
        for k in range(int(bts * 2)):
            vc.note(b, bt + k * 0.5, 0.5, r if k % 2 == 0 else r + 12, 0.64, 'staccato')
            cb.note(b, bt + k * 0.5, 0.5, r, 0.64, 'staccato')
    prog_apply(TAIL4, 13, low_drive)
    ch.pad(13, TAIL4, 'D3', 'G5', n=5, spread=1, vel=0.62, vowel='a', dyn=[(0, 0.6), (12, 0.75)])
    for b in range(13, 16):
        tk.pattern(b, "X..x..x.X..x.x..", art='chu', vel=0.72, human=False)
        tk.hit(b, 0, 'odaiko', vel=0.85, human=False)
        ti.pattern(b, "x...x...x...x.x.", pitch='D3' if b % 2 else 'A2', vel=0.68)
    cym.hit(13, 0, 'crash', vel=0.85, human=False)
    ti.roll(15, 2, 2, 0.4, 0.85, pitch='A2')
    # big chord at bar 16 (37.5 s)
    t16 = T(16)
    hit_all(t16, 0.92, 'D2', boom=False, tamtam=False)
    for p in ('D3', 'A3', 'D4', 'F4'):
        hn.at(t16, 2.3, p, 0.88, 'marcato', vel_end=0.5)
    for p in ('A4', 'D5', 'F5'):
        tpt.at(t16, 2.0, p, 0.76, 'marcato', vel_end=0.4)
    for p in ('D2', 'A2', 'D3'):
        tbn.at(t16, 2.3, p, 0.82, 'marcato', vel_end=0.45)
    tba.at(t16, 2.3, 'D1', 0.75, 'sustain', vel_end=0.4)
    for p in ('F5', 'A5', 'D6'):
        vn1.at(t16, 2.4, p, 0.8, 'marcato', vel_end=0.4)
    for p in ('A4', 'D5'):
        vn2.at(t16, 2.4, p, 0.76, 'marcato', vel_end=0.4)
    va.at(t16, 2.4, 'F4', 0.72, 'marcato', vel_end=0.4)
    vc.at(t16, 2.4, 'D3', 0.8, 'marcato', vel_end=0.4)
    vc.at(t16, 2.4, 'A2', 0.76, 'marcato', vel_end=0.4)
    cb.at(t16, 2.4, 'D2', 0.8, 'marcato', vel_end=0.4)
    for p in ('D3', 'A3', 'F4', 'A4', 'D5'):
        ch.at(t16, 2.3, p, 0.75, 'sustain', vel_end=0.4, vowel='a')
    sc.cue('wall_chord', t16)

    # ================================================================ Forgotten 40-50 (bars 17-20)
    sc.cue('forgotten', 40.0)
    FG = ['F', 'Bb', 'Gm', 'C']
    cel.seq(17, "F5:q C6:q. Bb5:e A5:q | Bb5:h. C6:q | D6:q. C6:e Bb5:q A5:q | G5:h. C5:q", vel=0.55)
    hp.seq(17, "F4:q C5:q. Bb4:e A4:q | Bb4:h. C5:q | D5:q. C5:e Bb4:q A4:q | G4:h. C4:q", vel=0.45)
    def harp_arp(b, bt, s, bts):
        tones = chord_tones(s, 'F2', 6)
        for k, idx in enumerate((0, 1, 2, 3, 4, 3, 2, 1)):
            hp.note(b, bt + k * 0.5, 0.5, tones[idx], 0.38, 'pluck')
    prog_apply(FG, 17, harp_arp)
    vn2.pad(17, FG, 'A3', 'F4', n=2, vel=0.3, art='sustain')
    va.pad(17, FG, 'C3', 'A3', n=2, vel=0.3, art='sustain')
    vc.seq(17, "F2:w | Bb2:w | G2:w | C3:w", vel=0.32, art='sustain', legato=True)
    fl.seq(19, "D5:q. C5:e Bb4:q A4:q | G4:h. r:q", vel=0.4, legato=True, check=False)

    # ================================================================ Beacons 50-65 (bars 21-26)
    sc.cue('beacons', 50.0)
    cb.at(50.0, 15.0, 'D2', 0.32, 'sustain', vel_end=0.8)
    vc.seq(21, "D3,A3:w | D3,A3:w | D3,Bb3:w | D3,Bb3:w | D3,C4:w | D3,C4:w", vel=0.3, art='tremolo',
           legato=True, dyn=[(0, 0.3), (24, 0.85)])
    va.seq(21, "F4:w | F4:w | G4:w | G4:w | A4:w | Bb4:w", vel=0.3, art='tremolo', legato=True,
           dyn=[(0, 0.28), (24, 0.82)])
    vn2.seq(21, "A4:w | A4:w | Bb4:w | C5:w | D5:w | Eb5:w", vel=0.3, art='tremolo', legato=True,
            dyn=[(0, 0.28), (24, 0.82)])
    vn1.seq(21, "D5:w | D5:w | F5:w | G5:w | A5:w | Bb5:w", vel=0.28, art='tremolo', legato=True,
            dyn=[(0, 0.25), (24, 0.85)])
    ch.seq(23, "D4,A4:w | D4,Bb4:w | F4,C5:w | G4,D5:w", vel=0.3, legato=True, vowel='a',
           dyn=[(0, 0.3), (16, 0.75)])
    # heartbeat timpani (50-55), then the beacons
    for b in (21, 22):
        for beat in (0, 2):
            ti.hit(b, beat, pitch='D2', vel=0.5 + 0.05 * (b - 21), human=False)
            ti.hit(b, beat + 0.4, pitch='D2', vel=0.36 + 0.05 * (b - 21), human=False)
    for i, t in enumerate(BEACONS):
        v = 0.74 + 0.03 * i
        ti.at(t, 0.5, BEACON_TIMP[i], v, 'hit')
        lo, hi = BEACON_BRASS[i]
        tbn.at(t, 0.55, lo, v, 'stab')
        tbn.at(t, 0.55, hi, v * 0.95, 'stab')
        tba.at(t, 0.55, pm(lo) - 12, v * 0.9, 'staccato')
        hn.at(t, 0.55, pm(hi) + 12, v * 0.8, 'stab')
        glk.at(t + 0.01, 0.5, BEACON_GLOCK[i], 0.45 + 0.03 * i, 'hit')
        tk.at(t, 0.5, 60, 0.6 + 0.03 * i, 'chu')
        sc.cue('beacon%d' % (i + 1), t)
    sn_b.at(63.75, 1.2, 60, 0.15, 'roll', vel_end=0.6)
    cym.at(63.75, 1.25, 60, 0.55, 'swell')

    # ================================================================ BREACH 65.0
    sc.cue('breach', 65.0)
    hit_all(65.0, 1.0, 'D2')
    for t in STAB_TIMES:
        k = STAB_TIMES.index(t)
        cl = [('D4', 'F4', 'A4'), ('Eb4', 'G4', 'Bb4')][k % 2]
        for p in cl:
            hn.at(t, 0.3, p, 0.86, 'stab')
        for p in [('D5', 'F5'), ('Eb5', 'Bb5')][k % 2]:
            tpt.at(t, 0.3, p, 0.78, 'stab')
        for p in [('D2', 'A2'), ('Eb2', 'Bb2')][k % 2]:
            tbn.at(t, 0.3, p, 0.9, 'stab')
        if k % 3 == 0:
            ti.at(t, 0.3, 'D2', 0.8, 'hit')
        tk.at(t, 0.3, 60, 0.7, 'chu', pan_off=0.3 * (1 if k % 2 else -1))
    for p, v in (('D5', 0.8), ('Eb5', 0.8), ('A5', 0.75)):
        vn1.at(65.0, 2.45, p, v, 'tremolo', vel_end=0.5)
    for p in ('D4', 'Eb4', 'A4'):
        vn2.at(65.0, 2.45, p, 0.78, 'tremolo', vel_end=0.45)
        va.at(65.0, 2.45, p, 0.72, 'tremolo', vel_end=0.4)
    vc.at(65.0, 2.45, 'D3', 0.85, 'tremolo', vel_end=0.4)
    cb.at(65.0, 2.45, 'D2', 0.9, 'marcato', vel_end=0.4)
    tba.at(65.0, 2.4, 'D1', 0.9, 'marcato', vel_end=0.4)
    for p in ('D3', 'Eb3', 'A3', 'D4'):
        ch.at(65.0, 2.3, p, 0.8, 'sustain', vel_end=0.35, vowel='a')

    # ================================================================ Warden's call 67.5-70
    sc.cue('warden_call', 67.5)
    q = 0.625
    call = [(67.5, q, 'D4'), (67.5 + q, 1.5 * q, 'A4'), (67.5 + 2.5 * q, 0.5 * q, 'G4'), (67.5 + 3 * q, q, 'F4')]
    for t, d, p in call:
        hns.add(t, d, pm(p), 0.8, 'legato', None, ('call', 1), human=False, slur=False)
    cb.at(67.5, 2.5, 'D2', 0.22, 'sustain', vel_end=0.3)
    vc.at(67.5, 2.5, 'D3', 0.18, 'sustain', vel_end=0.26)

    # ================================================================ build 70.0-72.2, gap, SLAM 72.5
    sc.cue('build', 70.0)
    sn_b.at(70.0, 2.2, 60, 0.18, 'roll', vel_end=0.95, rate=24.0)
    cym_b.at(70.0, 2.2, 60, 0.8, 'swell')
    fx_b.at(70.0, 2.2, 'D3', 0.8, 'riser')
    ti_b.at(70.0, 2.2, 'A2', 0.25, 'roll', vel_end=0.85)
    for p in (sn_b, cym_b, fx_b, ti_b):        # players choke everything at 72.2 s
        p.fader([(0.0, 1.0), (72.17, 1.0), (72.21, 0.0), (91.0, 0.0)])
    # earlier material must not ring into the gap either
    for p in (ti, tk, tam, cym, fx, bel, glk):
        p.fader([(0.0, 1.0), (71.6, 1.0), (72.2, 0.0), (72.45, 0.0), (72.5, 1.0), (91.0, 1.0)])
    sc.cue('silence', 72.2)

    sc.cue('title_slam', 72.5)
    hit_all(72.5, 1.0, 'D2')
    HEAD_CH = RAMPART_MINOR_CH[:4]
    hn.seq(30, RAMPART_MINOR_A, vel=0.9, art='legato', legato=True, slur=False, human=False,
           dyn=[(0, 0.9), (16, 0.95)])
    tpt.seq(30, RAMPART_MINOR_A, vel=0.8, art='legato', legato=True, slur=False, human=False)
    tbn.seq(30, RAMPART_MINOR_A, tr=-12, vel=0.82, art='legato', legato=True, slur=False, human=False)
    vn1.seq(30, RAMPART_MINOR_A, tr=12, vel=0.86, art='legato', legato=True, human=False)
    vn2.seq(30, "A4:q F5:q. E5:e D5:q | D5:h. F5:q | D5:q. F5:e Eb5:q D5:q | C#5:h. E4:q", vel=0.74,
            art='legato', legato=True, human=False)
    tba.seq(30, "D1:w | G0:w | Bb0:w | A0:w", vel=0.75, art='sustain', human=False)
    for i, s in enumerate(HEAD_CH):
        b = 30 + i
        r = root_at(s, 'C2')
        for k in range(8):
            vc.note(b, k * 0.5, 0.5, r if k % 2 == 0 else r + 12, 0.7, 'staccato', human=(k > 0))
            cb.note(b, k * 0.5, 0.5, r, 0.72, 'staccato', human=(k > 0))
        ost16(va, b, s, 'A3', vel=0.6)
        tk.hit(b, 0, 'odaiko', vel=0.9, human=False)
        tk.pattern(b, "...x..x.X..x.x..", art='chu', vel=0.72)
        ti.pattern(b, "....x...X...x.x.", pitch='D3' if i % 2 == 0 else 'A2', vel=0.72)
        if i:
            ti.hit(b, 0, pitch='D3' if i % 2 == 0 else 'A2', vel=0.85, human=False)
    ch.pad(30, HEAD_CH, 'D3', 'G5', n=5, spread=1, vel=0.75, vowel='a', human=False)
    cym.hit(32, 0, 'crash', vel=0.75, human=False)
    ti.roll(33, 2, 2, 0.45, 0.95, pitch='A2')
    cym.note(33, 2, 2, 60, 0.6, 'swell', human=False)

    # ================================================================ final D major chord 82.5
    sc.cue('final_chord', 82.5)
    tf = 82.5
    hit_all(tf, 0.95, 'D2', boom=True, tamtam=True)
    ti.at(tf + 0.05, 4.0, 'D2', 0.5, 'roll', vel_end=0.12)
    dur = 5.2
    for p in ('D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'):
        hn.at(tf, dur, p, 0.88, 'sustain', vel_end=0.2)
    for p in ('A4', 'D5', 'F#5'):
        tpt.at(tf, dur - 1.2, p, 0.76, 'sustain', vel_end=0.15)
    for p in ('D2', 'A2', 'D3', 'F#3'):
        tbn.at(tf, dur, p, 0.8, 'sustain', vel_end=0.2)
    tba.at(tf, dur, 'D1', 0.75, 'sustain', vel_end=0.2)
    for p in ('F#5', 'A5', 'D6'):
        vn1.at(tf, dur + 0.5, p, 0.8, 'tremolo', vel_end=0.2)
    for p in ('D5', 'A4'):
        vn2.at(tf, dur + 0.5, p, 0.76, 'tremolo', vel_end=0.2)
    for p in ('F#4', 'D4'):
        va.at(tf, dur + 0.5, p, 0.74, 'sustain', vel_end=0.2)
    vc.at(tf, dur + 0.5, 'D3', 0.8, 'sustain', vel_end=0.2)
    vc.at(tf, dur + 0.5, 'A2', 0.76, 'sustain', vel_end=0.2)
    cb.at(tf, dur + 0.5, 'D2', 0.8, 'sustain', vel_end=0.2)
    for p in ('D3', 'A3', 'F#4', 'A4', 'D5', 'F#5'):
        ch.at(tf, dur, p, 0.78, 'sustain', vel_end=0.2, vowel='a')
    bel.at(tf, 0.5, 'D5', 0.7, 'hit')
    glk.at(tf, 0.5, 'F#6', 0.6, 'hit')
    glk.at(tf + 0.3, 0.5, 'A6', 0.5, 'hit')
    glk.at(tf + 0.6, 0.5, 'D7', 0.45, 'hit')
    hp.at(tf, 0.5, 'D2', 0.7, 'pluck')
    for k, p in enumerate(['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5']):
        hp.at(tf + 0.08 * k, 0.5, p, 0.55, 'pluck')
    sc.cue('end', 91.0)
    return sc


def verify(y, sc):
    """Hit timing measured on the percussion/fx stems (ms offset from each cue), plus
    the level of the 72.25-72.48 s gap relative to the breach section."""
    from .common import stem_onsets
    from ..dsp import SR
    cues = ['impact'] + ['beacon%d' % i for i in range(1, 9)] + ['breach', 'title_slam', 'final_chord']
    out = stem_onsets(sc, ('ti', 'tk', 'fx', 'bd'), cues)
    out.update(stem_onsets(sc, ('tk', 'bd'), ['wall_chord']))   # timpani roll leads into this one
    m = y.mean(axis=0).astype(np.float64)
    loud = np.sqrt(np.mean(m[int(66 * SR):int(67 * SR)] ** 2))
    gap = np.sqrt(np.mean(m[int(72.25 * SR):int(72.48 * SR)] ** 2))
    out['gap_vs_breach_db'] = round(float(20 * np.log10(gap / loud + 1e-12)), 1)
    return out
