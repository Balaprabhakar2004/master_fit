# Perfect Fit

**🔗 Live demo:** [https://perfect-fit-oxh6.onrender.com](https://perfect-fit-oxh6.onrender.com)
> Hosted on Render's free tier — if it's been idle, the first load can take 30–60 seconds to wake up.

Fit photos **and now videos** into the exact frame each platform expects —
...

Fit photos **and now videos** into the exact frame each platform expects —
without ever cropping out the parts that matter. The source media is scaled
down to fit inside the target canvas, then padded (letterboxed/pillarboxed)
with a background color of your choice.

## What's new in this version

- **Video resizing module** — upload an MP4/MOV/WEBM/MKV/AVI and get back an
  MP4 sized for the platform + format you pick (Instagram Reels, YouTube
  Shorts, TikTok, LinkedIn video, etc.), powered by `moviepy`. `moviepy`
  depends on `imageio-ffmpeg`, which ships its own ffmpeg binary — so a
  plain `pip install` is all you need, no separate system install and
  nothing to add to `PATH`.
- **Platform-specific presets** for both images and video, centralized in
  `config.py` so the backend and the UI never fall out of sync.
- **Redesigned frontend** — a single-page "viewfinder" workbench: drag-and-drop
  upload, live pixel/aspect-ratio HUD, platform cards, format chips, a
  background-color picker, and a proper loading + error state. Fully
  responsive, keyboard accessible, and respects `prefers-reduced-motion`.
- **Cleaner backend architecture** — `processors/image_processor.py` and
  `processors/video_processor.py` are separated from `app.py`'s routing, with
  validation, size limits, and lazy cleanup of temp files.

## Requirements

- Python 3.10+

That's it — video support no longer requires a separate `ffmpeg` install.
`pip install -r requirements.txt` pulls in `moviepy`, which pulls in
`imageio-ffmpeg`, which bundles a working ffmpeg binary for your platform
automatically.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000.

## Project structure

```
app.py                     # Flask routes: pages + /api/platforms, /api/process/image, /api/process/video
config.py                  # Single source of truth for platform + aspect-ratio presets
processors/
  image_processor.py       # Pillow: scale-to-fit + pad onto a canvas
  video_processor.py       # moviepy: scale-to-fit + pad, re-encode to mp4
templates/index.html       # UI shell
static/css/style.css       # Design system
static/js/app.js           # Frontend logic (no build step required)
Procfile                   # Render/Heroku-style start command (gunicorn)
render.yaml                # One-click Render Blueprint config
```

## Deploying

**Don't deploy this to Vercel.** Vercel runs Python as short-lived,
read-only-filesystem serverless functions. Video encoding needs a real,
writable working directory and can run past Vercel's execution time limit,
and the `moviepy`/`ffmpeg` dependency size can exceed Vercel's function size
cap. Symptoms if you try anyway: image processing fails immediately on cold
start, and video processing times out or fails outright.

**Use Render instead** (Railway/Fly.io work the same way) — a normal
persistent web process, a writable filesystem, and no serverless time limit.

1. Push this project to a GitHub repo.
2. In Render: **New → Blueprint**, point it at the repo — `render.yaml` in
   this project configures the service automatically. Or set it up manually:
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --timeout 300 --workers 2`
3. Deploy. No system `ffmpeg` install step needed — `moviepy` brings its own.

The app writes temp files (during video processing only) to the OS temp
directory (`tempfile.gettempdir()`, i.e. `/tmp`) and deletes them again as
soon as the request finishes — this works on Render, and incidentally means
image processing (which never touches disk at all) would even survive on
Vercel if you ever wanted a smaller service for images-only.

## Adding a new platform or format

Add an entry to `PLATFORMS` in `config.py` — nothing else needs to change,
the UI reads this list via `/api/platforms` automatically.

## Notes

- No files are persisted between requests — images are processed entirely
  in memory, and video temp files are deleted immediately after each
  request completes.
- Max upload size is capped at 300MB (videos) / 20MB (images) via
  `MAX_CONTENT_LENGTH`; adjust in `config.py` if you need more headroom.
  Note Render's free tier and most proxies also impose their own request
  size ceiling, so check that if large uploads fail.
