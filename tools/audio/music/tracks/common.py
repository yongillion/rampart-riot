"""Shared musical material: the Rampart leitmotif, the Oath theme, chord
progressions and small orchestration helpers used by all cues."""
from ..score import pm, chord, bass_note, Part

# --- "The Rampart" leitmotif ------------------------------------------------
RAMPART_MINOR = ("D4:q A4:q. G4:e F4:q | G4:h. A4:q | Bb4:q. A4:e G4:q F4:q | E4:h. A3:q | "
                 "D4:q A4:q. G4:e F4:q | D5:h. C5:q | Bb4:q A4:q G4:q E4:q | D4:w")
RAMPART_MINOR_CH = ['Dm', 'Gm', 'Bb', 'A7', 'Dm', ('Bb', 3), ('C', 1), ('Gm', 2), ('A', 2), 'Dm']
RAMPART_MAJOR = ("D4:q A4:q. G4:e F#4:q | G4:h. A4:q | B4:q. A4:e G4:q F#4:q | E4:h. A3:q | "
                 "D4:q A4:q. G4:e F#4:q | D5:h. C#5:q | B4:q A4:q G4:q E4:q | D4:w")
RAMPART_MAJOR_CH = ['D', 'G', 'G', 'A7', 'D', ('Bm', 3), ('A', 1), ('G', 2), ('A7', 2), 'D']
HEAD_MINOR = "D4:q A4:q. G4:e F4:q"
HEAD_MAJOR = "D4:q A4:q. G4:e F#4:q"
# first half only (bars 1-4)
RAMPART_MINOR_A = "D4:q A4:q. G4:e F4:q | G4:h. A4:q | Bb4:q. A4:e G4:q F4:q | E4:h. A3:q"

# --- "The Oath" (original secondary theme), F major -----------------------
OATH_F = ("C5:q. D5:e F5:h | E5:q D5:q C5:h | Bb4:q C5:q D5:q F5:q | E5:h. D5:e C5:e | "
          "A4:q. Bb4:e C5:q D5:q | F5:q. E5:e D5:h | G4:q A4:q Bb4:q D5:q | C5:w | "
          "C5:q. D5:e F5:h | E5:q D5:q C5:h | Bb4:q C5:q D5:q G5:q | F5:h. G5:e A5:e | "
          "Bb5:h A5:q G5:q | F5:q. E5:e D5:q C5:q | D5:q C5:q Bb4:q G4:q | F4:w")
OATH_F_CH = ['F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'Gm7', ('C7sus4', 2), ('C', 2),
             'F', 'Am', 'Bb', 'Dm', 'Bb', 'F/C', ('Gm7', 2), ('C7', 2), 'F']
# compact 8-bar statement (bars 1-4 + 13-16 with a new connecting pickup)
OATH8_F = ("C5:q. D5:e F5:h | E5:q D5:q C5:h | Bb4:q C5:q D5:q F5:q | E5:h. G5:e A5:e | "
           "Bb5:h A5:q G5:q | F5:q. E5:e D5:q C5:q | D5:q C5:q Bb4:q G4:q | F4:w")
OATH8_F_CH = ['F', 'Am', 'Bb', 'C', 'Bb', 'F/C', ('Gm7', 2), ('C7', 2), 'F']

FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def tr_chord(sym, semis, sharps=False):
    names = SHARP_NAMES if sharps else FLAT_NAMES
    import re
    m = re.fullmatch(r'([A-G][#b]?)([^/]*)(?:/([A-G][#b]?))?', sym)
    from ..score import pc
    r = names[(pc(m.group(1)) + semis) % 12]
    out = r + m.group(2)
    if m.group(3):
        out += '/' + names[(pc(m.group(3)) + semis) % 12]
    return out


def tr_chords(chs, semis, sharps=False):
    out = []
    for c in chs:
        if isinstance(c, tuple):
            out.append((tr_chord(c[0], semis, sharps), c[1]))
        else:
            out.append(tr_chord(c, semis, sharps))
    return out


def expand(chs, beats_each=4):
    """-> list of (symbol, beats)."""
    return [(c, beats_each) if isinstance(c, str) else c for c in chs]


def chord_tones(sym, lo, count):
    """Ascending chord tones starting at the first chord tone >= lo."""
    _, pcs, _ = chord(sym)
    lo = pm(lo)
    out = []
    p = lo
    while len(out) < count:
        if p % 12 in pcs:
            out.append(p)
        p += 1
    return out


