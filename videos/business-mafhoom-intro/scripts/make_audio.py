"""Deterministic synth for the Business Mafhoom intro: a 120 BPM boom-bap sting
(music.wav) and a separate SFX track (sfx.wav). Seeded RNG, no samples, no licences.
Usage: python3 scripts/make_audio.py  (needs numpy + scipy)"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
import os

SR = 48000
DUR = 10.0
N = int(SR * DUR)
rng = np.random.default_rng(20260924)
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")


def t_(d):
    return np.arange(int(SR * d)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i : i + len(sig)] += sig * l * 1.414
    buf[1, i : i + len(sig)] += sig * r * 1.414


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def reverb(buf, secs=1.4, mix=0.18):
    ir_t = t_(secs)
    out = np.zeros_like(buf)
    for c in range(2):
        ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 4.2)
        ir = lp(ir, 6000)
        ir /= np.sqrt(np.sum(ir**2))
        out[c] = fftconvolve(buf[c], ir)[:N]
    return buf + out * mix


# ---------- instruments ----------
def kick():
    t = t_(0.45)
    f = 45 + 95 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s += 0.35 * np.exp(-t * 300) * rng.standard_normal(len(t))
    return np.tanh(s * 1.6)


def snare():
    t = t_(0.28)
    n = bp(rng.standard_normal(len(t)), 1200, 7000) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)
    clap = sum(
        bp(rng.standard_normal(len(t)), 900, 3000) * np.exp(-np.maximum(t - d, 0) * 40) * (t >= d)
        for d in (0, 0.008, 0.017)
    )
    return 0.9 * n + 0.5 * tone + 0.5 * clap


def hat(open_=False):
    t = t_(0.18 if open_ else 0.05)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t * (18 if open_ else 90))


def epiano(notes, d=1.9):
    t = t_(d)
    s = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        s += (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)
              + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 9))
    env = np.minimum(t / 0.004, 1) * np.exp(-t * 1.3)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 5.5 * t)
    return s * env * trem / len(notes)


def stab(notes, d=0.35):
    t = t_(d)
    s = np.zeros(len(t))
    for m in notes:
        for det in (-0.08, 0.08):
            f = midi(m + det)
            s += 2 * ((t * f) % 1) - 1
    s = lp(s, 2600) * np.minimum(t / 0.003, 1) * np.exp(-t * 9)
    return s / len(notes) / 2


def bass(m, d):
    t = t_(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(t / 0.006, 1) * np.minimum(np.maximum(d - t, 0) / 0.03, 1)
    return np.tanh(s * env * 1.4)


def pop(f0=900):
    t = t_(0.09)
    f = f0 * (1 + 0.8 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45)


def whoosh(d=0.6, peak=0.62):
    t = t_(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 480
    for i in range(0, len(t), seg):
        p = min(i / len(t), 1)
        c = 250 + 4200 * p**1.6
        chunk = bp(n[max(i - 2000, 0) : i + seg], c * 0.6, min(c * 1.6, 20000))[-seg:]
        out[i : i + len(chunk)] = chunk[: len(out[i : i + seg])]
    env = np.where(t < d * peak, (t / (d * peak)) ** 2, np.exp(-(t - d * peak) * 14))
    return out * env


def riser(d=1.0):
    t = t_(d)
    f = 300 + 2400 * (t / d) ** 2
    s = bp(rng.standard_normal(len(t)), 1500, 9000) * (t / d) ** 2.5
    s += 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 2
    return s


def cha_ching():
    # "cha": drawer/lever clack
    t = t_(0.12)
    cha = bp(rng.standard_normal(len(t)), 1800, 6000) * np.exp(-t * 55)
    cha += 0.6 * np.sin(2 * np.pi * 320 * t) * np.exp(-t * 70)
    # "ching": bright bell with inharmonic partials
    t2 = t_(1.4)
    ching = np.zeros(len(t2))
    for f, a, dcy in ((2093, 1.0, 3.2), (2637, 0.7, 4.0), (3322, 0.55, 5.0), (4186, 0.45, 6.0), (5274, 0.3, 8.0), (6645, 0.2, 10.0)):
        ching += a * np.sin(2 * np.pi * f * t2) * np.exp(-t2 * dcy)
    ching *= np.minimum(t2 / 0.002, 1)
    out = np.zeros(int(SR * 1.6))
    out[: len(cha)] += cha
    o = int(0.075 * SR)
    out[o : o + len(ching)] += ching * 0.55
    # coin jingles
    for k in range(9):
        at = 0.09 + k * 0.045 + rng.uniform(0, 0.03)
        f = rng.uniform(3800, 7200)
        tj = t_(0.12)
        j = np.sin(2 * np.pi * f * tj) * np.exp(-tj * 40) * rng.uniform(0.15, 0.35)
        i = int(at * SR)
        out[i : i + len(j)] += j
    return out


def impact():
    t = t_(0.9)
    f = 38 + 60 * np.exp(-t * 18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
    s += lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 10) * 0.6
    return np.tanh(s * 1.3)


# ---------- arrangement (120 BPM, beat = 0.5s, bar = 2s) ----------
music = np.zeros((2, N))
# chords per bar: Cm9, Abmaj9, Fm9, G7sus->G7, Cm9
prog = [
    (0.0, [48, 55, 58, 62, 63], 36),
    (2.0, [44, 51, 55, 58, 60], 32),
    (4.0, [41, 48, 51, 55, 56], 29),
    (6.0, [43, 50, 53, 55, 60], 31),
    (8.0, [48, 55, 58, 62, 63], 36),
]
for at, ch, root in prog:
    place(music, epiano([m + 12 for m in ch], 2.3 if at < 8 else 2.0), at, 0.34)

# intro 0-2: filtered, hats + ticking kick
intro_hat = np.zeros((2, N))
for i in range(8):
    place(intro_hat, hat(), i * 0.25, 0.20, pan=0.3 if i % 2 else -0.3)
music += intro_hat
place(music, kick(), 0.0, 0.55)
place(music, kick(), 1.0, 0.45)

# groove 2.0 - 6.5 and 7.0 - 9.0
def bar(t0, full=True, until=99):
    hits_k = [0.0, 0.75, 1.25] if full else [0.0]
    for k in hits_k:
        if t0 + k < until:
            place(music, kick(), t0 + k, 0.9)
    for s in (0.5, 1.5):
        if t0 + s < until:
            place(music, snare(), t0 + s, 0.55)
    for i in range(8):
        tt = t0 + i * 0.25 + (0.03 if i % 2 else 0)  # swing
        if tt < until:
            place(music, hat(open_=(i == 7)), tt, 0.22 if i % 2 else 0.3, pan=0.25 if i % 2 else -0.25)

bar(2.0)
bar(4.0, until=6.5)
bar(7.0)
place(music, kick(), 9.0, 1.0)

# bass line
for at, dur, m in [(2.0, 0.7, 32), (2.75, 0.4, 32), (3.25, 0.7, 39), (4.0, 0.7, 29), (4.75, 0.4, 29),
                   (5.25, 0.6, 36), (6.0, 0.45, 31), (7.0, 0.7, 36), (7.75, 0.4, 36), (8.25, 0.7, 43), (9.0, 0.9, 36)]:
    place(music, bass(m, dur), at, 0.55)

# brass-ish stabs on the drops
place(music, stab([60, 63, 67, 70]), 2.0, 0.55)
place(music, stab([60, 63, 67, 70]), 2.75, 0.35)
place(music, stab([67, 70, 74, 75]), 7.0, 0.6)
place(music, stab([60, 63, 67, 70, 74], 0.9), 9.0, 0.6)

# riser into the peak
place(music, riser(1.0), 5.5, 0.35)
music = reverb(music, 1.3, 0.16)

# ---------- SFX ----------
sfx = np.zeros((2, N))
# icon / coin landings 0.35 - 1.8s (matches the drop-in stagger in index.html)
lands = [0.52, 0.64, 0.76, 0.88, 1.00, 1.12, 1.24, 1.36, 1.48]
for i, at in enumerate(lands):
    place(sfx, pop(700 + 60 * (i % 5)), at, 0.32, pan=-0.5 + i / 8)
place(sfx, whoosh(0.45, 0.8), 1.75, 0.35)          # character pop-in
place(sfx, pop(520), 2.12, 0.4)
place(sfx, pop(1500), 2.95, 0.2)                     # glasses tap
place(sfx, whoosh(0.5, 0.7), 4.25, 0.18, pan=0.3)    # chart start
place(sfx, impact(), 6.5, 0.6)
place(sfx, cha_ching(), 6.45, 0.75)                  # coin burst at the peak
place(sfx, whoosh(0.6, 0.62), 6.75, 0.55)            # logo reveal (peaks ~7.12s)
place(sfx, pop(1100), 7.95, 0.25)                    # subline
sfx = reverb(sfx, 1.0, 0.12)


def master(x, peak_db=-1.0):
    x = np.tanh(x * 1.2)
    fade = np.ones(N)
    fl = int(0.6 * SR)
    fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
    x *= fade
    x *= 10 ** (peak_db / 20) / np.max(np.abs(x))
    return (x.T * 32767).astype(np.int16)


os.makedirs(OUT, exist_ok=True)
wavfile.write(os.path.join(OUT, "music.wav"), SR, master(music, -3.0))
wavfile.write(os.path.join(OUT, "sfx.wav"), SR, master(sfx, -2.0))
print("ok")
