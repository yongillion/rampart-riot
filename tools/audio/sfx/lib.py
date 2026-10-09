"""Sound-design building blocks for Rampart Riot SFX.

Each function returns a mono float64 numpy array at an arbitrary level
(usually peak ~1). Recipes in recipes_*.py layer these together.
Synthesis models used here:
  * modal synthesis for wood / metal / glass / coins / bells / membranes
  * banded decaying noise for explosions and impacts
  * time-varying band-pass noise for whooshes and wind
  * stick-slip impulse trains through resonator banks for creaks
  * Minnaert bubble chirps for liquids
  * granular scattering of tiny modal grains for debris, ice, chainmail
  * additive brass with amplitude-dependent brightness
  * source-filter formant synthesis (STFT time-varying formants) for voices
"""
import numpy as np

from .dsp import (SR, TAU, LN1000, N, tvec, db2a, midi, norm, rms, fit, Mix, pink, brown,
                  bandnoise, slow_noise, lp_noise, _bw, env_ad, env_pts, as_curve, phase_of,
                  saw, square, harmonics, filt, lp, hp, peq, onepole, tvf, stft_shape,
                  resonate, modal, mallet, sat, bass_harmonics)
import scipy.fft as sfft


# ----------------------------------------------------------------------------
# Generic transients / impacts
# ----------------------------------------------------------------------------
def click(rng, dur=0.004, lo=1500.0, hi=9000.0, tau=0.0008):
    n = N(max(dur, tau * 9))
    x = filt(rng.standard_normal(n), ('highpass', lo), ('lowpass', hi))
    return norm(x * env_ad(n, 0.00008, tau))


def thump(dur=0.3, f0=120.0, f1=45.0, ptau=0.04, atau=0.12, att=0.0015, drive=0.0):
    """Pitch-dropping sine 'kick' (body weight of impacts)."""
    n = N(max(dur, att + atau * 8))
    t = tvec(n)
    f = f1 + (f0 - f1) * np.exp(-t / ptau)
    y = np.sin(TAU * phase_of(f)) * env_ad(n, att, atau)
    if drive > 0:
        y = sat(y, drive)
    return y


def nhit(rng, dur, lo=None, hi=None, att=0.0008, tau=0.05, order=2, tilt=0.0):
    """Band-limited noise burst with fast attack and exponential decay."""
    n = N(max(dur, att + tau * 8))
    x = bandnoise(n, rng, lo, hi, order, tilt) if (lo or hi) else rng.standard_normal(n)
    return x * env_ad(n, att, tau)


def banded_decay(rng, dur, bands, att=0.0015):
    """Sum of band-limited noises (lo, hi, tau, gain), each with its own decay -
    a cheap, natural 'time-varying low-pass' for explosions and impacts."""
    n = N(dur)
    nfft = sfft.next_fast_len(n, real=True)
    X = sfft.rfft(rng.standard_normal(nfft))
    f = np.maximum(np.fft.rfftfreq(nfft, 1.0 / SR), 1.0)
    y = np.zeros(n)
    for lo, hi, tau, g in bands:
        b = sfft.irfft(X * _bw(f, lo, hi, 2), nfft)[:n]
        b /= (np.std(b) + 1e-12)
        y += g * b * env_ad(n, att, tau)
    return y


def whoosh(rng, dur, fc_pts, amp_pts, q=1.2, order=2, flutter=0.25, flutter_rate=25.0,
           color='pink', amp_mode='cos', tone=0.0, tone_q=14.0):
    """Noise through a swept band-pass (Doppler-like) with a smooth amplitude contour."""
    n = N(dur)
    x = pink(n, rng) if color == 'pink' else rng.standard_normal(n)
    fc = env_pts(n, fc_pts, 'log')
    y = x
    for _ in range(order):
        y = tvf(y, 'bandpass', fc, q)
    y = y / (rms(y) + 1e-12)
    if tone > 0:
        w = tvf(rng.standard_normal(n), 'bandpass', fc * 1.15, tone_q)
        w = tvf(w, 'bandpass', fc * 1.15, tone_q)
        y = y + tone * w / (rms(w) + 1e-12)
    amp = env_pts(n, amp_pts, amp_mode)
    if flutter:
        amp = amp * np.clip(1.0 + flutter * lp_noise(n, rng, flutter_rate), 0.0, None)
    return y * amp


# ----------------------------------------------------------------------------
# Modal materials
# ----------------------------------------------------------------------------
WOOD = [1.0, 2.31, 3.89, 5.6, 7.4, 9.7]
BAR = [1.0, 2.756, 5.404, 8.933, 13.34, 18.64]
PLATE = [1.0, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.600, 3.652, 4.060, 4.154,
         4.637, 4.836, 5.13, 5.4, 5.88, 6.2]
GLASS = [1.0, 2.32, 4.25, 6.63, 9.38]
COIN = [1.0, 1.42, 1.93, 2.36, 2.81, 3.19, 3.68]
MEMBRANE = [1.0, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501]


def wood(rng, f0=600.0, t60=0.07, nm=5, bright=0.55, hard=0.5, noise=0.25, dur=None,
         ratios=WOOD, jit=0.05):
    """Wooden knock: few low-Q inharmonic modes + contact noise."""
    nm = min(nm, len(ratios))
    r = np.array(ratios[:nm]) * (1 + rng.uniform(-jit, jit, nm))
    r[0] = 1.0
    fr = f0 * r
    amps = bright ** np.arange(nm) * rng.uniform(0.6, 1.0, nm)
    t60s = t60 * (f0 / fr) ** 0.7
    n = N(dur or (t60 * 1.4 + 0.012))
    y = norm(mallet(modal(n, fr, t60s, amps), 0.25 + (1 - hard) * 1.8))
    if noise:
        nz = bandnoise(n, rng, f0 * 1.2, 9000) * env_ad(n, 0.0001, 0.0012 + 0.002 * (1 - hard))
        y = y + noise * norm(nz)
    return norm(y)


