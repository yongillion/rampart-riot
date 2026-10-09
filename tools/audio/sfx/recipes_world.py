"""Spells, map easter eggs / ambient creatures and cinematic sounds."""
import numpy as np

from .dsp import (TAU, N, tvec, db2a, midi, norm, fit, Mix, white, pink, brown, bandnoise,
                  lp_noise, env_ad, env_pts, filt, lp, tvf, reverb, bass_harmonics, sat,
                  sine, phase_of, modal, fade)
from .lib import (wood, metal, bell, sparkle, scale_freqs, whoosh, nhit, thump, click,
                  debris, grit, banded_decay, explosion, crackle, bubble, splash, shimmer,
                  impact, footstep, voice, choir, horn, tamtam, rumble, flap, shing, fire,
                  riser, creak, croak, stone_crack, heart_beat, ping, trunc_exp)
from .registry import sfx


# ----------------------------------------------------------------------------
# Spells
# ----------------------------------------------------------------------------
@sfx('meteor_fall', 'big', maxdur=1.3)
def meteor_fall(rng, v):
    dur = 1.25
    n = N(dur)
    m = Mix(dur)
    amp = env_pts(n, [(0, 0.12), (0.7, 0.4), (1.1, 0.85), (1.25, 1.0)], 'log')
    fr = fire(rng, dur, [(0, 1.0), (1.25, 1.0)], 100, 3000, 0.8, 80, 0.2)
    m.add(norm(fr * amp), 0, 0.7)
    f = env_pts(n, [(0, 2400), (1.25, 650)], 'log')
    w = tvf(tvf(white(n, rng), 'bandpass', f, 12), 'bandpass', f, 12)
    m.add(norm(w) * amp, 0, 0.45)
    m.add(norm(rumble(rng, dur, [(0, 1.0), (1.25, 1.0)], 220, 0.6) * amp), 0, 0.5)
    y = reverb(m.out, 'field', 0.12)[:N(1.29)]
    return fade(y, 0, 0.03)


@sfx('meteor_impact', 'big', maxdur=2.6)
def meteor_impact(rng, v):
    m = Mix(2.4)
    m.add(explosion(rng, 1.8, 0.7, 60, 2.2, 0.6, 1.0, 'rock', 0.6, 2.8, 0.15), 0, 1.0)
    m.add(norm(fire(rng, 1.6, [(0, 0.0), (0.05, 1.0), (1.6, 0)], 120, 2500, 0.8, 60, 0.15)),
          0.02, 0.35)
    m.add(norm(debris(rng, 2.0, 30, 'stone', 0.3, 0.5, 0.8)), 0, 0.3)
    return reverb(m.out, 'yard', 0.28)


@sfx('reinforcements', 'event', maxdur=2.0)
def reinforcements(rng, v):
    m = Mix(1.7)
    amp = [(0, 0), (0.015, 0.9), (0.09, 0.6), (0.11, 0.35), (0.13, 0.9), (0.2, 0.6),
           (0.22, 0.35), (0.24, 1.0), (0.6, 0.85), (0.78, 0)]
    m.add(norm(horn(rng, [(0, 62), (0.12, 62), (0.235, 69)], 0.9, amp, voices=3,
                    bright=(500, 5000), rough=0.1, scoop=0.5, glide=0.012, vib=0.05)), 0, 0.7)
    for t in [0.4, 0.68, 0.96, 1.24]:
        for k in range(4):
            m.add(norm(footstep(rng, 0.8, 'dirt', armor=0.4)), t + rng.uniform(0, 0.035), 0.32)
    return reverb(m.out, 'field', 0.15)


