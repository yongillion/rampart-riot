"""Note-event helpers: pitch/duration parsing, melodic text, chords, voicing,
drum patterns, humanisation and phrase-level dynamics.

Melody text format (4/4 assumed, '|' bar lines are checked):
    "D4:q A4:q. G4:e F4:q | G4:h. A4:q"
    pitch      : C4, F#3, Bb5, r (rest), chords as D4,F4,A4
    duration   : w h q e s t, dotted (q.), triplet (e3 = 1/3 beat), sums (h+e), or beats (1.5)
    suffixes   : '>' accent, '*' staccato (articulation override), '^' marcato
"""
import re

import numpy as np

from .dsp import stable_seed
from .synth import REGISTRY

NOTE_BASE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
DUR_BASE = {'w': 4.0, 'h': 2.0, 'q': 1.0, 'e': 0.5, 's': 0.25, 't': 0.125}


def pm(s):
    """Pitch name -> midi number ('C4' = 60)."""
    if isinstance(s, (int, float)):
        return s
    m = re.fullmatch(r'([A-Ga-g])([#b]*)(-?\d+)', s.strip())
    if not m:
        raise ValueError('bad pitch %r' % s)
    letter, acc, octv = m.groups()
    return 12 * (int(octv) + 1) + NOTE_BASE[letter.upper()] + acc.count('#') - acc.count('b')


def pc(s):
    m = re.fullmatch(r'([A-G])([#b]?)', s)
    return (NOTE_BASE[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)) % 12


def parse_dur(tok):
    total = 0.0
    for part in tok.split('+'):
        if re.fullmatch(r'\d+(\.\d+)?', part):
            total += float(part)
            continue
        base = DUR_BASE[part[0]]
        rest = part[1:]
        if rest.startswith('3'):
            base *= 2.0 / 3.0
            rest = rest[1:]
        dots = rest.count('.')
        total += base * (2.0 - 0.5 ** dots)
    return total


CHORD_Q = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
    'sus4': [0, 5, 7], 'sus2': [0, 2, 7], 'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14],
    'dim': [0, 3, 6], '5': [0, 7], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '9': [0, 4, 7, 10, 14],
    'm9': [0, 3, 7, 10, 14], '7sus4': [0, 5, 7, 10], 'aug': [0, 4, 8], 'maj9': [0, 4, 7, 11, 14],
    'm(b6)': [0, 3, 7, 8], 'sus4add9': [0, 5, 7, 14], 'm11': [0, 3, 7, 10, 14, 17],
}


def chord(sym):
    """'Dm', 'Bb', 'A7', 'C/E', 'F#m7' -> (root pc, list of pcs, bass pc)."""
    m = re.fullmatch(r'([A-G][#b]?)([^/]*)(?:/([A-G][#b]?))?', sym)
    if not m:
        raise ValueError(sym)
    root = pc(m.group(1))
    q = m.group(2)
    pcs = [(root + i) % 12 for i in CHORD_Q[q]]
    bass = pc(m.group(3)) if m.group(3) else root
    return root, pcs, bass


def voicing(sym, lo, hi, n, prev=None, include_bass=False, spread=0, _widen=0):
    """Choose n pitches in [lo, hi] for chord `sym`, voice-led from `prev`.
    spread=1 -> open position (triads: R-5-3 spacing at the bottom; 7ths: drop-2),
    spread=2 -> wider (drop-2-and-4 for 7th chords)."""
    lo, hi = pm(lo), pm(hi)
    root, pcs, bass = chord(sym)
    uniq = []
    for p in pcs:
        if p not in uniq:
            uniq.append(p)
    triad_open = bool(spread) and len(uniq) == 3
    best, best_cost = None, 1e9
    for inv in range(len(uniq)):
        order = uniq[inv:] + uniq[:inv]
        for start in range(lo, lo + 12):
            if start % 12 != order[0]:
                continue
            v = [start]
            j = 0
            while len(v) < n:
                j += 2 if (triad_open and len(v) <= 2) else 1
                target = order[j % len(order)]
                nxt = v[-1] + 1
                while nxt % 12 != target:
                    nxt += 1
                v.append(nxt)
            if spread and not triad_open and n >= 4:
                v = sorted(v)
                v[-2] -= 12
                if spread >= 2 and n >= 5:
                    v[-4] -= 12
                v = sorted(v)
            if v[-1] > hi or v[0] < lo or len(set(v)) < len(v):
                continue
            if include_bass and v[0] % 12 != bass:
                continue
            if prev:
                cost = sum(abs(a - b) for a, b in zip(sorted(v), sorted(prev)))
            else:
                cost = abs(np.mean(v) - (lo + hi) / 2)
            if root not in [x % 12 for x in v]:
                cost += 6
            if cost < best_cost:
                best, best_cost = v, cost
    if best is None:
        if spread:
            return voicing(sym, lo, hi, n, prev, include_bass, 0)
        if _widen < 5:      # tolerate slightly narrow ranges by widening them a little
            return voicing(sym, lo - 1, hi + 1, n, prev, include_bass, 0, _widen + 1)
        raise ValueError('no voicing for %s in %s-%s n=%d' % (sym, lo, hi, n))
    return best


