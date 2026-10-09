"""Archer, mage and artillery tower sounds."""
import numpy as np

from .dsp import (SR, TAU, N, tvec, norm, fit, Mix, white, bandnoise, lp_noise, env_ad,
                  env_pts, filt, tvf, reverb, bass_harmonics, sat, sine)
from .lib import (wood, metal, glass, bell, sparkle, scale_freqs, whoosh, nhit, thump, click,
                  pluck, debris, grit, banded_decay, explosion, crackle, bubbles, splash,
                  shatter, buzz, zap, fm_tone, shimmer, wind)
from .registry import sfx


# ----------------------------------------------------------------------------
# Archers
# ----------------------------------------------------------------------------
def bow_twang(rng, f0, heavy=0.0):
    """Bow release: plucked string with tension-release bend + limb knock + slap."""
    m = Mix(0.45)
    tw = pluck(rng, f0, 0.34 + 0.1 * heavy, t60=0.2 + 0.12 * heavy, pos=0.13 - 0.02 * heavy,
               bend=0.12 + 0.05 * heavy, bend_tau=0.012, kmax=4500, decay_k=0.5)
    m.add(norm(sat(tw * (1.6 + heavy), 1.0)), 0, 0.85)
    m.add(wood(rng, f0 * 1.9, 0.04, nm=3, bright=0.4, hard=0.6, noise=0.3), 0, 0.4 + 0.2 * heavy)
    m.add(click(rng, 0.004, 2000, 9000, 0.0006), 0, 0.3)
    return m.out


def arrow_whoosh(rng, dur=0.22, f=3000.0, q=1.6, lvl_start=0.2):
    return whoosh(rng, dur, [(0, f * 0.85), (0.05, f * 1.1), (dur, f * 0.45)],
                  [(0, lvl_start), (0.03, 1.0), (dur, 0)], q=q, order=2, flutter=0.4,
                  flutter_rate=40)


def shaft_quiver(rng, f=230.0, dur=0.28, rate=32.0):
    n = N(dur)
    t = tvec(n)
    am = (0.5 + 0.5 * np.sin(TAU * rate * t)) ** 2
    y = (np.sin(TAU * f * t) + 0.5 * np.sin(TAU * 2.03 * f * t) + 0.25 * np.sin(TAU * 3.1 * f * t))
    return y * am * np.exp(-t / 0.07) * np.clip(t / 0.003, 0, 1)


def arrow_thunk(rng, pf=1.0, wood_amt=0.8, flesh=0.5):
    m = Mix(0.4)
    m.add(click(rng, 0.004, 1200, 8000, 0.0006), 0, 0.5)
    m.add(wood(rng, 420 * pf, 0.05, nm=4, bright=0.5, hard=0.7, noise=0.3), 0, wood_amt)
    m.add(norm(nhit(rng, 0.08, 200, 1500, 0.0008, 0.018)), 0, flesh)
    m.add(thump(0.08, 260 * pf, 130, 0.01, 0.022, 0.0008, 2.0), 0, 0.3)
    m.add(norm(shaft_quiver(rng, 230 * pf)), 0.008, 0.22)
    return m.out


@sfx('arrow_shoot', 'combat', variants=3)
def arrow_shoot(rng, v):
    pf = [1.0, 0.93, 1.07][v]
    m = Mix(0.45)
    m.add(bow_twang(rng, 135 * pf), 0, 1.0)
    m.add(norm(arrow_whoosh(rng, 0.22, 3000 * pf)), 0.004, 0.55)
    return reverb(m.out, 'field', 0.08)


@sfx('arrow_hit', 'combat', variants=3)
def arrow_hit(rng, v):
    pf = [1.0, 0.9, 1.1][v]
    y = arrow_thunk(rng, pf, [0.8, 0.5, 0.7][v], [0.5, 0.9, 0.6][v])
    return reverb(y, 'field', 0.08)


