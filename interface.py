import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

import requests
import scipy.io.wavfile
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import main



BASE = Path(__file__).parent
OUT = BASE / "outputs"
UPLOADS = BASE / "uploads"
FRONTEND = BASE / "frontend"

OUT.mkdir(exist_ok=True)
UPLOADS.mkdir(exist_ok=True)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED = {
    ".png", ".jpg", ".jpeg", ".webp",
    ".mp4", ".mov", ".webm"
}

TIME_PHRASES = {
    "time",
    "what time is it",
    "what's the time",
    "what is the time",
    "current time",
    "tell me the time",
    "tell me current time",
    "tell me the current time",
    "what time is it right now",
    "what's the current time",
    "what is the current time",
    "time right now",
    "show me the time",
    "give me the current time",
}



def save_upload(f: UploadFile) -> str:
    ext = Path(f.filename or "").suffix.lower()

    if ext not in ALLOWED:
        raise ValueError("Unsupported file type.")

    path = UPLOADS / f"{uuid.uuid4().hex}{ext}"

    with open(path, "wb") as output:
        shutil.copyfileobj(f.file, output)

    return str(path)


def publish(src: str, ext: str) -> str:
    name = f"{uuid.uuid4().hex}{ext}"
    destination = OUT / name

    shutil.copy(src, destination)

    return f"/files/{name}"


def run_video(call) -> Optional[str]:
    """Run a video-generation call and return the resulting file URL."""
    before = set(OUT.glob("*.mp4"))

    call()

    files = (set(OUT.glob("*.mp4")) - before) or set(OUT.glob("*.mp4"))

    if not files:
        return None

    latest = max(files, key=lambda p: p.stat().st_mtime)

    return f"/files/{latest.name}"


def make_music(prompt: str) -> str:
    """Generate instrumental music using the existing MusicGen model."""
    inputs = main.music_processor(
        text=[prompt],
        padding=True,
        return_tensors="pt",
    ).to(main.MUSICGEN_DEVICE)

    audio = main.music_model.generate(
        **inputs,
        max_new_tokens=512,
    )[0].cpu().numpy()

    name = f"{uuid.uuid4().hex}.wav"

    scipy.io.wavfile.write(
        OUT / name,
        rate=main.music_model.config.audio_encoder.sampling_rate,
        data=audio.T,
    )

    return f"/files/{name}"


def get_weather(city: str) -> str:
    city = city.strip()

    if not city:
        return "Please provide a city name."

    response = requests.get(
        f"https://wttr.in/{requests.utils.quote(city)}?format=j1",
        timeout=10,
    )
    response.raise_for_status()

    current = response.json()["current_condition"][0]
    description = current["weatherDesc"][0]["value"].lower()

    return (
        f"It's {current['temp_C']}°C in {city}, "
        f"feels like {current['FeelsLikeC']}°C, "
        f"with {description}."
    )


def fail(msg: str) -> dict:
    return {"reply": msg}


def is_time_question(text: str) -> bool:
    text = re.sub(r"\s+", " ", text.lower().strip())
    return bool(re.search(r"\btime\b", text))


    patterns = [
        r"\bwhat(?:'s| is) the time\b",
        r"\bwhat time is it\b",
        r"\bcurrent time\b",
        r"\btell me (?:the )?(?:current )?time\b",
        r"\btime right now\b",
        r"\bshow me the time\b",
        r"\bgive me (?:the )?(?:current )?time\b",
    ]

    return any(re.search(pattern, normalized) for pattern in patterns)


def get_indian_time() -> str:
    """Return the current time in India, independent of Render's timezone."""
    return datetime.now(
        ZoneInfo("Asia/Kolkata")
    ).strftime("%I:%M %p")



@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/time")
def current_time():
    """Direct endpoint for the current time in India."""
    return {
        "reply": f"The current time in India is {get_indian_time()}."
    }