def root_at(sym, lo):
    _, _, b = chord(sym)
    lo = pm(lo)
    return lo + ((b - lo) % 12)


# ---------------------------------------------------------------------------
# Pattern helpers (all positions are bar-relative, beats are quarter notes)
# ---------------------------------------------------------------------------
def drive8(part, bar, sym, lo='C2', vel=0.6, art='staccato', beats=4, beat=0.0, accent_first=True,
           pattern=(0, 0, -1, 0, 1, 0, -1, 0)):
    """Driving 8th-note bass: root, root, 5th below, root, 3rd/octave... per chord."""
    _, pcs, b = chord(sym)
    r = root_at(sym, lo)
    fifth = r + 7 - 12 if r + 7 - 12 >= pm(lo) - 5 else r + 7
    third = r + ((pcs[1] - pcs[0]) % 12)
    notes = {0: r, -1: fifth, 1: third, 2: r + 12, 3: r + 7}
    sc = part.score
    n = int(beats * 2)
    for i in range(n):
        idx = pattern[i % len(pattern)]
        v = vel * (1.12 if (i % 4 == 0 and accent_first) else 1.0)
        part.note(bar, beat + i * 0.5, 0.5, notes[idx], v, art)


def ost16(part, bar, sym, lo, idx=(0, 1, 2, 1), vel=0.55, art='spiccato', beats=4, beat=0.0, acc=(0,),
          acc_amt=1.15):
    tones = chord_tones(sym, lo, max(idx) + 1)
    n = int(beats * 4)
    for i in range(n):
        v = vel * (acc_amt if (i % 4) in acc else 1.0)
        part.note(bar, beat + i * 0.25, 0.25, tones[idx[i % len(idx)]], v, art)


def arp(part, bar, sym, lo, idx, step=0.5, vel=0.55, art=None, beats=4, beat=0.0, dur=None):
    tones = chord_tones(sym, lo, max(idx) + 1)
    n = int(round(beats / step))
    for i in range(n):
        part.note(bar, beat + i * step, dur or step, tones[idx[i % len(idx)]], vel, art)


