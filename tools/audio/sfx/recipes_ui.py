"""UI and general battle sounds."""
import numpy as np

from .dsp import (N, tvec, db2a, midi, norm, Mix, bandnoise, lp_noise, env_ad, env_pts, filt,
                  lp, reverb, bass_harmonics, sat, saw)
from .lib import (wood, metal, coin, bell, sparkle, scale_freqs, whoosh, paper, nhit, thump,
                  horn, drum, tamtam, impact, creak, debris, grit, banded_decay, rumble,
                  flap, shimmer, formant_filter)
from .registry import sfx


# ----------------------------------------------------------------------------
# UI
# ----------------------------------------------------------------------------
@sfx('ui_click', 'ui', variants=3)
def ui_click(rng, v):
    pf = [1.0, 0.91, 1.09][v]
    m = Mix(0.12)
    m.add(wood(rng, 1150 * pf, 0.032, nm=4, bright=0.45, hard=0.55, noise=0.12), 0, 1.0)
    m.add(wood(rng, 340 * pf, 0.028, nm=2, bright=0.3, hard=0.3, noise=0.0), 0, 0.45)
    m.add(norm(nhit(rng, 0.02, 2500, 7000, 0.0002, 0.0022)), 0, 0.22)
    return reverb(m.out, 'tiny', 0.08)


@sfx('ui_open', 'ui')
def ui_open(rng, v):
    m = Mix(0.4)
    sw = paper(rng, 0.2, [(0, 0.3), (0.09, 1.0), (0.2, 0)], lo=1200, hi=7000, crinkle=0.25)
    sw2 = whoosh(rng, 0.2, [(0, 1400), (0.16, 4200)], [(0, 0.3), (0.1, 1.0), (0.2, 0)],
                 q=0.9, order=1, flutter=0.2)
    m.add(norm(sw), 0, 0.45)
    m.add(norm(sw2), 0, 0.55)
    m.add(wood(rng, 610, 0.05, nm=4, bright=0.5, hard=0.45, noise=0.12), 0.105, 0.95)
    m.add(wood(rng, 205, 0.045, nm=2, bright=0.3, hard=0.3, noise=0.0), 0.105, 0.45)
    return reverb(m.out, 'tiny', 0.1)


@sfx('ui_close', 'ui')
def ui_close(rng, v):
    m = Mix(0.3)
    sw = whoosh(rng, 0.15, [(0, 5200), (0.15, 2200)], [(0, 0.18), (0.12, 1.0), (0.15, 0.0)],
                q=0.9, order=1, flutter=0.15)
    m.add(norm(sw), 0, 0.5)
    m.add(norm(paper(rng, 0.15, [(0, 0.1), (0.12, 1.0), (0.15, 0)], 2000, 8000, 0.2)), 0, 0.2)
    m.add(wood(rng, 920, 0.028, nm=3, bright=0.45, hard=0.5, noise=0.1), 0.125, 0.55)
    return reverb(m.out, 'tiny', 0.08)


@sfx('ui_error', 'ui')
def ui_error(rng, v):
    m = Mix(0.4)
    for i, (t, f) in enumerate([(0.0, 196.0), (0.125, 164.0)]):
        k = lp(wood(rng, f, 0.09, nm=5, bright=0.55, hard=0.35, noise=0.1), 1800, 2)
        m.add(norm(k), t, 1.0 if i == 0 else 0.85)
        m.add(thump(0.12, f * 1.3, f * 0.8, 0.02, 0.035, 0.001, 1.2), t, 0.45)
    return reverb(m.out, 'tiny', 0.1)


@sfx('ui_buy', 'ui', densify=False)
def ui_buy(rng, v):
    m = Mix(0.6)
    m.add(coin(rng, 3300, 0.3), 0.0, 0.9)
    m.add(coin(rng, 4150, 0.36), 0.075, 1.0)
    m.add(norm(whoosh(rng, 0.25, [(0, 900), (0.25, 2600)], [(0, 0.3), (0.08, 1), (0.25, 0)],
                      q=0.8, order=1)), 0, 0.28)
    return reverb(m.out, 'room', 0.12)


