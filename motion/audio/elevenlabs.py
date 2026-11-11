"""Gera as falas da narração com a ElevenLabs (voz Isabela, pt-BR).
A chave é injetada pelo proxy da sessão; fora dela, defina ELEVENLABS_API_KEY.
Uso: python3 elevenlabs.py <voice_id> <pasta>   -> <pasta>/0.mp3 ... 4.mp3
Vozes usadas: EXAVITQu4vr4xnSDxMaL (Sarah, feminina), cjVigY5qzO86Huf0OWal (Eric, masculina)
"""
import json, os, sys, urllib.request

VOICE = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
KEY = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")
FALAS = [
    "Mosaik Conecta apresenta.",
    "Seu negócio merece um site que vende!",
    "Do zero ao online: design, código e estratégia.",
    "Lindo em qualquer tela. Rápido. E pronto pro Google.",
    "Criação de sites? Mosaik Conecta. Peça seu orçamento!",
]
for i, txt in enumerate(FALAS):
    body = {
        "text": txt,
        "model_id": "eleven_multilingual_v2",
        "language_code": "pt",
        "previous_text": FALAS[i - 1] if i else None,
        "next_text": FALAS[i + 1] if i + 1 < len(FALAS) else None,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": 1.05},
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        open(os.path.join(OUT, f"{i}.mp3"), "wb").write(r.read())
    print("ok", i, txt)
