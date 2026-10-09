#!/usr/bin/env python3
"""Render the complete Rampart Riot SFX + ambience set (procedural, offline).

Usage (from anywhere):
    python3 tools/audio/sfx/build_sfx.py                 # render all + verify
    python3 tools/audio/sfx/build_sfx.py --only coin,ui_click
    python3 tools/audio/sfx/build_sfx.py --verify        # verify existing output only
    python3 tools/audio/sfx/build_sfx.py --no-amb        # skip ambience loops

Outputs:
    assets/audio/sfx/<name>[_<n>].mp3   44.1 kHz mono, 96k (128k for cinematic)
    assets/audio/amb/<name>.mp3         44.1 kHz stereo 128k, 30 s loop + 2 s overlap
    assets/audio/sfx.json               manifest
    /tmp/sfx_wav/*.wav                  float WAV intermediates
"""
import argparse
import json
import sys
import time
from multiprocessing import Pool
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if __package__ in (None, ''):
    sys.path.insert(0, str(ROOT))
    import importlib
    importlib.import_module('tools.audio.sfx')
    __package__ = 'tools.audio.sfx'

import numpy as np  # noqa: E402

from .dsp import (SR, N, db2a, a2db, filt, fade, true_peak, lufs_momentary_max,  # noqa: E402
                  lufs_short_max, lufs_integrated, write_wav, encode_mp3, decode_mp3, seed_of,
                  soft_clip)
from .registry import REG, AMB, CATS  # noqa: E402
from . import recipes_ui, recipes_towers, recipes_units, recipes_world, recipes_amb  # noqa

OUT = ROOT / 'assets' / 'audio'
SFX_DIR = OUT / 'sfx'
AMB_DIR = OUT / 'amb'
WAV_DIR = Path('/tmp/sfx_wav')
MANIFEST = OUT / 'sfx.json'
LOOP_LEN = 30.0
OVERLAP = 2.0
PRE_ROLL = 4.0
PEAK_DB = -3.0          # true-peak normalisation target before category offsets
ONSET_DB = -40.0        # leading-silence trim threshold (re peak)
LOUD_WIN = 0.1          # short-term loudness window used for balancing (s)
MAX_DENSIFY_DB = 4.0    # max peak rounding (soft clip) applied to very transient sounds


# ----------------------------------------------------------------------------
# SFX post-processing
# ----------------------------------------------------------------------------
def env_max(x, win):
    """Running max of |x| over non-overlapping windows (for tail detection)."""
    n = len(x)
    nb = (n + win - 1) // win
    a = np.abs(np.pad(x, (0, nb * win - n)))
    return a.reshape(nb, win).max(axis=1)


def prepare(y, spec):
    """Clean-up EQ, trim leading/trailing silence, fades, -3 dBFS true-peak normalisation."""
    cat = CATS[spec['cat']]
    y = np.nan_to_num(np.asarray(y, dtype=np.float64))
    eq = [('highpass', cat['hp'], 0.7071), ('highpass', cat['hp'] * 0.7, 0.6),
          ('lowpass', 16500, 0.7071)]
    if cat['shelf']:
        eq.append(('lowshelf', cat['shelf'][0], 0.7071, cat['shelf'][1]))
    y = filt(y, *eq)
    pk = np.max(np.abs(y))
    if pk <= 0:
        raise RuntimeError('silent render')
    # leading silence: start at the first sample above ONSET_DB re peak
    i0 = int(np.argmax(np.abs(y) > pk * db2a(ONSET_DB)))
    y = y[i0:]
    # trailing: last 5 ms window above tail_db re peak
    win = int(0.005 * SR)
    e = env_max(y, win)
    above = np.nonzero(e > pk * db2a(spec['tail_db']))[0]
    end = min(len(y), (int(above[-1]) + 1) * win if len(above) else len(y))
    y = y[:end]
    if spec['maxdur']:
        y = y[:N(spec['maxdur'])]
    dur = len(y) / SR
    fout = float(np.clip(dur * 0.12, 0.012, 0.09))
    y = fade(y, 0.0003, fout)
    return y * (db2a(PEAK_DB) / true_peak(y))