def metal(rng, f0=900.0, t60=0.5, nm=10, kind='plate', bright=0.85, hard=0.9, beat=1.5,
          tdecay=0.5, noise=0.25, jit=0.03, dur=None, ratios=None):
    """Struck metal: inharmonic modes with beating pairs (plate/bar/random spectra)."""
    if ratios is None:
        if kind == 'bar':
            ratios = BAR
        elif kind == 'plate':
            ratios = PLATE
        elif kind == 'glass':
            ratios = GLASS
        else:
            ratios = [1.0] + sorted(np.exp(rng.uniform(np.log(1.3), np.log(7.0), nm - 1)))
    nm = min(nm, len(ratios))
    r = np.array(ratios[:nm]) * (1 + rng.uniform(-jit, jit, nm))
    r[0] = 1.0
    fr = f0 * r
    amps = bright ** np.arange(nm) * rng.uniform(0.45, 1.0, nm)
    t60s = t60 * (f0 / fr) ** tdecay * rng.uniform(0.7, 1.0, nm)
    freqs, a2, T2 = [], [], []
    for f, a, T in zip(fr, amps, t60s):
        d = beat * rng.uniform(0.3, 1.0)
        freqs += [f - d / 2, f + d / 2]
        a2 += [a * 0.55, a * 0.45]
        T2 += [T, T * rng.uniform(0.75, 1.0)]
    n = N(dur or (t60 * 1.3 + 0.01))
    y = norm(mallet(modal(n, freqs, T2, a2), 0.04 + (1 - hard) * 0.9))
    if noise:
        nz = bandnoise(n, rng, 2000, 14000) * env_ad(n, 0.00005, 0.0006 + 0.0015 * (1 - hard))
        y = y + noise * norm(nz)
    return norm(y)


def coin(rng, f0=None, t60=0.35):
    """Two small metal discs clinking."""
    f0 = f0 or rng.uniform(2700, 4200)
    out = Mix(t60 * 1.3 + 0.02)
    for j, ff in enumerate([f0, f0 * rng.uniform(1.13, 1.38)]):
        r = np.array(COIN) * (1 + rng.uniform(-0.025, 0.025, len(COIN)))
        r[0] = 1.0
        amps = rng.uniform(0.3, 1.0, len(COIN)) * 0.8 ** np.arange(len(COIN))
        T = t60 * rng.uniform(0.6, 1.0, len(COIN)) / r ** 0.4
        n = N(t60 * 1.3)
        out.add(modal(n, ff * r, T, amps), 0.0, 1.0 if j == 0 else rng.uniform(0.5, 0.8))
    y = norm(mallet(out.out, 0.05))
    c = click(rng, 0.003, 3500, 15000, 0.0004)
    y[:len(c)] += 0.35 * c
    return norm(y)


BELLS = {
    # (ratio, amp, t60 factor)
    'church': [(0.5, 0.65, 1.0), (1.0, 0.55, 0.78), (1.2, 0.75, 0.62), (1.5, 0.25, 0.5),
               (2.0, 1.0, 0.45), (2.5, 0.3, 0.32), (2.67, 0.25, 0.28), (3.0, 0.3, 0.25),
               (4.0, 0.14, 0.18), (5.33, 0.08, 0.12), (6.0, 0.05, 0.1)],
    'hand': [(1.0, 1.0, 1.0), (2.0, 0.1, 0.6), (3.0, 0.45, 0.45), (4.1, 0.14, 0.3),
             (5.4, 0.08, 0.2), (6.8, 0.04, 0.15)],
    'glock': [(1.0, 1.0, 1.0), (2.76, 0.28, 0.35), (5.40, 0.1, 0.18), (8.93, 0.04, 0.1)],
    'chime': [(1.0, 1.0, 1.0), (2.0, 0.32, 0.6), (3.0, 0.16, 0.45), (4.2, 0.11, 0.3),
              (5.4, 0.07, 0.22), (6.8, 0.04, 0.15)],
    'crystal': [(1.0, 1.0, 1.0), (2.32, 0.3, 0.5), (4.25, 0.14, 0.3), (6.63, 0.06, 0.2)],
    'alarm': [(1.0, 1.0, 1.0), (1.48, 0.35, 0.7), (2.03, 0.5, 0.6), (2.7, 0.25, 0.4),
              (3.45, 0.15, 0.3), (4.4, 0.1, 0.2)],
    'warm': [(1.0, 1.0, 1.0), (2.0, 0.22, 0.5), (3.0, 0.08, 0.3), (3.98, 0.05, 0.25)],
}


def bell(rng, f0, t60=1.2, kind='chime', hard=0.5, beat=0.8, bright=1.0, dur=None, noise=0.08):
    freqs, amps, t60s = [], [], []
    for r, a, d in BELLS[kind]:
        f = f0 * r
        if f > 17000:
            continue
        amp = a * (bright ** np.log2(r) if r > 1 else 1.0)
        T = t60 * d
        db = beat * rng.uniform(0.3, 1.0)
        freqs += [f - db / 2, f + db / 2]
        amps += [amp * 0.5, amp * 0.5 * rng.uniform(0.6, 1.0)]
        t60s += [T, T * rng.uniform(0.8, 1.0)]
    n = N(dur or t60 * 1.15 + 0.02)
    y = norm(mallet(modal(n, freqs, t60s, amps), 0.05 + (1 - hard) * 1.5))
    if noise:
        c = click(rng, 0.003, min(f0, 6000), 14000, 0.0005)
        y[:len(c)] += noise * c
    return norm(y)


def glass(rng, f0=2500.0, t60=0.6, nm=4, bright=0.6, hard=1.0, noise=0.2):
    return metal(rng, f0, t60, nm, kind='glass', bright=bright, hard=hard, beat=2.0,
                 tdecay=0.6, noise=noise)


def drum(rng, f0=110.0, t60=0.35, dur=None, stick=0.5, bend=0.12, skin=0.35, nm=8):
    """Membrane drum (tom / field drum): circular-membrane modes + stick + skin noise."""
    n = N(dur or t60 * 1.2 + 0.02)
    t = tvec(n)
    bendc = 1 + bend * np.exp(-t / 0.03)
    amps = [1.0, 0.55, 0.42, 0.3, 0.22, 0.18, 0.13, 0.1]
    y = np.zeros(n)
    for i in range(nm):
        f = f0 * MEMBRANE[i] * bendc
        T = t60 / (1 + 0.9 * i)
        y += amps[i] * np.sin(TAU * phase_of(f)) * np.exp(-LN1000 * t / T)
    y = norm(y)
    y += skin * norm(bandnoise(n, rng, 180, 3500) * env_ad(n, 0.0004, 0.035))
    c = click(rng, 0.004, 1800, 9000, 0.0007)
    y[:len(c)] += stick * c
    return norm(y)