# ----------------------------------------------------------------------------
# Map easter eggs / ambient creatures
# ----------------------------------------------------------------------------
@sfx('sheep', 'creature')
def sheep(rng, v):
    dur = 0.85
    n = N(dur)
    q = np.sin(TAU * phase_of(7.5 * (1 + 0.1 * lp_noise(n, rng, 3))))
    f0 = env_pts(n, [(0, 250), (0.08, 300), (0.5, 285), (0.85, 240)], 'cos') * (1 + 0.04 * q)
    amp = env_pts(n, [(0, 0.0), (0.04, 0.9), (0.1, 1.0), (0.6, 0.85), (0.85, 0)], 'cos') * \
        np.clip(1 + 0.45 * q, 0, None)
    track = [(0, 'm'), (0.05, 'ae'), (0.3, 'a'), (0.7, 'a'), (0.85, 'uh')]
    y = voice(rng, f0, amp, track, size=0.85, jitter=0.02, shimmer=0.15, breath=0.12,
              creak=0.2, rough=0.15, tilt_fc=1200, bw_mult=1.3)
    y = filt(y, ('peak', 2600, 2.0, 4.0))          # nasal bleat edge
    return reverb(y, 'field', 0.1)


@sfx('sheep_pop', 'creature')
def sheep_pop(rng, v):
    m = Mix(1.0)
    m.add(click(rng, 0.005, 600, 9000, 0.001), 0, 0.8)
    m.add(norm(modal(N(0.08), [320, 690], [0.06, 0.03], [1, 0.5])), 0, 0.6)
    m.add(norm(nhit(rng, 0.4, 200, 5000, 0.003, 0.09)), 0, 0.7)
    m.add(norm(flap(rng, 0.6, rate=12, lo=400, hi=4000,
                    amp_pts=[(0, 0), (0.08, 1), (0.6, 0)], sharp=2)), 0.05, 0.35)
    m.add(norm(whoosh(rng, 0.6, [(0, 2000), (0.6, 600)], [(0, 1), (0.6, 0)], q=0.6, order=1)),
          0.04, 0.3)
    # tiny squeaky bleat pitched up (comic)
    nn = N(0.18)
    f0 = env_pts(nn, [(0, 620), (0.18, 520)], 'cos') * \
        (1 + 0.05 * np.sin(TAU * 11 * tvec(nn)))
    m.add(norm(voice(rng, f0, env_pts(nn, [(0, 0), (0.02, 1), (0.18, 0)], 'cos'),
                     [(0, 'ae'), (0.18, 'a')], size=0.6, nper=512)), 0.06, 0.25)
    return reverb(m.out, 'field', 0.12)


@sfx('frog', 'creature')
def frog(rng, v):
    m = Mix(0.6)
    m.add(croak(rng, 0.11, 175, 32), 0.0, 0.8)
    m.add(croak(rng, 0.22, 160, 26), 0.15, 1.0)
    return reverb(m.out, 'field', 0.1)


@sfx('crow', 'creature', variants=2)
def crow(rng, v):
    caws = [[(0.0, 0.32)], [(0.0, 0.26), (0.36, 0.3)]][v]
    pf = [1.0, 0.92][v]
    m = Mix(1.0)
    for i, (t0, L) in enumerate(caws):
        n = N(L)
        f0 = env_pts(n, [(0, 560), (0.06, 650), (L, 470)], 'cos') * pf * (1 - 0.04 * i)
        amp = env_pts(n, [(0, 0), (0.02, 1.0), (L * 0.6, 0.85), (L, 0)], 'cos')
        y = voice(rng, f0, amp, [(0, 'a'), (L * 0.5, 'aw'), (L, 'aw')], size=0.55, jitter=0.06,
                  shimmer=0.3, breath=0.3, creak=0.6, rough=0.5, rough_rate=70, tilt_fc=2500,
                  bw_mult=1.6, nper=512)
        m.add(sat(norm(y) * 2.5, 1.0), t0, 1.0 - 0.1 * i)
    return reverb(m.out, 'field', 0.15)