def level(y, spec):
    """Category offset; dense sounds capped, very transient ones densified (soft clip)."""
    cat = CATS[spec['cat']]
    off = cat['off'] + spec['adj']
    loud = lufs_short_max(y, LOUD_WIN) + off
    if loud < cat['floor'] and spec['densify']:
        y = soft_clip(y, min(MAX_DENSIFY_DB, cat['floor'] - loud + 0.5))
        y = y * (db2a(PEAK_DB) / true_peak(y))
        loud = lufs_short_max(y, LOUD_WIN) + off
    g = off - max(0.0, loud - cat['cap'])
    return y * db2a(g), g


def postprocess(y, spec):
    return level(prepare(y, spec), spec)


def render_sfx(job):
    name, v = job
    spec = REG[name]
    t0 = time.time()
    rng = np.random.default_rng(seed_of('sfx', name, v))
    y = spec['fn'](rng, v)
    y, g = postprocess(y, spec)
    base = f'{name}_{v + 1}' if spec['variants'] > 1 else name
    wav = WAV_DIR / f'{base}.wav'
    mp3 = SFX_DIR / f'{base}.mp3'
    write_wav(str(wav), y)
    encode_mp3(str(wav), str(mp3), spec['kbps'])
    return dict(name=name, v=v, file=f'sfx/{base}.mp3', dur=len(y) / SR, gain_db=g,
                secs=time.time() - t0)


# ----------------------------------------------------------------------------
# Ambience
# ----------------------------------------------------------------------------
def render_amb(name):
    spec = AMB[name]
    t0 = time.time()
    rng = np.random.default_rng(seed_of('amb', name))
    total = PRE_ROLL + LOOP_LEN + OVERLAP
    L, R = spec['fn'](rng, total, PRE_ROLL)
    x = np.stack([L, R])
    x = filt(x, ('highpass', 22, 0.7071), ('lowpass', 16000, 0.7071))
    a, b = N(PRE_ROLL), N(PRE_ROLL) + N(LOOP_LEN + OVERLAP)
    x = x[:, a:b]
    lu = lufs_integrated(x)
    x *= db2a(spec['lufs'] - lu)
    tp = true_peak(x)
    if tp > db2a(-3.0):
        x *= db2a(-3.0) / tp
    wav = WAV_DIR / f'{name}.wav'
    mp3 = AMB_DIR / f'{name}.mp3'
    write_wav(str(wav), x)
    encode_mp3(str(wav), str(mp3), 128)
    return dict(name=name, file=f'amb/{name}.mp3', dur=x.shape[1] / SR,
                secs=time.time() - t0)


def _run(job):
    kind, arg = job
    try:
        return kind, (render_sfx(arg) if kind == 'sfx' else render_amb(arg)), None
    except Exception as e:  # report and keep going
        import traceback
        return kind, arg, traceback.format_exc()


# ----------------------------------------------------------------------------
# Manifest + verification
# ----------------------------------------------------------------------------
def load_manifest():
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text())
        except Exception:
            pass
    return {'sfx': {}, 'amb': {}}


def onset_ms(y, thr_db=ONSET_DB):
    pk = np.max(np.abs(y))
    return 1000.0 * int(np.argmax(np.abs(y) > pk * db2a(thr_db))) / SR


def measure(path, channels=1):
    y = decode_mp3(str(path), channels)
    mono = y if channels == 1 else y.mean(axis=0)
    return dict(dur=(y.shape[-1]) / SR, peak=float(a2db(np.max(np.abs(y)))),
                tp=float(a2db(true_peak(y))), onset=onset_ms(mono),
                lufs=lufs_momentary_max(y) if channels == 1 else lufs_integrated(y),
                y=y)


