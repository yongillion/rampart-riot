"""Score -> stereo master: per-part rendering, bus EQ, reverb sends, glue
compression, saturation, true-peak limiting and loudness normalisation."""
import time

import numpy as np

from .dsp import (SR, db2a, a2db, eq_sos, fft_sos, make_hall_ir, convolve_true_stereo, compressor,
                  soft_clip, tp_limiter, lufs_integrated, true_peak_db, sample_peak_db, stable_seed)

sosfilt = fft_sos
from .synth import make_instrument, Ctx

SEND_EQ = eq_sos([('highpass', 160, 0.7), ('highpass', 160, 0.7), ('lowpass', 9000, 0.7)])


def render_parts(sc, verbose=True):
    n_total = int(round(sc.total_len * SR))
    dry = np.zeros((2, n_total), np.float32)
    hall = np.zeros((2, n_total), np.float32)
    longb = np.zeros((2, n_total), np.float32)
    stats = []
    for part in sc.parts:
        if not part.notes:
            continue
        t0 = time.time()
        inst = make_instrument(part.kind, part.pan, part.width, stable_seed(sc.id, part.name, 'inst'),
                               **part.inst_kw)
        ctx = Ctx(np.random.default_rng(stable_seed(sc.id, part.name, 'ctx')), part.expr_arrays())
        buf = inst.render_part(part.notes, n_total, ctx)
        if part.eq:
            buf = sosfilt(buf, eq_sos(part.eq))
        buf *= np.float32(db2a(part.gain))
        if part._fader:
            pts = sorted(part._fader)
            g = np.interp(np.arange(n_total) / SR, [p[0] for p in pts], [p[1] for p in pts])
            buf *= g.astype(np.float32)[None, :]
        dry += buf * np.float32(part.dry)
        if part.hall:
            hall += buf * np.float32(part.hall)
        if part.long:
            longb += buf * np.float32(part.long)
        dt = time.time() - t0
        lu = lufs_integrated(buf) if np.any(buf) else -99
        stats.append((part.name, len(part.notes), lu, dt))
        if verbose:
            print('   %-12s %5d notes  %6.1f LUFS  %5.1fs' % (part.name, len(part.notes), lu, dt), flush=True)
    t0 = time.time()
    wet = np.zeros_like(dry)
    if np.any(hall):
        ir = make_hall_ir(sc.rt60, seed=stable_seed(sc.id, 'hall'))
        wet += convolve_true_stereo(sosfilt(hall, SEND_EQ), ir) * np.float32(sc.hall_return)
    if np.any(longb):
        ir = make_hall_ir(sc.long_rt60, seed=stable_seed(sc.id, 'long'), predelay=0.035, hf_mult=0.35)
        wet += convolve_true_stereo(sosfilt(longb, SEND_EQ), ir) * np.float32(sc.long_return)
    if verbose:
        print('   reverb %.1fs' % (time.time() - t0), flush=True)
    return dry + wet, stats


def leveler(x, sc, thr_down=1.0, ratio_down=3.0, thr_up=-1.5, ratio_up=2.5, smooth_s=1.6,
            max_cut=6.0, max_boost=4.0):
    """Slow K-weighted section leveler for gameplay loops: pulls loud sections down
    and quiet sections up around the integrated loudness ("steady energy").
    The gain is frozen over the loop tail so the ring-out matches the loop end."""
    from .dsp import _block_powers, smooth
    z = _block_powers(x, 0.4, 0.1)
    l = -0.691 + 10 * np.log10(z + 1e-20)
    ref = lufs_integrated(x)
    dev = l - ref
    g = np.where(dev > thr_down, -(dev - thr_down) * (1 - 1 / ratio_down), 0.0)
    g += np.where((dev < thr_up) & (l > ref - 20), (thr_up - dev) * (1 - 1 / ratio_up), 0.0)
    g = np.clip(g, -max_cut, max_boost)
    n_blk = g.size
    k = max(1, int(smooth_s / 0.1))
    g = np.convolve(np.pad(g, (k, k), mode='edge'), np.ones(k) / k, mode='same')[k:k + n_blk]
    centers = 0.2 + 0.1 * np.arange(n_blk)
    t = np.arange(x.shape[1]) / SR
    gs = np.interp(t, centers, g)
    if sc.loop:
        L = int(round(sc.music_len * SR))
        gs[L:] = gs[L - 1]
    return (x * db2a(gs)[None, :]).astype(np.float32), float(g.min()), float(g.max())


