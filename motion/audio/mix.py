"""Gera a narração (voz Piper pt_BR-faber) e mixa com música + efeitos.
Uso: python3 mix.py <pasta_com_modelo_piper> saida.wav
"""
import io, os, sys, wave
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx
from piper import PiperVoice, SynthesisConfig

SR = sfx.SR
MODEL = os.path.join(sys.argv[1], "pt_BR-faber-medium.onnx")

# (início em segundos, texto, velocidade) — "Mozáik" para a pronúncia mo-ZÁIK
FALAS = [
    (0.35, "Mozáik Conecta apresenta.", 0.92),
    (2.80, "Seu negócio merece um site que vende!", 0.92),
    (5.70, "Do zero ao online: design, código e estratégia.", 0.92),
    (10.35, "Lindo em qualquer tela. Rápido. E pronto pro Google.", 0.92),
    (13.95, "Criação de sites? Mozáik Conecta. Peça seu orçamento!", 0.90),
]

voice = PiperVoice.load(MODEL)
n = len(sfx.L)
vox = np.zeros(n)
for at, txt, ls in FALAS:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice.synthesize_wav(txt, wf, syn_config=SynthesisConfig(length_scale=ls))
    buf.seek(0)
    with wave.open(buf) as wf:
        sr = wf.getframerate()
        x = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(float) / 32768
    x = resample_poly(x, SR, sr)
    i = int(at * SR)
    end = min(n, i + len(x))
    vox[i:end] += x[: end - i]
    print(f"{at:5.2f}s -> {at + len(x) / SR:5.2f}s  {txt}")

# tratamento da voz: corta grave, realça presença, comprime levemente
vox = sosfilt(butter(2, 90, btype="high", fs=SR, output="sos"), vox)
pres = sosfilt(butter(2, [2500, 6000], btype="band", fs=SR, output="sos"), vox)
vox = vox + pres * 0.35
vox = np.tanh(vox / np.max(np.abs(vox)) * 1.8) / np.tanh(1.8)

# ducking: música abaixa quando há voz
envv = np.abs(vox)
k = int(0.03 * SR)
envv = np.convolve(envv, np.ones(k) / k, mode="same")
active = (envv > 0.02).astype(float)
sm = int(0.18 * SR)
active = np.convolve(active, np.ones(sm) / sm, mode="same")
duck = 1 - 0.6 * np.clip(active, 0, 1)

mix = sfx.music * duck[:, None] * 0.9 + sfx.fx * 0.75 + vox[:, None] * 0.62
mix = np.tanh(mix * 1.05)
mix /= np.max(np.abs(mix)) / 0.89
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print("ok")