@sfx('chicken', 'creature')
def chicken(rng, v):
    m = Mix(1.2)
    for t0, L, f in [(0.0, 0.07, 380), (0.15, 0.07, 405), (0.29, 0.075, 390)]:
        n = N(L)
        f0 = env_pts(n, [(0, f * 1.1), (L, f * 0.9)], 'cos')
        amp = env_pts(n, [(0, 0), (0.008, 1.0), (L, 0)], 'cos')
        y = voice(rng, f0, amp, [(0, 'uh'), (L, 'u')], size=0.6, jitter=0.04, shimmer=0.2,
                  breath=0.25, creak=0.4, rough=0.3, rough_rate=60, tilt_fc=1800, nper=256)
        m.add(sat(norm(y) * 2.0, 1.0), t0, 0.7)
    L = 0.34
    n = N(L)
    f0 = env_pts(n, [(0, 450), (0.08, 720), (0.22, 650), (L, 520)], 'cos')
    amp = env_pts(n, [(0, 0), (0.015, 1.0), (0.24, 0.8), (L, 0)], 'cos')
    y = voice(rng, f0, amp, [(0, 'uh'), (0.06, 'a'), (L, 'aw')], size=0.58, jitter=0.05,
              shimmer=0.25, breath=0.25, creak=0.5, rough=0.4, rough_rate=55, tilt_fc=2000,
              nper=512)
    m.add(sat(norm(y) * 2.2, 1.0), 0.44, 1.0)
    return reverb(m.out, 'field', 0.1)


@sfx('bell_toll', 'creature', maxdur=4.2, densify=False)
def bell_toll(rng, v):
    y = bell(rng, 196.0, 3.5, 'church', hard=0.6, beat=1.2, dur=4.0)
    y = lp(y, 3500, 2)
    return reverb(y, 'distant', 0.6)


@sfx('windmill', 'creature', maxdur=2.0)
def windmill(rng, v):
    dur = 2.0
    m = Mix(dur)
    m.add(norm(creak(rng, 0.95, [(0, 30), (0.45, 55), (0.95, 25)],
                     [(0, 0.15), (0.15, 0.8), (0.6, 1.0), (0.95, 0.05)],
                     res=(240, 470, 820, 1350, 2200), t60=0.05)), 0.0, 0.8)
    m.add(norm(creak(rng, 0.9, [(0, 28), (0.4, 50), (0.9, 22)],
                     [(0, 0.05), (0.2, 0.7), (0.55, 0.9), (0.9, 0)],
                     res=(260, 500, 870, 1400, 2300), t60=0.05)), 1.02, 0.7)
    sw = whoosh(rng, dur, [(0, 400), (0.5, 700), (1.0, 400), (1.5, 700), (2.0, 400)],
                [(0, 0.4), (0.5, 1.0), (1.0, 0.4), (1.5, 1.0), (2.0, 0.4)], q=0.8, order=1)
    m.add(norm(sw), 0, 0.2)
    m.add(wood(rng, 300, 0.05, nm=4, hard=0.5), 0.0, 0.3)
    m.add(wood(rng, 285, 0.05, nm=4, hard=0.5), 1.0, 0.28)
    return reverb(m.out, 'field', 0.1)[:N(dur)]


@sfx('fish_splash', 'creature')
def fish_splash(rng, v):
    m = Mix(0.9)
    m.add(norm(splash(rng, 0.5, 0.6, 18, 8, 0.6)), 0, 0.8)
    m.add(norm(splash(rng, 0.35, 0.4, 10, 4, 0.7)), 0.28, 0.45)
    return reverb(m.out, 'field', 0.1)


@sfx('snowman', 'creature')
def snowman(rng, v):
    m = Mix(0.7)
    m.add(norm(grit(rng, 0.25, [(0, 1), (0.1, 0.7), (0.25, 0)], 700, 7000, 2500)), 0, 0.6)
    m.add(norm(debris(rng, 0.25, 30, 'snow', 0, 0.06)), 0, 0.6)
    m.add(thump(0.2, 170, 80, 0.02, 0.05, 0.002, 1.6), 0, 0.6)
    m.add(norm(nhit(rng, 0.15, 120, 1200, 0.003, 0.04)), 0, 0.5)
    return reverb(m.out, 'room', 0.1)


