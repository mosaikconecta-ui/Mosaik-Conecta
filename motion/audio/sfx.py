"""Gera a trilha sonora (pops, whooshes, cliques e batida) sincronizada com o motion.
Uso: python3 sfx.py saida.wav
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 17.5
rng = np.random.default_rng(7)
L = np.zeros(int(SR * DUR))
R = np.zeros(int(SR * DUR))


def t_arr(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    e = np.minimum(t / a, 1.0) * np.exp(-t / d)
    return e


def bp(x, lo, hi):
    sos = butter(2, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)


def lp(x, f):
    return sosfilt(butter(2, f, fs=SR, output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f, btype="high", fs=SR, output="sos"), x)


def add(at, x, g=1.0, pan=0.0):
    i = int(at * SR)
    x = x[: max(0, len(L) - i)]
    L[i : i + len(x)] += x * g * (1 - max(pan, 0))
    R[i : i + len(x)] += x * g * (1 + min(pan, 0))


# ---------- sons ----------
def pop(f=600, d=0.09):
    t = t_arr(d)
    fr = f * (1 + 1.6 * np.exp(-t / 0.012))  # queda rápida de pitch = "pop"
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * env(len(t), 0.001, d / 4)


def click(d=0.03):
    n = int(SR * d)
    return hp(rng.standard_normal(n), 2500) * env(n, 0.0005, 0.004)


def key():
    return bp(rng.standard_normal(int(SR * 0.04)), 1800, 6000) * env(int(SR * 0.04), 0.0005, 0.006) * 0.8


def whoosh(d=0.5, up=True, lo=300, hi=4000):
    n = int(SR * d)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    steps = 24
    seg = n // steps
    for s in range(steps):
        k = s / steps
        fc = lo + (hi - lo) * (k if up else 1 - k)
        chunk = bp(noise[s * seg : (s + 1) * seg + 2000], fc * 0.7, min(fc * 1.4, 20000))
        out[s * seg : s * seg + len(chunk)] += chunk[: n - s * seg]
    x = np.linspace(0, 1, n)
    shape = np.sin(np.pi * x) ** 2 if not up else x ** 2 * (1 - x) * 4 + x ** 6
    return out * shape * 0.6


def impact(f=55, d=0.9):
    t = t_arr(d)
    fr = f * (1 + 3 * np.exp(-t / 0.03))
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.28)
    snap = lp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.02) * 0.5
    return np.tanh((body + snap) * 1.6) * 0.8


def ding(f=1320, d=0.6):
    t = t_arr(d)
    x = sum(np.sin(2 * np.pi * f * m * t) * a for m, a in [(1, 1), (2.01, 0.35), (3.02, 0.12)])
    return x * env(len(t), 0.002, 0.18) * 0.5


def sweep(d=1.1):
    t = t_arr(d)
    f = 300 * (12 ** (t / d))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    air = hp(rng.standard_normal(len(t)), 4000) * 0.12
    shape = np.sin(np.pi * t / d) ** 1.5
    return (tone + air) * shape


# ---------- trilha (batida a 120 bpm) ----------
BEAT = 0.5


def kick():
    t = t_arr(0.35)
    fr = 50 * (1 + 2.5 * np.exp(-t / 0.025))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.12)


def hat(open_=False):
    n = int(SR * (0.18 if open_ else 0.05))
    return hp(rng.standard_normal(n), 7000) * env(n, 0.0005, 0.05 if open_ else 0.012) * 0.35


def clap():
    n = int(SR * 0.2)
    x = bp(rng.standard_normal(n), 900, 4000)
    e = np.zeros(n)
    for o in (0, 0.01, 0.02):
        i = int(o * SR)
        e[i:] += env(n - i, 0.0005, 0.03 if o < 0.02 else 0.08)
    return x * e * 0.5


def bass(f, d):
    t = t_arr(d)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * t)
    return lp(x, 400) * env(len(t), 0.005, d * 0.6) * 0.35


def pluck(f, d=0.35):
    t = t_arr(d)
    x = np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.05))
    return x * env(len(t), 0.002, 0.12) * 0.18


notes_bass = [55.0, 55.0, 43.65, 49.0]  # A1 A1 F1 G1 (1 compasso cada)
arp = [440, 523.25, 659.25, 523.25, 349.23, 440, 523.25, 440, 392, 493.88, 587.33, 493.88]

mus_L = np.zeros_like(L)
mus_R = np.zeros_like(R)


def madd(at, x, g=1.0, pan=0.0):
    i = int(at * SR)
    x = x[: max(0, len(mus_L) - i)]
    mus_L[i : i + len(x)] += x * g * (1 - max(pan, 0))
    mus_R[i : i + len(x)] += x * g * (1 + min(pan, 0))


nb = int(13.2 / BEAT)
for b in range(nb):
    at = b * BEAT
    full = at >= 2.75
    bar = (b // 4) % 4
    if full or b % 2 == 0:
        madd(at, kick(), 0.9 if full else 0.5)
    if full:
        madd(at + BEAT / 2, hat(b % 4 == 3), 0.8, pan=0.3)
        if b % 2 == 1:
            madd(at, clap(), 0.7, pan=-0.1)
        madd(at, bass(notes_bass[bar], BEAT * 0.9), 1.0)
        madd(at + BEAT / 2, bass(notes_bass[bar], BEAT * 0.45), 0.7)
    madd(at, pluck(arp[b % len(arp)]), 1.0 if full else 0.6, pan=-0.25)
    madd(at + BEAT / 2, pluck(arp[(b + 2) % len(arp)] * 2, 0.25), 0.5, pan=0.25)

# final: acorde sustentado depois do impacto
t = t_arr(3.4)
pad = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for f in (220, 261.63, 329.63, 440))
pad *= np.minimum(t / 0.05, 1) * np.exp(-t / 1.6) * 0.07
madd(14.05, pad)
for b in range(8):
    madd(14.05 + b * BEAT, pluck(arp[b % 4] * 2, 0.5), 0.6 * (1 - b / 9), pan=0.3 if b % 2 else -0.3)

# riser antes do mosaico
madd(12.2, whoosh(1.0, up=True, lo=200, hi=6000), 0.7)

# ---------- efeitos ----------
add(0.1, pop(520, 0.12), 0.9)
add(0.62, whoosh(0.45, up=False, lo=800, hi=3000), 0.45, pan=-0.3)
add(0.8, whoosh(0.5, up=False, lo=1500, hi=6000), 0.4, pan=0.2)
add(1.25, click(), 0.5)
add(1.95, whoosh(0.8, up=True, lo=150, hi=5000), 0.8)
add(2.72, impact(48, 0.9), 0.9)
for i in range(4):
    add(2.62 + i * 0.13, pop(700 + i * 90, 0.08), 0.55, pan=(-0.2 + i * 0.13))
add(3.55, whoosh(0.35, up=False, lo=2000, hi=7000), 0.6, pan=0.3)
add(3.62, pop(380, 0.16), 1.0)
add(3.62, impact(70, 0.4), 0.45)
add(3.95, click(), 0.4)
add(4.95, whoosh(0.45, up=False, lo=600, hi=4000), 0.6)
add(5.55, pop(450, 0.12), 0.85)
for i in range(21):  # digitação da URL
    add(6.0 + i * (0.75 / 21) + rng.uniform(-0.006, 0.006), key(), 0.55 + rng.uniform(-0.1, 0.1), pan=rng.uniform(-0.2, 0.2))
for i in range(10):  # blocos do esqueleto
    add(6.45 + i * 0.08, pop(900 + i * 60, 0.05), 0.3, pan=rng.uniform(-0.4, 0.4))
add(7.5, sweep(1.1), 0.9)
for i, (st, pn) in enumerate([(6.9, 0.4), (7.35, -0.4), (7.8, 0.4), (8.25, -0.4)]):
    add(st, pop(600 + i * 120, 0.1), 0.9, pan=pn)
add(9.42, click(0.02), 1.1)
add(9.44, pop(1200, 0.05), 0.35)
add(10.2, whoosh(0.7, up=False, lo=300, hi=3500), 0.75)
add(10.95, pop(500, 0.1), 0.6)
for i in range(3):
    st = 11.1 + i * 0.3
    add(st + 0.1, pop(650, 0.08), 0.6)
    add(st + 0.3, ding(1046.5 * (1.122 ** (i * 2)), 0.6), 0.9)
# cascata do mosaico
for i in range(18):
    at = 13.2 + i * 0.038 + rng.uniform(0, 0.015)
    add(at, pop(rng.uniform(420, 900), 0.06), 0.35, pan=rng.uniform(-0.6, 0.6))
add(14.05, impact(45, 1.2), 1.0)
add(14.1, whoosh(0.5, up=False, lo=500, hi=5000), 0.5)
add(14.25, whoosh(0.5, up=False, lo=300, hi=3000), 0.4)
add(15.12, pop(420, 0.14), 1.0)
add(15.15, ding(1568, 0.8), 0.5)
add(15.6, ding(1046.5, 1.2), 0.45, pan=-0.2)
add(15.65, ding(1318.5, 1.2), 0.35, pan=0.2)

# ---------- mix ----------
mus_gain = np.ones_like(L)
fade_in = int(0.4 * SR)
mus_gain[:fade_in] = np.linspace(0, 1, fade_in)
mix_L = L * 0.9 + mus_L * 0.55 * mus_gain
mix_R = R * 0.9 + mus_R * 0.55 * mus_gain
out = np.stack([mix_L, mix_R], 1)
fo = int(0.8 * SR)
out[-fo:] *= np.linspace(1, 0, fo)[:, None]
out = np.tanh(out * 1.1)
out /= np.max(np.abs(out)) / 0.89
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else "trilha.wav", SR, (out * 32767).astype(np.int16))
print("ok")
