"""Stereo ambience loops.

Each recipe renders `total` seconds (pre-roll + 30 s loop + 2 s overlap) in one
continuous pass; the build drops the pre-roll, so filters/reverbs are already
settled at t=0. The runtime starts a copy every 30 s and equal-power crossfades
the 2 s overlap, so everything in [30, 32] must be uncorrelated with [0, 2]:
beds are independent noise whose slow envelopes (gusts, swells) are periodic with
the loop length (they line up across the seam), and discrete events (birds,
frogs, clanks...) are scheduled over the whole timeline - inside the overlap
they are simply faded, never cut, so the event density stays even.

Levels: every bed layer is normalised to unit RMS and placed at an explicit dB
level relative to the scene's main bed; event levels are peak dB re that bed.
"""
import numpy as np

from .dsp import (SR, TAU, N, tvec, db2a, norm, bandnoise, shaped, _bw, lp_noise, slow_noise,
                  env_pts, lp, bp, stft_shape, reverb_st, saw, phase_of, onepole, end_fade)
from .lib import metal, bubble, croak, creak, crackle, debris, drum, horn, formant_filter
from .registry import amb

EV_LO, EV_HI = -1.0, 32.0      # event window on the output timeline (incl. overlap)
LOOP = 30.0


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
class Stereo:
    def __init__(self, total):
        self.n = N(total)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, x, t, pan=0.0, g=1.0, itd=0.0004):
        """Constant-power pan with a small inter-channel delay on the far side."""
        th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        gl, gr = np.cos(th) * g, np.sin(th) * g
        d = int(abs(pan) * itd * SR)
        i = int(t * SR)
        x = end_fade(np.asarray(x, dtype=np.float64))
        for buf, gg, dd in ((self.L, gl, d if pan > 0 else 0), (self.R, gr, d if pan < 0 else 0)):
            a = i + dd
            if a >= self.n:
                continue
            m = min(len(x), self.n - a)
            buf[a:a + m] += gg * x[:m]

    def bed(self, l, r, db=0.0):
        """Add a stereo bed normalised to unit (joint) RMS at `db`."""
        s = np.sqrt(0.5 * (np.mean(l ** 2) + np.mean(r ** 2))) + 1e-12
        self.L += db2a(db) * l[:self.n] / s
        self.R += db2a(db) * r[:self.n] / s


def pk(x, db):
    """Scale an event so its peak sits at `db` relative to unit bed RMS."""
    return norm(x) * db2a(db)


def event_times(rng, rate, lo, hi, min_gap=0.0):
    ts, t = [], lo + rng.exponential(1.0 / rate)
    while t < hi:
        ts.append(t)
        t += max(min_gap, rng.exponential(1.0 / rate))
    return ts


def st_noise(rng, n, mag_fn, corr=0.3):
    """Two partially correlated, spectrally shaped noises (stereo width)."""
    a, b, c = (shaped(n, rng, mag_fn) for _ in range(3))
    return np.sqrt(1 - corr) * a + np.sqrt(corr) * c, np.sqrt(1 - corr) * b + np.sqrt(corr) * c


def pslow(n, rng, rate, pre):
    """Smooth random curve (unit-variance knots, cosine interpolated) that is periodic
    with the loop length on the output timeline: bed envelopes then match across the
    loop seam while the noise underneath stays uncorrelated."""
    m = max(2, int(round(LOOP * rate)))
    pts = rng.standard_normal(m)
    x = ((np.arange(n) / SR - pre) % LOOP) / LOOP * m
    i = np.floor(x).astype(np.int64) % m
    fr = x - np.floor(x)
    w = 0.5 - 0.5 * np.cos(np.pi * fr)
    return pts[i] * (1 - w) + pts[(i + 1) % m] * w


def gust_curve(rng, n, rate, pre, common=0.75):
    c = pslow(n, rng, rate, pre)
    return [common * c + (1 - common) * pslow(n, rng, rate * 1.7, pre) for _ in range(2)]