@sfx('bubble', 'creature', variants=2)
def bubble_pop(rng, v):
    m = Mix(0.5)
    f = [190.0, 240.0][v]
    m.add(bubble(f, 0.5, 1.0), 0, 1.0)
    m.add(bubble(f * 2.3, 0.3, 0.4), 0.06, 1.0)
    m.add(norm(nhit(rng, 0.05, 300, 3000, 0.0005, 0.006)), 0.07, 0.25)
    m.add(bubble(f * 4.1, 0.2, 0.15), 0.075, 1.0)
    return reverb(m.out, 'room', 0.12)


@sfx('lava_burst', 'creature')
def lava_burst(rng, v):
    m = Mix(1.2)
    m.add(bubble(120.0, 0.6, 1.0, 0.5), 0, 1.0)
    m.add(bubble(260.0, 0.4, 0.4), 0.05, 1.0)
    m.add(thump(0.3, 170, 80, 0.03, 0.07, 0.002, 2.0), 0, 0.5)
    m.add(norm(lp(splash(rng, 1.4, 0.8, 15, 6, 0.2), 1800, 2)), 0.08, 0.6)
    n = N(1.0)
    sz = fit(crackle(rng, 1.0, 300, lo=2000, hi=10000, pop=0.2), n) + \
        0.5 * bandnoise(n, rng, 3000, 11000) * np.clip(1 + 0.6 * lp_noise(n, rng, 20), 0, None)
    m.add(norm(sz * env_pts(n, [(0, 0), (0.1, 1), (1.0, 0)], 'cos')), 0.12, 0.25)
    return reverb(m.out, 'field', 0.12)


@sfx('chime_secret', 'ui_reward', maxdur=2.0, densify=False)
def chime_secret(rng, v):
    m = Mix(1.6)
    melody = [(0.0, 86), (0.09, 93), (0.18, 90), (0.27, 97), (0.40, 98)]
    for i, (t, mi) in enumerate(melody):
        last = i == len(melody) - 1
        m.add(bell(rng, float(midi(mi)), 1.3 if last else 0.9, 'glock', hard=0.75), t,
              0.8 if last else 0.6)
        m.add(bell(rng, float(midi(mi - 12)), 0.8, 'chime', hard=0.5), t, 0.25)
    fr = scale_freqs(86, [0, 4, 6, 7, 11], 2500, 10000)
    m.add(sparkle(rng, 1.4, 30, freqs=fr, dtau=0.4, t0=0.38), 0, 0.35)
    m.add(norm(shimmer(rng, 1.0, 5000, 8, 0.25, 12, 0.3, 0.35)), 0.38, 0.12)
    return reverb(m.out, 'hall', 0.22)


# ----------------------------------------------------------------------------
# Cinematic
# ----------------------------------------------------------------------------
@sfx('cine_boom', 'cine', maxdur=3.3)
def cine_boom(rng, v):
    m = Mix(3.0)
    m.add(click(rng, 0.01, 400, 9000, 0.002), 0, 0.6)
    m.add(thump(2.5, 75, 26, 0.12, 0.55, 0.003, 1.8), 0, 0.42)
    m.add(norm(banded_decay(rng, 2.5, [(25, 120, 0.7, 0.42), (120, 400, 0.45, 1.0),
                                       (400, 1500, 0.22, 0.75), (1500, 6000, 0.07, 0.35)],
                            0.002)), 0, 0.95)
    m.add(norm(impact(rng, 2.5, 0.5, f0=115)), 0, 0.6)
    m.add(norm(tamtam(rng, 2.8, 70, 3000, 90, 2.5, 0.05, 0.45)), 0, 0.35)
    y = sat(norm(m.out) * 1.3, 1.0)
    return reverb(bass_harmonics(y, 110, 0.8), 'cathedral', 0.35)


