"""Melee / barracks, enemy and hero sounds."""
import numpy as np

from .dsp import (SR, TAU, N, tvec, midi, norm, Mix, white, pink, bandnoise, slow_noise,
                  env_ad, env_pts, lp, bp, tvf, reverb, bass_harmonics, sat, saw, square,
                  phase_of, modal, reverse, fade, as_curve)
from .lib import (wood, metal, glass, bell, sparkle, scale_freqs, whoosh, nhit, thump, click,
                  debris, grit, banded_decay, explosion, splash, zap, fm_tone, shimmer,
                  impact, footstep, jingle, bounce_times, voice, roar, choir, horn, tamtam,
                  rumble, shing, flanger, fire, riser, drum)
from .registry import sfx


# ----------------------------------------------------------------------------
# Melee / barracks
# ----------------------------------------------------------------------------
@sfx('sword_hit', 'combat', variants=3)
def sword_hit(rng, v):
    pf = [1.0, 0.9, 1.12][v]
    m = Mix(0.7)
    m.add(metal(rng, 1050 * pf, 0.45, nm=9, kind=['rand', 'plate', 'rand'][v], bright=0.9,
                hard=1.0, beat=3.0, tdecay=0.4, noise=0.4), 0, 0.85)
    m.add(metal(rng, 2650 * pf, 0.25, nm=5, kind='bar', bright=0.8, hard=1.0, noise=0.2), 0,
          0.32)
    m.add(norm(nhit(rng, 0.05, 2000, 12000, 0.0003, 0.012)), 0, 0.5)
    m.add(thump(0.08, 240, 120, 0.01, 0.025, 0.0008, 1.8), 0, 0.35)
    m.add(norm(nhit(rng, 0.08, 180, 1200, 0.0005, 0.02)), 0, 0.35)
    return reverb(m.out, 'field', 0.12)


@sfx('sword_swing', 'combat', variants=3)
def sword_swing(rng, v):
    d = [0.28, 0.24, 0.32][v]
    pf = [1.0, 1.15, 0.88][v]
    pk = d * 0.45
    wh = whoosh(rng, d, [(0, 500 * pf), (pk, 2300 * pf), (d, 700 * pf)],
                [(0, 0.14), (pk, 1.0), (d, 0)], q=1.6, order=2, flutter=0.3, flutter_rate=35,
                tone=0.35, tone_q=10)
    wh2 = whoosh(rng, d, [(0, 260 * pf), (pk, 700 * pf), (d, 320 * pf)],
                 [(0, 0.12), (pk, 1.0), (d, 0)], q=1.0, order=1)
    return reverb(norm(wh) + 0.4 * norm(wh2), 'field', 0.06)


@sfx('shield_block', 'combat')
def shield_block(rng, v):
    m = Mix(0.8)
    m.add(metal(rng, 420, 0.35, nm=14, kind='plate', bright=0.92, hard=0.85, beat=2.0,
                tdecay=0.45, noise=0.3), 0, 0.95)
    m.add(wood(rng, 300, 0.08, nm=5, hard=0.6, noise=0.3), 0, 0.7)
    m.add(thump(0.18, 260, 130, 0.012, 0.035, 0.001, 2.0), 0, 0.16)
    m.add(norm(nhit(rng, 0.06, 800, 9000, 0.0003, 0.01)), 0, 0.4)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.12)


@sfx('soldier_death', 'combat')
def soldier_death(rng, v):
    m = Mix(1.2)
    t = 0.08
    m.add(thump(0.25, 200, 95, 0.02, 0.05, 0.002, 2.0), t, 0.4)
    m.add(norm(nhit(rng, 0.15, 180, 1800, 0.002, 0.04)), t, 0.65)
    m.add(norm(grit(rng, 0.25, [(0, 1), (0.25, 0)], 300, 3000)), t, 0.18)
    for i, tt in enumerate([0.0, 0.1, 0.17, 0.23, 0.33, 0.41, 0.46, 0.5]):
        m.add(metal(rng, rng.uniform(900, 2400), rng.uniform(0.08, 0.25), nm=6, kind='rand',
                    hard=0.95, noise=0.3), tt, 0.55 * 0.85 ** i * rng.uniform(0.6, 1.0))
    m.add(metal(rng, 1500, 0.6, nm=7, kind='bar', hard=1.0), 0.35, 0.3)
    m.add(norm(jingle(rng, 0.3, 18, 'chain', 0.1, 0.08)), 0.0, 0.4)
    return reverb(m.out, 'field', 0.12)


@sfx('soldier_spawn', 'combat')
def soldier_spawn(rng, v):
    m = Mix(1.0)
    for i, t in enumerate([0.0, 0.27, 0.54]):
        m.add(norm(footstep(rng, 1.0, 'dirt', armor=0.5)), t, [0.8, 0.9, 1.0][i])
        m.add(metal(rng, rng.uniform(1800, 2600), 0.12, nm=5, kind='rand', hard=0.9, noise=0.2),
              t + 0.01, 0.15)
    return reverb(m.out, 'field', 0.1)