@sfx('ui_star', 'ui_reward', maxdur=1.6)
def ui_star(rng, v):
    m = Mix(1.4)
    m.add(bell(rng, float(midi(88)), 1.1, 'chime', hard=0.7), 0.0, 1.0)       # E6
    m.add(bell(rng, float(midi(95)), 0.9, 'chime', hard=0.7), 0.05, 0.65)     # B6
    m.add(bell(rng, float(midi(100)), 0.7, 'glock', hard=0.8), 0.1, 0.4)      # E7
    fr = scale_freqs(76, [0, 2, 4, 7, 9], 2000, 9000)
    m.add(sparkle(rng, 1.2, 28, freqs=fr, tau=(0.04, 0.18), dtau=0.35, amp_db=(-18, -4),
                  t0=0.03), 0, 0.5)
    n = N(1.0)
    m.add(norm(bandnoise(n, rng, 6000, 14000) * env_ad(n, 0.02, 0.25)), 0, 0.1)
    return reverb(m.out, 'room', 0.2)


@sfx('ui_stars_spend', 'ui_reward', maxdur=1.5)
def ui_stars_spend(rng, v):
    m = Mix(1.2)
    m.add(thump(0.25, 150, 55, 0.03, 0.08, 0.002, 1.3), 0, 0.9)
    m.add(norm(nhit(rng, 0.12, 80, 900, 0.002, 0.04)), 0, 0.3)
    for i, mi in enumerate([72, 76, 79, 84, 88]):
        m.add(bell(rng, float(midi(mi)), 0.6 + 0.1 * i, 'chime', hard=0.6), 0.03 + i * 0.055,
              0.5 + 0.1 * i)
    fr = scale_freqs(72, [0, 4, 7, 11], 2000, 8000)
    m.add(sparkle(rng, 1.0, 20, freqs=fr, dtau=0.3, t0=0.22, amp_db=(-20, -6)), 0, 0.4)
    return reverb(m.out, 'room', 0.2)


@sfx('ui_page', 'ui')
def ui_page(rng, v):
    m = Mix(0.45)
    pp = paper(rng, 0.32, [(0, 0.25), (0.05, 0.6), (0.17, 1.0), (0.26, 0.4), (0.32, 0)],
               lo=900, hi=8000, crinkle=0.6, crinkle_rate=220)
    m.add(norm(pp), 0, 0.8)
    m.add(norm(whoosh(rng, 0.3, [(0, 500), (0.18, 1500), (0.3, 700)],
                      [(0, 0.25), (0.18, 1), (0.3, 0)], q=0.7, order=1)), 0, 0.5)
    m.add(norm(nhit(rng, 0.06, 300, 2500, 0.002, 0.012)), 0.26, 0.55)
    return reverb(m.out, 'tiny', 0.1)


@sfx('ui_achievement', 'ui_reward', maxdur=1.7)
def ui_achievement(rng, v):
    dur = 1.5
    m = Mix(dur)
    amp = [(0, 0), (0.015, 0.85), (0.085, 0.6), (0.105, 0.3), (0.125, 0.9), (0.2, 0.6),
           (0.222, 0.3), (0.245, 1.0), (0.55, 0.9), (1.05, 0.7), (1.35, 0)]
    lead = horn(rng, [(0, 67), (0.115, 72), (0.24, 79)], dur, amp, voices=3, detune=6,
                bright=(600, 6000), tilt=0.5, rough=0.04, breath=0.03, scoop=0.4,
                glide=0.012, vib=0.08, bell_peak=(1300, 0.9, 4.0))
    m.add(norm(lead), 0, 0.8)
    harm = [(0, 0), (0.24, 0), (0.262, 0.85), (1.05, 0.65), (1.35, 0)]
    m.add(norm(horn(rng, [(0, 76)], dur, harm, voices=2, bright=(500, 5000), rough=0.03,
                    scoop=0.3, glide=0.01, vib=0.06)), 0, 0.45)
    m.add(norm(horn(rng, [(0, 72)], dur, harm, voices=2, bright=(450, 4500), rough=0.03,
                    scoop=0.3, glide=0.01, vib=0.06)), 0, 0.35)
    for t, mi in [(0, 79), (0.115, 84), (0.24, 91)]:
        m.add(bell(rng, float(midi(mi)), 0.9, 'glock', hard=0.8), t, 0.3)
    fr = scale_freqs(79, [0, 4, 7], 2500, 9000)
    m.add(sparkle(rng, 1.2, 18, freqs=fr, dtau=0.35, t0=0.26, amp_db=(-20, -6)), 0, 0.25)
    return reverb(m.out, 'yard', 0.2)


