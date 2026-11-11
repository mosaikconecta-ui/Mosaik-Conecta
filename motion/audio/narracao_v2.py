"""Narração do motion v2: gera UMA tomada contínua na ElevenLabs (modelo eleven_v3, mais natural),
corta cada frase pelos timestamps e encaixa na sua cena; depois mixa com sfx_v2 (música abaixa sob a voz).
A chave da API é injetada pelo proxy da sessão; fora dela, defina ELEVENLABS_API_KEY.
Uso: python3 narracao_v2.py <voice_id> <nome>   -> trilha-v2-voz-<nome>.wav
"""
import base64, json, os, subprocess, sys, urllib.request
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

# ---- texto contínuo + posição de cada frase ----
text, spans = "", []
for _, _, f in FALAS:
    if text:
        text += " "
    spans.append((len(text), len(text) + len(f)))
    text += f

cache = os.path.join(HERE, f"narracao-v2-{nome}.json")
if not os.path.exists(cache):
    body = {"text": text, "model_id": "eleven_v3", "language_code": "pt",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "use_speaker_boost": True}}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        open(cache, "w").write(r.read().decode())
d = json.load(open(cache))
al = d["alignment"]
starts, ends = al["character_start_times_seconds"], al["character_end_times_seconds"]
mp3 = base64.b64decode(d["audio_base64"])
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "-", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     input=mp3, capture_output=True, check=True).stdout
take = np.frombuffer(raw, np.float32).astype(float)


def tempo(x, k):
    pcm = (x.astype(np.float32)).tobytes()
    out = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                          "-af", f"atempo={k:.3f}", "-f", "f32le", "-"], input=pcm, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).astype(float)


n = len(T.fxL)
vox = np.zeros(n)
prev_end = 0.0
for (at, lim, f), (a, b) in zip(FALAS, spans):
    s = max(0.0, starts[a] - 0.04)
    e = ends[b - 1] + 0.14
    if b + 1 < len(starts):  # não invadir a próxima frase da tomada
        e = min(e, max(ends[b - 1] + 0.02, starts[b + 1] - 0.01))
    x = take[int(s * SR): int(e * SR)].copy()
    fade = int(0.012 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade * 3:] *= np.linspace(1, 0, fade * 3)
    at = max(at, prev_end + 0.1)  # nunca sobrepor a fala anterior
    room = lim - at
    if len(x) / SR > room:
        x = tempo(x, min(1.15, len(x) / SR / room))
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
