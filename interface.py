
import re
import shutil
import uuid
from pathlib import Path
from typing import Optional

import requests
import scipy.io.wavfile
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import main  # your existing file (loads MusicGen, Groq, Cloudflare, Magic Hour)
#8001
#python -m uvicorn interface:app --host 127.0.0.1 --port 8001

BASE = Path(__file__).parent
OUT, UPLOADS, FRONTEND = BASE / "outputs", BASE / "uploads", BASE / "frontend"
OUT.mkdir(exist_ok=True)
UPLOADS.mkdir(exist_ok=True)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".webm"}
TIME_PHRASES = {"time", "what time is it", "current time", "tell me the time"}


# ---------- helpers ----------
def save_upload(f: UploadFile) -> str:
    ext = Path(f.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise ValueError("Unsupported file type.")
    path = UPLOADS / f"{uuid.uuid4().hex}{ext}"
    with open(path, "wb") as out:
        shutil.copyfileobj(f.file, out)
    return str(path)


def publish(src: str, ext: str) -> str:
    name = f"{uuid.uuid4().hex}{ext}"
    shutil.copy(src, OUT / name)
    return f"/files/{name}"


def run_video(call) -> Optional[str]:
    """Runs a Magic Hour call that downloads into OUT and returns the new mp4's URL."""
    before = set(OUT.glob("*.mp4"))
    call()
    files = (set(OUT.glob("*.mp4")) - before) or set(OUT.glob("*.mp4"))
    if not files:
        return None
    return f"/files/{max(files, key=lambda p: p.stat().st_mtime).name}"


def make_music(prompt: str) -> str:
    inputs = main.music_processor(text=[prompt], padding=True, return_tensors="pt").to(main.MUSICGEN_DEVICE)
    audio = main.music_model.generate(**inputs, max_new_tokens=512)[0].cpu().numpy()
    name = f"{uuid.uuid4().hex}.wav"
    scipy.io.wavfile.write(
        OUT / name,
        rate=main.music_model.config.audio_encoder.sampling_rate,
        data=audio.T,
    )
    return f"/files/{name}"


def get_weather(city: str) -> str:
    r = requests.get(f"https://wttr.in/{city}?format=j1", timeout=10)
    r.raise_for_status()
    c = r.json()["current_condition"][0]
    desc = c["weatherDesc"][0]["value"].lower()
    return f"It's {c['temp_C']}°C in {city} (feels like {c['FeelsLikeC']}°C), {desc}."


def fail(msg: str):
    return {"reply": msg}


# ---------- routes ----------
@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/chat")
def chat(
    message: str = Form(""),
    mode: str = Form(""),
    file: Optional[UploadFile] = File(None),
):
    text = message.strip()
    low = text.lower()
    try:
        if mode == "image":
            path = main.generate_image(text)
            if not path:
                return fail("Image generation failed. Check the server terminal for details.")
            return {"reply": "Here's your image.", "media": {"type": "image", "url": publish(path, ".png")}}

        if mode == "edit-image":
            if not file:
                return fail("Please attach a photo to edit.")
            path = main.ai_edit_image(save_upload(file), text)
            if not path:
                return fail("Image editing failed. Check the server terminal for details.")
            return {"reply": "Here's your edited image.", "media": {"type": "image", "url": publish(path, ".png")}}

        if mode == "video":
            url = run_video(lambda: main.client.v1.text_to_video.generate(
                name="My AI Video", end_seconds=5, aspect_ratio="16:9", resolution="480p",
                style={"prompt": text}, wait_for_completion=True,
                download_outputs=True, download_directory=str(OUT)))
            if not url:
                return fail("Video generation failed.")
            return {"reply": "Your video is ready.", "media": {"type": "video", "url": url}}

        if mode == "animate":
            if not file:
                return fail("Please attach a photo to animate.")
            img = save_upload(file)
            url = run_video(lambda: main.client.v1.image_to_video.generate(
                name="Animated Image", end_seconds=5, resolution="480p",
                assets={"image_file_path": img}, style={"prompt": text},
                wait_for_completion=True, download_outputs=True, download_directory=str(OUT)))
            if not url:
                return fail("Animation failed.")
            return {"reply": "Your photo is now animated.", "media": {"type": "video", "url": url}}

        if mode == "edit-video":
            if not file:
                return fail("Please attach a video to edit.")
            vid = save_upload(file)
            url = run_video(lambda: main.client.v1.video_to_video.generate(
                name="Edited Video",
                assets={"video_file_path": vid, "video_source": "file"},
                start_seconds=0, end_seconds=15,
                style={"art_style": "3D Render", "model": "default",
                       "prompt": text, "prompt_type": "default", "version": "default"},
                fps_resolution="HALF", wait_for_completion=True,
                download_outputs=True, download_directory=str(OUT)))
            if not url:
                return fail("Video editing failed.")
            return {"reply": "Your edited video is ready.", "media": {"type": "video", "url": url}}

        if mode == "music":
            return {"reply": "Here's your track.", "media": {"type": "audio", "url": make_music(text)}}

        if mode == "weather":
            return {"reply": get_weather(text)}

        # ----- normal chat (no tool selected) -----
        if low in TIME_PHRASES:
            return {"reply": f"The current time is {main.time.strftime('%I:%M %p')}"}

        m = re.search(r"(?:weather|temperature) (?:in|of|at) (.+)", low)
        if m:
            return {"reply": get_weather(m.group(1).strip())}

        return {"reply": main.aiprocess(text) or "Sorry, I couldn't come up with an answer."}

    except Exception as e:
        print("Server error:", e)
        return fail(f"Something went wrong: {e}")


# Generated files, then the frontend (must be mounted last)
app.mount("/files", StaticFiles(directory=OUT), name="files")
if FRONTEND.exists():
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