def bass_note(sym, lo='C2', hi='B2'):
    lo = pm(lo)
    _, _, bass = chord(sym)
    p = lo + ((bass - lo) % 12)
    return p


class Note:
    __slots__ = ('t', 'dur', 'midi', 'vel', 'vel_end', 'art', 'kw', 'phrase')

    def __init__(self, t, dur, midi, vel, art=None, vel_end=None, phrase=None, **kw):
        self.t = float(t)
        self.dur = float(dur)
        self.midi = float(midi)
        self.vel = float(vel)
        self.vel_end = vel_end
        self.art = art
        self.phrase = phrase
        self.kw = kw

    def clone(self, **ch):
        n = Note(self.t, self.dur, self.midi, self.vel, self.art, self.vel_end, self.phrase, **dict(self.kw))
        for k, v in ch.items():
            setattr(n, k, v)
        return n

    def __repr__(self):
        return 'Note(t=%.3f d=%.3f m=%.1f v=%.2f %s)' % (self.t, self.dur, self.midi, self.vel, self.art)


class Part:
    def __init__(self, score, name, kind, **mix):
        self.score = score
        self.name = name
        self.kind = kind
        _cls, _args, defaults = REGISTRY[kind]
        m = dict(defaults)
        m.update(mix)
        self.pan = m['pan']
        self.width = m.get('width', 0.3)
        self.hall = m.get('hall', 0.4)
        self.long = m.get('long', 0.0)
        self.dry = m.get('dry', 1.0)
        self.gain = m.get('gain', 0.0)
        self.eq = m.get('eq', [])
        self.inst_kw = m.get('inst', {})
        self.human_t = m.get('human_t', 0.006)
        self.notes = []
        self._expr = []
        self._fader = []
        self._pid = 0
        self.rng = np.random.default_rng(stable_seed(score.id, name, 'human'))

    # ---- low level ----
    def _new_phrase(self):
        self._pid += 1
        return (self.name, self._pid)

    def add(self, t, dur, midi, vel, art=None, vel_end=None, phrase=None, human=True, **kw):
        if human:
            t += float(np.clip(self.rng.normal(0, self.human_t), -0.014, 0.014))
            j = float(self.rng.uniform(0.94, 1.06))
            vel *= j
            if vel_end is not None:
                vel_end *= j
        t = max(0.0, t)
        nt = Note(t, dur, midi, float(np.clip(vel, 0.02, 1.2)), art, vel_end, phrase, **kw)
        self.notes.append(nt)
        return nt

    def note(self, bar, beat, dur_beats, pitch, vel=0.7, art=None, vel_end=None, human=True, **kw):
        sc = self.score
        return self.add(sc.t(bar, beat), dur_beats * sc.spb, pm(pitch), vel, art, vel_end, None, human, **kw)

    def hit(self, bar, beat, art=None, vel=0.8, pitch=60, dur=0.5, human=True, **kw):
        return self.note(bar, beat, dur, pitch, vel, art, None, human, **kw)

    def at(self, t_sec, dur_sec, pitch, vel=0.8, art=None, vel_end=None, human=False, **kw):
        """Absolute-time event (for cue-locked hits)."""
        return self.add(t_sec, dur_sec, pm(pitch), vel, art, vel_end, None, human, **kw)

    # ---- melodic text ----
    def seq(self, bar, text, vel=0.7, art=None, legato=False, dyn=None, tr=0, beat=0.0, gate=1.0,
            human=True, check=True, **kw):
        """Parse melody text starting at (bar, beat); returns end position in absolute beats."""
        sc = self.score
        pos = (bar - 1) * sc.bpb + beat
        start = pos
        bars = text.split('|')
        if check and len(bars) > 1:
            for bi, btxt in enumerate(bars):
                toks = btxt.split()
                if not toks:
                    continue
                tot = sum(parse_dur(tk.split(':')[1].rstrip('>*^')) for tk in toks)
                if bi == 0 and beat > 0:
                    continue
                if abs(tot - sc.bpb) > 1e-6 and not (bi == len(bars) - 1 and tot < sc.bpb):
                    raise ValueError('bar %d of %r has %.3f beats' % (bi, text[:40], tot))
        phrase_base = self._new_phrase() if legato else None
        seg = 0
        for tok in text.replace('|', ' ').split():
            ptxt, dtxt = tok.split(':')
            accent = 0.0
            nart = art
            while dtxt and dtxt[-1] in '>*^':
                c = dtxt[-1]
                dtxt = dtxt[:-1]
                if c == '>':
                    accent = 0.35
                elif c == '*':
                    nart = 'staccato' if art not in ('spiccato', 'pizz') else art
                elif c == '^':
                    nart = 'marcato'
            d = parse_dur(dtxt)
            if ptxt.lower() == 'r':
                pos += d
                seg += 1
                continue
            pitches = [pm(x) + tr for x in ptxt.split(',')]
            rel = pos - start
            v = self._dyn(dyn, rel, vel)
            ve = None
            if dyn is not None and d >= 1.5:
                ve = self._dyn(dyn, rel + d, vel)
            dsec = d * sc.spb * (1.0 if legato else gate)
            for vi, p in enumerate(sorted(pitches)):
                ph = None
                if legato:
                    ph = phrase_base + (seg, vi)
                kws = dict(kw)
                if accent:
                    kws['accent'] = accent
                self.add(sc.t(1, pos), dsec, p, v + (0.06 if accent else 0.0), nart, ve, ph, human, **kws)
            pos += d
        return pos

    @staticmethod
    def _dyn(dyn, rel, vel):
        if dyn is None:
            return vel
        if callable(dyn):
            return dyn(rel)
        xs = [a for a, _ in dyn]
        ys = [b for _, b in dyn]
        return float(np.interp(rel, xs, ys))

    # ---- chords / pads ----
    def pad(self, bar, chords, lo, hi, n=3, beats_each=4, vel=0.6, art='sustain', dyn=None, legato=True,
            overlap=0.0, spread=0, human=True, **kw):
        """Sustained voice-led chord progression. chords: list of symbols or (symbol, beats)."""
        sc = self.score
        pos = (bar - 1) * sc.bpb
        start = pos
        prev = None
        items = [(c, beats_each) if isinstance(c, str) else c for c in chords]
        voiced = []
        for sym, bts in items:
            if sym is None or sym == 'r':
                voiced.append((None, bts))
                prev = None
                continue
            v = voicing(sym, lo, hi, n, prev, spread=spread)
            voiced.append((v, bts))
            prev = v
        base = self._new_phrase()
        seg = 0
        for v, bts in voiced:
            if v is None:
                pos += bts
                seg += 1
                continue
            rel = pos - start
            vv = self._dyn(dyn, rel, vel)
            ve = self._dyn(dyn, rel + bts, vel) if dyn is not None else None
            for vi, p in enumerate(sorted(v)):
                ph = base + (seg, vi) if legato else None
                self.add(sc.t(1, pos), (bts + overlap) * sc.spb, p, vv, art, ve, ph, human, **kw)
            pos += bts
        return pos

    def pattern(self, bar, pat, art=None, vel=0.8, step=0.25, pitch=60, vmap=None, dur=None, beat=0.0,
                human=True, **kw):
        """Drum/rhythm grid. 'X' accent, 'x' normal, 'o' soft, 'g' ghost, '.' rest; '|' and spaces ignored."""
        sc = self.score
        vmap = vmap or {'X': 1.0, 'x': 0.8, 'o': 0.6, 'g': 0.35}
        pos = (bar - 1) * sc.bpb + beat
        for ch in pat:
            if ch in ' |':
                continue
            if ch in vmap:
                self.add(sc.t(1, pos), (dur or step) * sc.spb, pm(pitch), vel * vmap[ch], art, None, None,
                         human, **kw)
            pos += step
        return pos

    def roll(self, bar, beat, beats, v0, v1, art='roll', pitch=60, human=False, **kw):
        sc = self.score
        return self.add(sc.t(bar, beat), beats * sc.spb, pm(pitch), v0, art, v1, None, human, **kw)

    # ---- automation ----
    def expr(self, points):
        """points: [(bar, beat, value)] piecewise-linear expression (multiplies dynamics)."""
        for b, bt, v in points:
            self._expr.append((self.score.t(b, bt), v))

    def fader(self, points):
        """Post-render volume automation: [(seconds, linear gain)] (e.g. a hard choke)."""
        self._fader.extend(points)

    def expr_arrays(self):
        if not self._expr:
            return None
        pts = sorted(self._expr)
        return np.array([p[0] for p in pts]), np.array([p[1] for p in pts])


class Score:
    def __init__(self, id, bpm, bars, bpb=4, loop=True, tail=3.0, lufs=-16.0, seed=1, rt60=2.6,
                 long_rt60=3.3, length_s=None, hall_return=1.0, long_return=1.0, master=None):
        self.id = id
        self.bpm = bpm
        self.bars = bars
        self.bpb = bpb
        self.spb = 60.0 / bpm
        self.loop = loop
        self.tail = tail
        self.lufs = lufs
        self.seed = seed
        self.rt60 = rt60
        self.long_rt60 = long_rt60
        self.length_s = length_s
        self.hall_return = hall_return
        self.long_return = long_return
        self.master = master or {}
        self.parts = []
        self.cues = {}

    def t(self, bar, beat=0.0):
        return ((bar - 1) * self.bpb + beat) * self.spb

    @property
    def bar_s(self):
        return self.bpb * self.spb

    @property
    def music_len(self):
        return self.length_s if self.length_s is not None else self.bars * self.bar_s

    @property
    def total_len(self):
        return self.music_len + self.tail

    def part(self, name, kind, **mix):
        p = Part(self, name, kind, **mix)
        self.parts.append(p)
        return p

    def cue(self, name, seconds):
        self.cues[name] = round(float(seconds), 3)