@sfx('arrow_miss', 'combat', variants=2)
def arrow_miss(rng, v):
    m = Mix(0.4)
    m.add(norm(nhit(rng, 0.08, 120, 1400, 0.001, 0.02)), 0, 0.7)
    m.add(thump(0.08, 180, 95, 0.01, 0.022, 0.001, 1.5), 0, 0.35)
    m.add(norm(debris(rng, 0.2, 18, 'dirt', 0.0, 0.04, 0.08)), 0, 0.6)
    m.add(norm(grit(rng, 0.15, [(0, 1), (0.15, 0)], 600, 5000)), 0, 0.3)
    m.add(norm(shaft_quiver(rng, [210, 250][v], 0.2)), 0.006, 0.12)
    return reverb(m.out, 'field', 0.06)


@sfx('crossbow_shoot', 'combat', variants=3)
def crossbow_shoot(rng, v):
    pf = [1.0, 0.94, 1.06][v]
    m = Mix(0.6)
    # trigger + latch: two quick mechanical clacks
    m.add(metal(rng, 2400 * pf, 0.03, nm=4, kind='rand', hard=1.0, noise=0.5), 0, 0.45)
    m.add(wood(rng, 900 * pf, 0.025, nm=3, hard=0.9, noise=0.4), 0.0, 0.5)
    m.add(metal(rng, 1700 * pf, 0.04, nm=4, kind='rand', hard=1.0, noise=0.5), 0.018, 0.42)
    m.add(bow_twang(rng, 92 * pf, heavy=1.0), 0.02, 1.0)
    m.add(thump(0.15, 210, 100, 0.015, 0.035, 0.001, 2.0), 0.02, 0.4)
    m.add(norm(arrow_whoosh(rng, 0.25, 2100 * pf, 1.4)), 0.025, 0.5)
    return reverb(m.out, 'field', 0.09)


@sfx('bolt_pierce', 'combat')
def bolt_pierce(rng, v):
    m = Mix(0.7)
    wh = whoosh(rng, 0.35, [(0, 1500), (0.08, 2600), (0.35, 900)],
                [(0, 0.4), (0.06, 1), (0.35, 0)], q=1.3)
    m.add(norm(wh), 0, 0.55)
    for i, t in enumerate([0.1, 0.19]):
        m.add(norm(arrow_thunk(rng, 0.95 - 0.08 * i, 0.5, 0.9)), t, 0.95 - 0.15 * i)
    return reverb(m.out, 'field', 0.1)


@sfx('multishot', 'combat')
def multishot(rng, v):
    m = Mix(0.8)
    for i, t in enumerate([0.0, 0.035, 0.075, 0.11, 0.155]):
        pf = rng.uniform(0.9, 1.12)
        m.add(norm(bow_twang(rng, 135 * pf)), t, 0.6 * rng.uniform(0.75, 1.0))
        m.add(norm(arrow_whoosh(rng, 0.25, 3000 * pf)), t + 0.004, 0.42)
    return reverb(m.out, 'field', 0.1)


# ----------------------------------------------------------------------------
# Mages
# ----------------------------------------------------------------------------
@sfx('magic_cast', 'combat', variants=3)
def magic_cast(rng, v):
    pf = [1.0, 1.12, 0.9][v]
    m = Mix(0.6)
    z = zap(rng, 0.35, 1700 * pf, 480 * pf, 0.06, ratio=[2.01, 1.5, 2.5][v], idx0=4.5,
            idx1=0.6, idx_tau=0.07, att=0.002, decay=0.11)
    m.add(norm(z), 0, 0.6)
    b = zap(rng, 0.3, 420 * pf, 170 * pf, 0.05, ratio=1.0, idx0=1.5, idx1=0.2, idx_tau=0.05,
            att=0.002, decay=0.09)
    m.add(norm(b), 0, 0.45)
    m.add(norm(shimmer(rng, 0.4, 4200 * pf, 7, 0.3, 22, 0.004, 0.12)), 0, 0.28)
    m.add(norm(whoosh(rng, 0.3, [(0, 6000), (0.3, 1800)], [(0, 1), (0.3, 0)], q=0.8, order=1)),
          0, 0.3)
    m.add(click(rng, 0.004, 2000, 12000), 0, 0.2)
    return reverb(m.out, 'room', 0.18)