@sfx('wolf_howl', 'combat_big', maxdur=2.6)
def wolf_howl(rng, v):
    dur = 1.9
    n = N(dur)
    t = tvec(n)
    f0 = env_pts(n, [(0, 330), (0.25, 560), (0.45, 620), (1.2, 600), (1.6, 470), (1.9, 380)],
                 'cos')
    f0 = f0 * (1 + 0.006 * np.sin(TAU * 5.5 * t) + 0.004 * slow_noise(n, rng, 4))
    amp = env_pts(n, [(0, 0.08), (0.18, 0.8), (0.4, 1.0), (1.3, 0.85), (1.75, 0.3), (1.9, 0)],
                  'cos')
    track = [(0, 'u'), (0.3, 'o'), (0.6, 'a'), (1.3, 'a'), (1.7, 'u')]
    y = voice(rng, f0, amp, track, size=0.85, jitter=0.004, shimmer=0.05, breath=0.12,
              tilt_fc=600, bw_mult=1.3)
    tone = (np.sin(TAU * phase_of(f0)) + 0.25 * np.sin(2 * TAU * phase_of(f0))) * amp
    y = norm(y) + 0.35 * norm(tone)
    return reverb(y, 'hall', 0.3)


@sfx('bash', 'combat')
def bash(rng, v):
    m = Mix(1.0)
    m.add(norm(impact(rng, 1.3, 0.45, f0=160)), 0, 1.0)
    m.add(metal(rng, 610, 0.7, nm=12, kind='plate', bright=0.9, hard=0.7, beat=2.5, tdecay=0.4,
                noise=0.15), 0.002, 0.42)
    m.add(wood(rng, 240, 0.09, nm=5, hard=0.5, noise=0.2), 0, 0.5)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.14)


# ----------------------------------------------------------------------------
# Enemies
# ----------------------------------------------------------------------------
def poof(rng, dur=0.3, f0=2500.0, f1=500.0):
    return whoosh(rng, dur, [(0, f0), (dur, f1)], [(0, 1), (dur, 0)], q=0.7, order=1,
                  flutter=0.4, amp_mode='lin')


@sfx('enemy_death', 'combat', variants=3)
def enemy_death(rng, v):
    m = Mix(0.5)
    n = N(0.3)
    a, b = [(480, 300), (420, 230), (560, 360)][v]
    f0 = env_pts(n, [(0, a), (0.05, a * 1.08), (0.3, b)], 'cos')
    amp = env_pts(n, [(0, 0.35), (0.02, 1.0), (0.15, 0.7), (0.3, 0.0)], 'cos')
    tracks = [[(0, 'i'), (0.08, 'e'), (0.3, 'uh')], [(0, 'uh'), (0.1, 'a'), (0.3, 'o')],
              [(0, 'e'), (0.06, 'i'), (0.3, 'u')]]
    vo = voice(rng, f0, amp, tracks[v], size=0.62, jitter=0.03, shimmer=0.15, breath=0.15,
               creak=0.25, rough=0.3, rough_rate=45, tilt_fc=1500)
    m.add(norm(vo), 0, 0.75)
    m.add(norm(poof(rng, 0.3)), 0.06, 0.45)
    m.add(thump(0.1, 260, 130, 0.012, 0.03, 0.001, 1.5), 0.06, 0.3)
    return reverb(m.out, 'room', 0.12)


@sfx('enemy_death_big', 'combat_big')
def enemy_death_big(rng, v):
    m = Mix(1.4)
    n = N(0.8)
    f0 = env_pts(n, [(0, 120), (0.1, 128), (0.8, 68)], 'cos')
    amp = env_pts(n, [(0, 0.3), (0.06, 1.0), (0.45, 0.8), (0.8, 0)], 'cos')
    vo = voice(rng, f0, amp, [(0, 'a'), (0.3, 'o'), (0.8, 'u')], size=1.35, jitter=0.03,
               shimmer=0.15, breath=0.2, creak=0.6, rough=0.4, rough_rate=28, tilt_fc=700)
    m.add(sat(norm(vo) * 1.5, 1.0), 0, 0.8)
    t = 0.5
    m.add(thump(0.45, 170, 70, 0.03, 0.1, 0.002, 2.0), t, 0.45)
    m.add(norm(banded_decay(rng, 0.5, [(70, 300, 0.08, 1.0), (300, 1200, 0.05, 0.7),
                                       (1200, 4000, 0.02, 0.25)])), t, 0.75)
    m.add(norm(debris(rng, 0.5, 14, 'dirt', 0, 0.06)), t, 0.3)
    return reverb(bass_harmonics(m.out, 130, 0.5), 'field', 0.15)