def sig(g):
    return 1.0 / (1.0 + np.exp(-1.6 * g))


def wind_layer(rng, n, fc, bw_oct, gusts, depth_oct=0.8, floor=0.35, color=-0.5):
    """Stereo wind: noise through a log-Gaussian band whose centre and level follow gusts."""
    out = []
    tt = tvec(n)
    for g in gusts:
        g01 = sig(g)
        x = shaped(n, rng, lambda f: f ** color * _bw(f, 20, None, 2))

        def fn(f, t, g01=g01):
            gg = np.interp(t[0], tt, g01)[None, :]
            fcc = fc * 2.0 ** (depth_oct * (gg - 0.5))
            band = np.exp(-0.5 * (np.log2(np.maximum(f, 1.0) / fcc) / bw_oct) ** 2)
            return band * (floor + (1 - floor) * gg)
        out.append(stft_shape(x, fn, 2048))
    return out


def whistle_layer(rng, n, f_lo, f_hi, gusts, q_oct=0.05, thresh=0.55):
    """Howling resonance that only sings during strong gusts."""
    out = []
    tt = tvec(n)
    for g in gusts:
        g01 = sig(g)
        x = rng.standard_normal(n)

        def fn(f, t, g01=g01):
            gg = np.interp(t[0], tt, g01)[None, :]
            fcc = f_lo * (f_hi / f_lo) ** gg
            band = np.exp(-0.5 * (np.log2(np.maximum(f, 1.0) / fcc) / q_oct) ** 2)
            return band * np.clip((gg - thresh) / (1 - thresh), 0, 1) ** 1.5
        out.append(stft_shape(x, fn, 4096))
    return out


def tone(f, amp=None, h2=0.0):
    y = np.sin(TAU * phase_of(f))
    if h2:
        y = y + h2 * np.sin(2 * TAU * phase_of(f))
    return y if amp is None else y * amp


# ----------------------------------------------------------------------------
# Creature callers
# ----------------------------------------------------------------------------
def bird_call(rng, kind):
    buf = np.zeros(N(1.6))

    def note(L, f_pts, h2=0.08, fm=(0.0, 0.0)):
        n = N(L)
        t = tvec(n)
        f = env_pts(n, f_pts, 'log')
        if fm[0]:
            f = f * (1 + fm[1] * np.sin(TAU * fm[0] * t))
        a = env_pts(n, [(0, 0), (L * 0.15, 1), (L * 0.7, 0.8), (L, 0)], 'cos')
        return tone(f, a, h2)

    def put(x, t):
        i = int(t * SR)
        m = min(len(x), len(buf) - i)
        if m > 0:
            buf[i:i + m] += x[:m]

    if kind == 'chirp':
        base = rng.uniform(3000, 4500)
        t = 0.0
        for _ in range(rng.integers(2, 6)):
            L = rng.uniform(0.04, 0.08)
            put(note(L, [(0, base), (L, base * rng.uniform(1.25, 1.5))], fm=(35, 0.03)), t)
            t += rng.uniform(0.09, 0.14)
    elif kind == 'whistle':
        f1 = rng.uniform(2400, 3400)
        f2 = f1 * rng.uniform(0.72, 0.9)
        L1, L2 = rng.uniform(0.16, 0.28), rng.uniform(0.2, 0.34)
        put(note(L1, [(0, f1 * 0.97), (L1, f1 * 1.03)], h2=0.05), 0)
        put(note(L2, [(0, f2 * 1.04), (L2, f2 * 0.95)], h2=0.05), L1 + rng.uniform(0.05, 0.12))
    elif kind == 'trill':
        L = rng.uniform(0.6, 1.0)
        n = N(L)
        t = tvec(n)
        f = env_pts(n, [(0, rng.uniform(4200, 5200)), (L, rng.uniform(3500, 4200))], 'log')
        am = (0.5 + 0.5 * np.sin(TAU * rng.uniform(18, 26) * t)) ** 2
        a = env_pts(n, [(0, 0), (0.05, 1), (L * 0.8, 0.8), (L, 0)], 'cos')
        put(tone(f, a * am, 0.06), 0)
    else:   # warble: short melodic run with glides
        k = int(rng.integers(5, 9))
        fs = np.exp(rng.uniform(np.log(2500), np.log(5000), k + 1))
        t = 0.0
        for i in range(k):
            L = rng.uniform(0.05, 0.11)
            put(note(L, [(0, fs[i]), (L, fs[i + 1])], h2=0.1), t)
            t += L + rng.uniform(0.0, 0.04)
    nz = np.nonzero(np.abs(buf) > 1e-6)[0]
    return buf[:nz[-1] + 1] if len(nz) else buf[:10]