@sfx('magic_hit', 'combat', variants=3)
def magic_hit(rng, v):
    pf = [1.0, 0.9, 1.12][v]
    m = Mix(0.6)
    m.add(norm(nhit(rng, 0.12, 400, 5000, 0.0005, 0.02)), 0, 0.7)
    m.add(thump(0.12, 280 * pf, 110, 0.015, 0.035, 0.0008, 1.8), 0, 0.55)
    m.add(norm(zap(rng, 0.2, 2400 * pf, 700 * pf, 0.03, 3.01, 3, 0.3, 0.05, 0.001, 0.06)), 0,
          0.35)
    fr = scale_freqs([74, 76, 72][v], [0, 4, 7, 11], 2500, 10000)
    m.add(sparkle(rng, 0.4, 16, freqs=fr, tau=(0.02, 0.09), dtau=0.08, amp_db=(-16, 0)),
          0.005, 0.5)
    return reverb(m.out, 'room', 0.15)


@sfx('lightning', 'combat_big', variants=2)
def lightning(rng, v):
    m = Mix(0.8)
    m.add(click(rng, 0.006, 500, 14000, 0.001), 0, 1.0)
    m.add(norm(nhit(rng, 0.1, 1500, 12000, 0.0002, 0.012)), 0, 0.7)
    jumps = [0.0, 0.17, 0.33] if v == 0 else [0.0, 0.12, 0.27, 0.4]
    for j, t in enumerate(jumps):
        L = 0.22 - 0.03 * j
        bz = buzz(rng, L, rng.uniform(90, 140), 0.25, True, 0.75, (0.004, 0.025), 3.0)
        bz = filt(bz, ('highpass', 300), ('lowpass', 7000)) * env_ad(N(L), 0.002, L * 0.5)
        m.add(norm(bz), t, 0.55 * 0.85 ** j)
        cr = crackle(rng, L, 450, lo=1500, hi=12000, pop=0.3, pop_f=(2000, 6000))
        m.add(norm(cr) * np.exp(-np.arange(len(cr)) / SR / (L * 0.6)), t, 0.5 * 0.85 ** j)
        if j:
            m.add(click(rng, 0.005, 800, 14000, 0.0008), t, 0.7 * 0.8 ** j)
    m.add(norm(zap(rng, 0.3, 3000, 300, 0.05, 1.41, 6, 1, 0.1, 0.001, 0.08)), 0, 0.3)
    return reverb(m.out, 'field', 0.15)


@sfx('frost_cast', 'combat', variants=2)
def frost_cast(rng, v):
    m = Mix(0.8)
    n = N(0.6)
    t = tvec(n)
    base = [2200.0, 2600.0][v]
    for k, r in enumerate([1.0, 1.26, 1.5, 2.0]):
        fc = base * r * (1 + 0.15 * (1 - np.exp(-t / 0.15)))
        y = fm_tone(n, fc, 3.5, 0.8 * np.exp(-t / 0.2)) * env_ad(n, 0.01 + 0.02 * k, 0.18)
        m.add(y, 0.0, 0.25)
    m.add(norm(whoosh(rng, 0.5, [(0, 2500), (0.4, 8000)], [(0, 0.5), (0.1, 1), (0.5, 0)], q=0.9,
                      order=1)), 0, 0.35)
    m.add(sparkle(rng, 0.6, 14, 3500, 10000, tau=(0.02, 0.12), density='uniform',
                  partial2=0.4), 0, 0.35)
    m.add(norm(nhit(rng, 0.15, 250, 1500, 0.004, 0.04)), 0, 0.25)       # body for small speakers
    m.add(click(rng, 0.004, 3000, 14000), 0, 0.3)
    return reverb(m.out, 'room', 0.2)


@sfx('freeze', 'combat')
def freeze(rng, v):
    m = Mix(1.1)
    ts = 0.32 * np.sqrt(rng.uniform(0, 1, 45))
    m.add(norm(debris(rng, 0.5, 45, 'ice', times=ts, amp_db=(-18, 0))), 0, 0.7)
    m.add(norm(grit(rng, 0.35, [(0, 0.25), (0.3, 1.0), (0.35, 0)], 800, 7000, 1500)), 0, 0.35)
    m.add(norm(nhit(rng, 0.3, 200, 1200, 0.25, 0.04)), 0, 0.2)
    t = 0.32
    m.add(glass(rng, 2350, 0.9, 4, 0.5), t, 0.7)
    m.add(bell(rng, 3520.0, 0.7, 'crystal', hard=0.9), t, 0.35)
    m.add(click(rng, 0.005, 2000, 14000), t, 0.5)
    m.add(thump(0.1, 320, 160, 0.01, 0.03, 0.001, 1.5), t, 0.3)
    return reverb(m.out, 'room', 0.2)