@sfx('enemy_death_bone', 'combat')
def enemy_death_bone(rng, v):
    m = Mix(1.1)
    ts = np.sort(0.3 * rng.uniform(0, 1, 22) ** 1.4)
    m.add(norm(debris(rng, 1.0, 22, 'bone', times=ts)), 0, 0.8)
    for _ in range(4):
        bt = bounce_times(rng.uniform(0.25, 0.45), rng.uniform(0.08, 0.14), 0.6, 4, 0.15, rng)
        m.add(norm(debris(rng, 1.0, len(bt), 'bone', times=bt, amp_db=(-10, -3))), 0, 0.45)
    m.add(wood(rng, 520, 0.05, nm=4, bright=0.5, hard=0.8, noise=0.3,
               ratios=[1, 2.7, 4.6, 6.9]), 0.5, 0.6)
    m.add(norm(nhit(rng, 0.1, 200, 1500, 0.001, 0.03)), 0.05, 0.3)
    return reverb(m.out, 'room', 0.12)


@sfx('enemy_death_magic', 'combat')
def enemy_death_magic(rng, v):
    m = Mix(1.0)
    fr = scale_freqs(76, [0, 3, 7, 10], 1500, 8000)
    s = Mix(0.8)
    s.add(norm(shimmer(rng, 0.7, 3000, 8, 0.4, 16, 0.002, 0.2)), 0, 0.6)
    s.add(sparkle(rng, 0.6, 18, freqs=fr, dtau=0.15), 0, 0.6)
    s.add(norm(whoosh(rng, 0.5, [(0, 4000), (0.5, 1500)], [(0, 1), (0.5, 0)], q=0.8, order=1)),
          0, 0.4)
    r = reverse(reverb(s.out, 'room', 0.5))
    pk = int(np.argmax(np.abs(r)))
    seg = r[max(0, pk - N(0.45)):pk]
    seg = seg * np.linspace(0.25, 1.0, len(seg)) ** 0.5   # start audibly (latency), swell up
    m.add(norm(seg), 0, 0.7)
    tp = len(seg) / SR
    m.add(norm(nhit(rng, 0.25, 300, 6000, 0.001, 0.05)), tp, 0.7)
    m.add(thump(0.15, 280, 120, 0.015, 0.04, 0.001, 1.5), tp, 0.4)
    m.add(sparkle(rng, 0.4, 10, freqs=fr, dtau=0.1), tp, 0.35)
    return reverb(m.out, 'room', 0.15)


@sfx('enemy_death_fly', 'combat')
def enemy_death_fly(rng, v):
    m = Mix(0.8)
    n = N(0.4)
    t = tvec(n)
    x = bandnoise(n, rng, 300, 2600)
    rate = 24 * (1 - 0.45 * t / 0.4)
    pulses = (0.5 + 0.5 * np.cos(TAU * phase_of(rate))) ** 3
    fl = x * pulses * env_pts(n, [(0, 1.0), (0.25, 0.6), (0.4, 0)], 'cos')
    m.add(norm(fl), 0, 0.7)
    nn = N(0.12)
    f0 = env_pts(nn, [(0, 900), (0.12, 520)], 'log')
    amp = env_pts(nn, [(0, 0.5), (0.02, 1), (0.12, 0)], 'cos')
    m.add(norm(voice(rng, f0, amp, [(0, 'i'), (0.12, 'e')], size=0.5, jitter=0.02,
                     tilt_fc=2000, nper=512)), 0.0, 0.5)
    m.add(norm(nhit(rng, 0.25, 250, 4000, 0.002, 0.05)), 0.22, 0.6)
    m.add(thump(0.12, 260, 120, 0.012, 0.035, 0.001, 1.5), 0.22, 0.35)
    return reverb(m.out, 'room', 0.12)


@sfx('enemy_hit_armor', 'combat', variants=2)
def enemy_hit_armor(rng, v):
    pf = [1.0, 0.88][v]
    m = Mix(0.4)
    m.add(metal(rng, 760 * pf, 0.12, nm=10, kind='plate', bright=0.8, hard=0.6, beat=2,
                tdecay=0.7, noise=0.2), 0, 0.8)
    m.add(thump(0.08, 280 * pf, 140, 0.008, 0.022, 0.0008, 2.0), 0, 0.22)
    m.add(norm(nhit(rng, 0.05, 300, 3000, 0.0004, 0.012)), 0, 0.4)
    return reverb(lp(m.out, 5500, 1), 'field', 0.08)


