"""Trilha da versão 2 (estilo 3D), sincronizada com motion-v2-estilo-3d.html.
Reaproveita os sons sintetizados de sfx.py.
Uso: python3 sfx_v2.py saida.wav
"""
import os, sys
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfx import SR, rng, t_arr, env, bp, lp, hp, pop, click, key, whoosh, impact, ding, sweep, kick, hat, clap, bass, pluck

DUR = 28.0
N = int(SR * DUR)
fxL, fxR = np.zeros(N), np.zeros(N)
muL, muR = np.zeros(N), np.zeros(N)


def put(bufL, bufR, at, x, g=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    x = x[: N - i]
    bufL[i : i + len(x)] += x * g * (1 - max(pan, 0))
    bufR[i : i + len(x)] += x * g * (1 + min(pan, 0))


fx = lambda at, x, g=1.0, pan=0.0: put(fxL, fxR, at, x, g, pan)
mu = lambda at, x, g=1.0, pan=0.0: put(muL, muR, at, x, g, pan)


def swish(d=0.25):
    return whoosh(d, up=False, lo=1500, hi=7000) * 0.8


def marker(d=0.6):
    n = int(SR * d)
    t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 1800, 6500)
    am = 0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 4.5 * t))
    return x * am * np.minimum(t / 0.02, 1) * np.minimum((d - t) / 0.08, 1) * 0.5


def boom(d=2.0):
    t = t_arr(d)
    x = np.sin(2 * np.pi * 38 * t + 3 * np.exp(-t / 0.05)) * np.exp(-t / 0.7)
    return np.tanh(x * 1.4 + lp(rng.standard_normal(len(t)), 200) * np.exp(-t / 0.15) * 0.4) * 0.9


def pad(freqs, d, g=0.06, att=0.4):
    t = t_arr(d)
    x = sum(np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 1.004 * t + 1) for f in freqs)
    return x * np.minimum(t / att, 1) * np.minimum((d - t) / 0.6, 1) * g


