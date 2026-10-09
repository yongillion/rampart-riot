"""Instrument / effects engine for the Rampart Riot soundtrack.

All instruments are synthesised from scratch with numpy:

* Band-limited wavetable oscillators (additive spectra rendered per semitone,
  harmonics capped at 16 kHz) with a brightness axis: interpolating between
  phase-aligned tables gives smooth time-varying spectra (brass "opening up",
  string dynamics, choir vowels) without per-sample filters.
* Sustained sections (strings, brass, woodwinds, choir) are rendered as
  continuous legato *lines* with glides, ensemble voices (detune, timing
  spread, independent delayed vibrato and drift) and noise layers (bow,
  breath, aspiration).
* Plucked strings and harp: vectorised Karplus-Strong with fractional delay.
* Mallets, bells, piano and drums: modal / additive synthesis with
  per-partial exponential decays.
"""
import numpy as np
from scipy import signal

from .dsp import SR, db2a, stable_seed, one_pole_lp, smooth, stft_filter

TWO_PI = 2.0 * np.pi


def midi2hz(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


def pan_lr(p):
    th = (float(np.clip(p, -1.0, 1.0)) + 1.0) * (np.pi / 4.0)
    return float(np.cos(th)), float(np.sin(th))


def slow_noise(n, rng, rate, sr=SR):
    """Smooth random curve (unit variance points every 1/rate s, cosine interp)."""
    m = int(n / sr * rate) + 3
    pts = rng.standard_normal(m)
    x = np.linspace(0.0, m - 2.0, n)
    i = x.astype(np.int64)
    fr = x - i
    w = 0.5 - 0.5 * np.cos(np.pi * fr)
    return pts[i] * (1.0 - w) + pts[i + 1] * w


def fade_edges(y, fin=0.0015, fout=0.004):
    a = min(int(fin * SR), y.shape[-1] // 4)
    b = min(int(fout * SR), y.shape[-1] // 4)
    if a > 0:
        y[..., :a] *= np.linspace(0.0, 1.0, a, dtype=np.float32)
    if b > 0:
        y[..., -b:] *= np.linspace(1.0, 0.0, b, dtype=np.float32)
    return y


def add_into(out, off, wav):
    n_total = out.shape[1]
    n = wav.shape[-1]
    if off >= n_total or off + n <= 0:
        return
    a = max(0, off)
    b = min(n_total, off + n)
    out[:, a:b] += wav[..., a - off: b - off]


# ----------------------------------------------------------------------------
# Noise banks: long, circularly filtered noise buffers sliced at random offsets
# ----------------------------------------------------------------------------
FORMANTS = {
    ('a', 's'): ([800, 1150, 2900, 3900, 4950], [0, -6, -32, -20, -50], [80, 90, 120, 130, 140]),
    ('o', 's'): ([450, 800, 2830, 3800, 4950], [0, -11, -22, -22, -50], [70, 80, 100, 130, 135]),
    ('u', 's'): ([325, 700, 2700, 3800, 4950], [0, -16, -35, -40, -60], [50, 60, 170, 180, 200]),
    ('a', 'a'): ([800, 1150, 2800, 3500, 4950], [0, -4, -20, -36, -60], [80, 90, 120, 130, 140]),
    ('o', 'a'): ([450, 800, 2830, 3500, 4950], [0, -9, -16, -28, -55], [70, 80, 100, 130, 135]),
    ('u', 'a'): ([325, 700, 2530, 3500, 4950], [0, -12, -30, -40, -64], [50, 60, 170, 180, 200]),
    ('a', 't'): ([650, 1080, 2650, 2900, 3250], [0, -6, -7, -8, -22], [80, 90, 120, 130, 140]),
    ('o', 't'): ([400, 800, 2600, 2800, 3000], [0, -10, -12, -12, -26], [40, 80, 100, 120, 120]),
    ('u', 't'): ([350, 600, 2700, 2900, 3300], [0, -20, -17, -14, -26], [40, 60, 100, 120, 120]),
    ('a', 'b'): ([600, 1040, 2250, 2450, 2750], [0, -7, -9, -9, -20], [60, 70, 110, 120, 130]),
    ('o', 'b'): ([400, 750, 2400, 2600, 2900], [0, -11, -21, -20, -40], [40, 80, 100, 120, 120]),
    ('u', 'b'): ([350, 600, 2400, 2675, 2950], [0, -20, -32, -28, -36], [40, 80, 100, 120, 120]),
}


def formant_env(f, vowel, vtype, bw_mult=1.7):
    fr, amps, bws = FORMANTS[(vowel, vtype)]
    e = np.zeros_like(np.asarray(f, dtype=np.float64))
    for F, A, Bw in zip(fr, amps, bws):
        e += db2a(A) / np.sqrt(1.0 + ((f - F) / (Bw * bw_mult * 0.5)) ** 2)
    return e + 0.004


def _noise_shape(name, f, args):
    f = np.maximum(f, 1.0)
    if name == 'bp':
        lo, hi = args
        return 1.0 / np.sqrt(1 + (lo / f) ** 4) / np.sqrt(1 + (f / hi) ** 8) / np.sqrt(1 + (f / 14000.0) ** 12)
    if name == 'lp':
        return 1.0 / np.sqrt(1 + (f / args[0]) ** 6) / np.sqrt(1 + (f / 14000.0) ** 12)
    if name == 'hp':
        return 1.0 / np.sqrt(1 + (args[0] / f) ** 4) / np.sqrt(1 + (f / 16000.0) ** 8)
    if name == 'formant':
        vowel, vtype = args
        return formant_env(f, vowel, vtype, 2.2) * (f / 500.0) ** -0.3 / np.sqrt(1 + (f / 7000.0) ** 4) \
            / np.sqrt(1 + (150.0 / f) ** 4)
    if name == 'cym':
        base = 1.0 / np.sqrt(1 + (450.0 / f) ** 4) / np.sqrt(1 + (f / 13000.0) ** 6)
        bumps = 1.0 + 0.8 * np.exp(-0.5 * (np.log2(f / 3500.0) / 0.6) ** 2) \
            + 0.5 * np.exp(-0.5 * (np.log2(f / 7500.0) / 0.4) ** 2)
        return base * bumps * (f / 3000.0) ** -0.25
    if name == 'pink':
        return (f / 200.0) ** -0.5 / np.sqrt(1 + (20.0 / f) ** 4)
    raise ValueError(name)


_NOISE = {}


def noise_buf(name, *args):
    key = (name,) + tuple(args)
    buf = _NOISE.get(key)
    if buf is None:
        rng = np.random.default_rng(stable_seed('noise', key))
        L = 1 << 19
        X = np.fft.rfft(rng.standard_normal(L))
        f = np.fft.rfftfreq(L, 1.0 / SR)
        y = np.fft.irfft(X * _noise_shape(name, f, args), L)
        y /= np.sqrt(np.mean(y ** 2)) + 1e-12
        buf = y.astype(np.float32)
        _NOISE[key] = buf
    return buf


def noise_slice(rng, n, name, *args):
    buf = noise_buf(name, *args)
    L = buf.size
    s = int(rng.integers(0, L))
    if s + n <= L:
        return buf[s:s + n].copy()
    return np.take(buf, np.arange(s, s + n), mode='wrap')


# ----------------------------------------------------------------------------
# Band-limited wavetables with a brightness axis
# ----------------------------------------------------------------------------
class WTBank:
    L = 2048

    def __init__(self, spec_fn, nb=6, phase='random', fmax=16000.0, seed=7):
        self.spec_fn = spec_fn
        self.nb = nb
        self.fmax = fmax
        rng = np.random.default_rng(seed)
        if phase == 'random':
            self.phases = rng.uniform(0, TWO_PI, self.L // 2 + 1)
        else:   # coherent (sawtooth-like) phases: sharper, pulse-like waveform
            self.phases = np.full(self.L // 2 + 1, -np.pi / 2)
        self.tabs = {}

    def get(self, m):
        t = self.tabs.get(m)
        if t is None:
            t = self._build(m)
            self.tabs[m] = t
        return t

    def _build(self, m):
        L = self.L
        f0 = float(midi2hz(m))
        kmax = int(min(self.fmax, 0.45 * SR) / (f0 * 1.035))
        kmax = max(1, min(kmax, L // 2 - 2))
        k = np.arange(1, kmax + 1, dtype=np.float64)
        fk = k * f0
        tabs = np.empty((self.nb, L + 1), np.float32)
        # smooth taper 11 kHz -> fmax so band-limited tables roll off instead of stopping dead
        taper = np.cos(0.5 * np.pi * np.clip((fk - 11000.0) / (self.fmax - 11000.0), 0.0, 1.0)) ** 2
        for j, b in enumerate(np.linspace(0.0, 1.0, self.nb)):
            a = np.asarray(self.spec_fn(fk, k, f0, b), dtype=np.float64) * taper
            spec = np.zeros(L // 2 + 1, np.complex128)
            spec[1:kmax + 1] = a * np.exp(1j * self.phases[1:kmax + 1])
            w = np.fft.irfft(spec, L)
            w *= 1.0 / (np.sqrt(np.mean(w ** 2)) * np.sqrt(2.0) + 1e-12)
            tabs[j, :L] = w
            tabs[j, L] = w[0]
        return tabs


def lookup2(tabs, ph, B):
    nb, L1 = tabs.shape
    L = L1 - 1
    idx = ph * L
    i0 = idx.astype(np.int64)
    np.minimum(i0, L - 1, out=i0)
    fr = (idx - i0).astype(np.float32)
    flat = tabs.reshape(-1)
    bb = np.clip(B, 0.0, 1.0) * (nb - 1)
    j0 = np.minimum(bb.astype(np.int64), nb - 2)
    bf = (bb - j0).astype(np.float32)
    base = j0 * L1 + i0
    a0 = flat[base]
    lo = a0 + fr * (flat[base + 1] - a0)
    base += L1
    b0 = flat[base]
    hi = b0 + fr * (flat[base + 1] - b0)
    return lo + bf * (hi - lo)


def wt_osc(segs, P, B, ph0):
    """segs: [(start, end, tables)] covering the line; P: midi pitch per sample."""
    f = 440.0 * np.exp2((P - 69.0) / 12.0)
    ph = np.cumsum(f) * (1.0 / SR)
    ph += ph0
    ph -= np.floor(ph)
    n = P.size
    if len(segs) == 1:
        return lookup2(segs[0][2], ph, B)
    out = np.zeros(n, np.float32)
    minlen = min(max(2, b - a) for a, b, _ in segs)
    XF = max(2, min(int(0.015 * SR), minlen))
    h = XF // 2
    last = len(segs) - 1
    for i, (a, b, tabs) in enumerate(segs):
        lo = 0 if i == 0 else max(0, a - h)
        hi = n if i == last else min(n, b + h)
        if hi <= lo:
            continue
        seg = lookup2(tabs, ph[lo:hi], B[lo:hi])
        x = np.arange(lo, hi)
        if i > 0:
            seg *= np.clip((x - (a - h)) / (2 * h), 0, 1).astype(np.float32)
        if i < last:
            seg *= np.clip(((b + h) - x) / (2 * h), 0, 1).astype(np.float32)
        out[lo:hi] += seg
    return out


# ---------------------------- spectra ---------------------------------------
def spec_strings(fc_lo, fc_hi):
    def fn(fk, k, f0, b):
        fc = fc_lo * (fc_hi / fc_lo) ** b
        return (1.0 / k) / np.sqrt(1.0 + (fk / fc) ** 4) / np.sqrt(1.0 + (fk / 11000.0) ** 6)
    return fn


def spec_brass(fc_lo, fc_hi, f_peak, peak_db, low_cut, tilt=0.45, order=2.6):
    gp = float(db2a(peak_db))

    def fn(fk, k, f0, b):
        fc = fc_lo * (fc_hi / fc_lo) ** b
        lp = 1.0 / np.sqrt(1.0 + (fk / fc) ** (2 * order))
        pk = 1.0 + (gp - 1.0) / (1.0 + ((fk - f_peak) / (f_peak * 0.7)) ** 2)
        lc = 1.0 / np.sqrt(1.0 + (low_cut / fk) ** 2)
        return k ** (-tilt) * lp * pk * lc / np.sqrt(1.0 + (fk / 10000.0) ** 6)
    return fn


def spec_flute(fk, k, f0, b):
    a = k ** (-(2.6 - 1.0 * b))
    a = np.where(k == 2, 0.28 + 0.22 * b, a)
    a = np.where(k == 3, 0.10 + 0.10 * b, a)
    return a / np.sqrt(1 + (fk / (3000 + 3000 * b)) ** 4)


def spec_oboe(fk, k, f0, b):
    f1 = 1.0 / (1.0 + ((fk - 1150.0) / 450.0) ** 2)
    f2 = 0.45 / (1.0 + ((fk - 2900.0) / 700.0) ** 2)
    base = 0.25 * k ** (-0.6)
    lc = 1.0 / np.sqrt(1.0 + (500.0 / fk) ** 2)
    return (base + f1 + f2) * lc / np.sqrt(1.0 + (fk / (3500 + 4000 * b)) ** 4)


def spec_clarinet(fk, k, f0, b):
    odd = (k % 2 == 1)
    evenw = 0.06 + 0.9 * np.clip((fk - 1600.0) / 2500.0, 0, 1)
    a = k ** (-0.75) * np.where(odd, 1.0, evenw)
    return a / np.sqrt(1.0 + (fk / (1800 + 3500 * b)) ** 4)


def spec_bassoon(fk, k, f0, b):
    f1 = 1.0 / (1.0 + ((fk - 480.0) / 220.0) ** 2)
    f2 = 0.4 / (1.0 + ((fk - 1180.0) / 350.0) ** 2)
    base = 0.2 * k ** (-0.5)
    lc = 1.0 / np.sqrt(1.0 + (90.0 / fk) ** 2)
    return (base + f1 + f2) * lc / np.sqrt(1.0 + (fk / (1500 + 2500 * b)) ** 4)


def spec_choir(vowel, vtype):
    def fn(fk, k, f0, b):
        src = k ** (-(1.55 - 0.6 * b))
        return src * formant_env(fk, vowel, vtype) / np.sqrt(1.0 + (fk / (4000 + 2500 * b)) ** 4)
    return fn


# ----------------------------------------------------------------------------
# Karplus-Strong (block-vectorised, fractional delay)
# ----------------------------------------------------------------------------
def ks_pluck(f0, n, t60, bright, rng, pos=0.2, s=0.5):
    P = SR / f0
    N = int(np.floor(P - s))
    frac = P - s - N
    if N < 3:
        N, frac = 3, 0.0
    g = 10.0 ** (-3.0 / (f0 * max(t60, 0.02)))
    c0 = (1 - s) * (1 - frac)
    c1 = (1 - s) * frac + s * (1 - frac)
    c2 = s * frac
    exc = rng.uniform(-1.0, 1.0, N)
    a = float(np.clip(0.92 * (1.0 - bright), 0.0, 0.95))
    if a > 0:
        exc = signal.lfilter([1 - a], [1, -a], exc)
        exc = signal.lfilter([1 - a], [1, -a], exc[::-1])[::-1]
    d = max(1, int(pos * N))
    exc = exc - np.roll(exc, d)
    exc -= exc.mean()
    exc /= np.max(np.abs(exc)) + 1e-9
    y = np.zeros(n + 2)
    y[2:2 + min(N, n)] = exc[:min(N, n)]
    m = N
    while m < n:
        k = min(N, n - m)
        y[2 + m: 2 + m + k] = g * (c0 * y[2 + m - N: 2 + m - N + k]
                                   + c1 * y[1 + m - N: 1 + m - N + k]
                                   + c2 * y[m - N: m - N + k])
        m += k
    return y[2:]


# ----------------------------------------------------------------------------
# Instrument base
# ----------------------------------------------------------------------------
class Ctx:
    def __init__(self, rng, expr_pts=None):
        self.rng = rng
        self.expr_pts = expr_pts

    def expr_arr(self, s0, n):
        if not self.expr_pts:
            return None
        ts, vs = self.expr_pts
        return np.interp((s0 + np.arange(n)) / SR, ts, vs)

    def expr_at(self, t):
        if not self.expr_pts:
            return 1.0
        ts, vs = self.expr_pts
        return float(np.interp(t, ts, vs))


def group_phrases(notes):
    singles, groups = [], {}
    for nt in notes:
        if nt.phrase is None:
            singles.append([nt])
        else:
            groups.setdefault(nt.phrase, []).append(nt)
    res = singles + [sorted(g, key=lambda x: x.t) for g in groups.values()]
    return res


class Inst:
    default_art = 'sustain'
    cacheable = ()
    dyn_db = 30.0
    n_rr = 4

    def __init__(self, pan=0.0, width=0.3, seed=0, **kw):
        self.pan = pan
        self.width = width
        self.seed = seed
        self.cache = {}
        self.rr_last = {}
        self.kw = kw

    def render_part(self, notes, n_total, ctx):
        out = np.zeros((2, n_total), np.float32)
        for grp in group_phrases(notes):
            art = grp[0].art or self.default_art
            if len(grp) == 1 and art in self.cacheable:
                res = self.render_cached(grp[0], art, ctx)
            else:
                res = self.render_phrase(grp, ctx)
            if res is None:
                continue
            off, wav = res
            add_into(out, off, wav)
        return out

    def quant_dur(self, d, art):
        return round(min(d, 8.0) * 8) / 8.0

    def cache_extra(self, note):
        return ()

    def render_cached(self, note, art, ctx):
        vq = max(0.1, round(note.vel * 10) / 10.0)
        dq = self.quant_dur(note.dur, art)
        mq = round(note.midi * 4) / 4.0
        base = (art, mq, vq, dq) + self.cache_extra(note)
        last = self.rr_last.get(base, -1)
        rr = int(ctx.rng.integers(0, self.n_rr - 1))
        if rr >= last:
            rr += 1
        rr %= self.n_rr
        self.rr_last[base] = rr
        key = base + (rr,)
        hit = self.cache.get(key)
        if hit is None:
            proto = note.clone(t=0.0, vel=vq, dur=max(dq, 0.03), midi=mq, vel_end=None)
            sub = Ctx(np.random.default_rng(stable_seed(self.seed, key)), None)
            res = self.render_phrase([proto], sub)
            if res is None:
                return None
            hit = res
            self.cache[key] = hit
        off, wav = hit
        scale = float(db2a(self.dyn_db * (note.vel - vq))) * ctx.expr_at(note.t)
        po = note.kw.get('pan_off', 0.0)
        if po:
            gl, gr = pan_lr(po)
            wav = wav * np.array([[gl / 0.7071], [gr / 0.7071]], np.float32)
        return int(round(note.t * SR)) + off, wav * scale

    def render_phrase(self, notes, ctx):
        raise NotImplementedError


# ----------------------------------------------------------------------------
# Generic sustained "line" instrument (strings / brass / winds / choir)
# ----------------------------------------------------------------------------
class LineInst(Inst):
    nv = 1
    spread = 0.0
    detune = (0.0, 0.0)
    vib_rate = (5.0, 6.0)
    vib_depth = (0.0, 0.0)
    vib_delay = 0.3
    vib_ramp = 0.4
    amp_vib = 0.0
    drift_c = 2.0
    drift_rate = 0.7
    glide = 0.05
    haas_ms = 0.0

    def tables(self, note, mi):
        return self.bank.get(mi)

    def params(self, art, note):
        return dict(att=0.1, shape='cos', over=0.0, over_tau=0.1, rel=0.3, decay=None, hold=None,
                    dip_db=1.0, b0=0.1, bv=0.75, b_dark=0.2, b_tau=0.1, b_over=0.0,
                    scoop=0.0, scoop_tau=0.03, trem=False, noise=0.0, burst=0.0)

    def noise_layer(self, nc, A, tso, stren, p, rng, notes):
        return None

    def pitch_extra(self, nc, tt, on, dur, notes, p):
        return None

    def vibrato(self, nk, tso_k, rng, ksr):
        """Control-rate vibrato: returns (pitch deviation in semitones, unit curve)."""
        rate = rng.uniform(*self.vib_rate)
        depth = rng.uniform(*self.vib_depth) / 100.0
        wob = 1.0 + 0.05 * slow_noise(nk, rng, 0.8, ksr)
        ph = TWO_PI * np.cumsum(rate * wob) / ksr + rng.uniform(0, TWO_PI)
        denv = np.clip((tso_k - self.vib_delay) / self.vib_ramp, 0.0, 1.0)
        s = np.sin(ph) * denv
        return depth * s, s

    def render_phrase(self, notes, ctx):
        rng = ctx.rng
        art = notes[0].art or self.default_art
        p = self.params(art, notes[0])
        s0 = int(round(notes[0].t * SR))
        k = len(notes)
        on = np.array([int(round(nt.t * SR)) - s0 for nt in notes], dtype=np.int64)
        on[0] = 0
        for i in range(1, k):
            on[i] = max(on[i], on[i - 1] + 64)
        dur = np.array([max(int(round(nt.dur * SR)), 32) for nt in notes], dtype=np.int64)
        if p['hold'] is not None:
            dur = np.minimum(dur, int(p['hold'] * SR))
        e_last = int(on[-1] + dur[-1])
        nc = e_last + int(p['rel'] * SR) + 64
        tt = np.arange(nc)
        idx = np.searchsorted(on, tt, side='right') - 1
        tso = (tt - on[idx]) / SR
        stren = np.ones(k)
        for i in range(1, k):
            gap = on[i] - (on[i - 1] + dur[i - 1])
            slur = notes[i].kw.get('slur', True) and abs(notes[i].midi - notes[i - 1].midi) > 0.01 \
                and gap < int(0.05 * SR)
            stren[i] = 0.22 if slur else 1.0
        st_arr = stren[idx]
        # ---- pitch curve (with legato glides) ----
        g = max(1, int(self.glide * SR))
        if k == 1:
            P = np.full(nc, float(notes[0].midi))
        else:
            bt, bv = [0], [float(notes[0].midi)]
            for i in range(1, k):
                gs = max(bt[-1] + 1, on[i] - int(0.35 * g))
                ge = max(gs + 1, on[i] + int(0.65 * g))
                bt += [gs, ge]
                bv += [float(notes[i - 1].midi), float(notes[i].midi)]
            bt.append(max(nc - 1, bt[-1] + 1))
            bv.append(float(notes[-1].midi))
            P = smooth(np.interp(tt, bt, bv), 0.012)
        pe = self.pitch_extra(nc, tt, on, dur, notes, p)
        if pe is not None:
            P = P + pe
        # ---- dynamics ----
        vt, vv = [], []
        for i, nt in enumerate(notes):
            a = int(on[i])
            b = int(on[i + 1] - 1) if i + 1 < k else int(on[i] + dur[i])
            ve = nt.vel if nt.vel_end is None else nt.vel_end
            vt += [a, max(a + 1, b)]
            vv += [nt.vel, ve]
        V = np.interp(tt, vt, vv)
        if k > 1:
            V = smooth(V, 0.05)
        ex = ctx.expr_arr(s0, nc)
        if ex is not None:
            V = V * ex
        V = np.clip(V, 0.0, 1.25)
        level = db2a(self.dyn_db * (V - 1.0)) * p.get('gain', 1.0)
        att = max(0.003, p['att'])
        x = np.clip(tt / (att * SR), 0.0, 1.0)
        if p['shape'] == 'cos':
            aenv = 0.5 - 0.5 * np.cos(np.pi * x)
        else:
            aenv = 1.0 - (1.0 - x) ** 2.4
        A = level * aenv
        acc = np.zeros(nc)
        anyacc = False
        for i in range(k):
            o = p['over'] * stren[i] + notes[i].kw.get('accent', 0.0)
            if o > 0:
                anyacc = True
                seg = tt[on[i]:] - on[i]
                acc[on[i]:] += o * np.exp(-seg / (p['over_tau'] * SR)) * (1.0 - np.exp(-seg / (0.004 * SR)))
        if anyacc:
            A = A * (1.0 + acc)
        if p['decay']:
            A = A * np.exp(-tso / p['decay'])
        if k > 1:
            dip = np.zeros(nc)
            w = int(0.06 * SR)
            win = np.hanning(2 * w + 1)
            for i in range(1, k):
                ddb = p['dip_db'] if stren[i] < 0.5 else p['dip_db'] * 2.5 + 3.0
                d = 1.0 - float(db2a(-ddb))
                a = int(on[i]) - w
                lo, hi = max(0, a), min(nc, int(on[i]) + w + 1)
                dip[lo:hi] = np.maximum(dip[lo:hi], d * win[lo - a: hi - a])
            A = A * (1.0 - dip)
        rel_t = (tt - e_last) / SR
        renv = np.where(rel_t > 0, np.exp(-6.9 * np.maximum(rel_t, 0) / max(p['rel'], 0.01)), 1.0)
        A = A * renv
        A = smooth(A, 0.002)
        A[:32] *= np.linspace(0.0, 1.0, 32)        # exact zero start after smoothing
        A[-48:] *= np.linspace(1.0, 0.0, 48)
        # ---- brightness ----
        B = p['b0'] + p['bv'] * np.clip(V, 0.0, 1.15)
        B = B - p['b_dark'] * st_arr * np.exp(-tso / max(p['b_tau'], 0.004))
        if p['b_over']:
            B = B + p['b_over'] * st_arr * np.exp(-tso / 0.14) * (1.0 - np.exp(-tso / 0.02))
        B = B * (0.6 + 0.4 * renv)
        B = np.clip(smooth(B, 0.006), 0.0, 1.0)
        # ---- table segments ----
        if k == 1:
            segs = [(0, nc, self.tables(notes[0], int(round(notes[0].midi))))]
        else:
            starts = [0]
            for i in range(1, k):
                up = notes[i].midi > notes[i - 1].midi
                sw = on[i] - int(0.35 * g) if up else on[i] + int(0.65 * g)
                starts.append(int(np.clip(sw, starts[-1] + 2, nc - 2)))
            segs = []
            for i in range(k):
                a = starts[i]
                b = starts[i + 1] if i + 1 < k else nc
                segs.append((a, b, self.tables(notes[i], int(round(notes[i].midi)))))
        # control-rate grid for per-voice modulation (pitch deviation, AM)
        KR = 32
        ksr = SR / KR
        tk = np.arange(0, nc, KR)
        if tk[-1] != nc - 1:
            tk = np.append(tk, nc - 1)
        nk = tk.size
        tso_k = tso[tk]
        scp_k = 0.0
        if p['scoop']:
            scp_k = (p['scoop'] / 100.0) * st_arr[tk] * np.exp(-tso_k / p['scoop_tau'])
        # ---- ensemble voices ----
        nv = self.nv
        if nv > 1 and self.spread > 0:
            offs = (rng.uniform(0, self.spread, nv) * SR).astype(np.int64)
            offs -= offs.min()
        else:
            offs = np.zeros(nv, np.int64)
        max_dh = int(self.haas_ms * SR / 1000.0) + 1
        out = np.zeros((2, nc + int(offs.max()) + max_dh), np.float32)
        positions = (rng.permutation(nv) / max(1, nv - 1) - 0.5) if nv > 1 else np.zeros(1)
        pan_base = self.pan + notes[0].kw.get('pan_off', 0.0)
        A32 = A.astype(np.float32)
        for v in range(nv):
            det = 0.0
            if nv > 1:
                det = rng.uniform(*self.detune) * (1.0 if v % 2 == 0 else -1.0)
                if v == 0:
                    det *= 0.25
            dev = det / 100.0 + scp_k + np.zeros(nk)
            avib = None
            if self.vib_depth[1] > 0:
                pv, avib = self.vibrato(nk, tso_k, rng, ksr)
                dev = dev + pv
            if self.drift_c > 0:
                dev = dev + (self.drift_c / 100.0) * slow_noise(nk, rng, self.drift_rate, ksr)
            Pv = P + np.interp(tt, tk, dev)
            sig = wt_osc(segs, Pv, B, rng.uniform()) * A32
            if self.amp_vib and avib is not None:
                sig *= (1.0 + self.amp_vib * np.interp(tt, tk, avib)).astype(np.float32)
            if p['trem']:
                sig *= np.interp(tt, tk, self.trem_am(nk, rng, ksr)).astype(np.float32)
            gl, gr = pan_lr(pan_base + self.width * positions[v])
            o = int(offs[v])
            dh = int(round(abs(positions[v]) * 2.0 * self.haas_ms * SR / 1000.0))
            oL = o + (dh if positions[v] > 0 else 0)
            oR = o + (dh if positions[v] < 0 else 0)
            out[0, oL:oL + nc] += gl * sig
            out[1, oR:oR + nc] += gr * sig
        out *= np.float32(1.0 / np.sqrt(nv))
        nz = self.noise_layer(nc, A, tso, st_arr, p, rng, notes)
        if nz is not None:
            gl, gr = pan_lr(pan_base)
            out[0, :nc] += gl * nz
            out[1, :nc] += gr * nz
        return s0, out

    def trem_am(self, nk, rng, ksr):
        rate = rng.uniform(11.5, 15.5)
        wob = 1.0 + 0.08 * slow_noise(nk, rng, 1.5, ksr)
        ph = TWO_PI * np.cumsum(rate * wob) / ksr + rng.uniform(0, TWO_PI)
        s = 0.5 + 0.5 * np.sin(ph)
        return (1.0 - 0.6 * s ** 2) / 0.78


# ------------------------------ strings -------------------------------------
class Strings(LineInst):
    CFG = {
        'violins': dict(nv=6, fc=(1700, 8000), det=(6, 14), vib=(5.0, 6.1), vdep=(9, 15),
                        pizz_t60=0.42, bow=(2500, 8000), body_pizz=(450, 2.5)),
        'violas': dict(nv=5, fc=(1300, 6000), det=(6, 13), vib=(4.9, 5.9), vdep=(8, 14),
                       pizz_t60=0.6, bow=(2000, 6500), body_pizz=(350, 2.5)),
        'cellos': dict(nv=5, fc=(900, 4500), det=(6, 12), vib=(4.8, 5.8), vdep=(8, 13),
                       pizz_t60=0.95, bow=(1500, 5000), body_pizz=(200, 2.0)),
        'basses': dict(nv=4, fc=(500, 2600), det=(5, 10), vib=(4.6, 5.4), vdep=(6, 10),
                       pizz_t60=1.4, bow=(800, 3500), body_pizz=(100, 2.0)),
    }
    cacheable = ('spiccato', 'staccato', 'pizz', 'colLegno')
    default_art = 'sustain'

    def __init__(self, section='violins', **kw):
        super().__init__(**kw)
        c = self.CFG[section]
        self.c = c
        self.section = section
        self.nv = kw.get('nv', c['nv'])
        self.detune = c['det']
        self.spread = 0.011
        self.vib_rate = c['vib']
        self.vib_depth = c['vdep']
        self.vib_delay = 0.26
        self.vib_ramp = 0.35
        self.glide = 0.075
        self.drift_c = 3.0
        self.haas_ms = 0.35
        self.bank = WTBank(spec_strings(*c['fc']), nb=6, phase='random',
                           seed=stable_seed('strings', section))

    def params(self, art, note):
        V = note.vel
        p = dict(att=0.10 + 0.30 * (1 - V), shape='cos', over=0.0, over_tau=0.12, rel=0.38, decay=None,
                 hold=None, dip_db=1.2, b0=0.08, bv=0.72, b_dark=0.15, b_tau=0.15, b_over=0.0,
                 scoop=0.0, scoop_tau=0.03, trem=False, noise=0.010, burst=0.03)
        if art == 'legato':
            p.update(att=0.07 + 0.26 * (1 - V), rel=0.32)
        elif art == 'sustain':
            p.update(rel=0.45)
        elif art == 'marcato':
            p.update(att=0.028, shape='fast', over=0.55, over_tau=0.14, rel=0.24, b_over=0.12, burst=0.08)
        elif art == 'spiccato':
            p.update(att=0.007, shape='fast', decay=0.065, hold=0.11, rel=0.07, b0=0.22, b_dark=0.0,
                     burst=0.12, noise=0.02, gain=1.7)
        elif art == 'staccato':
            p.update(att=0.013, shape='fast', decay=0.15, hold=0.24, rel=0.09, b0=0.17, b_dark=0.05,
                     burst=0.08, gain=1.35)
        elif art == 'tremolo':
            p.update(att=0.05 + 0.22 * (1 - V), trem=True, rel=0.3, noise=0.03, b0=0.15)
        return p

    def noise_layer(self, nc, A, tso, stren, p, rng, notes):
        lo, hi = self.c['bow']
        nz = noise_slice(rng, nc, 'bp', lo, hi)
        env = A * (p['noise'] + p['burst'] * stren * np.exp(-tso / 0.05) * (1.0 - np.exp(-tso / 0.003)))
        return (nz * env).astype(np.float32)

    def quant_dur(self, d, art):
        if art in ('pizz', 'colLegno'):
            return 0.0
        return round(min(d, 0.6) * 20) / 20.0

    def render_phrase(self, notes, ctx):
        art = notes[0].art or self.default_art
        if art in ('pizz', 'colLegno'):
            return self.render_pluck(notes[0], ctx, art)
        return super().render_phrase(notes, ctx)

    def render_pluck(self, note, ctx, art):
        rng = ctx.rng
        f0 = float(midi2hz(note.midi))
        V = note.vel
        if art == 'pizz':
            t60 = self.c['pizz_t60'] * float(np.clip(2 ** (-(note.midi - 55) / 30.0), 0.5, 1.6))
            bright = 0.3 + 0.4 * V
        else:
            t60 = 0.13
            bright = 0.5
        n = int((t60 * 1.05 + 0.06) * SR)
        nvp = 3
        offs = (rng.uniform(0, 0.012, nvp) * SR).astype(int)
        offs -= offs.min()
        out = np.zeros((2, n + int(offs.max())), np.float32)
        for v in range(nvp):
            det = rng.uniform(-6, 6)
            y = ks_pluck(f0 * 2 ** (det / 1200), n, t60 * rng.uniform(0.85, 1.15), bright, rng, pos=0.2)
            if art == 'colLegno':
                click = noise_slice(rng, n, 'bp', 1500, 5500) * np.exp(-np.arange(n) / (0.004 * SR))
                y = 0.7 * y + 0.5 * click
            y = fade_edges(y.astype(np.float32), 0.0008, 0.01)
            gl, gr = pan_lr(self.pan + self.width * (v / (nvp - 1) - 0.5))
            o = int(offs[v])
            out[0, o:o + n] += gl * y
            out[1, o:o + n] += gr * y
        bf, bq = self.c['body_pizz']
        b, a = signal.iirpeak(bf, bq, fs=SR)
        body = signal.lfilter(b, a, out, axis=-1).astype(np.float32)
        out = 0.75 * out + 1.2 * body
        out *= np.float32(3.4 * db2a(self.dyn_db * (V - 1.0)) / np.sqrt(nvp))
        return int(round(note.t * SR)), out


# ------------------------------ brass ---------------------------------------
class Brass(LineInst):
    CFG = {
        'horn': dict(nv=3, det=(3, 7), spread=0.012, spec=(380, 3400, 420, 4.0, 60, 0.5),
                     att=0.07, scoop=-38, scoop_tau=0.035, breath=(500, 2200), breath_lvl=0.02),
        'trumpet': dict(nv=2, det=(3, 6), spread=0.008, spec=(900, 7000, 1300, 5.0, 300, 0.35),
                        att=0.035, scoop=-22, scoop_tau=0.025, breath=(1200, 5000), breath_lvl=0.015),
        'trombone': dict(nv=2, det=(3, 6), spread=0.010, spec=(480, 4800, 560, 4.0, 60, 0.4),
                         att=0.05, scoop=-32, scoop_tau=0.03, breath=(600, 2600), breath_lvl=0.018),
        'tuba': dict(nv=1, det=(0, 0), spread=0.0, spec=(200, 1800, 230, 3.0, 25, 0.5),
                     att=0.07, scoop=-28, scoop_tau=0.04, breath=(300, 1500), breath_lvl=0.02),
    }
    default_art = 'sustain'
    cacheable = ('stab', 'staccato')
    dyn_db = 28.0

    def __init__(self, kind='horn', **kw):
        super().__init__(**kw)
        c = self.CFG[kind]
        self.c = c
        self.kind = kind
        self.nv = kw.get('nv', c['nv'])
        self.detune = c['det']
        self.spread = c['spread']
        self.glide = 0.035
        self.vib_rate = (4.9, 5.6)
        self.vib_depth = (0.0, 4.0) if kind == 'trumpet' else (0.0, 0.0)
        self.drift_c = 2.5
        lo, hi, pk, pdb, lc, tilt = c['spec']
        self.bank = WTBank(spec_brass(lo, hi, pk, pdb, lc, tilt), nb=8, phase='coherent',
                           seed=stable_seed('brass', kind))

    def params(self, art, note):
        V = note.vel
        c = self.c
        p = dict(att=c['att'] * (1 + 0.8 * (1 - V)), shape='fast', over=0.12, over_tau=0.12, rel=0.16,
                 decay=None, hold=None, dip_db=2.0, b0=0.0, bv=0.85, b_dark=0.38,
                 b_tau=c['att'] * 1.6, b_over=0.06, scoop=c['scoop'], scoop_tau=c['scoop_tau'],
                 trem=False, noise=c['breath_lvl'], burst=c['breath_lvl'] * 3.0)
        if art == 'legato':
            p.update(over=0.08)
        elif art == 'marcato':
            p.update(att=c['att'] * 0.6, over=0.6, over_tau=0.16, b_over=0.18, rel=0.14)
        elif art == 'stab':
            p.update(att=0.016, over=0.9, over_tau=0.07, decay=0.22, hold=0.32, rel=0.12, b_over=0.25,
                     b_dark=0.15, b_tau=0.02)
        elif art == 'staccato':
            p.update(att=0.02, decay=0.12, hold=0.2, rel=0.09)
        elif art == 'swell':
            p.update(att=0.18, shape='cos', over=0.0, b_dark=0.1, rel=0.25)
        return p

    def quant_dur(self, d, art):
        return round(min(d, 0.5) * 20) / 20.0

    def render_phrase(self, notes, ctx):
        if (notes[0].art == 'swell') and notes[0].vel_end is None:
            notes = [notes[0].clone(vel=notes[0].vel * 0.3, vel_end=notes[0].vel)] + list(notes[1:])
        return super().render_phrase(notes, ctx)

    def noise_layer(self, nc, A, tso, stren, p, rng, notes):
        lo, hi = self.c['breath']
        nz = noise_slice(rng, nc, 'bp', lo, hi)
        env = A * (p['noise'] + p['burst'] * stren * np.exp(-tso / 0.03) * (1.0 - np.exp(-tso / 0.003)))
        return (nz * env).astype(np.float32)


# ------------------------------ woodwinds -----------------------------------
class Woodwind(LineInst):
    CFG = {
        'flute': dict(spec=spec_flute, att=0.06, vib=(4.8, 5.4), vdep=(10, 16), amp_vib=0.10,
                      breath=(1200, 7000), breath_lvl=0.035, chiff=0.10, phase='random'),
        'oboe': dict(spec=spec_oboe, att=0.035, vib=(5.2, 5.9), vdep=(8, 13), amp_vib=0.04,
                     breath=(1500, 6000), breath_lvl=0.010, chiff=0.03, phase='coherent'),
        'clarinet': dict(spec=spec_clarinet, att=0.04, vib=(5.0, 5.5), vdep=(0, 2), amp_vib=0.0,
                         breath=(1200, 5000), breath_lvl=0.012, chiff=0.03, phase='coherent'),
        'bassoon': dict(spec=spec_bassoon, att=0.045, vib=(4.8, 5.4), vdep=(5, 9), amp_vib=0.03,
                        breath=(600, 3000), breath_lvl=0.010, chiff=0.03, phase='coherent'),
    }
    default_art = 'legato'
    cacheable = ('staccato',)
    dyn_db = 24.0

    def __init__(self, kind='flute', **kw):
        super().__init__(**kw)
        c = self.CFG[kind]
        self.c = c
        self.kind = kind
        self.nv = kw.get('nv', 1)
        self.detune = (2, 5)
        self.spread = 0.01
        self.vib_rate = c['vib']
        self.vib_depth = c['vdep']
        self.vib_delay = 0.18
        self.vib_ramp = 0.3
        self.amp_vib = c['amp_vib']
        self.glide = 0.03
        self.drift_c = 2.0
        self.bank = WTBank(c['spec'], nb=6, phase=c['phase'], seed=stable_seed('ww', kind))

    def params(self, art, note):
        V = note.vel
        c = self.c
        p = dict(att=c['att'] * (1 + 0.6 * (1 - V)), shape='cos', over=0.05, over_tau=0.1, rel=0.13,
                 decay=None, hold=None, dip_db=0.8, b0=0.1, bv=0.7, b_dark=0.2, b_tau=0.05, b_over=0.0,
                 scoop=-8, scoop_tau=0.02, trem=False, noise=c['breath_lvl'], burst=c['chiff'])
        if art == 'staccato':
            p.update(att=0.015, shape='fast', decay=0.10, hold=0.16, rel=0.08)
        elif art == 'sustain':
            p.update(rel=0.2)
        return p

    def quant_dur(self, d, art):
        return round(min(d, 0.5) * 20) / 20.0

    def noise_layer(self, nc, A, tso, stren, p, rng, notes):
        lo, hi = self.c['breath']
        nz = noise_slice(rng, nc, 'bp', lo, hi)
        env = A * (p['noise'] + p['burst'] * stren * np.exp(-tso / 0.035) * (1.0 - np.exp(-tso / 0.003)))
        return (nz * env).astype(np.float32)


# ------------------------------ choir ---------------------------------------
class Choir(LineInst):
    default_art = 'sustain'
    cacheable = ('shout',)
    dyn_db = 28.0

    def __init__(self, vowel='a', **kw):
        super().__init__(**kw)
        self.vowel = vowel
        self.nv = kw.get('nv', 6)
        self.detune = (6, 16)
        self.spread = 0.03
        self.vib_rate = (4.5, 5.8)
        self.vib_depth = (10, 24)
        self.vib_delay = 0.35
        self.vib_ramp = 0.5
        self.glide = 0.09
        self.drift_c = 5.0
        self.haas_ms = 0.7
        self.banks = {}

    @staticmethod
    def vtype_for(m):
        if m >= 67:
            return 's'
        if m >= 59:
            return 'a'
        if m >= 50:
            return 't'
        return 'b'

    def tables(self, note, mi):
        vt = note.kw.get('vtype') or self.vtype_for(mi)
        vw = note.kw.get('vowel', self.vowel)
        key = (vw, vt)
        bank = self.banks.get(key)
        if bank is None:
            bank = WTBank(spec_choir(vw, vt), nb=5, phase='random', seed=stable_seed('choir', key))
            self.banks[key] = bank
        return bank.get(mi)

    def params(self, art, note):
        V = note.vel
        p = dict(att=0.25 + 0.4 * (1 - V), shape='cos', over=0.0, over_tau=0.2, rel=0.6, decay=None,
                 hold=None, dip_db=1.0, b0=0.1, bv=0.7, b_dark=0.15, b_tau=0.2, b_over=0.0,
                 scoop=-14, scoop_tau=0.07, trem=False, noise=0.035, burst=0.05)
        if art == 'shout':
            p.update(att=0.014, shape='fast', over=0.5, over_tau=0.08, decay=0.26, hold=0.36, rel=0.16,
                     b0=0.35, bv=0.6, b_dark=0.0, scoop=35, scoop_tau=0.03, noise=0.05, burst=0.55)
        elif art == 'stacc':
            p.update(att=0.03, shape='fast', decay=0.2, hold=0.3, rel=0.2, noise=0.04, burst=0.2)
        return p

    def quant_dur(self, d, art):
        return round(min(d, 0.5) * 20) / 20.0

    def pitch_extra(self, nc, tt, on, dur, notes, p):
        if notes[0].art == 'shout':
            end = on[-1] + dur[-1]
            return -0.7 * np.clip((tt - (end - 0.1 * SR)) / (0.14 * SR), 0, 1)
        return None

    def render_phrase(self, notes, ctx):
        if notes[0].art == 'shout':
            saved = self.vib_depth, self.spread
            self.vib_depth, self.spread = (0, 0), 0.018
            try:
                return super().render_phrase(notes, ctx)
            finally:
                self.vib_depth, self.spread = saved
        return super().render_phrase(notes, ctx)

    def noise_layer(self, nc, A, tso, stren, p, rng, notes):
        vt = notes[0].kw.get('vtype') or self.vtype_for(int(round(notes[0].midi)))
        vw = notes[0].kw.get('vowel', self.vowel)
        nz = noise_slice(rng, nc, 'formant', vw, vt)
        env = A * (p['noise'] + p['burst'] * stren * np.exp(-tso / 0.05) * (1.0 - np.exp(-tso / 0.003)))
        if notes[0].art == 'shout':  # breathy "h" leads the vowel
            env = env + p['burst'] * 0.6 * np.exp(-tso / 0.03) * (1.0 - np.exp(-tso / 0.002)) * np.max(A)
        return (nz * env).astype(np.float32)


# ------------------------------ harp ----------------------------------------
class Harp(Inst):
    default_art = 'pluck'
    cacheable = ('pluck',)
    dyn_db = 26.0

    def quant_dur(self, d, art):
        return 0.0

    def render_phrase(self, notes, ctx):
        note = notes[0]
        rng = ctx.rng
        f0 = float(midi2hz(note.midi))
        V = note.vel
        t60 = float(np.clip(8.0 * 2 ** (-(note.midi - 40) / 20.0), 0.9, 8.5))
        n = int(min(t60 * 0.85, 6.0) * SR)
        y = ks_pluck(f0, n, t60, 0.38 + 0.3 * V, rng, pos=0.27)
        t = np.arange(n) / SR
        y += 0.06 * noise_slice(rng, n, 'bp', 700, 4000) * np.exp(-t / 0.005)
        b, a = signal.iirpeak(300.0, 1.5, fs=SR)
        y = 0.85 * y + 0.5 * signal.lfilter(b, a, y)
        y = fade_edges(y.astype(np.float32), 0.0005, 0.3)
        y *= np.float32(2.2 * db2a(self.dyn_db * (V - 1.0)))
        p = self.pan + 0.25 * np.clip((note.midi - 64) / 24.0, -1, 1)
        gl, gr = pan_lr(p)
        return int(round(note.t * SR)), np.stack([gl * y, gr * y])


# ------------------------------ mallets / bells -----------------------------
def additive_decay(n, f0, partials, rng, vel_bright=1.0, t60_base=3.0, beat_hz=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for r, a, tf in partials:
        f = f0 * r
        if f > 15500 or a <= 0:
            continue
        T = t60_base * tf
        m = min(n, int(T * 1.25 * SR) + 16)
        tt = t[:m]
        amp = a * (vel_bright if r > 1.01 else 1.0)
        env = np.exp(-6.9 * tt / T)
        ph = rng.uniform(0, TWO_PI)
        if beat_hz > 0:
            out[:m] += amp * env * 0.5 * (np.sin(TWO_PI * (f - beat_hz) * tt + ph)
                                          + np.sin(TWO_PI * (f + beat_hz) * tt + ph * 1.3))
        else:
            out[:m] += amp * env * np.sin(TWO_PI * f * tt + ph)
    return out


class Mallet(Inst):
    CFG = {
        'celesta': dict(partials=[(1, 1.0, 1.0), (2.0, 0.07, 0.4), (2.76, 0.10, 0.22), (4.0, 0.03, 0.15),
                                  (5.40, 0.04, 0.10), (8.93, 0.015, 0.05)],
                        t60=(3.2, 1.3), click=0.05, click_lp=2500, gain=0.55),
        'glock': dict(partials=[(1, 1.0, 1.0), (2.76, 0.30, 0.35), (5.40, 0.16, 0.18), (8.93, 0.08, 0.09),
                                (13.34, 0.03, 0.05)],
                      t60=(5.0, 2.6), click=0.10, click_lp=9000, gain=0.45),
    }
    default_art = 'hit'
    cacheable = ('hit',)
    dyn_db = 26.0

    def __init__(self, kind='celesta', **kw):
        super().__init__(**kw)
        self.c = self.CFG[kind]

    def quant_dur(self, d, art):
        return 0.0

    def render_phrase(self, notes, ctx):
        note = notes[0]
        rng = ctx.rng
        c = self.c
        f0 = float(midi2hz(note.midi))
        V = note.vel
        t60 = float(np.interp(note.midi, [60, 96], c['t60']))
        n = int(min(t60 * 1.1, 6.0) * SR)
        y = additive_decay(n, f0, c['partials'], rng, vel_bright=0.45 + 0.8 * V, t60_base=t60)
        t = np.arange(n) / SR
        y += c['click'] * V * noise_slice(rng, n, 'lp', c['click_lp']) * np.exp(-t / 0.003)
        y = fade_edges(y.astype(np.float32), 0.001, 0.2)
        y *= np.float32(c['gain'] * db2a(self.dyn_db * (V - 1.0)))
        gl, gr = pan_lr(self.pan + note.kw.get('pan_off', 0.0))
        return int(round(note.t * SR)), np.stack([gl * y, gr * y])


class Bells(Inst):
    PARTIALS = [(0.5, 0.45, 1.6), (1.0, 0.8, 1.2), (1.19, 0.55, 1.0), (1.5, 0.3, 0.6), (2.0, 1.0, 0.8),
                (2.51, 0.32, 0.45), (2.66, 0.28, 0.4), (3.01, 0.22, 0.35), (4.16, 0.14, 0.25),
                (5.43, 0.07, 0.18), (6.8, 0.04, 0.12)]
    default_art = 'hit'
    cacheable = ('hit',)
    dyn_db = 24.0

    def quant_dur(self, d, art):
        return 0.0

    def render_phrase(self, notes, ctx):
        note = notes[0]
        rng = ctx.rng
        f0 = float(midi2hz(note.midi))
        V = note.vel
        T = float(np.clip(7.0 * 2 ** (-(note.midi - 60) / 24.0), 2.5, 10.0))
        n = int(min(T * 1.3, 9.0) * SR)
        y = additive_decay(n, f0, self.PARTIALS, rng, vel_bright=0.5 + 0.6 * V, t60_base=T, beat_hz=0.35)
        t = np.arange(n) / SR
        y += 0.25 * V * noise_slice(rng, n, 'bp', 1200, 7000) * np.exp(-t / 0.004)
        y = fade_edges(y.astype(np.float32), 0.001, 0.5)
        y *= np.float32(1.2 * db2a(self.dyn_db * (V - 1.0)))
        gl, gr = pan_lr(self.pan + note.kw.get('pan_off', 0.0))
        return int(round(note.t * SR)), np.stack([gl * y, gr * y])


# ------------------------------ piano ---------------------------------------
class Piano(Inst):
    default_art = 'note'
    cacheable = ('note',)
    dyn_db = 30.0

    def quant_dur(self, d, art):
        return round(min(d, 6.0) * 4) / 4.0

    def render_phrase(self, notes, ctx):
        note = notes[0]
        rng = ctx.rng
        m = float(note.midi)
        f0 = float(midi2hz(m))
        V = note.vel
        Bc = float(np.clip(0.00012 * 2 ** ((m - 48) / 14.0), 0.00005, 0.003))
        T1 = float(np.clip(16.0 * 2 ** (-(m - 33) / 15.0), 1.0, 16.0))
        hold = max(note.dur, 0.08)
        damp_tau = float(np.clip(0.16 * 2 ** (-(m - 60) / 24.0), 0.05, 0.35))
        n = int(min(hold + 7 * damp_tau, T1 * 1.1 + 0.2) * SR) + 64
        t = np.arange(n) / SR
        fc = 900.0 + 3800.0 * V ** 1.4
        nstr = 1 if m < 34 else (2 if m < 48 else 3)
        dets = [0.0, 0.7, -0.5][:nstr]
        y = np.zeros(n)
        nmax = int(min(60, 15000 / f0))
        for k in range(1, nmax + 1):
            fk = k * f0 * np.sqrt(1.0 + Bc * k * k)
            if fk > 15000:
                break
            a = k ** -0.85 * np.exp(-0.5 * (fk / fc) ** 2) * abs(np.sin(np.pi * k * 0.12)) * 1.6
            if a < 1e-4:
                continue
            T = T1 / (1.0 + (fk / 1800.0) ** 1.4 + 0.015 * (k - 1))
            mlen = min(n, int(T * 1.2 * SR) + 16)
            tt = t[:mlen]
            env = 0.72 * np.exp(-6.9 * tt / (T * 0.22)) + 0.28 * np.exp(-6.9 * tt / T)
            acc = np.zeros(mlen)
            for d in dets:
                acc += np.sin(TWO_PI * fk * (1 + d / 1200.0) * tt + rng.uniform(0, TWO_PI))
            y[:mlen] += a * env * acc / nstr
        y += 0.05 * V * noise_slice(rng, n, 'lp', 1500 + 3000 * V) * np.exp(-t / 0.008)
        rel = np.where(t > hold, np.exp(-(t - hold) / damp_tau), 1.0)
        y *= rel
        y = fade_edges(y.astype(np.float32), 0.001, 0.02)
        y *= np.float32(2.9 * db2a(self.dyn_db * (V - 1.0)))
        p = self.pan + 0.3 * np.clip((m - 60) / 30.0, -1, 1)
        gl, gr = pan_lr(p)
        return int(round(note.t * SR)), np.stack([gl * y, gr * y])


# ------------------------------ percussion ----------------------------------
class Perc(Inst):
    """Base for drums: render(art, midi, vel, rng) -> mono or stereo array."""
    default_art = 'hit'
    dyn_db = 26.0
    n_rr = 5
    roll_arts = ('roll',)

    def quant_dur(self, d, art):
        return 0.0

    def render_part(self, notes, n_total, ctx):
        out = np.zeros((2, n_total), np.float32)
        for nt in notes:
            art = nt.art or self.default_art
            if art in self.roll_arts:
                self.render_roll(nt, art, out, ctx)
                continue
            if art in self.cacheable:
                res = self.render_cached(nt, art, ctx)
            else:
                res = self.render_phrase([nt], ctx)
            if res is not None:
                add_into(out, res[0], res[1])
        return out

    def render_phrase(self, notes, ctx):
        note = notes[0]
        art = note.art or self.default_art
        y = self.hit(art, note, ctx.rng)
        y = y.astype(np.float32) * np.float32(db2a(self.dyn_db * (note.vel - 1.0)))
        if y.ndim == 1:
            gl, gr = pan_lr(self.pan + note.kw.get('pan_off', 0.0))
            y = np.stack([gl * y, gr * y])
        return int(round(note.t * SR)), y

    def roll_rate(self):
        return 16.0

    def render_roll(self, nt, art, out, ctx):
        rng = ctx.rng
        rate = nt.kw.get('rate', self.roll_rate())
        n_str = max(2, int(nt.dur * rate))
        v0 = nt.vel
        v1 = nt.vel if nt.vel_end is None else nt.vel_end
        for i in range(n_str):
            frac = i / max(1, n_str - 1)
            v = (v0 + (v1 - v0) * frac ** 1.3) * self.kw.get('roll_scale', 0.62)
            v *= rng.uniform(0.9, 1.08) * (1.0 if i % 2 == 0 else 0.94)
            t = nt.t + i / rate + rng.normal(0, 0.003)
            sub = nt.clone(t=max(0.0, t), vel=float(np.clip(v, 0.05, 1.0)), art=self.roll_stroke_art(nt))
            res = self.render_cached(sub, sub.art, ctx)
            if res is not None:
                add_into(out, res[0], res[1])
        if nt.kw.get('end_hit'):
            sub = nt.clone(t=nt.t + nt.dur, vel=nt.kw['end_hit'], art=self.roll_stroke_art(nt))
            res = self.render_cached(sub, sub.art, ctx)
            if res is not None:
                add_into(out, res[0], res[1])

    def roll_stroke_art(self, nt):
        return 'hit'


class Timpani(Perc):
    cacheable = ('hit',)
    MODES = [(1.0, 1.0, 1.0), (1.504, 0.5, 0.55), (1.742, 0.28, 0.40), (2.0, 0.30, 0.45),
             (2.245, 0.16, 0.30), (2.494, 0.12, 0.28), (2.8, 0.08, 0.20), (2.95, 0.06, 0.18),
             (3.2, 0.04, 0.12)]

    def roll_rate(self):
        return 17.0

    def hit(self, art, note, rng):
        f0 = float(midi2hz(note.midi))
        V = note.vel
        T = float(np.clip(3.2 - 0.06 * (note.midi - 40), 1.6, 3.6))
        n = int(T * 1.15 * SR)
        t = np.arange(n) / SR
        gl_amt = 0.012 + 0.022 * V
        pb = t + gl_amt * 0.06 * (1 - np.exp(-t / 0.06))
        y = np.zeros(n)
        for r, a, tf in self.MODES:
            amp = a * (1.0 if r == 1.0 else (0.4 + 0.8 * V))
            y += amp * np.exp(-6.9 * t / (T * tf)) * np.sin(TWO_PI * f0 * r * pb + rng.uniform(0, TWO_PI))
        y += 0.55 * V * np.exp(-t / 0.06) * np.sin(TWO_PI * f0 * 0.62 * t)
        y += 0.35 * V * noise_slice(rng, n, 'lp', 900 + 2600 * V) * np.exp(-t / 0.006)
        y *= np.minimum(1.0, t / 0.0015)
        y = fade_edges(y, 0.0, 0.05)
        return 0.94 * y


class Taiko(Perc):
    cacheable = ('odaiko', 'chu', 'shime', 'rim', 'hit')
    default_art = 'chu'
    P = {
        'odaiko': dict(fl=50.0, fh=96.0, tau=0.045, t60=1.5, slap=0.5, sband=(150, 1300), sd=0.04, gain=1.75),
        'chu': dict(fl=88.0, fh=150.0, tau=0.032, t60=0.65, slap=0.55, sband=(250, 2500), sd=0.03, gain=1.45),
        'shime': dict(fl=330.0, fh=420.0, tau=0.012, t60=0.16, slap=0.7, sband=(1500, 6500), sd=0.018,
                      gain=0.9),
    }

    def hit(self, art, note, rng):
        if art == 'hit':
            art = 'chu'
        V = note.vel
        if art == 'rim':
            n = int(0.12 * SR)
            t = np.arange(n) / SR
            y = noise_slice(rng, n, 'bp', 1800, 7000) * np.exp(-t / 0.006)
            y += 0.6 * np.sin(TWO_PI * 1150 * t) * np.exp(-t / 0.015)
            return 0.35 * y
        p = self.P[art]
        tune = 2 ** ((note.midi - 60) / 12.0) if note.kw.get('tuned') else 1.0
        n = int((p['t60'] * 1.1 + 0.05) * SR)
        t = np.arange(n) / SR
        fl, fh = p['fl'] * tune, p['fh'] * tune * (0.9 + 0.2 * V)
        ph = TWO_PI * (fl * t + (fh - fl) * p['tau'] * (1 - np.exp(-t / p['tau'])))
        body = np.sin(ph + rng.uniform(0, 0.3)) * np.exp(-6.9 * t / p['t60'])
        body += 0.32 * np.sin(1.58 * ph + rng.uniform(0, TWO_PI)) * np.exp(-6.9 * t / (p['t60'] * 0.4))
        body += 0.13 * np.sin(2.31 * ph + rng.uniform(0, TWO_PI)) * np.exp(-6.9 * t / (p['t60'] * 0.22))
        body = np.tanh(1.6 * body) / np.tanh(1.6)
        slap = noise_slice(rng, n, 'bp', *p['sband']) * np.exp(-t / p['sd']) * p['slap'] * (0.45 + 0.7 * V)
        y = body + slap
        y *= np.minimum(1.0, t / 0.001)
        y = fade_edges(y, 0.0, 0.04)
        return p['gain'] * y


class Snare(Perc):
    cacheable = ('hit', 'ghost')

    def roll_rate(self):
        return 26.0

    def hit(self, art, note, rng):
        V = note.vel
        n = int(0.75 * SR)
        t = np.arange(n) / SR
        tone = 0.6 * np.sin(TWO_PI * (185 * t + 20 * 0.01 * (1 - np.exp(-t / 0.01)))) * np.exp(-t / 0.055)
        tone += 0.3 * np.sin(TWO_PI * 332 * t + 1.0) * np.exp(-t / 0.035)
        wires = noise_slice(rng, n, 'bp', 1800, 9500) * np.exp(-t / (0.09 + 0.05 * V)) * (0.6 + 0.4 * V)
        click = noise_slice(rng, n, 'hp', 3000) * np.exp(-t / 0.0018)
        y = 0.55 * tone + 0.8 * wires + 0.35 * click
        y *= np.minimum(1.0, t / 0.0006)
        y = fade_edges(y, 0.0, 0.05)
        return 0.5 * y


class BassDrum(Perc):
    cacheable = ('hit',)

    def roll_rate(self):
        return 14.0

    def hit(self, art, note, rng):
        V = note.vel
        n = int(2.2 * SR)
        t = np.arange(n) / SR
        fl, fh, tau = 44.0, 72.0, 0.05
        ph = TWO_PI * (fl * t + (fh - fl) * tau * (1 - np.exp(-t / tau)))
        y = np.sin(ph) * np.exp(-6.9 * t / 1.7)
        y += 0.3 * np.sin(1.5 * ph + 0.7) * np.exp(-6.9 * t / 0.6)
        y += 0.15 * np.sin(2.3 * ph + 0.2) * np.exp(-6.9 * t / 0.3)
        y += 0.4 * V * noise_slice(rng, n, 'lp', 380) * np.exp(-t / 0.018)
        y *= np.minimum(1.0, t / 0.002)
        y = fade_edges(y, 0.0, 0.1)
        return 1.6 * y


class Cymbal(Perc):
    cacheable = ('crash', 'sus', 'choke')
    default_art = 'crash'
    roll_arts = ()

    def hit(self, art, note, rng):
        V = note.vel
        if art == 'swell':
            return self.swell(note, rng)
        T = {'crash': 3.6, 'sus': 2.8, 'choke': 3.6}[art]
        n = int(min(T * 1.2, 5.0) * SR)
        t = np.arange(n) / SR
        bloom = 1 - np.exp(-t / 0.012)
        out = np.zeros((2, n))
        for c in range(2):
            body = noise_slice(rng, n, 'cym') * np.exp(-6.9 * t / T) * bloom
            hi = noise_slice(rng, n, 'hp', 5500) * np.exp(-6.9 * t / (T * 0.35)) * (0.3 + 0.5 * V)
            out[c] = 0.55 * body + 0.35 * hi
        parts = np.zeros(n)
        fr = np.exp(rng.uniform(np.log(380), np.log(8500), 34))
        for f in fr:
            Tp = rng.uniform(0.35, 1.0) * T
            parts += np.sin(TWO_PI * f * t + rng.uniform(0, TWO_PI)) * np.exp(-6.9 * t / Tp) * (f / 1000) ** -0.3
        parts *= 0.05 * bloom
        out[0] += parts
        out[1] += np.roll(parts, 37)
        if art == 'sus':
            out *= 0.6 * (1 - np.exp(-t / 0.03))
        if art == 'choke':
            out *= np.where(t > 0.35, np.exp(-(t - 0.35) / 0.05), 1.0)
        out *= np.minimum(1.0, t / 0.0008)
        out = fade_edges(out, 0.0, 0.1)
        return 0.5 * out

    def swell(self, note, rng):
        D = max(0.3, note.dur)
        rel = 0.45
        n = int((D + rel + 0.05) * SR)
        t = np.arange(n) / SR
        x = np.clip(t / D, 0, 1)
        env = (0.02 + 0.98 * x ** 2.6) * np.where(t > D, np.exp(-(t - D) / (rel / 4)), 1.0)
        out = np.zeros((2, n))
        for c in range(2):
            body = noise_slice(rng, n, 'cym')
            hi = noise_slice(rng, n, 'hp', 5000)
            out[c] = env * (0.6 * body + 0.4 * hi * x)
        out = fade_edges(out, 0.005, 0.05)
        return 0.42 * out


class TamTam(Perc):
    cacheable = ('hit',)

    def hit(self, art, note, rng):
        V = note.vel
        T = 7.0
        n = int(7.5 * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        fr = np.exp(rng.uniform(np.log(55), np.log(2200), 70))
        for f in fr:
            tb = 0.04 + 0.9 * (f / 2200.0)
            Tp = T * (180.0 / f) ** 0.35
            env = (1 - np.exp(-t / tb)) * np.exp(-6.9 * t / min(Tp, 9.0))
            y += env * np.sin(TWO_PI * f * (t - 0.004 * (1 - np.exp(-t / 0.3))) + rng.uniform(0, TWO_PI)) \
                * (f / 200.0) ** -0.45
        y *= 0.06
        y += 0.3 * noise_slice(rng, n, 'bp', 150, 3000) * np.exp(-t / 0.08) * V
        y *= np.minimum(1.0, t / 0.003)
        y = fade_edges(y, 0.0, 0.3)
        return 2.4 * y


class FX(Perc):
    cacheable = ()
    default_art = 'boom'
    roll_arts = ()
    dyn_db = 20.0

    def hit(self, art, note, rng):
        return getattr(self, 'fx_' + art)(note, rng)

    def fx_boom(self, note, rng):
        V = note.vel
        n = int(5.0 * SR)
        t = np.arange(n) / SR
        f = 30.0 + 62.0 * np.exp(-t / 0.22)
        ph = TWO_PI * np.cumsum(f) / SR
        sub = np.sin(ph) * np.exp(-6.9 * t / 3.4)
        sub = np.tanh(2.2 * sub) / np.tanh(2.2)
        out = np.zeros((2, n))
        for c in range(2):
            imp = noise_slice(rng, n, 'lp', 2800) * np.exp(-t / 0.13) * 0.45
            crack = noise_slice(rng, n, 'hp', 2500) * np.exp(-t / 0.012) * 0.25
            out[c] = 0.85 * sub + imp + crack
        out *= np.minimum(1.0, t / 0.001)
        return fade_edges(out, 0.0, 0.4) * 0.8

    def fx_subdrop(self, note, rng):
        D = max(1.0, note.dur)
        n = int((D + 0.5) * SR)
        t = np.arange(n) / SR
        f = 28.0 + 55.0 * np.exp(-t / (D * 0.3))
        y = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-6.9 * t / (D + 0.5))
        y = np.tanh(1.8 * y) / np.tanh(1.8)
        y *= np.minimum(1.0, t / 0.002)
        return fade_edges(y, 0.0, 0.2) * 0.8

    def fx_reverse(self, note, rng):
        """Reversed swell that *ends* at note.t + note.dur (sucks into a hit)."""
        D = max(0.3, note.dur)
        n = int(D * SR)
        t = np.arange(n) / SR
        x = t / D
        env = (np.exp(4.0 * x) - 1) / (np.exp(4.0) - 1)
        out = np.zeros((2, n))
        for c in range(2):
            nz = noise_slice(rng, n, 'cym') * 0.7 + noise_slice(rng, n, 'bp', 200, 2500) * 0.5
            out[c] = nz * env
        out[:, -int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
        out = fade_edges(out, 0.02, 0.004)
        return 0.5 * out

    def fx_riser(self, note, rng):
        D = max(0.5, note.dur)
        n = int(D * SR)
        t = np.arange(n) / SR
        x = t / D
        out = np.zeros((2, n))
        for c in range(2):
            nz = noise_slice(rng, n, 'pink')
            out[c] = stft_filter(nz, lambda f, tt: np.exp(-0.5 * (np.log2(np.maximum(f, 20) / (
                350.0 * (9000.0 / 350.0) ** np.clip(tt / D, 0, 1))) / 0.7) ** 2))
        tone = np.zeros(n)
        base = float(midi2hz(note.midi))
        for k, (a, det) in enumerate([(1.0, 0.0), (0.6, 7.02), (0.5, 12.0)]):
            fr = base * 2 ** ((det + 12.0 * x ** 1.5) / 12.0)
            ph = TWO_PI * np.cumsum(fr) / SR
            tone += a * (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph))
        env = x ** 2.2
        out = out * env * 0.9 + 0.12 * tone * env
        out[:, -int(0.008 * SR):] *= np.linspace(1, 0, int(0.008 * SR))
        out = fade_edges(out, 0.05, 0.008)
        return 0.55 * out

    def fx_wind(self, note, rng):
        D = max(1.0, note.dur)
        n = int(D * SR)
        t = np.arange(n) / SR
        out = np.zeros((2, n))
        for c in range(2):
            nz = noise_slice(rng, n, 'pink')
            cen = 500.0 * 2 ** (1.2 * slow_noise(n, rng, 0.35))
            nper = 2048
            hop = nper // 4
            frames_t = np.arange(0, n + nper, hop) / SR
            cen_f = np.interp(frames_t, t, cen)

            def mask(f, tt, cen_f=cen_f, frames_t=frames_t):
                cf = np.interp(tt, frames_t, cen_f)
                return np.exp(-0.5 * (np.log2(np.maximum(f, 20) / cf) / 0.9) ** 2)
            out[c] = stft_filter(nz, mask)
        am = 0.55 + 0.45 * np.clip(0.5 + 0.5 * slow_noise(n, rng, 0.25), 0, 1)
        fi = np.clip(t / min(1.5, D / 3), 0, 1) * np.clip((D - t) / min(1.5, D / 3), 0, 1)
        out *= am * fi
        return 0.6 * out

    def fx_whoosh(self, note, rng):
        D = max(0.3, note.dur)
        n = int(D * SR)
        t = np.arange(n) / SR
        x = t / D
        env = np.sin(np.pi * x) ** 2
        out = np.zeros((2, n))
        for c in range(2):
            nz = noise_slice(rng, n, 'pink')
            out[c] = stft_filter(nz, lambda f, tt: np.exp(-0.5 * (np.log2(np.maximum(f, 20) / (
                600.0 * 2 ** (3 * np.clip(tt / D, 0, 1)))) / 0.8) ** 2))
        return 0.5 * out * env


# ----------------------------------------------------------------------------
# Registry: instrument class, constructor args, default mix settings
# ----------------------------------------------------------------------------
BODY_EQ = {
    'violins': [('highpass', 170, 0.7), ('peak', 280, 4.0, 2.5), ('peak', 470, 3.0, 2.5),
                ('peak', 720, 2.0, -2.0), ('peak', 1150, 3.0, 1.5), ('peak', 1550, 2.0, -2.5),
                ('peak', 2500, 1.4, 2.5), ('peak', 3300, 2.0, 1.5), ('peak', 4600, 1.5, -2.0),
                ('highshelf', 6500, 0.7, -4.0), ('lowpass', 11000, 0.7)],
    'violas': [('highpass', 115, 0.7), ('peak', 230, 4.0, 2.5), ('peak', 380, 3.0, 2.5),
               ('peak', 600, 2.0, -2.0), ('peak', 950, 3.0, 1.5), ('peak', 1300, 2.0, -2.5),
               ('peak', 2100, 1.4, 2.0), ('highshelf', 5500, 0.7, -4.0), ('lowpass', 9500, 0.7)],
    'cellos': [('highpass', 58, 0.7), ('peak', 120, 3.0, 1.5), ('peak', 210, 3.0, 2.5),
               ('peak', 400, 2.0, -1.5), ('peak', 620, 3.0, 1.5), ('peak', 900, 2.0, -2.0),
               ('peak', 1500, 1.4, 2.0), ('highshelf', 4500, 0.7, -4.0), ('lowpass', 8000, 0.7)],
    'basses': [('highpass', 32, 0.7), ('peak', 75, 2.0, 1.5), ('peak', 140, 3.0, 2.0),
               ('peak', 300, 2.0, -1.5), ('peak', 650, 2.0, 1.0), ('highshelf', 2500, 0.7, -4.0),
               ('lowpass', 5000, 0.7)],
}

REGISTRY = {
    'violins': (Strings, dict(section='violins'), dict(pan=-0.55, width=0.35, hall=0.42, gain=-2.7,
                                                       eq=BODY_EQ['violins'])),
    'violins2': (Strings, dict(section='violins'), dict(pan=-0.28, width=0.3, hall=0.42, gain=-4.2,
                                                        eq=BODY_EQ['violins'])),
    'violas': (Strings, dict(section='violas'), dict(pan=0.12, width=0.3, hall=0.42, gain=-4.4,
                                                     eq=BODY_EQ['violas'])),
    'cellos': (Strings, dict(section='cellos'), dict(pan=0.38, width=0.3, hall=0.40, gain=-3.9,
                                                     eq=BODY_EQ['cellos'])),
    'basses': (Strings, dict(section='basses'), dict(pan=0.55, width=0.2, hall=0.38, gain=-3.1,
                                                     eq=BODY_EQ['basses'])),
    'horns': (Brass, dict(kind='horn'), dict(pan=-0.35, width=0.3, hall=0.55, gain=-2.3,
                                             eq=[('highpass', 50, 0.7), ('lowpass', 9000, 0.7)])),
    'horn_solo': (Brass, dict(kind='horn', nv=1), dict(pan=-0.3, width=0.0, hall=0.55, gain=-2.3,
                                                       eq=[('highpass', 50, 0.7)])),
    'trumpets': (Brass, dict(kind='trumpet'), dict(pan=0.22, width=0.2, hall=0.45, gain=-4.2,
                                                   eq=[('highpass', 150, 0.7), ('lowpass', 11000, 0.7)])),
    'trombones': (Brass, dict(kind='trombone'), dict(pan=0.4, width=0.25, hall=0.45, gain=-3.5,
                                                     eq=[('highpass', 45, 0.7), ('lowpass', 9000, 0.7)])),
    'tuba': (Brass, dict(kind='tuba'), dict(pan=0.5, width=0.0, hall=0.4, gain=-4.0,
                                            eq=[('highpass', 28, 0.7), ('lowpass', 5000, 0.7)])),
    'flute': (Woodwind, dict(kind='flute'), dict(pan=-0.08, width=0.0, hall=0.45, gain=-6.3,
                                                 eq=[('highpass', 200, 0.7)])),
    'oboe': (Woodwind, dict(kind='oboe'), dict(pan=0.06, width=0.0, hall=0.42, gain=-7.5,
                                               eq=[('highpass', 200, 0.7), ('lowpass', 10000, 0.7)])),
    'clarinet': (Woodwind, dict(kind='clarinet'), dict(pan=-0.15, width=0.0, hall=0.42, gain=-6.6,
                                                       eq=[('highpass', 120, 0.7)])),
    'bassoon': (Woodwind, dict(kind='bassoon'), dict(pan=0.15, width=0.0, hall=0.42, gain=-7.1,
                                                     eq=[('highpass', 50, 0.7)])),
    'choir': (Choir, dict(vowel='a'), dict(pan=0.0, width=1.2, hall=0.30, long=0.45, gain=-2.8,
                                           eq=[('highpass', 90, 0.7), ('peak', 250, 1.0, -1.5),
                                               ('lowpass', 9000, 0.7)])),
    'harp': (Harp, {}, dict(pan=-0.5, width=0.0, hall=0.45, gain=-3.0,
                            eq=[('highpass', 40, 0.7), ('highshelf', 5000, 0.7, -3.0), ('lowpass', 9500, 0.7)])),
    'celesta': (Mallet, dict(kind='celesta'), dict(pan=-0.3, hall=0.5, gain=-1.6, eq=[])),
    'glock': (Mallet, dict(kind='glock'), dict(pan=0.3, hall=0.45, gain=-2.3, eq=[('lowpass', 13000, 0.7)])),
    'bells': (Bells, {}, dict(pan=0.2, hall=0.2, long=0.7, gain=-6.0, eq=[('highpass', 120, 0.7)])),
    'piano': (Piano, {}, dict(pan=-0.12, width=0.4, hall=0.4, gain=-3.0, eq=[('highpass', 35, 0.7)])),
    'timpani': (Timpani, {}, dict(pan=-0.1, hall=0.45, gain=-2.0, eq=[('highpass', 35, 0.7)])),
    'taiko': (Taiko, {}, dict(pan=0.0, width=0.5, hall=0.42, gain=-2.0, eq=[('highpass', 32, 0.7)])),
    'snare': (Snare, {}, dict(pan=0.18, hall=0.35, gain=-3.8, eq=[('highpass', 100, 0.7)])),
    'bassdrum': (BassDrum, {}, dict(pan=0.08, hall=0.4, gain=-4.0, eq=[('highpass', 28, 0.7)])),
    'cymbal': (Cymbal, {}, dict(pan=0.25, width=0.6, hall=0.35, gain=-3.7, eq=[('highpass', 250, 0.7)])),
    'tamtam': (TamTam, {}, dict(pan=0.3, hall=0.5, gain=-6.0, eq=[('highpass', 40, 0.7)])),
    'fx': (FX, {}, dict(pan=0.0, width=1.0, hall=0.3, gain=-1.8, eq=[('highpass', 24, 0.7)])),
}


def make_instrument(kind, pan, width, seed, **over):
    cls, args, _mix = REGISTRY[kind]
    a = dict(args)
    a.update(over)
    return cls(pan=pan, width=width, seed=seed, **a)