@sfx('enemy_spawn_portal', 'combat_big', maxdur=2.2)
def enemy_spawn_portal(rng, v):
    dur = 1.7
    n = N(dur)
    t = tvec(n)
    m = Mix(dur)
    hum = np.zeros(n)
    for mi in [45, 51, 57, 64]:
        for d in (-0.1, 0.1):
            hum += saw(midi(mi + d + 0.15 * slow_noise(n, rng, 1.5)), ph0=rng.uniform())
    hum = tvf(hum, 'lowpass', env_pts(n, [(0, 300), (0.9, 1800), (1.7, 400)], 'log'), 1.5)
    amp = env_pts(n, [(0, 0.25), (0.85, 1.0), (1.0, 0.8), (1.7, 0)], 'cos')
    m.add(norm(hum * amp), 0, 0.55)
    gr = bandnoise(n, rng, 120, 900) * (0.5 + 0.5 * np.sin(TAU * phase_of(18 + 10 * t))) ** 2
    m.add(norm(gr * amp), 0, 0.3)
    wh = whoosh(rng, 1.2, [(0, 300), (0.85, 2500), (1.2, 600)], [(0, 0.06), (0.85, 1.0), (1.2, 0)],
                q=1.0)
    m.add(norm(wh), 0, 0.6)
    m.add(thump(0.5, 140, 55, 0.05, 0.12, 0.003, 2.0), 0.85, 0.4)
    m.add(norm(nhit(rng, 0.3, 200, 4000, 0.002, 0.06)), 0.85, 0.4)
    return reverb(bass_harmonics(m.out, 130, 0.5), 'hall', 0.25)


@sfx('heal', 'combat', maxdur=1.6)
def heal(rng, v):
    m = Mix(1.4)
    for i, mi in enumerate([72, 76, 79, 84]):
        m.add(bell(rng, float(midi(mi)), 1.0, 'warm', hard=0.3, bright=0.8), 0.075 * i,
              0.5 + 0.08 * i)
    m.add(norm(choir(rng, 1.2, [60, 64, 67, 72], 'o', att=0.15, rel=0.6, vpn=2, breath=0.08)),
          0, 0.38)
    fr = scale_freqs(72, [0, 4, 7], 2000, 7000)
    m.add(sparkle(rng, 1.0, 14, freqs=fr, dtau=0.4, t0=0.1, amp_db=(-20, -6)), 0, 0.3)
    return reverb(m.out, 'room', 0.25)


@sfx('shield_up', 'combat', maxdur=1.3)
def shield_up(rng, v):
    dur = 1.1
    n = N(dur)
    t = tvec(n)
    m = Mix(dur)
    hum = np.zeros(n)
    for d in (-6.0, 0.0, 7.0):
        fc = 520 * 2 ** (d / 1200) * (1 + 0.06 * (1 - np.exp(-t / 0.12)))
        hum += fm_tone(n, fc, 3.5, 1.2 + 0.4 * np.sin(TAU * 6 * t))
    amp = env_pts(n, [(0, 0.12), (0.08, 1.0), (0.6, 0.8), (1.1, 0)], 'cos')
    m.add(norm(hum * amp), 0, 0.5)
    m.add(glass(rng, 2080, 0.8, 4, 0.5), 0, 0.5)
    m.add(norm(shimmer(rng, 1.0, 4200, 6, 0.2, 10, 0.05, 0.35)), 0, 0.2)
    m.add(norm(whoosh(rng, 0.4, [(0, 1200), (0.4, 4000)], [(0, 0.5), (0.1, 1), (0.4, 0)], q=1.0,
                      order=1)), 0, 0.25)
    return reverb(m.out, 'room', 0.25)


@sfx('teleport', 'combat')
def teleport(rng, v):
    dur = 0.8
    n = N(dur)
    m = Mix(dur)
    f = env_pts(n, [(0, 250), (0.45, 1600), (0.55, 2200), (0.8, 2400)], 'log')
    amp = env_pts(n, [(0, 0.2), (0.35, 1.0), (0.5, 0.6), (0.8, 0)], 'cos')
    m.add(norm(fm_tone(n, f, 1.5, 2.0) * amp), 0, 0.4)
    d = env_pts(n, [(0, 0.006), (0.5, 0.0007), (0.8, 0.0003)], 'log')
    y = bp(flanger(pink(n, rng), d), 1500, 0.5)
    m.add(norm(y * amp), 0, 0.5)
    m.add(sparkle(rng, 0.7, 16, 2500, 9000, density='rise'), 0, 0.35)
    m.add(norm(nhit(rng, 0.15, 400, 6000, 0.001, 0.04)), 0.48, 0.4)
    return reverb(m.out, 'room', 0.2)


@sfx('explode_small', 'combat')
def explode_small(rng, v):
    m = Mix(0.8)
    m.add(click(rng, 0.004, 800, 12000, 0.0008), 0, 0.8)
    m.add(norm(modal(N(0.06), [420, 980], [0.04, 0.02], [1, 0.4])), 0, 0.4)
    m.add(norm(explosion(rng, 0.5, 0.6, 10, 0.7, 0.5, 0.5, 'dirt', 0.2, 2.0, 0.1)), 0.004, 0.9)
    m.add(norm(nhit(rng, 0.25, 300, 3000, 0.003, 0.06)), 0.01, 0.3)
    return reverb(m.out, 'field', 0.15)