# ================= MÚSICA (120 bpm) =================
BEAT = 0.5
Am, F, C, G = [220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]
prog = [Am, F, C, G]
bassn = [55.0, 43.65, 65.41, 49.0]
arp = [440, 523.25, 659.25, 880, 659.25, 523.25]
for b in range(int(DUR / BEAT)):
    at = b * BEAT
    bar = (b // 4) % 4
    if b % 4 == 0 and at < 26:
        mu(at, pad(prog[bar], 2.1), 1.0)
    drums = (5.4 <= at < 21.9) or (24.0 <= at < 26.0)
    dark = 12.2 <= at < 17.6
    if drums:
        mu(at, kick(), 1.0 if not dark else 1.15)
        if b % 2 == 1:
            mu(at, clap(), 0.65)
        mu(at + BEAT / 2, hat(b % 4 == 3), 0.6 if not dark else 0.45, pan=0.3)
        mu(at, bass(bassn[bar], BEAT * 0.9), 1.2 if dark else 0.9)
        mu(at + BEAT / 2, bass(bassn[bar], BEAT * 0.45), 0.8)
    if not dark and at < 26:
        g = 0.5 if at < 5.4 else 0.8
        mu(at, pluck(arp[b % 6]), g, pan=-0.25)
        mu(at + BEAT / 2, pluck(arp[(b + 3) % 6] * 2, 0.25), g * 0.5, pan=0.25)
    elif dark:
        mu(at + BEAT * 0.75, pluck(arp[b % 6] / 2, 0.3), 0.5, pan=0.2)
# risers e finais
mu(16.6, whoosh(1.1, up=True, lo=200, hi=7000), 0.8)
mu(22.6, whoosh(1.4, up=True, lo=150, hi=6000), 0.7)
mu(26.0, pad([220, 261.63, 329.63, 440, 659.25], 2.0, 0.07, 0.05), 1.0)
for i in range(6):
    mu(26.0 + i * 0.25, pluck([880, 659.25, 523.25, 440, 659.25, 880][i], 0.6), 0.5 * (1 - i / 7), pan=0.3 if i % 2 else -0.3)

# ================= EFEITOS =================
# A — frase
for i, s0 in enumerate([0.12, 0.29, 0.46, 0.95, 1.09, 1.23]):
    fx(s0, swish(0.22), 0.45, pan=-0.2 + i * 0.08)
    fx(s0 + 0.08, pop(700 + i * 40, 0.06), 0.35)
fx(0.82, pop(520, 0.12), 0.8)
fx(1.42, whoosh(0.3, up=False, lo=600, hi=5000), 0.6)
fx(1.5, impact(60, 0.5), 0.6)
fx(1.85, marker(0.6), 0.9)
fx(2.75, whoosh(0.7, up=True, lo=200, hi=6000), 0.8)
# B — logo
for i in range(9):
    fx(3.22 + i * 0.045 + 0.35, pop(rng.uniform(500, 950), 0.05), 0.35, pan=rng.uniform(-0.5, 0.5))
fx(3.2, whoosh(0.5, up=False, lo=400, hi=5000), 0.5)
fx(4.1, whoosh(0.35, up=True, lo=800, hi=5000), 0.5)
fx(4.42, pop(380, 0.16), 1.0)
fx(4.42, impact(70, 0.4), 0.4)
fx(4.72, swish(0.45), 0.7)
fx(5.0, ding(1568, 0.6), 0.35)
fx(5.25, whoosh(0.5, up=True, lo=300, hi=6000), 0.7)
# C — cartões e digitação
labels = ["Design único", "Desenvolvimento", "SEO", "Responsivo", "Hospedagem", "Suporte"]
for i, l in enumerate(labels):
    s0 = 5.45 + i * 0.52
    fx(s0, whoosh(0.35, up=False, lo=600, hi=4000), 0.45, pan=-0.3)
    fx(s0 + 0.18, pop(560 + i * 50, 0.08), 0.6)
    for c in range(len(l)):
        fx(s0 + 0.08 + 0.42 * c / len(l) + rng.uniform(-0.004, 0.004), key(), 0.4, pan=rng.uniform(-0.2, 0.2))
fx(9.4, whoosh(0.55, up=True, lo=300, hi=5000), 0.7)
# D — órbita
for i in range(6):
    fx(9.68 + i * 0.07, whoosh(0.4, up=False, lo=800, hi=5000), 0.3, pan=np.cos(i) * 0.6)
    fx(10.15 + i * 0.07, pop(800 + i * 70, 0.05), 0.35, pan=np.cos(i) * 0.6)
fx(9.95, pop(300, 0.2), 1.0)
fx(9.95, impact(55, 0.6), 0.6)
fx(10.1, sweep(0.8), 0.6)
fx(10.6, swish(0.3), 0.5)
fx(10.8, swish(0.3), 0.5)
fx(11.8, whoosh(0.6, up=True, lo=150, hi=7000), 0.9)
fx(12.25, boom(2.0), 1.0)
# E — escuro
fx(12.35, whoosh(0.6, up=False, lo=300, hi=3000), 0.6)
fx(13.4, whoosh(0.4, up=False, lo=700, hi=5000), 0.6, pan=0.4)
fx(13.62, pop(420, 0.12), 0.7, pan=0.3)
fx(13.9, whoosh(0.4, up=False, lo=700, hi=5000), 0.6, pan=-0.4)
fx(14.1, pop(520, 0.1), 0.6, pan=-0.3)
fx(14.3, sweep(0.7), 0.4)
fx(14.7, whoosh(0.6, up=True, lo=300, hi=5000), 0.7)
fx(15.05, swish(0.4), 0.5)
fx(15.3, ding(880, 0.6), 0.5)
for i in range(4):
    s0 = 15.55 + i * 0.52
    fx(s0, whoosh(0.4, up=False, lo=500, hi=5000), 0.6, pan=0.5)
    fx(s0 + 0.38, ding(880 * (1.122 ** ((i + 1) * 2)), 0.5), 0.55)
fx(17.65, impact(50, 1.0), 1.0)
fx(17.6, whoosh(0.5, up=False, lo=400, hi=6000), 0.7)
# F — vermelho
for i in range(8):
    fx(17.95 + i * 0.05, pop(rng.uniform(500, 1000), 0.06), 0.4, pan=rng.uniform(-0.7, 0.7))
fx(17.95, swish(0.4), 0.6)
fx(18.35, marker(0.7), 1.0)
fx(19.35, whoosh(0.6, up=True, lo=300, hi=6000), 0.7)
fx(19.55, whoosh(0.8, up=False, lo=200, hi=3000), 0.6)
fx(20.25, swish(0.35), 0.5)
fx(20.4, pop(450, 0.12), 0.6)
# G — no ar
fx(21.95, whoosh(0.5, up=False, lo=500, hi=6000), 0.6)
for i in range(4):
    fx(22.35 + i * 0.12, pop(600 * (1.122 ** (i * 2)), 0.08), 0.7, pan=-0.3 + i * 0.2)
fx(23.0, whoosh(0.3, up=True, lo=800, hi=5000), 0.5)
fx(23.3, pop(320, 0.18), 1.0)
fx(23.3, impact(65, 0.4), 0.5)
fx(23.35, sweep(0.7), 0.5)
fx(24.05, ding(1318.5, 1.0), 0.8)
fx(24.08, ding(1760, 1.0), 0.45)
fx(24.05, impact(55, 0.6), 0.5)
fx(24.15, swish(0.4), 0.5)
fx(24.6, whoosh(0.4, up=True, lo=600, hi=5000), 0.5)
# H — final
fx(24.85, pop(500, 0.12), 0.8)
for c in range(14):
    fx(25.3 + 0.6 * c / 14 + rng.uniform(-0.005, 0.005), key(), 0.5, pan=rng.uniform(-0.2, 0.2))
fx(26.0, whoosh(0.5, up=False, lo=1000, hi=7000), 0.5)
fx(26.05, impact(50, 1.4), 0.7)
fx(26.1, ding(1046.5, 1.6), 0.4, pan=-0.2)
fx(26.15, ding(1568, 1.6), 0.3, pan=0.2)
fx(26.6, click(), 0.4)

# ================= MIX =================
music = np.stack([muL, muR], 1)
fade = int(0.5 * SR)
music[:fade] *= np.linspace(0.2, 1, fade)[:, None]
fxs = np.stack([fxL, fxR], 1)
end = int(1.2 * SR)

if __name__ == "__main__":
    out = np.tanh((music * 0.5 + fxs * 0.85) * 1.1)
    out[-end:] *= np.linspace(1, 0, end)[:, None]
    out /= np.max(np.abs(out)) / 0.89
    wavfile.write(sys.argv[1] if len(sys.argv) > 1 else "trilha_v2.wav", SR, (out * 32767).astype(np.int16))
    print("ok")