def babble_voice(rng, n, f0_mean):
    """One distant 'speaker': intonated glottal source, syllabic gating, random vowels."""
    f0 = f0_mean * 2 ** (0.25 * slow_noise(n, rng, 1.5))
    s = lp(saw(f0), 900, 1)
    rate = rng.uniform(3.5, 5.5)
    syl = (0.5 + 0.5 * np.sin(TAU * phase_of(rate * (1 + 0.3 * lp_noise(n, rng, 2))))) ** 2
    talk = onepole((slow_noise(n, rng, 0.35) > -0.2).astype(float), 3.0)   # phrases/pauses
    src = (s / (np.std(s) + 1e-9) + 0.3 * rng.standard_normal(n)) * syl * talk
    names = ['a', 'e', 'i', 'o', 'u', 'uh', 'ae', 'aw']
    track, tt = [], 0.0
    while tt < n / SR + 0.5:
        track.append((tt, names[rng.integers(len(names))]))
        tt += rng.uniform(0.12, 0.3)
    y = formant_filter(src, track, 1.0, 1.6, 1024)
    return y / (np.std(y) + 1e-12)


# ----------------------------------------------------------------------------
# Ambiences
# ----------------------------------------------------------------------------
@amb('amb_meadow', lufs=-27.0)
def amb_meadow(rng, total, pre):
    n = N(total)
    S = Stereo(total)
    gusts = gust_curve(rng, n, 0.13, pre)
    wl, wr = wind_layer(rng, n, 650, 0.9, gusts, 0.9, 0.35)
    S.bed(wl, wr, 0.0)
    # rustling grass: bright noise with fine granular AM, swelling with the gusts
    rus = []
    for g in gusts:
        x = bandnoise(n, rng, 2200, 10000) * np.clip(1 + 1.2 * lp_noise(n, rng, 35), 0, None) ** 1.5
        rus.append(x * (0.15 + 0.85 * sig(g) ** 2))
    S.bed(rus[0], rus[1], -9.0)
    ev = Stereo(total)
    for t in event_times(rng, 0.42, pre + EV_LO, pre + EV_HI, 0.6):
        kind = rng.choice(['chirp', 'whistle', 'trill', 'warble'], p=[0.35, 0.25, 0.15, 0.25])
        call = lp(bird_call(rng, kind), rng.uniform(6000, 9000), 1)
        ev.add(pk(call, rng.uniform(-2.0, 6.0)), t, rng.uniform(-0.85, 0.85))
    el, er = reverb_st(ev.L, ev.R, 'field', 0.35, wet_hp=300)
    S.L += el
    S.R += er
    return S.L, S.R