def pluck(rng, f0, dur, t60=0.35, pos=0.17, bend=0.08, bend_tau=0.025, kmax=6000.0,
          decay_k=0.35, inharm=0.0004, rolloff=1.0):
    """Plucked string (modal, pitch settles from sharp - tension release)."""
    n = N(dur)
    t = tvec(n)
    f = f0 * (1 + bend * np.exp(-t / bend_tau))
    ph = TAU * phase_of(f)
    y = np.zeros(n)
    K = max(1, int(kmax / f0))
    for k in range(1, K + 1):
        a = abs(np.sin(np.pi * k * pos)) / k ** rolloff
        T = t60 / (1 + decay_k * (k - 1))
        st = np.sqrt(1 + inharm * k * k)
        m = min(n, int(T * 1.4 * SR) + 2)
        y[:m] += a * np.exp(-LN1000 * t[:m] / T) * np.sin(k * st * ph[:m])
    return norm(y)


# ----------------------------------------------------------------------------
# Granular scatter: debris, crackle, jingle
# ----------------------------------------------------------------------------
MATERIALS = {
    'stone': dict(f=(500, 4200), t60=(0.008, 0.035), nm=3, noise=0.8, hard=0.9),
    'rock': dict(f=(250, 2500), t60=(0.01, 0.05), nm=3, noise=0.8, hard=0.8),
    'wood': dict(f=(250, 2000), t60=(0.02, 0.07), nm=3, noise=0.35, hard=0.6),
    'splinter': dict(f=(900, 5000), t60=(0.006, 0.025), nm=2, noise=0.6, hard=0.9),
    'metal': dict(f=(1200, 6500), t60=(0.06, 0.3), nm=4, noise=0.2, hard=0.95),
    'glass': dict(f=(2800, 11000), t60=(0.05, 0.45), nm=3, noise=0.12, hard=1.0),
    'ice': dict(f=(2200, 9000), t60=(0.025, 0.2), nm=3, noise=0.3, hard=1.0),
    'bone': dict(f=(800, 3200), t60=(0.012, 0.045), nm=2, noise=0.35, hard=0.85),
    'dirt': dict(f=(400, 3500), t60=(0.003, 0.01), nm=0, noise=1.0, hard=0.7),
    'snow': dict(f=(900, 6000), t60=(0.002, 0.008), nm=0, noise=1.0, hard=0.6),
    'chain': dict(f=(2500, 8500), t60=(0.02, 0.09), nm=2, noise=0.25, hard=1.0),
}


def grain(rng, mat, scale=1.0):
    p = MATERIALS[mat]
    f = np.exp(rng.uniform(np.log(p['f'][0]), np.log(p['f'][1]))) * scale
    T = np.exp(rng.uniform(np.log(p['t60'][0]), np.log(p['t60'][1])))
    ntau = 0.0006 + T * (0.15 if p['nm'] else 0.4)
    n = N(max(T * 1.4, ntau * 9) + 0.004)
    y = np.zeros(n)
    if p['nm']:
        r = np.array([1.0] + sorted(rng.uniform(1.3, 3.6, p['nm'] - 1)))
        y = norm(modal(n, f * r, T * r ** -0.5, 0.65 ** np.arange(p['nm'])))
    if p['noise']:
        nz = bandnoise(n, rng, f * 0.5, min(f * 3.0, 17000)) * env_ad(n, 0.00008, ntau)
        y = y + p['noise'] * norm(nz)
    return norm(y)


def trunc_exp(rng, tau, limit, count=None):
    """Exponential event times truncated to [0, limit) (no pile-up at the limit)."""
    u = rng.uniform(0, 1, count)
    return -tau * np.log(1.0 - u * (1.0 - np.exp(-max(limit, 1e-4) / tau)))


def debris(rng, dur, count, mat='stone', t0=0.0, tau=0.25, amp_tau=None, scale=1.0,
           times=None, amp_db=(-14.0, 0.0)):
    out = Mix(dur + 0.5)
    if times is None:
        times = t0 + trunc_exp(rng, tau, max(dur - t0, 0.001), count)
    for t in times:
        g = grain(rng, mat, scale)
        a = db2a(rng.uniform(*amp_db))
        if amp_tau:
            a *= np.exp(-(t - t0) / amp_tau)
        out.add(g, t, a)
    return out.out


def bounce_times(t0, gap, ratio=0.62, count=5, jitter=0.1, rng=None):
    ts, t, g = [], t0, gap
    for _ in range(count):
        ts.append(t)
        j = 1 + (rng.uniform(-jitter, jitter) if rng is not None else 0)
        t += g * j
        g *= ratio
    return ts


def crackle(rng, dur, rate, rate_env=None, lo=1200.0, hi=9000.0, pop=0.25, alpha=1.6,
            pop_f=(900, 3200)):
    """Fire / sizzle crackles: Poisson clicks with heavy-tailed amplitudes, some resonant."""
    n = N(dur)
    out = np.zeros(n + N(0.06))
    count = rng.poisson(rate * dur)
    ts = rng.uniform(0, dur, count)
    if rate_env is not None:
        keep = rng.uniform(0, 1, count) < np.interp(ts, tvec(len(rate_env)), rate_env)
        ts = ts[keep]
    for t in ts:
        a = min(1.0, (rng.pareto(alpha) + 1.0) * 0.12)
        L = rng.uniform(0.0002, 0.0015)
        m = N(L * 5 + 0.0005)
        g = rng.standard_normal(m) * env_ad(m, 0.00003, L)
        if rng.random() < pop:
            fp = np.exp(rng.uniform(np.log(pop_f[0]), np.log(pop_f[1])))
            T = rng.uniform(0.004, 0.015)
            m2 = N(T * 1.3)
            ring = modal(m2, [fp, fp * rng.uniform(1.6, 2.4)], [T, T * 0.6], [1, 0.5])
            g = fit(g, m2) + 0.7 * norm(ring) * np.max(np.abs(g))
        i = int(t * SR)
        out[i:i + len(g)] += a * g[:len(out) - i]
    return filt(out, ('highpass', lo), ('lowpass', hi))


def jingle(rng, dur=0.15, count=12, mat='chain', center=0.04, spread=0.035, scale=1.0,
           amp_db=(-16.0, 0.0)):
    """Chainmail / armour / small-coin jingle: clustered metallic grains."""
    ts = np.clip(center + np.abs(rng.normal(0, spread, count)) * rng.choice([-0.4, 1], count),
                 0, dur)
    return debris(rng, dur, count, mat, times=ts, scale=scale, amp_db=amp_db)


# ----------------------------------------------------------------------------
# Liquids
# ----------------------------------------------------------------------------
def bubble(f0, xi=0.12, amp=1.0, dur=None):
    """Minnaert bubble (van den Doel model): damped sine whose pitch rises."""
    d = 0.043 * f0 + 0.0014 * f0 ** 1.5
    n = N(dur or 9.0 / d)
    t = tvec(n)
    f = f0 * (1 + xi * d * t)
    y = np.sin(TAU * phase_of(f)) * np.exp(-d * t) * np.clip(t / 0.0004, 0, 1)
    return amp * y