@sfx('cine_whoosh', 'cine', variants=2, maxdur=2.2)
def cine_whoosh(rng, v):
    dur = [1.4, 1.2][v]
    pk = dur * [0.55, 0.45][v]
    m = Mix(dur)
    a = whoosh(rng, dur, [(0, 250), (pk, 1400), (dur, 300)], [(0, 0.08), (pk, 1.0), (dur, 0)],
               q=0.9, order=2, flutter=0.3, flutter_rate=15)
    b = whoosh(rng, dur, [(0, 1500), (pk, 6000), (dur, 1800)], [(0, 0.06), (pk, 1.0), (dur, 0)],
               q=1.2, order=1, flutter=0.4)
    low = rumble(rng, dur, [(0, 0.06), (pk, 1.0), (dur, 0)], 140, 0.5)
    m.add(norm(a), 0, 0.8)
    m.add(norm(b), 0, 0.35)
    m.add(norm(low), 0, 0.45)
    return reverb(m.out, 'hall', 0.3)


@sfx('cine_riser', 'cine', maxdur=3.1)
def cine_riser(rng, v):
    dur = 3.0
    n = N(dur)
    t = tvec(n)
    m = Mix(dur)
    m.add(norm(riser(rng, dur, 200, 7000, tones=(38, 45, 50, 57), tone_amt=0.6, octaves=1.0,
                     trem=(3, 18), trem_depth=0.4, curve=2.5, start_db=-28)), 0, 0.8)
    hi = np.zeros(n)
    for k in range(3):
        f = 600 * 2 ** k * 2 ** (1.5 * t / dur)
        hi += np.sin(TAU * phase_of(f)) * np.sin(np.pi * np.clip((t / dur * 1.5 + k / 3.0) % 1.0,
                                                                  0, 1))
    m.add(norm(hi) * db2a(-26 * (1 - t / dur)), 0, 0.15)
    m.add(norm(rumble(rng, dur, [(0, 0.05), (dur, 1.0)], 120, 0.4)) *
          db2a(-24 * (1 - t / dur) ** 0.6), 0, 0.4)
    y = reverb(m.out, 'hall', 0.22)[:N(3.03)]
    return fade(y, 0, 0.03)


@sfx('cine_thunder', 'cine', maxdur=4.2)
def cine_thunder(rng, v):
    dur = 4.0
    n = N(dur)
    m = Mix(dur)
    m.add(click(rng, 0.015, 300, 12000, 0.003), 0, 0.9)
    m.add(norm(banded_decay(rng, 0.6, [(200, 1000, 0.08, 1.0), (1000, 4000, 0.05, 0.9),
                                       (4000, 12000, 0.02, 0.6)], 0.0005)), 0, 0.8)
    m.add(norm(crackle(rng, 0.35, 900, lo=800, hi=9000, pop=0.2)), 0, 0.5)
    roll = Mix(dur)
    for k in range(8):
        t0 = 0.04 + rng.uniform(0, 2.2) * (k + 1) / 8
        L = rng.uniform(0.6, 1.6)
        nn = N(L)
        b = lp(brown(nn, rng), rng.uniform(500, 1200), 2) * env_ad(nn, rng.uniform(0.04, 0.2),
                                                                  L * 0.35)
        roll.add(norm(b), t0, 0.85 ** k)
    m.add(norm(roll.out), 0, 0.9)
    m.add(norm(rumble(rng, dur, [(0, 0), (0.2, 1.0), (1.5, 0.7), (4.0, 0)], 160, 1.0)), 0, 0.6)
    return reverb(bass_harmonics(m.out, 120, 0.5), 'cathedral', 0.3)