@amb('amb_snow', lufs=-26.0)
def amb_snow(rng, total, pre):
    n = N(total)
    S = Stereo(total)
    gusts = gust_curve(rng, n, 0.17, pre, 0.7)
    wl, wr = wind_layer(rng, n, 420, 1.1, gusts, 1.2, 0.3, color=-0.7)
    S.bed(wl, wr, 0.0)
    hl, hr = whistle_layer(rng, n, 520, 1150, gusts, 0.05, 0.5)
    S.bed(hl, hr, -5.0)
    sl, sr = st_noise(rng, n, lambda f: _bw(f, 3500, 12000, 2), 0.2)
    S.bed(sl * sig(gusts[0]) ** 2, sr * sig(gusts[1]) ** 2, -15.0)
    ev = Stereo(total)
    for t in event_times(rng, 0.13, pre + EV_LO, pre + EV_HI, 3.0):
        L = rng.uniform(0.4, 0.9)
        c = creak(rng, L, [(0, rng.uniform(25, 45)), (L, rng.uniform(60, 110))],
                  [(0, 0), (L * 0.3, 1), (L, 0)], res=(900, 1500, 2300, 3400, 4800), t60=0.025,
                  hp_f=500)
        ev.add(pk(c, rng.uniform(-2.0, 3.0)), t, rng.uniform(-0.7, 0.7))
    el, er = reverb_st(ev.L, ev.R, 'distant', 0.5, wet_hp=400)
    S.L += el
    S.R += er
    return S.L, S.R


@amb('amb_swamp', lufs=-27.0)
def amb_swamp(rng, total, pre):
    n = N(total)
    S = Stereo(total)
    # low murky drone: narrow-band noise at ~58/87 Hz (decorrelates over time) + low-mid murk
    dl, dr = st_noise(rng, n, lambda f: np.exp(-0.5 * (np.log2(f / 58.0) / 0.12) ** 2) +
                      0.7 * np.exp(-0.5 * (np.log2(f / 87.0) / 0.1) ** 2), 0.6)
    swell = np.clip(1 + 0.3 * pslow(n, rng, 0.07, pre), 0.3, None)
    S.bed(dl * swell, dr * swell, 0.0)
    ml, mr = st_noise(rng, n, lambda f: _bw(f, 150, 450, 2), 0.4)
    S.bed(ml * swell, mr * swell, -5.0)
    # insects: cicada-like pulsed hiss
    ins = []
    for _ in range(2):
        x = bandnoise(n, rng, 4200, 7500)
        am = (0.5 + 0.5 * np.sin(TAU * phase_of(105 * (1 + 0.03 * lp_noise(n, rng, 1))))) ** 2
        ins.append(x * am * np.clip(0.55 + 0.45 * pslow(n, rng, 0.1, pre), 0.1, 1.2))
    S.bed(ins[0], ins[1], -9.0)
    ev = Stereo(total)
    for t0 in event_times(rng, 0.32, pre + EV_LO, pre + EV_HI, 0.8):
        p = rng.uniform(-0.9, 0.9)
        size = rng.uniform(0.8, 1.3)
        f0 = rng.uniform(120, 210) / size
        lvl = rng.uniform(14.0, 19.0)
        for k in range(int(rng.integers(1, 4))):
            L = rng.uniform(0.12, 0.3)
            c = croak(rng, L, f0 * rng.uniform(0.95, 1.05), rng.uniform(20, 34), size=size)
            ev.add(pk(c, lvl - 2 * k), t0 + k * rng.uniform(0.25, 0.45), p)
    for t0 in event_times(rng, 0.7, pre + EV_LO, pre + EV_HI, 0.15):
        ev.add(pk(bubble(rng.uniform(700, 2400), rng.uniform(0.1, 0.35)), rng.uniform(-4, 4)),
               t0, rng.uniform(-0.8, 0.8))
    for t0 in event_times(rng, 0.06, pre + EV_LO, pre + EV_HI, 6.0):
        L = rng.uniform(1.5, 2.5)
        nn = N(L)
        tt = tvec(nn)
        f = rng.uniform(520, 640) * (1 + 0.006 * np.sin(TAU * 7 * tt) + 0.02 * lp_noise(nn, rng, 2))
        mq = bp(saw(f), 1800, 0.7) * np.sin(np.pi * tt / L) ** 2
        ev.add(pk(mq, -8.0), t0, rng.uniform(-0.6, 0.6))
    el, er = reverb_st(ev.L, ev.R, 'field', 0.35, wet_hp=200)
    S.L += el
    S.R += er
    return S.L, S.R


