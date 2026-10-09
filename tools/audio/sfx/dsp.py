"""Core DSP for the Rampart Riot sound-effect generator.

Everything is synthesised from scratch with numpy/scipy: noise generators,
envelopes, band-limited oscillators, static and time-varying filters
(block-updated biquads and STFT-domain masks), modal synthesis, synthetic
convolution reverbs, BS.1770 loudness metering and ffmpeg I/O.
No samples, soundfonts or external audio libraries are used.
"""
import subprocess
import zlib

import numpy as np
import scipy.fft as sfft
from scipy import signal
from scipy.io import wavfile

SR = 44100
TAU = 2.0 * np.pi
LN1000 = 6.907755278982137          # ln(1000): exp(-LN1000 * t / T60) hits -60 dB at T60


# ----------------------------------------------------------------------------
# Basic helpers
# ----------------------------------------------------------------------------
def N(sec):
    return max(1, int(round(float(sec) * SR)))


def tvec(n):
    return np.arange(n) / SR


def db2a(db):
    return 10.0 ** (np.asarray(db, dtype=np.float64) / 20.0)


def a2db(a):
    return 20.0 * np.log10(np.maximum(np.abs(a), 1e-12))


def seed_of(*key):
    """Deterministic seed from any repr-able key (python hash() is salted)."""
    return zlib.crc32(repr(key).encode()) & 0x7FFFFFFF


def midi(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


def norm(x, peak=1.0):
    m = float(np.max(np.abs(x))) if len(x) else 0.0
    return x * (peak / m) if m > 0 else x


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-20))


def fit(x, n):
    """Pad with zeros / cut to exactly n samples."""
    if len(x) >= n:
        return x[:n]
    return np.concatenate([x, np.zeros(n - len(x))])


def pad(x, sec):
    return np.concatenate([x, np.zeros(N(sec))])


def reverse(x):
    return x[::-1].copy()


_EF = {}