@sfx('stomp', 'combat_big')
def stomp(rng, v):
    m = Mix(1.0)
    m.add(thump(0.6, 125, 45, 0.045, 0.18, 0.002, 2.2), 0, 0.28)
    m.add(norm(impact(rng, 1.4, 0.35, f0=170)), 0, 0.55)
    m.add(norm(banded_decay(rng, 0.5, [(60, 200, 0.1, 0.8), (200, 700, 0.07, 1.0),
                                       (700, 2500, 0.025, 0.35)], 0.002)), 0, 0.9)
    m.add(wood(rng, 150, 0.12, nm=5, bright=0.6, hard=0.5, noise=0.3), 0, 0.6)
    m.add(norm(debris(rng, 0.6, 16, 'rock', 0.03, 0.12, 0.2)), 0, 0.25)
    m.add(norm(grit(rng, 0.4, [(0, 0), (0.02, 1), (0.4, 0)], 300, 3000)), 0, 0.15)
    return reverb(bass_harmonics(m.out, 130, 0.7), 'field', 0.18)


@sfx('roar', 'combat_big', maxdur=2.0)
def roar_(rng, v):
    y = roar(rng, 1.5, [(0, 95), (0.3, 120), (0.9, 110), (1.5, 75)],
             [(0, 0.2), (0.15, 0.9), (0.4, 1.0), (1.0, 0.85), (1.5, 0)],
             [(0, 'o'), (0.25, 'a'), (1.0, 'a'), (1.5, 'o')], size=1.5, growl=0.6,
             noise_amt=0.9, voiced=0.8, rough_rate=36, drive=2.5)
    return reverb(bass_harmonics(y, 130, 0.4), 'field', 0.2)


@sfx('boss_roar', 'big', maxdur=3.4)
def boss_roar(rng, v):
    dur = 2.6
    m = Mix(dur)
    amp = [(0, 0.2), (0.25, 0.9), (0.6, 1.0), (1.8, 0.85), (2.6, 0)]
    m.add(roar(rng, dur, [(0, 58), (0.5, 76), (1.6, 68), (2.6, 46)], amp,
               [(0, 'o'), (0.4, 'a'), (1.8, 'a'), (2.6, 'u')], size=2.2, growl=0.7,
               noise_amt=1.0, voiced=0.8, rough_rate=27, drive=3.0, nper=2048), 0, 0.8)
    m.add(roar(rng, dur - 0.04, [(0, 84), (0.5, 104), (1.6, 92), (2.5, 62)], amp,
               [(0, 'aw'), (0.4, 'a'), (1.8, 'o'), (2.5, 'u')], size=1.7, growl=0.5,
               noise_amt=0.8, voiced=0.7, rough_rate=33, drive=2.5), 0.04, 0.55)
    n = N(dur)
    t = tvec(n)
    sub = np.sin(TAU * phase_of(env_pts(n, [(0, 50), (0.6, 58), (2.6, 40)], 'cos')))
    sub *= env_pts(n, amp, 'cos') * (1 + 0.5 * np.sin(TAU * 27 * t))
    m.add(norm(sub), 0, 0.35)
    return reverb(bass_harmonics(norm(m.out), 120, 0.6), 'hall', 0.35)


@sfx('boss_appear', 'big', maxdur=4.6)
def boss_appear(rng, v):
    dur = 4.0
    m = Mix(dur)
    m.add(norm(tamtam(rng, 3.8, 80, 7000, 160, 3.5, 0.3, 0.3)), 0, 0.9)
    m.add(norm(impact(rng, 2.0, 0.4, f0=110)), 0, 0.6)
    n = N(2.2)
    t = tvec(n)
    f = 28 + (75 - 28) * np.exp(-t / 0.5)
    m.add(sat(np.sin(TAU * phase_of(f)) * env_ad(n, 0.01, 0.8) * 1.5, 1.0), 0, 0.3)
    r = riser(rng, 1.5, 300, 7000, tones=(45, 52, 57), tone_amt=0.6, octaves=1.0,
              trem=(6, 20), trem_depth=0.4, curve=2.5, start_db=-26)
    m.add(norm(fade(r, 0, 0.02)), 2.3, 0.75)
    return reverb(bass_harmonics(m.out, 120, 0.5), 'hall', 0.3)


@sfx('tower_disabled', 'combat', maxdur=1.4)
def tower_disabled(rng, v):
    m = Mix(1.3)
    m.add(click(rng, 0.006, 600, 12000, 0.001), 0, 0.9)
    m.add(norm(debris(rng, 0.25, 14, 'ice', 0, 0.05)), 0, 0.5)
    m.add(norm(debris(rng, 0.3, 10, 'stone', 0, 0.06)), 0, 0.4)
    m.add(norm(nhit(rng, 0.15, 300, 5000, 0.0005, 0.03)), 0, 0.5)
    n = N(1.1)
    t = tvec(n)
    f = 45 + 160 * (1 - t / 1.1) ** 1.6
    h = saw(f) + 0.5 * square(f * 1.5)
    h = tvf(h, 'lowpass', env_pts(n, [(0, 3000), (1.1, 220)], 'log'), 2.0)
    h *= env_pts(n, [(0, 0.0), (0.04, 1.0), (0.7, 0.6), (1.1, 0)], 'cos')
    h *= 1 + 0.3 * np.sin(TAU * phase_of(12 * (1 - t / 1.1) + 2))
    m.add(norm(h), 0.02, 0.5)
    return reverb(m.out, 'room', 0.15)