@app.post("/api/chat")
def chat(
    message: str = Form(""),
    mode: str = Form(""),
    file: Optional[UploadFile] = File(None),
):
    text = message.strip()
    low = text.lower().strip()

    try:
        # Handle time questions before AI/Groq.
        # This prevents the language model from guessing the time.
        if not mode and is_time_question(text):
            return {
                "reply": (
                    f"The current time in India is "
                    f"{get_indian_time()}."
                )
            }

        if mode == "image":
            path = main.generate_image(text)

            if not path:
                return fail("Image generation failed.")

            return {
                "reply": "Here's your image.",
                "media": {
                    "type": "image",
                    "url": publish(path, ".png"),
                },
            }

        if mode == "edit-image":
            if not file:
                return fail("Please attach a photo to edit.")

            path = main.ai_edit_image(save_upload(file), text)

            if not path:
                return fail("Image editing failed.")

            return {
                "reply": "Here's your edited image.",
                "media": {
                    "type": "image",
                    "url": publish(path, ".png"),
                },
            }

        if mode == "video":
            url = run_video(
                lambda: main.client.v1.text_to_video.generate(
                    name="My AI Video",
                    end_seconds=5,
                    aspect_ratio="16:9",
                    resolution="480p",
                    style={"prompt": text},
                    wait_for_completion=True,
                    download_outputs=True,
                    download_directory=str(OUT),
                )
            )

            if not url:
                return fail("Video generation failed.")

            return {
                "reply": "Your video is ready.",
                "media": {"type": "video", "url": url},
            }

        if mode == "animate":
            if not file:
                return fail("Please attach a photo to animate.")

            image_path = save_upload(file)

            url = run_video(
                lambda: main.client.v1.image_to_video.generate(
                    name="Animated Image",
                    end_seconds=5,
                    resolution="480p",
                    assets={"image_file_path": image_path},
                    style={"prompt": text},
                    wait_for_completion=True,
                    download_outputs=True,
                    download_directory=str(OUT),
                )
            )

            if not url:
                return fail("Animation failed.")

            return {
                "reply": "Your photo is now animated.",
                "media": {"type": "video", "url": url},
            }

        if mode == "edit-video":
            if not file:
                return fail("Please attach a video to edit.")

            video_path = save_upload(file)

            url = run_video(
                lambda: main.client.v1.video_to_video.generate(
                    name="Edited Video",
                    assets={
                        "video_file_path": video_path,
                        "video_source": "file",
                    },
                    start_seconds=0,
                    end_seconds=15,
                    style={
                        "art_style": "3D Render",
                        "model": "default",
                        "prompt": text,
                        "prompt_type": "default",
                        "version": "default",
                    },
                    fps_resolution="HALF",
                    wait_for_completion=True,
                    download_outputs=True,
                    download_directory=str(OUT),
                )
            )

            if not url:
                return fail("Video editing failed.")

            return {
                "reply": "Your edited video is ready.",
                "media": {"type": "video", "url": url},
            }

        if mode == "music":
            return {
                "reply": "Here's your track.",
                "media": {
                    "type": "audio",
                    "url": make_music(text),
                },
            }

        if mode == "weather":
            return {"reply": get_weather(text)}

        # Handle weather questions in normal chat.
        match = re.search(
            r"(?:weather|temperature)\s+(?:in|of|at)\s+(.+)",
            low,
        )

        if match:
            return {"reply": get_weather(match.group(1).strip())}

        # Normal AI chat.
        answer = main.aiprocess(text)

        return {
            "reply": answer or "Sorry, I couldn't come up with an answer."
        }

    except Exception:
        # Keep internal exception details in server logs only.
        import logging
        logging.exception("Error processing /api/chat")

        return fail(
            "Something went wrong while processing your request. "
            "Please try again or check the server logs."
        )



app.mount("/files", StaticFiles(directory=OUT), name="files")

# Mount frontend last so it doesn't intercept API routes.
if FRONTEND.exists():
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