@sfx('ui_unlock', 'ui_reward', maxdur=2.0)
def ui_unlock(rng, v):
    m = Mix(1.6)
    m.add(thump(0.6, 95, 42, 0.05, 0.18, 0.003, 1.4), 0, 0.9)
    m.add(norm(banded_decay(rng, 0.6, [(40, 250, 0.15, 1.0), (250, 900, 0.08, 0.5)], 0.004)),
          0, 0.45)
    fr = scale_freqs(74, [0, 4, 7, 11, 14], 1200, 9000)
    m.add(sparkle(rng, 1.2, 36, freqs=fr, tau=(0.05, 0.3), dtau=0.4, amp_db=(-18, -3),
                  t0=0.02), 0, 0.6)
    for i, mi in enumerate([86, 90, 93, 98]):
        m.add(bell(rng, float(midi(mi)), 1.0, 'chime', hard=0.5), 0.02 + i * 0.045, 0.42)
    m.add(norm(shimmer(rng, 1.2, 3000, 8, 0.3, 14, 0.15, 0.45)), 0, 0.12)
    return reverb(bass_harmonics(m.out, 120, 0.4), 'hall', 0.25)


@sfx('ui_flag', 'ui')
def ui_flag(rng, v):
    m = Mix(0.7)
    fl = flap(rng, 0.3, rate=16, lo=300, hi=3500, amp_pts=[(0, 0.5), (0.05, 1), (0.22, 0.6),
                                                           (0.3, 0)])
    m.add(norm(fl), 0, 0.7)
    m.add(norm(whoosh(rng, 0.25, [(0, 700), (0.12, 1800), (0.25, 900)],
                      [(0, 0.3), (0.1, 1), (0.25, 0)], q=0.8, order=1)), 0, 0.35)
    t = 0.22
    m.add(wood(rng, 260, 0.08, nm=4, bright=0.5, hard=0.5, noise=0.2), t, 1.0)
    m.add(thump(0.2, 130, 60, 0.02, 0.05, 0.001, 1.2), t, 0.6)
    m.add(norm(debris(rng, 0.15, 8, 'dirt', 0, 0.03)), t + 0.004, 0.25)
    return reverb(m.out, 'tiny', 0.1)


@sfx('ui_tick', 'ui_soft', variants=3)
def ui_tick(rng, v):
    pf = [1.0, 1.1, 0.92][v]
    m = Mix(0.05)
    m.add(wood(rng, 2600 * pf, 0.02, nm=3, bright=0.4, hard=0.8, noise=0.3), 0, 1.0)
    m.add(wood(rng, 900 * pf, 0.015, nm=2, bright=0.3, hard=0.6, noise=0.0), 0, 0.3)
    m.add(norm(nhit(rng, 0.01, 3000, 9000, 0.0001, 0.0008)), 0, 0.25)
    return reverb(m.out, 'tiny', 0.05)