@sfx('burrow', 'combat')
def burrow(rng, v):
    m = Mix(1.3)
    m.add(norm(rumble(rng, 1.2, [(0, 0.5), (0.2, 1.0), (0.9, 0.7), (1.2, 0)], 220, 0.7)), 0,
          0.55)
    n = N(1.1)
    dig = grit(rng, 1.1, [(0, 0.6), (0.15, 1.0), (0.8, 0.6), (1.1, 0)], 300, 3500, 1200)
    dig *= (0.55 + 0.45 * np.sin(TAU * phase_of(as_curve(9.0, n)))) ** 2
    m.add(norm(dig), 0, 0.5)
    m.add(norm(debris(rng, 1.0, 40, 'dirt', 0, 0.4, None, amp_db=(-20, -4))), 0, 0.4)
    m.add(norm(debris(rng, 1.0, 10, 'rock', 0.05, 0.4, None, amp_db=(-20, -6))), 0, 0.3)
    m.add(thump(0.3, 150, 65, 0.03, 0.07, 0.002, 2.0), 0, 0.35)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.12)


@sfx('emerge', 'combat_big')
def emerge(rng, v):
    m = Mix(1.5)
    m.add(norm(rumble(rng, 0.5, [(0, 0.35), (0.38, 1.0), (0.5, 0.6)], 220, 0.8)), 0, 0.6)
    m.add(norm(grit(rng, 0.45, [(0, 0.25), (0.38, 1.0), (0.45, 0.8)], 300, 3000)), 0, 0.3)
    t = 0.38
    m.add(norm(explosion(rng, 0.7, 0.3, 45, 1.0, 0.6, 0.3, 'dirt', 0.4, 1.8)), t, 0.8)
    m.add(norm(debris(rng, 0.9, 20, 'rock', 0.05, 0.25, 0.4)), t, 0.35)
    return reverb(m.out, 'field', 0.15)


@sfx('ghost', 'combat', maxdur=1.6)
def ghost(rng, v):
    dur = 1.1
    n = N(dur)
    t = tvec(n)
    f0 = env_pts(n, [(0, 520), (0.35, 760), (0.7, 640), (1.1, 430)], 'cos') * \
        (1 + 0.025 * np.sin(TAU * 6.5 * t))
    amp = env_pts(n, [(0, 0.15), (0.25, 1.0), (0.75, 0.8), (1.1, 0)], 'cos')
    tr = [(0, 'u'), (0.4, 'o'), (0.8, 'u')]
    vo = voice(rng, f0, amp, tr, size=0.8, jitter=0.006, shimmer=0.1, breath=0.35,
               tilt_fc=700, bw_mult=1.5)
    vo2 = voice(rng, f0 * 1.012, amp, tr, size=0.82, jitter=0.006, shimmer=0.1, breath=0.35,
                tilt_fc=700, bw_mult=1.5)
    tone = np.sin(TAU * phase_of(f0)) * amp
    y = norm(vo + vo2) + 0.4 * norm(tone)
    y = y + 0.25 * norm(whoosh(rng, dur, [(0, 800), (0.4, 2000), (1.1, 600)],
                               [(0, 0.2), (0.4, 1), (1.1, 0)], q=0.7, order=1))
    return reverb(y, 'hall', 0.45)


@sfx('splash', 'combat')
def splash_(rng, v):
    return reverb(splash(rng, 1.0, 0.9, 35, 12, 0.5), 'room', 0.12)


# ----------------------------------------------------------------------------
# Hero
# ----------------------------------------------------------------------------
@sfx('hero_attack', 'combat', variants=3)
def hero_attack(rng, v):
    pf = [1.0, 0.92, 1.08][v]
    m = Mix(0.7)
    wh = whoosh(rng, 0.2, [(0, 400 * pf), (0.12, 1600 * pf), (0.2, 500 * pf)],
                [(0, 0.16), (0.11, 1.0), (0.2, 0)], q=1.2, order=2, tone=0.25)
    m.add(norm(wh), 0, 0.6)
    t = 0.11
    m.add(norm(impact(rng, 1.1, 0.6, f0=135)), t, 0.9)
    m.add(metal(rng, 900 * pf, 0.3, nm=8, kind='rand', bright=0.85, hard=0.9, noise=0.3), t,
          0.4)
    m.add(norm(nhit(rng, 0.06, 1800, 10000, 0.0003, 0.01)), t, 0.4)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.12)