@amb('amb_volcano', lufs=-26.0)
def amb_volcano(rng, total, pre):
    n = N(total)
    S = Stereo(total)
    swell = np.clip(1 + 0.45 * pslow(n, rng, 0.07, pre), 0.2, None)
    rl, rr = st_noise(rng, n, lambda f: 1.0 / np.maximum(f, 8.0) * _bw(f, 18, 110, 2), 0.6)
    S.bed(rl * swell, rr * swell, 0.0)
    ml, mr = st_noise(rng, n, lambda f: _bw(f, 120, 420, 2), 0.5)
    S.bed(ml * swell, mr * swell, -6.0)
    gusts = gust_curve(rng, n, 0.1, pre, 0.7)
    wl, wr = wind_layer(rng, n, 700, 1.0, gusts, 0.8, 0.25, color=-0.4)
    S.bed(wl, wr, -7.0)
    ev = Stereo(total)
    for t0 in event_times(rng, 0.35, pre + EV_LO, pre + EV_HI, 1.2):
        p = rng.uniform(-0.8, 0.8)
        lvl = rng.uniform(8.0, 14.0)
        for k in range(int(rng.integers(2, 6))):
            b = bubble(rng.uniform(70, 190), rng.uniform(0.4, 0.8), 1.0)
            b2 = bubble(rng.uniform(250, 500), 0.3, 0.3)
            bb = np.zeros(max(len(b), len(b2)))
            bb[:len(b)] += b
            bb[:len(b2)] += b2
            ev.add(pk(lp(bb, 1200), lvl - 2.5 * k * rng.uniform(0, 1)),
                   t0 + k * rng.uniform(0.06, 0.2), p)
    for t0 in event_times(rng, 0.35, pre + EV_LO, pre + EV_HI, 0.5):
        c = crackle(rng, rng.uniform(0.2, 0.6), rng.uniform(15, 40), lo=900, hi=7000, pop=0.5,
                    pop_f=(600, 2000))
        ev.add(pk(c, rng.uniform(0.0, 6.0)), t0, rng.uniform(-0.8, 0.8))
    for t0 in event_times(rng, 0.1, pre + EV_LO, pre + EV_HI, 4.0):
        d = lp(debris(rng, 0.6, 6, 'rock', 0, 0.12), 3000)
        ev.add(pk(d, rng.uniform(0.0, 5.0)), t0, rng.uniform(-0.8, 0.8))
    el, er = reverb_st(ev.L, ev.R, 'distant', 0.45, wet_hp=150)
    S.L += el
    S.R += er
    return S.L, S.R