def bubbles(rng, dur, count, f_lo=300.0, f_hi=2500.0, t0=0.0, tau=None, xi=(0.08, 0.25),
            amp_db=(-14.0, 0.0), amp_tau=None):
    out = Mix(dur + 0.3)
    for _ in range(count):
        t = t0 + (float(trunc_exp(rng, tau, dur - t0)) if tau else rng.uniform(0, dur - t0))
        f = np.exp(rng.uniform(np.log(f_lo), np.log(f_hi)))
        a = db2a(rng.uniform(*amp_db)) * (np.exp(-(t - t0) / amp_tau) if amp_tau else 1.0)
        out.add(bubble(f, rng.uniform(*xi)), t, a * (f / 1000.0) ** -0.3)
    return out.out


def splash(rng, size=1.0, dur=0.9, n_bub=30, n_drop=10, bright=0.5):
    m = Mix(dur)
    n = N(dur)
    m.add(nhit(rng, 0.1, 300, 6000 + 4000 * bright, 0.0008, 0.018 * size), 0, 0.8)
    body = bandnoise(n, rng, 250 / size ** 0.3, 3500 + 2500 * bright) * \
        env_ad(n, 0.006, 0.12 * size) * np.clip(1 + 0.7 * lp_noise(n, rng, 40), 0, None)
    m.add(norm(body), 0, 0.7)
    m.add(norm(bubbles(rng, dur * 0.7, n_bub, 350 / size ** 0.5, 2600 / size ** 0.3, 0.005,
                       0.09 * size)), 0, 0.55)
    if n_drop:
        m.add(norm(bubbles(rng, dur, n_drop, 1400, 4000, 0.15 * size, None, (0.15, 0.4),
                           (-20, -4), amp_tau=0.3 * size)), 0, 0.3)
    return m.out


# ----------------------------------------------------------------------------
# Brass, bells, pads, voices
# ----------------------------------------------------------------------------
def smooth_steps(m, tau):
    if tau <= 0:
        return m
    a = np.exp(-1.0 / (tau * SR))
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], m, zi=[a * m[0]])[0]


def pitch_curve(n, notes, glide=0.03, scoop=0.0, scoop_tau=0.04, vib_rate=5.2,
                vib_depth=0.0, vib_delay=0.25, drift=0.0, rng=None):
    """notes: [(t_start, midi)] -> Hz curve with glides, onset scoops, delayed vibrato."""
    t = tvec(n)
    m = np.full(n, float(notes[0][1]))
    for ts, mi in notes:
        m[t >= ts] = mi
    m = smooth_steps(m, glide)
    for ts, mi in notes:
        if scoop:
            on = t >= ts
            m[on] -= scoop * np.exp(-(t[on] - ts) / scoop_tau)
    if vib_depth:
        m += vib_depth * np.sin(TAU * vib_rate * t) * np.clip((t - vib_delay) / 0.3, 0, 1)
    if drift and rng is not None:
        m += drift * slow_noise(n, rng, 2.5)
    return midi(m)


def brass(rng, f, amp, bright=(450.0, 5000.0), tilt=0.5, order=3.0, kmax=9000.0, rough=0.0,
          breath=0.03, bell_peak=(1100.0, 1.0, 4.0)):
    """Additive brass: spectral cutoff follows loudness (the brass 'bloom')."""
    n = len(f)
    A = np.clip(amp, 0, None)
    An = A / (A.max() + 1e-12)
    fc = bright[0] * (bright[1] / bright[0]) ** (An ** 1.3)
    y = harmonics(f, lambda k, fk: k ** (-tilt) / np.sqrt(1 + (fk / fc) ** (2 * order)),
                  kmax_hz=kmax, rng=rng)
    y = y / (rms(y) + 1e-12) * A
    if rough:
        y *= np.clip(1 + rough * lp_noise(n, rng, 70), 0, None)
    if bell_peak:
        y = peq(y, *bell_peak)
    if breath:
        y += breath * norm(bandnoise(n, rng, 700, 4000)) * A
    return y


def horn(rng, notes, dur, amp_pts, voices=3, detune=7.0, bright=(400.0, 4500.0), tilt=0.5,
         rough=0.15, breath=0.04, scoop=0.8, glide=0.035, vib=0.06, octave_down=0.0,
         bell_peak=(900.0, 0.9, 5.0), spread=0.012):
    """Ensemble of brass voices playing the same line (war horn / fanfare)."""
    n = N(dur)
    amp = env_pts(n, amp_pts, 'cos')
    out = np.zeros(n)
    for v in range(voices):
        off = 0.0 if v == 0 else rng.uniform(0, spread)
        nts = [(t + off, m + rng.normal(0, detune) / 100.0) for t, m in notes]
        f = pitch_curve(n, nts, glide, scoop, 0.045, rng.uniform(4.6, 5.6), vib, 0.35,
                        0.03, rng)
        a = np.concatenate([np.zeros(N(off)), amp])[:n] if off > 0 else amp
        out += brass(rng, f, a, bright, tilt, 3.0, 9000.0, rough, breath, bell_peak)
    if octave_down:
        nts = [(t, m - 12) for t, m in notes]
        f = pitch_curve(n, nts, glide, scoop * 0.5, 0.05, 5.0, 0.0, 0.3, 0.02, rng)
        out += octave_down * brass(rng, f, amp, (bright[0] * 0.7, bright[1] * 0.6), tilt, 3.0,
                                   7000.0, rough, breath * 0.5, bell_peak)
    return out


def scale_freqs(root, intervals, lo, hi):
    """All notes of a scale (root midi + intervals) whose frequencies are in [lo, hi]."""
    out = []
    for octv in range(-3, 6):
        for iv in intervals:
            f = float(midi(root + 12 * octv + iv))
            if lo <= f <= hi:
                out.append(f)
    return sorted(out)


def ping(f, tau, partial2=0.15, n=None):
    n = n or N(tau * 7)
    t = tvec(n)
    y = np.sin(TAU * f * t)
    if partial2 and f * 2.76 < 16000:
        y = y + partial2 * np.sin(TAU * f * 2.76 * t) * np.exp(-t / (tau * 0.3))
    return y * np.exp(-t / tau) * np.clip(t / 0.0006, 0, 1)


