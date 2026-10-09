#!/usr/bin/env python3
"""Render the complete Rampart Riot soundtrack.

    python3 tools/audio/music/build_all.py            # all tracks
    python3 tools/audio/music/build_all.py title boss # selected tracks

WAV intermediates -> /tmp/music_wav, spectrograms -> /tmp/music_png,
MP3s -> assets/audio/music/<id>.mp3, manifest -> assets/audio/music.json.
"""
import importlib
import json
import os
import subprocess
import sys
import time
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # tools/audio -> import music.*
PROJECT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_DIR = os.path.join(PROJECT, 'assets', 'audio', 'music')
MANIFEST = os.path.join(PROJECT, 'assets', 'audio', 'music.json')
WAV_DIR = '/tmp/music_wav'
PNG_DIR = '/tmp/music_png'

TRACKS = ['title', 'worldmap', 'battle1', 'battle2', 'battle3', 'battle4', 'boss', 'victory', 'defeat',
          'story_somber', 'story_tension', 'story_hope', 'opening', 'ending']
ORDER = ['battle4', 'ending', 'battle1', 'opening', 'battle2', 'boss', 'battle3', 'title', 'worldmap',
         'story_hope', 'story_somber', 'story_tension', 'victory', 'defeat']


def decode_mp3(path):
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.copy()


def encode_mp3(wav, mp3):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', mp3],
                   check=True)