@amb('amb_night', lufs=-28.0)
def amb_night(rng, total, pre):
    n = N(total)
    S = Stereo(total)
    gusts = gust_curve(rng, n, 0.1, pre)
    wl, wr = wind_layer(rng, n, 380, 1.0, gusts, 0.6, 0.4, color=-0.6)
    S.bed(wl, wr, 0.0)
    # distant cricket chorus: pulsed narrow-band noise
    ch = []
    for _ in range(2):
        x = bandnoise(n, rng, 4300, 5600, 3)
        pr = rng.uniform(26, 32)
        am = (0.5 + 0.5 * np.sin(TAU * phase_of(pr * (1 + 0.05 * lp_noise(n, rng, 0.5))))) ** 4
        ch.append(x * am * np.clip(0.8 + 0.2 * pslow(n, rng, 0.07, pre), 0.4, 1.2))
    S.bed(ch[0], ch[1], -8.0)
    # three foreground crickets with individual chirp rhythms (continuous through the file)
    ev = Stereo(total)
    tt = tvec(n)
    for pan, fc, cr, ppc in [(-0.6, 4350.0, 2.4, 3), (0.15, 4800.0, 2.9, 4), (0.7, 5150.0, 2.1, 3)]:
        env = np.zeros(n)
        pw = N(0.012)
        win = np.hanning(pw)
        t0 = rng.uniform(0, 0.5)
        while t0 < total - 0.5:
            if rng.random() > 0.08:                      # occasional skipped chirp
                for p in range(ppc):
                    i = int((t0 + p * rng.uniform(0.028, 0.034)) * SR)
                    if i + pw < n:
                        env[i:i + pw] += win * rng.uniform(0.75, 1.0)
            t0 += (1.0 / cr) * rng.uniform(0.92, 1.08)
            if rng.random() < 0.03:
                t0 += rng.uniform(1.0, 3.0)              # pauses
        car = np.sin(TAU * fc * tt + 0.3 * np.sin(TAU * 95 * tt)) + 0.12 * np.sin(TAU * 2 * fc * tt)
        ev.add(pk(car * env, rng.uniform(9.0, 12.0)), 0, pan, itd=0.0)
    el, er = reverb_st(ev.L, ev.R, 'field', 0.3, wet_hp=1000)
    S.L += el
    S.R += er
    return S.L, S.R


@amb('amb_battle_far', lufs=-31.0)
def amb_battle_far(rng, total, pre):
    n = N(total)
    S = Stereo(total)
    rl, rr = st_noise(rng, n, lambda f: 1.0 / np.maximum(f, 10.0) * _bw(f, 25, 250, 2), 0.5)
    S.bed(rl, rr, 0.0)
    # distant murmur of a war camp / battle: babble of several voices, muffled by distance
    bl, br = np.zeros(n), np.zeros(n)
    for k in range(6):
        vce = babble_voice(rng, n, rng.uniform(95, 190))
        th = (rng.uniform(-0.8, 0.8) + 1) * np.pi / 4
        bl += np.cos(th) * vce
        br += np.sin(th) * vce
    S.bed(lp(bl, 1400, 2), lp(br, 1400, 2), -2.0)
    ev = Stereo(total)
    for t0 in event_times(rng, 0.4, pre + EV_LO, pre + EV_HI, 0.8):
        p = rng.uniform(-0.9, 0.9)
        lvl = rng.uniform(3.0, 10.0)
        for k in range(int(rng.integers(1, 4))):
            c = metal(rng, rng.uniform(800, 1400), rng.uniform(0.3, 0.5), nm=8, kind='rand',
                      hard=0.9, noise=0.2)
            ev.add(pk(lp(c, 2600, 2), lvl - 2 * k), t0 + k * rng.uniform(0.15, 0.35), p)
    for t0 in event_times(rng, 0.09, pre + EV_LO, pre + EV_HI, 5.0):
        p = rng.uniform(-0.5, 0.5)
        for k in range(int(rng.integers(4, 8))):
            d = lp(drum(rng, 70, 0.6, stick=0.1, skin=0.4), 500, 2)
            ev.add(pk(d, 7.0 if k % 2 == 0 else 4.0), t0 + k * 0.62, p)
    th0 = pre + rng.uniform(12, 17)
    amp = [(0, 0), (0.1, 0.8), (1.2, 1.0), (1.6, 0)]
    h = horn(rng, [(0, 50), (0.25, 55)], 1.8, amp, voices=2, bright=(300, 2500), rough=0.2)
    ev.add(pk(lp(h, 1500, 2), 5.0), th0, rng.uniform(-0.6, 0.6))
    el, er = reverb_st(ev.L, ev.R, 'distant', 0.6, wet_hp=150, dry=0.6)
    S.L += el
    S.R += er
    return S.L, S.R