# ----------------------------------------------------------------------------
# Battle - general
# ----------------------------------------------------------------------------
@sfx('wave_incoming', 'event', maxdur=2.6)
def wave_incoming(rng, v):
    dur = 2.0
    notes = [(0.0, 45), (0.27, 50), (1.5, 49.3)]          # A2 -> D3 hold, falls off
    amp = [(0, 0.0), (0.07, 0.75), (0.24, 0.68), (0.31, 0.95), (1.1, 1.0), (1.45, 0.85),
           (1.78, 0.0)]
    h = horn(rng, notes, dur, amp, voices=3, detune=10, bright=(280, 2300), tilt=0.55,
             rough=0.24, breath=0.05, scoop=1.3, glide=0.05, vib=0.05, octave_down=0.4,
             bell_peak=(650, 0.8, 6.0))
    y = sat(norm(h) * 1.4, 1.0)
    y = filt(y, ('peak', 1300, 1.0, 1.5), ('highshelf', 4500, 0.7, -6))
    return reverb(y, 'hall', 0.3)


@sfx('wave_early', 'event', maxdur=1.25)
def wave_early(rng, v):
    dur = 1.0
    m = Mix(1.3)
    amp = [(0, 0), (0.04, 0.9), (0.42, 1.0), (0.62, 0.0)]
    h = horn(rng, [(0, 57), (0.07, 62)], dur, amp, voices=3, detune=8, bright=(400, 3500),
             rough=0.18, breath=0.04, scoop=0.9, glide=0.03, vib=0.04, octave_down=0.25,
             bell_peak=(1000, 0.9, 5.0))
    m.add(reverb(sat(norm(h) * 1.5, 1.0), 'yard', 0.25), 0, 0.85)
    for _ in range(8):
        m.add(coin(rng, rng.uniform(2800, 4600), rng.uniform(0.18, 0.32)),
              0.32 + abs(rng.normal(0, 0.12)), db2a(rng.uniform(-12, -3)) * 0.55)
    return m.out


@sfx('coins', 'event', densify=False)
def coins(rng, v):
    m = Mix(0.95)
    for s_i, s in enumerate([0.0, 0.22, 0.45]):
        for _ in range([14, 10, 8][s_i]):
            t = s + abs(rng.normal(0, 0.045))
            m.add(coin(rng, rng.uniform(2400, 5200), rng.uniform(0.12, 0.3)), t,
                  db2a(rng.uniform(-14, 0)) * [1.0, 0.8, 0.6][s_i])
        m.add(norm(nhit(rng, 0.12, 300, 2500, 0.01, 0.04)), s, 0.22)
    return reverb(m.out, 'room', 0.15)


@sfx('coin', 'combat', variants=3, densify=False)
def coin_pickup(rng, v):
    pf = [1.0, 0.94, 1.07][v]
    m = Mix(0.5)
    m.add(coin(rng, 3000 * pf, 0.32), 0, 1.0)
    m.add(coin(rng, 3900 * pf, 0.22), 0.045, 0.45)
    m.add(bell(rng, 2637.0 * pf, 0.35, 'hand', hard=0.8, noise=0.0), 0.0, 0.25)
    return reverb(m.out, 'room', 0.12)


@sfx('life_lost', 'event', maxdur=2.0)
def life_lost(rng, v):
    m = Mix(1.8)
    m.add(norm(tamtam(rng, 1.8, 120, 4000, 110, 1.6, 0.08, 0.35)), 0, 0.75)
    m.add(thump(0.45, 150, 62, 0.035, 0.13, 0.002, 2.2), 0, 0.4)
    m.add(norm(impact(rng, 1.4, 0.35, f0=140)), 0, 0.6)
    m.add(norm(banded_decay(rng, 0.5, [(110, 400, 0.12, 1.0), (400, 1200, 0.06, 0.5)], 0.002)),
          0, 0.35)
    for i, t in enumerate([0.12, 0.27, 0.42]):
        m.add(bell(rng, 1250.0, 0.7, 'alarm', hard=0.9), t, [0.5, 0.45, 0.38][i])
    return reverb(bass_harmonics(m.out, 130, 0.5), 'yard', 0.22)