def write_manifest(results_sfx, results_amb, keep_existing):
    man = load_manifest() if keep_existing else {'sfx': {}, 'amb': {}}
    man.setdefault('sfx', {})
    man.setdefault('amb', {})
    by_name = {}
    for r in results_sfx:
        by_name.setdefault(r['name'], []).append(r)
    for name, rs in by_name.items():
        rs.sort(key=lambda r: r['v'])
        files = [r['file'] for r in rs]
        stats = [measure(OUT / f) for f in files]
        man['sfx'][name] = {
            'files': files,
            'gain': 1.0,
            'duration': round(max(s['dur'] for s in stats), 3),
            'lufs': round(float(np.mean([s['lufs'] for s in stats])), 1),
            'peak_db': round(max(s['peak'] for s in stats), 1),
            'category': REG[name]['cat'],
        }
    for r in results_amb:
        s = measure(OUT / r['file'], 2)
        man['amb'][r['name']] = {
            'file': r['file'],
            'loopLength': LOOP_LEN,
            'overlap': OVERLAP,
            'gain': 1.0,
            'duration': round(s['dur'], 3),
            'lufs': round(s['lufs'], 1),
        }
    # stable ordering: registry order
    order = list(REG.keys())
    man['sfx'] = {k: man['sfx'][k] for k in order if k in man['sfx']}
    man['amb'] = {k: man['amb'][k] for k in AMB if k in man['amb']}
    MANIFEST.write_text(json.dumps(man, indent=2) + '\n')
    return man