def spectrogram(y, png, title):
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from music.dsp import SR
    m = y.mean(axis=0).astype(np.float64)
    fig, axs = plt.subplots(2, 1, figsize=(16, 9), gridspec_kw=dict(height_ratios=[2, 1]))
    for ax, (fmax, nfft) in zip(axs, [(22050, 2048), (1000, 8192)]):
        ax.specgram(m, NFFT=nfft, Fs=SR, noverlap=nfft * 3 // 4, cmap='magma', vmin=-140, vmax=-30, scale='dB')
        ax.set_ylim(0, fmax)
        ax.set_ylabel('Hz')
    axs[0].set_title(title)
    axs[1].set_xlabel('s')
    fig.tight_layout()
    fig.savefig(png, dpi=60)
    plt.close(fig)


def render_one(tid):
    import numpy as np
    from scipy.io import wavfile
    from music.dsp import SR, lufs_integrated, true_peak_db, a2db
    from music.mix import render_parts, master, loop_seam
    t0 = time.time()
    mod = importlib.import_module('music.tracks.' + tid)
    sc = mod.build()
    print('[%s] %d parts, %.1f s music + %.1f s tail' % (tid, len(sc.parts), sc.music_len, sc.tail), flush=True)
    mix, stats = render_parts(sc, verbose=True)
    wav = os.path.join(WAV_DIR, tid + '.wav')
    mp3 = os.path.join(OUT_DIR, tid + '.mp3')
    ceiling = -1.8
    offset = 0.45          # LAME/ffmpeg round trip measures ~0.45 dB quieter
    for attempt in range(5):
        y, info = master(mix, sc, ceiling_db=ceiling, target_offset=offset, verbose=True)
        wavfile.write(wav, SR, y.T.copy())
        encode_mp3(wav, mp3)
        dec = decode_mp3(mp3)
        tp_mp3 = true_peak_db(dec)
        l_mp3 = lufs_integrated(dec)
        ok_tp = tp_mp3 <= -1.05
        ok_l = abs(l_mp3 - sc.lufs) <= 0.15
        print('   mp3: %.2f LUFS, %.2f dBTP' % (l_mp3, tp_mp3), flush=True)
        if ok_tp and ok_l:
            break
        if not ok_l:
            offset += sc.lufs - l_mp3
        if not ok_tp:
            ceiling -= (tp_mp3 + 1.05) + 0.1
    lufs_mp3 = lufs_integrated(dec)
    res = dict(id=tid, loop=sc.loop, bpm=sc.bpm, music_len=sc.music_len, tail=sc.tail,
               duration=y.shape[1] / SR, dec_len=dec.shape[1] / SR, lufs=info['lufs'], lufs_mp3=lufs_mp3,
               tp=info['tp'], tp_mp3=tp_mp3, target=sc.lufs, cues=dict(sc.cues), bars=sc.bars,
               bar_s=sc.bar_s, comp=info['comp_gr'], lim=info['lim_gr'], dc=info['dc'],
               size=os.path.getsize(mp3), secs=time.time() - t0,
               clip=int(np.sum(np.abs(dec) >= 0.999)))
    if sc.loop:
        res.update(loop_seam(y, sc))
    # spectral balance: share of energy per band (dB re total)
    spec = np.abs(np.fft.rfft(y.mean(axis=0).astype(np.float64))) ** 2
    fr = np.fft.rfftfreq(y.shape[1], 1.0 / SR)
    tot = spec.sum() + 1e-20
    res['bands'] = {k: round(float(10 * np.log10(spec[(fr >= lo) & (fr < hi)].sum() / tot + 1e-20)), 1)
                    for k, (lo, hi) in {'<60': (0, 60), '150-400': (150, 400), '>10k': (10000, 22050),
                                        '>16k': (16000, 22050)}.items()}
    if hasattr(mod, 'verify'):
        res['verify'] = mod.verify(y, sc)
    spectrogram(y, os.path.join(PNG_DIR, tid + '.png'), '%s  (%.1f LUFS)' % (tid, info['lufs']))
    print('[%s] done in %.1fs' % (tid, res['secs']), flush=True)
    return res


def safe_render(tid):
    try:
        return render_one(tid)
    except Exception:
        import traceback
        traceback.print_exc()
        return dict(id=tid, error=True)


def check_scores(ids):
    """Build every score (no audio) to catch composition errors quickly."""
    ok = True
    for tid in ids:
        try:
            sc = importlib.import_module('music.tracks.' + tid).build()
            n = sum(len(p.notes) for p in sc.parts)
            last = max(nt.t + nt.dur for p in sc.parts for nt in p.notes)
            print('%-14s ok  %5d notes  music %.2fs  last note end %.2fs  cues %s' %
                  (tid, n, sc.music_len, last, sc.cues))
        except Exception as e:
            ok = False
            print('%-14s FAILED: %r' % (tid, e))
    return ok


def main():
    os.makedirs(WAV_DIR, exist_ok=True)
    os.makedirs(PNG_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    args = sys.argv[1:]
    if args and args[0] == '--check':
        sys.exit(0 if check_scores(args[1:] or TRACKS) else 1)
    ids = args or TRACKS
    if not check_scores(ids):
        sys.exit(1)
    ids = sorted(ids, key=lambda t: ORDER.index(t) if t in ORDER else 99)
    t0 = time.time()
    if len(ids) > 1:
        with Pool(2) as pool:
            results = pool.map(safe_render, ids, chunksize=1)
    else:
        results = [safe_render(ids[0])]
    failed = [r['id'] for r in results if r.get('error')]
    results = [r for r in results if not r.get('error')]
    manifest = {}
    if os.path.exists(MANIFEST):
        try:
            manifest = json.load(open(MANIFEST))
        except Exception:
            manifest = {}
    for r in results:
        e = {'file': 'music/%s.mp3' % r['id'], 'loop': bool(r['loop'])}
        if r['loop']:
            e['loopLength'] = round(r['music_len'], 4)
        e['tail'] = round(r['tail'], 3)
        e['duration'] = round(r['duration'], 3)
        e['bpm'] = r['bpm']
        e['lufs'] = round(r['lufs_mp3'], 1)
        if r['loop']:
            e['bars'] = r['bars']
        e['cues'] = r['cues']
        manifest[r['id']] = e
    ordered = {k: manifest[k] for k in TRACKS if k in manifest}
    with open(MANIFEST, 'w') as f:
        json.dump(ordered, f, indent=2)
    print('\n%-14s %4s %8s %8s %6s %7s %7s %6s %6s %7s %8s' %
          ('id', 'loop', 'dur', 'loopLen', 'tail', 'LUFS', 'target', 'TP', 'bars', 'seamdB', 'size'))
    for r in sorted(results, key=lambda r: TRACKS.index(r['id'])):
        seam = r.get('last_bar_db', 0) - r.get('first_bar_db', 0) if r['loop'] else 0.0
        print('%-14s %4s %8.3f %8s %6.2f %7.2f %7.1f %6.2f %6s %7.2f %7.0fk  (%.0fs, clip=%d, declen %.3f)' %
              (r['id'], 'y' if r['loop'] else 'n', r['duration'],
               '%.3f' % r['music_len'] if r['loop'] else '-', r['tail'], r['lufs_mp3'], r['target'],
               r['tp_mp3'], r['bars'] if r['loop'] else '-', seam, r['size'] / 1024, r['secs'], r['clip'],
               r['dec_len']))
        print('    bands:', r['bands'])
        if 'verify' in r:
            print('    verify:', r['verify'])
        if r['loop']:
            print('    seam: first bar %.1f dB, last bar %.1f dB, 50ms before/after wrap %.1f / %.1f dB' %
                  (r['first_bar_db'], r['last_bar_db'], r['seam_before_db'], r['seam_after_db']))
            print('    bar RMS:', ' '.join('%.0f' % v for v in r['bar_db']))
    if failed:
        print('FAILED:', failed)
    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR) if f.endswith('.mp3'))
    print('total MP3 size: %.2f MB   wall %.0fs' % (total / 1e6, time.time() - t0))


if __name__ == '__main__':
    main()