def sparkle(rng, dur, count, f_lo=2500.0, f_hi=9000.0, freqs=None, tau=(0.03, 0.2),
            density='decay', dtau=None, amp_db=(-12.0, 0.0), partial2=0.15, t0=0.0,
            amp_curve=None):
    """Random glittering pings (optionally quantised to a scale)."""
    out = Mix(dur + 0.6)
    for _ in range(count):
        if density == 'decay':
            t = t0 + float(trunc_exp(rng, dtau or dur / 3.0, dur - t0))
        elif density == 'rise':
            t = t0 + (dur - t0) * (1.0 - float(trunc_exp(rng, 0.35, 1.0)))
        else:
            t = rng.uniform(t0, dur)
        f = rng.choice(freqs) if freqs is not None else np.exp(rng.uniform(np.log(f_lo), np.log(f_hi)))
        f *= 1 + rng.normal(0, 0.002)
        ta = np.exp(rng.uniform(np.log(tau[0]), np.log(tau[1])))
        a = db2a(rng.uniform(*amp_db))
        if amp_curve is not None:
            a *= amp_curve(t)
        elif density == 'decay':
            a *= np.exp(-(t - t0) / (2.5 * (dtau or dur / 3.0)))
        out.add(ping(f, ta, partial2), t, a)
    return out.out


VOWELS = {  # formants (Hz), bandwidths (Hz), gains (dB) - adult male-ish
    'a': ([730, 1090, 2440, 3400], [90, 110, 160, 220], [0, -5, -18, -24]),
    'o': ([570, 840, 2410, 3400], [80, 100, 160, 220], [0, -6, -22, -28]),
    'u': ([300, 870, 2240, 3300], [60, 90, 150, 220], [0, -12, -28, -34]),
    'e': ([530, 1840, 2480, 3500], [80, 120, 160, 220], [0, -8, -14, -22]),
    'i': ([290, 2250, 3000, 3700], [60, 120, 160, 220], [0, -14, -12, -20]),
    'ae': ([660, 1720, 2410, 3400], [90, 120, 160, 220], [0, -5, -14, -22]),
    'uh': ([640, 1190, 2390, 3400], [90, 110, 160, 220], [0, -6, -18, -26]),
    'aw': ([620, 950, 2500, 3400], [90, 110, 160, 220], [0, -4, -20, -28]),
    'm': ([250, 1100, 2200, 3300], [60, 200, 250, 300], [0, -26, -30, -36]),
    'n': ([280, 1600, 2600, 3400], [60, 200, 250, 300], [0, -24, -28, -34]),
    'er': ([490, 1350, 1690, 3300], [80, 110, 120, 220], [0, -6, -10, -26]),
}


def _vowel_arrays(track, size, bw_mult):
    ts = np.array([p[0] for p in track], dtype=np.float64)
    F = np.array([VOWELS[p[1]][0] if isinstance(p[1], str) else p[1][0] for p in track],
                 dtype=np.float64).T / size
    B = np.array([VOWELS[p[1]][1] if isinstance(p[1], str) else p[1][1] for p in track],
                 dtype=np.float64).T * bw_mult / size ** 0.5
    G = db2a(np.array([VOWELS[p[1]][2] if isinstance(p[1], str) else p[1][2] for p in track],
                      dtype=np.float64).T)
    return ts, F, B, G


def formant_filter(x, track, size=1.0, bw_mult=1.0, nper=1024, floor=0.01):
    """Time-varying formant filter. track: [(t, vowel)] (vowel name or (F,B,G))."""
    ts, F, B, G = _vowel_arrays(track, size, bw_mult)

    def fn(f, t):
        tt = t[0]
        g = np.full((f.shape[0], tt.size), floor)
        for i in range(F.shape[0]):
            Fi = np.interp(tt, ts, F[i])[None, :]
            Bi = np.interp(tt, ts, B[i])[None, :]
            Gi = np.interp(tt, ts, G[i])[None, :]
            g += Gi / np.sqrt(1.0 + ((f - Fi) / (Bi * 0.5)) ** 2)
        return g
    return stft_shape(x, fn, nper)


def voice(rng, f0, amp, track, size=1.0, jitter=0.012, shimmer=0.08, breath=0.08,
          creak=0.0, rough=0.0, rough_rate=30.0, tilt_fc=900.0, bw_mult=1.0, nper=1024):
    """Source-filter voice: jittery glottal saw (+ noise) through moving formants."""
    n = len(f0)
    fj = f0 * (1 + jitter * lp_noise(n, rng, 45))
    s = saw(fj)
    if creak:
        s *= 1 + creak * np.sin(TAU * phase_of(fj) / 2.0)
    s = lp(s, tilt_fc, 1)
    s = s / (rms(s) + 1e-12)
    if rough:
        am = 1 + rough * np.sin(TAU * phase_of(rough_rate * (1 + 0.25 * lp_noise(n, rng, 6))))
        s *= am
    s *= np.clip(1 + shimmer * lp_noise(n, rng, 30), 0, None)
    src = s + breath * bandnoise(n, rng, 400, 9000)
    y = formant_filter(src * amp, track, size, bw_mult, nper)
    return y


def roar(rng, dur, f0_pts, amp_pts, track, size=1.6, growl=0.6, noise_amt=0.9, voiced=0.7,
         rough_rate=34.0, drive=2.5, creak=0.9, jitter=0.05, nper=1024):
    """Monster roar: noisy + voiced source, period doubling, rough AM, low formants, drive."""
    n = N(dur)
    f0 = env_pts(n, f0_pts, 'log')
    amp = env_pts(n, amp_pts, 'cos')
    fj = f0 * (1 + jitter * lp_noise(n, rng, 60))
    v = saw(fj) * (1 + creak * np.sin(TAU * phase_of(fj) / 2.0))
    v = lp(v, 700, 1)
    v /= rms(v) + 1e-12
    nz = pink(n, rng, 60)
    am = 1 + growl * np.sin(TAU * phase_of(rough_rate * (1 + 0.3 * lp_noise(n, rng, 4))))
    am *= np.clip(1 + 0.35 * lp_noise(n, rng, 18), 0.1, None)
    src = (voiced * v + noise_amt * nz) * am * amp
    y = formant_filter(src, track, size, 1.3, nper)
    y = sat(norm(y) * drive, 1.0)
    return y * np.clip(amp / (amp.max() + 1e-12) * 1.4, 0, 1)


