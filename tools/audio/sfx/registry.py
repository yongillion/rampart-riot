"""Sound registry and per-category mix levels.

Every recipe registers itself with @sfx(name, category, variants=...) or
@amb(name, ...). The build pipeline peak-normalises each render to -3 dBFS
(true peak), then applies the category's relative offset (the gain is baked
into the file; the manifest gain is always 1.0). Two corrections keep each
category even: dense/sustained sounds whose short-term loudness exceeds the
category cap are turned down, and very transient sounds below the floor are
densified (soft clip of the first peaks) so they read at a similar loudness.
"""

REG = {}
AMB = {}

# off:   level (dB) after -3 dBFS true-peak normalisation - the brief's scheme
#        (UI ~ -12 dB, frequent combat ~ -6 dB, big impacts at full level).
# cap:   ceiling for the max short-term (100 ms, K-weighted) loudness after the
#        offset; dense / sustained sounds above it are turned down (never up).
# floor: very transient sounds whose loudness falls below it get up to 4 dB of
#        oversampled soft clipping on their first peaks before normalisation, so
#        they read as loud as their neighbours without exceeding the category's
#        peak level (clean tonal sounds opt out with densify=False).
# hp / shelf: clean-up high-pass and low-shelf; gameplay sounds keep their energy
#        in the 150 Hz - 6 kHz band, big/cinematic hits keep (some) sub weight.
CATS = {
    'ui_soft':    dict(off=-18.0, cap=-40.0, floor=-43.0, hp=250.0, shelf=(250.0, -6.0),
                       kbps=96),                    # ticks, typewriter
    'ui':         dict(off=-12.0, cap=-26.0, floor=-31.0, hp=110.0, shelf=(160.0, -6.0),
                       kbps=96),                    # clicks, menus
    'ui_reward':  dict(off=-9.0, cap=-20.5, floor=-23.0, hp=90.0, shelf=(150.0, -4.0),
                       kbps=96),                    # stars, unlocks, level-up
    'combat':     dict(off=-6.0, cap=-19.5, floor=-23.5, hp=70.0, shelf=(140.0, -6.0),
                       kbps=96),                    # frequent battle sounds
    'combat_big': dict(off=-3.0, cap=-15.0, floor=-18.5, hp=40.0, shelf=(110.0, -3.0),
                       kbps=96),                    # explosions, big hits
    'event':      dict(off=-3.0, cap=-15.0, floor=-19.0, hp=60.0, shelf=(130.0, -4.0),
                       kbps=96),                    # horns, build, life lost
    'creature':   dict(off=-8.0, cap=-21.0, floor=-25.0, hp=90.0, shelf=(150.0, -6.0),
                       kbps=96),                    # map easter eggs
    'big':        dict(off=0.0, cap=-12.0, floor=-15.5, hp=25.0, shelf=(90.0, -3.0),
                       kbps=128),                   # boss, meteor, slam
    'cine':       dict(off=0.0, cap=-12.0, floor=-16.0, hp=25.0, shelf=(80.0, -2.0),
                       kbps=128),                   # cutscene hits
}


def sfx(name, cat, variants=1, maxdur=None, adj=0.0, kbps=None, tail_db=-55.0, densify=True):
    def deco(fn):
        assert name not in REG, name
        assert cat in CATS, cat
        REG[name] = dict(fn=fn, cat=cat, variants=variants, maxdur=maxdur, adj=adj,
                         kbps=kbps or CATS[cat]['kbps'], tail_db=tail_db, densify=densify)
        return fn
    return deco


def amb(name, lufs=-27.0):
    def deco(fn):
        assert name not in AMB, name
        AMB[name] = dict(fn=fn, lufs=lufs)
        return fn
    return deco