def prog_apply(chs, bar, fn):
    """Call fn(bar, beat, symbol, beats) for every chord in a progression."""
    pos = 0.0
    for sym, bts in expand(chs):
        b = bar + int(pos // 4)
        fn(b, pos % 4, sym, bts)
        pos += bts
    return pos


def bassline(part, bar, chs, lo='C2', vel=0.6, art='sustain', legato=False, split=1):
    """Roots of a progression (optionally split into repeated notes, or as one legato line)."""
    if legato:
        return part_seq_midi(part, bar, [(root_at(s, lo), bts) for s, bts in expand(chs)], vel, art)

    def f(b, bt, sym, bts):
        r = root_at(sym, lo)
        d = bts / split
        for k in range(split):
            part.note(b, bt + k * d, d, r, vel, art)
    return prog_apply(chs, bar, f)


def part_seq_midi(part, bar, items, vel, art, legato=True, beat=0.0):
    """Legato line from (midi, beats) items."""
    sc = part.score
    pos = (bar - 1) * sc.bpb + beat
    ph = part._new_phrase() if legato else None
    for i, (m, bts) in enumerate(items):
        if m is not None:
            part.add(sc.t(1, pos), bts * sc.spb, m, vel, art, None, ph + (0, 0) if ph else None)
        pos += bts
    return pos


# ---------------------------------------------------------------------------
# Battle helpers
# ---------------------------------------------------------------------------
def pedal_cell(minor, kind=0):
    t = 3 if minor else 4
    if kind == 0:   # root pedal with 5-3-5-4-5-3-2 upper line
        return [0, 0, 7, 0, t, 0, 7, 0, 5, 0, 7, 0, t, 0, 2, 0]
    if kind == 1:   # rising/falling figure (no pedal)
        return [0, 7, 12, 7, t + 12, 7, 12, 7, 0, 7, 12, 7, 5 + 12, 12, 7, t]
    if kind == 2:   # galloping 8th+two 16ths feel, root heavy
        return [0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 0, 12, 0, 0, t, 0]
    if kind == 3:   # dark pedal with b2 neighbour (phrygian)
        return [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 7, 0, 1, 0, t, 0]
    if kind == 4:   # gallop: 8th + two 16ths
        return [0, None, 0, 0, 0, None, 0, 0, 0, None, 0, 0, 7, None, 7, 12]
    if kind == 5:   # gallop with neighbour motion
        return [0, None, 0, 0, t, None, 0, 0, 7, None, 0, 0, t, None, 2, 0]
    raise ValueError(kind)


def ostinato(part, bar, sym, lo, vel=0.6, art='spiccato', beats=4, beat=0.0, kind=0,
             accents=(0, 3, 6, 8, 11, 14), acc=1.18, soft=0.9, step=0.25):
    _, pcs, _ = chord(sym)
    r = root_at(sym, lo)
    minor = (pcs[1] - pcs[0]) % 12 == 3
    offs = pedal_cell(minor, kind)
    n = int(round(beats / step))
    for i in range(n):
        k = int(round((beat + i * step) / 0.25)) % 16
        if offs[k] is None:
            continue
        d = step * (2 if offs[(k + 1) % 16] is None else 1)
        v = vel * (acc if k in accents else soft)
        part.note(bar, beat + i * step, d, r + offs[k], v, art)


GROOVES = {
    # (odaiko, chu, shime) 16-step grids
    'A': ("X.......X.....x.", "....X.......X..x", None),
    'A2': ("X.....x.X.......", "....X..x....X.x.", "x.x.x.x.x.x.x.x."),
    'B': ("X..x..x.X..x..x.", "..X...X...X...XX", "xxxxxxxxxxxxxxxx"),
    'C': ("X.......X.......", None, "x.x.x.x.x.x.x.x."),
    'D': ("X..x..x.X..x..x.", "X.x.X.x.X.x.X.xx", "xxxxxxxxxxxxxxxx"),
    'H': ("X...............", None, None),
    'S': (None, None, "x.x.x.x.x.x.x.x."),
}


def groove(tk, bar, kind, vel=0.8, bars=1):
    o, c, s = GROOVES[kind]
    for b in range(bar, bar + bars):
        if o:
            tk.pattern(b, o, art='odaiko', vel=vel, vmap={'X': 1.0, 'x': 0.78})
        if c:
            tk.pattern(b, c, art='chu', vel=vel * 0.85, vmap={'X': 1.0, 'x': 0.75}, pan_off=0.22)
        if s:
            tk.pattern(b, s, art='shime', vel=vel * 0.55, vmap={'X': 1.0, 'x': 0.75}, pan_off=-0.25)


def fill(tk, bar, vel=0.85, beat=0.0, beats=4):
    """Taiko build: 8ths then 16ths with a crescendo."""
    n8 = int(beats)
    for i in range(n8 * 2):
        pos = beat + i * 0.5
        v = vel * (0.6 + 0.4 * i / (n8 * 2))
        tk.hit(bar, pos, 'chu', vel=v, pan_off=0.2 * (1 if i % 2 else -1))
        if pos >= beat + beats / 2:
            tk.hit(bar, pos + 0.25, 'chu', vel=v * 0.85, pan_off=-0.2 * (1 if i % 2 else -1))
    tk.hit(bar, beat, 'odaiko', vel=vel)


def stem_onsets(sc, part_names, cue_names, pre=0.03, post=0.06, frac=0.12):
    """Render only the hit parts (percussion/fx) and report, for each cue, the
    offset (ms) of the first sample reaching `frac` of the local peak."""
    import numpy as np
    from ..dsp import SR, stable_seed
    from ..synth import make_instrument, Ctx
    n = int(round(sc.total_len * SR))
    stem = np.zeros((2, n), np.float32)
    for p in sc.parts:
        if p.name in part_names:
            inst = make_instrument(p.kind, p.pan, p.width, stable_seed(sc.id, p.name, 'inst'), **p.inst_kw)
            stem += inst.render_part(p.notes, n, Ctx(np.random.default_rng(0), None))
    a = np.abs(stem).max(axis=0)
    out = {}
    for name in cue_names:
        t = sc.cues[name]
        i0, i1 = int((t - pre) * SR), int((t + post) * SR)
        seg = a[i0:i1]
        k = int(np.argmax(seg >= frac * seg.max()))
        out[name] = round((i0 + k) / SR * 1000.0 - t * 1000.0, 1)
    return out