@sfx('build_tower', 'event', maxdur=1.4)
def build_tower(rng, v):
    m = Mix(1.4)
    for i, t in enumerate([0.0, 0.12, 0.24, 0.34]):
        f = rng.uniform(430, 560)
        m.add(wood(rng, f, 0.07, nm=5, bright=0.55, hard=0.75, noise=0.35), t, 0.85)
        m.add(metal(rng, rng.uniform(2200, 2800), 0.06, nm=4, kind='bar', hard=1.0, noise=0.3),
              t, 0.16)
        m.add(thump(0.08, 220, 110, 0.01, 0.02, 0.001, 1.5), t, 0.15)
    m.add(norm(creak(rng, 0.34, [(0, 45), (0.18, 70), (0.34, 35)],
                     [(0, 0), (0.06, 1), (0.27, 0.8), (0.34, 0)],
                     res=(310, 640, 1100, 1900, 2900), t60=0.04)), 0.45, 0.42)
    t = 0.8
    m.add(thump(0.35, 165, 68, 0.03, 0.09, 0.0015, 2.2), t, 0.4)
    m.add(wood(rng, 210, 0.12, nm=5, bright=0.6, hard=0.65, noise=0.35), t, 1.0)
    m.add(norm(banded_decay(rng, 0.3, [(120, 500, 0.06, 1.0), (500, 2000, 0.03, 0.5)], 0.001)),
          t, 0.45)
    m.add(norm(debris(rng, 0.4, 14, 'wood', 0.02, 0.08, 0.15)), t, 0.25)
    m.add(norm(grit(rng, 0.35, [(0, 0), (0.02, 1), (0.35, 0)], 300, 3000)), t, 0.14)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.15)


@sfx('upgrade_tower', 'event', maxdur=1.6)
def upgrade_tower(rng, v):
    m = Mix(1.4)
    for t in [0.0, 0.14]:
        m.add(metal(rng, rng.uniform(1300, 1600), 0.35, nm=8, kind='bar', hard=1.0, noise=0.4),
              t, 0.5)
        m.add(wood(rng, 480, 0.06, nm=4, bright=0.5, hard=0.7, noise=0.3), t, 0.6)
        m.add(thump(0.1, 170, 85, 0.012, 0.03), t, 0.3)
    for i, mi in enumerate([79, 83, 86, 91, 95]):
        m.add(bell(rng, float(midi(mi)), 0.7, 'chime', hard=0.6), 0.3 + 0.06 * i,
              0.38 + 0.05 * i)
    fr = scale_freqs(79, [0, 4, 7, 11], 2500, 9000)
    m.add(sparkle(rng, 1.0, 18, freqs=fr, dtau=0.3, t0=0.5, amp_db=(-20, -6)), 0, 0.35)
    return reverb(m.out, 'room', 0.2)


@sfx('sell_tower', 'event', maxdur=1.6)
def sell_tower(rng, v):
    m = Mix(1.4)
    for _ in range(10):
        m.add(coin(rng, rng.uniform(2600, 4800), rng.uniform(0.15, 0.3)),
              abs(rng.normal(0, 0.07)), db2a(rng.uniform(-12, 0)) * 0.6)
    m.add(norm(debris(rng, 1.0, 40, 'wood', 0.12, 0.25, 0.4)), 0, 0.5)
    m.add(norm(debris(rng, 1.0, 25, 'stone', 0.15, 0.25, 0.4)), 0, 0.42)
    m.add(norm(rumble(rng, 1.2, [(0, 0), (0.15, 0.6), (0.35, 1.0), (1.2, 0)], 320, 0.8)), 0, 0.45)
    m.add(thump(0.35, 150, 62, 0.03, 0.1, 0.003, 2.0), 0.18, 0.4)
    m.add(wood(rng, 230, 0.1, nm=5, bright=0.55, hard=0.6, noise=0.3), 0.18, 0.5)
    return reverb(bass_harmonics(m.out, 130, 0.4), 'field', 0.18)


@sfx('tower_menu', 'ui')
def tower_menu(rng, v):
    from .dsp import modal, mallet
    m = Mix(0.15)
    k = mallet(modal(N(0.06), [1250, 2080, 3350, 4600], [0.022, 0.014, 0.009, 0.006],
                     [1, 0.6, 0.4, 0.25]), 0.12)
    m.add(norm(k), 0, 0.7)
    m.add(norm(nhit(rng, 0.03, 900, 6000, 0.0002, 0.004)), 0, 0.5)
    m.add(thump(0.05, 260, 160, 0.01, 0.015), 0, 0.3)
    return reverb(m.out, 'tiny', 0.08)