@sfx('wall_crack', 'cine', maxdur=2.8)
def wall_crack(rng, v):
    m = Mix(2.6)
    m.add(norm(creak(rng, 2.3, [(0, 18), (1.2, 30), (2.3, 15)],
                     [(0, 0.3), (0.5, 0.8), (1.6, 1.0), (2.3, 0)],
                     res=(120, 260, 430, 700, 1100), t60=0.08, jitter=0.4, hp_f=60)), 0, 0.45)
    m.add(norm(rumble(rng, 2.5, [(0, 0.3), (1.5, 1.0), (2.5, 0)], 200, 1.0)), 0, 0.5)
    for i, t in enumerate([0.0, 0.35, 0.6, 0.82, 1.0, 1.15, 1.27, 1.36, 1.45]):
        m.add(stone_crack(rng, 0.6 + 0.08 * i), t, 0.35 + 0.05 * i)
    t = 1.6
    m.add(stone_crack(rng, 2.0), t, 1.0)
    m.add(norm(banded_decay(rng, 0.8, [(60, 300, 0.2, 1.0), (300, 1500, 0.1, 0.8),
                                       (1500, 6000, 0.04, 0.5)], 0.001)), t, 0.7)
    m.add(thump(0.6, 130, 48, 0.05, 0.15, 0.002, 2.0), t, 0.35)
    m.add(norm(debris(rng, 0.9, 40, 'stone', 0, 0.3, None, amp_db=(-24, -8), scale=1.5)),
          t + 0.02, 0.3)
    m.add(norm(grit(rng, 0.8, [(0, 0), (0.05, 1), (0.8, 0)], 600, 6000)), t, 0.2)
    return reverb(bass_harmonics(m.out, 130, 0.5), 'hall', 0.25)


@sfx('beacon_ignite', 'cine', maxdur=1.9)
def beacon_ignite(rng, v):
    m = Mix(1.7)
    m.add(norm(whoosh(rng, 0.25, [(0, 300), (0.22, 1500)], [(0, 0.2), (0.2, 1.0), (0.25, 0.6)],
                      q=1.0)), 0, 0.5)
    m.add(thump(0.4, 160, 65, 0.035, 0.09, 0.003, 2.0), 0.17, 0.45)
    m.add(norm(fire(rng, 1.5, [(0, 0.0), (0.05, 1.0), (0.5, 0.75), (1.5, 0)], 160, 3000, 0.8,
                    70, 0.2, 0.4)), 0.15, 0.9)
    m.add(norm(nhit(rng, 0.4, 200, 4000, 0.002, 0.1)), 0.17, 0.5)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'yard', 0.2)


@sfx('fire_crackle', 'cine', maxdur=3.0)
def fire_crackle(rng, v):
    dur = 3.0
    n = N(dur)
    m = Mix(dur)
    bed = filt(pink(n, rng), ('highpass', 120), ('lowpass', 900), ('lowpass', 900))
    bed *= np.clip(1 + 0.8 * lp_noise(n, rng, 6), 0.1, None)          # lapping flames
    m.add(norm(bed), 0, 0.3)
    hiss = bandnoise(n, rng, 2500, 10000) * np.clip(1 + 0.6 * lp_noise(n, rng, 12), 0, None)
    m.add(norm(hiss), 0, 0.06)
    m.add(norm(fit(crackle(rng, dur, 22, lo=600, hi=11000, pop=0.5, alpha=1.3,
                           pop_f=(700, 2600)), n)), 0, 0.9)
    m.add(norm(fit(crackle(rng, dur, 120, lo=2500, hi=11000, pop=0.05), n)), 0, 0.2)
    for t in rng.uniform(0.2, 2.6, 3):                                # wood splits / pops
        m.add(norm(debris(rng, 0.15, 4, 'splinter', 0, 0.02)), t, 0.5)
    return reverb(m.out, 'room', 0.1)[:n]


@sfx('heartbeat', 'cine', maxdur=1.7)
def heartbeat(rng, v):
    m = Mix(1.6)
    for t in [0.0, 0.82]:
        m.add(heart_beat(rng, 1.0, 62.0), t, 1.0)
        m.add(heart_beat(rng, 0.7, 74.0), t + 0.23, 1.0)
    return reverb(bass_harmonics(m.out, 120, 0.9), 'room', 0.1)


@sfx('sword_draw', 'event')
def sword_draw(rng, v):
    return reverb(shing(rng, 0.45, ring=0.6), 'room', 0.2)