def end_fade(x, n=88):
    """Copy of x with a short raised-cosine fade on its last samples."""
    k = min(n, len(x) // 4)
    if k < 2:
        return x
    w = _EF.get(k)
    if w is None:
        w = _EF[k] = 0.5 + 0.5 * np.cos(np.pi * np.arange(1, k + 1) / k)
    x = x.copy()
    x[-k:] *= w
    return x


class Mix:
    """Auto-growing mono mix buffer: add(x, t_seconds, gain)."""

    def __init__(self, dur=1.0):
        self.y = np.zeros(N(dur))

    def add(self, x, t=0.0, g=1.0):
        i = int(round(t * SR))
        assert i >= 0, 'negative offset'
        x = end_fade(np.asarray(x, dtype=np.float64))
        end = i + len(x)
        if end > len(self.y):
            self.y = np.concatenate([self.y, np.zeros(end - len(self.y) + SR // 10)])
        self.y[i:end] += g * x
        return self

    @property
    def out(self):
        return self.y


# ----------------------------------------------------------------------------
# Noise
# ----------------------------------------------------------------------------
def white(n, rng):
    return rng.standard_normal(n)


def shaped(n, rng, mag_fn, normalize=True):
    """FFT-shaped Gaussian noise: |H(f)| = mag_fn(f) (f in Hz, >= 1)."""
    nfft = sfft.next_fast_len(max(n, 16), real=True)
    X = sfft.rfft(rng.standard_normal(nfft))
    f = np.maximum(np.fft.rfftfreq(nfft, 1.0 / SR), 1.0)
    G = mag_fn(f)
    G[0] = 0.0
    y = sfft.irfft(X * G, nfft)[:n]
    if normalize:
        y /= (np.std(y) + 1e-12)
    return y


def _bw(f, lo=None, hi=None, order=2):
    g = np.ones_like(f)
    if lo:
        g /= np.sqrt(1.0 + (lo / f) ** (2 * order))
    if hi:
        g /= np.sqrt(1.0 + (f / hi) ** (2 * order))
    return g


def pink(n, rng, lo=20.0, hi=None):
    return shaped(n, rng, lambda f: f ** -0.5 * _bw(f, lo, hi, 2))


def brown(n, rng, lo=15.0, hi=None):
    return shaped(n, rng, lambda f: 1.0 / np.maximum(f, 5.0) * _bw(f, lo, hi, 2))


def bandnoise(n, rng, lo=None, hi=None, order=2, tilt=0.0):
    """Band-limited noise (butterworth-like magnitude), optional f^tilt slope."""
    return shaped(n, rng, lambda f: _bw(f, lo, hi, order) * (f / 1000.0) ** tilt)


def slow_noise(n, rng, rate):
    """Smooth random curve: unit-variance knots every 1/rate s, cosine interpolated."""
    x = np.arange(n) / SR * rate
    m = int(x[-1]) + 3 if n else 3
    pts = rng.standard_normal(m)
    i = x.astype(np.int64)
    fr = x - i
    w = 0.5 - 0.5 * np.cos(np.pi * fr)
    return pts[i] * (1.0 - w) + pts[i + 1] * w


def lp_noise(n, rng, fc):
    """Low-passed (one-pole x2) unit-std random modulation signal."""
    y = onepole(onepole(rng.standard_normal(n), fc), fc)
    return y / (np.std(y) + 1e-12)


# ----------------------------------------------------------------------------
# Envelopes
# ----------------------------------------------------------------------------
def env_ad(n, att, tau, shape=1.0):
    """Raised-cosine attack of `att` s then exponential decay (time constant tau)."""
    t = tvec(n)
    if att > 0:
        a = np.clip(t / att, 0.0, 1.0)
        a = (0.5 - 0.5 * np.cos(np.pi * a)) ** shape
    else:
        a = np.ones(n)
    d = np.exp(-np.maximum(t - att, 0.0) / max(tau, 1e-5))
    return a * d


def env_t60(n, t60, att=0.0):
    t = tvec(n)
    e = np.exp(-LN1000 * t / max(t60, 1e-4))
    if att > 0:
        e *= 0.5 - 0.5 * np.cos(np.pi * np.clip(t / att, 0, 1))
    return e


def env_pts(n, pts, mode='lin'):
    """Piecewise envelope through (time, value) breakpoints.
    mode: 'lin' | 'cos' (smooth) | 'log' (geometric, values > 0) | 'db' (values in dB)."""
    t = tvec(n)
    ts = np.array([p[0] for p in pts], dtype=np.float64)
    vs = np.array([p[1] for p in pts], dtype=np.float64)
    if mode == 'lin':
        return np.interp(t, ts, vs)
    if mode == 'db':
        return db2a(np.interp(t, ts, vs))
    if mode == 'log':
        return np.exp(np.interp(t, ts, np.log(np.maximum(vs, 1e-9))))
    if mode == 'cos':
        idx = np.clip(np.searchsorted(ts, t, side='right') - 1, 0, len(ts) - 2)
        t0, t1 = ts[idx], ts[idx + 1]
        fr = np.clip((t - t0) / np.maximum(t1 - t0, 1e-9), 0.0, 1.0)
        w = 0.5 - 0.5 * np.cos(np.pi * fr)
        y = vs[idx] * (1 - w) + vs[idx + 1] * w
        y[t >= ts[-1]] = vs[-1]
        y[t <= ts[0]] = vs[0]
        return y
    raise ValueError(mode)


def fade(x, fin=0.0, fout=0.0):
    x = np.array(x, dtype=np.float64, copy=True)
    a = min(N(fin), len(x) // 2) if fin > 0 else 0
    b = min(N(fout), len(x) // 2) if fout > 0 else 0
    if a > 1:
        x[:a] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    if b > 1:
        x[-b:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(1, b + 1) / b)
    return x


# ----------------------------------------------------------------------------
# Oscillators
# ----------------------------------------------------------------------------
def as_curve(v, n):
    v = np.asarray(v, dtype=np.float64)
    return np.full(n, float(v)) if v.ndim == 0 else v


def phase_of(f, ph0=0.0):
    """Instantaneous phase (cycles) of a frequency curve (Hz)."""
    return ph0 + np.cumsum(f) / SR


def sine(f, n=None, ph0=0.0):
    if n is not None:
        f = as_curve(f, n)
    return np.sin(TAU * phase_of(f, ph0))


def sweep(n, f0, f1, tau, ph0=0.0):
    """Exponential glide f0 -> f1 with time constant tau (sine)."""
    t = tvec(n)
    f = f1 + (f0 - f1) * np.exp(-t / tau)
    return np.sin(TAU * phase_of(f, ph0)), f


def _blep(ph, dt):
    y = np.zeros_like(ph)
    m1 = ph < dt
    t1 = ph[m1] / dt[m1]
    y[m1] = 2 * t1 - t1 * t1 - 1.0
    m2 = ph > 1.0 - dt
    t2 = (ph[m2] - 1.0) / dt[m2]
    y[m2] = t2 * t2 + 2 * t2 + 1.0
    return y


def saw(f, n=None, ph0=0.0):
    """PolyBLEP band-limited sawtooth (-1..1) for a frequency curve."""
    if n is not None:
        f = as_curve(f, n)
    dt = np.clip(np.asarray(f) / SR, 1e-7, 0.45)
    ph = phase_of(f, ph0) % 1.0
    return 2.0 * ph - 1.0 - _blep(ph, dt)


def square(f, n=None, ph0=0.0, duty=0.5):
    if n is not None:
        f = as_curve(f, n)
    dt = np.clip(np.asarray(f) / SR, 1e-7, 0.45)
    ph = phase_of(f, ph0) % 1.0
    ph2 = (ph + (1.0 - duty)) % 1.0
    a = 2.0 * ph - 1.0 - _blep(ph, dt)
    b = 2.0 * ph2 - 1.0 - _blep(ph2, dt)
    return 0.5 * (a - b)


def harmonics(f, amp_fn, kmax_hz=10000.0, rng=None, ph_rand=True):
    """Additive harmonic oscillator. f: per-sample fundamental (Hz).
    amp_fn(k, fk) -> per-sample (or scalar) amplitude of harmonic k."""
    f = np.asarray(f, dtype=np.float64)
    ph = TAU * phase_of(f)
    fmin = max(float(np.min(f)), 20.0)
    K = max(1, int(kmax_hz / fmin))
    out = np.zeros_like(f)
    lim = min(kmax_hz, 0.45 * SR)
    for k in range(1, K + 1):
        fk = k * f
        taper = np.clip((lim - fk) / (0.15 * lim), 0.0, 1.0)
        if not np.any(taper > 0):
            break
        a = amp_fn(k, fk) * taper
        if np.max(np.abs(a)) < 1e-5:
            continue
        p0 = rng.uniform(0, TAU) if (rng is not None and ph_rand) else 0.0
        out += a * np.sin(k * ph + p0)
    return out


# ----------------------------------------------------------------------------
# Filters
# ----------------------------------------------------------------------------
def bq(kind, f0, q=0.7071, gain_db=0.0):
    """RBJ cookbook biquad -> sos row [b0 b1 b2 1 a1 a2]."""
    f0 = float(np.clip(f0, 5.0, SR * 0.49))
    A = 10.0 ** (gain_db / 40.0)
    w0 = TAU * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * max(q, 1e-3))
    if kind == 'lowpass':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'highpass':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'bandpass':          # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'notch':
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'peak':
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == 'lowshelf':
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw),
             A * ((A + 1) - (A - 1) * cw - sa)]
        a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw),
             (A + 1) + (A - 1) * cw - sa]
    elif kind == 'highshelf':
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw),
             A * ((A + 1) + (A - 1) * cw - sa)]
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) + (A + 1) * cw),
             (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.asarray(b, dtype=np.float64) / a[0]
    a = np.asarray(a, dtype=np.float64) / a[0]
    return np.concatenate([b, a])


def filt(x, *specs):
    """Apply a cascade: specs are (kind, f0[, q[, gain_db]]) tuples."""
    sos = np.array([bq(*s) for s in specs])
    return signal.sosfilt(sos, np.asarray(x, dtype=np.float64), axis=-1)


def lp(x, f, order=1, q=0.7071):
    return filt(x, *[('lowpass', f, q)] * order)


def hp(x, f, order=1, q=0.7071):
    return filt(x, *[('highpass', f, q)] * order)


def bp(x, f, q=1.0, order=1):
    return filt(x, *[('bandpass', f, q)] * order)


def peq(x, f, q, g):
    return filt(x, ('peak', f, q, g))


def lshelf(x, f, g, q=0.7071):
    return filt(x, ('lowshelf', f, q, g))


def hshelf(x, f, g, q=0.7071):
    return filt(x, ('highshelf', f, q, g))


def butter(x, kind, f, order=4):
    sos = signal.butter(order, f, kind, fs=SR, output='sos')
    return signal.sosfilt(sos, np.asarray(x, dtype=np.float64), axis=-1)


def onepole(x, fc):
    a = np.exp(-TAU * fc / SR)
    return signal.lfilter([1 - a], [1, -a], np.asarray(x, dtype=np.float64), axis=-1)


def tvf(x, kind, f, q=0.7071, gain_db=0.0, block=32):
    """Time-varying biquad: coefficients updated every `block` samples (state kept)."""
    x = np.asarray(x, dtype=np.float64)
    n = x.size
    f = as_curve(f, n)
    q = as_curve(q, n)
    y = np.empty(n)
    zi = np.zeros((1, 2))
    for s in range(0, n, block):
        e = min(n, s + block)
        m = (s + e) // 2
        sos = bq(kind, f[m], q[m], gain_db)[None, :]
        y[s:e], zi = signal.sosfilt(sos, x[s:e], zi=zi)
    return y


def stft_shape(x, fn, nper=1024, hop=None):
    """Time-varying spectral gain. fn(f[:,None], t[None,:]) -> gain matrix."""
    x = np.asarray(x, dtype=np.float64)
    hop = hop or nper // 4
    f, t, Z = signal.stft(x, SR, window='hann', nperseg=nper, noverlap=nper - hop)
    G = fn(f[:, None], t[None, :])
    _, y = signal.istft(Z * G, SR, window='hann', nperseg=nper, noverlap=nper - hop)
    return fit(y, len(x))


def resonate(x, freqs, t60s, gains=None):
    """Parallel bank of 2-pole resonators (unity peak gain each)."""
    x = np.asarray(x, dtype=np.float64)
    out = np.zeros_like(x)
    t60s = np.broadcast_to(np.asarray(t60s, dtype=np.float64), (len(freqs),))
    gains = np.ones(len(freqs)) if gains is None else gains
    for f, T, g in zip(freqs, t60s, gains):
        if f >= 0.47 * SR or f <= 10:
            continue
        r = np.exp(-LN1000 / (T * SR))
        w = TAU * f / SR
        k = (1 - r * r) / 2
        out += g * signal.lfilter([k, 0, -k], [1, -2 * r * np.cos(w), r * r], x)
    return out


def comb(x, delay_s, fb=0.5, mix=1.0):
    d = max(1, int(round(delay_s * SR)))
    a = np.zeros(d + 1)
    a[0] = 1.0
    a[d] = -fb
    y = signal.lfilter([1.0], a, x)
    return x + mix * (y - x)


# ----------------------------------------------------------------------------
# Modal synthesis
# ----------------------------------------------------------------------------
def modal(n, freqs, t60s, amps, phases=None, att=0.0):
    """Sum of exponentially decaying sinusoids (impulse response of modes)."""
    y = np.zeros(n)
    t_full = tvec(n)
    t60s = np.broadcast_to(np.asarray(t60s, dtype=np.float64), (len(freqs),))
    for i, (f, T, a) in enumerate(zip(freqs, t60s, amps)):
        if not (20.0 < f < 0.46 * SR) or a == 0:
            continue
        m = min(n, int(T * 1.4 * SR) + 2)
        t = t_full[:m]
        ph = 0.0 if phases is None else phases[i]
        y[:m] += a * np.exp(-LN1000 * t / T) * np.sin(TAU * f * t + ph)
    if att > 0:
        y *= np.clip(t_full / att, 0, 1)
    return y


def mallet(y, width_ms):
    """Soften an impulse response by convolving with a Hann pulse (mallet contact)."""
    w = int(width_ms * SR / 1000.0)
    if w <= 1:
        return y
    k = np.hanning(w + 2)[1:-1]
    k /= k.sum()
    return np.convolve(y, k)[:len(y)]


# ----------------------------------------------------------------------------
# Nonlinearities
# ----------------------------------------------------------------------------
def sat(x, drive=2.0):
    return np.tanh(drive * x) / np.tanh(drive)


def asym_sat(x, drive=2.0, bias=0.2):
    y = np.tanh(drive * (x + bias)) - np.tanh(drive * bias)
    return y / (np.max(np.abs(y)) + 1e-12) * np.max(np.abs(x))


def fold(x, drive=2.0):
    return np.sin(drive * x)


def bass_harmonics(x, fc=140.0, amount=0.5, drive=4.0, band=(150.0, 600.0)):
    """Psychoacoustic bass: add harmonics of the sub band so small speakers 'hear' it."""
    low = lp(x, fc, order=2)
    lvl = np.max(np.abs(low)) + 1e-12
    h = np.tanh(drive * low / lvl) * lvl
    h = filt(h, ('highpass', band[0]), ('highpass', band[0]), ('lowpass', band[1]))
    return x + amount * h


def transient_env(x, fast=0.0008, slow=0.02):
    """Envelope difference (fast - slow): positive at onsets."""
    a = np.abs(x)
    return np.maximum(onepole(a, 1 / (TAU * fast)) - onepole(a, 1 / (TAU * slow)), 0)


def soft_clip(x, reduce_db, knee=0.7):
    """2x-oversampled tanh soft clipper: the top `reduce_db` of the peaks are rounded
    off (linear below knee*ceiling). Used to densify very transient sounds so they read
    louder at the same peak level; only the first milliseconds of a hit are touched."""
    x = np.asarray(x, dtype=np.float64)
    up = signal.resample_poly(x, 2, 1)
    c = np.max(np.abs(up)) * db2a(-reduce_db)
    k = c * knee
    a = np.abs(up)
    y = np.where(a > k, k + (c - k) * np.tanh((a - k) / (c - k)), a) * np.sign(up)
    return signal.resample_poly(y, 1, 2)[:len(x)]


# ----------------------------------------------------------------------------
# Resampling / pitch
# ----------------------------------------------------------------------------
def resample(x, ratio):
    """Play back `ratio` times faster (pitch up, shorter)."""
    from fractions import Fraction
    fr = Fraction(1.0 / ratio).limit_denominator(200)
    return signal.resample_poly(x, fr.numerator, fr.denominator)


def varispeed(x, rate_curve):
    """Time-varying playback rate (per output sample, linear interpolation)."""
    pos = np.cumsum(rate_curve)
    pos = pos[pos < len(x) - 1]
    i = pos.astype(np.int64)
    fr = pos - i
    return x[i] * (1 - fr) + x[i + 1] * fr


# ----------------------------------------------------------------------------
# Synthetic convolution reverb
# ----------------------------------------------------------------------------
IR_PRESETS = {
    # rt60, predelay, hf (rt multiplier at 8k), lf (rt multiplier at 63 Hz), er count, er span
    'tiny': dict(rt60=0.16, pre=0.001, hf=0.6, lf=0.9, er_n=6, er_span=0.008, er_gain=0.5),
    'room': dict(rt60=0.38, pre=0.003, hf=0.55, lf=1.0, er_n=10, er_span=0.02, er_gain=0.6),
    'field': dict(rt60=0.85, pre=0.012, hf=0.42, lf=0.95, er_n=10, er_span=0.06, er_gain=0.5),
    'yard': dict(rt60=1.3, pre=0.015, hf=0.45, lf=1.05, er_n=14, er_span=0.07, er_gain=0.5),
    'hall': dict(rt60=2.3, pre=0.02, hf=0.42, lf=1.2, er_n=16, er_span=0.08, er_gain=0.45),
    'cathedral': dict(rt60=3.8, pre=0.028, hf=0.38, lf=1.25, er_n=18, er_span=0.1, er_gain=0.4),
    'cave': dict(rt60=1.7, pre=0.008, hf=0.6, lf=1.1, er_n=20, er_span=0.05, er_gain=0.7),
    'distant': dict(rt60=2.8, pre=0.03, hf=0.3, lf=1.1, er_n=8, er_span=0.12, er_gain=0.3),
}
_IR_CACHE = {}


def make_ir(rt60, pre=0.01, hf=0.5, lf=1.1, er_n=10, er_span=0.03, er_gain=0.5, seed=0):
    rng = np.random.default_rng(seed)
    L = int(SR * (rt60 * 1.25 + pre + 0.03))
    t = tvec(L)
    f = np.fft.rfftfreq(L, 1.0 / SR)
    centers = np.array([63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], float)
    mult = np.interp(np.log2(centers), np.log2([63, 250, 1000, 4000, 8000, 16000]),
                     [lf, 1.04, 1.0, 0.5 + 0.5 * hf + 0.15, hf, hf * 0.7])
    rts = rt60 * mult
    lfq = np.log2(np.maximum(f, 1.0))
    lc = np.log2(centers)
    W = np.zeros((len(centers), f.size))
    for i in range(len(centers)):
        d = lfq - lc[i]
        w = np.where(np.abs(d) < 1.0, 0.5 + 0.5 * np.cos(np.pi * d), 0.0)
        if i == 0:
            w = np.where(lfq < lc[0], 1.0, w)
        if i == len(centers) - 1:
            w = np.where(lfq > lc[-1], 1.0, w)
        W[i] = w
    W /= W.sum(axis=0, keepdims=True) + 1e-12
    X = np.fft.rfft(rng.standard_normal(L))
    tail = np.zeros(L)
    tp = np.maximum(t - pre, 0.0)
    for i in range(len(centers)):
        tail += np.fft.irfft(X * W[i], L) * np.exp(-LN1000 * tp / rts[i])
    onset = np.clip((t - pre) / 0.003, 0, 1)
    build = 1.0 - np.exp(-tp / (0.01 + rt60 * 0.012))
    tail *= onset * build
    er = np.zeros(L)
    for k in range(er_n):
        d = pre * 0.4 + rng.uniform(0.0005, er_span) * (k + 1) / er_n
        idx = int(d * SR)
        if idx < L:
            er[idx] += er_gain * rng.uniform(0.4, 1.0) * np.exp(-d / max(er_span, 0.01)) \
                * rng.choice([-1.0, 1.0])
    er = onepole(er, 7000.0)
    ir = tail / np.sqrt(np.sum(tail ** 2)) + er * 0.6
    ir /= np.sqrt(np.sum(ir ** 2))
    nf = int(0.02 * SR)
    ir[-nf:] *= np.linspace(1, 0, nf)
    return ir


def get_ir(preset, seed=0):
    key = (preset, seed)
    h = _IR_CACHE.get(key)
    if h is None:
        p = dict(IR_PRESETS[preset])
        h = make_ir(seed=seed_of('ir', preset, seed), **p)
        _IR_CACHE[key] = h
    return h


def reverb(x, preset='room', mix=0.2, seed=0, wet_hp=None, wet_lp=None, dry=1.0):
    """Mono convolution reverb; output is longer than input by the IR length."""
    h = get_ir(preset, seed)
    wet = signal.fftconvolve(x, h)
    if wet_hp:
        wet = hp(wet, wet_hp)
    if wet_lp:
        wet = lp(wet, wet_lp)
    out = mix * wet
    out[:len(x)] += dry * x
    return out


def reverb_st(xl, xr, preset='hall', mix=0.2, wet_hp=None, wet_lp=None, dry=1.0, cross=0.35):
    hl, hr = get_ir(preset, 1), get_ir(preset, 2)
    wl = signal.fftconvolve(xl + cross * xr, hl)[:len(xl)]
    wr = signal.fftconvolve(xr + cross * xl, hr)[:len(xr)]
    if wet_hp:
        wl, wr = hp(wl, wet_hp), hp(wr, wet_hp)
    if wet_lp:
        wl, wr = lp(wl, wet_lp), lp(wr, wet_lp)
    return dry * xl + mix * wl, dry * xr + mix * wr


# ----------------------------------------------------------------------------
# Loudness (ITU-R BS.1770 K-weighting) and peaks
# ----------------------------------------------------------------------------
def _k_weight_sos(sr=SR):
    G, Q, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    K = np.tan(np.pi * fc / sr)
    Vh = 10.0 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0_ = 1.0 + K / Q + K * K
    s1 = [(Vh + Vb * K / Q + K * K) / a0_, 2.0 * (K * K - Vh) / a0_, (Vh - Vb * K / Q + K * K) / a0_,
          1.0, 2.0 * (K * K - 1.0) / a0_, (1.0 - K / Q + K * K) / a0_]
    Q, fc = 0.5003270373253953, 38.13547087613982
    K = np.tan(np.pi * fc / sr)
    a0_ = 1.0 + K / Q + K * K
    s2 = [1.0, -2.0, 1.0, 1.0, 2.0 * (K * K - 1.0) / a0_, (1.0 - K / Q + K * K) / a0_]
    return np.array([s1, s2])


K_SOS = _k_weight_sos()


def _kpow(x, win_s, hop_s):
    x = np.atleast_2d(np.asarray(x, dtype=np.float64))
    w = int(win_s * SR)
    if x.shape[1] < w:
        x = np.pad(x, ((0, 0), (0, w - x.shape[1])))
    y = signal.sosfilt(K_SOS, x, axis=-1)
    cs = np.concatenate([np.zeros((y.shape[0], 1)), np.cumsum(y ** 2, axis=1)], axis=1)
    hop = max(1, int(hop_s * SR))
    starts = np.arange(0, y.shape[1] - w + 1, hop)
    return ((cs[:, starts + w] - cs[:, starts]) / w).sum(axis=0)


def lufs_momentary_max(x):
    """Max momentary loudness (400 ms K-weighted windows) - our 'LUFS-ish' for SFX."""
    z = _kpow(x, 0.4, 0.01)
    return float(-0.691 + 10 * np.log10(np.max(z) + 1e-20))


def lufs_short_max(x, win=0.1):
    z = _kpow(x, win, 0.005)
    return float(-0.691 + 10 * np.log10(np.max(z) + 1e-20))


def lufs_integrated(x):
    z = _kpow(x, 0.4, 0.1)
    lv = -0.691 + 10 * np.log10(z + 1e-20)
    g1 = lv > -70.0
    if not np.any(g1):
        return -70.0
    thr = -0.691 + 10 * np.log10(z[g1].mean()) - 10.0
    g2 = g1 & (lv > thr)
    return float(-0.691 + 10 * np.log10(z[g2].mean()))


def true_peak(x, os=4):
    x = np.atleast_2d(np.asarray(x, dtype=np.float64))
    up = signal.resample_poly(x, os, 1, axis=-1)
    return float(np.max(np.abs(up)))


# ----------------------------------------------------------------------------
# I/O
# ----------------------------------------------------------------------------
def write_wav(path, x):
    x = np.asarray(x)
    data = x.T if x.ndim == 2 else x
    wavfile.write(path, SR, np.ascontiguousarray(data, dtype=np.float32))


def encode_mp3(wav_path, mp3_path, kbps=96):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path,
                    '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', mp3_path], check=True)


def decode_mp3(path, channels=1):
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le',
                        '-ac', str(channels), '-ar', str(SR), '-'],
                       check=True, capture_output=True)
    y = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)
    if channels > 1:
        y = y.reshape(-1, channels).T
    return y