@sfx('rally', 'event')
def rally(rng, v):
    m = Mix(0.7)
    m.add(drum(rng, 140, 0.25, stick=0.7), 0, 0.9)
    amp = [(0, 0), (0.02, 1.0), (0.12, 0.7), (0.2, 0)]
    m.add(norm(horn(rng, [(0, 69)], 0.3, amp, voices=2, bright=(600, 5000), scoop=1.0,
                    rough=0.05, glide=0.02, vib=0.0)), 0.06, 0.55)
    return reverb(m.out, 'field', 0.15)


@sfx('spell_ready', 'ui_reward', maxdur=1.3, densify=False)
def spell_ready(rng, v):
    m = Mix(1.1)
    m.add(bell(rng, float(midi(84)), 0.9, 'hand', hard=0.35, bright=0.9), 0, 1.0)
    m.add(bell(rng, float(midi(91)), 0.6, 'chime', hard=0.4), 0.0, 0.22)
    fr = scale_freqs(84, [0, 7], 2500, 8000)
    m.add(sparkle(rng, 0.6, 8, freqs=fr, dtau=0.2, amp_db=(-22, -10)), 0.02, 0.3)
    return reverb(m.out, 'room', 0.2)


@sfx('victory_cheer', 'event', maxdur=2.8)
def victory_cheer(rng, v):
    dur = 2.3
    n = N(dur)
    t = tvec(n)
    m = Mix(dur)
    tracks = [[(0, 'e'), (0.3, 'a'), (1.4, 'a'), (2.2, 'o')],
              [(0, 'ae'), (0.4, 'a'), (1.6, 'aw'), (2.2, 'o')],
              [(0, 'i'), (0.25, 'e'), (1.2, 'ae'), (2.2, 'uh')]]
    crowd = np.zeros(n)
    for g, tr in enumerate(tracks):
        src = np.zeros(n)
        for _ in range(9):
            f0 = np.exp(rng.uniform(np.log(105), np.log(290)))
            on = rng.uniform(0, 0.28)
            rise = 1 + rng.uniform(0.15, 0.35) * np.clip((t - on) / 0.45, 0, 1)
            fall = 1 - 0.12 * np.clip((t - 1.2) / 1.0, 0, 1)
            f = f0 * rise * fall * (1 + 0.02 * lp_noise(n, rng, 6))
            a = np.clip((t - on) / rng.uniform(0.08, 0.2), 0, 1) * \
                np.clip((rng.uniform(1.5, 2.2) - t) / 0.5, 0, 1)
            a *= np.clip(1 + 0.3 * lp_noise(n, rng, 5), 0, None)
            src += saw(f, ph0=rng.uniform()) * a
        src = lp(src, 1000, 1)
        src = src / (np.std(src) + 1e-9) + 0.6 * bandnoise(n, rng, 300, 7000) * \
            np.clip((t - 0.02) / 0.3, 0, 1)
        crowd += formant_filter(src, tr, 1.0, 1.9, 1024)
    env = env_pts(n, [(0, 0.25), (0.3, 1.0), (1.3, 0.92), (2.25, 0.0)], 'cos')
    m.add(norm(crowd * env), 0, 0.75)
    amp = [(0, 0), (0.02, 0.9), (0.1, 0.55), (0.12, 0.3), (0.14, 0.95), (0.9, 0.85), (1.4, 0)]
    for mi, g in [(60, 0.5), (64, 0.4), (67, 0.45), (72, 0.35)]:
        m.add(norm(horn(rng, [(0, mi)], 1.5, amp, voices=2, bright=(500, 5000), rough=0.05,
                        scoop=0.5, glide=0.01, vib=0.07)), 0.02, g * 0.55)
    return reverb(m.out, 'yard', 0.25)