def choir(rng, dur, notes, track='a', att=0.3, rel=0.5, vpn=3, detune=9.0, vib=0.18,
          breath=0.12, size=1.0, tilt=1100.0, amp_pts=None, nper=2048):
    """Choir-like pad: detuned vibrato saws through vowel formants.
    track: vowel name or [(t, vowel), ...]."""
    n = N(dur)
    t = tvec(n)
    src = np.zeros(n)
    for m_ in notes:
        for v in range(vpn):
            cents = rng.normal(0, detune)
            rate = rng.uniform(4.6, 5.8)
            vibc = vib * np.sin(TAU * rate * t + rng.uniform(0, TAU)) * np.clip((t - 0.15) / 0.4, 0, 1)
            f = midi(m_ + cents / 100.0 + vibc + 0.04 * slow_noise(n, rng, 2.0))
            src += saw(f, ph0=rng.uniform())
    src = lp(src, tilt, 1)
    src = src / (rms(src) + 1e-12) + breath * bandnoise(n, rng, 500, 9000)
    if amp_pts is None:
        env = np.clip(t / att, 0, 1) ** 1.5 * np.clip((dur - t) / rel, 0, 1)
    else:
        env = env_pts(n, amp_pts, 'cos')
    tr = [(0.0, track), (dur, track)] if isinstance(track, str) else list(track)
    return formant_filter(src * env, tr, size, 1.6, nper)


def fm_tone(n, fc, ratio, index, ph0=0.0):
    """Simple 2-op FM: fc and index can be curves."""
    fc = as_curve(fc, n)
    index = as_curve(index, n)
    mod = index * np.sin(TAU * phase_of(fc * ratio))
    return np.sin(TAU * phase_of(fc, ph0) + mod)


def zap(rng, dur, f0, f1, tau, ratio=2.01, idx0=4.0, idx1=0.4, idx_tau=0.08, att=0.0015,
        decay=0.15):
    n = N(dur)
    t = tvec(n)
    fc = f1 + (f0 - f1) * np.exp(-t / tau)
    index = idx1 + (idx0 - idx1) * np.exp(-t / idx_tau)
    return fm_tone(n, fc, ratio, index) * env_ad(n, att, decay)