@sfx('hero_select', 'ui_reward')
def hero_select(rng, v):
    m = Mix(0.9)
    m.add(norm(shing(rng, 0.22, ring=0.0)), 0, 0.6)
    amp = [(0, 0), (0.015, 1.0), (0.12, 0.75), (0.25, 0)]
    m.add(norm(horn(rng, [(0, 72)], 0.3, amp, voices=2, bright=(700, 6000), rough=0.0,
                    scoop=0.6, glide=0.01, vib=0.0)), 0.03, 0.55)
    m.add(metal(rng, 2900, 0.5, nm=5, kind='bar', hard=1.0), 0.18, 0.22)
    return reverb(m.out, 'room', 0.15)


@sfx('hero_move', 'ui')
def hero_move(rng, v):
    m = Mix(0.5)
    m.add(drum(rng, 165, 0.18, stick=0.4, skin=0.3), 0, 0.7)
    amp = [(0, 0), (0.012, 1.0), (0.08, 0.7), (0.16, 0)]
    m.add(norm(horn(rng, [(0, 67)], 0.2, amp, voices=2, bright=(600, 4500), scoop=0.5,
                    rough=0.0, breath=0.02, glide=0.01, vib=0.0)), 0.025, 0.5)
    return reverb(m.out, 'room', 0.12)


@sfx('hero_levelup', 'ui_reward', maxdur=1.9)
def hero_levelup(rng, v):
    m = Mix(1.7)
    for i, mi in enumerate([72, 76, 79, 84, 88, 91]):
        m.add(bell(rng, float(midi(mi)), 0.8, 'glock' if i % 2 else 'chime', hard=0.7),
              0.06 * i, 0.45 + 0.05 * i)
    m.add(norm(choir(rng, 1.5, [60, 64, 67, 72], 'a', att=0.25, rel=0.6, vpn=3, breath=0.1)),
          0.05, 0.5)
    fr = scale_freqs(72, [0, 4, 7, 11], 2500, 9500)
    m.add(sparkle(rng, 1.4, 30, freqs=fr, dtau=0.5, t0=0.25, amp_db=(-20, -5)), 0, 0.35)
    m.add(thump(0.3, 160, 80, 0.03, 0.08, 0.002, 1.5), 0, 0.25)
    return reverb(m.out, 'hall', 0.22)


@sfx('hero_death', 'big', maxdur=2.4)
def hero_death(rng, v):
    m = Mix(2.0)
    m.add(norm(impact(rng, 2.0, 0.4, f0=130)), 0, 0.9)
    m.add(thump(0.8, 110, 40, 0.05, 0.22, 0.002, 2.0), 0, 0.35)
    m.add(norm(banded_decay(rng, 0.8, [(150, 600, 0.15, 1.0), (600, 2000, 0.07, 0.6)], 0.002)),
          0, 0.6)
    m.add(norm(tamtam(rng, 1.8, 110, 3000, 70, 1.5, 0.05, 0.5)), 0, 0.4)
    for i, t in enumerate([0.35, 0.47, 0.55, 0.62, 0.68]):
        m.add(metal(rng, rng.uniform(800, 2000), rng.uniform(0.15, 0.4), nm=7, kind='rand',
                    hard=0.9), t, 0.5 * 0.82 ** i)
    m.add(metal(rng, 1350, 0.9, nm=8, kind='bar', hard=1.0), 0.5, 0.3)
    m.add(norm(jingle(rng, 0.4, 20, 'chain', 0.1, 0.08)), 0.33, 0.35)
    return reverb(bass_harmonics(m.out, 130, 0.5), 'hall', 0.25)


@sfx('hero_respawn', 'ui_reward', maxdur=1.6)
def hero_respawn(rng, v):
    dur = 1.4
    m = Mix(dur)
    pad = choir(rng, 1.3, [64, 69, 73, 76], 'a', amp_pts=[(0, 0.15), (0.8, 1.0), (1.3, 0)],
                vpn=3, breath=0.15)
    m.add(norm(pad), 0, 0.55)
    fr = scale_freqs(69, [0, 4, 7, 11], 2500, 10000)
    m.add(sparkle(rng, 0.9, 40, freqs=fr, density='rise', tau=(0.03, 0.15), amp_db=(-20, -3)),
          0, 0.4)
    n = N(0.9)
    m.add(norm(shimmer(rng, 0.9, 5200, 8, 0.25, 12, 0.85, 5.0)) *
          np.linspace(0.2, 1.0, n), 0, 0.15)
    m.add(bell(rng, float(midi(81)), 1.0, 'chime', hard=0.4), 0.82, 0.45)
    m.add(bell(rng, float(midi(88)), 0.8, 'chime', hard=0.4), 0.82, 0.3)
    m.add(thump(0.4, 150, 75, 0.04, 0.1, 0.002, 1.4), 0.82, 0.25)
    return reverb(m.out, 'hall', 0.3)