@sfx('ice_shatter', 'combat_big')
def ice_shatter(rng, v):
    m = Mix(1.2)
    m.add(norm(shatter(rng, 1.0, 'ice', 45, 1.0)), 0, 0.9)
    m.add(norm(nhit(rng, 0.2, 600, 5000, 0.001, 0.05)), 0, 0.4)
    m.add(thump(0.15, 260, 110, 0.015, 0.05, 0.001, 1.6), 0, 0.4)
    m.add(norm(debris(rng, 1.0, 20, 'glass', 0.05, 0.2, 0.3)), 0, 0.4)
    return reverb(m.out, 'room', 0.18)


@sfx('blizzard', 'combat_big', maxdur=2.8)
def blizzard(rng, v):
    from .dsp import slow_noise
    dur = 2.6
    n = N(dur)
    m = Mix(dur)
    gust = env_pts(n, [(0, -1.5), (0.7, 1.4), (1.5, 0.6), (2.0, 1.0), (2.6, -1)], 'cos') + \
        0.3 * slow_noise(n, rng, 3)
    w = wind(rng, dur, fc=900, depth=1.6, gust=gust, q=1.0, whistle=0.5,
             whistle_f=(700, 1700), whistle_q=30, floor=0.15)
    amp = env_pts(n, [(0, 0.3), (0.6, 1.0), (1.9, 0.85), (2.6, 0.0)], 'cos')
    m.add(norm(w * amp), 0, 0.8)
    hiss = bandnoise(n, rng, 4000, 13000) * amp * np.clip(1 + 0.5 * lp_noise(n, rng, 15), 0, None)
    m.add(norm(hiss), 0, 0.22)
    m.add(sparkle(rng, 2.3, 40, 3500, 10000, tau=(0.03, 0.2), density='uniform', partial2=0.4,
                  amp_curve=lambda tt: np.interp(tt, [0, 0.6, 2.0, 2.4], [0.3, 1, 0.8, 0])),
          0, 0.3)
    m.add(norm(debris(rng, 2.4, 50, 'ice', times=rng.uniform(0.1, 2.3, 50),
                      amp_db=(-26, -10))), 0, 0.2)
    return reverb(m.out, 'yard', 0.2)


# ----------------------------------------------------------------------------
# Artillery
# ----------------------------------------------------------------------------
@sfx('bomb_launch', 'combat', variants=3)
def bomb_launch(rng, v):
    pf = [1.0, 0.92, 1.08][v]
    m = Mix(0.7)
    from .dsp import resonate
    m.add(thump(0.25, 230 * pf, 95, 0.02, 0.05, 0.0015, 2.4), 0, 0.55)
    ex = nhit(rng, 0.25, 80, 2500, 0.001, 0.02)
    tube = resonate(ex, [290 * pf, 585 * pf, 880 * pf], [0.1, 0.07, 0.045], [1.0, 0.5, 0.25])
    m.add(norm(tube), 0, 0.85)
    m.add(norm(banded_decay(rng, 0.3, [(100, 400, 0.04, 1.0), (400, 1200, 0.03, 0.7),
                                       (1200, 4000, 0.012, 0.3)], 0.001)), 0, 0.55)
    m.add(metal(rng, 610 * pf, 0.22, nm=6, kind='rand', bright=0.7, hard=0.6, noise=0.1),
          0.002, 0.3)
    m.add(norm(whoosh(rng, 0.3, [(0, 600), (0.3, 1800)], [(0, 0.6), (0.05, 1), (0.3, 0)],
                      q=1.0)), 0.01, 0.3)
    return reverb(bass_harmonics(m.out, 140, 0.5), 'field', 0.12)