def shimmer(rng, dur, f_center, count=6, spread=0.35, flicker=18.0, att=0.01, decay=0.3,
            partial=0.1):
    """Cluster of detuned high partials with random flicker (magic 'glitter' tone)."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros(n)
    for _ in range(count):
        f = f_center * 2 ** rng.uniform(-spread, spread)
        fl = np.clip(1 + 0.8 * lp_noise(n, rng, flicker), 0, None)
        y += np.sin(TAU * f * t + rng.uniform(0, TAU)) * fl
    y *= env_ad(n, att, decay)
    return norm(y)


# ----------------------------------------------------------------------------
# Textures: wind, fire, electricity, creaks, dirt, cloth, paper
# ----------------------------------------------------------------------------
def wind(rng, dur, fc=600.0, depth=1.0, gust_rate=0.5, q=0.9, whistle=0.0,
         whistle_f=(650.0, 1400.0), whistle_q=28.0, floor=0.3, gust=None):
    n = N(dur)
    g = slow_noise(n, rng, gust_rate) if gust is None else gust
    g01 = 1.0 / (1.0 + np.exp(-1.6 * g))
    fcc = fc * 2.0 ** (depth * (g01 - 0.5))
    y = tvf(pink(n, rng), 'bandpass', fcc, q)
    y = tvf(y, 'bandpass', fcc, q * 1.2)
    y = y / (rms(y) + 1e-12) * (floor + (1 - floor) * g01)
    if whistle:
        wf = whistle_f[0] * (whistle_f[1] / whistle_f[0]) ** g01
        w = tvf(rng.standard_normal(n), 'bandpass', wf, whistle_q)
        w = tvf(w, 'bandpass', wf, whistle_q)
        y += whistle * w / (rms(w) + 1e-12) * g01 ** 2
    return y


def fire(rng, dur, amp_pts, lo=120.0, hi=2200.0, turb=0.7, crackle_rate=35.0, hiss=0.12,
         crackle_amt=0.35):
    n = N(dur)
    x = filt(pink(n, rng), ('highpass', lo), ('lowpass', hi), ('lowpass', hi))
    x /= rms(x) + 1e-12
    turbc = np.clip(1 + turb * lp_noise(n, rng, 11), 0.05, None)
    amp = env_pts(n, amp_pts, 'cos')
    y = x * turbc * amp
    if crackle_rate:
        c = crackle(rng, dur, crackle_rate)
        y += crackle_amt * norm(fit(c, n)) * np.max(np.abs(y)) * amp / (amp.max() + 1e-12)
    if hiss:
        h = bandnoise(n, rng, 3000, 12000) * np.clip(1 + 0.6 * lp_noise(n, rng, 20), 0, None)
        y += hiss * h * amp
    return y


def buzz(rng, dur, f0=120.0, jitter=0.12, gate=True, on_prob=0.7, seg=(0.006, 0.035),
         drive=3.0):
    """Electric arc buzz: jittery saw+square, randomly gated."""
    n = N(dur)
    f = f0 * (1 + jitter * lp_noise(n, rng, 250))
    y = saw(f) + 0.6 * square(f * 2.003)
    if gate:
        g = np.zeros(n)
        i = 0
        while i < n:
            L = N(rng.uniform(*seg))
            if rng.random() < on_prob:
                g[i:i + L] = rng.uniform(0.4, 1.0)
            i += L
        g = onepole(g, 600.0)
        y *= g
    return sat(y * 0.6, drive)


def creak(rng, dur, rate_pts, amp_pts, res=(380.0, 760.0, 1250.0, 2100.0, 3300.0), t60=0.035,
          jitter=0.2, hp_f=150.0, res_gains=None):
    """Stick-slip friction: jittered impulse train exciting wooden resonances."""
    n = N(dur)
    rate = env_pts(n, rate_pts, 'log') * np.clip(1 + jitter * lp_noise(n, rng, 35), 0.2, None)
    ph = np.cumsum(rate) / SR
    idx = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    imp = np.zeros(n)
    imp[idx] = rng.uniform(0.4, 1.0, len(idx)) * rng.choice([-1.0, 1.0], len(idx))
    imp = mallet(imp, 0.15)
    fr = np.array(res) * (1 + rng.uniform(-0.05, 0.05, len(res)))
    gains = np.ones(len(res)) if res_gains is None else np.array(res_gains)
    y = resonate(imp, fr, t60, gains) + 0.15 * imp
    y = hp(y, hp_f, 2)
    return y * env_pts(n, amp_pts, 'cos')


def grit(rng, dur, amp_pts, lo=400.0, hi=4000.0, rate=900.0):
    """Granular 'shhh' of dirt/sand/snow: dense tiny noise grains."""
    n = N(dur)
    x = bandnoise(n, rng, lo, hi)
    # dense random gating gives a grainy texture
    g = (rng.random(n) < rate / SR).astype(float)
    g = onepole(g, 250.0) * 60.0
    g = np.clip(g + 0.25, 0, 3.0)
    return x * g * env_pts(n, amp_pts, 'cos')


def flap(rng, dur, rate=14.0, lo=250.0, hi=3200.0, amp_pts=None, sharp=4.0):
    """Cloth flutter: noise bursts at an irregular flapping rate."""
    n = N(dur)
    x = bandnoise(n, rng, lo, hi)
    ph = phase_of(rate * np.clip(1 + 0.35 * lp_noise(n, rng, 5), 0.3, None))
    pulses = (0.5 + 0.5 * np.cos(TAU * ph)) ** sharp
    pulses *= np.clip(1 + 0.4 * lp_noise(n, rng, 8), 0.2, None)
    env = env_pts(n, amp_pts, 'cos') if amp_pts else 1.0
    return x * pulses * env


def paper(rng, dur, amp_pts, lo=1500.0, hi=9000.0, crinkle=0.5, crinkle_rate=260.0):
    n = N(dur)
    env = env_pts(n, amp_pts, 'cos')
    sw = bandnoise(n, rng, lo, hi) * env
    y = sw / (np.max(np.abs(sw)) + 1e-12)
    if crinkle:
        c = fit(crackle(rng, dur, crinkle_rate, None, 1800, 9000, pop=0.1), n)
        y += crinkle * norm(c) * env
    return y


def rumble(rng, dur, amp_pts, fc=180.0, mid=0.25):
    """Low rumble (brown noise) with a little low-mid 'murk' for small speakers."""
    n = N(dur)
    r = lp(brown(n, rng), fc, 2)
    r /= rms(r) + 1e-12
    if mid:
        m_ = bandnoise(n, rng, 150, 600)
        r += mid * m_ * np.clip(1 + 0.6 * lp_noise(n, rng, 6), 0, None)
    return r * env_pts(n, amp_pts, 'cos')


def tamtam(rng, dur, f_lo=70.0, f_hi=7000.0, nm=140, t60=4.0, bloom=0.25, tilt=0.35):
    """Tam-tam / gong: dense inharmonic modes whose upper partials bloom after the hit."""
    n = N(dur)
    t = tvec(n)
    freqs = np.sort(np.exp(rng.uniform(np.log(f_lo), np.log(f_hi), nm)))
    y = np.zeros(n)
    for f in freqs:
        T = float(np.clip(t60 * (f_lo * 2.0 / f) ** 0.32, 0.25, t60))
        rise = bloom * (f / 1000.0) ** 0.6
        a = rng.uniform(0.3, 1.0) * (f / 300.0) ** -tilt
        m = min(n, int(T * 1.3 * SR) + 2)
        tt = t[:m]
        env = (1.0 - np.exp(-tt / max(rise, 0.002))) * np.exp(-LN1000 * tt / T)
        y[:m] += a * env * np.sin(TAU * f * tt + rng.uniform(0, TAU))
    return norm(y)


def riser(rng, dur, f_lo=250.0, f_hi=6000.0, tones=(45, 52, 57), tone_amt=0.5, octaves=1.0,
          trem=(4.0, 16.0), trem_depth=0.35, curve=2.0, start_db=-28.0):
    n = N(dur)
    t = tvec(n)
    u = t / dur
    fc = f_lo * (f_hi / f_lo) ** (u ** 1.4)
    nz = tvf(pink(n, rng), 'bandpass', fc, 1.4)
    nz = tvf(nz, 'bandpass', fc, 1.4)
    nz /= rms(nz) + 1e-12
    y = nz
    if tone_amt:
        tn = np.zeros(n)
        for m_ in tones:
            for d in (-0.08, 0.08):
                f = midi(m_ + d + 12 * octaves * u ** 1.3)
                tn += saw(f, ph0=rng.uniform())
        tn = tvf(tn, 'lowpass', 400 + 5000 * u ** 1.5, 0.9)
        y = y + tone_amt * tn / (rms(tn) + 1e-12)
    rate = trem[0] + (trem[1] - trem[0]) * u ** 1.5
    y *= 1 - trem_depth * (0.5 + 0.5 * np.sin(TAU * phase_of(rate)))
    amp = db2a(start_db * (1 - u ** (1.0 / curve)))
    return y * amp


def shatter(rng, size=1.0, mat='glass', count=40, dur=1.0, bright=1.0):
    m = Mix(dur)
    m.add(click(rng, 0.006, 1500, 14000, 0.0009), 0, 1.0)
    m.add(nhit(rng, 0.25, 1500, 11000 * bright, 0.0004, 0.035 * size), 0, 0.7)
    m.add(debris(rng, dur * 0.8, count, mat, 0.0, 0.12 * size, 0.3 * size), 0, 0.85)
    for _ in range(max(2, count // 10)):
        t0 = rng.uniform(0.08, 0.35) * size
        ts = bounce_times(t0, rng.uniform(0.06, 0.12), 0.6, rng.integers(2, 5), 0.15, rng)
        m.add(debris(rng, dur, len(ts), mat, times=[t for t in ts if t < dur - 0.05],
                     amp_db=(-14, -6)), 0, 0.6)
    return m.out


def explosion(rng, size=1.0, bright=0.5, debris_n=30, dur=None, sub=1.0, crack=0.6,
              mat='stone', rumble_amt=0.5, drive=2.2, body_tau=0.13):
    dur = dur or 0.8 * size + 0.5
    n = N(dur)
    m = Mix(dur)
    m.add(click(rng, 0.008, 700, 13000, 0.0012 * size), 0, crack)
    body = banded_decay(rng, dur, [
        (30, 160, body_tau * 1.8 * size, 0.65),
        (160, 500, body_tau * 1.35 * size, 1.0),
        (500, 1500, body_tau * size, 0.7 * (0.5 + bright)),
        (1500, 4500, body_tau * 0.55 * size, 0.5 * (0.3 + bright)),
        (4500, 13000, body_tau * 0.3 * size, 0.3 * bright)], att=0.0012)
    body = sat(body / (np.max(np.abs(body)) + 1e-12) * drive, 1.0)
    m.add(norm(body), 0, 1.0)
    m.add(thump(0.7 * size, 125, 40, 0.045 * size, 0.18 * size, 0.0015, 1.8), 0, 0.6 * sub)
    if rumble_amt:
        m.add(norm(rumble(rng, dur, [(0, 0), (0.06, 1), (dur, 0)], 220, 0.3) *
                   env_ad(n, 0.03, 0.4 * size)), 0, rumble_amt)
    if debris_n:
        m.add(norm(debris(rng, dur * 0.9, debris_n, mat, 0.05, 0.22 * size, 0.35 * size)), 0,
              0.4)
    return bass_harmonics(m.out, 130.0, 0.45)


def footstep(rng, weight=1.0, surface='dirt', armor=0.0, toe_gap=None):
    m = Mix(0.45)
    toe_gap = toe_gap or rng.uniform(0.045, 0.07)
    for i, (t, g) in enumerate([(0.0, 1.0), (toe_gap, 0.55)]):
        heel = thump(0.1, 190 * rng.uniform(0.9, 1.1), 95, 0.012, 0.022, 0.001, 1.6) * weight
        nz = nhit(rng, 0.09, 90, 1800, 0.001, 0.018)
        if surface == 'dirt':
            gr = debris(rng, 0.09, 10, 'dirt', 0.0, 0.015)
        elif surface == 'stone':
            gr = debris(rng, 0.06, 3, 'stone', 0.0, 0.006)
        else:
            gr = debris(rng, 0.12, 18, 'snow', 0.0, 0.03)
        m.add(norm(heel), t, 0.45 * g * (1.0 if i == 0 else 0.5))
        m.add(norm(nz), t, 0.6 * g)
        m.add(norm(gr), t, 0.45 * g)
    if armor:
        m.add(norm(jingle(rng, 0.18, 14, 'chain', 0.03, 0.03)), 0.004, armor)
    return m.out


def impact(rng, size=1.0, bright=0.5, dur=None, f0=110.0, sub=0.55):
    """Generic blunt impact: thump + noise body + transient."""
    dur = dur or 0.35 * size + 0.1
    m = Mix(dur)
    m.add(thump(dur, f0 * 1.6, f0 * 0.62, 0.02 * size, 0.06 * size, 0.001, 2.0), 0, sub)
    m.add(norm(banded_decay(rng, dur, [(100, 400, 0.05 * size, 1.0),
                                       (400, 1600, 0.035 * size, 0.7),
                                       (1600, 6000, 0.015 * size, 0.4 * bright)], 0.0006)),
          0, 0.8)
    m.add(click(rng, 0.004, 1000, 9000, 0.0006), 0, 0.3 + 0.4 * bright)
    return m.out


# ----------------------------------------------------------------------------
# Extra composite helpers
# ----------------------------------------------------------------------------
def shing(rng, dur=0.4, ring=0.6, f_lo=2200.0, f_hi=7000.0):
    """Blade sliding out of a scabbard: friction noise through blade resonances + end ring."""
    n = N(dur)
    exc = bandnoise(n, rng, 1200, 13000) * np.clip(1 + 0.9 * lp_noise(n, rng, 350), 0, None)
    env = env_pts(n, [(0, 0.35), (0.04, 1.0), (dur * 0.75, 0.9), (dur, 0.0)], 'cos')
    exc *= env
    fr = np.array([1830.0, 2690.0, 3950.0, 5230.0, 6810.0, 8150.0, 9720.0]) * \
        (1 + rng.uniform(-0.03, 0.03, 7))
    body = resonate(exc, fr, 0.3, gains=[1.0, 0.8, 0.7, 0.55, 0.45, 0.35, 0.25])
    sweep = tvf(exc, 'bandpass', env_pts(n, [(0, f_lo), (dur, f_hi)], 'log'), 5.0)
    m = Mix(dur + 1.0)
    m.add(norm(body), 0, 0.7)
    m.add(norm(sweep), 0, 0.55)
    if ring:
        m.add(metal(rng, 2210.0, 0.9, nm=6, kind='bar', bright=0.8, hard=1.0, beat=2.5,
                    noise=0.1), dur * 0.8, ring)
    return m.out


def croak(rng, dur=0.3, f0=180.0, pulse=28.0, res=(450.0, 1250.0, 2300.0), size=1.0):
    """Frog croak: buzzy pulse train gated at a rattle rate through throat resonances."""
    n = N(dur)
    t = tvec(n)
    f = f0 * (1 + 0.06 * (1 - t / dur)) * (1 + 0.01 * lp_noise(n, rng, 20))
    s = saw(f) + 0.5 * square(f * 0.5)
    am = (0.5 + 0.5 * np.sin(TAU * phase_of(pulse * (1 + 0.1 * lp_noise(n, rng, 4))) -
                             np.pi / 2)) ** 3
    env = env_pts(n, [(0, 0), (0.012, 1), (dur * 0.7, 0.85), (dur, 0)], 'cos')
    x = s * am * env
    y = resonate(x, [r / size for r in res], [0.025, 0.018, 0.012], [1.0, 0.75, 0.35])
    return norm(y + 0.08 * x)


def stone_crack(rng, size=1.0):
    """Sharp fracture snap of stone: click + gritty burst + a few stony grains."""
    m = Mix(0.3)
    m.add(click(rng, 0.006, 400, 12000, 0.0009 * size), 0, 1.0)
    m.add(norm(nhit(rng, 0.08, 700, 7000, 0.0002, 0.008 * size)), 0, 0.7)
    m.add(norm(debris(rng, 0.12, int(4 + 4 * size), 'stone', 0, 0.02 * size)), 0.002, 0.45)
    m.add(thump(0.06, 300, 160, 0.008, 0.015, 0.0005, 1.5), 0, 0.3 * size)
    return m.out


def flanger(x, d_curve, mix=1.0):
    """Time-varying comb (delay in seconds per sample) for warps / phasing."""
    n = len(x)
    idx = np.arange(n) - d_curve * SR
    return x + mix * np.interp(idx, np.arange(n), x, left=0.0)


def heart_beat(rng, strength=1.0, f=62.0):
    """One muffled heart sound: low thump + soft body knock (phone-audible harmonics)."""
    m = Mix(0.35)
    m.add(thump(0.3, f * 1.5, f, 0.025, 0.07, 0.004, 2.6), 0, 0.8)
    m.add(norm(lp(nhit(rng, 0.25, 60, 700, 0.005, 0.05), 450, 2)), 0, 0.6)
    m.add(thump(0.15, f * 3.0, f * 2.0, 0.02, 0.04, 0.003, 2.2), 0.002, 0.65)
    return m.out * strength
