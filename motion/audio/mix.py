"""Mixa a narração (falas 0..4 em mp3/wav) com a música e os efeitos de sfx.py.
Uso: python3 mix.py <pasta_das_falas> saida.wav
"""
import os, subprocess, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx

SR = sfx.SR
# início de cada fala e limite (até onde ela pode ir antes da próxima cena)
SLOTS = [(0.30, 2.55), (2.75, 5.45), (5.60, 10.15), (10.30, 13.85), (13.95, 18.6)]


def load(path, tempo=1.0):
    af = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    if tempo != 1.0:
        af += f",atempo={tempo:.3f}"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", af, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(float)


d = sys.argv[1]
files = sorted(f for f in os.listdir(d) if f[0].isdigit())
n = len(sfx.L)
vox = np.zeros(n)
for f, (at, lim) in zip(files, SLOTS):
    x = load(os.path.join(d, f))
    room = lim - at
    if len(x) / SR > room:  # acelera levemente (no máx. 18%) se não couber
        x = load(os.path.join(d, f), min(1.18, len(x) / SR / room))
    i = int(at * SR)
    end = min(n, i + len(x))
    vox[i:end] += x[: end - i]
    print(f"{f}: {at:5.2f}s -> {at + len(x) / SR:5.2f}s (limite {lim})")

vox = sosfilt(butter(2, 80, btype="high", fs=SR, output="sos"), vox)
vox /= np.max(np.abs(vox))

# ducking: a música abaixa quando há voz
k = int(0.03 * SR)
envv = np.convolve(np.abs(vox), np.ones(k) / k, mode="same")
sm = int(0.18 * SR)
active = np.convolve((envv > 0.02).astype(float), np.ones(sm) / sm, mode="same")
duck = 1 - 0.6 * np.clip(active, 0, 1)

mix = sfx.music * duck[:, None] * 0.9 + sfx.fx * 0.7 + vox[:, None] * 0.7
mix = np.tanh(mix * 1.05)
mix /= np.max(np.abs(mix)) / 0.89
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print("ok")