def verify(verbose=True):
    ok = True
    problems = []
    man = json.loads(MANIFEST.read_text())
    rows = []
    referenced = set()
    for name in REG:
        if name not in man['sfx']:
            problems.append(f'missing manifest entry: {name}')
            continue
        e = man['sfx'][name]
        want = REG[name]['variants']
        if len(e['files']) != want:
            problems.append(f'{name}: {len(e["files"])} files, expected {want}')
        durs, pks, tps, ons, lus = [], [], [], [], []
        for f in e['files']:
            referenced.add(f)
            p = OUT / f
            if not p.exists():
                problems.append(f'missing file {f}')
                continue
            s = measure(p)
            durs.append(s['dur'])
            pks.append(s['peak'])
            tps.append(s['tp'])
            ons.append(s['onset'])
            lus.append(s['lufs'])
            if s['onset'] > 5.0:
                problems.append(f'{f}: onset {s["onset"]:.1f} ms > 5 ms')
            if s['peak'] >= -0.1 or np.max(np.abs(s['y'])) >= 0.999:
                problems.append(f'{f}: clipping (peak {s["peak"]:.2f} dBFS)')
            if not (0.015 <= s['dur'] <= 5.0):
                problems.append(f'{f}: odd duration {s["dur"]:.3f}s')
        if durs and abs(max(durs) - e['duration']) > 0.01:
            problems.append(f'{name}: manifest duration {e["duration"]} != {max(durs):.3f}')
        if durs:
            rows.append((name, len(e['files']), REG[name]['cat'], max(durs), max(pks), max(tps),
                         max(ons), float(np.mean(lus))))
    amb_rows = []
    for name in AMB:
        if name not in man['amb']:
            problems.append(f'missing amb entry: {name}')
            continue
        e = man['amb'][name]
        referenced.add(e['file'])
        p = OUT / e['file']
        if not p.exists():
            problems.append(f'missing file {e["file"]}')
            continue
        s = measure(p, 2)
        if s['y'].shape[0] != 2:
            problems.append(f'{name}: not stereo')
        if abs(s['dur'] - (LOOP_LEN + OVERLAP)) > 0.03:
            problems.append(f'{name}: duration {s["dur"]:.3f} != 32.0')
        if s['peak'] >= -0.1:
            problems.append(f'{name}: clipping')
        amb_rows.append((name, s['dur'], s['peak'], s['tp'], s['lufs']))
    extra = [f'sfx/{p.name}' for p in SFX_DIR.glob('*.mp3')] + \
        [f'amb/{p.name}' for p in AMB_DIR.glob('*.mp3')]
    for f in extra:
        if f not in referenced:
            problems.append(f'unreferenced file {f}')
    if verbose:
        print(f'\n{"name":22s} {"var":>3s} {"category":11s} {"dur s":>6s} {"peak":>6s} '
              f'{"tpeak":>6s} {"onset":>6s} {"LUFS*":>6s}')
        print('-' * 75)
        for r in rows:
            print(f'{r[0]:22s} {r[1]:3d} {r[2]:11s} {r[3]:6.2f} {r[4]:6.1f} {r[5]:6.1f} '
                  f'{r[6]:5.1f}ms {r[7]:6.1f}')
        print('\nambience               dur s   peak  tpeak  LUFS(int)')
        for r in amb_rows:
            print(f'{r[0]:22s} {r[1]:6.2f} {r[2]:6.1f} {r[3]:6.1f} {r[4]:7.1f}')
        sz_sfx = sum(p.stat().st_size for p in SFX_DIR.glob('*.mp3'))
        sz_amb = sum(p.stat().st_size for p in AMB_DIR.glob('*.mp3'))
        nfiles = len(list(SFX_DIR.glob('*.mp3'))) + len(list(AMB_DIR.glob('*.mp3')))
        print(f'\n* LUFS for SFX = max momentary (400 ms) loudness, mean over variants')
        print(f'files: {nfiles}   sfx: {sz_sfx / 1e6:.2f} MB   amb: {sz_amb / 1e6:.2f} MB   '
              f'total: {(sz_sfx + sz_amb) / 1e6:.2f} MB')
        print(f'sounds: {len(rows)} sfx names, {len(amb_rows)} ambience loops')
    if problems:
        ok = False
        print('\nPROBLEMS:')
        for p in problems:
            print('  -', p)
    else:
        print('\nverification passed: all files exist, decode, start within 5 ms, no clipping, '
              'manifest consistent')
    return ok


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='', help='comma-separated sfx/amb names')
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--no-amb', action='store_true')
    ap.add_argument('--jobs', type=int, default=2)
    args = ap.parse_args()
    for d in (SFX_DIR, AMB_DIR, WAV_DIR):
        d.mkdir(parents=True, exist_ok=True)
    if args.verify:
        sys.exit(0 if verify() else 1)

    only = set(s for s in args.only.split(',') if s)
    unknown = only - set(REG) - set(AMB)
    if unknown:
        sys.exit(f'unknown names: {sorted(unknown)}')
    jobs = []
    for name, spec in REG.items():
        if only and name not in only:
            continue
        for v in range(spec['variants']):
            jobs.append(('sfx', (name, v)))
    if not args.no_amb:
        for name in AMB:
            if only and name not in only:
                continue
            jobs.insert(0, ('amb', name))     # long jobs first
    if not only:
        # full rebuild: remove stale outputs so the folders match the manifest exactly
        for p in list(SFX_DIR.glob('*.mp3')) + (list(AMB_DIR.glob('*.mp3')) if not args.no_amb
                                                 else []):
            p.unlink()
    t0 = time.time()
    res_sfx, res_amb, errors = [], [], []
    with Pool(args.jobs) as pool:
        for kind, r, err in pool.imap_unordered(_run, jobs):
            if err:
                errors.append((r, err))
                print(f'ERROR {r}:\n{err}', flush=True)
                continue
            (res_sfx if kind == 'sfx' else res_amb).append(r)
            label = r['name'] + (f'_{r["v"] + 1}' if kind == 'sfx' and
                                 REG[r['name']]['variants'] > 1 else '')
            extra = f' gain {r["gain_db"]:+.1f} dB' if kind == 'sfx' else ''
            print(f'  {label:26s} {r["dur"]:5.2f}s{extra}  ({r["secs"]:.1f}s)', flush=True)
    print(f'rendered {len(res_sfx)} sfx files, {len(res_amb)} ambience loops in '
          f'{time.time() - t0:.0f}s')
    write_manifest(res_sfx, res_amb, keep_existing=bool(only) or args.no_amb)
    ok = verify() and not errors
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