@sfx('hero_skill', 'combat_big')
def hero_skill(rng, v):
    m = Mix(1.1)
    rise = whoosh(rng, 0.38, [(0, 300), (0.38, 3500)], [(0, 0.15), (0.38, 1.0)], q=1.2,
                  amp_mode='log')
    m.add(norm(rise), 0, 0.6)
    n = N(0.38)
    tone = saw(env_pts(n, [(0, 110), (0.38, 440)], 'log'))
    tone = tvf(tone, 'lowpass', env_pts(n, [(0, 400), (0.38, 3000)], 'log'), 1.2)
    m.add(norm(tone * env_pts(n, [(0, 0.2), (0.38, 1.0)], 'log')), 0, 0.3)
    t = 0.36
    m.add(norm(impact(rng, 1.2, 0.7, f0=130)), t, 0.8)
    m.add(norm(zap(rng, 0.4, 2000, 300, 0.06, 1.5, 5, 0.5, 0.08, 0.001, 0.12)), t, 0.4)
    m.add(sparkle(rng, 0.6, 18, 2500, 9000, dtau=0.15), t, 0.4)
    m.add(norm(whoosh(rng, 0.5, [(0, 3000), (0.5, 600)], [(0, 1), (0.5, 0)], q=0.8, order=1)),
          t, 0.4)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.18)


@sfx('arrow_rain', 'combat_big', maxdur=2.6)
def arrow_rain(rng, v):
    from .recipes_towers import bow_twang, arrow_thunk
    m = Mix(2.3)
    for i in range(4):
        m.add(norm(bow_twang(rng, 135 * rng.uniform(0.9, 1.1))), 0.03 * i, 0.3)
    for i in range(18):
        t0 = rng.uniform(0.05, 0.45)
        L = rng.uniform(0.6, 0.9)
        n = N(L)
        tt = tvec(n)
        f = rng.uniform(2200, 3200) * (1 - 0.35 * (tt / L) ** 1.5)
        w = tvf(tvf(white(n, rng), 'bandpass', f, 18), 'bandpass', f, 18)
        w *= env_pts(n, [(0, 0.0), (L * 0.6, 1.0), (L, 0.3)], 'cos')
        m.add(norm(w), t0, rng.uniform(0.12, 0.25))
        m.add(norm(arrow_thunk(rng, rng.uniform(0.85, 1.15), rng.uniform(0.3, 0.9),
                               rng.uniform(0.3, 0.9))), t0 + L, rng.uniform(0.3, 0.6))
    n = N(1.4)
    body = whoosh(rng, 1.4, [(0, 1500), (0.9, 2600), (1.4, 1200)],
                  [(0, 0.1), (0.85, 1.0), (1.4, 0)], q=0.8, order=1)
    m.add(norm(body), 0.05, 0.25)
    return reverb(m.out, 'field', 0.15)


@sfx('fireball', 'combat_big')
def fireball(rng, v):
    m = Mix(1.1)
    m.add(thump(0.3, 180, 80, 0.025, 0.07, 0.002, 2.0), 0, 0.4)
    m.add(norm(fire(rng, 1.0, [(0, 0.35), (0.06, 1.0), (0.35, 0.8), (1.0, 0)], 170, 2500, 0.7,
                    60, 0.15)), 0, 0.8)
    m.add(norm(whoosh(rng, 0.8, [(0, 900), (0.15, 1600), (0.8, 500)],
                      [(0, 0.3), (0.12, 1.0), (0.8, 0)], q=0.9)), 0.0, 0.5)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.15)


@sfx('ground_slam', 'big', maxdur=2.2)
def ground_slam(rng, v):
    m = Mix(1.8)
    m.add(click(rng, 0.008, 500, 10000, 0.0015), 0, 0.8)
    m.add(thump(1.0, 120, 34, 0.05, 0.26, 0.002, 2.2), 0, 0.5)
    m.add(norm(banded_decay(rng, 1.0, [(30, 150, 0.3, 0.5), (150, 600, 0.2, 1.0),
                                       (600, 2000, 0.09, 0.8), (2000, 7000, 0.035, 0.45)],
                            0.001)), 0, 1.0)
    m.add(wood(rng, 170, 0.15, nm=5, bright=0.6, hard=0.7, noise=0.3,
               ratios=[1, 2.3, 3.7, 5.1, 6.6]), 0, 0.5)
    m.add(norm(nhit(rng, 0.4, 300, 3500, 0.001, 0.06)), 0, 0.5)
    m.add(norm(debris(rng, 1.5, 50, 'rock', 0.04, 0.3, 0.5)), 0, 0.45)
    m.add(norm(debris(rng, 1.5, 25, 'stone', 0.1, 0.4, 0.6)), 0, 0.3)
    m.add(norm(rumble(rng, 1.6, [(0, 0), (0.05, 1), (1.6, 0)], 220, 0.9)), 0, 0.5)
    return reverb(bass_harmonics(m.out, 130, 0.6), 'yard', 0.22)
