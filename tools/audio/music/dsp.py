"""Low-level DSP for the Rampart Riot music engine.

Filters (RBJ biquads), BS.1770 loudness + true-peak metering, bus compressor,
oversampled soft clipper, look-ahead true-peak limiter and a synthetic
convolution hall (decorrelated, frequency-dependent exponential decay).
Everything is vectorised numpy/scipy; no external audio libraries.
"""
import zlib

import numpy as np
import scipy.fft as sfft
from scipy import signal
from scipy.ndimage import minimum_filter1d

SR = 44100


def db2a(db):
    return 10.0 ** (np.asarray(db, dtype=np.float64) / 20.0)


def a2db(a):
    return 20.0 * np.log10(np.maximum(np.abs(a), 1e-12))


def stable_seed(*key):
    """Deterministic seed from any repr-able key (python hash() is salted)."""
    return zlib.crc32(repr(key).encode()) & 0x7FFFFFFF


# ----------------------------------------------------------------------------
# Biquads (Robert Bristow-Johnson cookbook)
# ----------------------------------------------------------------------------
def biquad(kind, f0, q=0.7071, gain_db=0.0, sr=SR):
    f0 = min(f0, sr * 0.49)
    A = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * np.pi * f0 / sr
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * q)
    if kind == 'lowpass':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'highpass':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'bandpass':
        b = [alpha, 0.0, -alpha]
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
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw),
             (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.asarray(b) / a[0]
    a = np.asarray(a) / a[0]
    return np.concatenate([b, a])


def eq_sos(specs):
    """specs: list of tuples (kind, f0[, q[, gain_db]]) -> SOS matrix."""
    rows = []
    for s in specs:
        if s[0] in ('lp4', 'hp4'):           # 4th order butterworth shortcuts
            btype = 'lowpass' if s[0] == 'lp4' else 'highpass'
            rows.extend(signal.butter(4, s[1], btype, fs=SR, output='sos'))
        else:
            rows.append(biquad(*s))
    return np.asarray(rows)


def sosfilt(x, sos):
    return signal.sosfilt(sos, x, axis=-1).astype(np.float32)


_H_CACHE = {}


def fft_sos(x, sos, pad=SR // 2):
    """Apply an IIR cascade in the frequency domain (same magnitude+phase as
    sosfilt, cost independent of the number of sections). Long buffers only."""
    n = x.shape[-1]
    nfft = sfft.next_fast_len(n + pad, real=True)
    key = (sos.tobytes(), nfft)
    H = _H_CACHE.get(key)
    if H is None:
        f = np.fft.rfftfreq(nfft, 1.0 / SR)
        _, H = signal.sosfreqz(sos, worN=f, fs=SR)
        if len(_H_CACHE) > 24:
            _H_CACHE.clear()
        _H_CACHE[key] = H
    X = sfft.rfft(x, nfft, axis=-1, workers=2)
    X *= H
    return sfft.irfft(X, nfft, axis=-1, workers=2)[..., :n].astype(np.float32)


def one_pole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return signal.lfilter([1 - a], [1, -a], x, axis=-1)


# ----------------------------------------------------------------------------
# Loudness (ITU-R BS.1770-4) and true peak
# ----------------------------------------------------------------------------
def _k_weight_sos(sr=SR):
    """BS.1770 K-weighting re-derived for any rate (B. De Man's analog-prototype
    parameters; reproduces the published 48 kHz coefficients exactly)."""
    # Stage 1: high shelf (+4 dB above ~1.68 kHz)
    G, Q, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    K = np.tan(np.pi * fc / sr)
    Vh = 10.0 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0_ = 1.0 + K / Q + K * K
    s1 = [(Vh + Vb * K / Q + K * K) / a0_, 2.0 * (K * K - Vh) / a0_, (Vh - Vb * K / Q + K * K) / a0_,
          1.0, 2.0 * (K * K - 1.0) / a0_, (1.0 - K / Q + K * K) / a0_]
    # Stage 2: RLB high-pass (~38 Hz)
    Q, fc = 0.5003270373253953, 38.13547087613982
    K = np.tan(np.pi * fc / sr)
    a0_ = 1.0 + K / Q + K * K
    s2 = [1.0, -2.0, 1.0, 1.0, 2.0 * (K * K - 1.0) / a0_, (1.0 - K / Q + K * K) / a0_]
    return np.array([s1, s2])


K_SOS = _k_weight_sos()


def _block_powers(x, block_s=0.4, step_s=0.1):
    x = np.atleast_2d(np.asarray(x, dtype=np.float64))
    if x.shape[1] > SR * 4:
        y = fft_sos(x, K_SOS).astype(np.float64)
    else:
        y = signal.sosfilt(K_SOS, x, axis=-1)
    n = y.shape[1]
    blk = int(round(block_s * SR))
    step = int(round(step_s * SR))
    if n < blk:
        return np.array([np.sum(np.mean(y ** 2, axis=1))])
    cs = np.concatenate([np.zeros((y.shape[0], 1)), np.cumsum(y ** 2, axis=1)], axis=1)
    starts = np.arange(0, n - blk + 1, step)
    ms = (cs[:, starts + blk] - cs[:, starts]) / blk
    return ms.sum(axis=0)


def lufs_integrated(x):
    z = _block_powers(x)
    l = -0.691 + 10 * np.log10(z + 1e-20)
    g1 = l > -70.0
    if not np.any(g1):
        return -70.0
    thr = -0.691 + 10 * np.log10(z[g1].mean()) - 10.0
    g2 = g1 & (l > thr)
    return float(-0.691 + 10 * np.log10(z[g2].mean()))


def loudness_curve(x, block_s=3.0, step_s=0.5):
    """Short-term loudness (3 s windows) for diagnostics."""
    z = _block_powers(x, block_s, step_s)
    return -0.691 + 10 * np.log10(z + 1e-20)


def true_peak_db(x, os=4):
    x = np.atleast_2d(x)
    peak = 0.0
    seg = SR * 20
    for c in range(x.shape[0]):
        for s in range(0, x.shape[1], seg):
            chunk = x[c, max(0, s - 64): s + seg + 64].astype(np.float64)
            up = signal.resample_poly(chunk, os, 1)
            peak = max(peak, float(np.max(np.abs(up))))
    return float(a2db(peak))


def sample_peak_db(x):
    return float(a2db(np.max(np.abs(x))))


# ----------------------------------------------------------------------------
# Dynamics
# ----------------------------------------------------------------------------
def compressor(x, thr_db, ratio=2.0, attack_ms=25.0, release_ms=250.0, knee_db=6.0,
               block=64):
    """Stereo-linked RMS feed-forward compressor (block-rate ballistics)."""
    n = x.shape[1]
    nb = (n + block - 1) // block
    pad = nb * block - n
    xp = np.pad(x, ((0, 0), (0, pad)))
    ms = np.mean(xp.reshape(x.shape[0], nb, block) ** 2, axis=(0, 2))
    # 10 ms RMS smoothing before the gain computer
    ms = signal.lfilter([0.15], [1, -0.85], ms)
    lvl = 10 * np.log10(ms + 1e-12)
    over = lvl - thr_db
    slope = 1.0 - 1.0 / ratio
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * slope,
                           slope * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    ta = np.exp(-block / (SR * attack_ms / 1000.0))
    tr = np.exp(-block / (SR * release_ms / 1000.0))
    out = np.empty_like(gr)
    g = 0.0
    for i in range(nb):           # ~80k iterations for a 2 min track
        v = gr[i]
        g = ta * g + (1 - ta) * v if v > g else tr * g + (1 - tr) * v
        out[i] = g
    centers = (np.arange(nb) + 0.5) * block
    gain_db = np.interp(np.arange(n), centers, -out)
    return (x * db2a(gain_db)[None, :]).astype(np.float32), float(out.max())


def soft_clip(x, knee=0.7, ceiling=0.98):
    """Oversampled smooth saturator: linear below `knee`, tanh-rounded above."""
    up = signal.resample_poly(x.astype(np.float64), 2, 1, axis=1)
    a = np.abs(up)
    over = np.maximum(a - knee, 0.0)
    rng = ceiling - knee
    shaped = np.where(a > knee, knee + rng * np.tanh(over / rng), a)
    up = np.sign(up) * shaped
    return signal.resample_poly(up, 1, 2, axis=1).astype(np.float32)


def tp_limiter(x, ceiling_db=-1.6, lookahead_ms=6.0, release_ms=120.0, os=4, block=16):
    """Look-ahead limiter driven by a 4x oversampled (true) peak estimate."""
    n = x.shape[1]
    ceil = float(db2a(ceiling_db))
    pk = np.zeros(n)
    seg = SR * 15
    for s in range(0, n, seg):
        a0 = max(0, s - 64)
        chunk = x[:, a0:s + seg + 64].astype(np.float64)
        up = signal.resample_poly(chunk, os, 1, axis=1)
        m = np.max(np.abs(up), axis=0)
        m = m[: (m.size // os) * os].reshape(-1, os).max(axis=1)
        take = m[s - a0: s - a0 + min(seg, n - s)]
        pk[s:s + take.size] = take
    req = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    la = max(1, int(lookahead_ms * SR / 1000.0))
    # gain must already be reduced `la` samples before a peak
    g = minimum_filter1d(req, size=2 * la + 1, mode='nearest')
    # release ballistics at block rate
    nb = (n + block - 1) // block
    gp = np.pad(g, (0, nb * block - n), constant_values=1.0).reshape(nb, block).min(axis=1)
    rel = np.exp(-block / (SR * release_ms / 1000.0))
    out = np.empty(nb)
    cur = 1.0
    for i in range(nb):
        v = gp[i]
        cur = v if v < cur else rel * cur + (1 - rel) * v
        out[i] = cur
    gs = np.repeat(out, block)[:n]
    # smooth steps (box filter = look-ahead length keeps the minimum reached at the peak)
    k = la
    cs = np.concatenate([[0.0], np.cumsum(gs)])
    sm = (cs[k:] - cs[:-k]) / k
    gs2 = np.concatenate([sm, np.full(k - 1, sm[-1])])[:n]
    gs2 = np.minimum(gs2, g)          # never exceed the hard requirement
    y = x * gs2[None, :]
    return y.astype(np.float32), float(a2db(gs2.min()))


# ----------------------------------------------------------------------------
# Synthetic convolution hall
# ----------------------------------------------------------------------------
def make_hall_ir(rt60=2.6, seed=1, predelay=0.022, length=None, lf_mult=1.25,
                 hf_mult=0.42, er_count=16, er_span=0.075, er_level=0.5):
    """True-stereo IR set (LL, LR, RL, RR) with frequency-dependent decay."""
    rng = np.random.default_rng(seed)
    L = int(SR * (length if length else rt60 * 1.3 + predelay + 0.1))
    t = np.arange(L) / SR
    f = np.fft.rfftfreq(L, 1.0 / SR)
    centers = np.array([63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], float)
    mult = np.interp(np.log2(centers), np.log2([63, 250, 1000, 4000, 8000, 16000]),
                     [lf_mult, 1.08, 1.0, 0.78, hf_mult, hf_mult * 0.65])
    rts = rt60 * mult
    # raised-cosine crossover weights on a log axis (sum to one)
    lf = np.log2(np.maximum(f, 1.0))
    lc = np.log2(centers)
    W = np.zeros((len(centers), f.size))
    for i in range(len(centers)):
        d = (lf - lc[i])
        w = np.where(np.abs(d) < 1.0, 0.5 + 0.5 * np.cos(np.pi * d), 0.0)
        if i == 0:
            w = np.where(lf < lc[0], 1.0, w)
        if i == len(centers) - 1:
            w = np.where(lf > lc[-1], 1.0, w)
        W[i] = w
    W /= W.sum(axis=0, keepdims=True) + 1e-12
    W[:, f < 20] *= np.clip(f[f < 20] / 20.0, 0, 1)
    pd = int(predelay * SR)
    onset = np.clip((t - predelay) / 0.004, 0, 1)
    build = 1.0 - np.exp(-np.maximum(t - predelay, 0) / 0.028)
    irs = []
    for ch in range(4):
        X = np.fft.rfft(rng.standard_normal(L))
        tail = np.zeros(L)
        for i in range(len(centers)):
            band = np.fft.irfft(X * W[i], L)
            tail += band * np.exp(-6.9078 * np.maximum(t - predelay, 0) / rts[i])
        tail *= onset * build
        # early reflections: sparse taps, slightly low-passed, decaying
        er = np.zeros(L)
        direct_side = ch in (0, 3)
        for k in range(er_count):
            d = predelay * 0.35 + rng.uniform(0, er_span) * (k + 1) / er_count
            idx = int(d * SR)
            g = er_level * rng.uniform(0.4, 1.0) * np.exp(-d / 0.045) * (1.0 if direct_side else 0.7)
            g *= rng.choice([-1.0, 1.0])
            if idx < L:
                er[idx] += g
        er = one_pole_lp(er, 6000.0)
        ir = tail / np.sqrt(np.sum(tail ** 2)) + er * 0.35
        ir /= np.sqrt(np.sum(ir ** 2))
        ir *= np.sqrt(0.5)                    # each path carries half the energy
        fade = np.ones(L)
        nf = int(0.05 * SR)
        fade[-nf:] = np.linspace(1, 0, nf)
        irs.append((ir * fade).astype(np.float64))
    return irs


def convolve_true_stereo(x, irs):
    n = x.shape[1]
    m = len(irs[0])
    nfft = sfft.next_fast_len(n + m - 1, real=True)
    XL = sfft.rfft(x[0].astype(np.float64), nfft, workers=2)
    XR = sfft.rfft(x[1].astype(np.float64), nfft, workers=2)
    H = [sfft.rfft(h, nfft, workers=2) for h in irs]
    yL = sfft.irfft(XL * H[0] + XR * H[2], nfft, workers=2)[:n]
    yR = sfft.irfft(XL * H[1] + XR * H[3], nfft, workers=2)[:n]
    return np.stack([yL, yR]).astype(np.float32)


# ----------------------------------------------------------------------------
# Misc helpers
# ----------------------------------------------------------------------------
def stft_filter(x, mask_fn, nper=2048):
    """Time-varying spectral gain: mask_fn(freqs[:,None], times[None,:])."""
    nover = nper * 3 // 4
    f, t, Z = signal.stft(x, SR, nperseg=nper, noverlap=nover, boundary='zeros', padded=True)
    M = mask_fn(f[:, None], t[None, :])
    _, y = signal.istft(Z * M, SR, nperseg=nper, noverlap=nover)
    y = y[: x.shape[-1]]
    if y.shape[-1] < x.shape[-1]:
        y = np.pad(y, (0, x.shape[-1] - y.shape[-1]))
    return y.astype(np.float32)


def smooth(x, win_s):
    k = max(1, int(win_s * SR))
    if k <= 1:
        return x
    cs = np.concatenate([[0.0], np.cumsum(x, dtype=np.float64)])
    half = k // 2
    idx_hi = np.minimum(np.arange(x.size) + half + 1, x.size)
    idx_lo = np.maximum(np.arange(x.size) - half, 0)
    return (cs[idx_hi] - cs[idx_lo]) / (idx_hi - idx_lo)