@sfx('gate_break', 'cine', maxdur=2.6)
def gate_break(rng, v):
    m = Mix(2.2)
    m.add(click(rng, 0.01, 300, 10000, 0.002), 0, 0.9)
    m.add(norm(impact(rng, 2.2, 0.6, f0=135)), 0, 1.0)
    m.add(thump(1.0, 95, 32, 0.08, 0.3, 0.002, 2.0), 0, 0.3)
    m.add(wood(rng, 205, 0.25, nm=6, bright=0.65, hard=0.85, noise=0.4), 0, 0.75)
    m.add(wood(rng, 128, 0.3, nm=6, bright=0.6, hard=0.75, noise=0.3), 0.01, 0.55)
    m.add(norm(nhit(rng, 0.4, 200, 3000, 0.0008, 0.09)), 0, 0.6)
    for k in range(5):                                        # splintering cracks
        m.add(norm(debris(rng, 0.08, 6, 'splinter', 0, 0.01)), k * rng.uniform(0.012, 0.03),
              0.5)
    m.add(norm(debris(rng, 1.6, 60, 'splinter', 0.0, 0.18, 0.4)), 0, 0.6)
    m.add(norm(debris(rng, 1.8, 30, 'wood', 0.08, 0.35, 0.6)), 0, 0.5)
    m.add(metal(rng, 380, 0.8, nm=10, kind='plate', hard=0.7), 0.0, 0.22)
    m.add(norm(rumble(rng, 1.8, [(0, 0), (0.05, 1), (1.8, 0)], 200, 0.5)), 0, 0.45)
    return reverb(bass_harmonics(m.out, 120, 0.5), 'cathedral', 0.3)


@sfx('star_rise', 'cine', maxdur=4.6)
def star_rise(rng, v):
    dur = 3.6
    n = N(dur)
    m = Mix(dur)
    pad = choir(rng, 3.5, [57, 64, 69, 71, 76], [(0, 'o'), (1.8, 'a'), (3.5, 'a')],
                amp_pts=[(0, 0.25), (1.3, 0.8), (2.6, 1.0), (3.5, 0)], vpn=3, breath=0.15)
    m.add(norm(pad), 0, 0.5)
    for _ in range(80):
        t = 3.2 * (1 - float(trunc_exp(rng, 0.45, 1.0)))
        f = 1500 * 2 ** (2.4 * t / dur + rng.uniform(-0.25, 0.25))
        f = float(midi(np.round(12 * np.log2(f / 440.0) + 69)))       # snap to semitones
        m.add(ping(f, np.exp(rng.uniform(np.log(0.05), np.log(0.3)))), t,
              db2a(rng.uniform(-20, -6)) * (0.4 + 0.6 * t / dur))
    f = env_pts(n, [(0, 800), (dur, 3200)], 'log')
    gl = (sine(f) + 0.3 * sine(2 * f)) * env_pts(n, [(0, 0.2), (1.8, 0.6), (3.0, 1.0), (3.6, 0)],
                                                  'cos')
    m.add(norm(gl), 0, 0.12)
    m.add(bell(rng, float(midi(93)), 1.6, 'chime', hard=0.4), 2.9, 0.3)
    return reverb(m.out, 'cathedral', 0.35)


@sfx('typewriter', 'ui_soft', variants=3)
def typewriter(rng, v):
    m = Mix(0.06)
    n = N(0.03)
    x = bandnoise(n, rng, 2000, 9000) * env_pts(n, [(0, 0.5), (0.004, 1.0), (0.03, 0)], 'cos')
    x *= np.clip(1 + 0.8 * lp_noise(n, rng, 400), 0, None)
    m.add(norm(x), 0, 0.6)
    m.add(wood(rng, [1900, 2200, 1700][v], 0.012, nm=3, hard=0.7, noise=0.3), 0, 0.5)
    return reverb(m.out, 'tiny', 0.05)