@sfx('bomb_explode', 'combat_big', variants=3)
def bomb_explode(rng, v):
    size = [1.0, 0.92, 1.08][v]
    y = explosion(rng, size, bright=0.55, debris_n=30, dur=1.1, sub=0.7, crack=0.6,
                  mat=['stone', 'rock', 'stone'][v], rumble_amt=0.4)
    return reverb(y, 'field', 0.22)


@sfx('rocket_launch', 'combat', variants=3)
def rocket_launch(rng, v):
    pf = [1.0, 0.92, 1.1][v]
    dur = 1.0
    n = N(dur)
    m = Mix(dur)
    m.add(norm(nhit(rng, 0.08, 200, 5000, 0.0005, 0.015)), 0, 0.6)
    m.add(thump(0.12, 230, 110, 0.015, 0.035, 0.001, 1.8), 0, 0.4)
    fc = env_pts(n, [(0, 3500 * pf), (0.15, 4200 * pf), (1.0, 1500 * pf)], 'log')
    hs = tvf(white(n, rng), 'bandpass', fc, 0.7)
    hs *= np.clip(1 + 0.5 * lp_noise(n, rng, 60), 0, None)
    amp = env_pts(n, [(0, 0.25), (0.06, 1.0), (0.3, 0.8), (1.0, 0)], 'cos')
    m.add(norm(hs * amp), 0, 0.7)
    rr = bandnoise(n, rng, 150, 900) * amp * np.clip(1 + 0.6 * lp_noise(n, rng, 25), 0, None)
    m.add(norm(rr), 0, 0.45)
    wf = env_pts(n, [(0, 1700 * pf), (1.0, 900 * pf)], 'log') * \
        (1 + 0.01 * np.sin(TAU * 9 * tvec(n)))
    ws = (sine(wf) + 0.3 * sine(wf * 2.0)) * amp
    m.add(norm(ws), 0, 0.13)
    cr = fit(crackle(rng, dur, 120, lo=1500, hi=9000), n) * amp
    m.add(norm(cr), 0, 0.2)
    return reverb(m.out, 'field', 0.12)


@sfx('rocket_explode', 'combat_big', variants=2)
def rocket_explode(rng, v):
    y = explosion(rng, [0.8, 0.88][v], bright=0.9, debris_n=24, dur=1.0, sub=0.5, crack=1.0,
                  mat='metal' if v else 'stone', rumble_amt=0.3, drive=2.8, body_tau=0.1)
    return reverb(y, 'field', 0.22)


@sfx('acid_splash', 'combat', variants=2)
def acid_splash(rng, v):
    m = Mix(1.1)
    m.add(norm(shatter(rng, 0.5, 'glass', 14, 0.6)), 0, 0.6)
    m.add(norm(splash(rng, [0.7, 0.85][v], 0.7, 25, 6, 0.4)), 0.005, 0.8)
    n = N(0.9)
    sz = fit(crackle(rng, 0.9, 500, lo=2500, hi=11000, pop=0.1), n)
    hiss = bandnoise(n, rng, 3000, 12000) * np.clip(1 + 0.6 * lp_noise(n, rng, 30), 0, None)
    env = env_pts(n, [(0, 0), (0.08, 1), (0.9, 0)], 'cos')
    m.add(norm(sz * env) * 0.6 + norm(hiss * env) * 0.4, 0.05, 0.45)
    return reverb(m.out, 'room', 0.12)


@sfx('sizzle', 'combat', maxdur=1.55)
def sizzle(rng, v):
    dur = 1.5
    n = N(dur)
    env = env_pts(n, [(0, 0.7), (0.03, 1.0), (1.2, 0.9), (1.5, 0.6)], 'cos')
    c = fit(crackle(rng, dur, 700, lo=2200, hi=11000, pop=0.12, pop_f=(2500, 6000)), n)
    h = bandnoise(n, rng, 2500, 12000) * np.clip(1 + 0.7 * lp_noise(n, rng, 25), 0, None)
    bub = fit(bubbles(rng, dur, 30, 900, 3000, 0, None, (0.1, 0.3), (-20, -6)), n)
    y = norm(c) * 0.6 + norm(h) * 0.35 + norm(bub) * 0.2
    return y * env