def master(mix, sc, ceiling_db=-1.8, target_offset=0.0, verbose=True):
    m = dict(dict(comp_ratio=1.8, comp_offset=-2.0, knee=0.62, low_mid_db=-1.0), **sc.master)
    x = sosfilt(mix, eq_sos([('highpass', 26, 0.7), ('highpass', 26, 0.7),
                            ('peak', 280, 0.8, m['low_mid_db'])]))
    x -= x.mean(axis=1, keepdims=True)
    target = sc.lufs + target_offset
    if m.get('level'):
        x, lo, hi = leveler(x, sc, **(m['level'] if isinstance(m['level'], dict) else {}))
        if verbose:
            print('   leveler: %.1f .. +%.1f dB' % (lo, hi), flush=True)
    pre = lufs_integrated(x)
    x *= np.float32(db2a(target - pre))
    x, gr = compressor(x, thr_db=target + m['comp_offset'], ratio=m['comp_ratio'], attack_ms=30,
                       release_ms=300)
    g = target - lufs_integrated(x)
    y = x
    lim = 0.0
    for _ in range(4):
        y = soft_clip(x * np.float32(db2a(g)), knee=m['knee'], ceiling=0.97)
        y, lim = tp_limiter(y, ceiling_db=ceiling_db)
        l = lufs_integrated(y)
        if abs(l - target) < 0.12:
            break
        g += (target - l)
    # end-of-file safety fade (tail is already near silence)
    nf = int(0.35 * SR)
    y[:, -nf:] *= np.linspace(1.0, 0.0, nf, dtype=np.float32) ** 2
    y -= y.mean(axis=1, keepdims=True)
    info = dict(lufs=lufs_integrated(y), tp=true_peak_db(y), peak=sample_peak_db(y), comp_gr=gr, lim_gr=lim,
                dc=float(np.abs(y.mean(axis=1)).max()))
    if verbose:
        print('   master: %.2f LUFS  TP %.2f dBTP  comp GR %.1f dB  lim GR %.1f dB' %
              (info['lufs'], info['tp'], gr, lim), flush=True)
    return y.astype(np.float32), info


def loop_seam(y, sc):
    """K-weighted loudness (dB) of the first and last bar of the loop body, the per-bar
    loudness profile, and the steady-state seam energy when the tail overlaps the next copy."""
    from .dsp import K_SOS
    from scipy import signal as _sig
    L = int(round(sc.music_len * SR))
    b = int(round(sc.bar_s * SR))
    k = _sig.sosfilt(K_SOS, y.astype(np.float64), axis=-1)

    def lk(a, c):
        return float(-0.691 + 10 * np.log10(np.sum(np.mean(k[:, a:c] ** 2, axis=1)) + 1e-12))
    nb = int(round(L / b))
    bars = [lk(i * b, (i + 1) * b) for i in range(nb)]
    tail = y[:, L:]
    wrap = y[:, :tail.shape[1]].copy() + tail
    w = int(0.05 * SR)
    before = float(a2db(np.sqrt(np.mean(y[:, L - w:L] ** 2)) + 1e-9))
    after = float(a2db(np.sqrt(np.mean(wrap[:, :w] ** 2)) + 1e-9))
    return dict(first_bar_db=bars[0], last_bar_db=bars[-1], seam_before_db=before, seam_after_db=after,
                bar_db=bars)
