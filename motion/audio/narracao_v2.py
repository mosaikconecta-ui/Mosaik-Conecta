"""Narração do motion v2: gera uma fala por frase na ElevenLabs (modelo multilingual v2, estável),
encaixa cada frase, sem acelerar, na sua cena; depois mixa com sfx_v2 (música abaixa sob a voz).
A chave da API é injetada pelo proxy da sessão; fora dela, defina ELEVENLABS_API_KEY.
Uso: python3 narracao_v2.py <voice_id> <nome>   -> trilha-v2-voz-<nome>.wav
"""
import json, os, subprocess, sys, urllib.request
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sfx_v2 as T

SR = T.SR
# (início na cena, limite, frase)
FALAS = [
    (0.25, 3.30, "Criar um site não precisa ser complicado."),
    (3.45, 5.40, "Com a Mosaik Conecta,"),
    (5.50, 9.95, "a gente cuida de tudo: design, código, SEO e suporte."),
    (10.20, 12.35, "Tudo que seu site precisa, num só lugar."),
    (12.55, 15.15, "Bonito, rápido e pronto pro Google."),
    (15.30, 17.60, "Do briefing ao lançamento,"),
    (18.05, 21.80, "tudo isso, com um só parceiro."),
    (22.30, 24.75, "E o seu site, no ar!"),
    (25.00, 27.70, "Mosaik Conecta. Chama a gente!"),
]
voice, nome = sys.argv[1], sys.argv[2]
key = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")

# ---- uma chamada por frase (modelo multilingual v2, estável), com contexto da frase anterior/seguinte ----
MODEL = "eleven_multilingual_v2"
os.makedirs(os.path.join(HERE, f"falas-v2-{nome}"), exist_ok=True)


def fala(i):
    path = os.path.join(HERE, f"falas-v2-{nome}", f"{i}.mp3")
    if not os.path.exists(path):
        body = {"text": FALAS[i][2], "model_id": MODEL, "language_code": "pt",
                "previous_text": FALAS[i - 1][2] if i else None,
                "next_text": FALAS[i + 1][2] if i + 1 < len(FALAS) else None,
                "voice_settings": {"stability": 0.75, "similarity_boost": 0.8, "style": 0.0,
                                   "use_speaker_boost": True, "speed": 1.0}}
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
            data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            open(path, "wb").write(r.read())
    af = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
          "silenceremove=start_periods=1:start_threshold=-45dB,areverse")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", af, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(float)


n = len(T.fxL)
vox = np.zeros(n)
prev_end = 0.0
for idx, (at, lim, f) in enumerate(FALAS):
    x = fala(idx)
    fade = int(0.01 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade * 3:] *= np.linspace(1, 0, fade * 3)
    at = max(at, prev_end + 0.1)  # nunca sobrepor a fala anterior
    prev_end = at + len(x) / SR
    i = int(at * SR)
    j = min(n, i + len(x))
    vox[i:j] += x[: j - i]
    print(f"{at:5.2f}s -> {at + len(x) / SR:5.2f}s (limite {lim})  {f}")

vox = sosfilt(butter(2, 80, btype="high", fs=SR, output="sos"), vox)
vox /= np.max(np.abs(vox))

k = int(0.03 * SR)
envv = np.convolve(np.abs(vox), np.ones(k) / k, mode="same")
sm = int(0.2 * SR)
active = np.convolve((envv > 0.02).astype(float), np.ones(sm) / sm, mode="same")
duck = 1 - 0.62 * np.clip(active, 0, 1)

bed = T.music * 0.5 * duck[:, None] + T.fxs * 0.6
bed[-T.end:] *= np.linspace(1, 0, T.end)[:, None]
mix = np.tanh((bed + vox[:, None] * 0.75) * 1.05)
mix /= np.max(np.abs(mix)) / 0.89
out = os.path.join(HERE, f"trilha-v2-voz-{nome}.wav")
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print("ok", out)
